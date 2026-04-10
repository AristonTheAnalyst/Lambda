import React, { useState } from 'react';
import { TextInput } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { SlideUpModal } from '@/components/FormControls';
import Button from '@/components/Button';
import { useAppTheme } from '@/lib/ThemeContext';

interface NotesFieldProps {
  label: string;
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  confirmLabel?: string;
  onConfirm?: (value: string) => void;
}

export default function NotesField({ label, value, onChange, placeholder = 'Notes…', confirmLabel = 'Done', onConfirm }: NotesFieldProps) {
  const { colors, space, radius, fontSize } = useAppTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [draft, setDraft] = useState('');

  function open() {
    setDraft(value);
    setModalVisible(true);
  }

  function done() {
    onChange(draft);
    setModalVisible(false);
    onConfirm?.(draft);
  }

  function cancel() {
    setModalVisible(false);
  }

  const labelParts = label.split(/(\([^)]+\))/);
  const labelWithoutParens = labelParts.filter(p => !/^\([^)]+\)$/.test(p)).join('').trim();

  return (
    <>
      <YStack gap={space.xs}>
        <Text color={colors.primary} fontSize={fontSize.sm} fontWeight="600">
          {labelParts.map((part, i) =>
            /^\([^)]+\)$/.test(part)
              ? <Text key={i} fontSize={fontSize.sm} fontWeight="400" color={colors.muted}>{part}</Text>
              : part
          )}
        </Text>
        <XStack
          borderWidth={1}
          borderColor={colors.border}
          borderRadius={radius.md}
          backgroundColor={colors.surface}
          paddingHorizontal={space.md}
          height={48}
          alignItems="center"
          pressStyle={{ opacity: 0.75 }}
          onPress={open}
          cursor="pointer"
        >
          <Text flex={1} color={value ? colors.primary : colors.muted} fontSize={fontSize.md} numberOfLines={1}>
            {value || placeholder}
          </Text>
          <FontAwesome name="pencil" size={13} color={colors.muted} />
        </XStack>
      </YStack>

      <SlideUpModal visible={modalVisible} onClose={cancel}>
        {modalVisible && (
          <YStack
            backgroundColor={colors.surface}
            borderTopLeftRadius={radius.lg}
            borderTopRightRadius={radius.lg}
            padding={space.xl}
            paddingBottom={space.xxl}
            gap={space.md}
          >
            <Text fontSize={fontSize.lg} fontWeight="700" color={colors.primary}>{labelWithoutParens}</Text>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={placeholder}
              placeholderTextColor={colors.muted}
              multiline
              autoFocus
              spellCheck={false}
              selectionColor={colors.primary}
              style={{
                backgroundColor: colors.bg,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.md,
                padding: space.md,
                color: colors.primary,
                fontSize: fontSize.md,
                minHeight: 120,
                textAlignVertical: 'top',
                tintColor: colors.primary,
              } as any}
            />
            <XStack gap={space.sm} justifyContent="center">
              <Button label="Cancel" onPress={cancel} variant="danger-ghost" />
              <Button label={confirmLabel} onPress={done} />
            </XStack>
          </YStack>
        )}
      </SlideUpModal>
    </>
  );
}
