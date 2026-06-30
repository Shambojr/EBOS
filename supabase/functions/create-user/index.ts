import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // Only allow directors (verify caller role)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify caller is a director
    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user: caller } } = await callerClient.auth.getUser()
    if (!caller) return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401, headers: corsHeaders })

    const { data: callerProfile } = await supabaseAdmin.from('users').select('role').eq('id', caller.id).single()
    if (callerProfile?.role !== 'director') {
      return new Response(JSON.stringify({ error: 'Only directors can create users' }), { status: 403, headers: corsHeaders })
    }

    const { email, password, full_name, role } = await req.json()
    if (!email || !password || !full_name || !role) {
      return new Response(JSON.stringify({ error: 'email, password, full_name and role are required' }), { status: 400, headers: corsHeaders })
    }

    // Create auth user
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (authErr) return new Response(JSON.stringify({ error: authErr.message }), { status: 400, headers: corsHeaders })

    // Create user profile
    const { error: profileErr } = await supabaseAdmin.from('users').insert({
      id: authData.user.id,
      email,
      full_name,
      role,
      is_active: true,
    })
    if (profileErr) {
      // Rollback: delete the auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return new Response(JSON.stringify({ error: profileErr.message }), { status: 400, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ success: true, user_id: authData.user.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders })
  }
})
