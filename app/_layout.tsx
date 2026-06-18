import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { checkForUpdates } from '../services/updates/UpdateManager';
import { useColorScheme } from '@/components/useColorScheme';

const BACKGROUND_UPDATE_TASK = 'BACKGROUND_UPDATE_TASK';

TaskManager.defineTask(BACKGROUND_UPDATE_TASK, async () => {
  try {
    await checkForUpdates();
  } catch (error) {
    console.error("Background task failed", error);
  }
});

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

import Constants from 'expo-constants';

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    async function registerBackgroundFetch() {
      // Background tasks are only available in standalone development builds or APKs, not in standard Expo Go.
      if (Constants.appOwnership === 'expo') {
        console.log("Running in Expo Go. Background tasks disabled to prevent warnings.");
        return;
      }
      try {
        await BackgroundTask.registerTaskAsync(BACKGROUND_UPDATE_TASK, {
          minimumInterval: 60 * 60 * 12, // 12 hours
        });
        console.log("Background fetch registered");
      } catch (err) {
        console.log("Background fetch failed to register (Likely running in Expo Go). Warning suppressed.", err);
      }
    }
    registerBackgroundFetch();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
