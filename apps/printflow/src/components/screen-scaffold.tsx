import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Palette, Spacing } from '@/theme/tokens';

/**
 * Placeholder screen shell.
 *
 * Every route renders one of these until Stage 3 builds the real screens. It
 * names the stage that replaces it so the skeleton cannot be mistaken for
 * unfinished work — the emptiness is the plan, not a gap.
 */
export function ScreenScaffold({
  title,
  subtitle,
  arrivesIn,
}: {
  title: string;
  subtitle: string;
  arrivesIn: string;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{arrivesIn}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.bg },
  body: { flex: 1, padding: Spacing.five, gap: Spacing.two },
  title: { color: Palette.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.6 },
  subtitle: { color: Palette.text2, fontSize: 15, lineHeight: 22, maxWidth: 460 },
  badge: {
    alignSelf: 'flex-start',
    marginTop: Spacing.three,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.border2,
    backgroundColor: Palette.surface2,
  },
  badgeText: {
    color: Palette.text3,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
