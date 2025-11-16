// src/components/SignupForm.js
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';

const sportsList = [
  'NFL', 'NBA', 'MLB', 'NHL', 'Soccer', 'Tennis', 'Golf', 'UFC', 'Boxing',
  'NCAA Football', 'NCAA Basketball', 'Esports', 'Cricket', 'Rugby',
  'Formula 1', 'WNBA', 'MLS', 'ATP Tennis', 'PGA', 'ATP/WTA'
];

export default function SignupForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const [selectedSports, setSelectedSports] = useState([]);
  const [message, setMessage] = useState('');

  const onSubmit = async (data) => {
    if (selectedSports.length === 0) {
      setMessage('Please select at least one sport');
      return;
    }

    const res = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: data.email,
        name: data.name || '',
        sports: selectedSports
      })
    });

    const result = await res.json();
    if (result.success) {
      setMessage('Check your email – welcome aboard!');
    } else {
      setMessage(result.error || 'Something went wrong');
    }
  };

  const toggleSport = (sport) => {
    setSelectedSports(prev =>
      prev.includes(sport)
        ? prev.filter(s => s !== sport)
        : [...prev, sport]
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <input
          {...register('email', { required: 'Email is required' })}
          type="email"
          placeholder="Your email"
          className="w-full px-4 py-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>}
      </div>

      <div>
        <input
          {...register('name')}
          type="text"
          placeholder="Name (optional)"
          className="w-full px-4 py-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <div>
        <p className="mb-3 text-sm text-gray-400">Select your favorite sports:</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-64 overflow-y-auto bg-gray-700 p-4 rounded-lg">
          {sportsList.map(sport => (
            <label key={sport} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedSports.includes(sport)}
                onChange={() => toggleSport(sport)}
                className="w-5 h-5 text-green-500 rounded focus:ring-green-500"
              />
              <span className="text-sm">{sport}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-4 bg-green-600 hover:bg-green-700 disabled:opacity-70 rounded-lg font-bold text-lg transition"
      >
        {isSubmitting ? 'Sending...' : 'Get Daily Picks →'}
      </button>

      {message && <p className={`text-center mt-4 ${message.includes('welcome') ? 'text-green-400' : 'text-red-400'}`}>{message}</p>}
    </form>
  );
}