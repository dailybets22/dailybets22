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

  const { error } = await supabase
    .from('subscribers')
    .upsert(
      {
        email: email.toLowerCase().trim(),
        name: name?.trim() || null,
        selected_sports: selected_sports,
        isActive: true
      },
      { onConflict: 'email' }
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}