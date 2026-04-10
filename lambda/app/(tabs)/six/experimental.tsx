import { useRouter } from 'expo-router';
import { ScrollView } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import GlassButton from '@/components/GlassButton';
import { useAppTheme, THEME_PRESETS, THEME_ORDER } from '@/lib/ThemeContext';

export default function ExperimentalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { themeName, setTheme, colors, space, radius, fontSize } = useAppTheme();

  return (
    <YStack flex={1} backgroundColor={colors.bg}>
      <YStack paddingTop={insets.top + space.sm} paddingBottom={space.md} paddingHorizontal={space.lg}>
        <XStack alignItems="center" gap={space.md}>
          <GlassButton icon="chevron-left" onPress={() => router.back()} />
          <Text fontSize={fontSize.xl} fontWeight="700" color={colors.primary} flex={1} textAlign="center" marginRight={44}>
            Experimental Features
          </Text>
        </XStack>
      </YStack>

      <ScrollView contentContainerStyle={{ padding: space.xl }} showsVerticalScrollIndicator={false}>

        <Text fontSize={fontSize.sm} fontWeight="600" color={colors.muted} marginBottom={space.md} letterSpacing={0.8}>
          THEME
        </Text>

        <YStack gap={space.sm}>
          {THEME_ORDER.map((name) => {
            const preset = THEME_PRESETS[name];
            const isActive = themeName === name;
            return (
              <XStack
                key={name}
                backgroundColor={isActive ? colors.accentBg : colors.surface}
                borderWidth={1}
                borderColor={isActive ? colors.accent : colors.border}
                borderRadius={radius.md}
                padding={space.md}
                alignItems="center"
                pressStyle={{ opacity: 0.7 }}
                onPress={() => setTheme(name)}
                cursor="pointer"
              >
                <XStack gap={space.xs} marginRight={space.md}>
                  {(['bg', 'surface', 'accent', 'primary'] as const).map((key) => (
                    <YStack
                      key={key}
                      width={16}
                      height={16}
                      borderRadius={radius.sm}
                      backgroundColor={preset.colors[key]}
                      borderWidth={0.5}
                      borderColor={colors.border}
                    />
                  ))}
                </XStack>

                <Text flex={1} fontSize={fontSize.md} fontWeight="600" color={isActive ? colors.accent : colors.primary}>
                  {preset.label}
                </Text>

                {isActive && (
                  <FontAwesome name="check" size={14} color={colors.accent} />
                )}
              </XStack>
            );
          })}
        </YStack>

      </ScrollView>
    </YStack>
  );
}
