import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

import type { Database } from '@printflow/db-types';

import { Env } from './env';

/**
 * The Supabase client, typed against the generated schema.
 *
 * `Database` comes from `@printflow/db-types`, so `supabase.from('sales')`
 * knows every column and a renamed one is a compile error rather than a
 * runtime surprise — see plan task 0.11 and defect 4.
 */
export const supabase = createClient<Database>(Env.supabaseUrl, Env.supabaseAnonKey, {
  auth: {
    // AsyncStorage on device; on web, supabase-js defaults to localStorage,
    // and handing it AsyncStorage there would break SSR/static rendering.
    ...(Platform.OS === 'web' ? {} : { storage: AsyncStorage }),
    autoRefreshToken: true,
    persistSession: true,
    // Native has no URL to parse a session out of; web needs it for the
    // magic-link callback (task 3.1).
    detectSessionInUrl: Platform.OS === 'web',
  },
});
