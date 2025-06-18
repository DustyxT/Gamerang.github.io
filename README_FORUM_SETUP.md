# Forum Database Setup Guide

## Quick Setup

1. **Login to Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Run the SQL Script**
   - Navigate to **SQL Editor** in the left sidebar
   - Copy the contents of `create-forum-tables.sql`
   - Paste and click **Run**

3. **Verify Setup**
   - Check **Table Editor** for new tables: `profiles`, `threads`, `thread_replies`
   - Check **Storage** for `thread-images` bucket

## What Gets Created

### Tables
- **profiles**: User profiles linked to auth.users
- **threads**: Forum threads/posts
- **thread_replies**: Replies to threads

### Features
- Row Level Security (RLS) enabled
- Automatic profile creation on signup
- Image upload support
- View counting
- Reaction system (likes, dislikes, hearts)

## Troubleshooting

### Error: "Failed to create thread"
- Make sure all tables are created
- Check that RLS policies are in place
- Verify user is authenticated

### Error: "Image upload failed"
- Check that `thread-images` storage bucket exists
- Verify storage policies are created

### Error: "User profile not found"
- The trigger might not have fired
- Manually insert a profile for existing users:
```sql
INSERT INTO public.profiles (id, username, email)
SELECT id, email, email FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);
```

## Testing

1. Sign up a new user
2. Create a test thread
3. Upload an image
4. Post a reply
5. Add reactions

## Categories

The forum supports these default categories:
- General Discussion
- Game Requests
- Game Help & Support
- Repack Updates & Announcements
- Installation Guides & Tutorials
- Bug Reports & Fixes
- Game Reviews & Recommendations
- Off Topic

You can modify these in the `forum.html` file. 