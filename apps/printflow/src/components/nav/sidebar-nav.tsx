import {
  TabList,
  TabSlot,
  TabTrigger,
  Tabs,
  type TabListProps,
  type TabTriggerSlotProps,
} from 'expo-router/ui';
import { forwardRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Palette, Radius, Spacing } from '@/theme/tokens';

import { NAV_ITEMS } from './nav-items';

/**
 * Sidebar navigation for large screens — landscape iPad and desktop web.
 *
 * Built on the headless `expo-router/ui` primitives rather than a native tab
 * bar, because they work identically on both platforms. That is what lets iPad
 * and desktop share one layout instead of being designed twice (plan §5).
 *
 * This is structure only. The split view, sortable tables, and keyboard
 * shortcuts that make large screens genuinely better are task 6.5.
 */
export function SidebarNav() {
  // TabList and TabSlot must be DIRECT children of Tabs -- it discovers the
  // navigator's screens by inspecting them. Wrapping them in a View to get a
  // row layout throws "Couldn't find any screens for the navigator", so the
  // row direction goes on Tabs itself.
  return (
    <Tabs style={styles.root}>
      <TabList asChild>
        <SidebarSurface>
          <View style={styles.brand}>
            <Text style={styles.brandText}>PrintFlow</Text>
          </View>
          {NAV_ITEMS.map((item) => (
            <TabTrigger key={item.name} name={item.name} href={item.href} asChild>
              <SidebarButton>{item.label}</SidebarButton>
            </TabTrigger>
          ))}
        </SidebarSurface>
      </TabList>
      <TabSlot style={styles.content} />
    </Tabs>
  );
}

/**
 * The surface TabList renders into.
 *
 * This must be a component, not an inline <View style={...}>. `asChild` uses
 * cloneElement, and cloneElement's props OVERRIDE the child's — so an inline
 * style is silently discarded and the sidebar inherits TabList's default row
 * layout at full width. Spreading props first and setting style last is what
 * makes our style win.
 */
function SidebarSurface(props: TabListProps) {
  return <View {...props} style={styles.sidebar} />;
}

/**
 * `asChild` clones this element and injects navigation props, so it must
 * forward its ref and spread everything it receives.
 */
const SidebarButton = forwardRef<View, TabTriggerSlotProps>(function SidebarButton(
  { children, isFocused, ...props },
  ref,
) {
  return (
    <Pressable
      ref={ref}
      {...props}
      accessibilityRole="tab"
      accessibilityState={{ selected: !!isFocused }}
      style={({ pressed }) => [
        styles.item,
        isFocused && styles.itemFocused,
        pressed && styles.itemPressed,
      ]}
    >
      <Text style={[styles.itemText, isFocused && styles.itemTextFocused]}>{children}</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: Palette.bg },
  sidebar: {
    width: 220,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.five,
    gap: Spacing.one,
    backgroundColor: Palette.surface,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: Palette.border,
  },
  brand: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five },
  brandText: {
    color: Palette.accent2,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  content: { flex: 1 },
  item: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.sm,
  },
  itemFocused: { backgroundColor: Palette.surface3 },
  itemPressed: { opacity: 0.7 },
  itemText: { color: Palette.text2, fontSize: 15, fontWeight: '600' },
  itemTextFocused: { color: Palette.text },
});
