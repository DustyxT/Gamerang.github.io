import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("on-new-user-created function initializing.");

interface User {
  id: string;
  email?: string;
  raw_user_meta_data?: { // Note: Supabase might use raw_user_meta_data or user_metadata
    username?: string;
    // Add other potential metadata fields if necessary
  };
  user_metadata?: { // Covering both common conventions for user metadata
    username?: string;
  };
  // Add any other user properties you expect from the auth hook
}

interface Profile {
  user_id: string; // Should match the type of User.id
  username: string;
  email?: string; // Make email optional if it can be derived differently or is not always set
  role?: string;
  // created_at and updated_at will be set by default by the database
}

Deno.serve(async (req) => {
  // This function will be invoked when a new user is created in Supabase Auth.
  // Ensure you have set up a webhook in your Supabase project dashboard:
  // Database -> Webhooks -> Enable webhooks -> Create a new webhook
  // Events: auth.users -> Insert
  // HTTP Request: POST to this function's URL (e.g., https://<project_ref>.supabase.co/functions/v1/on-new-user-created)
  // HTTP Headers: Can be left default or add Authorization if needed (e.g., Bearer <your-function-secret>)

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS request");
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("Received payload:", JSON.stringify(payload, null, 2));

    // Supabase Auth webhooks send payload in a specific structure.
    // For an 'INSERT' on 'auth.users', the new user record is under `record`.
    const user = payload.record as User;

    if (!user || !user.id) {
      console.error("Invalid user data received from webhook.");
      return new Response(JSON.stringify({ error: "Invalid user data" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log(`Processing new user: ${user.id}, Email: ${user.email}`);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Determine username: use from metadata if provided, otherwise generate from email.
    let username = user.raw_user_meta_data?.username || user.user_metadata?.username;
    if (!username && user.email) {
      username = user.email.split("@")[0]; // Fallback to part of email
      console.log(`Username not in metadata, derived from email: ${username}`);
    } else if (!username) {
        // If no username from metadata and no email, create a generic one or handle error
        username = `user_${user.id.substring(0, 8)}`;
        console.warn(`Username and email not found for user ${user.id}, using generated username: ${username}`);
    }

    const profileData: Profile = {
      user_id: user.id,
      username: username,
      email: user.email,
      role: "user", // Default role
    };

    console.log("Attempting to insert profile:", JSON.stringify(profileData, null, 2));

    const { data: newProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert(profileData)
      .select()
      .single();

    if (profileError) {
      console.error("Error creating profile:", JSON.stringify(profileError, null, 2));
      // More robust error handling: check for specific errors like unique constraint violation
      if (profileError.code === '23505') { // Unique violation (e.g., username already exists)
         console.warn(`Profile creation failed due to unique constraint (username '${username}' likely taken). User ID: ${user.id}`);
         // Potentially, try to update the username or log for manual intervention.
         // For now, return an error. Consider a retry with a modified username if appropriate.
         return new Response(JSON.stringify({ error: `Username '${username}' might already be taken.`, details: profileError.message }), {
           headers: { ...corsHeaders, "Content-Type": "application/json" },
           status: 409, // Conflict
         });
      }
      // For other errors, you might want to consider if the auth user should be deleted
      // This is a critical decision and depends on your app's requirements.
      // e.g., await supabaseAdmin.auth.admin.deleteUser(user.id);
      return new Response(JSON.stringify({ error: "Failed to create profile", details: profileError.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    console.log("Profile created successfully:", JSON.stringify(newProfile, null, 2));
    return new Response(JSON.stringify({ message: "Profile created successfully", profile: newProfile }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 201,
    });

  } catch (error) {
    console.error("Unhandled error in Edge Function:", error.message, error.stack);
    return new Response(JSON.stringify({ error: "Internal server error", details: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

/* 
Test payload structure for local testing (e.g., using Supabase CLI `supabase functions serve`):
{
  "type": "INSERT",
  "table": "users",
  "schema": "auth",
  "record": {
    "id": "some-uuid-string",
    "aud": "authenticated",
    "role": "authenticated",
    "email": "testuser@example.com",
    "phone": null,
    "email_confirmed_at": "iso_timestamp_string",
    "phone_confirmed_at": null,
    "confirmed_at": "iso_timestamp_string", // if email_confirmed_at is set
    "last_sign_in_at": "iso_timestamp_string",
    "raw_app_meta_data": {},
    "raw_user_meta_data": {
      "username": "testusername"
    },
    "is_anonymous": false,
    "factors": [],
    "created_at": "iso_timestamp_string",
    "updated_at": "iso_timestamp_string"
  },
  "old_record": null
}
*/ 