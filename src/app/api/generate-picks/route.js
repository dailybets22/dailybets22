// src/app/api/generate-picks/route.js
import { NextResponse } from 'next/server';

const ODDS_API_KEY = process.env.THE_ODDS_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // optional

// Only NBA and NHL for now
const SPORTS = {
  basketball_nba: 'NBA',
  ice_hockey_nhl: 'NHL'
};

export async function GET() {
  try {
    const globalPicks = [];

    // Step 1: Fetch odds + implied probabilities from The Odds API
    for (const [key, name] of Object.entries(SPORTS)) {
      const url = `https://api.the-odds-api.com/v4/sports/${key}/odds/?regions=us&oddsFormat=decimal&apiKey=${ODDS_API_KEY}`;
      const res = await fetch(url, { next: { revalidate: 300 } });
      const games = await res.json();

      for (const game of games) {
        if (!game.commence_time) continue;
        const home = game.home_team;
        const away = game.away_team;

        for (const book of game.bookmakers) {
          if (book.key !== 'draftkings' && book.key !== 'fanduel') continue; // trusted books

          for (const market of book.markets) {
            if (['h2h', 'spreads', 'totals'].includes(market.key)) {
              for (const outcome of market.outcomes) {
                const impliedProb = 1 / outcome.price;
                let category = 'medium';
                if (impliedProb >= 0.70) category = 'safe';
                if (impliedProb <= 0.50) category = 'high-risk';

                globalPicks.push({
                  sport: name,
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
      }
    }

    // Step 2: Scrape Odds Shark for expert reasons (free, public data)
    const sharkPicks = await scrapeOddsShark();

    // Merge reasons into our picks
    globalPicks.forEach(pick => {
      const shark = sharkPicks.find(s => 
        pick.game.includes(s.team1) || pick.game.includes(s.team2)
      );
      if (shark) pick.reason = shark.reason;
    });

    // Step 3: Get all Beehiiv subscribers
    const subscribers = await fetchAllBeehiivSubscribers();

    // Step 4: Personalize for each user
    for (const sub of subscribers) {
      const userSports = sub.custom_fields?.selected_sports?.split(',').map(s => s.trim()) || [];
      if (userSports.length === 0) continue;

      const userPicks = globalPicks
        .filter(p => userSports.includes(p.sport))
        .sort((a, b) => b.probability - a.probability);

      // Exactly: 5 safe, 2 medium, 2 high-risk, 1 parlay
      const safe = userPicks.filter(p => p.category === 'safe').slice(0, 5);
      const medium = userPicks.filter(p => p.category === 'medium').slice(0, 2);
      const high = userPicks.filter(p => p.category === 'high-risk').slice(0, 2);
      const parlay = createParlay(userPicks.slice(0, 10));

      const final10 = [...safe, ...medium, ...high, parlay];

      const html = renderEmailHtml(final10, sub.name || 'Friend');

      // Update Beehiiv custom field
      await fetch(`https://api.beehiiv.com/v2/publications/${process.env.BEEHIIV_PUBLICATION_ID}/subscriptions/${sub.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.BEEHIIV_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          custom_fields: {
            today_picks_html: html
          }
        })
      });
    }

    return NextResponse.json({ success: true, picksGenerated: globalPicks.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper: Scrape Odds Shark (simple, reliable)
async function scrapeOddsShark() {
  const picks = [];
  const urls = [
    'https://www.oddsshark.com/nba/computer-picks',
    'https://www.oddsshark.com/nhl/computer-picks'
  ];

  for (const url of urls) {
    try {
      const html = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }).then(r => r.text());
      const regex = /<div class="computer-pick__title">([^<]+)<\/div>[\s\S]*?Pick:<\/span>\s*([^<]+)[\s\S]*?Confidence:<\/span>\s*([^<]+)/g;
      let match;
      while ((match = regex.exec(html))) {
        picks.push({
          game: match[1],
          pick: match[2].trim(),
          reason: `Odds Shark computer model gives this pick ${match[3]} confidence based on recent trends, injuries, and historical data.`
        });
      }
    } catch (e) { console.log('Odds Shark scrape failed, continuing...'); }
  }
  return picks;
}

// Simple parlay creator
function createParlay(picks) {
  const legs = picks.slice(0, 3).map(p => `${p.pick} (${p.price.toFixed(2)})`);
  return {
    sport: 'Multi',
    game: 'Daily Parlay',
    market: 'Parlay',
    pick: legs.join(' × '),
    price: picks.slice(0, 3).reduce((a, b) => a * b.price, 1).toFixed(2),
    probability: 'High Reward',
    category: 'parlay',
    reason: 'Best 3 legs combined for maximum payout potential'
  };
}

// HTML renderer
function renderEmailHtml(picks, name) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background: #0f172a; color: white;">
      <h1>Hey ${name}, here are your 10 picks for today</h1>
      <h2>5 Safe Bets</h2>
      ${picks.slice(0,5).map(p => `<p><strong>${p.game}</strong><br>${p.pick} @ ${p.price} (${p.probability})<br><em>${p.reason || 'Strong favorite with high win probability'}</em></p>`).join('')}
      <h2>2 Medium Risk</h2>
      ${picks.slice(5,7).map(p => `<p><strong>${p.game}</strong><br>${p.pick} @ ${p.price}<br><em>${p.reason || 'Balanced value play with good value'}</em></p>`).join('')}
      <h2>2 High Risk / High Reward</h2>
      ${picks.slice(7,9).map(p => `<p><strong>${p.game}</strong><br>${p.pick} @ ${p.price}<br><em>${p.reason || 'Underdog with massive payout potential'}</em></p>`).join('')}
      <h2>1 Parlay of the Day</h2>
      <p><strong>${picks[9].pick}</strong><br>Payout: ${picks[9].price}x your stake<br><em>${picks[9].reason}</em></p>
      <p style="font-size:12px; color:#666; margin-top:40px;">21+ • Play responsibly • Not financial advice</p>
    </div>`;
}

// Fetch all subscribers (handles pagination)
async function fetchAllBeehiivSubscribers() {
  let all = [];
  let page = 1;
  while (true) {
    const res = await fetch(`https://api.beehiiv.com/v2/publications/${process.env.BEEHIIV_PUBLICATION_ID}/subscriptions?page=${page}&limit=100`, {
      headers: { Authorization: `Bearer ${process.env.BEEHIIV_API_KEY}` }
    });
    const data = await res.json();
    all = [...all, ...data.data];
    if (!data.pagination.next_page) break;
    page++;
  }
  return all;
}