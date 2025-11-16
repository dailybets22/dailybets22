// src/app/page.js
import SignupForm from '@/components/SignupForm';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-gray-800 rounded-xl shadow-2xl p-10">
        <h1 className="text-4xl font-bold text-center mb-4">
          Daily Bet Picks
        </h1>
        <p className="text-center text-gray-300 mb-8">
          Get 10 personalized picks every day: 5 safe • 2 medium • 2 high-risk • 1 parlay
        </p>
        <SignupForm />
        <p className="text-xs text-gray-500 text-center mt-8">
          21+ only • For entertainment purposes • Play responsibly
        </p>
      </div>
    </main>
  );
}