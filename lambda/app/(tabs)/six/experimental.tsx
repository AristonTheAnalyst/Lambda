import { useRouter } from 'expo-router';
import { ScrollView } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import GlassButton from '@/components/GlassButton';
import T from '@/constants/Theme';
import { useTheme, THEME_PRESETS, THEME_ORDER } from '@/lib/ThemeContext';

export default function ExperimentalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { themeName, setTheme } = useTheme();

  return (
    <YStack flex={1} backgroundColor={T.bg}>
      {/* Header */}
      <YStack paddingTop={insets.top + T.space.sm} paddingBottom={T.space.md} paddingHorizontal={T.space.lg}>
        <XStack alignItems="center" gap={T.space.md}>
          <GlassButton icon="chevron-left" onPress={() => router.back()} />
          <Text fontSize={T.fontSize.xl} fontWeight="700" color={T.primary} flex={1} textAlign="center" marginRight={44}>
            Experimental Features
          </Text>
        </XStack>
      </YStack>

      <ScrollView contentContainerStyle={{ padding: T.space.xl }} showsVerticalScrollIndicator={false}>

        {/* Theme section */}
        <Text fontSize={T.fontSize.sm} fontWeight="600" color={T.muted} marginBottom={T.space.md} letterSpacing={0.8}>
          THEME
        </Text>

        <YStack gap={T.space.sm}>
          {THEME_ORDER.map((name) => {
            const preset = THEME_PRESETS[name];
            const isActive = themeName === name;
            return (
              <XStack
                key={name}
                backgroundColor={isActive ? T.accentBg : T.surface}
                borderWidth={1}
                borderColor={isActive ? T.accent : T.border}
                borderRadius={T.radius.md}
                padding={T.space.md}
                alignItems="center"
                pressStyle={{ opacity: 0.7 }}
                onPress={() => setTheme(name)}
                cursor="pointer"
              >
                {/* Color swatch */}
                <XStack gap={T.space.xs} marginRight={T.space.md}>
                  {(['bg', 'surface', 'accent', 'primary'] as const).map((key) => (
                    <YStack
                      key={key}
                      width={16}
                      height={16}
                      borderRadius={T.radius.sm}
                      backgroundColor={preset.colors[key]}
                      borderWidth={0.5}
                      borderColor={T.border}
                    />
                  ))}
                </XStack>

                <Text flex={1} fontSize={T.fontSize.md} fontWeight="600" color={isActive ? T.accent : T.primary}>
                  {preset.label}
                </Text>

                {isActive && (
                  <FontAwesome name="check" size={14} color={T.accent} />
                )}
              </XStack>
            );
          })}
        </YStack>

      </ScrollView>
    </YStack>
  );
}
