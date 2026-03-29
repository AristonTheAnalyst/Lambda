import { Platform } from 'react-native';
import { Input as TamaguiInput, Text, YStack, styled } from 'tamagui';
import T from '@/constants/Theme';

// ─── Styled input ─────────────────────────────────────────────────────────────

const StyledInput = styled(TamaguiInput, {
  backgroundColor: T.surface,
  borderWidth: 1,
  borderColor: T.border,
  borderRadius: T.radius.md,
  padding: T.space.md,
  height: 48,
  color: T.primary,
  fontSize: T.fontSize.md,
  fontWeight: '400',
  placeholderTextColor: T.muted,

  focusStyle: {
    borderColor: T.accent,
    outlineWidth: 0,
  },

  variants: {
    errored: {
      true: { borderColor: T.dangerBorder },
    },
    isMultiline: {
      true: { height: undefined, textAlignVertical: 'top' },
    },
    isDisabled: {
      true: { opacity: 0.5 },
    },
  } as const,
});

// ─── Props ────────────────────────────────────────────────────────────────────

interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  multiline?: boolean;
  minHeight?: number;
  editable?: boolean;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'number-pad' | 'decimal-pad' | 'numbers-and-punctuation';
  autoCorrect?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Input({
  value,
  onChangeText,
  placeholder,
  label,
  error,
  multiline = false,
  minHeight = 96,
  editable = true,
  secureTextEntry,
  autoCapitalize,
  keyboardType,
  autoCorrect,
}: InputProps) {
  return (
    <YStack gap={T.space.xs}>
      {label ? (
        <Text color={T.primary} fontSize={T.fontSize.sm} fontWeight="600">
          {label.split(/(\([^)]+\))/).map((part, i) =>
            /^\([^)]+\)$/.test(part)
              ? <Text key={i} fontSize={T.fontSize.sm} fontWeight="400" color={T.muted}>{part}</Text>
              : part
          )}
        </Text>
      ) : null}
      <StyledInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        editable={editable}
        multiline={multiline}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        autoCorrect={autoCorrect}
        spellCheck={false}
        selectionColor={T.primary}
        errored={!!error}
        isMultiline={multiline}
        minHeight={multiline ? minHeight : undefined}
        isDisabled={!editable}
        keyboardAppearance={Platform.OS === 'ios' ? 'dark' : undefined}
        returnKeyType={Platform.OS === 'ios' ? (multiline ? 'default' : 'done') : undefined}
      />
      {error ? <Text color={T.danger} fontSize={T.fontSize.xs}>{error}</Text> : null}
    </YStack>
  );
}
