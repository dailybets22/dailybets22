// src/app/api/stripe-webhook/route.ts
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import WelcomeEmail from '@/emails/WelcomeEmail';

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);
const resend = new Resend(process.env.RESEND_API_KEY);

export const config = { api: { bodyParser: false } };

export async function POST(req: Request) {
  const buf = await req.arrayBuffer();
  const bufString = Buffer.from(buf).toString();

  const sig = req.headers.get('stripe-signature')!;

  let event;
  try {
    event = stripe.webhooks.constructEvent(bufString, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Payment success → activate + send welcome email
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_email;

    if (!email) return new Response('No email', { status: 200 });

    // 1. Activate subscriber + set paid_until (~30 days from now)
    const { error } = await supabase
      .from('subscribers')
      .update({
        is_active_subscriber: true,
        paid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        stripe_customer_id: session.customer,
      })
      .eq('email', email);

    if (error) {
      console.error('Supabase update error:', error);
    } else {
      console.log(`Activated: ${email}`);
    }

    // 2. Send welcome email (first email they get — only after paying)
    try {
      const { data: user } = await supabase
        .from('subscribers')
        .select('name')
        .eq('email', email)
        .single();

      await resend.emails.send({
        from: 'Daily Bets <delivered@resend.dev>',
        to: email,
        subject: 'Welcome to Daily Bets – Your Edge Starts Now',
        react: WelcomeEmail({ name: user?.name || email }),
      });
      console.log(`Welcome email sent to ${email}`);
    } catch (e: any) {
      console.error(`Welcome email failed for ${email}:`, e.message);
    }
  }

  // Optional: handle subscription cancel / expire
  if (event.type === 'customer.subscription.deleted') {
    const email = event.data.object.customer_email;
    await supabase
      .from('subscribers')
      .update({ is_active_subscriber: false, paid_until: null })
      .eq('email', email);
  }

  return new Response('OK', { status: 200 });
}