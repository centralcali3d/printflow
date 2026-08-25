import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useWindowDimensions } from 'react-native';

import { Palette, LARGE_SCREEN_BREAKPOINT } from '@/theme/tokens';

import { NAV_ITEMS } from './nav-items';
import { SidebarNav } from './sidebar-nav';

/**
 * Navigation on iOS and iPadOS.
 *
 * A real `UITabBar` on iPhone — native feel is most of the reason to ship an
 * app rather than a web page, and this is where it is cheapest to get. Wide
 * iPads switch to the same sidebar the web build uses.
 */
export default function AppNav() {
  const { width } = useWindowDimensions();

  if (width >= LARGE_SCREEN_BREAKPOINT) {
    return <SidebarNav />;
  }

  return (
    <NativeTabs
      backgroundColor={Palette.surface}
      indicatorColor={Palette.surface3}
      labelStyle={{ selected: { color: Palette.accent2 } }}
    >
      {NAV_ITEMS.map((item) => (
        <NativeTabs.Trigger key={item.name} name={item.name}>
          <NativeTabs.Trigger.Label>{item.label}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={item.sf} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
