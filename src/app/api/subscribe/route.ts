// src/app/api/subscribe/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  const { email, name, selected_sports } = await request.json();

  if (!email || !selected_sports?.length) {
    return NextResponse.json(
      { error: 'Email and at least one sport required' },
      { status: 400 }
    );
  }

  const normalizedEmail = email.toLowerCase().trim();

  // 1. CHECK IF USER EXISTS
  const { data: existingUser } = await supabase
    .from('subscribers')
    .select('*')
    .eq('email', normalizedEmail)
    .maybeSingle();

  // 2. BLOCK IF ALREADY ACTIVE
  if (existingUser?.is_active_subscriber === true) {
    return NextResponse.json(
      { error: 'You already have an active subscription' },
      { status: 409 }
    );
  }

  // 3. UPSERT USER — always set inactive (will activate only on payment success)
  const { error: upsertError } = await supabase
    .from('subscribers')
    .upsert(
      {
        email: normalizedEmail,
        name: name?.trim() || null,
        selected_sports,
        is_active_subscriber: false,
        is_active: true,
        paid_until: null,
        subscribed_at: existingUser ? existingUser.subscribed_at : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'email' }
    );

  if (upsertError) {
    console.error('Upsert error:', upsertError);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }

  // 4. CREATE STRIPE CHECKOUT SESSION
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    customer_email: normalizedEmail,
    line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_URL || 'https://dailybets22.vercel.app'}/success`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL || 'https://dailybets22.vercel.app'}/cancel`,
    metadata: { email: normalizedEmail },
  });

  // 5. RETURN STRIPE URL → frontend redirects
  return NextResponse.json({ url: session.url });
}