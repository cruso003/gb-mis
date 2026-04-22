/**
 * SACRED: Quick-exit control.
 *
 * MUST be visible on every survivor-facing screen.
 * MUST NOT be disabled, wrapped in a confirmation, or hidden.
 * MUST navigate to a neutral app (calculator) immediately on tap.
 *
 * Any change to this component requires DPO review (CLAUDE.md §5).
 */

import { Linking, Pressable, StyleSheet, Text } from 'react-native';

export function QuickExitButton() {
  const handleQuickExit = () => {
    // Open a neutral system app immediately with no confirmation dialog.
    // Android: opens the dialler app as a safe-looking destination.
    void Linking.openURL('tel:');
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      onPress={handleQuickExit}
      accessibilityLabel="Quick exit"
      accessibilityHint="Immediately leaves this screen and opens a neutral app"
      accessibilityRole="button"
    >
      <Text style={styles.text}>✕ Exit</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 999,
    backgroundColor: '#dc2626',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  pressed: { opacity: 0.85 },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
