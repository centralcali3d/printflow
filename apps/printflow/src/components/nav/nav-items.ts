import type { SFSymbol } from 'sf-symbols-typescript';

/**
 * The five destinations, defined once.
 *
 * Native tabs, the web bottom bar, and the large-screen sidebar all read this,
 * so a route can never appear in one navigator and not another.
 *
 * Order matters and is deliberate (plan §5). Queue and Sell sit second and
 * third because finishing a print and recording a sale are the daily reality of
 * the business — both should be one tap away. The current app opens on
 * Filament, which is an odd front door.
 */
export interface NavItem {
  /** Route file name; '' is the index route. */
  name: string;
  href: '/' | '/queue' | '/sell' | '/stock' | '/more';
  label: string;
  sf: SFSymbol;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { name: 'index', href: '/', label: 'Home', sf: 'house.fill' },
  { name: 'queue', href: '/queue', label: 'Queue', sf: 'printer.fill' },
  { name: 'sell', href: '/sell', label: 'Sell', sf: 'dollarsign.circle.fill' },
  { name: 'stock', href: '/stock', label: 'Stock', sf: 'shippingbox.fill' },
  { name: 'more', href: '/more', label: 'More', sf: 'ellipsis.circle.fill' },
] as const;
