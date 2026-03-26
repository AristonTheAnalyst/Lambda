import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { SlideUpModal } from '@/components/FormControls';
import Button from '@/components/Button';
import T from '@/constants/Theme';

interface DatePickerFieldProps {
  value: string;        // YYYY-MM-DD or ''
  onChangeDate: (date: string) => void;
  placeholder?: string;
  editable?: boolean;
}

function toDate(str: string): Date {
  if (!str) return new Date();
  const d = new Date(str + 'T00:00:00');
  return isNaN(d.getTime()) ? new Date() : d;
}

function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplay(str: string): string {
  if (!str) return '';
  const d = toDate(str);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function DatePickerField({
  value,
  onChangeDate,
  placeholder = 'Select date (optional)',
  editable = true,
}: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);
  // staged value for iOS spinner — only committed on Done
  const [staged, setStaged] = useState<Date>(toDate(value));

  const displayText = value ? formatDisplay(value) : '';

  // ── Android: native dialog, commits immediately ────────────────────────────
  if (Platform.OS === 'android') {
    return (
      <>
        <TouchableOpacity
          style={[styles.trigger, !editable && styles.disabled]}
          onPress={() => editable && setOpen(true)}
          activeOpacity={0.7}>
          <Text style={[styles.triggerText, !displayText && styles.placeholder]}>
            {displayText || placeholder}
          </Text>
        </TouchableOpacity>

        {open && (
          <DateTimePicker
            value={toDate(value)}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={(event: DateTimePickerEvent, date?: Date) => {
              setOpen(false);
              if (event.type === 'set' && date) {
                onChangeDate(toISO(date));
              }
            }}
          />
        )}
      </>
    );
  }

  // ── iOS: spinner inside SlideUpModal ──────────────────────────────────────
  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, !editable && styles.disabled]}
        onPress={() => {
          if (!editable) return;
          setStaged(toDate(value));
          setOpen(true);
        }}
        activeOpacity={0.7}>
        <Text style={[styles.triggerText, !displayText && styles.placeholder]}>
          {displayText || placeholder}
        </Text>
      </TouchableOpacity>

      <SlideUpModal visible={open} onClose={() => setOpen(false)}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <DateTimePicker
            value={staged}
            mode="date"
            display="spinner"
            maximumDate={new Date()}
            textColor={T.primary}
            themeVariant="dark"
            onChange={(_event: DateTimePickerEvent, date?: Date) => {
              if (date) setStaged(date);
            }}
            style={styles.picker}
          />
          <View style={styles.doneBtn}>
            <Button
              label="Done"
              onPress={() => {
                onChangeDate(toISO(staged));
                setOpen(false);
              }}
            />
          </View>
        </View>
      </SlideUpModal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: T.radius.md,
    padding: T.space.md,
  },
  disabled: {
    opacity: 0.5,
  },
  triggerText: {
    color: T.primary,
    fontSize: T.fontSize.md,
  },
  placeholder: {
    color: T.muted,
  },
  sheet: {
    backgroundColor: T.surface,
    borderTopLeftRadius: T.radius.lg,
    borderTopRightRadius: T.radius.lg,
    paddingBottom: T.space.xl,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: T.border,
    alignSelf: 'center',
    marginTop: T.space.sm,
    marginBottom: T.space.xs,
  },
  picker: {
    height: 200,
  },
  doneBtn: {
    paddingHorizontal: T.space.xl,
    marginTop: T.space.sm,
  },
});
