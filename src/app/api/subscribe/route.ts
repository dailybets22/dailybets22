// src/app/api/subscribe/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import WelcomeEmail from '@/emails/WelcomeEmail';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

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
  const { data: existingUser, error: lookupError } = await supabase
    .from('subscribers')
    .select('*')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (lookupError) {
    console.error('Lookup error:', lookupError);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }

  let shouldSendWelcome = false;

  // 2. IF EXISTS AND ACTIVE → BLOCK
  if (existingUser && existingUser.is_active_subscriber === true) {
    return NextResponse.json(
      { error: 'You already have an active subscription' },
      { status: 409 }
    );
  }

  // 3. REACTIVATE INACTIVE USER
  if (existingUser && existingUser.is_active_subscriber === false) {
    const { error: reactivationError } = await supabase
      .from('subscribers')
      .update({
        name: name?.trim() || null,
        selected_sports,
        is_active: true,
        subscribed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('email', normalizedEmail);

    if (reactivationError) {
      console.error('Reactivation error:', reactivationError);
      return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
    }

    shouldSendWelcome = true;
  } 
  // 4. NEW USER
  else {
    const { error } = await supabase.from('subscribers').insert({
      email: normalizedEmail,
      name: name?.trim() || null,
      selected_sports,
      is_active: true,
    });

    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
    }

    shouldSendWelcome = true;
  }

  // SEND WELCOME EMAIL (new or reactivated)
  if (shouldSendWelcome && process.env.RESEND_API_KEY) {
    try {
      console.log('Sending welcome email to:', normalizedEmail);
      const res = await resend.emails.send({
        from: 'delivered@resend.dev',
        to: normalizedEmail,
        subject: 'Welcome to Daily Bets – Your Edge Starts Now',
        react: WelcomeEmail({ name: name?.trim() || normalizedEmail }),
      });
      console.log('Resend response:', res);
    } catch (e) {
      console.error('Welcome email failed:', e);
      // Don’t fail the signup if email fails
    }
  }

  return NextResponse.json({ success: true });
}