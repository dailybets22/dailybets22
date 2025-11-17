import { NextResponse } from 'next/server';

const BEEHIIV_API_KEY = process.env.BEEHIIV_API_KEY;
const BEEHIIV_PUBLICATION_ID = process.env.BEEHIIV_PUBLICATION_ID;

export async function POST(request) {
  try {
    const { email, name, sports } = await request.json();

    // Validate inputs
    if (!email || !sports || !Array.isArray(sports) || sports.length === 0) {
      return NextResponse.json(
        { error: 'Email and at least one sport required' },
        { status: 400 }
      );
    }

    const sportsString = (Array.isArray(sports) && sports.length > 0) ? sports.join(',') : '';

    const payload = {
      email: email,
      custom_fields: [
        { name: 'name', value: name || '' },
        { name: 'today_picks', value: 'test' },
        { name: 'selected_sports', value: sportsString }
      ],
      send_welcome_email: true,
      reactivate_if_unsubscribed: true
    };

    // Log the request for debugging
    console.log('Outgoing Request Details:', {
      url: `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions`,
      headers: {
        'Authorization': `Bearer ${BEEHIIV_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: payload
    });

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

    const responseData = await res.json();  // Parse the response body

    if (res.ok && res.status === 201) {
      console.log('API Success Response (201):', responseData);  // Log for verification
      // You could add logic here to check for specific fields in responseData, e.g., a subscription ID
      return NextResponse.json({ success: true, details: responseData });
    } else {
      console.error('Beehiiv API Error:', res.status, responseData);
      return NextResponse.json(
        { error: responseData?.errors?.[0]?.message || 'Error while subscribing' },
        { status: res.status }
      );
    }
  } catch (err) {
    console.error('Server error:', err);  // Log the full error
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
