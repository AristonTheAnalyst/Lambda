import { Spinner, Text, XStack } from 'tamagui';
import { useAppTheme } from '@/lib/ThemeContext';

interface PillProps {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}

/** Red bordered pill — matches Training Session “Cancel” during an active workout. */
export function SessionCancelPill({ label, onPress, disabled, loading }: PillProps & { label?: string }) {
  const { colors, space, fontSize } = useAppTheme();
  return (
    <XStack
      borderRadius={999}
      paddingVertical={4}
      paddingHorizontal={space.sm}
      borderWidth={1}
      borderColor={colors.danger}
      pressStyle={disabled || loading ? undefined : { opacity: 0.7 }}
      onPress={disabled || loading ? undefined : onPress}
      cursor={disabled || loading ? undefined : 'pointer'}
      alignItems="center"
      opacity={disabled ? 0.5 : 1}
    >
      {loading ? (
        <Spinner size="small" color={colors.danger} />
      ) : (
        <Text color={colors.danger} fontSize={fontSize.sm} fontWeight="600" numberOfLines={1}>
          {label ?? 'Cancel'}
        </Text>
      )}
    </XStack>
  );
}

/** Accent bordered pill — matches Training Session “End” / save-style actions. */
export function SessionAccentPill({ label, onPress, disabled, loading }: PillProps & { label: string }) {
  const { colors, space, fontSize } = useAppTheme();
  return (
    <XStack
      borderRadius={999}
      paddingVertical={4}
      paddingHorizontal={space.md}
      borderWidth={1}
      borderColor={colors.accent}
      pressStyle={disabled || loading ? undefined : { opacity: 0.7 }}
      onPress={disabled || loading ? undefined : onPress}
      cursor={disabled || loading ? undefined : 'pointer'}
      alignItems="center"
      opacity={disabled ? 0.5 : 1}
    >
      {loading ? (
        <Spinner size="small" color={colors.accent} />
      ) : (
        <Text color={colors.accent} fontSize={fontSize.sm} fontWeight="600" numberOfLines={1}>
          {label}
        </Text>
      )}
    </XStack>
  );
}
