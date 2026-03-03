

# Tom Tok Store — Implementation Plan

## 1. Backend Setup (Lovable Cloud)
- Enable Lovable Cloud for automatic Supabase backend
- Set up database tables: `profiles`, `user_roles`, `apps` (name, description, version, size, screenshots, apk_url, category, download_count, created_at, updated_at), `downloads` (tracking table)
- Create storage buckets for APK files and app screenshots/icons
- Configure RLS policies for all tables
- Auto-assign ADMIN role when `alvibrahim29@gmail.com` registers (via database trigger)

## 2. Authentication
- Email/password signup and login using Supabase Auth
- Profile auto-creation on signup via trigger
- Role-based access: Admin vs User roles stored in `user_roles` table
- Protected admin routes on the frontend
- Google OAuth login (optional, can be enabled later in Supabase dashboard)

## 3. Dark Neon UI Theme (Pink + Blue Gradient)
- Custom color scheme: neon pink (`#FF2D78`) and electric blue (`#00D4FF`) with dark backgrounds
- Gradient accents on cards, buttons, and banners
- Modern Play Store-inspired layout with app grid cards
- Homepage banner promoting "Tom Tok" with circular logo placement
- Footer with "1 Billion+ Downloads" text

## 4. Public Pages
- **Homepage**: Featured banner, app categories, app grid with cards showing icon, name, rating, download count
- **App Detail Page**: Screenshots carousel, version info, size, update date, description, and download button
- **Login / Register Pages**: Styled with neon theme

## 5. User Features
- Browse and search apps
- View app details with screenshots
- Download APKs (tracked per user)
- User profile page

## 6. Admin Dashboard (Protected)
- **Analytics Overview**: Total downloads, registered users, active users
- **Login Analytics**: Email vs Google login counts
- **App Management**: Upload new APK with metadata (name, description, version, category, screenshots), edit existing apps, delete apps
- **Per-App Stats**: Download count per app with charts (using Recharts)
- **File Upload**: Validated APK upload to Supabase Storage

## 7. Security
- Supabase handles password hashing (bcrypt) and JWT sessions automatically
- RLS policies ensure users can only read apps, admins can write
- Admin routes protected both client-side (route guards) and server-side (RLS)
- File upload validation (APK mime type, size limits)
- Role checks via `has_role` security definer function to prevent RLS recursion

