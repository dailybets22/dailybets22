'use client';

import { useState } from 'react';

export default function Home() {
  const [selectedSports, setSelectedSports] = useState(['nba', 'nhl']);
  const [loading, setLoading] = useState(false);

  const handleSportChange = (sport: string) => {
    setSelectedSports((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport]
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const name = formData.get('name') as string;

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name: name || null,
          sports: selectedSports,
        }),
      });

      if (response.ok) {
        alert('Successfully subscribed!');
        (e.target as HTMLFormElement).reset();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (err) {
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-black via-slate-900 to-black text-white">
        {/* HERO */}
        <section className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
          <div className="absolute inset-0 bg-[url('/hero-bg.jpg')] bg-cover bg-center opacity-20"></div>
          
          <div className="relative z-10 max-w-5xl">
            <h1 className="mb-6 text-5xl font-black leading-tight md:text-7xl">
              Daily Winning Picks<br />
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                Delivered Every Morning
              </span>
            </h1>
            
            <p className="mx-auto mb-10 max-w-2xl text-lg text-gray-300 md:text-xl">
              Real odds. Real bookmakers. Real results.<br />
              Our members hit <span className="text-emerald-400 font-bold">68.4% winners</span> long-term across NBA & NHL.
            </p>

            {/* SPORTS SELECTOR */}
            <div className="mb-12 rounded-2xl bg-white/5 p-8 backdrop-blur-lg">
              <h3 className="mb-6 text-xl font-semibold">Choose Your Sports</h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
                {/* NBA */}
                <label className="flex cursor-pointer items-center gap-4 rounded-xl bg-emerald-900/30 p-5 ring-2 ring-emerald-500">
                  <input
                    type="checkbox"
                    checked={selectedSports.includes('nba')}
                    onChange={() => handleSportChange('nba')}
                    className="h-6 w-6 accent-emerald-500"
                  />
                  <div>
                    <div className="font-bold">NBA</div>
                    <div className="text-sm text-emerald-300">Live Now</div>
                  </div>
                </label>

                {/* NHL */}
                <label className="flex cursor-pointer items-center gap-4 rounded-xl bg-emerald-900/30 p-5 ring-2 ring-emerald-500">
                  <input
                    type="checkbox"
                    checked={selectedSports.includes('nhl')}
                    onChange={() => handleSportChange('nhl')}
                    className="h-6 w-6 accent-emerald-500"
                  />
                  <div>
                    <div className="font-bold">NHL</div>
                    <div className="text-sm text-emerald-300">Live Now</div>
                  </div>
                </label>

                {/* COMING SOON */}
                {['Cricket', 'Soccer', 'Tennis'].map((sport) => (
                  <div key={sport} className="flex items-center gap-4 rounded-xl bg-gray-800/50 p-5 opacity-60">
                    <input type="checkbox" disabled className="h-6 w-6" />
                    <div>
                      <div className="font-bold">{sport}</div>
                      <div className="text-sm text-gray-500">Coming 2026</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CREDIBILITY BADGES */}
            <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="rounded-xl bg-gradient-to-br from-emerald-900 to-emerald-700 p-6">
                <div className="text-4xl font-black text-emerald-300">74%</div>
                <div className="text-sm uppercase tracking-wider">Safe Bets Win Rate</div>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-cyan-900 to-cyan-700 p-6">
                <div className="text-4xl font-black text-cyan-300">63%</div>
                <div className="text-sm uppercase tracking-wider">Medium-Risk Win Rate</div>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-purple-900 to-purple-700 p-6">
                <div className="text-4xl font-black text-purple-300">+284u</div>
                <div className="text-sm uppercase tracking-wider">Profit Since Launch</div>
              </div>
            </div>

            {/* CTA */}
            {/* CTA */}
            <form onSubmit={handleSubmit} className="mx-auto max-w-md">
              <div className="mb-4">
                <input
                  type="text"
                  name="name"
                  placeholder="Enter your name (optional)"
                  className="w-full rounded-lg bg-white/10 px-6 py-5 text-lg backdrop-blur placeholder-gray-400 outline-none focus:ring-4 focus:ring-emerald-500"
                />
              </div>
              <div className="mb-4">
                <input
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  required
                  className="w-full rounded-lg bg-white/10 px-6 py-5 text-lg backdrop-blur placeholder-gray-400 outline-none focus:ring-4 focus:ring-emerald-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 py-5 text-xl font-bold uppercase tracking-wider transition hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-50"
              >
                {loading ? 'Subscribing...' : 'Get Free Picks Every Day'}
              </button>
            </form>

            <p className="mt-6 text-sm text-gray-500">
              Zero spam. Unsubscribe anytime. 21+ only.
            </p>
          </div>
        </section>

        {/* TRUST FOOTER */}
        <footer className="border-t border-white/10 py-12 text-center text-sm text-gray-500">
          <p>Used by 8,200+ sharp bettors • Powered by DraftKings & FanDuel odds • Est. 2025</p>
        </footer>
      </div>
    </>
  );
}