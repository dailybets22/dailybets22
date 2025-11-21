// src/app/api/generate-picks/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import DailyPicksEmail from '@/emails/DailyPicksEmail'; // ← create this next (I’ll give you)

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);
const ODDS_API_KEY = process.env.THE_ODDS_API_KEY;

export async function GET() {
  const globalPicks = await fetchRealPicks();
  if (globalPicks.length === 0) {
    return NextResponse.json({ error: 'No picks today' }, { status: 500 });
  }

  const { data: subscribers, error } = await supabase
    .from('subscribers')
    .select('email, name, selected_sports, is_active_subscriber')
    .eq('is_active_subscriber', true);

  if (error || !subscribers) {
    return NextResponse.json({ error: 'Failed to fetch subscribers' });
  }

  let sent = 0;
  for (const sub of subscribers) {
    const userSports = sub.selected_sports.map((s: string) => s.toLowerCase());
    const userPicks = globalPicks
      .filter(p => userSports.includes(p.sport))
      .slice(0, 15); // plenty to work with

    if (userPicks.length === 0) continue;

    const safe = userPicks.filter(p => p.category === 'safe').slice(0, 5);
    const medium = userPicks.filter(p => p.category === 'medium').slice(0, 4);
    const high = userPicks.filter(p => p.category === 'high-risk').slice(0, 3);
    const topPicks = [...safe, ...medium, ...high];

    const finalPicks = topPicks.length >= 2
      ? [...topPicks, createParlay(topPicks)]
      : topPicks;

    try {
      await resend.emails.send({
        from: 'Daily Bets <delivered@resend.dev>',
        to: sub.email,
        subject: `Your ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} Picks Are In`,
        react: DailyPicksEmail({
          name: sub.name || 'Sharp',
          picks: finalPicks,
        }),
      });
      sent++;
      console.log(`Sent to ${sub.email}`);
    } catch (e: any) {
      console.error(`Failed for ${sub.email}:`, e.message);
    }

    // Stay under Resend 2/sec limit
    await new Promise(r => setTimeout(r, 600));
  }

  return NextResponse.json({
    success: true,
    picksGenerated: globalPicks.length,
    emailsSent: sent,
    totalActiveSubs: subscribers.length,
    generatedAt: new Date().toISOString(),
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