import React, { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export interface TabHeaderState {
  title: string;
  left?: ReactNode;
  right?: ReactNode;
}

const emptyHeader: TabHeaderState = { title: '', left: undefined, right: undefined };

type TabHeaderContextValue = {
  header: TabHeaderState;
  /** Replaces the visible tab header; omit left/right to clear those slots. */
  setTabHeader: (next: TabHeaderState) => void;
};

const TabHeaderContext = createContext<TabHeaderContextValue | null>(null);

export function TabHeaderProvider({ children }: { children: ReactNode }) {
  const [header, setHeaderState] = useState<TabHeaderState>(emptyHeader);

  const setTabHeader = useCallback((next: TabHeaderState) => {
    setHeaderState({
      title: next.title,
      left: next.left,
      right: next.right,
    });
  }, []);

  const value = useMemo(() => ({ header, setTabHeader }), [header, setTabHeader]);

  return <TabHeaderContext.Provider value={value}>{children}</TabHeaderContext.Provider>;
}

export function useTabHeader() {
  const ctx = useContext(TabHeaderContext);
  if (!ctx) throw new Error('useTabHeader must be used within TabHeaderProvider');
  return ctx;
}
