'use client';

import { useState } from 'react';

export default function Home() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [selectedSports, setSelectedSports] = useState(['nba', 'nhl']);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSportChange = (sport: string) => {
    setSelectedSports((prev) =>
      prev.includes(sport)
        ? prev.filter((s) => s !== sport)
        : [...prev, sport]
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name: name || null,
          selected_sports: selectedSports,
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        setErrorMessage(json?.error || 'Subscription failed');
        setLoading(false);
        return;
      }

      // SUCCESS — CLEAR FORM
      setSuccessMessage('Thank you for subscribing!');
      setEmail("");
      setName("");
      setSelectedSports(['nba', 'nhl']);

      setTimeout(() => setSuccessMessage(null), 5000);

    } catch (err) {
      setErrorMessage('Something went wrong. Please try again.');
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
                      <div className="text-sm text-gray-500">Coming Soon..</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* FORM */}
            <form onSubmit={handleSubmit} className="mx-auto max-w-md">
              <div className="mb-4">
                <input
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg bg-white/10 px-6 py-5 text-lg backdrop-blur placeholder-gray-400 outline-none focus:ring-4 focus:ring-emerald-500"
                />
              </div>

              <div className="mb-4">
                <input
                  type="text"
                  name="name"
                  placeholder="Enter your name (optional)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg bg-white/10 px-6 py-5 text-lg backdrop-blur placeholder-gray-400 outline-none focus:ring-4 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 py-5 text-xl font-bold uppercase tracking-wider transition transform hover:from-emerald-400 hover:to-cyan-400 active:scale-95 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {loading ? 'Subscribing...' : 'Get Your Picks Every Day'}
              </button>

              {successMessage && (
                <div className="mt-4 rounded-lg bg-emerald-500/20 px-4 py-3 text-center text-emerald-300">
                  {successMessage}
                </div>
              )}

              {errorMessage && (
                <div className="mt-4 rounded-lg bg-red-500/20 px-4 py-3 text-center text-red-300">
                  {errorMessage}
                </div>
              )}
            </form>

            <p className="mt-6 mb-6 text-sm text-gray-500">
              Zero spam. Unsubscribe anytime. Entertainment only. Bet on your own risk. 21+ only.
            </p>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="border-t border-white/10 py-12 text-center text-sm text-gray-500">
          <p>Used by 8,200+ sharp bettors • Powered by DraftKings & FanDuel odds • Est. 2025</p>
        </footer>
      </div>
    </>
  );
}
