// src/app/api/generate-picks/route.js
import { NextResponse } from 'next/server';

const BEEHIIV_API_KEY = process.env.BEEHIIV_API_KEY;
const BEEHIIV_PUBLICATION_ID = process.env.BEEHIIV_PUBLICATION_ID;
const ODDS_API_KEY = process.env.THE_ODDS_API_KEY;
const TEST_MODE = process.env.TEST_MODE === 'true';

export async function GET() {
  const globalPicks = TEST_MODE ? getDummyPicks() : await getRealPicks();

  const subscribers = await fetchAllBeehiivSubscribers();
  let updated = 0;

  for (const sub of subscribers) {
    if (sub.status !== 'active') continue;

    // Read selected_sports (Beehiiv uses "name", not "key")
    const sportsField = Array.isArray(sub.custom_fields)
      ? sub.custom_fields.find(f => f.name === 'selected_sports')
      : null;

    const selectedSportsValue = sportsField?.value || '';
    const userSports = selectedSportsValue
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

    // Beehiiv v2: PUT + array format
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
              {
                name: 'today_picks_html',
                value: html
              }
            ]
          })
        }
      );

      if (res.ok) updated++;
    } catch (e) {
      // Silent fail in production (one user failing won't break the run)
      console.error(`Failed to update ${sub.email}:`, e.message);
    }
  }

  return NextResponse.json({
    success: true,
    picksGenerated: globalPicks.length,
    subscribersUpdated: updated,
    mode: TEST_MODE ? 'TEST_MODE (dummy picks)' : 'LIVE (real odds)',
    generatedAt: new Date().toISOString()
  });
}

// —————— HELPERS ——————

async function fetchAllBeehiivSubscribers() {
  const all = [];
  let page = 1;
  while (true) {
    const url = `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions?page=${page}&limit=100&expand=custom_fields`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${BEEHIIV_API_KEY}` }
    });
    if (!res.ok) break;
    const json = await res.json();
    all.push(...(json.data || []));
    if (!json.pagination?.next_page) break;
    page++;
  }
  return all;
}

function getDummyPicks() {
  return [
    { sport: 'NBA', game: 'Lakers @ Warriors', pick: 'Lakers ML', odds: '1.80', probability: '65%', category: 'safe' },
    { sport: 'NBA', game: 'Celtics @ Knicks', pick: 'Over 220.5', odds: '1.95', probability: '55%', category: 'medium' },
    { sport: 'NBA', game: 'Bulls @ Heat', pick: 'Heat +4.5', odds: '2.10', probability: '48%', category: 'high-risk' },
    { sport: 'NHL', game: 'Penguins @ Bruins', pick: 'Bruins ML', odds: '1.70', probability: '70%', category: 'safe' },
    { sport: 'NHL', game: 'Rangers @ Flyers', pick: 'Under 5.5', odds: '1.85', probability: '60%', category: 'medium' },
    { sport: 'NHL', game: 'Leafs @ Sens', pick: 'Sens +1.5', odds: '2.20', probability: '45%', category: 'high-risk' },
  ];
}

async function getRealPicks() {
  // Placeholder — replace with your real odds parsing when ready
  return getDummyPicks(); // Remove this line when live
}

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
      <h1 style="color:#22c55e;font-size:28px">Hey ${name}, Your Daily Picks Are Here!</h1>
      ${picks.map(p => `
        <div style="background:#1e293b;padding:18px;margin:15px 0;border-radius:12px">
          <strong style="font-size:18px">${p.game}</strong><br>
          <span style="font-size:20px;color:#22c55e">${p.pick}</span> 
          <span style="color:#94a3b8">@ ${p.odds}</span>
          ${p.probability ? `<small style="color:#94a3b8">(${p.probability})</small>` : ''}
        </div>
      `).join('')}
      <p style="font-size:12px;color:#666;margin-top:40px">
        21+ • Entertainment only • Play responsibly
      </p>
    </div>
  `.trim();
}