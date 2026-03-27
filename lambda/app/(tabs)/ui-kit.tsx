import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text, XStack, YStack } from 'tamagui';
import PageHeader from '@/components/PageHeader';
import Button from '@/components/Button';
import Card from '@/components/Card';
import Input from '@/components/Input';
import { SegmentedControl, DropdownSelect, SlideUpModal } from '@/components/FormControls';
import GlassButton from '@/components/GlassButton';
import T from '@/constants/Theme';

// ─── Section header ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <YStack gap={T.space.sm}>
      <Text color={T.muted} fontSize={T.fontSize.xs} fontWeight="700" letterSpacing={1}>
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
      borderRadius={T.radius.sm}
      paddingVertical={T.space.sm}
      paddingHorizontal={T.space.md}
      flex={1}
      alignItems="center"
    >
      <Text color={textColor ?? T.primary} fontSize={T.fontSize.xs} fontWeight="600">
        {name}
      </Text>
      <Text color={textColor ?? T.muted} fontSize={9}>
        {color}
      </Text>
    </YStack>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function UIKitScreen() {
  const [inputValue, setInputValue]       = useState('');
  const [segValue, setSegValue]           = useState<'reps' | 'duration'>('reps');
  const [dropValue, setDropValue]         = useState<string | null>(null);
  const [modalVisible, setModalVisible]   = useState(false);

  const DROP_OPTIONS = [
    { label: 'Option A', value: 'a' },
    { label: 'Option B', value: 'b' },
    { label: 'Option C', value: 'c' },
  ];

  return (
    <YStack flex={1} backgroundColor={T.bg}>
      <PageHeader title="UI Kit" />

      <ScrollView contentContainerStyle={{ padding: T.space.lg, gap: T.space.xl }} showsVerticalScrollIndicator={false}>
        <YStack gap={T.space.xl}>

          {/* ── GlassButton ── */}
          <Section title="GlassButton">
            <Text color={T.muted} fontSize={T.fontSize.xs}>
              Used for the hamburger (icon only) and back button (icon + label). On iOS 26+ renders a real blur capsule; falls back to a translucent dark pill.
            </Text>
            <XStack gap={T.space.md} flexWrap="wrap">
              <GlassButton icon="bars" iconSize={18} onPress={() => {}} />
              <GlassButton icon="chevron-left" label="Back" onPress={() => {}} />
              <GlassButton icon="trash" label="Delete" color={T.danger} onPress={() => {}} />
              <GlassButton label="Label only" onPress={() => {}} />
            </XStack>
          </Section>

          {/* ── Inline row actions ── */}
          <Section title="Inline Row Actions">
            <Text color={T.muted} fontSize={T.fontSize.xs}>
              Used in list rows (exercises, variations). Inline XStacks, not a component.
            </Text>
            {/* Current */}
            <Text color={T.muted} fontSize={T.fontSize.xs} fontWeight="600">Current — filled bg, boxy (radius.sm)</Text>
            <XStack alignItems="center" paddingVertical={T.space.sm}>
              <Text flex={1} fontSize={15} color={T.primary}>Pull-up</Text>
              <XStack paddingHorizontal={T.space.sm} paddingVertical={T.space.xs + 2} marginLeft={T.space.sm} borderRadius={T.radius.sm} backgroundColor={T.accentBg} pressStyle={{ opacity: 0.7 }} cursor="pointer">
                <Text fontSize={T.fontSize.sm} fontWeight="500" color={T.accent}>Edit</Text>
              </XStack>
              <XStack paddingHorizontal={T.space.sm} paddingVertical={T.space.xs + 2} marginLeft={T.space.sm} borderRadius={T.radius.sm} backgroundColor={T.dangerBg} pressStyle={{ opacity: 0.7 }} cursor="pointer">
                <Text fontSize={T.fontSize.sm} fontWeight="500" color={T.danger}>Del</Text>
              </XStack>
            </XStack>

            {/* Filled + radius.md */}
            <Text color={T.muted} fontSize={T.fontSize.xs} fontWeight="600">Filled bg, rounder (radius.md)</Text>
            <XStack alignItems="center" paddingVertical={T.space.sm}>
              <Text flex={1} fontSize={15} color={T.primary}>Pull-up</Text>
              <XStack paddingHorizontal={T.space.sm} paddingVertical={T.space.xs + 2} marginLeft={T.space.sm} borderRadius={T.radius.md} backgroundColor={T.accentBg} pressStyle={{ opacity: 0.7 }} cursor="pointer">
                <Text fontSize={T.fontSize.sm} fontWeight="500" color={T.accent}>Edit</Text>
              </XStack>
              <XStack paddingHorizontal={T.space.sm} paddingVertical={T.space.xs + 2} marginLeft={T.space.sm} borderRadius={T.radius.md} backgroundColor={T.dangerBg} pressStyle={{ opacity: 0.7 }} cursor="pointer">
                <Text fontSize={T.fontSize.sm} fontWeight="500" color={T.danger}>Del</Text>
              </XStack>
            </XStack>

            {/* Filled + pill */}
            <Text color={T.muted} fontSize={T.fontSize.xs} fontWeight="600">Filled bg, pill (9999)</Text>
            <XStack alignItems="center" paddingVertical={T.space.sm}>
              <Text flex={1} fontSize={15} color={T.primary}>Pull-up</Text>
              <XStack paddingHorizontal={T.space.md} paddingVertical={T.space.xs + 2} marginLeft={T.space.sm} borderRadius={9999} backgroundColor={T.accentBg} pressStyle={{ opacity: 0.7 }} cursor="pointer">
                <Text fontSize={T.fontSize.sm} fontWeight="500" color={T.accent}>Edit</Text>
              </XStack>
              <XStack paddingHorizontal={T.space.md} paddingVertical={T.space.xs + 2} marginLeft={T.space.sm} borderRadius={9999} backgroundColor={T.dangerBg} pressStyle={{ opacity: 0.7 }} cursor="pointer">
                <Text fontSize={T.fontSize.sm} fontWeight="500" color={T.danger}>Del</Text>
              </XStack>
            </XStack>

            {/* Ghost */}
            <Text color={T.muted} fontSize={T.fontSize.xs} fontWeight="600">Ghost (border only, radius.sm)</Text>
            <XStack alignItems="center" paddingVertical={T.space.sm}>
              <Text flex={1} fontSize={15} color={T.primary}>Pull-up</Text>
              <XStack paddingHorizontal={T.space.sm} paddingVertical={T.space.xs + 2} marginLeft={T.space.sm} borderRadius={T.radius.sm} borderWidth={1} borderColor={T.accent} pressStyle={{ opacity: 0.7 }} cursor="pointer">
                <Text fontSize={T.fontSize.sm} fontWeight="500" color={T.accent}>Edit</Text>
              </XStack>
              <XStack paddingHorizontal={T.space.sm} paddingVertical={T.space.xs + 2} marginLeft={T.space.sm} borderRadius={T.radius.sm} borderWidth={1} borderColor={T.danger} pressStyle={{ opacity: 0.7 }} cursor="pointer">
                <Text fontSize={T.fontSize.sm} fontWeight="500" color={T.danger}>Del</Text>
              </XStack>
            </XStack>

            {/* Text only */}
            <Text color={T.muted} fontSize={T.fontSize.xs} fontWeight="600">Text only (no container)</Text>
            <XStack alignItems="center" paddingVertical={T.space.sm}>
              <Text flex={1} fontSize={15} color={T.primary}>Pull-up</Text>
              <Text fontSize={T.fontSize.sm} fontWeight="600" color={T.accent} marginLeft={T.space.lg} pressStyle={{ opacity: 0.7 }} cursor="pointer">Edit</Text>
              <Text fontSize={T.fontSize.sm} fontWeight="600" color={T.danger} marginLeft={T.space.lg} pressStyle={{ opacity: 0.7 }} cursor="pointer">Del</Text>
            </XStack>

            {/* Icon only */}
            <Text color={T.muted} fontSize={T.fontSize.xs} fontWeight="600">Icon only</Text>
            <XStack alignItems="center" paddingVertical={T.space.sm}>
              <Text flex={1} fontSize={15} color={T.primary}>Pull-up</Text>
              <XStack paddingHorizontal={T.space.sm} paddingVertical={T.space.xs + 2} marginLeft={T.space.sm} borderRadius={T.radius.sm} backgroundColor={T.accentBg} pressStyle={{ opacity: 0.7 }} cursor="pointer">
                <FontAwesome name="pencil" size={14} color={T.accent} />
              </XStack>
              <XStack paddingHorizontal={T.space.sm} paddingVertical={T.space.xs + 2} marginLeft={T.space.sm} borderRadius={T.radius.sm} backgroundColor={T.dangerBg} pressStyle={{ opacity: 0.7 }} cursor="pointer">
                <FontAwesome name="trash" size={14} color={T.danger} />
              </XStack>
            </XStack>

            {/* Icon only, GlassButton style */}
            <Text color={T.muted} fontSize={T.fontSize.xs} fontWeight="600">Icon only, GlassButton style</Text>
            <XStack alignItems="center" paddingVertical={T.space.sm}>
              <Text flex={1} fontSize={15} color={T.primary}>Pull-up</Text>
              <XStack marginLeft={T.space.sm}>
                <GlassButton icon="pencil" iconSize={14} onPress={() => {}} />
              </XStack>
              <XStack marginLeft={T.space.sm}>
                <GlassButton icon="trash" iconSize={14} color={T.danger} onPress={() => {}} />
              </XStack>
            </XStack>

            {/* Icon + text */}
            <Text color={T.muted} fontSize={T.fontSize.xs} fontWeight="600">Icon + text</Text>
            <XStack alignItems="center" paddingVertical={T.space.sm}>
              <Text flex={1} fontSize={15} color={T.primary}>Pull-up</Text>
              <XStack gap={T.space.xs} paddingHorizontal={T.space.sm} paddingVertical={T.space.xs + 2} marginLeft={T.space.sm} borderRadius={T.radius.sm} backgroundColor={T.accentBg} alignItems="center" pressStyle={{ opacity: 0.7 }} cursor="pointer">
                <FontAwesome name="pencil" size={12} color={T.accent} />
                <Text fontSize={T.fontSize.sm} fontWeight="500" color={T.accent}>Edit</Text>
              </XStack>
              <XStack gap={T.space.xs} paddingHorizontal={T.space.sm} paddingVertical={T.space.xs + 2} marginLeft={T.space.sm} borderRadius={T.radius.sm} backgroundColor={T.dangerBg} alignItems="center" pressStyle={{ opacity: 0.7 }} cursor="pointer">
                <FontAwesome name="trash" size={12} color={T.danger} />
                <Text fontSize={T.fontSize.sm} fontWeight="500" color={T.danger}>Del</Text>
              </XStack>
            </XStack>
          </Section>

          {/* ── Buttons ── */}
          <Section title="Button">
            <Button label="Primary (default)" onPress={() => {}} />
            <Button label="Ghost" onPress={() => {}} variant="ghost" />
            <Button label="Danger" onPress={() => {}} variant="danger" />
            <Button label="Loading…" onPress={() => {}} loading />
            <Button label="Disabled" onPress={() => {}} disabled />
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
              <Text color={T.primary} fontSize={T.fontSize.md}>Static card</Text>
              <Text color={T.muted} fontSize={T.fontSize.sm}>Non-pressable, surface background</Text>
            </Card>
            <Card onPress={() => {}}>
              <Text color={T.primary} fontSize={T.fontSize.md}>Pressable card</Text>
              <Text color={T.muted} fontSize={T.fontSize.sm}>Tap me — dims on press</Text>
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

          {/* ── SlideUpModal ── */}
          <Section title="SlideUpModal">
            <Button label="Open Slide-Up Modal" onPress={() => setModalVisible(true)} variant="ghost" />
            <SlideUpModal visible={modalVisible} onClose={() => setModalVisible(false)}>
              <YStack padding={T.space.xl} gap={T.space.md}>
                <Text color={T.primary} fontSize={T.fontSize.lg} fontWeight="700">SlideUpModal</Text>
                <Text color={T.muted} fontSize={T.fontSize.sm}>
                  85% snap, overlay tap closes it. Tap the overlay or the button below.
                </Text>
                <Button label="Close" onPress={() => setModalVisible(false)} />
              </YStack>
            </SlideUpModal>
          </Section>

          {/* ── Typography ── */}
          <Section title="Typography">
            <YStack gap={T.space.xs}>
              {(
                [
                  ['xxl — 24px', T.fontSize.xxl],
                  ['xl — 20px', T.fontSize.xl],
                  ['lg — 18px', T.fontSize.lg],
                  ['md — 16px', T.fontSize.md],
                  ['sm — 14px', T.fontSize.sm],
                  ['xs — 12px', T.fontSize.xs],
                ] as [string, number][]
              ).map(([label, size]) => (
                <Text key={label} color={T.primary} fontSize={size}>
                  {label}
                </Text>
              ))}
            </YStack>
          </Section>

          {/* ── Colors ── */}
          <Section title="Colors">
            <XStack gap={T.space.xs} flexWrap="wrap">
              <Swatch name="bg" color={T.bg} />
              <Swatch name="surface" color={T.surface} />
              <Swatch name="surfaceHigh" color={T.surfaceHigh} />
            </XStack>
            <XStack gap={T.space.xs}>
              <Swatch name="border" color={T.border} />
              <Swatch name="primary" color={T.primary} textColor={T.bg} />
              <Swatch name="muted" color={T.muted} textColor={T.bg} />
            </XStack>
            <XStack gap={T.space.xs}>
              <Swatch name="accent" color={T.accent} textColor={T.accentText} />
              <Swatch name="accentBg" color={T.accentBg} />
              <Swatch name="accentText" color={T.accentText} textColor={T.bg} />
            </XStack>
            <XStack gap={T.space.xs}>
              <Swatch name="danger" color={T.danger} textColor={T.accentText} />
              <Swatch name="dangerBg" color={T.dangerBg} />
              <Swatch name="dangerBorder" color={T.dangerBorder} />
            </XStack>
          </Section>

          {/* ── Spacing ── */}
          <Section title="Spacing">
            {(
              [
                ['xs — 4', T.space.xs],
                ['sm — 8', T.space.sm],
                ['md — 12', T.space.md],
                ['lg — 16', T.space.lg],
                ['xl — 24', T.space.xl],
                ['xxl — 32', T.space.xxl],
              ] as [string, number][]
            ).map(([label, size]) => (
              <XStack key={label} alignItems="center" gap={T.space.md}>
                <Text color={T.muted} fontSize={T.fontSize.xs} width={80}>{label}</Text>
                <YStack width={size} height={size} backgroundColor={T.accent} borderRadius={T.radius.sm} />
              </XStack>
            ))}
          </Section>

          {/* ── Border Radius ── */}
          <Section title="Border Radius">
            <XStack gap={T.space.md}>
              {(
                [
                  ['sm — 4', T.radius.sm],
                  ['md — 8', T.radius.md],
                  ['lg — 12', T.radius.lg],
                ] as [string, number][]
              ).map(([label, radius]) => (
                <YStack key={label} flex={1} alignItems="center" gap={T.space.xs}>
                  <YStack
                    width={56}
                    height={56}
                    backgroundColor={T.surface}
                    borderRadius={radius}
                    borderWidth={1}
                    borderColor={T.accent}
                  />
                  <Text color={T.muted} fontSize={T.fontSize.xs}>{label}</Text>
                </YStack>
              ))}
            </XStack>
          </Section>

          <YStack height={T.space.xl} />
        </YStack>
      </ScrollView>
    </YStack>
  );
}
