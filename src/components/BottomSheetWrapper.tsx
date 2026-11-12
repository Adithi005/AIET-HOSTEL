import React from 'react';
import {
  KeyboardAvoidingView,
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KBV_BEHAVIOR } from '../theme/layout';
import { colors } from '../theme/colors';

interface BottomSheetWrapperProps {
  children: React.ReactNode;
  sheetStyle?: StyleProp<ViewStyle>;
  overlayStyle?: StyleProp<ViewStyle>;
  maxHeight?: DimensionValue;
  maxWidth?: number;
  baseBottomPadding?: number;
  keyboardVerticalOffset?: number;
}

/**
 * Shared responsive bottom-sheet container with safe-area bottom inset awareness
 * and cross-platform KeyboardAvoidingView (iOS + Android edge-to-edge).
 */
export const BottomSheetWrapper: React.FC<BottomSheetWrapperProps> = ({
  children,
  sheetStyle,
  overlayStyle,
  maxHeight = '90%',
  maxWidth = 540,
  baseBottomPadding = 20,
  keyboardVerticalOffset = 0,
}) => {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, baseBottomPadding);

  return (
    <KeyboardAvoidingView
      style={[styles.overlay, overlayStyle]}
      behavior={KBV_BEHAVIOR}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <View
        style={[
          styles.sheet,
          sheetStyle,
          {
            maxHeight,
            maxWidth,
            paddingBottom: bottomPad,
          },
        ]}
      >
        {children}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    width: '100%',
    alignSelf: 'center',
    overflow: 'hidden',
  },
});

