import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { email, name, selected_sports } = await request.json();

  if (!email || !selected_sports?.length) {
    return NextResponse.json(
      { error: 'Email and at least one sport required' },
      { status: 400 }
    );
  }

  const normalizedEmail = email.toLowerCase().trim();

  // 🔥 1. CHECK IF USER EXISTS
  const { data: existingUser, error: lookupError } = await supabase
    .from('subscribers')
    .select('*')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (lookupError) {
    console.error('Lookup error:', lookupError);
    return NextResponse.json(
      { error: 'Server error checking email' },
      { status: 500 }
    );
  }

  // 🔥 2. IF EXISTS AND is_active_subscriber = true → BLOCK
  if (existingUser && existingUser.is_active_subscriber === true) {
    return NextResponse.json(
      { error: 'You already have an active subscription' },
      { status: 409 }
    );
  }

  // 🔥 3. IF EXISTS BUT NOT ACTIVE → RE-ACTIVATE (INSERT NEW OR UPDATE)
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
      return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, reactivated: true });
  }

  // 🔥 4. NEW EMAIL → INSERT
  const { data, error } = await supabase
    .from('subscribers')
    .insert({
      email: normalizedEmail,
      name: name?.trim() || null,
      selected_sports,
      is_active: true,
    });

  if (error) {
    console.error('Insert error:', error);
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}