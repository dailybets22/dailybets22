// src/app/api/subscribe/route.js
import { NextResponse } from 'next/server';

const BEEHIIV_API_KEY = process.env.BEEHIIV_API_KEY;
const BEEHIIV_PUBLICATION_ID = process.env.BEEHIIV_PUBLICATION_ID;

export async function POST(request) {
  try {
    const { email, name, sports } = await request.json();

    if (!email || !sports || sports.length === 0) {
      return NextResponse.json(
        { error: 'Email and at least one sport required' },
        { status: 400 }
      );
    }

    const sportsString = (Array.isArray(sports) && sports.length > 0) ? sports.join(',') : '';

    payload = {
      email: email,  // Use the provided email value
      custom_fields: [
        { name: 'name', value: name || '' },  // Places name in custom_fields
        { name: 'today_picks', value: 'test' },  // Test value as specified
        { name: 'selected_sports', value: sportsString }  // Converts sports array to comma-separated string
      ],
      send_welcome_email: true,
      reactivate_if_unsubscribed: true};

    const res = await fetch(
      `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${BEEHIIV_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    if (res.ok) {
      return NextResponse.json({ success: true });
    } else {
      const errorText = await res.text();
      console.error('Beehiiv API Error:', res.status, errorText);
      return NextResponse.json(
        { error: errorText || 'Error while subscribing' },
        { status: res.status }
      );
    }
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}