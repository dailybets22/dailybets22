// src/app/api/subscribe/route.js
import { NextResponse } from 'next/server';

const BEEHIIV_API_KEY = process.env.BEEHIIV_API_KEY;
const BEEHIIV_PUBLICATION_ID = process.env.BEEHIIV_PUBLICATION_ID;

export async function POST(request) {
  const { email, name, sports } = await request.json();

  if (!email || sports.length === 0) {
    return NextResponse.json({ error: 'Email and sports required' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BEEHIIV_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        email,
        name: name || null,
        reactivate_if_unsubscribed: true,
        send_welcome_email: true,
        custom_fields: {},
        tags: sports  // This tags the user by selected sports
      })
    });

    if (res.ok) {
      return NextResponse.json({ success: true });
    } else {
      const error = await res.json();
      return NextResponse.json({ error: error.message || 'Beehiiv error' }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}