import React from 'react';
import { FlatList, Keyboard, ScrollView, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Separator,
  Sheet,
  Text,
  XStack,
  YStack,
} from 'tamagui';
import { SquashPressable } from '@/components/PressSquash';
import { useCappedKeyboardInset } from '@/hooks/useCappedKeyboardInset';
import { useAppTheme } from '@/lib/ThemeContext';

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

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const { colors, space, radius, fontSize } = useAppTheme();
  return (
    <XStack
      backgroundColor={colors.surface}
      borderRadius={radius.sm}
      borderWidth={1}
      borderColor={colors.border}
      padding={space.xs}
      marginBottom={space.xs}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <SquashPressable key={String(opt.value)} onPress={() => onChange(opt.value)} contentStyle={{ flex: 1 }}>
            <YStack
              flex={1}
              paddingVertical={space.sm}
              alignItems="center"
              justifyContent="center"
              borderRadius={radius.sm}
              cursor="pointer"
              backgroundColor={active ? colors.accent : 'transparent'}
            >
              <Text
                color={active ? colors.accentText : colors.muted}
                fontSize={fontSize.sm}
                fontWeight={active ? '600' : '400'}
              >
                {opt.label}
              </Text>
            </YStack>
          </SquashPressable>
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
  zIndex?: number;
  snapPoints?: number[];
  fitContent?: boolean;
  keyboardAware?: boolean;
}

export function SlideUpModal({ visible, onClose, children, zIndex, snapPoints, fitContent, keyboardAware }: SlideUpModalProps) {
  const { colors } = useAppTheme();
  const cappedInset = useCappedKeyboardInset(!!keyboardAware && visible);
  const wasVisibleRef = React.useRef(false);
  React.useEffect(() => { if (visible && !keyboardAware) Keyboard.dismiss(); }, [visible, keyboardAware]);
  React.useEffect(() => {
    if (wasVisibleRef.current && !visible) {
      Keyboard.dismiss();
    }
    wasVisibleRef.current = visible;
  }, [visible]);
  return (
    <Sheet
      modal
      open={visible}
      onOpenChange={(open: boolean) => {
        if (!open) {
          Keyboard.dismiss();
          onClose();
        }
      }}
      animation="medium"
      snapPoints={fitContent ? undefined : (snapPoints ?? [85])}
      snapPointsMode={fitContent ? 'fit' : undefined}
      disableDrag
      zIndex={zIndex ?? 100_000}
      // Tamagui v2 rc: moveOnKeyboardChange often leaves Sheet.Frame vertically offset after
      // the keyboard hides; reopening looks "shifted up". Scroll + dismiss-on-close instead.
      moveOnKeyboardChange={false}
    >
      <Sheet.Overlay
        animation="medium"
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
        backgroundColor="rgba(0,0,0,0.6)"
      />
      <Sheet.Frame backgroundColor={colors.surface}>
        {keyboardAware ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            automaticallyAdjustKeyboardInsets={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: cappedInset }}
          >
            {children}
          </ScrollView>
        ) : (
          children
        )}
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
  onCreateNew?: () => void;
  createNewLabel?: string;
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
  onConfirm?: () => void;
  confirmLabel?: string;
  /** Same as single-select: row at top of sheet to create a new item, then return to this picker. */
  onCreateNew?: () => void;
  createNewLabel?: string;
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

  const onConfirm    = multiSelect ? (props as DropdownSelectMultiProps<T>).onConfirm    : undefined;
  const confirmLabel = multiSelect ? (props as DropdownSelectMultiProps<T>).confirmLabel : undefined;
  const onCreateNew = multiSelect
    ? (props as DropdownSelectMultiProps<T>).onCreateNew
    : (props as DropdownSelectProps<T>).onCreateNew;
  const createNewLabel = multiSelect
    ? (props as DropdownSelectMultiProps<T>).createNewLabel
    : (props as DropdownSelectProps<T>).createNewLabel;

  const { colors, space, radius, fontSize } = useAppTheme();
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
      <SquashPressable onPress={handleOpen} contentStyle={{ alignSelf: 'stretch' }}>
        <XStack
          alignItems="center"
          justifyContent="space-between"
          borderWidth={1}
          borderColor={colors.border}
          borderRadius={radius.md}
          paddingHorizontal={space.md}
          height={48}
          backgroundColor={colors.surface}
          cursor="pointer"
        >
          <Text
            fontSize={fontSize.md}
            fontWeight="400"
            flex={1}
            marginRight={space.sm}
            numberOfLines={1}
            color={triggerHasValue ? colors.primary : colors.muted}
          >
            {triggerLabel}
          </Text>
          <Text color={colors.muted} fontSize={fontSize.lg}>▾</Text>
        </XStack>
      </SquashPressable>

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
        <Sheet.Frame backgroundColor={colors.surface} paddingBottom={insets.bottom}>
          {/* Handle */}
          <YStack alignItems="center" paddingTop={space.sm} paddingBottom={space.xs}>
            <YStack width={36} height={4} borderRadius={2} backgroundColor={colors.border} />
          </YStack>

          {searchable && (
            <YStack paddingHorizontal={space.lg} paddingBottom={space.sm}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search…"
                placeholderTextColor={colors.muted}
                spellCheck={false}
                selectionColor={colors.primary}
                style={{
                  backgroundColor: colors.bg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  paddingHorizontal: space.md,
                  paddingVertical: 10,
                  color: colors.primary,
                  fontSize: fontSize.md,
                  tintColor: colors.primary,
                } as any}
              />
            </YStack>
          )}

          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.value)}
            keyboardShouldPersistTaps="handled"
            ItemSeparatorComponent={() => <Separator borderColor={colors.border} />}
            ListHeaderComponent={onCreateNew ? (() => (
              <YStack>
                <SquashPressable
                  onPress={() => { setOpen(false); onCreateNew!(); }}
                  contentStyle={{ alignSelf: 'stretch' }}
                >
                  <XStack paddingHorizontal={space.xl} paddingVertical={15} cursor="pointer">
                    <Text fontSize={fontSize.md} color={colors.accent} fontWeight="500">
                      {`+ ${createNewLabel ?? 'New'}`}
                    </Text>
                  </XStack>
                </SquashPressable>
                <Separator borderColor={colors.border} />
              </YStack>
            )) as any : undefined}
            renderItem={({ item }) => {
              const active = multiSelect
                ? selValueSet.has(String(item.value))
                : item.value === props.value;
              return (
                <SquashPressable
                  onPress={() => {
                    Keyboard.dismiss();
                    if (multiSelect) { toggleMulti(item.value); }
                    else { (props as DropdownSelectProps<T>).onChange(item.value); setOpen(false); }
                  }}
                  contentStyle={{ alignSelf: 'stretch' }}
                >
                  <XStack
                    alignItems="center"
                    justifyContent="space-between"
                    paddingHorizontal={space.xl}
                    paddingVertical={15}
                    backgroundColor={active ? colors.accentBg : 'transparent'}
                    cursor="pointer"
                  >
                    <Text
                      fontSize={fontSize.md}
                      color={active ? colors.accent : colors.primary}
                      fontWeight={active ? '600' : '400'}
                    >
                      {item.label}
                    </Text>
                    {active && <Text color={colors.accent} fontSize={fontSize.md}>✓</Text>}
                  </XStack>
                </SquashPressable>
              );
            }}
          />

          {multiSelect && (
            <YStack paddingHorizontal={space.lg} paddingVertical={space.md}>
              <SquashPressable onPress={() => { setOpen(false); onConfirm?.(); }} contentStyle={{ alignSelf: 'stretch' }}>
                <XStack
                  backgroundColor={colors.accent}
                  borderRadius={radius.md}
                  paddingVertical={space.md}
                  alignItems="center"
                  justifyContent="center"
                  cursor="pointer"
                >
                  <Text color={colors.accentText} fontSize={fontSize.md} fontWeight="600">{confirmLabel ?? 'Done'}</Text>
                </XStack>
              </SquashPressable>
            </YStack>
          )}
        </Sheet.Frame>
      </Sheet>
    </>
  );
}
