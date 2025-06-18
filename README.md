# Gamerang Gaming Site

A modern gaming website with game downloads, forums, and community features.

## Admin Features

### Video Background Upload

The forum page supports a video background that can be uploaded by administrators. To access this feature:

1. Sign in with an admin account
2. Click on the "Admin" button in the top navigation bar
3. Select "Upload Background Video" from the dropdown menu
4. Choose a video file (MP4 recommended) and upload it

### Making a User an Admin

To make a user an admin, use the provided script:

1. Copy the `.env-example` file to `.env` and add your Supabase service key
2. Run the script with the user's email:
   ```
   node create-admin-user.js user@example.com
   ```
3. The user will now have admin privileges and can access admin features

### Admin-Only Features

- Upload forum background videos
- Access site settings (coming soon)
- Manage users (coming soon)
- Moderate content (coming soon)

## Development

### Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the development server: `npm start`

### Database

The site uses Supabase for the backend. The database schema is defined in SQL files:
- `create-forum-tables-safe.sql` - Creates the forum tables
- `create-site-settings-table.sql` - Creates the site settings table 