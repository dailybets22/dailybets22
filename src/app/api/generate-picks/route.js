// src/app/api/generate-picks/route.js
import { NextResponse } from 'next/server';

const BEEHIIV_API_KEY = process.env.BEEHIIV_API_KEY;
const BEEHIIV_PUBLICATION_ID = process.env.BEEHIIV_PUBLICATION_ID;
const TEST_MODE = process.env.TEST_MODE === 'true';

export async function GET() {
  console.log('STEP 1: Script started');

  // Dummy picks
  const globalPicks = [
    { sport: 'NBA', game: 'Lakers @ Warriors', pick: 'Lakers ML', odds: '1.80', probability: '65.0%', category: 'safe' },
    { sport: 'NBA', game: 'Celtics @ Knicks', pick: 'Over 220.5', odds: '1.95', probability: '55.0%', category: 'medium' },
    { sport: 'NHL', game: 'Penguins @ Bruins', pick: 'Bruins ML', odds: '1.70', probability: '70.0%', category: 'safe' },
  ];
  console.log('STEP 2: Dummy picks loaded →', globalPicks.length);

  const subscribers = await fetchAllBeehiivSubscribers();
  console.log(`STEP 3: Fetched ${subscribers.length} subscribers`);

  let updated = 0;

  for (const sub of subscribers) {
    console.log(`\nPROCESSING: ${sub.email} | ID: ${sub.id} | Status: ${sub.status}`);

    if (sub.status !== 'active') {
      console.log('→ Skipped (not active)');
      continue;
    }

    // Extract selected_sports
    let selectedSportsValue = '';
    if (Array.isArray(sub.custom_fields)) {
      const field = sub.custom_fields.find(f => f.key === 'selected_sports');
      selectedSportsValue = field?.value || '';
    }
    console.log(`→ selected_sports raw value: "${selectedSportsValue}"`);

    const userSports = selectedSportsValue.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    console.log(`→ Parsed sports: [${userSports.join(', ')}]`);

    if (userSports.length === 0) {
      console.log('→ No sports → skipping');
      continue;
    }

    const userPicks = globalPicks.filter(p => userSports.includes(p.sport.toLowerCase()));
    console.log(`→ Found ${userPicks.length} picks for user`);

    if (userPicks.length < 2) {
      console.log('→ Not enough picks → skipping');
      continue;
    }

    const final10 = [
      ...userPicks.filter(p => p.category === 'safe').slice(0, 5),
      ...userPicks.filter(p => p.category === 'medium').slice(0, 2),
      createParlay(userPicks)
    ];

   // const html = renderEmailHtml(final10, sub.name || 'Friend');
   // console.log(`→ HTML generated: ${html.length} characters`);
   // console.log(`→ HTML preview: ${html.substring(0, 300).replace(/\n/g, ' ')}...`);

    const html="test html";

    // FINAL PUT REQUEST
    console.log(`\nSENDING PUT REQUEST TO BEEHIIV...`);
    console.log(`URL: https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions/${sub.id}`);
    console.log(`Body:`, JSON.stringify({
      custom_fields: [{ name: "today_picks_html", value: html }]
    }, null, 2));

    try {
  const response = await fetch(
    `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions/${sub.id}`,
    {
      method: "PUT",  // ← Exact as Postman
      headers: {
        Authorization: `Bearer ${BEEHIIV_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        custom_fields: [  
          {
            name: "today_picks_html",  // ← Exact name from Beehiiv
            value: html
          }
        ]
      })
    }
  );

  const body = await response.json();
  console.log(`RESPONSE for ${sub.email}:`, body);

  if (response.ok) {
    updated++;
    console.log(`SUCCESS → ${sub.email} updated with ${html.length} chars of HTML`);
  } else {
    console.log(`FAILED → ${sub.email} | Status: ${response.status} | Body: ${JSON.stringify(body)}`);
  }
} catch (e) {
  console.log(`EXCEPTION → ${sub.email} | ${e.message}`);
}
  }

  return NextResponse.json({
    success: true,
    subscribersUpdated: updated,
    message: updated > 0 ? "IT WORKED!" : "Still failed — check logs above",
    debug: "Check Vercel logs for full step-by-step output"
  });
}

// Helpers (unchanged)
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

function createParlay(picks) {
  return { sport: 'Multi', game: 'Parlay', pick: '3-leg parlay', odds: '5.50', probability: 'High Reward', category: 'parlay' };
}

function renderEmailHtml(picks, name) {
  return `
    <div style="background:#000;color:#fff;padding:20px;font-family:Arial">
      <h1>Hey ${name}!</h1>
      ${picks.map(p => `<p><strong>${p.game}</strong> → ${p.pick} @ ${p.odds}</p>`).join('')}
    </div>`;
}