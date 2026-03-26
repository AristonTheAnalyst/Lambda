import React from 'react';
import { FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Separator,
  Sheet,
  Stack,
  Text,
  XStack,
  YStack,
  styled,
} from 'tamagui';

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

const SegItem = styled(Stack, {
  flex: 1,
  paddingVertical: '$sm',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '$sm',
  cursor: 'pointer',

  variants: {
    active: {
      true:  { backgroundColor: '$accent', pressStyle: { opacity: 0.85 } },
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
      backgroundColor="$surface"
      borderRadius="$sm"
      padding="$xs"
      marginBottom="$xs"
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
              color={active ? '$accentText' : '$muted'}
              fontSize="$sm"
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
      <Sheet.Frame backgroundColor="$surface">
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
}

export function DropdownSelect<T = any>({
  options,
  value,
  onChange,
  placeholder = 'Select…',
}: DropdownSelectProps<T>) {
  const [open, setOpen] = React.useState(false);
  const selected  = options.find((o) => o.value === value);
  const insets    = useSafeAreaInsets();

  return (
    <>
      {/* ── Trigger ── */}
      <XStack
        alignItems="center"
        justifyContent="space-between"
        borderWidth={1}
        borderColor="$borderColor"
        borderRadius="$md"
        paddingHorizontal="$md"
        paddingVertical={13}
        marginBottom="$xs"
        backgroundColor="$surface"
        pressStyle={{ opacity: 0.75 }}
        onPress={() => setOpen(true)}
        cursor="pointer"
      >
        <Text
          fontSize="$md"
          flex={1}
          marginRight="$sm"
          numberOfLines={1}
          color={selected ? '$color' : '$muted'}
        >
          {selected ? selected.label : placeholder}
        </Text>
        <Text color="$muted" fontSize="$xs">▾</Text>
      </XStack>

      {/* ── Sheet ── */}
      <Sheet
        modal
        open={open}
        onOpenChange={(o: boolean) => { if (!o) setOpen(false); }}
        animation="medium"
        snapPoints={[75]}
        disableDrag
        zIndex={100_000}
      >
        <Sheet.Overlay
          animation="lazy"
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
          backgroundColor="rgba(0,0,0,0.6)"
        />
        <Sheet.Frame backgroundColor="$surface" paddingBottom={insets.bottom}>
          {/* Handle */}
          <YStack alignItems="center" paddingTop="$sm" paddingBottom="$xs">
            <YStack width={36} height={4} borderRadius={2} backgroundColor="$borderColor" />
          </YStack>

          <FlatList
            data={options}
            keyExtractor={(item) => String(item.value)}
            ItemSeparatorComponent={() => <Separator borderColor="$borderColor" />}
            renderItem={({ item }) => {
              const active = item.value === value;
              return (
                <XStack
                  alignItems="center"
                  justifyContent="space-between"
                  paddingHorizontal="$xl"
                  paddingVertical={15}
                  backgroundColor={active ? '$accentBg' : 'transparent'}
                  pressStyle={{ opacity: 0.7 }}
                  onPress={() => { onChange(item.value); setOpen(false); }}
                  cursor="pointer"
                >
                  <Text
                    fontSize="$md"
                    color={active ? '$accent' : '$color'}
                    fontWeight={active ? '600' : '400'}
                  >
                    {item.label}
                  </Text>
                  {active && <Text color="$accent" fontSize="$md">✓</Text>}
                </XStack>
              );
            }}
          />
        </Sheet.Frame>
      </Sheet>
    </>
  );
}
