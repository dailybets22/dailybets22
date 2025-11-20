// src/app/api/generate-picks/route.js
import { NextResponse } from 'next/server';

const BEEHIIV_API_KEY = process.env.BEEHIIV_API_KEY;
const BEEHIIV_PUBLICATION_ID = process.env.BEEHIIV_PUBLICATION_ID;
const ODDS_API_KEY = process.env.THE_ODDS_API_KEY;

export async function GET() {
  const globalPicks = await fetchRealPicks();

  const subscribers = await fetchAllBeehiivSubscribers();
  console.log(`Fetched ${subscribers.length} subscribers from Beehiiv`);
  let updated = 0;

for (const sub of subscribers) {
  if (sub.status !== 'active') continue;

  // READ selected_sports — use exact field name from Beehiiv
  const sportsField = Array.isArray(sub.custom_fields)
    ? sub.custom_fields.find((f: any) => f.name === 'selected_sports')  // ← change if your field name differs!
    : null;

  const userSports = (sportsField?.value || '')
    .split(',')
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean);

    console.log(`Subscriber ${sub.email} selected sports:`, userSports);

  if (userSports.length === 0) continue;

  // FIX 1: Normalize sport from odds to lowercase for matching
  const userPicks = globalPicks
    .filter(p => {
      const sportLower = p.sport.toLowerCase();  // ← NBA → nba
      return userSports.includes(sportLower);
    })
    .sort((a, b) => parseFloat(b.probability) - parseFloat(a.probability));

    console.log(`Subscriber ${sub.email} has ${userPicks.length} matching picks`);

  // FIX 2: Lower threshold — even 1 pick is better than zero
  if (userPicks.length === 0) continue;

  // Build final 10 — prioritize best picks
  const safe = userPicks.filter(p => p.category === 'safe').slice(0, 5);
  const medium = userPicks.filter(p => p.category === 'medium').slice(0, 4);
  const risky = userPicks.filter(p => p.category === 'high-risk').slice(0, 3);
  const topPicks = [...safe, ...medium, ...risky].slice(0, 9);

  console.log(`Subscriber ${sub.email} final picks count before parlay:`, topPicks.length);

  // Always include parlay if we have at least 2 picks
  const final10 = topPicks;
  if (topPicks.length >= 2) {
    final10.push(createParlay(topPicks));
  }

  console.log(`Subscriber ${sub.email} final picks count after parlay:`, final10.length);

  const html = renderEmailHtml(final10, sub.name || 'Friend');

  console.log(`Generated HTML for ${sub.email}:`, html.slice(0, 100) + '...');

  // WRITE to Beehiiv — use exact field name
        try {
            // Update subscription by ID (PUT /publications/:publicationId/subscriptions/:subscriptionId)
        console.log(`DEBUG: About to update ${sub.email}, html exists: ${html}, html length: ${html?.length || 0}`);
        const response = await fetch(`https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions/${sub.id}`, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${BEEHIIV_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            custom_fields: [
            {
                name: "today_picks_html",
                value: html
            }
            ]
        }),
        });

    if (response.ok) {
      updated++;
      console.log(`SUCCESS → ${sub.email} updated!`);
    } else {
      const err = await response.text();
      console.log(`FAILED → ${sub.email} | ${response.status} | ${err}`);
    }
  } catch (e) {
    const msg = (e as any)?.message ?? String(e);
    console.log('EXCEPTION →', msg);
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
                sport: sportKey.includes('nba') ? 'nba' : 'nhl',
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
      const msg = (e as any)?.message ?? String(e);
      console.error(`Odds API error for ${sportKey}:`, msg);
    }
  }

  // Remove duplicates & sort by probability
  const unique = Array.from(new Map(allPicks.map((p: any) => [`${p.game}-${p.pick}`, p])).values());
  return unique.sort((a: any, b: any) => parseFloat(b.probability) - parseFloat(a.probability));
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
function createParlay(picks: any[]) {
  const legs = picks.slice(0, 3);
  const payout = legs.reduce((a: number, p: any) => a * parseFloat(p.odds), 1).toFixed(2);
  return {
    sport: 'Multi',
    game: 'Daily Parlay',
    pick: legs.map((p: any) => p.pick).join(' × '),
    odds: payout,
    probability: 'High Reward',
    category: 'parlay'
  };
}

function renderEmailHtml(picks: any[], name: string) {
  return `${picks.map((p: any) => `${p.game}: ${p.pick} @ ${p.odds} (${p.probability})`).join('\n')}`;
}