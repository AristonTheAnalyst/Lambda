import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import T from '@/constants/Theme';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SelectOption<T = any> {
  label: string;
  value: T;
}

// ─── Segmented Control ────────────────────────────────────────────────────────
// Best for 2–4 fixed options (e.g. reps/duration, weight/distance)

interface SegmentedControlProps<T extends string> {
  options: SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  isDark?: boolean;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  isDark = false,
}: SegmentedControlProps<T>) {
  return (
    <View style={seg.container}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <TouchableOpacity
            key={String(opt.value)}
            style={[seg.item, active && seg.itemActive]}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.7}>
            <Text style={[seg.label, active && seg.labelActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const seg = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 9,
    padding: 3,
    marginBottom: 4,
    backgroundColor: T.surface,
  },
  item: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 7,
  },
  itemActive: {
    backgroundColor: T.accent,
  },
  label: {
    fontSize: 14,
    color: T.muted,
  },
  labelActive: {
    color: T.accentText,
    fontWeight: '600',
  },
});

// ─── Slide-up Modal ───────────────────────────────────────────────────────────
// Overlay fades in independently; content box slides up from bottom

interface SlideUpModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function SlideUpModal({ visible, onClose, children }: SlideUpModalProps) {
  const [mounted, setMounted] = useState(visible);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideY, { toValue: 0, bounciness: 0, speed: 14, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideY, { toValue: 500, duration: 220, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [visible]);

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)', opacity: overlayOpacity }]}
        pointerEvents="none"
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end' }}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <Animated.View style={{ transform: [{ translateY: slideY }] }}>
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Dropdown Select ──────────────────────────────────────────────────────────
// For variable-length lists — shows current value, opens a modal list on tap

interface DropdownSelectProps<T = any> {
  options: SelectOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  placeholder?: string;
  isDark?: boolean;
}

export function DropdownSelect<T = any>({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  isDark = false,
}: DropdownSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  const insets = useSafeAreaInsets();

  return (
    <>
      <TouchableOpacity
        style={drop.trigger}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}>
        <Text style={[drop.triggerText, !selected && { color: T.muted }]} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </Text>
        <Text style={{ color: T.muted, fontSize: 12 }}>▾</Text>
      </TouchableOpacity>

      <SlideUpModal visible={open} onClose={() => setOpen(false)}>
        <View style={[drop.sheet, { paddingBottom: insets.bottom }]}>
          <View style={drop.handle} />
          <FlatList
            data={options}
            keyExtractor={(item) => String(item.value)}
            ItemSeparatorComponent={() => (
              <View style={{ height: 1, backgroundColor: T.border }} />
            )}
            renderItem={({ item }) => {
              const active = item.value === value;
              return (
                <TouchableOpacity
                  style={[drop.row, active && { backgroundColor: T.accentBg }]}
                  onPress={() => { onChange(item.value); setOpen(false); }}
                  activeOpacity={0.6}>
                  <Text style={[drop.rowText, active && { color: T.accent, fontWeight: '600' }]}>
                    {item.label}
                  </Text>
                  {active && <Text style={{ color: T.accent, fontSize: 16 }}>✓</Text>}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </SlideUpModal>
    </>
  );
}

const drop = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 13,
    marginBottom: 4,
    backgroundColor: T.surface,
  },
  triggerText: {
    fontSize: 15,
    flex: 1,
    marginRight: 8,
    color: T.primary,
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '75%',
    backgroundColor: T.surface,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: T.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  rowText: {
    fontSize: 16,
    color: T.primary,
  },
});
