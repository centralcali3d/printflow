import {
  TabList,
  TabSlot,
  TabTrigger,
  Tabs,
  type TabListProps,
  type TabTriggerSlotProps,
} from 'expo-router/ui';
import { forwardRef } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Palette, Radius, Spacing, LARGE_SCREEN_BREAKPOINT } from '@/theme/tokens';

import { NAV_ITEMS } from './nav-items';
import { SidebarNav } from './sidebar-nav';

/**
 * Navigation on the web.
 *
 * Wide viewports get the same sidebar as iPad; narrow ones get a bottom bar
 * that mirrors the native tabs, so a phone browser behaves the way the app
 * does. `NativeTabs` is iOS-only, hence the separate `.web` implementation.
 */
export default function AppNav() {
  const { width } = useWindowDimensions();

  if (width >= LARGE_SCREEN_BREAKPOINT) {
    return <SidebarNav />;
  }

  return (
    <Tabs style={styles.root}>
      <TabSlot style={styles.content} />
      <TabList asChild>
        <BarSurface>
          {NAV_ITEMS.map((item) => (
            <TabTrigger key={item.name} name={item.name} href={item.href} asChild>
              <BarButton>{item.label}</BarButton>
            </TabTrigger>
          ))}
        </BarSurface>
      </TabList>
    </Tabs>
  );
}

/** See SidebarSurface: cloneElement overrides an inline style, so this must be a component. */
function BarSurface(props: TabListProps) {
  return <View {...props} style={styles.bar} />;
}

const BarButton = forwardRef<View, TabTriggerSlotProps>(function BarButton(
  { children, isFocused, ...props },
  ref,
) {
  return (
    <Pressable
      ref={ref}
      {...props}
      accessibilityRole="tab"
      accessibilityState={{ selected: !!isFocused }}
      style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
    >
      <Text style={[styles.tabText, isFocused && styles.tabTextFocused]}>{children}</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.bg },
  content: { flex: 1 },
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Palette.border,
    backgroundColor: Palette.surface,
    paddingVertical: Spacing.two,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Radius.sm,
  },
  pressed: { opacity: 0.7 },
  tabText: { color: Palette.text3, fontSize: 12, fontWeight: '600' },
  tabTextFocused: { color: Palette.accent2 },
});
