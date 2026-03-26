import { useState } from 'react';
import { Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Sheet, Stack, Text, YStack } from 'tamagui';
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
  return toDate(str).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function DatePickerField({
  value,
  onChangeDate,
  placeholder = 'Select date (optional)',
  editable = true,
}: DatePickerFieldProps) {
  const [open, setOpen]     = useState(false);
  const [staged, setStaged] = useState<Date>(toDate(value));

  const displayText = value ? formatDisplay(value) : '';

  const triggerContent = (
    <Stack
      backgroundColor="$surface"
      borderWidth={1}
      borderColor="$borderColor"
      borderRadius="$md"
      padding="$md"
      opacity={editable ? 1 : 0.5}
      pressStyle={editable ? { opacity: 0.7 } : undefined}
      onPress={editable ? () => { setStaged(toDate(value)); setOpen(true); } : undefined}
      cursor={editable ? 'pointer' : 'default'}
    >
      <Text fontSize="$md" color={displayText ? '$color' : '$muted'}>
        {displayText || placeholder}
      </Text>
    </Stack>
  );

  // ── Android: native dialog ─────────────────────────────────────────────
  if (Platform.OS === 'android') {
    return (
      <>
        {triggerContent}
        {open && (
          <DateTimePicker
            value={toDate(value)}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={(event: DateTimePickerEvent, date?: Date) => {
              setOpen(false);
              if (event.type === 'set' && date) onChangeDate(toISO(date));
            }}
          />
        )}
      </>
    );
  }

  // ── iOS: spinner inside Tamagui Sheet ─────────────────────────────────
  return (
    <>
      {triggerContent}

      <Sheet
        modal
        open={open}
        onOpenChange={(o: boolean) => { if (!o) setOpen(false); }}
        animation="medium"
        snapPoints={[45]}
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
          {/* Handle */}
          <YStack alignItems="center" paddingTop="$sm" paddingBottom="$xs">
            <YStack width={36} height={4} borderRadius={2} backgroundColor="$borderColor" />
          </YStack>

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
            style={{ height: 200 }}
          />

          <YStack paddingHorizontal="$xl" paddingTop="$sm" paddingBottom="$xl">
            <Button
              label="Done"
              onPress={() => { onChangeDate(toISO(staged)); setOpen(false); }}
            />
          </YStack>
        </Sheet.Frame>
      </Sheet>
    </>
  );
}
