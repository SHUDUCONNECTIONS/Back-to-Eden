import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LOCALES } from '../../../shared/i18n/locales';
import { useI18n } from '../i18n/I18nContext';
import { colors, radius, spacing } from '../lib/theme';

/** The eleven languages as tappable chips, each named in itself. */
export function LanguagePicker() {
  const { locale, setLocale } = useI18n();
  return (
    <View style={styles.wrap}>
      {LOCALES.map((l) => {
        const on = l.code === locale;
        return (
          <Pressable
            key={l.code}
            onPress={() => setLocale(l.code)}
            style={[styles.chip, on && styles.chipOn]}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${l.nativeName} (${l.englishName})`}
          >
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{l.nativeName}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.xs + 2,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.text, fontWeight: '600' },
  chipTextOn: { color: '#fff' },
});
