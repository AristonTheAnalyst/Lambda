import { Platform } from 'react-native';
import { Input as TamaguiInput, Text, YStack, styled } from 'tamagui';

// ─── Styled input ─────────────────────────────────────────────────────────────

const StyledInput = styled(TamaguiInput, {
  backgroundColor: '$surface',
  borderWidth: 1,
  borderColor: '$borderColor',
  borderRadius: '$md',
  padding: '$md',
  color: '$color',
  fontSize: '$md',
  placeholderTextColor: '$muted',

  focusStyle: {
    borderColor: '$accent',
    outlineWidth: 0,
  },

  variants: {
    errored: {
      true: { borderColor: '$dangerBorder' },
    },
    isMultiline: {
      true: { minHeight: 96, textAlignVertical: 'top' },
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
  editable = true,
  secureTextEntry,
  autoCapitalize,
  keyboardType,
  autoCorrect,
}: InputProps) {
  return (
    <YStack gap="$xs">
      {label ? <Text color="$color" fontSize="$sm" fontWeight="600">{label}</Text> : null}
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
        errored={!!error}
        isMultiline={multiline}
        isDisabled={!editable}
        keyboardAppearance={Platform.OS === 'ios' ? 'dark' : undefined}
        returnKeyType={Platform.OS === 'ios' ? (multiline ? 'default' : 'done') : undefined}
      />
      {error ? <Text color="$danger" fontSize="$xs">{error}</Text> : null}
    </YStack>
  );
}
