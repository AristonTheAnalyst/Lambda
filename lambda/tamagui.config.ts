import { createAnimations } from '@tamagui/animations-reanimated'
import { defaultConfig as config } from '@tamagui/config/v4'
import { createTamagui } from 'tamagui'

const animations = createAnimations({
  fast:   { type: 'spring', damping: 20, mass: 1.2, stiffness: 250 },
  medium: { type: 'spring', damping: 10, mass: 0.9, stiffness: 100 },
  slow:   { type: 'spring', damping: 20, mass: 1.5, stiffness: 60  },
})

// monoDark / monoLight mirror Tamagui’s dark & light tokens so defaultTheme={name} always resolves.
const tamaguiConfig = createTamagui({
  ...config,
  animations,
  themes: {
    ...config.themes,
    monoDark: config.themes.dark,
    monoLight: config.themes.light,
  },
})

export type Conf = typeof tamaguiConfig
declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}

export default tamaguiConfig
