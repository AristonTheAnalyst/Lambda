import { createAnimations } from '@tamagui/animations-reanimated'
import { defaultConfig as config } from '@tamagui/config/v4'
import { createTamagui } from 'tamagui'

const animations = createAnimations({
  fast:   { type: 'spring', damping: 20, mass: 1.2, stiffness: 250 },
  medium: { type: 'spring', damping: 10, mass: 0.9, stiffness: 100 },
  slow:   { type: 'spring', damping: 20, mass: 1.5, stiffness: 60  },
})

const tamaguiConfig = createTamagui({ ...config, animations })

export type Conf = typeof tamaguiConfig
declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}

export default tamaguiConfig
