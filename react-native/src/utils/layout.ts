import { Platform, StatusBar } from 'react-native';

export interface EdgeInsetsLike {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * Calculates a safe top inset that accounts for Android status bar, cutouts,
 * and punch-hole cameras even when insets.top might report 0.
 */
export function getSafeTopInset(insets: { top: number }, extraPadding = 0): number {
  const androidStatusHeight = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0;
  const base = Math.max(insets.top, androidStatusHeight);
  return base + extraPadding;
}

/**
 * Calculates a safe bottom inset for screens outside tab bars or inside bottom sheet modals,
 * ensuring proper clearance above Android 3-button navigation and gesture pills.
 */
export function getSafeBottomInset(insets: { bottom: number }, fallback = 14): number {
  return insets.bottom > 0 ? insets.bottom : fallback;
}

/**
 * Computes responsive grid metrics for 2-column (phones) or 3-column (foldables/tablets) layouts.
 * Avoids flexWrap percentage floating-point rounding bugs on Android displays.
 */
export function getResponsiveCardLayout(
  windowWidth: number,
  options?: {
    horizontalPadding?: number;
    gap?: number;
    tabletBreakpoint?: number;
  }
) {
  const horizontalPadding = options?.horizontalPadding ?? 14;
  const gap = options?.gap ?? 10;
  const tabletBreakpoint = options?.tabletBreakpoint ?? 640;

  const numColumns = windowWidth >= tabletBreakpoint ? 3 : 2;
  const totalGaps = gap * (numColumns - 1);
  const totalPadding = horizontalPadding * 2;
  const availableWidth = windowWidth - totalPadding - totalGaps;
  const cardWidth = Math.floor(availableWidth / numColumns);

  return {
    numColumns,
    cardWidth,
    horizontalPadding,
    gap,
  };
}
