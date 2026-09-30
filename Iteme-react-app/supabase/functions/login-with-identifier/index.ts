// Lets a student log in with their email, phone, or 5-digit Student ID
// instead of email only. Supabase Auth only signs in by email, so this
// resolves the identifier to an email server-side (service role) and then
// performs the real signInWithPassword itself — the password is never seen
// or compared by this code, GoTrue still does that internally.
//
// Both "no such identifier" and "wrong password" return the exact same
// generic error, so a bad guess can't reveal whether an account exists.
//
// Deploy:
//   npx supabase login
//   npx supabase link --project-ref <your-project-ref>
//   npx supabase functions deploy login-with-identifier
//
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are injected
// automatically for every Edge Function — nothing to configure.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const INVALID_CREDENTIALS = { error: 'Invalid login credentials' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const { identifier, password } = await req.json()

    if (!identifier || !password) {
      return json({ error: 'identifier and password are required' }, 400)
    }

    // Bypasses RLS entirely — the only way to resolve phone/student_code to
    // an email without exposing a public, anon-callable profiles lookup.
    // Three separate .eq() lookups (not a single .or() with string-built
    // filters) so a stray comma/paren in user input can't be interpreted as
    // PostgREST filter syntax.
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const [byEmail, byPhone, byCode] = await Promise.all([
      adminClient.from('profiles').select('email').eq('email', identifier).maybeSingle(),
      adminClient.from('profiles').select('email').eq('phone', identifier).maybeSingle(),
      adminClient.from('profiles').select('email').eq('student_code', identifier).maybeSingle(),
    ])

    const email = byEmail.data?.email || byPhone.data?.email || byCode.data?.email

    if (!email) {
      return json(INVALID_CREDENTIALS, 400)
    }

    // The real password check happens inside GoTrue here — this code never
    // sees or compares the password itself.
    const authClient = createClient(supabaseUrl, anonKey)
    const { data: signInData, error: signInError } = await authClient.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError || !signInData.session) {
      return json(INVALID_CREDENTIALS, 400)
    }

    return json(
      {
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
      },
      200
    )
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
