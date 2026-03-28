import { useEffect, useRef, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

export interface NetworkState {
  isConnected: boolean;
  justReconnected: boolean;
  clearJustReconnected: () => void;
}

export function useNetwork(): NetworkState {
  const [isConnected, setIsConnected] = useState(true);
  const [justReconnected, setJustReconnected] = useState(false);
  const prevConnected = useRef(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = !!state.isConnected;
      if (connected && !prevConnected.current) {
        setJustReconnected(true);
      }
      prevConnected.current = connected;
      setIsConnected(connected);
    });
    return () => unsubscribe();
  }, []);

  return {
    isConnected,
    justReconnected,
    clearJustReconnected: () => setJustReconnected(false),
  };
}
