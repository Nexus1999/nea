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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { action, userData } = await req.json();

    if (action === 'CREATE_USER') {
      const { email, password, username, first_name, last_name, role_id } = userData;
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { username, first_name, last_name, role_id }
      });
      if (authError) throw authError;

      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: authUser.user.id,
          username,
          first_name,
          last_name,
          role_id,
          email,
          updated_at: new Date().toISOString()
        });
      if (profileError) throw profileError;

      return new Response(JSON.stringify({ success: true, user: authUser.user }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'UPDATE_USER') {
      const { userId, username, first_name, last_name, role_id, email } = userData;
      
      // Update Auth metadata
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        email,
        user_metadata: { username, first_name, last_name, role_id }
      });
      if (authError) throw authError;

      // Update Profile
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ username, first_name, last_name, role_id, email, updated_at: new Date().toISOString() })
        .eq('id', userId);
      if (profileError) throw profileError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'BLOCK_USER') {
      const { userId } = userData;
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: 'none' // This is how you "block" in Supabase Auth
      });
      // Alternatively, we can use a custom 'is_blocked' column in profiles
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ is_blocked: true })
        .eq('id', userId);
      if (profileError) throw profileError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'ACTIVATE_USER') {
      const { userId } = userData;
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ is_blocked: false })
        .eq('id', userId);
      if (profileError) throw profileError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'DELETE_USER') {
      const { userId } = userData;
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'UPDATE_PASSWORD') {
      const { userId, newPassword } = userData;
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: newPassword });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    throw new Error('Invalid action');

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})