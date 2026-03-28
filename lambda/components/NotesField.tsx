import React, { useState } from 'react';
import { TextInput } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { SlideUpModal } from '@/components/FormControls';
import Button from '@/components/Button';
import T from '@/constants/Theme';

interface NotesFieldProps {
  label: string;
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  confirmLabel?: string;
  onConfirm?: (value: string) => void;
}

export default function NotesField({ label, value, onChange, placeholder = 'Notes…', confirmLabel = 'Done', onConfirm }: NotesFieldProps) {
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

  // Render label with parenthetical text in muted/lighter style (matches Input.tsx)
  const labelParts = label.split(/(\([^)]+\))/);

  return (
    <>
      <YStack gap={T.space.xs}>
        <Text color={T.primary} fontSize={T.fontSize.sm} fontWeight="600">
          {labelParts.map((part, i) =>
            /^\([^)]+\)$/.test(part)
              ? <Text key={i} fontSize={T.fontSize.sm} fontWeight="400" color={T.muted}>{part}</Text>
              : part
          )}
        </Text>
        <XStack
          borderWidth={1}
          borderColor={T.border}
          borderRadius={T.radius.md}
          backgroundColor={T.surface}
          paddingHorizontal={T.space.md}
          height={48}
          alignItems="center"
          pressStyle={{ opacity: 0.75 }}
          onPress={open}
          cursor="pointer"
        >
          <Text flex={1} color={value ? T.primary : T.muted} fontSize={T.fontSize.md} numberOfLines={1}>
            {value || placeholder}
          </Text>
          <FontAwesome name="pencil" size={13} color={T.muted} />
        </XStack>
      </YStack>

      <SlideUpModal visible={modalVisible} onClose={cancel}>
        <YStack
          backgroundColor={T.surface}
          borderTopLeftRadius={T.radius.lg}
          borderTopRightRadius={T.radius.lg}
          padding={T.space.xl}
          paddingBottom={T.space.xxl}
          gap={T.space.md}
        >
          <Text fontSize={T.fontSize.lg} fontWeight="700" color={T.primary}>{label}</Text>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={placeholder}
            placeholderTextColor={T.muted}
            multiline
            autoFocus
            style={{
              backgroundColor: T.bg,
              borderWidth: 1,
              borderColor: T.border,
              borderRadius: T.radius.md,
              padding: T.space.md,
              color: T.primary,
              fontSize: T.fontSize.md,
              minHeight: 120,
              textAlignVertical: 'top',
            }}
          />
          <XStack gap={T.space.sm} justifyContent="center">
            <Button label="Cancel" onPress={cancel} variant="danger-ghost" />
            <Button label={confirmLabel} onPress={done} />
          </XStack>
        </YStack>
      </SlideUpModal>
    </>
  );
}
