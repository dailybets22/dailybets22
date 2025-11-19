// src/app/api/generate-picks/route.js
import { NextResponse } from 'next/server';

const BEEHIIV_API_KEY = process.env.BEEHIIV_API_KEY;
const BEEHIIV_PUBLICATION_ID = process.env.BEEHIIV_PUBLICATION_ID;
const TEST_MODE = process.env.TEST_MODE === 'true';

export async function GET() {
  console.log('DAILY PICKS STARTED');

  // Dummy picks for testing (real odds later)
  const globalPicks = TEST_MODE ? [
    { sport: 'NBA', game: 'Lakers @ Warriors', pick: 'Lakers ML', odds: '1.80', probability: '65.0%', category: 'safe' },
    { sport: 'NBA', game: 'Celtics @ Knicks', pick: 'Over 220.5', odds: '1.95', probability: '55.0%', category: 'medium' },
    { sport: 'NBA', game: 'Bulls @ Heat', pick: 'Heat +4.5', odds: '2.10', probability: '48.0%', category: 'high-risk' },
    { sport: 'NHL', game: 'Penguins @ Bruins', pick: 'Bruins ML', odds: '1.70', probability: '70.0%', category: 'safe' },
    { sport: 'NHL', game: 'Rangers @ Flyers', pick: 'Under 5.5', odds: '1.85', probability: '60.0%', category: 'medium' },
    { sport: 'NHL', game: 'Maple Leafs @ Senators', pick: 'Senators +1.5', odds: '2.20', probability: '45.0%', category: 'high-risk' },
  ] : [];

  const debugInfo = { processed: [], samplePicks: globalPicks.slice(0, 5) };

  const subscribers = await fetchAllBeehiivSubscribers();
  let updated = 0;

  for (const sub of subscribers) {
    // Only active subscribers
    if (sub.status !== 'active') {
      console.log(`Skipping ${sub.email} — status: ${sub.status}`);
      continue;
    }

    // Extract selected_sports from expanded custom_fields array
    let selectedSportsValue = '';
    if (Array.isArray(sub.custom_fields)) {
      const field = sub.custom_fields.find(f => 
        f.key === 'selected_sports' || 
        f.name?.toLowerCase().includes('selected')
      );
      selectedSportsValue = field?.value || '';
    }

    const userSports = selectedSportsValue
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);

    debugInfo.processed.push({
      email: sub.email,
      status: sub.status,
      rawField: selectedSportsValue,
      parsedSports: userSports,
      willUpdate: userSports.length > 0
    });

    if (userSports.length === 0) continue;

    const userPicks = globalPicks
      .filter(p => userSports.includes(p.sport.toLowerCase()))
      .sort((a, b) => parseFloat(b.probability) - parseFloat(a.probability));

    if (userPicks.length < 3) continue;

    const final10 = [
      ...userPicks.filter(p => p.category === 'safe').slice(0, 5),
      ...userPicks.filter(p => p.category === 'medium').slice(0, 2),
      ...userPicks.filter(p => p.category === 'high-risk').slice(0, 2),
      createParlay(userPicks.slice(0, 10))
    ];

    const html = renderEmailHtml(final10, sub.name || 'Friend');
    // ADD THIS LINE TO SEE THE HTML
console.log(`HTML for ${sub.email} → ${html.length} chars | Starts with: ${html.substring(0, 150).replace(/\n/g, ' ')}...`);

try {
  const response = await fetch(
    `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions/${sub.id}`,
    {
      method: "PUT",  // ← MUST be PUT
      headers: {
        Authorization: `Bearer ${BEEHIIV_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        custom_fields: [
          {
            name: "today_picks_html",   // ← exact name from Beehiiv (case-sensitive)
            value: html
          }
        ]
      }),
    }
  );

  if (response.ok) {
    updated++;
    console.log(`SUCCESS → ${sub.email} updated with today_picks_html`);
  } else {
    const errorBody = await response.text();
    console.log(`FAILED → ${sub.email} | ${response.status} | ${errorBody}`);
  }
} catch (e) {
  console.log(`EXCEPTION → ${sub.email} | ${e.message}`);
}
  }

  return NextResponse.json({
    success: true,
    picksGenerated: globalPicks.length,
    subscribersUpdated: updated,
    activeSubscribersProcessed: subscribers.filter(s => s.status === 'active').length,
    debug: debugInfo
  });
}

// =================== HELPERS ===================
async function fetchAllBeehiivSubscribers() {
  const all = [];
  let page = 1;

  while (true) {
    const url = `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions?page=${page}&limit=100&expand=custom_fields`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${BEEHIIV_API_KEY}` }
    });

    if (!res.ok) {
      console.log('Beehiiv fetch error:', await res.text());
      break;
    }

    const json = await res.json();
    all.push(...(json.data || []));

    if (!json.pagination?.next_page) break;
    page++;
  }

  console.log(`Fetched ${all.length} total subscribers (including inactive)`);
  return all;
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
    <div style="font-family:Arial,sans-serif;background:#0f172a;color:white;padding:30px;border-radius:12px;max-width:600px;margin:auto;text-align:center">
      <h1 style="color:#22c55e">Hey ${name}, Your 10 Picks Are Here!</h1>
      ${picks.map(p => `
        <div style="background:#1e293b;padding:15px;margin:12px 0;border-radius:8px">
          <strong>${p.game}</strong><br>
          ${p.pick} @ ${p.odds} <small>(${p.probability})</small>
        </div>
      `).join('')}
      <p style="font-size:12px;color:#666;margin-top:30px">21+ • Entertainment only • Play responsibly</p>
    </div>`;
}