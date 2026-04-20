import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Platform, ScrollView } from 'react-native';
import { Separator, Text, XStack, YStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GlassButton from '@/components/GlassButton';
import Button from '@/components/Button';
import PopupMenuButton from '@/components/PopupMenuButton';
import SlideTabView from '@/components/SlideTabView';
import { SegmentedControl, SlideUpModal, DropdownSelect } from '@/components/FormControls';
import type { SlideTab } from '@/components/SlideTabView';
import type { PressVariant } from '@/components/PopupMenuButton';
import { useAppTheme } from '@/lib/ThemeContext';

// ─── Shared helpers ────────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors, space, radius, fontSize } = useAppTheme();
  return (
    <YStack backgroundColor={colors.surface} borderRadius={radius.md} padding={space.lg} gap={space.md}>
      <Text fontSize={fontSize.sm} fontWeight="700" color={colors.muted} letterSpacing={1}>
        {title.toUpperCase()}
      </Text>
      <Separator borderColor={colors.border} />
      {children}
    </YStack>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  const { colors, fontSize, space } = useAppTheme();
  return (
    <XStack alignItems="center" justifyContent="space-between" paddingVertical={space.xs}>
      <Text fontSize={fontSize.sm} color={colors.muted} flex={1}>{label}</Text>
      <YStack alignItems="flex-end">{children}</YStack>
    </XStack>
  );
}

// ─── Page 1: Popup Menu variants ──────────────────────────────────────────────

const POPUP_VARIANTS: { key: PressVariant; title: string; description: string }[] = [
  { key: 'native',  title: 'Option 1 — Native iOS',        description: 'Scale 1.05 · Spring damping 20, stiffness 250, mass 1.2 · Simple and familiar' },
  { key: 'bouncy',  title: 'Option 2 — Bouncy',            description: 'Scale 1.08 · Spring damping 12, stiffness 150, mass 1.0 · More overshoot and energy' },
  { key: 'ghost',   title: 'Option 3 — Ghost (scale + fade)', description: 'Scale 1.05 + opacity 0.85 · Lifts off the surface with a slight ghost effect' },
  { key: 'depth',   title: 'Option 4 — Depth (scale + shadow)', description: 'Scale 1.05 + shadow elevation rises · Adds tactile depth illusion on press' },
  { key: 'minimal', title: 'Option 5 — Minimal',           description: 'Scale 1.02 · Spring damping 25, stiffness 300, mass 0.8 · Barely noticeable, premium feel' },
];

function PopupMenuPage() {
  const { colors, space, fontSize, radius } = useAppTheme();
  const [lastSelected, setLastSelected] = useState<string | null>(null);
  const options = [
    { label: 'Edit',    onSelect: () => setLastSelected('Edit') },
    { label: 'Share',   onSelect: () => setLastSelected('Share') },
    { label: 'Archive', onSelect: () => setLastSelected('Archive') },
    { label: 'Delete',  onSelect: () => setLastSelected('Delete'), destructive: true },
  ];
  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }}>
      {lastSelected && (
        <Text fontSize={fontSize.sm} color={colors.accent} textAlign="center">Selected: {lastSelected}</Text>
      )}
      {POPUP_VARIANTS.map(v => (
        <YStack key={v.key} backgroundColor={colors.surface} borderRadius={radius.md} padding={space.lg} gap={space.md}>
          <Text fontSize={fontSize.md} fontWeight="700" color={colors.primary}>{v.title}</Text>
          <Text fontSize={fontSize.sm} color={colors.muted}>{v.description}</Text>
          <PopupMenuButton label={v.title.split(' — ')[0]} options={options} pressVariant={v.key} />
        </YStack>
      ))}
    </ScrollView>
  );
}

// ─── Page 2: Buttons ──────────────────────────────────────────────────────────

function ButtonsPage() {
  const { space } = useAppTheme();
  const [seg, setSeg] = useState<'reps' | 'duration'>('reps');
  const [seg3, setSeg3] = useState<'a' | 'b' | 'c'>('a');
  const noop = () => {};
  const isGlass = Platform.OS === 'ios' && Number(Platform.Version) >= 26;

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }}>

      <SectionCard title="Variants">
        <Row label="primary"><Button label="Primary" onPress={noop} variant="primary" /></Row>
        <Row label="ghost"><Button label="Ghost" onPress={noop} variant="ghost" /></Row>
        <Row label="danger"><Button label="Danger" onPress={noop} variant="danger" /></Row>
        <Row label="danger-ghost"><Button label="Danger Ghost" onPress={noop} variant="danger-ghost" /></Row>
        {isGlass
          ? <Row label="glass"><Button label="Glass" onPress={noop} variant="glass" /></Row>
          : <Row label="glass (iOS 26+ only)"><Button label="Glass" onPress={noop} variant="primary" disabled /></Row>
        }
      </SectionCard>

      <SectionCard title="States">
        <Row label="loading"><Button label="Saving…" onPress={noop} loading /></Row>
        <Row label="disabled"><Button label="Disabled" onPress={noop} disabled /></Row>
        <Row label="loading danger"><Button label="Deleting…" onPress={noop} variant="danger" loading /></Row>
      </SectionCard>

      <SectionCard title="Full width">
        <Button label="Full Width Primary" onPress={noop} fullWidth />
        <Button label="Full Width Ghost" onPress={noop} variant="ghost" fullWidth />
        <Button label="Full Width Danger" onPress={noop} variant="danger" fullWidth />
      </SectionCard>

      <SectionCard title="Button row convention">
        <XStack gap={space.sm} justifyContent="center">
          <Button label="Cancel" onPress={noop} variant="danger-ghost" />
          <Button label="Save" onPress={noop} />
        </XStack>
        <XStack gap={space.sm} justifyContent="center">
          <Button label="Cancel" onPress={noop} variant="danger-ghost" />
          <Button label="Delete" onPress={noop} variant="danger" />
        </XStack>
      </SectionCard>

      <SectionCard title="Segmented control (2 options)">
        <SegmentedControl
          options={[{ label: 'Reps', value: 'reps' }, { label: 'Duration', value: 'duration' }]}
          value={seg}
          onChange={setSeg}
        />
      </SectionCard>

      <SectionCard title="Segmented control (3 options)">
        <SegmentedControl
          options={[{ label: 'Day', value: 'a' }, { label: 'Week', value: 'b' }, { label: 'Month', value: 'c' }]}
          value={seg3}
          onChange={setSeg3}
        />
      </SectionCard>

    </ScrollView>
  );
}

// ─── Page 3: Sheets & Modals ──────────────────────────────────────────────────

const FRUIT_OPTIONS = [
  { label: 'Apple',      value: 'apple' },
  { label: 'Banana',     value: 'banana' },
  { label: 'Cherry',     value: 'cherry' },
  { label: 'Dragonfruit',value: 'dragonfruit' },
  { label: 'Elderberry', value: 'elderberry' },
  { label: 'Fig',        value: 'fig' },
  { label: 'Grape',      value: 'grape' },
  { label: 'Honeydew',   value: 'honeydew' },
];

function SheetsPage() {
  const { space, colors, fontSize } = useAppTheme();
  const noop = () => {};

  const [basicOpen,    setBasicOpen]    = useState(false);
  const [footerOpen,   setFooterOpen]   = useState(false);
  const [fitOpen,      setFitOpen]      = useState(false);
  const [singleVal,    setSingleVal]    = useState<string | null>(null);
  const [searchVal,    setSearchVal]    = useState<string | null>(null);
  const [multiVals,    setMultiVals]    = useState<string[]>([]);

  return (
    <>
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }}>

        <SectionCard title="SlideUpModal — basic (85% snap)">
          <Button label="Open Modal" onPress={() => setBasicOpen(true)} />
        </SectionCard>

        <SectionCard title="SlideUpModal — scrollable + sticky footer">
          <Button label="Open Modal" onPress={() => setFooterOpen(true)} />
        </SectionCard>

        <SectionCard title="SlideUpModal — fit content">
          <Button label="Open Modal" onPress={() => setFitOpen(true)} />
        </SectionCard>

        <SectionCard title="DropdownSelect — single">
          <DropdownSelect
            options={FRUIT_OPTIONS}
            value={singleVal}
            onChange={setSingleVal}
            placeholder="Pick a fruit…"
          />
        </SectionCard>

        <SectionCard title="DropdownSelect — searchable">
          <DropdownSelect
            options={FRUIT_OPTIONS}
            value={searchVal}
            onChange={setSearchVal}
            placeholder="Search fruits…"
            searchable
          />
        </SectionCard>

        <SectionCard title="DropdownSelect — multi-select">
          <DropdownSelect
            options={FRUIT_OPTIONS}
            multiSelect
            selectedValues={multiVals}
            onChangeMulti={setMultiVals}
            placeholder="Pick multiple…"
            confirmLabel={multiVals.length > 0 ? `Select ${multiVals.length}` : 'Done'}
          />
        </SectionCard>

      </ScrollView>

      {/* Always mounted — never inside conditional render */}
      <SlideUpModal visible={basicOpen} onClose={() => setBasicOpen(false)}>
        <YStack padding={space.xl} gap={space.lg}>
          <Text fontSize={fontSize.lg} fontWeight="700" color={colors.primary}>Basic Modal</Text>
          <Text fontSize={fontSize.sm} color={colors.muted}>
            This is a standard SlideUpModal at 85% snap height. Tap the overlay to dismiss.
          </Text>
          <Button label="Close" onPress={() => setBasicOpen(false)} variant="ghost" />
        </YStack>
      </SlideUpModal>

      <SlideUpModal visible={footerOpen} onClose={() => setFooterOpen(false)}>
        <YStack flex={1}>
          <ScrollView
            contentContainerStyle={{ padding: space.xl, paddingBottom: space.md }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text fontSize={fontSize.lg} fontWeight="700" color={colors.primary} marginBottom={space.md}>
              Scrollable Modal
            </Text>
            {Array.from({ length: 12 }, (_, i) => (
              <YStack key={i} paddingVertical={space.md} borderBottomWidth={0.5} borderBottomColor={colors.border}>
                <Text fontSize={fontSize.sm} color={colors.primary}>Row {i + 1}</Text>
              </YStack>
            ))}
          </ScrollView>
          <XStack
            gap={space.sm}
            paddingHorizontal={space.xl}
            paddingTop={space.md}
            paddingBottom={space.xxl}
            borderTopWidth={0.5}
            borderTopColor={colors.border}
            justifyContent="center"
            backgroundColor={colors.surface}
          >
            <Button label="Cancel" onPress={() => setFooterOpen(false)} variant="danger-ghost" />
            <Button label="Save" onPress={() => setFooterOpen(false)} />
          </XStack>
        </YStack>
      </SlideUpModal>

      <SlideUpModal visible={fitOpen} onClose={() => setFitOpen(false)} fitContent>
        <YStack padding={space.xl} gap={space.lg}>
          <Text fontSize={fontSize.lg} fontWeight="700" color={colors.primary}>Fit Content</Text>
          <Text fontSize={fontSize.sm} color={colors.muted}>
            This modal snaps to fit its content height instead of a fixed 85%.
          </Text>
          <XStack gap={space.sm} justifyContent="center">
            <Button label="Cancel" onPress={() => setFitOpen(false)} variant="danger-ghost" />
            <Button label="Confirm" onPress={() => setFitOpen(false)} />
          </XStack>
        </YStack>
      </SlideUpModal>
    </>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

const TABS = ['Popup Menu', 'Buttons', 'Sheets'] as const;
type Tab = typeof TABS[number];

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const { colors, space, fontSize } = useAppTheme();
  return (
    <XStack borderBottomWidth={0.5} borderBottomColor={colors.border}>
      {TABS.map(tab => {
        const isActive = tab === active;
        return (
          <XStack
            key={tab}
            flex={1}
            paddingVertical={space.md}
            alignItems="center"
            justifyContent="center"
            onPress={() => onChange(tab)}
            cursor="pointer"
            pressStyle={{ opacity: 0.7 }}
            borderBottomWidth={2}
            borderBottomColor={isActive ? colors.accent : 'transparent'}
          >
            <Text
              fontSize={fontSize.sm}
              fontWeight={isActive ? '700' : '400'}
              color={isActive ? colors.accent : colors.muted}
            >
              {tab}
            </Text>
          </XStack>
        );
      })}
    </XStack>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ExperimentalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, space, fontSize } = useAppTheme();
  const [activeTab, setActiveTab] = useState<Tab>('Popup Menu');

  const tabs = useMemo<SlideTab[]>(() => [
    { key: 'Popup Menu', content: <PopupMenuPage /> },
    { key: 'Buttons',    content: <ButtonsPage /> },
    { key: 'Sheets',     content: <SheetsPage /> },
  ], []);

  return (
    <YStack flex={1} backgroundColor={colors.bg}>
      <YStack paddingTop={insets.top + space.sm} paddingBottom={space.md} paddingHorizontal={space.lg}>
        <XStack alignItems="center" gap={space.md}>
          <GlassButton icon="chevron-left" onPress={() => router.back()} />
          <Text fontSize={fontSize.xl} fontWeight="700" color={colors.primary} flex={1} textAlign="center" marginRight={44}>
            Experimental Features
          </Text>
        </XStack>
      </YStack>

      <TabBar active={activeTab} onChange={setActiveTab} />
      <SlideTabView tabs={tabs} activeKey={activeTab} onIndexChange={(k) => setActiveTab(k as Tab)} />
    </YStack>
  );
}
