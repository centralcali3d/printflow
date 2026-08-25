import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import AppNav from '@/components/nav/app-nav';
import { SessionProvider } from '@/providers/session-provider';

SplashScreen.preventAutoHideAsync();

/**
 * Root layout.
 *
 * Providers wrap navigation so every screen can reach the session. TanStack
 * Query and the connection-state indicator land in task 0.13; route protection
 * and sign-in in task 3.1.
 */
export default function RootLayout() {
  return (
    <SessionProvider>
      <StatusBar style="light" />
      <AppNav />
    </SessionProvider>
  );
}
