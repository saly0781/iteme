// Lets an admin (CEO) create a new staff or student account directly from
// the Iteme-admin console. There's no public signup for staff, and admins
// shouldn't have to go through the Supabase dashboard to onboard someone.
//
// Deploy:
//   npx supabase login
//   npx supabase link --project-ref <your-project-ref>
//   npx supabase functions deploy create-user
//
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are injected
// automatically for every Edge Function — nothing to configure.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const ALLOWED_ROLES = ['student', 'teacher', 'accountant']
const DEFAULT_STUDENT_PASSWORD = '000000'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Missing Authorization header' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Scoped to the caller's own JWT, purely to find out who's calling.
    const callerClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user: caller },
    } = await callerClient.auth.getUser()

    if (!caller) {
      return json({ error: 'Invalid session' }, 401)
    }

    // Bypasses RLS entirely — only used after confirming the caller is an admin.
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (callerProfile?.role !== 'admin') {
      return json({ error: 'Only admins can create accounts' }, 403)
    }

    const {
      email,
      password,
      full_name,
      phone,
      role,
      title,
      id_passport,
      residence,
      education_level,
      bio,
    } = await req.json()

    if (!email || !password || !full_name || !role) {
      return json({ error: 'email, password, full_name, and role are required' }, 400)
    }
    if (!ALLOWED_ROLES.includes(role)) {
      return json({ error: `role must be one of: ${ALLOWED_ROLES.join(', ')}` }, 400)
    }
    if (password.length < 6) {
      return json({ error: 'Password must be at least 6 characters' }, 400)
    }

    const conflictChecks = await Promise.all([
      adminClient.from('profiles').select('id').eq('email', email).maybeSingle(),
      phone
        ? adminClient.from('profiles').select('id').eq('phone', phone).maybeSingle()
        : Promise.resolve({ data: null }),
      id_passport
        ? adminClient.from('profiles').select('id').eq('id_passport', id_passport).maybeSingle()
        : Promise.resolve({ data: null }),
    ])
    const conflictLabels = ['email', 'phone number', 'ID/passport number']
    const conflicts = conflictChecks
      .map((res: { data: unknown }, i: number) => (res.data ? conflictLabels[i] : null))
      .filter(Boolean)

    if (conflicts.length > 0) {
      return json({ error: `An account with this ${conflicts.join(' and ')} already exists.` }, 400)
    }

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        phone: phone || null,
        id_passport: id_passport || null,
        residence: residence || null,
        education_level: education_level || null,
        bio: bio || null,
        is_default_password: password === DEFAULT_STUDENT_PASSWORD,
      },
    })

    if (createError) {
      return json({ error: createError.message }, 400)
    }

    // handle_new_user() already inserted a 'student' profile row via the
    // on_auth_user_created trigger — promote it to the requested role.
    const { error: updateError } = await adminClient
      .from('profiles')
      .update({ role, title: title || null })
      .eq('id', created.user.id)

    if (updateError) {
      return json({ error: updateError.message }, 400)
    }

    return json({ id: created.user.id }, 200)
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
