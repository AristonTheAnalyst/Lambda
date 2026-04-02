import Svg, { Path } from 'react-native-svg';
import T from '@/constants/Theme';

interface Props {
  size?: number;
  color?: string;
  /** filled = solid fill + stroke (default), stroke = outline only */
  variant?: 'filled' | 'stroke';
}

const LOGO_PATH = 'M222,521L157.03,330.888,92.86,521.622H6.8L114,206,46,6h86L308,521H222Z';

export default function LambdaLogo({ size = 80, color = T.accent, variant = 'stroke' }: Props) {
  // Preserve the 314×528 aspect ratio
  const height = Math.round(size * (528 / 314));

  return (
    <Svg width={size} height={height} viewBox="0 0 314 528">
      <Path
        d={LOGO_PATH}
        fill={variant === 'filled' ? color : 'none'}
        stroke={color}
        strokeWidth={12.76}
        strokeLinecap="round"
        strokeLinejoin="round"
        fillRule="evenodd"
      />
    </Svg>
  );
}
