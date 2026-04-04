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

    console.log(`Action: ${action}`, userData);

    if (action === 'CREATE_USER') {
      const { email, password, username, first_name, last_name, role_id } = userData;

      // 1. Create user in auth.users
      // We pass all metadata so the DB trigger can access it
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { 
          username, 
          first_name, 
          last_name,
          role_id 
        }
      });

      if (authError) {
        console.error('Auth creation error details:', JSON.stringify(authError, null, 2));
        throw authError;
      }

      if (!authUser.user) {
        throw new Error('User creation failed: No user returned from Auth');
      }

      console.log(`User created in Auth: ${authUser.user.id}. Updating profile...`);

      // 2. Update the profile manually as a backup
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

      if (profileError) {
        console.error('Profile update error:', profileError);
        // We don't delete the user here because the trigger might have actually worked
        // and this manual update might just be a conflict.
      }

      return new Response(JSON.stringify({ success: true, user: authUser.user }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ... rest of the actions (DELETE_USER, UPDATE_PASSWORD) remain the same
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
    console.error('Function error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})