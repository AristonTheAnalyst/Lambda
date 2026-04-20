import React, { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

type Value = {
  props: BottomTabBarProps | null;
  setTabBarProps: (p: BottomTabBarProps) => void;
};

const BottomTabBarPropsContext = createContext<Value | null>(null);

/** Renders nothing; syncs latest tab bar props for a sibling outside <Tabs>. */
export function TabBarPropsSync({ tabBarProps }: { tabBarProps: BottomTabBarProps }) {
  const ctx = useContext(BottomTabBarPropsContext);
  if (!ctx) throw new Error('TabBarPropsSync must be inside BottomTabBarPropsProvider');

  useLayoutEffect(() => {
    ctx.setTabBarProps(tabBarProps);
  });

  return null;
}

function tabBarStateSignature(p: BottomTabBarProps): string {
  const s = p.state;
  const r = s.routes[s.index] as { name?: string; state?: { index?: number; routes?: { name?: string }[] } };
  const nested = r.state;
  const nestedIdx = nested?.index ?? 0;
  const nestedName = nested?.routes?.[nestedIdx]?.name ?? '';
  return `${s.index}:${r.name ?? ''}:${nestedIdx}:${nestedName}`;
}

export function BottomTabBarPropsProvider({ children }: { children: ReactNode }) {
  const [props, setPropsState] = useState<BottomTabBarProps | null>(null);

  const setTabBarProps = useCallback((p: BottomTabBarProps) => {
    setPropsState((prev) => {
      if (prev && tabBarStateSignature(prev) === tabBarStateSignature(p)) return prev;
      return p;
    });
  }, []);

  const value = useMemo(() => ({ props, setTabBarProps }), [props, setTabBarProps]);

  return <BottomTabBarPropsContext.Provider value={value}>{children}</BottomTabBarPropsContext.Provider>;
}

export function useBottomTabBarProps(): BottomTabBarProps | null {
  const ctx = useContext(BottomTabBarPropsContext);
  if (!ctx) throw new Error('useBottomTabBarProps must be inside BottomTabBarPropsProvider');
  return ctx.props;
}
