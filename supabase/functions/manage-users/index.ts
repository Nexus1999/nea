import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, userData } = await req.json()

    if (action === 'CREATE_USER') {
      const { email, password, username, first_name, last_name, role_id } = userData

      // 1. Create user in auth.users
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { username, first_name, last_name }
      })

      if (authError) throw authError

      // 2. Profile is usually created via trigger, but we ensure it's updated with metadata
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          username,
          first_name,
          last_name,
          role_id,
          email
        })
        .eq('id', authUser.user.id)

      if (profileError) throw profileError

      return new Response(JSON.stringify({ success: true, user: authUser.user }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'DELETE_USER') {
      const { userId } = userData
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (error) throw error

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'UPDATE_PASSWORD') {
      const { userId, newPassword } = userData
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword
      })
      if (error) throw error

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'TOGGLE_BLOCK') {
      const { userId, isBlocked } = userData
      // Supabase doesn't have a direct "block" but we can use ban or metadata
      // For this implementation, we'll use the 'ban' feature or a custom metadata flag
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: isBlocked ? 'none' : '100000h' // Effectively forever
      })
      if (error) throw error

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    throw new Error('Invalid action')

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})