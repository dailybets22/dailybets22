// src/app/api/generate-picks/route.js
import { NextResponse } from 'next/server';

const ODDS_API_KEY = process.env.THE_ODDS_API_KEY;
const BEEHIIV_API_KEY = process.env.BEEHIIV_API_KEY;
const BEEHIIV_PUBLICATION_ID = process.env.BEEHIIV_PUBLICATION_ID;
const TEST_MODE = process.env.TEST_MODE === 'true';

const SPORTS_MAP = {
  'nba': 'NBA',
  'nhl': 'NHL',
  'basketball_nba': 'NBA',
  'ice_hockey_nhl': 'NHL'
};

export async function GET() {
  console.log('=== DAILY PICKS GENERATOR STARTED ===');
  console.log('TEST_MODE:', TEST_MODE);

  if (!BEEHIIV_API_KEY || !BEEHIIV_PUBLICATION_ID) {
    console.error('Beehiiv env vars missing!');
    return NextResponse.json({ error: 'Beehiiv config missing' }, { status: 500 });
  }

  let globalPicks = [];
  const debugInfo = { processedSubscribers: [], samplePicks: [] };

  // === 1. FETCH ODDS (Real or Dummy) ===
  if (TEST_MODE) {
    console.log('Using TEST_MODE dummy picks...');
    // Dummy picks for testing (5 per sport)
    const dummyPicks = [
      { sport: 'NBA', game: 'Lakers @ Warriors', pick: 'Lakers ML', odds: '1.80', probability: '65.0%', category: 'safe' },
      { sport: 'NBA', game: 'Celtics @ Knicks', pick: 'Over 220.5', odds: '1.95', probability: '55.0%', category: 'medium' },
      { sport: 'NBA', game: 'Bulls @ Heat', pick: 'Heat +4.5', odds: '2.10', probability: '48.0%', category: 'high-risk' },
      { sport: 'NHL', game: 'Penguins @ Bruins', pick: 'Bruins ML', odds: '1.70', probability: '70.0%', category: 'safe' },
      { sport: 'NHL', game: 'Rangers @ Flyers', pick: 'Under 5.5', odds: '1.85', probability: '60.0%', category: 'medium' },
      { sport: 'NHL', game: 'Maple Leafs @ Senators', pick: 'Senators +1.5', odds: '2.20', probability: '45.0%', category: 'high-risk' },
      // Add more dummies if needed
    ];
    globalPicks = dummyPicks;
    debugInfo.samplePicks = dummyPicks.slice(0, 5);
  } else {
    console.log('Fetching real odds...');
    for (const [key, name] of Object.entries({ basketball_nba: 'NBA', ice_hockey_nhl: 'NHL' })) {
      const url = `https://api.the-odds-api.com/v4/sports/${key}/odds/?regions=us&oddsFormat=decimal&markets=h2h,spreads,totals&apiKey=${ODDS_API_KEY}`;
      try {
        const res = await fetch(url);
        if (!res.ok) {
          console.log(`${name} API error: ${res.status} - ${await res.text()}`);
          continue;
        }
        const games = await res.json();
        console.log(`${name}: ${games.length} games found`);

        for (const game of games) {
          if (!game.bookmakers?.length) continue;
          for (const book of game.bookmakers.slice(0, 3)) {
            for (const market of book.markets || []) {
              for (const outcome of market.outcomes || []) {
                const prob = (1 / outcome.price) * 100;
                const category = prob >= 70 ? 'safe' : prob <= 50 ? 'high-risk' : 'medium';

                const pick = {
                  sport: name,
                  game: `${game.away_team} @ ${game.home_team}`,
                  pick: outcome.name,
                  odds: outcome.price.toFixed(2),
                  probability: prob.toFixed(1) + '%',
                  category
                };
                globalPicks.push(pick);
                if (globalPicks.length <= 5) debugInfo.samplePicks.push(pick);
              }
            }
          }
        }
      } catch (e) {
        console.log(`${name} fetch error:`, e.message);
      }
    }
  }

  console.log(`Total picks: ${globalPicks.length} (real or dummy)`);

  // === 2. PROCESS SUBSCRIBERS ===
  const subscribers = await fetchAllBeehiivSubscribers();
  console.log(`Found ${subscribers.length} subscribers`);

  let updated = 0;
  for (const sub of subscribers) {
    // Try multiple field names
    const rawField = sub.custom_fields?.selected_sports || sub.custom_fields?.Selected_Sports || sub.custom_fields?.sports || '';
    const userSports = rawField
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);

    const debugSub = {
      email: sub.email,
      rawField: rawField,
      parsedSports: userSports,
      hasPicks: userSports.length > 0
    };
    debugInfo.processedSubscribers.push(debugSub);

    if (userSports.length === 0) {
      console.log(`Skipping ${sub.email} — no sports`);
      continue;
    }

    console.log(`Processing ${sub.email} with sports: ${userSports.join(', ')}`);

    const userPicks = globalPicks
      .filter(p => userSports.includes(p.sport.toLowerCase()) || userSports.includes(p.sport === 'NBA' ? 'nba' : 'nhl'))
      .sort((a, b) => parseFloat(b.probability) - parseFloat(a.probability));

    if (userPicks.length < 5) {
      console.log(`Skipping ${sub.email} — only ${userPicks.length} picks available`);
      continue;
    }

    const final10 = [
      ...userPicks.filter(p => p.category === 'safe').slice(0, 5),
      ...userPicks.filter(p => p.category === 'medium').slice(0, 2),
      ...userPicks.filter(p => p.category === 'high-risk').slice(0, 2),
      createParlay(userPicks.slice(0, 10))
    ];

    const html = renderEmailHtml(final10, sub.name || 'Friend');

    try {
      const response = await fetch(
        `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions/${sub.id}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${BEEHIIV_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            custom_fields: {
              today_picks_html: html  // Your field
            }
          })
        }
      );

      if (response.ok) {
        updated++;
        console.log(`SUCCESS: Updated ${sub.email}`);
      } else {
        const err = await response.text();
        console.log(`Beehiiv PATCH error for ${sub.email}: ${response.status} - ${err}`);
      }
    } catch (e) {
      console.log(`Network error for ${sub.email}:`, e.message);
    }
  }

  console.log(`=== FINISHED: Updated ${updated} subscribers ===`);

  return NextResponse.json({
    success: true,
    picksGenerated: globalPicks.length,
    subscribersUpdated: updated,
    debug: debugInfo  // Full sample picks + subscriber details
  });
}

// Helpers (same as before, abbreviated)
function createParlay(picks) {
  const legs = picks.slice(0, 3);
  const payout = legs.reduce((a, p) => a * parseFloat(p.odds), 1).toFixed(2);
  return {
    sport: 'Multi', game: 'Daily Parlay', pick: legs.map(p => p.pick).join(' × '),
    odds: payout, probability: 'High Reward', category: 'parlay'
  };
}

function renderEmailHtml(picks, name) {
  return `<div style="font-family:Arial;background:#111;color:#fff;padding:20px;"><h1>Hey ${name}!</h1><h2>Your 10 Picks</h2>${picks.map(p => `<p><strong>${p.game}</strong><br>${p.pick} @ ${p.odds} (${p.probability})</p>`).join('')}</div>`;
}

async function fetchAllBeehiivSubscribers() {
  const all = [];
  let page = 1;
  while (true) {
    const res = await fetch(
      `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions?page=${page}&limit=100`,
      { headers: { Authorization: `Bearer ${BEEHIIV_API_KEY}` } }
    );
    if (!res.ok) break;
    const json = await res.json();
    all.push(...(json.data || []));
    if (!json.pagination?.next_page) break;
    page++;
  }
  return all;
}