import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';
import { themeLayout } from '@/constants/Theme';

const ratio = themeLayout.keyboardSheetInsetCapRatio;

/**
 * Extra bottom inset while the software keyboard is visible, capped to a fraction
 * of keyboard height (see Theme.keyboardSheetInsetCapRatio). Used by SlideUpModal
 * instead of full KeyboardAvoidingView lift.
 */
export function useCappedKeyboardInset(enabled: boolean): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setInset(0);
      return;
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const subShow = Keyboard.addListener(showEvent, (e) => {
      const h = e.endCoordinates?.height ?? 0;
      setInset(Math.round(h * ratio));
    });
    const subHide = Keyboard.addListener(hideEvent, () => {
      setInset(0);
    });

    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, [enabled]);

  return inset;
}
