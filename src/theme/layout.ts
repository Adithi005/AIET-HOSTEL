import { Platform } from 'react-native';

/**
 * Cross-platform monospace font that works reliably on iOS ('Menlo'),
 * Android ('monospace'), and Web ('monospace').
 */
export const MONO_FONT = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

/**
 * KeyboardAvoidingView behavior that works with both iOS and
 * Android edge-to-edge (where the window does not auto-resize).
 */
export const KBV_BEHAVIOR = Platform.OS === 'ios' ? ('padding' as const) : ('height' as const);

/**
 * Expanded touch hit slop for compact icon buttons (minimum ~44pt touch feel).
 */
export const ICON_HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;

/**
 * Ensures single-line fixed-height TextInputs center vertically on Android
 * instead of being clipped by default top/bottom font padding.
 */
export const ANDROID_INPUT_FIX = Platform.select({
  android: { paddingVertical: 0, textAlignVertical: 'center' as const },
  default: {},
});

