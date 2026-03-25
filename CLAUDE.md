# Lambda — Claude Code Context

This file is read at the start of every conversation. It documents the current state of the app, conventions to follow, and areas that need work. Keep it updated as the codebase evolves.

---

## Current Architecture & Stack

**This is a React Native fitness tracking app.** Users log calisthenics workout sets with bodyweight, assistance, reps, and exercise variations. The longer-term vision is coaching + analytics, potentially a YouTube-adjacent platform.

### Tech Stack

| Layer | Tool |
|---|---|
| Framework | Expo (SDK 54), React Native 0.81 |
| Navigation | Expo Router v6 (file-based) |
| Auth | Supabase Auth (email/password, Google OAuth, Apple Sign-In) |
| Database | Supabase (PostgreSQL with RLS) |
| State | React Context API (no Redux/Zustand) |
| Validation | Zod v4 |
| Animations | React Native Reanimated 4 |
| Icons | @expo/vector-icons (FontAwesome) |
| Fonts | SpaceMono (loaded via expo-font) |
| Storage | expo-secure-store (native), AsyncStorage (fallback) |
| Build/Deploy | EAS Build + EAS Update |

**Not in use (despite what you might assume):** NativeWind, Gluestack UI, Zustand, React Query, Redux. All styling is plain React Native StyleSheet.

### Project Structure

```
lambda/                        ← main app code lives here
├── app/                       ← Expo Router screens (file = route)
│   ├── _layout.tsx            ← root layout, handles auth routing
│   ├── (auth)/                ← login.tsx, signup.tsx
│   ├── (onboarding)/          ← index.tsx (profile setup)
│   └── (tabs)/                ← main app: index, two/, three, four
│       └── two/               ← exercise config sub-routes
├── components/                ← reusable UI components
├── constants/
│   ├── Theme.ts               ← THE source of truth for all colors/design tokens
│   └── Colors.ts              ← light/dark color mapping (currently both = dark)
├── lib/                       ← core logic, contexts, supabase client
├── hooks/                     ← small utility hooks
└── types/
    └── database.ts            ← TypeScript interfaces for DB rows
```

### Routing Tree

```
/(auth)/login          → email/password + social login
/(auth)/signup         → registration
/(onboarding)/         → first-time profile setup (name, DOB, gender, height)
/(tabs)/               → main app
  index                → Tab 1: User Profile
  /two                 → Tab 2: Exercise Configuration hub
  /two/exercises       → CRUD for exercises
  /two/variations      → CRUD for variations
  /two/assign          → Link variations to exercises
  /three               → Tab 3: Workout Log (log sets live)
  /four                → Tab 4: Training Logs (placeholder — not built)
```

The tab bar is hidden (`tabBarStyle: { display: 'none' }`). Navigation uses a custom hamburger drawer instead.

### Auth Flow

```
App loads
  └─ No session → /(auth)/login
  └─ Session exists, onboarded: false → /(onboarding)
  └─ Session exists, onboarded: true  → /(tabs)
```

Session storage: SecureStore on native (chunked at 1900 bytes), AsyncStorage in Expo Go.

### Data Flow

- **AuthContext** (`lib/AuthContext.tsx`) — session, user profile, sign in/out methods
- **ExerciseDataContext** (`lib/ExerciseDataContext.tsx`) — caches exercises, variations, variation types globally; builds `exerciseDetailMap` (exercise ID → assigned variations)
- **DrawerContext** (`lib/DrawerContext.tsx`) — single `openDrawer()` function for the hamburger button
- Local screen state for all form fields (no global form state)
- Current in-progress workout ID persisted to AsyncStorage (`currentWorkoutId` key)

---

## Styling System

### The Theme Object

**Everything goes through `T` from `@/constants/Theme`.** Never hardcode hex values in components.

```typescript
// constants/Theme.ts
import T from '@/constants/Theme';

const Theme = {
  bg: '#262626',           // Main screen backgrounds
  surface: '#2e2e2e',      // Cards, inputs, modals, list rows
  surfaceHigh: '#363636',  // Selected/highlighted rows, hover states
  border: '#383838',       // Dividers, input borders, separators
  primary: '#ad9073',      // Body text, labels, icons — warm tan
  muted: '#7a6555',        // Placeholder text, secondary labels, hints
  accent: '#bb7423',       // Buttons, active states, CTAs — warm orange-brown
  accentBg: '#3a2810',     // Accent-tinted row/card backgrounds
  accentText: '#fff',      // Text on top of accent-colored buttons
  danger: '#c0392b',       // Error messages, destructive action buttons
  dangerBg: '#3a1a1a',     // Danger-tinted backgrounds
  dangerBorder: '#7a2020', // Borders for danger-state inputs
}
```

The app is **dark-only**. `Colors.ts` maps light and dark identically to this palette.

### Usage Pattern

```typescript
import T from '@/constants/Theme';

const styles = StyleSheet.create({
  container: { backgroundColor: T.bg },
  card:      { backgroundColor: T.surface, borderColor: T.border },
  label:     { color: T.primary },
  hint:      { color: T.muted },
  button:    { backgroundColor: T.accent },
  btnText:   { color: T.accentText },
  error:     { color: T.danger },
});
```

### Fonts & Text Sizes

No dedicated font size constants exist yet — this is an area to improve. Current in-use sizes observed across screens:

| Role | Size | Weight |
|---|---|---|
| Page title (PageHeader) | 20 | bold |
| Section header | 16–18 | bold or 600 |
| Body / labels | 14–16 | normal |
| Small / hints | 12–13 | normal |
| Input text | 15–16 | normal |

SpaceMono font is loaded but only used in `StyledText.tsx` (MonoText component). Most text uses the system font.

**TODO: Add font size constants to Theme.ts** — e.g., `T.fontSize.title`, `T.fontSize.body`, etc.

### Spacing Conventions

No spacing scale exists yet — another area to improve. Common values observed:

- Screen horizontal padding: `16–24px`
- Section vertical gap: `12–16px`
- Card internal padding: `12–16px`
- Button padding: `12–16px vertical, 16–24px horizontal`
- Icon button padding: `14px vertical, 24px horizontal` (see HamburgerButton)

**TODO: Add spacing constants to Theme.ts** — e.g., `T.space.sm`, `T.space.md`, `T.space.lg`.

### StyleSheet vs Inline

- **Always use `StyleSheet.create()`** for component styles — defined at the bottom of each file
- **Inline styles only for dynamic values** (e.g., `style={{ backgroundColor: isActive ? T.accent : T.surface }}`)
- No NativeWind/className — do not introduce it without discussion

---

## Component Library

### Existing Reusable Components

**`PageHeader`** — `components/PageHeader.tsx`
```typescript
// Use on every main screen that needs a title + hamburger
<PageHeader title="Exercise Configuration" right={<SomeButton />} />
```
- Includes hamburger (left), title (center), optional right slot
- Handles safe area top inset automatically
- All tab screens should use this, not roll their own headers

---

**`HamburgerButton`** — `components/HamburgerButton.tsx`
```typescript
// Already included inside PageHeader — only use standalone if needed
<HamburgerButton />
```
- Calls `useDrawer().openDrawer()` — requires DrawerContext in tree

---

**`SegmentedControl`** — `components/FormControls.tsx`
```typescript
type SelectOption<T> = { label: string; value: T };

<SegmentedControl
  options={[{ label: 'Reps', value: 'reps' }, { label: 'Duration', value: 'duration' }]}
  value={volumeType}
  onChange={(val) => setVolumeType(val)}
/>
```
- Use for 2–4 mutually exclusive options
- Shows active state with accent color + checkmark

---

**`DropdownSelect`** — `components/FormControls.tsx`
```typescript
<DropdownSelect
  options={variationTypes.map(vt => ({ label: vt.name, value: vt.variation_type_id }))}
  value={selectedTypeId}
  onChange={(val) => setSelectedTypeId(val)}
  placeholder="Select type..."
/>
```
- Opens a `SlideUpModal` with a scrollable list
- Generic — works with any value type
- Supports optional "None" clear option

---

**`SlideUpModal`** — `components/FormControls.tsx`
```typescript
<SlideUpModal visible={modalVisible} onClose={() => setModalVisible(false)}>
  {/* any content */}
</SlideUpModal>
```
- Animated overlay + bottom sheet slide-up
- Handles keyboard on iOS
- Overlay tap closes it

---

**`Themed.Text` / `Themed.View`** — `components/Themed.tsx`
- Theme-aware wrappers; useful when light/dark toggling matters
- Currently not widely used since the app is dark-only

---

**`MonoText`** — `components/StyledText.tsx`
```typescript
<MonoText>some monospaced text</MonoText>
```
- SpaceMono font; use for code, data, or numeric displays

---

### Component Conventions

- Default export only (no named component exports from component files)
- Props type defined inline or as a local interface at the top of the file
- StyleSheet defined at the bottom of the file
- Contexts consumed via their own hooks (`useAuth()`, `useDrawer()`, etc.)

---

## Creating New Things

### New Screen Checklist

1. Create file in `app/(tabs)/` or a sub-route
2. Import and use `<PageHeader title="..." />` at the top
3. Wrap content in `<ScrollView>` if it might overflow
4. Use `T` for all colors — no hardcoded hex
5. Define styles at the bottom with `StyleSheet.create()`
6. If the screen has forms, use `SegmentedControl` / `DropdownSelect` / `SlideUpModal` from FormControls

```typescript
// Template: new screen
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PageHeader from '@/components/PageHeader';
import T from '@/constants/Theme';

export default function MyScreen() {
  return (
    <View style={styles.container}>
      <PageHeader title="My Screen" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Hello</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  content:   { padding: 16 },
  label:     { color: T.primary, fontSize: 16 },
});
```

### New Reusable Component Checklist

1. Place in `components/`
2. Export default only
3. Use `T` for all colors
4. Keep props interface small — don't over-engineer
5. Export from `components/index.ts` if it will be used in 3+ places

### Using the Supabase Client

```typescript
import { supabase } from '@/lib/supabase';

// Query
const { data, error } = await supabase
  .from('dim_exercise')
  .select('*')
  .eq('is_active', true);

// Mutation
const { error } = await supabase
  .from('dim_exercise')
  .update({ name: newName })
  .eq('exercise_id', id)
  .eq('user_id', user.id);  // Always scope to current user
```

RLS is enabled — always include `user_id` filters on mutations even if RLS would catch it.

### Auth Context Usage

```typescript
import { useAuth } from '@/lib/AuthContext';

const { user, profile, session, signOut, refreshProfile } = useAuth();
// user.id = Supabase auth UUID
// profile = dim_user row
```

### Exercise Data Context Usage

```typescript
import { useExerciseData } from '@/lib/ExerciseDataContext';

const { exercises, variations, variationTypes, exerciseDetailMap, loading } = useExerciseData();
// exerciseDetailMap[exercise_id] = { exercise, variations: Variation[] }
```

---

## Database Schema

### Key Tables

| Table | Purpose |
|---|---|
| `dim_user` | User profiles (linked to Supabase auth UUID) |
| `dim_exercise` | Exercise definitions (name, volume_type, intensity_type, is_active) |
| `dim_exercise_variation` | Variation definitions (name, variation_type_id, is_active) |
| `dim_variation_type` | Variation type catalog (e.g., "Grip", "Tempo") |
| `bridge_exercise_variation` | Many-to-many: exercises ↔ variations |
| `fact_user_workout` | Workout sessions (user_id, notes, dates) |
| `fact_workout_set` | Individual logged sets (weight, reps, exercise, variation) |
| `fact_set_variation` | Set ↔ variation links |

### Volume Formula

```
Volume = (bodyweight - assistance) × reps
```

For timed exercises, duration replaces reps. This is custom business logic — do not simplify or generalize it.

### Soft Deletes

Exercises and variations use `is_active = false` for deletion — **never hard delete**. Filter with `.eq('is_active', true)` on all reads.

---

## Important Domain Rules

- **Calisthenics context:** exercises use bodyweight + assistance bands/weights, not just external load
- **Volume type:** `reps` or `duration` per exercise (set at exercise definition)
- **Intensity type:** `weight` or `distance` per exercise (set at exercise definition)
- **Variations:** multiple variations can be assigned to one exercise, grouped by variation type. Only one variation per type per set.
- **Current workout persistence:** in-progress workout ID stored in AsyncStorage — always restore this on app boot

---

## Auth & Sign-In

- **Apple Sign-In:** iOS only — button conditionally rendered with `Platform.OS === 'ios'`
- **Google OAuth:** uses expo-auth-session + Supabase `signInWithIdToken`
- **Session expiry:** detected by SIGNED_OUT event without explicit signOut — shows "session expired" banner on login screen
- **Deep links:** `lambda://` scheme used for OAuth redirects

---

## EAS Build & Update

```bash
# Local development
cd lambda
npx expo start

# Preview build (internal testing)
eas build --profile preview --platform ios

# Production build
eas build --profile production --platform ios

# OTA update (no app store submission needed for JS changes)
eas update --branch production --message "fix: workout log crash"
```

EAS Project ID: `e3223c51-426d-43be-beeb-868503b46f4a`
App bundle ID: `com.pietroariston.lambda`

---

## Design Consistency — Current State & Roadmap

### What's Working Well (Keep Doing)
- All colors come from `T` — no magic hex values in screens
- `PageHeader` is consistently used on main screens
- `FormControls.tsx` provides consistent dropdowns, segmented controls, modals
- `StyleSheet.create()` at the bottom of every file
- Zod validation + `getFieldErrors()` pattern for forms

### Inconsistencies to Fix (Priority Order)

1. **Font sizes** — no constants; each screen picks arbitrary values. Add to `Theme.ts`:
   ```typescript
   fontSize: { xs: 12, sm: 14, md: 16, lg: 18, xl: 20, xxl: 24 }
   ```

2. **Spacing** — no scale; padding values are inconsistent across screens. Add to `Theme.ts`:
   ```typescript
   space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 }
   ```

3. **Button component** — every screen defines its own button styles. Create `components/Button.tsx`:
   - Variants: `primary` (accent fill), `ghost` (border only), `danger` (red fill)
   - Props: `label`, `onPress`, `variant`, `disabled`, `loading`

4. **Input component** — text input styling is duplicated across forms. Create `components/TextInput.tsx`
   - Props: `value`, `onChangeText`, `placeholder`, `error`, `label`, `multiline`

5. **Card/surface component** — repeated `backgroundColor: T.surface, borderRadius, padding` patterns

6. **AdminDataContext** (`app/(tabs)/two/AdminDataContext.tsx`) duplicates logic from `ExerciseDataContext`. Consolidate.

7. **Safe area** — `PageHeader` handles top inset but screen bottoms lack consistent padding from home indicator. Add `T.space.lg` bottom padding to ScrollViews.

### Component Opportunities (Not Built Yet)
- `Button.tsx` — standardized button (see above)
- `Input.tsx` — standardized text input with label + error state
- `Card.tsx` — surface container with consistent border/radius/padding
- `EmptyState.tsx` — consistent "nothing here yet" placeholder
- `LoadingSpinner.tsx` — centered activity indicator

---

## MCP Servers & External Integrations

### Connected MCP Servers
- **Supabase MCP** — direct database access (`mcp__supabase__*` tools). Use for schema inspection, migrations, SQL queries.
- **Context7** — library documentation lookups

### GitHub
- Repo: `AristonTheAnalyst/Lambda` (private)
- Branch: `main`

### Supabase Project
- Use `mcp__supabase__list_projects` to get current project ID/URL
- Migrations go through `mcp__supabase__apply_migration`
- Always check `mcp__supabase__get_advisors` after schema changes for RLS/security issues

### Stripe (Planned — Not Yet Implemented)
- Subscription logic will gate access to analytics/coaching features
- When adding Stripe: use `expo-stripe-sdk` or server-side via Supabase Edge Functions
- Subscription status should be stored in `dim_user` and checked via RLS

---

## Content Production Notes (Separate Context)

The user also does video/audio production for a YouTube channel. These notes apply when working on non-app tasks:

- **Audio gain targets:** peaks around -6dB to -3dB
- **Export format:** platform-appropriate (YouTube: H.264 + AAC)

---

## What's Not Built Yet

| Feature | Notes |
|---|---|
| Training Logs (`/four`) | Placeholder screen — needs workout history + analytics |
| Stripe subscriptions | Architecture TBD |
| Push notifications | Not started |
| Offline sync | expo-sqlite was considered but not implemented |
| Password reset | Auth screen exists but no reset flow |
| Tests | Zero test coverage |
| CI/CD | No GitHub Actions |
| Analytics dashboard | Core product vision — not started |
