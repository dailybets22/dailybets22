"use client";

export default function Success() {
return (
<div className="min-h-screen bg-gradient-to-b from-black via-slate-900 to-black text-white">
{/* HERO */}
<section className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
<div className="absolute inset-0 bg-[url('/hero-bg.jpg')] bg-cover bg-center opacity-20"></div>


<div className="relative z-10 max-w-4xl">
<h1 className="mb-6 text-5xl font-black leading-tight md:text-7xl">
Thank You for Subscribing!
<br />
<span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
You're In.
</span>
</h1>


<p className="mx-auto mb-10 max-w-2xl text-lg text-gray-300 md:text-xl">
You've officially joined one of the sharpest daily betting newsletters.
Your picks will be delivered straight to your inbox every morning.
</p>


<div className="rounded-2xl bg-white/5 p-8 backdrop-blur-lg text-left mx-auto max-w-2xl">
<h3 className="text-2xl font-bold mb-4 text-emerald-400">What You'll Receive Daily</h3>


<ul className="space-y-4 text-gray-300">
<li>
<span className="font-bold text-emerald-300">5 Safe Picks</span> — High-probability selections based on strong trends,
injuries, and reliable oddsmaker discrepancies.
</li>
<li>
<span className="font-bold text-cyan-300">2 Medium-Risk Picks</span> — Balanced picks with better payouts while
still backed by strong analytics.
</li>
<li>
<span className="font-bold text-yellow-300">2 High-Risk Picks</span> — For bettors who like bigger odds and calculated
volatility.
</li>
<li>
<span className="font-bold text-pink-300">1 Parlay Pick</span> — A curated combination play designed for maximum
upside.
</li>
</ul>


<p className="mt-8 text-gray-400 text-center">
Check your email for confirmation and more details about your subscription.
</p>
</div>
</div>
</section>


<footer className="border-t border-white/10 py-12 text-center text-sm text-gray-500">
<p>Daily 10 Bets Newsletter • Trusted by Thousands • Est. 2025</p>
</footer>
</div>
);
}