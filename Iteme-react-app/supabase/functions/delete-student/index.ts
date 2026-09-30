// Admin-only. Permanently deletes a student's auth account. Deleting
// auth.users cascades to profiles (on delete cascade), which cascades to
// enrollments, which cascades to payments and attendance — so this one
// call removes the student's entire history. No undo.
//
// Deploy: npx supabase functions deploy delete-student
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are injected
// automatically — nothing to configure.

import { createClient } from 'jsr:@supabase/supabase-js@2'

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

    const callerClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user: caller },
    } = await callerClient.auth.getUser()

    if (!caller) {
      return json({ error: 'Invalid session' }, 401)
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (callerProfile?.role !== 'admin') {
      return json({ error: 'Only admins can permanently delete an account' }, 403)
    }

    const { user_id } = await req.json()
    if (!user_id) {
      return json({ error: 'user_id is required' }, 400)
    }

    const { data: target } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user_id)
      .single()

    if (target?.role !== 'student') {
      return json({ error: 'This endpoint can only delete student accounts' }, 400)
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user_id)
    if (deleteError) {
      return json({ error: deleteError.message }, 400)
    }

    return json({ success: true }, 200)
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
