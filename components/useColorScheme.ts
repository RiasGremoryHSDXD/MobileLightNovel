import { useColorScheme as useColorSchemeCore, DeviceEventEmitter } from 'react-native';
import { useEffect, useState } from 'react';
import { getSetting } from '../services/database/Database';

export const useColorScheme = () => {
  const coreScheme = useColorSchemeCore();
  
  // Local state for the override, initialized from DB
  const [appTheme, setAppTheme] = useState(() => {
    try {
      return getSetting('appTheme', 'system');
    } catch {
      return 'system';
    }
  });

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('appThemeChanged', (theme) => {
      setAppTheme(theme);
    });
    return () => subscription.remove();
  }, []);

  if (appTheme === 'dark') return 'dark';
  if (appTheme === 'light') return 'light';
  
  return coreScheme === 'unspecified' ? 'light' : (coreScheme || 'light');
};
