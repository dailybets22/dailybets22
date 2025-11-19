// src/app/api/generate-picks/route.js
import { NextResponse } from 'next/server';

const ODDS_API_KEY = process.env.THE_ODDS_API_KEY;
const BEEHIIV_API_KEY = process.env.BEEHIIV_API_KEY;
const BEEHIIV_PUBLICATION_ID = process.env.BEEHIIV_PUBLICATION_ID;
const TEST_MODE = process.env.TEST_MODE === 'true';

export async function GET() {
  console.log('DAILY PICKS GENERATOR STARTED');

  let globalPicks = [];
  const debugInfo = { processedSubscribers: [], samplePicks: [] };

  // ============ 1. PICKS (REAL OR DUMMY) ============
  if (TEST_MODE) {
    console.log('TEST_MODE → using dummy picks');
    globalPicks = [
      { sport: 'NBA', game: 'Lakers @ Warriors', pick: 'Lakers ML', odds: '1.80', probability: '65.0%', category: 'safe' },
      { sport: 'NBA', game: 'Celtics @ Knicks', pick: 'Over 220.5', odds: '1.95', probability: '55.0%', category: 'medium' },
      { sport: 'NBA', game: 'Bulls @ Heat', pick: 'Heat +4.5', odds: '2.10', probability: '48.0%', category: 'high-risk' },
      { sport: 'NHL', game: 'Penguins @ Bruins', pick: 'Bruins ML', odds: '1.70', probability: '70.0%', category: 'safe' },
      { sport: 'NHL', game: 'Rangers @ Flyers', pick: 'Under 5.5', odds: '1.85', probability: '60.0%', category: 'medium' },
      { sport: 'NHL', game: 'Maple Leafs @ Senators', pick: 'Senators +1.5', odds: '2.20', probability: '45.0%', category: 'high-risk' },
    ];
    debugInfo.samplePicks = globalPicks.slice(0, 5);
  } else {
    // Real odds fetching (same as before) — omitted for brevity, but you can keep your version
    // (or leave it empty for now — dummy works perfectly)
  }

  // ============ 2. GET ALL SUBSCRIBERS (2025 FIX) ============
  const subscribers = await fetchAllBeehiivSubscribers();

  // ============ 3. PROCESS EACH SUBSCRIBER ============
  let updated = 0;
  for (const sub of subscribers) {
    let selectedSportsValue = '';

    // 2025 Beehiiv: try both possible structures
    if (sub.custom_fields?.fields) {
      const field = sub.custom_fields.fields.find(f =>
        f.name?.toLowerCase() === 'selected_sports' || f.key === 'selected_sports'
      );
      selectedSportsValue = field?.value || '';
    }
    if (!selectedSportsValue && sub.custom_fields) {
      selectedSportsValue = sub.custom_fields.selected_sports ||
                            sub.custom_fields.Selected_Sports ||
                            sub.custom_fields['selected_sports'] ||
                            '';
    }

    const userSports = selectedSportsValue
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);

    debugInfo.processedSubscribers.push({
      email: sub.email,
      rawField: selectedSportsValue,
      parsedSports: userSports,
      hasPicks: userSports.length > 0
    });

    if (userSports.length === 0) continue;

    const userPicks = globalPicks
      .filter(p => userSports.includes(p.sport.toLowerCase()))
      .sort((a, b) => parseFloat(b.probability) - parseFloat(a.probability));

    if (userPicks.length < 3) continue;

    const final10 = [
      ...userPicks.filter(p => p.category === 'safe').slice(p => p.category === 'safe').slice(0, 5),
      ...userPicks.filter(p => p.category === 'medium').slice(0, 2),
      ...userPicks.filter(p => p.category === 'high-risk').slice(0, 2),
      createParlay(userPicks.slice(0, 10))
    ];

    const html = renderEmailHtml(final10, sub.name || 'Friend');

    try {
      const res = await fetch(
        `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions/${sub.id}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${BEEHIIV_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            custom_fields: { today_picks_html: html }
          })
        }
      );

      if (res.ok) {
        updated++;
        console.log(`Updated ${sub.email}`);
      } else {
        console.log(`Beehiiv error: ${await res.text()}`);
      }
    } catch (e) {
      console.log(`Error: ${e.message}`);
    }
  }

  return NextResponse.json({
    success: true,
    picksGenerated: globalPicks.length,
    subscribersUpdated: updated,
    debug: debugInfo
  });
}

// =================== HELPER FUNCTIONS ===================

async function fetchAllBeehiivSubscribers() {
  const all = [];
  let page = 1;

  while (true) {
    const res = await fetch(
      `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions?page=${page}&limit=100`,
      {
        headers: { Authorization: `Bearer ${BEEHIIV_API_KEY}` }
      }
    );

    if (!res.ok) {
      console.log('Beehiiv subscribers fetch error:', await res.text());
      break;
    }

    const json = await res.json();
    all.push(...(json.data || []));

    if (!json.pagination?.next_page) break;
    page++;
  }

  console.log(`Fetched ${all.length} subscribers from Beehiiv`);
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
    <div style="font-family:Arial,sans-serif;background:#0f172a;color:white;padding:30px;border-radius:12px;max-width:600px;margin:auto">
      <h1 style="text-align:center;color:#22c55e">Hey ${name}, Your 10 Picks Are Ready!</h1>
      ${picks.map(p => `
        <div style="background:#1e293b;padding:15px;margin:10px 0;border-radius:8px">
          <strong>${p.game}</strong><br>
          ${p.pick} @ ${p.odds} <small>(${p.probability})</small>
        </div>
      `).join('')}
      <p style="text-align:center;font-size:12px;color:#666">21+ • Entertainment only</p>
    </div>`;
}