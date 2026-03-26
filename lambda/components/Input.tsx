import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleSheet,
  Platform,
} from 'react-native';
import T from '@/constants/Theme';

interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  multiline?: boolean;
  editable?: boolean;
  secureTextEntry?: boolean;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  keyboardType?: TextInputProps['keyboardType'];
  autoCorrect?: boolean;
}

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
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={T.muted}
        editable={editable}
        multiline={multiline}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        autoCorrect={autoCorrect}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardAppearance={Platform.OS === 'ios' ? 'dark' : undefined}
        returnKeyType={Platform.OS === 'ios' ? (multiline ? 'default' : 'done') : undefined}
        style={[
          styles.input,
          multiline && styles.multiline,
          focused && styles.focused,
          !!error && styles.errored,
          !editable && styles.disabled,
        ]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: T.space.xs,
  },
  label: {
    color: T.primary,
    fontSize: T.fontSize.sm,
    fontWeight: '600',
  },
  input: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: T.radius.md,
    padding: T.space.md,
    color: T.primary,
    fontSize: T.fontSize.md,
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  focused: {
    borderColor: T.accent,
  },
  errored: {
    borderColor: T.dangerBorder,
  },
  disabled: {
    opacity: 0.5,
  },
  error: {
    color: T.danger,
    fontSize: T.fontSize.xs,
  },
});
