import React from 'react';
import { FlatList, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Separator,
  Sheet,
  Text,
  XStack,
  YStack,
  styled,
} from 'tamagui';
import T from '@/constants/Theme';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SelectOption<T = any> {
  label: string;
  value: T;
}

// ─── Segmented Control ────────────────────────────────────────────────────────

interface SegmentedControlProps<T extends string> {
  options: SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

const SegItem = styled(YStack, {
  flex: 1,
  paddingVertical: T.space.sm,
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: T.radius.sm,
  cursor: 'pointer',

  variants: {
    active: {
      true:  { backgroundColor: T.accent, pressStyle: { opacity: 0.85 } },
      false: { backgroundColor: 'transparent', pressStyle: { opacity: 0.7 } },
    },
  } as const,
});

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <XStack
      backgroundColor={T.surface}
      borderRadius={T.radius.sm}
      padding={T.space.xs}
      marginBottom={T.space.xs}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <SegItem
            key={String(opt.value)}
            active={active}
            onPress={() => onChange(opt.value)}
          >
            <Text
              color={active ? T.accentText : T.muted}
              fontSize={T.fontSize.sm}
              fontWeight={active ? '600' : '400'}
            >
              {opt.label}
            </Text>
          </SegItem>
        );
      })}
    </XStack>
  );
}

// ─── Slide-up Modal ───────────────────────────────────────────────────────────

interface SlideUpModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function SlideUpModal({ visible, onClose, children }: SlideUpModalProps) {
  return (
    <Sheet
      modal
      open={visible}
      onOpenChange={(open: boolean) => { if (!open) onClose(); }}
      animation="medium"
      snapPoints={[85]}
      disableDrag
      zIndex={100_000}
    >
      <Sheet.Overlay
        animation="lazy"
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
        backgroundColor="rgba(0,0,0,0.6)"
      />
      <Sheet.Frame backgroundColor={T.surface}>
        {children}
      </Sheet.Frame>
    </Sheet>
  );
}

// ─── Dropdown Select ──────────────────────────────────────────────────────────

interface DropdownSelectProps<T = any> {
  options: SelectOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  placeholder?: string;
  searchable?: boolean;
}

export function DropdownSelect<T = any>({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  searchable = false,
}: DropdownSelectProps<T>) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const selected = options.find((o) => o.value === value);
  const insets   = useSafeAreaInsets();

  const filtered = searchable && query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  function handleOpen() { setQuery(''); setOpen(true); }

  return (
    <>
      {/* ── Trigger ── */}
      <XStack
        alignItems="center"
        justifyContent="space-between"
        borderWidth={1}
        borderColor={T.border}
        borderRadius={T.radius.md}
        paddingHorizontal={T.space.md}
        paddingVertical={13}
        marginBottom={T.space.xs}
        backgroundColor={T.surface}
        pressStyle={{ opacity: 0.75 }}
        onPress={handleOpen}
        cursor="pointer"
      >
        <Text
          fontSize={T.fontSize.md}
          flex={1}
          marginRight={T.space.sm}
          numberOfLines={1}
          color={selected ? T.primary : T.muted}
        >
          {selected ? selected.label : placeholder}
        </Text>
        <Text color={T.muted} fontSize={T.fontSize.xs}>▾</Text>
      </XStack>

      {/* ── Sheet ── */}
      <Sheet
        modal
        open={open}
        onOpenChange={(o: boolean) => { if (!o) setOpen(false); }}
        animation="medium"
        snapPoints={[75]}
        disableDrag
        moveOnKeyboardChange
        zIndex={100_000}
      >
        <Sheet.Overlay
          animation="lazy"
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
          backgroundColor="rgba(0,0,0,0.6)"
        />
        <Sheet.Frame backgroundColor={T.surface} paddingBottom={insets.bottom}>
          {/* Handle */}
          <YStack alignItems="center" paddingTop={T.space.sm} paddingBottom={T.space.xs}>
            <YStack width={36} height={4} borderRadius={2} backgroundColor={T.border} />
          </YStack>

          {searchable && (
            <YStack paddingHorizontal={T.space.lg} paddingBottom={T.space.sm}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search…"
                placeholderTextColor={T.muted}
                autoFocus
                style={{
                  backgroundColor: T.bg,
                  borderWidth: 1,
                  borderColor: T.border,
                  borderRadius: T.radius.md,
                  paddingHorizontal: T.space.md,
                  paddingVertical: 10,
                  color: T.primary,
                  fontSize: T.fontSize.md,
                }}
              />
            </YStack>
          )}

          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.value)}
            keyboardShouldPersistTaps="handled"
            ItemSeparatorComponent={() => <Separator borderColor={T.border} />}
            renderItem={({ item }) => {
              const active = item.value === value;
              return (
                <XStack
                  alignItems="center"
                  justifyContent="space-between"
                  paddingHorizontal={T.space.xl}
                  paddingVertical={15}
                  backgroundColor={active ? T.accentBg : 'transparent'}
                  pressStyle={{ opacity: 0.7 }}
                  onPress={() => { onChange(item.value); setOpen(false); }}
                  cursor="pointer"
                >
                  <Text
                    fontSize={T.fontSize.md}
                    color={active ? T.accent : T.primary}
                    fontWeight={active ? '600' : '400'}
                  >
                    {item.label}
                  </Text>
                  {active && <Text color={T.accent} fontSize={T.fontSize.md}>✓</Text>}
                </XStack>
              );
            }}
          />
        </Sheet.Frame>
      </Sheet>
    </>
  );
}
