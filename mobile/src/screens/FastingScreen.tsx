import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { FastingSession, FastingTotals, UserProfile } from '../../../shared/types';
import * as api from '../lib/api';
import { colors, radius, spacing } from '../lib/theme';
import { useT } from '../i18n/I18nContext';
import { errorText } from '../lib/errorText';

const MS_PER_HOUR = 3600000;

const SCHEDULES = [
  { id: '12-12', label: '12:12', hours: 12, note: 'Overnight rest' },
  { id: '14-10', label: '14:10', hours: 14, note: 'Gentle start' },
  { id: '16-8', label: '16:8', hours: 16, note: 'The classic window' },
  { id: '18-6', label: '18:6', hours: 18, note: 'Tighter window' },
  { id: '20-4', label: '20:4', hours: 20, note: 'Four-hour window' },
  { id: 'omad', label: 'OMAD', hours: 23, note: 'One meal a day' },
];

/** What the body is doing as the hours pass. Approximate, and framed as such. */
const STAGES = [
  { from: 0, title: 'Fed state' },
  { from: 4, title: 'Settling down' },
  { from: 12, title: 'Stores running low' },
  { from: 16, title: 'Fat becomes the main fuel' },
  { from: 18, title: 'Ketones climbing' },
  { from: 24, title: 'Extended fast' },
];

function stageFor(hours: number): string {
  let current = STAGES[0].title;
  for (const s of STAGES) if (hours >= s.from) current = s.title;
  return current;
}

function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}

function formatShort(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function clockTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export const FastingScreen: React.FC<{ user: UserProfile }> = ({ user }) => {
  const t = useT();
  const [active, setActive] = useState<FastingSession | null>(null);
  const [sessions, setSessions] = useState<FastingSession[]>([]);
  const [totals, setTotals] = useState<FastingTotals>({
    sessionCount: 0,
    goalCount: 0,
    totalHours: 0,
    longestHours: 0,
  });
  const [scheduleId, setScheduleId] = useState('16-8');
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ticks once a second while a fast runs. Derived from the stored start time
  // rather than counted up, so backgrounding the app keeps it correct.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  const load = useCallback(async () => {
    try {
      const state = await api.fetchFastingState(user);
      setActive(state.active);
      setSessions(state.sessions);
      setTotals(state.totals);
      if (state.lastSchedule) setScheduleId(state.lastSchedule.scheduleId);
      setError(null);
    } catch (err: any) {
      setError(errorText(err, t, t('Could not load your fasting history.')));
    } finally {
      setIsLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    load();
  }, [load]);

  const schedule = SCHEDULES.find((s) => s.id === scheduleId) || SCHEDULES[2];
  const elapsedMs = active ? Math.max(0, now - active.startedAt) : 0;
  const elapsedHours = elapsedMs / MS_PER_HOUR;
  const targetMs = (active?.targetHours ?? schedule.hours) * MS_PER_HOUR;
  const progress = targetMs > 0 ? Math.min(1, elapsedMs / targetMs) : 0;
  const goalReached = active ? elapsedMs >= targetMs : false;

  const start = async () => {
    setIsBusy(true);
    setError(null);
    try {
      setActive(await api.startFast(user, schedule.id, schedule.hours));
    } catch (err: any) {
      setError(errorText(err, t, t('Could not start the fast.')));
      load();
    } finally {
      setIsBusy(false);
    }
  };

  const stop = async () => {
    setIsBusy(true);
    setError(null);
    try {
      await api.stopFast(user);
      setActive(null);
      await load();
    } catch (err: any) {
      setError(errorText(err, t, t('Could not end the fast.')));
    } finally {
      setIsBusy(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {active ? (
        <View style={styles.timerCard}>
          <Text style={styles.timerLabel}>{goalReached ? t('GOAL REACHED') : t('FASTING')}</Text>
          <Text style={styles.timerValue}>{formatElapsed(elapsedMs)}</Text>
          <Text style={styles.timerSub}>
            {t('of {hours}h', { hours: active.targetHours })} · {Math.round(progress * 100)}%
          </Text>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.round(progress * 100)}%` },
                goalReached && { backgroundColor: colors.primary },
              ]}
            />
          </View>

          <View style={styles.stageBox}>
            <Text style={styles.stageTitle}>{t(stageFor(elapsedHours))}</Text>
            <Text style={styles.stageNote}>
              {t('Approximate. It shifts with your last meal and your activity.')}
            </Text>
          </View>

          <View style={styles.factsRow}>
            <View style={styles.fact}>
              <Text style={styles.factLabel}>{t('STARTED')}</Text>
              <Text style={styles.factValue}>{clockTime(active.startedAt)}</Text>
            </View>
            <View style={styles.fact}>
              <Text style={styles.factLabel}>{t('EAT AT')}</Text>
              <Text style={styles.factValue}>{clockTime(active.startedAt + targetMs)}</Text>
            </View>
            <View style={styles.fact}>
              <Text style={styles.factLabel}>{goalReached ? t('OVER') : t('TO GO')}</Text>
              <Text style={styles.factValue}>
                {formatShort(Math.abs(targetMs - elapsedMs))}
              </Text>
            </View>
          </View>

          <Pressable style={styles.primaryButton} onPress={stop} disabled={isBusy}>
            <Text style={styles.primaryButtonText}>
              {goalReached ? t('End fast and eat') : t('End fast now')}
            </Text>
          </Pressable>

          <Text style={styles.footnote}>
            {t('Water, rooibos, black tea and black coffee are all fine while fasting. If you feel faint, shaky or your heart is racing, eat something now.')}
          </Text>
        </View>
      ) : (
        <View style={styles.timerCard}>
          <Text style={styles.heading}>{t('Choose your window')}</Text>
          <Text style={styles.subheading}>
            {t('New to this? Start at 12:12 or 14:10 for a week before going longer.')}
          </Text>

          <View style={styles.scheduleGrid}>
            {SCHEDULES.map((s) => {
              const selected = s.id === scheduleId;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => setScheduleId(s.id)}
                  style={[styles.scheduleCard, selected && styles.scheduleCardOn]}
                >
                  <Text style={[styles.scheduleLabel, selected && styles.scheduleTextOn]}>
                    {t(s.label)}
                  </Text>
                  <Text style={[styles.scheduleNote, selected && styles.scheduleTextOn]}>
                    {t(s.note)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable style={styles.primaryButton} onPress={start} disabled={isBusy}>
            <Text style={styles.primaryButtonText}>
              {isBusy ? t('Starting…') : t('Start fasting')}
            </Text>
          </Pressable>

          <Text style={styles.footnote}>
            {t('You can eat again at {time}.', { time: clockTime(Date.now() + schedule.hours * MS_PER_HOUR) })}
          </Text>
        </View>
      )}

      <Text style={styles.sectionHeading}>{t('Your progress')}</Text>
      <View style={styles.statsRow}>
        <View style={styles.statTile}>
          <Text style={styles.statValue}>{totals.sessionCount}</Text>
          <Text style={styles.statLabel}>{t('FASTS LOGGED')}</Text>
        </View>
        <View style={styles.statTile}>
          <Text style={styles.statValue}>
            {totals.sessionCount > 0
              ? `${Math.round((totals.goalCount / totals.sessionCount) * 100)}%`
              : '0%'}
          </Text>
          <Text style={styles.statLabel}>{t('TARGET HIT')}</Text>
        </View>
        <View style={styles.statTile}>
          <Text style={styles.statValue}>{Math.round(totals.longestHours * 10) / 10}h</Text>
          <Text style={styles.statLabel}>{t('LONGEST')}</Text>
        </View>
      </View>

      {sessions.length > 0 && (
        <>
          <Text style={styles.sectionHeading}>{t('Recent fasts')}</Text>
          <View style={styles.historyCard}>
            {sessions.slice(0, 8).map((s) => (
              <View key={s.id} style={styles.historyRow}>
                <Text style={styles.historyDuration}>{formatShort(s.durationMs)}</Text>
                <Text style={styles.historyMeta}>
                  {s.reachedGoal ? t('target met') : t('of {hours}h', { hours: s.targetHours })}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      <Text style={styles.disclaimer}>
        {t('A tracker, not medical advice. If you are pregnant, under 18, diabetic, underweight, taking daily medication such as TB treatment or ARVs, or have ever had an eating disorder, speak to a clinic before changing when you eat.')}
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  errorBox: {
    backgroundColor: '#ffe4e6',
    borderColor: '#fecdd3',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: { color: '#9f1239', fontSize: 13, lineHeight: 19 },

  timerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
  },
  timerLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: colors.muted,
  },
  timerValue: {
    fontSize: 44,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
    marginTop: spacing.xs,
  },
  timerSub: { fontSize: 13, color: colors.primary, marginTop: 2 },

  progressTrack: {
    width: '100%',
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    marginTop: spacing.lg,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: radius.pill, backgroundColor: '#6f9159' },

  stageBox: {
    width: '100%',
    backgroundColor: colors.tintSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  stageTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  stageNote: { fontSize: 11, color: colors.muted, marginTop: 2, lineHeight: 16 },

  factsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, width: '100%' },
  fact: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  factLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5, color: colors.muted },
  factValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },

  heading: { fontSize: 18, fontWeight: '700', color: colors.text },
  subheading: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
    textAlign: 'center',
    lineHeight: 17,
  },

  scheduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
    justifyContent: 'center',
  },
  scheduleCard: {
    width: '31%',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  scheduleCardOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  scheduleLabel: { fontSize: 16, fontWeight: '700', color: colors.text },
  scheduleNote: { fontSize: 9, color: colors.muted, marginTop: 2, textAlign: 'center' },
  scheduleTextOn: { color: '#fff' },

  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
    width: '100%',
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  footnote: {
    fontSize: 11,
    color: colors.muted,
    marginTop: spacing.md,
    textAlign: 'center',
    lineHeight: 16,
  },

  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statTile: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  statLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5, color: colors.muted },

  historyCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSoft,
  },
  historyDuration: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  historyMeta: { fontSize: 12, color: colors.muted },

  disclaimer: {
    fontSize: 11,
    color: colors.muted,
    lineHeight: 16,
    marginTop: spacing.xl,
    padding: spacing.md,
    backgroundColor: '#f2e9d6',
    borderRadius: radius.md,
  },
});
