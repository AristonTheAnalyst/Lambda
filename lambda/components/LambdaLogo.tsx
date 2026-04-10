import Svg, { Path } from 'react-native-svg';
import { useAppTheme } from '@/lib/ThemeContext';

interface Props {
  size?: number;
  color?: string;
  /** filled = solid fill + stroke (default), stroke = outline only */
  variant?: 'filled' | 'stroke';
}

const LOGO_PATH = 'M222,521L157.03,330.888,92.86,521.622H6.8L114,206,46,6h86L308,521H222Z';

export default function LambdaLogo({ size = 80, color, variant = 'stroke' }: Props) {
  const { colors } = useAppTheme();
  const strokeColor = color ?? colors.accent;
  const height = Math.round(size * (528 / 314));

  return (
    <Svg width={size} height={height} viewBox="0 0 314 528">
      <Path
        d={LOGO_PATH}
        fill={variant === 'filled' ? strokeColor : 'none'}
        stroke={strokeColor}
        strokeWidth={12.76}
        strokeLinecap="round"
        strokeLinejoin="round"
        fillRule="evenodd"
      />
    </Svg>
  );
}
