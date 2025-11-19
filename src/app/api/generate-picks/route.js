// src/app/api/generate-picks/route.js
import { NextResponse } from 'next/server';

const BEEHIIV_API_KEY = process.env.BEEHIIV_API_KEY;
const BEEHIIV_PUBLICATION_ID = process.env.BEEHIIV_PUBLICATION_ID;
const ODDS_API_KEY = process.env.THE_ODDS_API_KEY;

export async function GET() {
  const globalPicks = await fetchRealPicks();

  const subscribers = await fetchAllBeehiivSubscribers();
  let updated = 0;

  for (const sub of subscribers) {
    if (sub.status !== 'active') continue;

    const sportsField = Array.isArray(sub.custom_fields)
      ? sub.custom_fields.find(f => f.name === 'selected_sports')
      : null;

    const userSports = (sportsField?.value || '')
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);

    if (userSports.length === 0) continue;

    const userPicks = globalPicks
      .filter(p => userSports.includes(p.sport.toLowerCase()))
      .sort((a, b) => parseFloat(b.probability) - parseFloat(a.probability));

    if (userPicks.length < 3) continue;

    const final10 = [
      ...userPicks.filter(p => p.category === 'safe').slice(0, 5),
      ...userPicks.filter(p => p.category === 'medium').slice(0, 3),
      ...userPicks.filter(p => p.category === 'high-risk').slice(0, 2),
      createParlay(userPicks.slice(0, 5))
    ];

    const html = renderEmailHtml(final10, sub.name || 'Friend');

    try {
      const res = await fetch(
        `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions/${sub.id}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${BEEHIIV_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            custom_fields: [
              { name: 'today_picks_html', value: html }
            ]
          })
        }
      );

      if (res.ok) updated++;
    } catch (e) {
      console.error(`Failed to update ${sub.email}:`, e.message);
    }
  }

  return NextResponse.json({
    success: true,
    picksGenerated: globalPicks.length,
    subscribersUpdated: updated,
    generatedAt: new Date().toISOString(),
    message: 'LIVE MODE — Real odds delivered'
  });
}

// —————— REAL ODDS FETCHING (The Odds API) ——————
async function fetchRealPicks() {
  const sports = ['basketball_nba', 'ice_hockey_nhl']; // Add more later
  const allPicks = [];

  for (const sportKey of sports) {
    const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/odds/?apiKey=${ODDS_API_KEY}&regions=us&markets=h2h,spreads,totals&oddsFormat=decimal&dateFormat=iso`;

    try {
      const res = await fetch(url, { next: { revalidate: 300 } }); // Cache 5 min
      if (!res.ok) continue;
      const games = await res.json();

      for (const game of games) {
        const home = game.home_team;
        const away = game.away_team;
        const commence = new Date(game.commence_time);
        if (commence < new Date()) continue; // Skip past games

        for (const book of game.bookmakers) {
          if (book.key !== 'draftkings' && book.key !== 'fanduel') continue;

          for (const market of book.markets) {
            for (const outcome of market.outcomes) {
              const pick = `${outcome.name} ${outcome.description || ''}`.trim();
              const odds = outcome.price.toFixed(2);
              const probability = ((1 / outcome.price) * 100).toFixed(1) + '%';

              let category = 'medium';
              if (probability >= '65%') category = 'safe';
              if (probability <= '45%') category = 'high-risk';

              allPicks.push({
                sport: sportKey.includes('nba') ? 'NBA' : 'NHL',
                game: `${away} @ ${home}`,
                pick,
                odds,
                probability,
                category,
                commenceTime: commence.toLocaleString()
              });
            }
          }
        }
      }
    } catch (e) {
      console.error(`Odds API error for ${sportKey}:`, e.message);
    }
  }

  // Remove duplicates & sort by probability
  const unique = Array.from(new Map(allPicks.map(p => [`${p.game}-${p.pick}`, p])).values());
  return unique.sort((a, b) => parseFloat(b.probability) - parseFloat(a.probability));
}

// —————— BEEHIIV SUBSCRIBERS ——————
async function fetchAllBeehiivSubscribers() {
  const all = [];
  let page = 1;
  while (true) {
    const url = `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions?page=${page}&limit=100&expand=custom_fields`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${BEEHIIV_API_KEY}` } });
    if (!res.ok) break;
    const json = await res.json();
    all.push(...(json.data || []));
    if (!json.pagination?.next_page) break;
    page++;
  }
  return all;
}

// —————— PARLAY & HTML ——————
function createParlay(picks) {
  const legs = picks.slice(0, 3);
  const payout = legs.reduce((a, p) => a * parseFloat(p.odds), 1).toFixed(2);
  return {
    sport: 'Multi',
    game: 'Daily Parlay',
    pick: legs.map(p => p.pick).join(' × '),
    odds: payout,
    probability: 'High Reward',
    category: 'parlay'
  };
}

function renderEmailHtml(picks, name) {
  return `
    <div style="font-family:Arial,sans-serif;background:#0f172a;color:white;padding:40px;border-radius:16px;max-width:640px;margin:auto;text-align:center">
      <h1 style="color:#22c55e;font-size:28px;margin-bottom:30px">Hey ${name}, Your Daily Picks Are Here!</h1>
      ${picks.map(p => `
        <div style="background:#1e293b;padding:20px;margin:15px 0;border-radius:12px">
          <div style="font-size:14px;color:#94a3b8">${p.game}</div>
          <div style="font-size:22px;margin:8px 0;color:#22c55e">${p.pick}</div>
          <div style="font-size:18px">@ ${p.odds} <span style="color:#94a3b8">(${p.probability})</span></div>
        </div>
      `).join('')}
      <p style="font-size:12px;color:#666;margin-top:40px">
        21+ • Entertainment only • Play responsibly
      </p>
    </div>
  `.trim();
}