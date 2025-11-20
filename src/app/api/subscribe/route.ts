// src/app/api/subscribe/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
)

export async function POST(request: Request) {
  const { email, name, selected_sports } = await request.json()

  if (!email || !selected_sports?.length) {
    return NextResponse.json({ error: 'Email and at least one sport required' }, { status: 400 })
  }

  const { error, data } = await supabase
    .from('subscribers')
    .upsert(
      {
        email: email.toLowerCase().trim(),
        name: name?.trim() || null,
        selected_sports,
        is_active: true
      },
      { onConflict: 'email' }
    )

  // If error exists, return error response
  if (error) {
    console.error('Supabase upsert error:', error)
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 })
  }

  // Success - data was inserted/updated
  return NextResponse.json({ success: true, data })
}