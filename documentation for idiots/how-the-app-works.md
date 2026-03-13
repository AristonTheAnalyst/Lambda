# Lambda App — Documentation for Idiots

A no-nonsense guide to how this app works, what's in it, and what's left to build.

---

## What Is This App?

Lambda is a mobile app built with React Native and Expo. Right now it handles user authentication (login, signup, social login) and onboarding (collecting basic profile info). Beyond that, the main app screens are mostly empty placeholders waiting for real features.

---

## Core Technologies

| Technology | What It Does |
|---|---|
| **React Native** (v0.81) | Cross-platform mobile framework — write once, run on iOS and Android |
| **Expo** (SDK 53) | Tooling layer on top of React Native — easier builds, dev server, native APIs |
| **Expo Router** | File-based navigation — folder structure = app routes |
| **TypeScript** | JavaScript with types — catches bugs before runtime |
| **Supabase** | Backend-as-a-service — handles auth, database (PostgreSQL), and row-level security |
| **React Navigation** | Under the hood of Expo Router — manages screen stacks and tab bars |
| **AsyncStorage** | On-device key-value storage — persists auth sessions locally |
| **EAS (Expo Application Services)** | Cloud build and submit service for iOS/Android |
| **React Native Reanimated** | Smooth animations library |
| **Expo Auth Session** | OAuth helper for Google/Apple sign-in flows |
| **Expo Apple Authentication** | Native Apple Sign-In on iOS |

---

## How the App Works (The Big Picture)

```
User opens app
       │
       ▼
  Do we have a session?
       │
   ┌───┴───┐
   │ NO    │ YES
   ▼       ▼
Login    Has the user completed onboarding?
Page          │
          ┌───┴───┐
          │ NO    │ YES
          ▼       ▼
      Onboarding  Main App
        Form      (Tabs)
```

That's it. The root layout (`app/_layout.tsx`) checks your auth state and routes you to the right place automatically. You never manually navigate between these sections — the app handles it.

---

## Folder Structure (What Lives Where)

```
lambda/
├── app/                    ← All screens/pages (file-based routing)
│   ├── _layout.tsx         ← Root layout — auth checks & routing logic
│   ├── (auth)/             ← Login & Signup screens
│   │   ├── login.tsx
│   │   └── signup.tsx
│   ├── (onboarding)/       ← First-time profile setup
│   │   └── index.tsx
│   ├── (tabs)/             ← Main app (tab navigation)
│   │   ├── index.tsx       ← Tab One (profile display + logout)
│   │   └── two.tsx         ← Tab Two (empty placeholder)
│   ├── modal.tsx           ← Modal screen (placeholder)
│   └── +not-found.tsx      ← 404 page
│
├── lib/                    ← Core logic & services
│   ├── supabase.ts         ← Supabase client setup
│   ├── AuthContext.tsx      ← Auth state management (the brain)
│   ├── useAuth.ts          ← Auth hook (alternative to context)
│   └── asyncGuard.ts       ← Prevents double-tapping buttons
│
├── components/             ← Reusable UI components
│   ├── Themed.tsx          ← Theme-aware Text & View wrappers
│   └── ...                 ← Other shared components
│
├── constants/
│   └── Colors.ts           ← Light/dark theme color definitions
│
├── types/
│   └── database.ts         ← TypeScript interfaces (DimUser, AuthUser)
│
└── hooks/                  ← Custom React hooks
```

**Key rule:** Folders wrapped in parentheses like `(auth)` or `(tabs)` are **route groups** — they organize routes without adding to the URL path.

---

## Authentication Flow (In Detail)

### Email/Password
1. User enters email + password on the login or signup screen
2. Supabase handles the actual auth (hashing, tokens, etc.)
3. On signup, a row is automatically created in the `dim_user` database table with `onboarded: false`
4. The auth state change triggers the root layout to re-route the user

### Social Login (Google & Apple)
- **Google Sign-In** — available on all platforms, uses OAuth web flow via `expo-auth-session`
- **Apple Sign-In** — iOS only, uses native Apple authentication
- Both go through the same post-auth flow (profile creation, onboarding check)

### Session Persistence
- Auth tokens are stored in AsyncStorage on the device
- When the app restarts, Supabase auto-refreshes the session
- No need to log in again until the session expires or the user logs out

### Safety: Async Guard
The `asyncGuard.ts` utility wraps login/signup functions so that if a user spam-taps the button, only the first tap actually fires. Subsequent taps are ignored until the first request completes.

---

## Onboarding Flow

After a new user signs up, they land on the onboarding screen which collects:
- **First Name** (required)
- **Last Name** (optional)
- **Date of Birth** (optional, YYYY-MM-DD format)
- **Gender** (optional, dropdown: Male / Female / Other)
- **Height in cm** (optional)

Once submitted, the `dim_user` row is updated with this info and `onboarded` is set to `true`. The app then routes to the main tab view.

---

## Database

The app uses **Supabase PostgreSQL** with at least one table:

### `dim_user` Table
| Column | Type | Notes |
|---|---|---|
| id | uuid | Matches Supabase auth user ID |
| email | string | User's email |
| name | string | First name |
| lastname | string | Last name |
| date_of_birth | string | YYYY-MM-DD |
| gender | string | Male / Female / Other |
| height | integer | In centimeters |
| onboarded | boolean | Has the user completed onboarding? |

Row-Level Security (RLS) is enabled — users can only read/write their own records.

---

## What Has Been Implemented

- [x] Expo project scaffolding with TypeScript
- [x] File-based routing with Expo Router
- [x] Supabase client initialization with environment variables
- [x] Email/password authentication (login + signup)
- [x] Google OAuth sign-in
- [x] Apple Sign-In (iOS)
- [x] Auth context provider with global state management
- [x] Protected routing (redirect based on auth + onboarding state)
- [x] Session persistence via AsyncStorage
- [x] Onboarding form (name, DOB, gender, height)
- [x] Profile display screen (Tab One) with user info cards
- [x] Logout with confirmation dialog
- [x] Dark mode / light mode theme support
- [x] Async guard to prevent double-submissions
- [x] 404 / Not Found screen
- [x] Android native project configuration
- [x] EAS build profiles (development, preview, production)
- [x] Deep linking / OAuth callback handler

## What Has NOT Been Implemented Yet

- [ ] **Tab Two** — completely empty, no feature built
- [ ] **Modal screen** — placeholder only, no real content
- [ ] **Any actual app functionality** — the app authenticates you and shows your profile, but doesn't *do* anything yet
- [ ] **Push notifications**
- [ ] **Image upload / profile picture**
- [ ] **Settings screen**
- [ ] **Password reset / forgot password flow**
- [ ] **Email verification enforcement**
- [ ] **Input validation beyond basics** (e.g., proper date picker instead of text field for DOB)
- [ ] **Error handling UI** (toast messages, error boundaries)
- [ ] **Loading skeletons / proper loading states** beyond simple spinners
- [ ] **Offline support**
- [ ] **Unit tests** (only one placeholder test exists for StyledText)
- [ ] **CI/CD pipeline** (EAS is configured but no automated workflows)
- [ ] **App icons and splash screen** (using Expo defaults)
- [ ] **Any iOS native project** (only Android native folder exists)
- [ ] **Web deployment** (configured but not actively built for web)
- [ ] **Analytics or crash reporting**
- [ ] **Rate limiting or abuse prevention** on the client side

---

## Environment Variables

The app requires these env vars (set in your `.env` file or Expo config):

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous/public API key |

If either is missing, the app will throw an error on startup.

---

## How to Run It

```bash
# Install dependencies
npm install

# Start the dev server
npx expo start

# Run on Android
npx expo run:android

# Run on iOS (macOS only)
npx expo run:ios
```

For building production apps, use EAS:
```bash
eas build --platform android --profile production
eas build --platform ios --profile production
```

---

## TL;DR

Lambda is a React Native + Expo app backed by Supabase. It currently does **authentication** (email, Google, Apple) and **onboarding** (basic profile info). Everything else is a blank canvas waiting to be built.
