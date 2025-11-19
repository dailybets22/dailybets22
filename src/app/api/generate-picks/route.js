// src/app/api/generate-picks/route.js
import { NextResponse } from 'next/server';

const ODDS_API_KEY = process.env.THE_ODDS_API_KEY;
const BEEHIIV_API_KEY = process.env.BEEHIIV_API_KEY;
const BEEHIIV_PUBLICATION_ID = process.env.BEEHIIV_PUBLICATION_ID;

const SPORTS = {
  basketball_nba: 'NBA',
  ice_hockey_nhl: 'NHL'
};

export async function GET() {
  console.log('generate-picks STARTED');

  if (!ODDS_API_KEY) {
    console.error('THE_ODDS_API_KEY is missing in env!');
    return NextResponse.json({ error: 'Missing THE_ODDS_API_KEY' }, { status: 500 });
  }

  if (!BEEHIIV_API_KEY || !BEEHIIV_PUBLICATION_ID) {
    console.error('Beehiiv credentials missing!');
    return NextResponse.json({ error: 'Beehiiv config missing' }, { status: 500 });
  }

  const globalPicks = [];

  // === 1. Fetch from The Odds API ===
  for (const [sportKey, sportName] of Object.entries(SPORTS)) {
    console.log(`Fetching ${sportName} (${sportKey}) from The Odds API...`);

    const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/odds/?regions=us&oddsFormat=decimal&markets=h2h,spreads,totals&apiKey=${ODDS_API_KEY}`;

    let games = [];
    try {
      const res = await fetch(url, { next: { revalidate: 300 } });
      console.log(`${sportName} response status: ${res.status}`);

      if (res.ok) {
        games = await res.json();
        console.log(`${sportName}: Got ${games.length} games`);
      } else {
        const text = await res.text();
        console.error(`${sportName} API error:`, text);
      }
    } catch (e) {
      console.error(`Network error fetching ${sportName}:`, e.message);
    }

    let gameCount = 0;
    for (const game of games) {
      if (!game?.commence_time || !game?.bookmakers?.length) continue;

      const home = game.home_team;
      const away = game.away_team;
      gameCount++;

      for (const book of game.bookmakers) {
        if (!['draftkings', 'draftkings', 'fanduel', 'betmgm', 'espnbet'].includes(book.key.toLowerCase())) continue;

        for (const market of book.markets || []) {
          for (const outcome of market.outcomes || []) {
            const impliedProb = 1 / outcome.price;
            let category = 'medium';
            if (impliedProb >= 0.70) category = 'safe';
            if (impliedProb <= 0.50) category = 'high-risk';

            globalPicks.push({
              sport: sportName,
              game: `${away} @ ${home}`,
              market: market.key === 'h2h' ? 'Moneyline' : market.key === 'spreads' ? 'Spread' : 'Total',
              pick: outcome.name,
              price: outcome.price,
              probability: (impliedProb * 100).toFixed(1) + '%',
              category,
              commence_time: game.commence_time
            });
          }
        }
      }
    }
    console.log(`${sportName}: Processed ${gameCount} games → ${globalPicks.length} total picks so far`);
  }

  console.log(`Total picks collected from The Odds API: ${globalPicks.length}`);

  // === 2. Scrape Odds Shark (optional but nice) ===
  console.log('Scraping Odds Shark for reasons...');
  const sharkReasons = await scrapeOddsShark();
  console.log(`Got ${sharkReasons.length} reasons from Odds Shark`);

  globalPicks.forEach(pick => {
    const match = sharkReasons.find(r =>
      pick.game.includes(r.team1) || pick.game.includes(r.team2)
    );
    if (match) pick.reason = match.text;
  });

  // === 3. Get subscribers from Beehiiv ===
  console.log('Fetching Beehiiv subscribers...');
  const subscribers = await fetchAllBeehiivSubscribers();
  console.log(`Found ${subscribers.length} subscribers`);

  let updatedCount = 0;
  for (const sub of subscribers) {
    const userSports = sub.custom_fields?.selected_sports?.split(',').map(s => s.trim().toUpperCase()) || [];

    if (userSports.length === 0) continue;

    const userPicks = globalPicks
      .filter(p => userSports.includes(p.sport))
      .sort((a, b) => parseFloat(b.probability) - parseFloat(a.probability));

    const safe   = userPicks.filter(p => p.category === 'safe').slice(0, 5);
    const medium = userPicks.filter(p => p.category === 'medium').slice(0, 2);
    const high   = userPicks.filter(p => p.category === 'high-risk').slice(0, 2);
    const parlay = createParlay(userPicks.slice(0, 12));

    const final10 = [...safe, ...medium, ...high, parlay];
    const html = renderEmailHtml(final10, sub.name || 'Friend');

    try {
      await fetch(`https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions/${sub.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${BEEHIIV_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          custom_fields: { today_picks_html: html }
        })
      });
      updatedCount++;
    } catch (e) {
      console.error(`Failed to update subscriber ${sub.email}:`, e.message);
    }
  }

  console.log(`SUCCESS! Updated ${updatedCount} subscribers`);
  return NextResponse.json({
    success: true,
    picksGenerated: globalPicks.length,
    subscribersUpdated: updatedCount,
    message: 'Daily picks delivered!'
  });
}

// ——————— Helpers ———————
async function scrapeOddsShark() {
  const reasons = [];
  const urls = [
    'https://www.oddsshark.com/nba/computer-picks',
    'https://www.oddsshark.com/nhl/computer-picks'
  ];

  for (const url of urls) {
    try {
      const html = await fetch(url).then(r => r.text());
      const regex = /<h3[^>]*>([^<]+ vs [^<]+)<\/h3>[\s\S]*?<div class="computer-pick__text">([\s\S]*?)<\/div>/gi;
      let m;
      while ((m = regex.exec(html))) {
        const teams = m[1].split(' vs ');
        reasons.push({
          team1: teams[0]?.trim(),
          team2: teams[1]?.trim(),
          text: m[2].replace(/<[^>]*>/g, '').trim()
        });
      }
    } catch (e) {
      console.log('Odds Shark scrape failed (normal on some days):', e.message);
    }
  }
  return reasons;
}

function createParlay(picks) {
  if (picks.length < 2) return { pick: 'No strong parlay today', price: '—', reason: 'Not enough legs' };
  const legs = picks.slice(0, 3);
  const payout = legs.reduce((a, p) => a * p.price, 1).toFixed(2);
  return {
    sport: 'Multi',
    game: 'Daily Parlay',
    pick: legs.map(l => l.pick).join(' × '),
    price: payout,
    probability: 'High Reward',
    category: 'parlay',
    reason: 'Best 3 value legs combined'
  };
}

function renderEmailHtml(picks, name) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;background:#0f172a;color:white;border-radius:12px;">
      <h1 style="text-align:center;">Hey ${name}, Your 10 Picks Are Ready</h1>
      <h2>5 Safe Bets</h2>
      ${picks.slice(0,5).map(p => `<p><strong>${p.game}</strong><br>${p.pick} @ ${p.price} <small>(${p.probability})</small><br><em>${p.reason || 'Strong implied probability'}</em></p><hr>`).join('')}
      <h2>2 Medium Risk</h2>
      ${picks.slice(5,7).map(p => `<p><strong>${p.game}</strong><br>${p.pick} @ ${p.price}<br><em>${p.reason || 'Good value'}</em></p>`).join('')}
      <h2>2 High Risk / High Reward</h2>
      ${picks.slice(7,9).map(p => `<p><strong>${p.game}</strong><br>${p.pick} @ ${p.price}<br><em>${p.reason || 'Big payout potential'}</em></p>`).join('')}
      <h2>1 Parlay of the Day</h2>
      <p><strong>${picks[9].pick}</strong><br>Payout: ${picks[9].price}x<br><em>${picks[9].reason}</em></p>
      <p style="font-size:11px;color:#666;">21+ • Entertainment only • Play responsibly</p>
    </div>`;
}

async function fetchAllBeehiivSubscribers() {
  const all = [];
  let page = 1;
  while (true) {
    const res = await fetch(
      `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions?page=${page}&limit=100`,
      { headers: { Authorization: `Bearer ${BEEHIIV_API_KEY}` } }
    );
    const json = await res.json();
    all.push(...json.data);
    if (!json.pagination?.next_page) break;
    page++;
  }
  return all;
}