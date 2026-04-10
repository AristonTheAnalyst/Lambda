import React, { useMemo } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';
import { Text } from 'tamagui';
import { useAppTheme } from '@/lib/ThemeContext';

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
  const { colors, space, radius, fontSize } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrapper: {
          gap: space.xs,
        },
        input: {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderRadius: radius.md,
          paddingHorizontal: space.md,
          paddingVertical: space.md,
          height: 48,
          color: colors.primary,
          fontSize: fontSize.md,
          fontWeight: '400',
          tintColor: colors.primary,
        } as any,
        normal: {
          borderColor: colors.border,
        },
        errored: {
          borderColor: colors.dangerBorder,
        },
        disabled: {
          opacity: 0.5,
        },
      }),
    [colors, space, radius, fontSize],
  );

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text color={colors.primary} fontSize={fontSize.sm} fontWeight="600" marginBottom={space.xs}>
          {label.split(/(\([^)]+\))/).map((part, i) =>
            /^\([^)]+\)$/.test(part)
              ? <Text key={i} fontSize={fontSize.sm} fontWeight="400" color={colors.muted}>{part}</Text>
              : part
          )}
        </Text>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        editable={editable}
        multiline={multiline}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        autoCorrect={autoCorrect ?? false}
        spellCheck={false}
        selectionColor={colors.primary}
        keyboardAppearance={Platform.OS === 'ios' ? 'dark' : undefined}
        returnKeyType={Platform.OS === 'ios' ? (multiline ? 'default' : 'done') : undefined}
        style={[
          styles.input,
          multiline && { height: undefined, minHeight, textAlignVertical: 'top' },
          !editable && styles.disabled,
          error ? styles.errored : styles.normal,
        ]}
      />
      {error ? <Text color={colors.danger} fontSize={fontSize.xs} marginTop={space.xs}>{error}</Text> : null}
    </View>
  );
}
