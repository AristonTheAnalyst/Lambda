import React, { useState } from 'react';
import { ScrollView, useWindowDimensions } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text, XStack, YStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PageHeader from '@/components/PageHeader';
import Button from '@/components/Button';
import Card from '@/components/Card';
import Input from '@/components/Input';
import NotesField from '@/components/NotesField';
import { SegmentedControl, DropdownSelect, SlideUpModal } from '@/components/FormControls';
import GlassButton from '@/components/GlassButton';
import { useAppTheme } from '@/lib/ThemeContext';

// ─── Section header ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <YStack gap={space.sm}>
      <Text color={colors.muted} fontSize={fontSize.xs} fontWeight="700" letterSpacing={1}>
        {title.toUpperCase()}
      </Text>
      {children}
    </YStack>
  );
}

// ─── Color swatch ─────────────────────────────────────────────────────────────

function Swatch({ name, color, textColor }: { name: string; color: string; textColor?: string }) {
  return (
    <YStack
      backgroundColor={color}
      borderRadius={radius.sm}
      paddingVertical={space.sm}
      paddingHorizontal={space.md}
      flex={1}
      alignItems="center"
    >
      <Text color={textColor ?? colors.primary} fontSize={fontSize.xs} fontWeight="600">
        {name}
      </Text>
      <Text color={textColor ?? colors.muted} fontSize={9}>
        {color}
      </Text>
    </YStack>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function UIKitScreen() {
  const { colors, space, radius, fontSize } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const modalBottomSpacer = windowHeight * 0.15;

  const [inputValue, setInputValue]       = useState('');
  const [segValue, setSegValue]           = useState<'reps' | 'duration'>('reps');
  const [dropValue, setDropValue]         = useState<string | null>(null);
  const [modalVisible, setModalVisible]   = useState(false);
  const [notesValue, setNotesValue]       = useState('');

  // ── Modal preview state ──────────────────────────────────────────────────────
  const [logSetNoExVisible,   setLogSetNoExVisible]   = useState(false);
  const [logSetWithExVisible, setLogSetWithExVisible] = useState(false);
  const [endWorkoutVisible,   setEndWorkoutVisible]   = useState(false);
  const [newExVisible,        setNewExVisible]        = useState(false);
  const [newVarVisible,       setNewVarVisible]       = useState(false);
  const [editExVisible,       setEditExVisible]       = useState(false);
  const [editVarVisible,      setEditVarVisible]      = useState(false);
  const [demoVolumeType, setDemoVolumeType]           = useState<'reps' | 'duration'>('reps');

  const DROP_OPTIONS = [
    { label: 'Option A', value: 'a' },
    { label: 'Option B', value: 'b' },
    { label: 'Option C', value: 'c' },
  ];

  return (
    <YStack flex={1} backgroundColor={colors.bg}>
      <PageHeader title="UI Kit — DEV ONLY" />

      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.xl }} showsVerticalScrollIndicator={false}>
        <YStack gap={space.xl}>

          {/* ── GlassButton ── */}
          <Section title="GlassButton">
            <Text color={colors.muted} fontSize={fontSize.xs}>
              Used for the hamburger (icon only) and back button (icon + label). On iOS 26+ renders a real blur capsule; falls back to a translucent dark pill.
            </Text>
            <XStack gap={space.md} flexWrap="wrap">
              <GlassButton icon="bars" iconSize={18} onPress={() => {}} />
              <GlassButton icon="chevron-left" label="Back" onPress={() => {}} />
              <GlassButton icon="trash" label="Delete" color={colors.danger} onPress={() => {}} />
              <GlassButton label="Label only" onPress={() => {}} />
            </XStack>
          </Section>

          {/* ── Inline row actions ── */}
          <Section title="Inline Row Actions">
            <Text color={colors.muted} fontSize={fontSize.xs}>
              Used in list rows (exercises, variations). Inline XStacks, not a component.
            </Text>
            {/* Current */}
            <Text color={colors.muted} fontSize={fontSize.xs} fontWeight="600">Current — filled bg, boxy (radius.sm)</Text>
            <XStack alignItems="center" paddingVertical={space.sm}>
              <Text flex={1} fontSize={15} color={colors.primary}>Pull-up</Text>
              <XStack paddingHorizontal={space.sm} paddingVertical={space.xs + 2} marginLeft={space.sm} borderRadius={radius.sm} backgroundColor={colors.accentBg} pressStyle={{ opacity: 0.7 }} cursor="pointer">
                <Text fontSize={fontSize.sm} fontWeight="500" color={colors.accent}>Edit</Text>
              </XStack>
              <XStack paddingHorizontal={space.sm} paddingVertical={space.xs + 2} marginLeft={space.sm} borderRadius={radius.sm} backgroundColor={colors.dangerBg} pressStyle={{ opacity: 0.7 }} cursor="pointer">
                <Text fontSize={fontSize.sm} fontWeight="500" color={colors.danger}>Del</Text>
              </XStack>
            </XStack>

            {/* Filled + radius.md */}
            <Text color={colors.muted} fontSize={fontSize.xs} fontWeight="600">Filled bg, rounder (radius.md)</Text>
            <XStack alignItems="center" paddingVertical={space.sm}>
              <Text flex={1} fontSize={15} color={colors.primary}>Pull-up</Text>
              <XStack paddingHorizontal={space.sm} paddingVertical={space.xs + 2} marginLeft={space.sm} borderRadius={radius.md} backgroundColor={colors.accentBg} pressStyle={{ opacity: 0.7 }} cursor="pointer">
                <Text fontSize={fontSize.sm} fontWeight="500" color={colors.accent}>Edit</Text>
              </XStack>
              <XStack paddingHorizontal={space.sm} paddingVertical={space.xs + 2} marginLeft={space.sm} borderRadius={radius.md} backgroundColor={colors.dangerBg} pressStyle={{ opacity: 0.7 }} cursor="pointer">
                <Text fontSize={fontSize.sm} fontWeight="500" color={colors.danger}>Del</Text>
              </XStack>
            </XStack>

            {/* Filled + pill */}
            <Text color={colors.muted} fontSize={fontSize.xs} fontWeight="600">Filled bg, pill (9999)</Text>
            <XStack alignItems="center" paddingVertical={space.sm}>
              <Text flex={1} fontSize={15} color={colors.primary}>Pull-up</Text>
              <XStack paddingHorizontal={space.md} paddingVertical={space.xs + 2} marginLeft={space.sm} borderRadius={9999} backgroundColor={colors.accentBg} pressStyle={{ opacity: 0.7 }} cursor="pointer">
                <Text fontSize={fontSize.sm} fontWeight="500" color={colors.accent}>Edit</Text>
              </XStack>
              <XStack paddingHorizontal={space.md} paddingVertical={space.xs + 2} marginLeft={space.sm} borderRadius={9999} backgroundColor={colors.dangerBg} pressStyle={{ opacity: 0.7 }} cursor="pointer">
                <Text fontSize={fontSize.sm} fontWeight="500" color={colors.danger}>Del</Text>
              </XStack>
            </XStack>

            {/* Ghost */}
            <Text color={colors.muted} fontSize={fontSize.xs} fontWeight="600">Ghost (border only, radius.sm)</Text>
            <XStack alignItems="center" paddingVertical={space.sm}>
              <Text flex={1} fontSize={15} color={colors.primary}>Pull-up</Text>
              <XStack paddingHorizontal={space.sm} paddingVertical={space.xs + 2} marginLeft={space.sm} borderRadius={radius.sm} borderWidth={1} borderColor={colors.accent} pressStyle={{ opacity: 0.7 }} cursor="pointer">
                <Text fontSize={fontSize.sm} fontWeight="500" color={colors.accent}>Edit</Text>
              </XStack>
              <XStack paddingHorizontal={space.sm} paddingVertical={space.xs + 2} marginLeft={space.sm} borderRadius={radius.sm} borderWidth={1} borderColor={colors.danger} pressStyle={{ opacity: 0.7 }} cursor="pointer">
                <Text fontSize={fontSize.sm} fontWeight="500" color={colors.danger}>Del</Text>
              </XStack>
            </XStack>

            {/* Text only */}
            <Text color={colors.muted} fontSize={fontSize.xs} fontWeight="600">Text only (no container)</Text>
            <XStack alignItems="center" paddingVertical={space.sm}>
              <Text flex={1} fontSize={15} color={colors.primary}>Pull-up</Text>
              <Text fontSize={fontSize.sm} fontWeight="600" color={colors.accent} marginLeft={space.lg} pressStyle={{ opacity: 0.7 }} cursor="pointer">Edit</Text>
              <Text fontSize={fontSize.sm} fontWeight="600" color={colors.danger} marginLeft={space.lg} pressStyle={{ opacity: 0.7 }} cursor="pointer">Del</Text>
            </XStack>

            {/* Icon only */}
            <Text color={colors.muted} fontSize={fontSize.xs} fontWeight="600">Icon only</Text>
            <XStack alignItems="center" paddingVertical={space.sm}>
              <Text flex={1} fontSize={15} color={colors.primary}>Pull-up</Text>
              <XStack paddingHorizontal={space.sm} paddingVertical={space.xs + 2} marginLeft={space.sm} borderRadius={radius.sm} backgroundColor={colors.accentBg} pressStyle={{ opacity: 0.7 }} cursor="pointer">
                <FontAwesome name="pencil" size={14} color={colors.accent} />
              </XStack>
              <XStack paddingHorizontal={space.sm} paddingVertical={space.xs + 2} marginLeft={space.sm} borderRadius={radius.sm} backgroundColor={colors.dangerBg} pressStyle={{ opacity: 0.7 }} cursor="pointer">
                <FontAwesome name="trash" size={14} color={colors.danger} />
              </XStack>
            </XStack>

            {/* Icon only, GlassButton style */}
            <Text color={colors.muted} fontSize={fontSize.xs} fontWeight="600">Icon only, GlassButton style</Text>
            <XStack alignItems="center" paddingVertical={space.sm}>
              <Text flex={1} fontSize={15} color={colors.primary}>Pull-up</Text>
              <XStack marginLeft={space.sm}>
                <GlassButton icon="pencil" iconSize={14} onPress={() => {}} />
              </XStack>
              <XStack marginLeft={space.sm}>
                <GlassButton icon="trash" iconSize={14} color={colors.danger} onPress={() => {}} />
              </XStack>
            </XStack>

            {/* Icon + text */}
            <Text color={colors.muted} fontSize={fontSize.xs} fontWeight="600">Icon + text</Text>
            <XStack alignItems="center" paddingVertical={space.sm}>
              <Text flex={1} fontSize={15} color={colors.primary}>Pull-up</Text>
              <XStack gap={space.xs} paddingHorizontal={space.sm} paddingVertical={space.xs + 2} marginLeft={space.sm} borderRadius={radius.sm} backgroundColor={colors.accentBg} alignItems="center" pressStyle={{ opacity: 0.7 }} cursor="pointer">
                <FontAwesome name="pencil" size={12} color={colors.accent} />
                <Text fontSize={fontSize.sm} fontWeight="500" color={colors.accent}>Edit</Text>
              </XStack>
              <XStack gap={space.xs} paddingHorizontal={space.sm} paddingVertical={space.xs + 2} marginLeft={space.sm} borderRadius={radius.sm} backgroundColor={colors.dangerBg} alignItems="center" pressStyle={{ opacity: 0.7 }} cursor="pointer">
                <FontAwesome name="trash" size={12} color={colors.danger} />
                <Text fontSize={fontSize.sm} fontWeight="500" color={colors.danger}>Del</Text>
              </XStack>
            </XStack>
          </Section>

          {/* ── Buttons ── */}
          <Section title="Button">
            <Button label="Primary (default)" onPress={() => {}} />
            <Button label="Ghost" onPress={() => {}} variant="ghost" />
            <Button label="Danger" onPress={() => {}} variant="danger" />
            <Button label="Danger Ghost" onPress={() => {}} variant="danger-ghost" />
            <Button label="Loading…" onPress={() => {}} loading />
            <Button label="Disabled" onPress={() => {}} disabled />
            <Text color={colors.muted} fontSize={fontSize.xs} fontWeight="700" marginTop={space.xs}>
              BUTTON ROW CONVENTION
            </Text>
            <Text color={colors.muted} fontSize={fontSize.xs}>
              Cancel always left (danger-ghost), confirming action right (primary). Destructive confirms use danger.
            </Text>
            <XStack gap={space.sm} justifyContent="center">
              <Button label="Cancel" onPress={() => {}} variant="danger-ghost" />
              <Button label="Save" onPress={() => {}} />
            </XStack>
            <XStack gap={space.sm} justifyContent="center">
              <Button label="Cancel" onPress={() => {}} variant="danger-ghost" />
              <Button label="Delete" onPress={() => {}} variant="danger" />
            </XStack>
          </Section>

          {/* ── Input ── */}
          <Section title="Input">
            <Input
              label="Label"
              value={inputValue}
              onChangeText={setInputValue}
              placeholder="Placeholder text…"
            />
            <Input
              label="Weight (optional)"
              value=""
              onChangeText={() => {}}
              placeholder="Parenthetical label"
            />
            <Input
              label="With error"
              value=""
              onChangeText={() => {}}
              placeholder="Something went wrong"
              error="This field is required"
            />
            <Input
              label="Multiline"
              value=""
              onChangeText={() => {}}
              placeholder="Notes…"
              multiline
            />
            <Input
              label="Disabled"
              value="Can't touch this"
              onChangeText={() => {}}
              editable={false}
            />
          </Section>

          {/* ── Card ── */}
          <Section title="Card">
            <Card>
              <Text color={colors.primary} fontSize={fontSize.md}>Static card</Text>
              <Text color={colors.muted} fontSize={fontSize.sm}>Non-pressable, surface background</Text>
            </Card>
            <Card onPress={() => {}}>
              <Text color={colors.primary} fontSize={fontSize.md}>Pressable card</Text>
              <Text color={colors.muted} fontSize={fontSize.sm}>Tap me — dims on press</Text>
            </Card>
          </Section>

          {/* ── SegmentedControl ── */}
          <Section title="SegmentedControl">
            <SegmentedControl
              options={[
                { label: 'Reps', value: 'reps' },
                { label: 'Duration', value: 'duration' },
              ]}
              value={segValue}
              onChange={setSegValue}
            />
            <SegmentedControl
              options={[
                { label: 'Weight', value: 'weight' },
                { label: 'Distance', value: 'distance' },
                { label: 'None', value: 'none' },
              ]}
              value="weight"
              onChange={() => {}}
            />
          </Section>

          {/* ── DropdownSelect ── */}
          <Section title="DropdownSelect">
            <DropdownSelect
              options={DROP_OPTIONS}
              value={dropValue}
              onChange={setDropValue}
              placeholder="Pick an option…"
            />
          </Section>

          {/* ── NotesField ── */}
          <Section title="NotesField">
            <Text color={colors.muted} fontSize={fontSize.xs}>
              Tappable single-line trigger (pencil icon) that opens a SlideUpModal with a full multiline input. Cancel discards, Done saves. Used for pre/post-workout notes.
            </Text>
            <NotesField
              label="Pre-workout notes (optional)"
              value={notesValue}
              onChange={setNotesValue}
            />
          </Section>

          {/* ── SlideUpModal ── */}
          <Section title="SlideUpModal">
            <Button label="Open Slide-Up Modal" onPress={() => setModalVisible(true)} variant="ghost" />
            <SlideUpModal visible={modalVisible} onClose={() => setModalVisible(false)}>
              <YStack padding={space.xl} gap={space.md}>
                <Text color={colors.primary} fontSize={fontSize.lg} fontWeight="700">SlideUpModal</Text>
                <Text color={colors.muted} fontSize={fontSize.sm}>
                  85% snap, overlay tap closes it. Tap the overlay or the button below.
                </Text>
                <Button label="Close" onPress={() => setModalVisible(false)} />
              </YStack>
            </SlideUpModal>
          </Section>

          {/* ── Typography ── */}
          <Section title="Typography">
            <YStack gap={space.xs}>
              {(
                [
                  ['xxl — 24px', fontSize.xxl],
                  ['xl — 20px', fontSize.xl],
                  ['lg — 18px', fontSize.lg],
                  ['md — 16px', fontSize.md],
                  ['sm — 14px', fontSize.sm],
                  ['xs — 12px', fontSize.xs],
                ] as [string, number][]
              ).map(([label, size]) => (
                <Text key={label} color={colors.primary} fontSize={size}>
                  {label}
                </Text>
              ))}
            </YStack>
          </Section>

          {/* ── Colors ── */}
          <Section title="Colors">
            <XStack gap={space.xs} flexWrap="wrap">
              <Swatch name="bg" color={colors.bg} />
              <Swatch name="surface" color={colors.surface} />
              <Swatch name="surfaceHigh" color={colors.surfaceHigh} />
            </XStack>
            <XStack gap={space.xs}>
              <Swatch name="border" color={colors.border} />
              <Swatch name="primary" color={colors.primary} textColor={colors.bg} />
              <Swatch name="muted" color={colors.muted} textColor={colors.bg} />
            </XStack>
            <XStack gap={space.xs}>
              <Swatch name="accent" color={colors.accent} textColor={colors.accentText} />
              <Swatch name="accentBg" color={colors.accentBg} />
              <Swatch name="accentText" color={colors.accentText} textColor={colors.bg} />
            </XStack>
            <XStack gap={space.xs}>
              <Swatch name="danger" color={colors.danger} textColor={colors.accentText} />
              <Swatch name="dangerBg" color={colors.dangerBg} />
              <Swatch name="dangerBorder" color={colors.dangerBorder} />
            </XStack>
          </Section>

          {/* ── Spacing ── */}
          <Section title="Spacing">
            {(
              [
                ['xs — 4', space.xs],
                ['sm — 8', space.sm],
                ['md — 12', space.md],
                ['lg — 16', space.lg],
                ['xl — 24', space.xl],
                ['xxl — 32', space.xxl],
              ] as [string, number][]
            ).map(([label, size]) => (
              <XStack key={label} alignItems="center" gap={space.md}>
                <Text color={colors.muted} fontSize={fontSize.xs} width={80}>{label}</Text>
                <YStack width={size} height={size} backgroundColor={colors.accent} borderRadius={radius.sm} />
              </XStack>
            ))}
          </Section>

          {/* ── Border Radius ── */}
          <Section title="Border Radius">
            <XStack gap={space.md}>
              {(
                [
                  ['sm — 4', radius.sm],
                  ['md — 8', radius.md],
                  ['lg — 12', radius.lg],
                ] as [string, number][]
              ).map(([label, radius]) => (
                <YStack key={label} flex={1} alignItems="center" gap={space.xs}>
                  <YStack
                    width={56}
                    height={56}
                    backgroundColor={colors.surface}
                    borderRadius={radius}
                    borderWidth={1}
                    borderColor={colors.accent}
                  />
                  <Text color={colors.muted} fontSize={fontSize.xs}>{label}</Text>
                </YStack>
              ))}
            </XStack>
          </Section>

          {/* ── Modals ── */}
          <Section title="Modals">
            <Text color={colors.muted} fontSize={fontSize.xs}>
              Every SlideUpModal variant used in the app. Tap to preview.
            </Text>

            <Button label="Log Set — no exercise selected" onPress={() => setLogSetNoExVisible(true)} variant="ghost" />
            <Button label="Log Set — exercise selected" onPress={() => setLogSetWithExVisible(true)} variant="ghost" />
            <Button label="End Workout" onPress={() => setEndWorkoutVisible(true)} variant="ghost" />
            <Button label="New Exercise" onPress={() => setNewExVisible(true)} variant="ghost" />
            <Button label="New Variation" onPress={() => setNewVarVisible(true)} variant="ghost" />
            <Button label="Edit Exercise (complex)" onPress={() => setEditExVisible(true)} variant="ghost" />
            <Button label="Edit Variation (complex)" onPress={() => setEditVarVisible(true)} variant="ghost" />

            {/* ── Log Set — no exercise ── */}
            <SlideUpModal visible={logSetNoExVisible} onClose={() => setLogSetNoExVisible(false)} fitContent>
              <YStack padding={space.xl} gap={space.md}>
                <Text fontSize={fontSize.lg} fontWeight="700" color={colors.primary}>Log Set</Text>
                <YStack>
                  <Text fontSize={fontSize.sm} fontWeight="500" marginBottom={space.xs} color={colors.primary}>Exercise</Text>
                  <DropdownSelect options={[{ label: 'Pull-up', value: 'pullup' }, { label: 'Dip', value: 'dip' }]} value={null} onChange={() => {}} placeholder="Select exercise…" searchable />
                </YStack>
                <XStack gap={space.sm} justifyContent="center">
                  <Button label="Cancel" onPress={() => setLogSetNoExVisible(false)} variant="danger-ghost" />
                  <Button label="Log Set" onPress={() => {}} />
                </XStack>
                <YStack height={modalBottomSpacer} />
              </YStack>
            </SlideUpModal>

            {/* ── Log Set — with exercise ── */}
            <SlideUpModal visible={logSetWithExVisible} onClose={() => setLogSetWithExVisible(false)} fitContent>
              <YStack padding={space.xl} gap={space.md}>
                <Text fontSize={fontSize.lg} fontWeight="700" color={colors.primary}>Log Set</Text>
                <XStack gap={space.sm} alignItems="flex-end">
                  <YStack flex={3}>
                    <Text fontSize={fontSize.sm} fontWeight="500" marginBottom={space.xs} color={colors.primary}>Exercise</Text>
                    <DropdownSelect options={[{ label: 'Pull-up', value: 'pullup' }]} value="pullup" onChange={() => {}} placeholder="Select exercise…" searchable />
                  </YStack>
                  <YStack flex={2}>
                    <Text fontSize={fontSize.sm} fontWeight="500" marginBottom={space.xs} color={colors.primary}>Variation</Text>
                    <DropdownSelect options={[{ label: 'Wide Grip', value: 'wide' }]} value={null} onChange={() => {}} placeholder="None" />
                  </YStack>
                </XStack>
                <Input label="Weight (optional)" placeholder="kg" keyboardType="numbers-and-punctuation" value="" onChangeText={() => {}} />
                <Input label="Reps" placeholder="e.g. 10,8,6" keyboardType="numbers-and-punctuation" value="" onChangeText={() => {}} />
                <Input label="Set notes (optional)" placeholder="Notes…" value="" onChangeText={() => {}} />
                <XStack gap={space.sm} justifyContent="center">
                  <Button label="Cancel" onPress={() => setLogSetWithExVisible(false)} variant="danger-ghost" />
                  <Button label="Log Set" onPress={() => {}} />
                </XStack>
                <YStack height={modalBottomSpacer} />
              </YStack>
            </SlideUpModal>

            {/* ── End Workout ── */}
            <SlideUpModal visible={endWorkoutVisible} onClose={() => setEndWorkoutVisible(false)} fitContent>
              <YStack padding={space.xl} gap={space.md}>
                <Text fontSize={fontSize.lg} fontWeight="700" color={colors.primary}>End Workout</Text>
                <NotesField label="Post-workout notes (optional)" value="" onChange={() => {}} />
                <XStack gap={space.sm} justifyContent="center">
                  <Button label="Cancel" onPress={() => setEndWorkoutVisible(false)} variant="danger-ghost" />
                  <Button label="End Workout" onPress={() => {}} />
                </XStack>
                <YStack height={modalBottomSpacer} />
              </YStack>
            </SlideUpModal>

            {/* ── New Exercise ── */}
            <SlideUpModal visible={newExVisible} onClose={() => setNewExVisible(false)} fitContent>
              <YStack padding={space.xl} gap={space.md}>
                <Text fontSize={fontSize.lg} fontWeight="700" color={colors.primary}>New Exercise</Text>
                <Input label="Exercise name" placeholder="e.g. Pull-up" value="" onChangeText={() => {}} />
                <YStack gap={space.xs}>
                  <Text fontSize={fontSize.sm} fontWeight="500" color={colors.primary}>Volume type</Text>
                  <SegmentedControl
                    options={[{ label: 'Reps', value: 'reps' }, { label: 'Duration', value: 'duration' }]}
                    value={demoVolumeType}
                    onChange={setDemoVolumeType}
                  />
                </YStack>
                <XStack gap={space.sm} justifyContent="center">
                  <Button label="Cancel" onPress={() => setNewExVisible(false)} variant="danger-ghost" />
                  <Button label="Create" onPress={() => {}} />
                </XStack>
                <YStack height={modalBottomSpacer} />
              </YStack>
            </SlideUpModal>

            {/* ── New Variation ── */}
            <SlideUpModal visible={newVarVisible} onClose={() => setNewVarVisible(false)} fitContent>
              <YStack padding={space.xl} gap={space.md}>
                <Text fontSize={fontSize.lg} fontWeight="700" color={colors.primary}>New Variation</Text>
                <Input label="Variation name" placeholder="e.g. Wide Grip" value="" onChangeText={() => {}} />
                <XStack gap={space.sm} justifyContent="center">
                  <Button label="Cancel" onPress={() => setNewVarVisible(false)} variant="danger-ghost" />
                  <Button label="Create" onPress={() => {}} />
                </XStack>
                <YStack height={modalBottomSpacer} />
              </YStack>
            </SlideUpModal>

            {/* ── Edit Exercise ── */}
            <SlideUpModal visible={editExVisible} onClose={() => setEditExVisible(false)} fitContent>
              <YStack padding={space.xl} gap={space.md}>
                <Text fontSize={fontSize.lg} fontWeight="700" color={colors.primary}>Edit Exercise</Text>
                <Input label="Exercise name" value="Pull-up" onChangeText={() => {}} />
                <YStack gap={space.xs}>
                  <Text fontSize={fontSize.sm} fontWeight="500" color={colors.primary}>Volume type</Text>
                  <SegmentedControl
                    options={[{ label: 'Reps', value: 'reps' }, { label: 'Duration', value: 'duration' }]}
                    value={demoVolumeType}
                    onChange={setDemoVolumeType}
                  />
                </YStack>
                <YStack height={0.5} backgroundColor={colors.border} />
                <Text fontSize={fontSize.sm} fontWeight="600" color={colors.primary}>Assigned Variations</Text>
                {['Wide Grip', 'Neutral Grip'].map((v) => (
                  <XStack key={v} alignItems="center" gap={space.sm}>
                    <Text flex={1} color={colors.primary} fontSize={fontSize.sm}>{v}</Text>
                    <GlassButton icon="trash" iconSize={14} color={colors.danger} onPress={() => {}} />
                  </XStack>
                ))}
                <DropdownSelect options={[{ label: 'Tempo', value: 'tempo' }, { label: 'Weighted', value: 'weighted' }]} value={null} onChange={() => {}} placeholder="Add variations…" />
                <XStack gap={space.sm} justifyContent="center">
                  <Button label="Cancel" onPress={() => setEditExVisible(false)} variant="danger-ghost" />
                  <Button label="Save" onPress={() => {}} />
                </XStack>
                <YStack height={modalBottomSpacer} />
              </YStack>
            </SlideUpModal>

            {/* ── Edit Variation ── */}
            <SlideUpModal visible={editVarVisible} onClose={() => setEditVarVisible(false)} fitContent>
              <YStack padding={space.xl} gap={space.md}>
                <Text fontSize={fontSize.lg} fontWeight="700" color={colors.primary}>Edit Variation</Text>
                <Input label="Variation name" value="Wide Grip" onChangeText={() => {}} />
                <YStack height={0.5} backgroundColor={colors.border} />
                <Text fontSize={fontSize.sm} fontWeight="600" color={colors.primary}>Assigned Exercises</Text>
                {['Pull-up', 'Lat Pulldown'].map((e) => (
                  <XStack key={e} alignItems="center" gap={space.sm}>
                    <Text flex={1} color={colors.primary} fontSize={fontSize.sm}>{e}</Text>
                    <GlassButton icon="trash" iconSize={14} color={colors.danger} onPress={() => {}} />
                  </XStack>
                ))}
                <DropdownSelect options={[{ label: 'Chin-up', value: 'chinup' }, { label: 'Ring Row', value: 'ringrow' }]} value={null} onChange={() => {}} placeholder="Add exercises…" />
                <XStack gap={space.sm} justifyContent="center">
                  <Button label="Cancel" onPress={() => setEditVarVisible(false)} variant="danger-ghost" />
                  <Button label="Save" onPress={() => {}} />
                </XStack>
                <YStack height={modalBottomSpacer} />
              </YStack>
            </SlideUpModal>
          </Section>

          <YStack height={space.xl} />
        </YStack>
      </ScrollView>
    </YStack>
  );
}
