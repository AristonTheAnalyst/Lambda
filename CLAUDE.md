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
| UI / Styling | Tamagui v2 (`XStack`, `YStack`, `Text`, `Sheet`, `Spinner`, `styled()`) |
| Animations | React Native Reanimated 4, `@tamagui/animations-reanimated` |
| Auth | Supabase Auth (email/password, Google OAuth, Apple Sign-In) |
| Database | Supabase (PostgreSQL with RLS) + expo-sqlite (local-first cache) |
| State | React Context API (no Redux/Zustand) |
| Validation | Zod v4 |
| Icons | @expo/vector-icons (FontAwesome) |
| Fonts | SpaceMono (loaded via expo-font) |
| Storage | expo-secure-store (native), AsyncStorage (fallback) |
| Build/Deploy | EAS Build + EAS Update |

**Not in use (despite what you might assume):** NativeWind, Gluestack UI, Zustand, React Query, Redux. Do not introduce these.

### Project Structure

```
lambda/                        ← main app code lives here
├── app/                       ← Expo Router screens (file = route)
│   ├── _layout.tsx            ← root layout, TamaguiProvider + AuthProvider
│   ├── (auth)/                ← login.tsx, signup.tsx
│   ├── (onboarding)/          ← index.tsx (profile setup)
│   └── (tabs)/                ← main app tabs + sub-routes
│       ├── two/               ← exercise config sub-routes
│       └── four/              ← training logs sub-routes
├── components/                ← reusable UI components
├── constants/
│   ├── Theme.ts               ← THE source of truth for all colors/spacing/typography
│   └── Colors.ts              ← light/dark color mapping (currently both = dark)
├── lib/                       ← core logic, contexts, supabase client
│   ├── db/                    ← SQLite schema, migration runner, local ID seq, id_remap
│   ├── sync/                  ← syncQueue, syncEngine, SyncProvider/useSyncContext
│   └── offline/               ← local CRUD stores (workoutStore, setStore, exerciseStore, variationStore, bridgeStore)
├── hooks/                     ← small utility hooks
└── types/
    └── database.ts            ← TypeScript interfaces for DB rows
```

### Routing Tree

```
/(auth)/login                  → email/password + social login
/(auth)/signup                 → registration
/(onboarding)/                 → first-time profile setup (name, DOB, gender, height)
/(tabs)/                       → main app
  index                        → Tab 1: User Profile
  /two                         → Tab 2: Exercise Configuration hub (2 entries: Library + User Guide)
  /two/library                 → Combined Exercises & Variations CRUD + variation assignment
  /three                       → Tab 3: Workout Log (log sets live)
  /four                        → Tab 4: Training Logs — list of past workout cards
  /four/[id]                   → Full workout detail (read-only view + edit/delete sets)
```

The tab bar is hidden (`tabBarStyle: { display: 'none' }`). Navigation uses a custom hamburger drawer instead.

**Sub-screen headers:** Drill-down screens inside Stack navigators (`/two/*`, `/four/[id]`) use a manual header layout (safe area inset + `GlassButton` back button + centered title) instead of `PageHeader`, since `PageHeader` is designed for top-level tab screens with the hamburger.

### Auth Flow

```
App loads
  └─ No session → /(auth)/login
  └─ Session exists, onboarded: false → /(onboarding)
  └─ Session exists, onboarded: true  → /(tabs)
```

Session storage: SecureStore on native (chunked at 1900 bytes), AsyncStorage in Expo Go.

### Data Flow

- **AuthContext** (`lib/AuthContext.tsx`) — session, user profile, sign in/out methods. Hook: `useAuthContext()`
- **ExerciseDataContext** (`lib/ExerciseDataContext.tsx`) — reads from SQLite instantly on mount; background-seeds from Supabase on first install. Builds `exerciseDetailMap` (exercise ID → assigned variations). Hook: `useExerciseData()`
- **SyncContext** (`lib/sync/syncContext.tsx`) — processes sync queue on reconnect, app foreground, and mount. Hook: `useSyncContext()` → `{ isSyncing, pendingCount, lastSyncAt, triggerSync }`
- **DrawerContext** (`lib/DrawerContext.tsx`) — single `openDrawer()` function for the hamburger button. Hook: `useDrawer()`
- Local screen state for all form fields (no global form state)
- Active workout tracked via `is_active = 1` in SQLite `fact_user_workout` (replaces AsyncStorage)

### Local-First Architecture

All reads and writes go to SQLite immediately — zero latency, works offline. Supabase syncs in the background.

**Write path:** screen calls a store function → SQLite updated → operation enqueued in `sync_queue` → `SyncProvider` processes queue when online.

**Read path:** store/context reads from SQLite → instant, no network needed. On first install (SQLite empty), data is seeded from Supabase in the background.

**Negative ID convention:** Records created offline get negative integer IDs (`-1`, `-2`, …) from `local_id_seq`. After the INSERT syncs, `id_remap` stores `local_id → server_id` and the local row's PK is updated. Child records with `depends_on_local_id` wait for the parent to sync first.

**Store files** (`lib/offline/`):
- `workoutStore.ts` — `createWorkout`, `endWorkout`, `getActiveWorkoutId`, `loadWorkoutsWithSets`, `seedWorkoutsFromSupabase`
- `setStore.ts` — `insertSet`, `updateSet`, `deleteSet`, `loadSetsForWorkout`
- `exerciseStore.ts` — `findExerciseByName`, `createExercise`, `reactivateExercise`, `updateExercise`, `softDeleteExercise`
- `variationStore.ts` — `findVariationByName`, `createVariation`, `reactivateVariation`, `updateVariation`, `softDeleteVariation`
- `bridgeStore.ts` — `getBridgeForExercises`, `getBridgeForVariations`, `checkBridgeExists`, `addBridgeRow`, `removeBridgeRow`

---

## Styling System

### The Theme Object

**Everything goes through `T` from `@/constants/Theme`.** Never hardcode hex values in components. Never use Tamagui `$token` references — always pass `T.*` values directly.

```typescript
import T from '@/constants/Theme';

const Theme = {
  // Colors
  bg: '#262626',           // Main screen backgrounds
  surface: '#2e2e2e',      // Cards, inputs, modals, list rows
  surfaceHigh: '#363636',  // Selected/highlighted rows, hover states
  border: '#383838',       // Dividers, input borders, separators
  primary: '#ddbb98',      // Body text, labels, icons — warm tan
  muted: '#9e8470',        // Placeholder text, secondary labels, hints
  accent: '#eb912b',       // Buttons, active states, CTAs — warm orange-brown
  accentBg: '#3a2810',     // Accent-tinted row/card backgrounds
  accentText: '#fff',      // Text on top of accent-colored buttons
  danger: '#c0392b',       // Error messages, destructive action buttons
  dangerBg: '#3a1a1a',     // Danger-tinted backgrounds
  dangerBorder: '#7a2020', // Borders for danger-state inputs

  // Typography
  fontSize: { xs: 12, sm: 14, md: 16, lg: 18, xl: 20, xxl: 24 },

  // Spacing
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },

  // Border radius
  radius: { sm: 4, md: 8, lg: 12 },
}
```

The app is **dark-only**. `Colors.ts` maps light and dark identically to this palette.

### Tamagui Usage Pattern

All layout uses Tamagui primitives. Pass `T.*` values directly as props — no `StyleSheet.create()`, no Tamagui `$token` strings.

```typescript
import { XStack, YStack, Text } from 'tamagui';
import T from '@/constants/Theme';

// Layout
<YStack flex={1} backgroundColor={T.bg} padding={T.space.lg} gap={T.space.md}>
  <Text color={T.primary} fontSize={T.fontSize.md}>Hello</Text>
  <Text color={T.muted} fontSize={T.fontSize.sm}>Subtitle</Text>
</YStack>

// Pressable row
<XStack
  paddingVertical={T.space.md}
  paddingHorizontal={T.space.lg}
  backgroundColor={T.surface}
  borderRadius={T.radius.md}
  pressStyle={{ opacity: 0.7 }}
  onPress={handlePress}
  cursor="pointer"
>
  <Text color={T.primary}>Item</Text>
</XStack>
```

### styled() Components

When creating reusable styled components, use `YStack` or `XStack` as the base (not `Stack` — it is not exported from tamagui):

```typescript
import { YStack, styled } from 'tamagui';
import T from '@/constants/Theme';

const MyCard = styled(YStack, {
  backgroundColor: T.surface,
  borderRadius: T.radius.md,
  padding: T.space.md,
  variants: {
    active: { true: { backgroundColor: T.accentBg } },
  } as const,
});
```

---

## Component Library

### `Button` — `components/Button.tsx`

```typescript
<Button label="Save" onPress={handleSave} />
<Button label="Cancel" onPress={onCancel} variant="ghost" />
<Button label="Delete" onPress={onDelete} variant="danger" />
<Button label="Saving…" onPress={handleSave} loading={saving} disabled={saving} />
```

Variants: `primary` (default, accent fill), `ghost` (accent border only), `danger` (red fill), `danger-ghost` (red border only), `glass` (iOS 26+ only, falls back to primary).

**Button row conventions (standard across the app):**
- Cancel always goes on the **left**, the confirming action on the right
- Cancel always uses `variant="danger-ghost"` (red ghost)
- Destructive confirms (delete, discard) use `variant="danger"`; non-destructive confirms use `variant="primary"` (default)

---

### `Input` — `components/Input.tsx`

```typescript
<Input
  label="Email"
  value={email}
  onChangeText={setEmail}
  placeholder="Enter your email"
  error={fieldErrors.email}
  editable={!loading}
  autoCapitalize="none"
  keyboardType="email-address"
/>
<Input label="Notes" value={notes} onChangeText={setNotes} multiline />
```

Renders an optional label above and an optional red error message below. Handles dark keyboard appearance automatically.

**Parenthetical label styling:** Any text in parentheses within the `label` prop (e.g. `"Weight (optional)"`, `"Duration (seconds)"`) is automatically rendered in lighter weight and muted color. No extra props needed.

---

### `Card` — `components/Card.tsx`

```typescript
<Card>
  <Text color={T.primary}>Content</Text>
</Card>
<Card onPress={handlePress}>
  <Text color={T.primary}>Pressable card</Text>
</Card>
```

Variants: `default`, `glass` (iOS 26+ only). Automatically pressable when `onPress` is provided.

---

### `PageHeader` — `components/PageHeader.tsx`

```typescript
// Use on every main tab screen
<PageHeader title="Exercise Configuration" />
<PageHeader title="Profile" right={<Text onPress={startEditing} color={T.accent}>Edit</Text>} />
```

Includes hamburger (left), title (center), optional right slot. Handles safe area top inset automatically. All tab screens should use this.

---

### `HamburgerButton` — `components/HamburgerButton.tsx`

Already included inside `PageHeader`. Only use standalone if needed. Calls `useDrawer().openDrawer()` — requires `DrawerContext` in tree.

---

### `SegmentedControl` — `components/FormControls.tsx`

```typescript
<SegmentedControl
  options={[{ label: 'Reps', value: 'reps' }, { label: 'Duration', value: 'duration' }]}
  value={volumeType}
  onChange={setVolumeType}
/>
```

Use for 2–4 mutually exclusive options. Active state uses accent color + checkmark.

---

### `DropdownSelect` — `components/FormControls.tsx`

```typescript
<DropdownSelect
  options={variationTypes.map(vt => ({ label: vt.variation_type_name, value: vt.variation_type_id }))}
  value={selectedTypeId}
  onChange={setSelectedTypeId}
  placeholder="Select type…"
/>
```

Opens a bottom sheet with a scrollable list. Generic — works with any value type. Dismisses the keyboard automatically on open.

**Multi-select trigger label:** 0 selected → placeholder, 1 → item name, 2 → "Name A, Name B", 3+ → "X Selected".

**Snap points:** `[64]` default, `[75]` when `searchable` is true.

**Multi-select confirm button:** supports optional `confirmLabel` and `onConfirm` props. Use these to rename the "Done" button and trigger an action when it's pressed. Label can be dynamic (e.g. `"Add 3 Variations"`).

```typescript
<DropdownSelect
  multiSelect
  selectedValues={selection}
  onChangeMulti={setSelection}
  confirmLabel={selection.length > 0 ? `Add ${selection.length} Variations` : 'Done'}
  onConfirm={() => { /* commit selection */ }}
/>
```

---

### `SlideUpModal` — `components/FormControls.tsx`

```typescript
<SlideUpModal visible={modalVisible} onClose={() => setModalVisible(false)}>
  {/* any content */}
</SlideUpModal>
```

Animated overlay + bottom sheet slide-up (Tamagui `Sheet`). Overlay tap closes it. `snapPoints={[85]}` — 85% of screen height.

**Scrollable modal with sticky footer pattern** (used in edit modals):
```typescript
<SlideUpModal visible={visible} onClose={onClose}>
  <YStack flex={1}>
    <ScrollView contentContainerStyle={{ padding: T.space.xl, paddingBottom: T.space.md }}
      keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {/* form content */}
    </ScrollView>
    <XStack gap={T.space.sm} paddingHorizontal={T.space.xl} paddingTop={T.space.md}
      paddingBottom={T.space.xxl} borderTopWidth={0.5} borderTopColor={T.border}
      justifyContent="center" backgroundColor={T.surface}>
      <Button label="Cancel" onPress={onClose} variant="danger-ghost" />
      <Button label="Save" onPress={handleSave} />
    </XStack>
  </YStack>
</SlideUpModal>
```

**Critical:** `SlideUpModal` components must always be mounted at a stable level in the tree — never inside conditional render blocks (`{condition && <SlideUpModal>}`). Conditionally unmounting a Sheet breaks Tamagui's portal registry and causes the open trigger to stop working. Control visibility via the `visible` prop only.

---

### Component Conventions

- Default export only (no named component exports from component files)
- Props interface defined at the top of the file
- No `StyleSheet.create()` — use Tamagui props and `T.*` values
- Contexts consumed via their own hooks (`useAuthContext()`, `useDrawer()`, `useExerciseData()`)

---

## Creating New Things

### New Screen Checklist

1. Create file in `app/(tabs)/` or a sub-route
2. Use `<PageHeader title="…" />` at the top
3. Wrap content in `<ScrollView>` if it might overflow
4. Use Tamagui `YStack`/`XStack`/`Text` for layout — no bare RN `View`/`Text`
5. All values come from `T.*` — no hardcoded hex or numbers
6. For forms: use `Button`, `Input`, `SegmentedControl`, `DropdownSelect` from the component library
7. Wrap API-call handlers with `guard` from `useAsyncGuard()` (see Async Guard below)

```typescript
// Template: new screen
import { ScrollView } from 'react-native';
import { Text, YStack } from 'tamagui';
import PageHeader from '@/components/PageHeader';
import T from '@/constants/Theme';

export default function MyScreen() {
  return (
    <YStack flex={1} backgroundColor={T.bg}>
      <PageHeader title="My Screen" />
      <ScrollView contentContainerStyle={{ padding: T.space.lg }}>
        <Text color={T.primary} fontSize={T.fontSize.md}>Hello</Text>
      </ScrollView>
    </YStack>
  );
}
```

### New Reusable Component Checklist

1. Place in `components/`
2. Default export only
3. No `StyleSheet.create()` — use Tamagui `styled()` or inline Tamagui props
4. All colors/spacing/radius from `T.*`
5. Keep props interface small — don't over-engineer

---

## Async Guard

Use `useAsyncGuard()` from `lib/asyncGuard.ts` to prevent duplicate API calls from rapid button presses. Each screen instance gets its own isolated busy flag — one screen's pending call does not block other screens.

**Use on:** form submissions, save/delete operations, all auth actions.
**Do not use on:** navigation, UI toggles, or any handler that doesn't call an API.

```typescript
import { useAsyncGuard } from '@/lib/asyncGuard';

export default function MyScreen() {
  const guard = useAsyncGuard();

  function handleSave() { return guard(async () => {
    const { error } = await supabase.from('...').update({ ... });
    if (error) Alert.alert('Error', error.message);
  }); }

  function handleDelete() {
    Alert.alert('Delete?', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => guard(async () => {
        await supabase.from('...').delete().eq('id', id);
      })},
    ]);
  }
}
```

---

## Hamburger Drawer

The drawer lives in `app/(tabs)/_layout.tsx`. It uses Reanimated 4 for animation:
- Panel slides in from the left (`translateX`)
- Overlay fades in/out independently
- Open: 280ms `Easing.out(Easing.cubic)`
- Close: 220ms `Easing.in(Easing.cubic)`, implemented as a `Modal` with `animationType="none"`

Navigation fires simultaneously with the close animation start — the drawer slides out over the incoming screen transition. Active route items close the drawer without navigating. No `withGuard` on navigation — it should always be instant.

---

## Using the Supabase Client

```typescript
import supabase from '@/lib/supabase';

// Query
const { data, error } = await supabase
  .from('dim_exercise')
  .select('*')
  .eq('is_active', true);

// Mutation — always scope to current user
const { error } = await supabase
  .from('dim_exercise')
  .update({ exercise_name: newName })
  .eq('exercise_id', id)
  .eq('user_id', user.id);
```

RLS is enabled — always include `user_id` filters on mutations even if RLS would catch it.

---

## Context Usage

```typescript
import { useAuthContext } from '@/lib/AuthContext';
const { user, profile, session, signOut, refreshProfile } = useAuthContext();
// user.id = Supabase auth UUID
// profile = dim_user row

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
| `user_custom_exercise` | User exercise definitions (`custom_exercise_id`, `exercise_name`, `exercise_volume_type`, `exercise_intensity_type`, `is_active`) |
| `user_custom_variation` | User variation definitions (`custom_variation_id`, `variation_name`, `is_active`) |
| `dim_variation_type` | Variation type catalog (e.g., "Grip", "Tempo") |
| `bridge_exercise_variation` | Many-to-many: exercises ↔ variations |
| `fact_user_workout` | Workout sessions (`user_workout_id`, `user_id`, `user_workout_notes`, `user_workout_created_date`) |
| `fact_workout_set` | Individual logged sets (`workout_set_id`, `user_workout_id`, `custom_exercise_id`, `custom_variation_id`, `workout_set_number`, `workout_set_weight`, `workout_set_reps` array, `workout_set_duration_seconds` array, `workout_set_notes`) |

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

# After babel config changes — always clear Metro cache
npx expo start --clear

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

## What's Built

| Screen / Feature | Status |
|---|---|
| Auth (login, signup, Google, Apple) | Done |
| Onboarding (name, DOB, gender, height) | Done |
| User Profile (`/index`) | Done — displays and edits `dim_user` profile |
| Exercises & Variations (`/two/library`) | Done — combined CRUD screen with segmented control; edit modals include variation/exercise assignment inline |
| Workout Log (`/three`) | Done — start/end workout, log sets with weight/reps/variation/notes, edit/delete sets, weight persists per exercise |
| Training Logs (`/four`) | Done — scrollable list of past workout cards with date, notes, unique exercise+variation combos |
| Workout Detail (`/four/[id]`) | Done — full set list, edit/delete sets, same display as Workout Log |
| Local-first / Offline sync | Done — all screens use SQLite; sync queue auto-replays to Supabase on reconnect; OfflineBanner + SyncStatusIcon |

---

## Exercise & Variation Library (`/two/library`)

Single screen combining both CRUD lists via a `SegmentedControl` ("Exercises" / "Variations").

### Edit Modal Pattern (draft-based, deferred commit)

The edit modals for both exercises and variations use a **draft pattern**: all changes (name, volume type, and bridge assignments) are held in local React state and only written to SQLite when the user presses **Save**. Pressing **Cancel** discards everything with zero side effects.

**State shape (edit exercise):**
- `exOriginalVarIds: Set<number>` — snapshot from DB when modal opens; used to compute the diff
- `exDraftVarIds: Set<number>` — what's shown in the modal; updates as user adds/removes
- `exSelection: number[]` — currently checked items in the "Add variations" dropdown (cleared after Add)

**Interaction flow:**
1. Open edit modal → DB is queried, `exOriginalVarIds` and `exDraftVarIds` seeded identically
2. User removes a variation (trash button) → removed from `exDraftVarIds`; list updates immediately in modal
3. User opens "Add variations…" dropdown, selects items → stored in `exSelection`
4. User presses "Add N Variations" → `exSelection` IDs merged into `exDraftVarIds`, selection cleared; assigned list updates in modal
5. User presses **Save** → diffs draft vs original, calls `addBridgeRow`/`removeBridgeRow` only for changed IDs, then calls `updateExercise`, closes modal, refreshes context

**Same pattern applies to Edit Variation** (uses `varOriginalExIds`, `varDraftExIds`, `varSelection`).

### Performance notes

- `filteredEx` / `filteredVar` are `useMemo`-derived — only recompute when data or search changes
- `ExRow` / `VarRow` are `React.memo` components defined outside the screen — don't re-render on modal state changes
- `confirmDeleteEx`, `confirmDeleteVar`, `handleEditEx`, `handleEditVar` are `useCallback`-wrapped for stable refs passed to memoized rows

---

## Known Quirks & Non-Issues

These are recurring false alarms that look like bugs but are not. Do not attempt to fix them.

### Tamagui TypeScript errors on `T.*` values

**Every file that uses Tamagui layout components will show TypeScript errors like:**

```
Type '"#eb912b"' has no properties in common with type 'WithThemeShorthandsAndPseudos<...>'
Type '16' has no properties in common with type 'WithThemeShorthandsAndPseudos<...>'
```

**This is a known Tamagui v2 generic inference bug.** It affects every prop where a `T.*` value (e.g. `T.accent`, `T.space.md`, `T.fontSize.lg`) is passed to a Tamagui component (`XStack`, `YStack`, `Text`, etc.). The app compiles and runs correctly. Ignore all errors of this pattern — do not work around them by changing `T.*` usage, adding casts, or switching to hardcoded values.

### `withTransactionAsync` removed from syncEngine

`db.withTransactionAsync(...)` was removed from `lib/sync/syncEngine.ts` because expo-sqlite throws "cannot start a transaction within a transaction" when another db operation is in flight. The three post-INSERT operations (`setRemap`, `updateLocalRowId`, `markDone`) are now run sequentially without a wrapping transaction. This is intentional — the remap itself acts as an idempotency guard for retries.

### SlideUpModal always-mounted rule

`SlideUpModal` (and any Tamagui `Sheet`) must **never** be inside a conditional render block (`{condition && <SlideUpModal>}`). Conditionally unmounting a Sheet breaks Tamagui's portal registry and causes the open trigger to stop working. This also applies to `DropdownSelect`, which renders a Sheet internally — do not conditionally unmount `DropdownSelect` components. Control visibility via the `visible` prop only.

The wrong pattern that breaks things:
```tsx
{modalVisible && <SlideUpModal visible={modalVisible} ...>}   // ❌ breaks portal
{modalVisible && <DropdownSelect ...>}                         // ❌ breaks nested sheet
```

The correct pattern:
```tsx
<SlideUpModal visible={modalVisible} ...>  // ✅ always mounted
  <DropdownSelect ...>                     // ✅ always mounted
```

---

## What's Not Built Yet

| Feature | Notes |
|---|---|
| Offline sync | Done — full local-first architecture with expo-sqlite, sync queue, background Supabase sync, OfflineBanner, SyncStatusIcon |
| Analytics / Training Logs analytics | No charts, volume tracking, or progress views yet |
| Stripe subscriptions | Architecture TBD — will gate analytics/coaching features |
| Push notifications | Not started |
| Password reset | Auth screen exists but no reset flow |
| Tests | Zero test coverage |
| CI/CD | No GitHub Actions |
