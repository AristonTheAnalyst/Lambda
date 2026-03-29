import React from 'react';
import { FlatList, Keyboard, TextInput } from 'react-native';
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
      borderWidth={1}
      borderColor={T.border}
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
  React.useEffect(() => { if (visible) Keyboard.dismiss(); }, [visible]);
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
        animation="medium"
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

// ─── Dropdown Overlay (extracted so Sheet.Overlay types resolve outside generic) ─

function DropdownOverlay() {
  const Overlay = Sheet.Overlay as any;
  return (
    <Overlay
      animation="medium"
      enterStyle={{ opacity: 1 }}
      exitStyle={{ opacity: 0 }}
      backgroundColor="rgba(0,0,0,0.6)"
    />
  );
}

// ─── Dropdown Select ──────────────────────────────────────────────────────────

interface DropdownSelectProps<T = any> {
  options: SelectOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  placeholder?: string;
  searchable?: boolean;
  multiSelect?: false;
  selectedValues?: never;
  onChangeMulti?: never;
}

interface DropdownSelectMultiProps<T = any> {
  options: SelectOption<T>[];
  value?: never;
  onChange?: never;
  placeholder?: string;
  searchable?: boolean;
  multiSelect: true;
  selectedValues: T[];
  onChangeMulti: (values: T[]) => void;
}

export function DropdownSelect<T = any>(
  props: DropdownSelectProps<T> | DropdownSelectMultiProps<T>
) {
  const {
    options,
    placeholder = 'Select…',
    searchable = false,
    multiSelect = false,
  } = props;

  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const insets = useSafeAreaInsets();

  const selected    = !multiSelect ? options.find((o) => o.value === props.value) : undefined;
  const selValues   = multiSelect ? (props as DropdownSelectMultiProps<T>).selectedValues : [];
  const selValueSet = new Set(selValues.map(String));

  const filtered = searchable && query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  function handleOpen() { Keyboard.dismiss(); setQuery(''); setOpen(true); }

  function toggleMulti(val: T) {
    const onChangeMulti = (props as DropdownSelectMultiProps<T>).onChangeMulti;
    const key = String(val);
    if (selValueSet.has(key)) {
      onChangeMulti(selValues.filter((v) => String(v) !== key));
    } else {
      onChangeMulti([...selValues, val]);
    }
  }

  const triggerLabel = multiSelect
    ? selValues.length === 0
      ? placeholder
      : selValues.length <= 2
      ? selValues
          .map((v) => options.find((o) => String(o.value) === String(v))?.label ?? '')
          .filter(Boolean)
          .join(', ')
      : `${selValues.length} Selected`
    : selected
    ? selected.label
    : placeholder;

  const triggerHasValue = multiSelect ? selValues.length > 0 : !!selected;

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
        height={48}
        backgroundColor={T.surface}
        pressStyle={{ opacity: 0.75 }}
        onPress={handleOpen}
        cursor="pointer"
      >
        <Text
          fontSize={T.fontSize.md}
          fontWeight="400"
          flex={1}
          marginRight={T.space.sm}
          numberOfLines={1}
          color={triggerHasValue ? T.primary : T.muted}
        >
          {triggerLabel}
        </Text>
        <Text color={T.muted} fontSize={T.fontSize.lg}>▾</Text>
      </XStack>

      {/* ── Sheet ── */}
      <Sheet
        modal
        open={open}
        onOpenChange={(o: boolean) => { if (!o) setOpen(false); }}
        animation="medium"
        snapPoints={searchable ? [75] : [64]}
        disableDrag
        zIndex={100_000}
      >
        <DropdownOverlay />
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
                spellCheck={false}
                selectionColor={T.primary}
                style={{
                  backgroundColor: T.bg,
                  borderWidth: 1,
                  borderColor: T.border,
                  borderRadius: T.radius.md,
                  paddingHorizontal: T.space.md,
                  paddingVertical: 10,
                  color: T.primary,
                  fontSize: T.fontSize.md,
                  tintColor: T.primary,
                } as any}
              />
            </YStack>
          )}

          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.value)}
            keyboardShouldPersistTaps="handled"
            ItemSeparatorComponent={() => <Separator borderColor={T.border} />}
            renderItem={({ item }) => {
              const active = multiSelect
                ? selValueSet.has(String(item.value))
                : item.value === props.value;
              return (
                <XStack
                  alignItems="center"
                  justifyContent="space-between"
                  paddingHorizontal={T.space.xl}
                  paddingVertical={15}
                  backgroundColor={active ? T.accentBg : 'transparent'}
                  pressStyle={{ opacity: 0.7 }}
                  onPress={() => {
                    Keyboard.dismiss();
                    if (multiSelect) { toggleMulti(item.value); }
                    else { (props as DropdownSelectProps<T>).onChange(item.value); setOpen(false); }
                  }}
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

          {multiSelect && (
            <YStack paddingHorizontal={T.space.lg} paddingVertical={T.space.md}>
              <XStack
                backgroundColor={T.accent}
                borderRadius={T.radius.md}
                paddingVertical={T.space.md}
                alignItems="center"
                justifyContent="center"
                pressStyle={{ opacity: 0.8 }}
                onPress={() => setOpen(false)}
                cursor="pointer"
              >
                <Text color={T.accentText} fontSize={T.fontSize.md} fontWeight="600">Done</Text>
              </XStack>
            </YStack>
          )}
        </Sheet.Frame>
      </Sheet>
    </>
  );
}
