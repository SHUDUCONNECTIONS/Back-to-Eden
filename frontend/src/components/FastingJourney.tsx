import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Timer,
  Play,
  Square,
  Flame,
  Trophy,
  CalendarCheck,
  Hourglass,
  Target,
  Trash2,
  AlertCircle,
  Check,
  Clock,
  Sparkles,
  X,
} from 'lucide-react';
import { FastingSession, FastingTotals, UserProfile } from '../types';
import {
  DEFAULT_SCHEDULE_ID,
  FASTING_SCHEDULES,
  nextStage,
  scheduleById,
  stageForHours,
} from '../data/fastingSchedules';
import {
  MS_PER_HOUR,
  computeStreaks,
  formatClockTime,
  formatDayAndTime,
  formatDurationShort,
  formatElapsed,
  formatHours,
  progressFraction,
  recentDayBars,
  targetEndTime,
  useElapsedMs,
} from '../utils/fasting';
import * as api from '../utils/fastingApi';
import { FastingEducation } from './FastingEducation';
import { useT } from '../i18n/useTranslation';

interface FastingJourneyProps {
  user: UserProfile;
  /** Owned by App so the sidebar can show a live timer from any view. */
  activeFast: FastingSession | null;
  onActiveFastChange: (session: FastingSession | null) => void;
  onNavigate: (sectionId: string) => void;
}

const EMPTY_TOTALS: FastingTotals = {
  sessionCount: 0,
  goalCount: 0,
  totalHours: 0,
  longestHours: 0,
};

/** Backdating options for "when did you last eat". */
const LAST_MEAL_OFFSETS = [0, 1, 2, 3, 4, 6];

// --- Progress ring ---------------------------------------------------------

const RING_RADIUS = 86;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface RingProps {
  fraction: number;
  tone: string;
  complete: boolean;
  children: React.ReactNode;
}

const ProgressRing: React.FC<RingProps> = ({ fraction, tone, complete, children }) => {
  // The marker dot sits at the head of the arc. Angles start at 12 o'clock,
  // hence the -90 degree offset.
  const angle = (-90 + 360 * Math.min(1, fraction)) * (Math.PI / 180);
  const markerX = 100 + RING_RADIUS * Math.cos(angle);
  const markerY = 100 + RING_RADIUS * Math.sin(angle);

  return (
    <div className="relative w-[220px] h-[220px] shrink-0">
      <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
        <circle
          cx="100"
          cy="100"
          r={RING_RADIUS}
          fill="none"
          stroke="#e9dfc8"
          strokeWidth="13"
        />
        <circle
          cx="100"
          cy="100"
          r={RING_RADIUS}
          fill="none"
          stroke={complete ? '#4e6b3e' : tone}
          strokeWidth="13"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={RING_CIRCUMFERENCE * (1 - Math.min(1, fraction))}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
        {fraction > 0.01 && (
          <circle
            cx={markerX}
            cy={markerY}
            r="7"
            fill="#fdfaf3"
            stroke={complete ? '#4e6b3e' : tone}
            strokeWidth="4"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
        {children}
      </div>
    </div>
  );
};

// --- Stat tile -------------------------------------------------------------

const StatTile: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string;
  hint?: string;
}> = ({ icon: Icon, label, value, hint }) => (
  <div className="bg-white rounded-2xl border border-[#e9dfc8] px-4 py-3.5">
    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#627f50]">
      <Icon className="w-3.5 h-3.5" />
      <span className="truncate">{label}</span>
    </div>
    <div className="text-2xl font-bold text-[#2f4026] font-numeric tabular-nums mt-1 leading-none">
      {value}
    </div>
    {hint && <div className="text-[11px] text-[#5a6b4f] mt-1 truncate">{hint}</div>}
  </div>
);

// --- Main view -------------------------------------------------------------

export const FastingJourney: React.FC<FastingJourneyProps> = ({
  user,
  activeFast,
  onActiveFastChange,
  onNavigate,
}) => {
  const t = useT();

  const [sessions, setSessions] = useState<FastingSession[]>([]);
  const [totals, setTotals] = useState<FastingTotals>(EMPTY_TOTALS);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedScheduleId, setSelectedScheduleId] = useState<string>(DEFAULT_SCHEDULE_ID);
  const [customHours, setCustomHours] = useState<number>(16);
  const [lastMealHoursAgo, setLastMealHoursAgo] = useState<number>(0);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  /** The fast that was just ended, so the view can acknowledge it. */
  const [justFinished, setJustFinished] = useState<FastingSession | null>(null);

  const isCustom = selectedScheduleId === 'custom';
  const selectedSchedule = scheduleById(selectedScheduleId);
  const targetHours = isCustom ? customHours : selectedSchedule?.fastHours ?? 16;

  const loadState = useCallback(async () => {
    try {
      const state = await api.fetchFastingState(user);
      setSessions(state.sessions);
      setTotals(state.totals);
      onActiveFastChange(state.active);
      if (state.lastSchedule) {
        setSelectedScheduleId(state.lastSchedule.scheduleId);
        setCustomHours(state.lastSchedule.targetHours);
      }
      setError(null);
    } catch (err: any) {
      setError(err?.message || t('Could not load your fasting history.'));
    } finally {
      setIsLoading(false);
    }
    // onActiveFastChange is a stable callback from App; t changes with locale but
    // only affects the fallback message, so neither belongs in the dep list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  // --- Live clock ---
  // Driven off the start timestamp rather than a counter, so closing the tab,
  // sleeping the phone or reloading the page all keep the correct elapsed time.
  const elapsedMs = useElapsedMs(activeFast?.startedAt ?? null);
  const activeTargetHours = activeFast?.targetHours ?? 0;
  const fraction = activeFast ? progressFraction(elapsedMs, activeTargetHours) : 0;
  const elapsedHours = elapsedMs / MS_PER_HOUR;
  const goalReached = Boolean(activeFast) && elapsedHours >= activeTargetHours;
  const remainingMs = activeFast
    ? targetEndTime(activeFast.startedAt, activeTargetHours) - (activeFast.startedAt + elapsedMs)
    : 0;

  const stage = stageForHours(elapsedHours);
  const upcoming = nextStage(elapsedHours);

  const streaks = useMemo(() => computeStreaks(sessions), [sessions]);
  const dayBars = useMemo(() => recentDayBars(sessions, 14), [sessions]);
  const goalRate =
    totals.sessionCount > 0 ? Math.round((totals.goalCount / totals.sessionCount) * 100) : 0;

  const plannedStartedAt = Date.now() - lastMealHoursAgo * MS_PER_HOUR;
  const plannedEnd = plannedStartedAt + targetHours * MS_PER_HOUR;

  const handleStart = async () => {
    setIsBusy(true);
    setError(null);
    setJustFinished(null);
    try {
      const session = await api.startFast(
        user,
        isCustom ? 'custom' : selectedScheduleId,
        targetHours,
        lastMealHoursAgo > 0 ? plannedStartedAt : undefined,
      );
      onActiveFastChange(session);
      setLastMealHoursAgo(0);
    } catch (err: any) {
      setError(err?.message || t('Could not start the fast.'));
      // A 409 means a fast is already running somewhere - another tab, another
      // device. Reloading shows it instead of leaving a stale empty panel.
      loadState();
    } finally {
      setIsBusy(false);
    }
  };

  const handleStop = async () => {
    setIsBusy(true);
    setError(null);
    try {
      const finished = await api.stopFast(user);
      onActiveFastChange(null);
      setJustFinished(finished);
      await loadState();
    } catch (err: any) {
      setError(err?.message || t('Could not end the fast.'));
    } finally {
      setIsBusy(false);
    }
  };

  const handleDiscard = async () => {
    setIsBusy(true);
    setError(null);
    try {
      await api.discardFast(user);
      onActiveFastChange(null);
      await loadState();
    } catch (err: any) {
      setError(err?.message || t('Could not discard the fast.'));
    } finally {
      setIsBusy(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    setSessions((list) => list.filter((s) => s.id !== sessionId));
    setConfirmDeleteId(null);
    try {
      await api.deleteFastingSession(user, sessionId);
      await loadState();
    } catch (err: any) {
      setError(err?.message || t('Could not delete that record.'));
      await loadState();
    }
  };

  return (
    <section id="fasting" className="py-10 px-4 sm:px-8 bg-[#f7eedd] border-b border-[#ece2cc]">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Heading */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#eef3e3] border border-[#d4dfc6] text-[10px] font-bold uppercase tracking-wider text-[#4e6b3e] mb-2">
              <Timer className="w-3 h-3" />
              {t('Fasting Journey')}
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#2f4026] leading-tight">
              {t('Rest your body between meals')}
            </h2>
            <p className="text-sm text-[#4e6b3e] max-w-xl mt-1.5">
              {t(
                'Pick a window, start the timer, and build the habit one day at a time. Fasting costs nothing and needs nothing you do not already have.',
              )}
            </p>
          </div>

          {streaks.current > 0 && (
            <div className="flex items-center gap-2.5 bg-white rounded-2xl border border-[#e9dfc8] px-4 py-3 shrink-0">
              <Flame className="w-5 h-5 text-[#b4642e]" />
              <div>
                <div className="text-xl font-bold text-[#2f4026] font-numeric tabular-nums leading-none">
                  {streaks.current}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#627f50]">
                  {t('day streak')}
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p className="text-xs text-rose-800 flex-1">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-rose-500 hover:text-rose-700 cursor-pointer"
              aria-label={t('Dismiss')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Just-finished acknowledgement */}
        {justFinished && !activeFast && (
          <div className="flex items-start gap-3 rounded-2xl bg-[#eef3e3] border border-[#d4dfc6] px-4 py-3.5">
            <Sparkles className="w-5 h-5 text-[#4e6b3e] shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-[#2f4026]">
                {justFinished.reachedGoal
                  ? t('Fast complete. You reached your target.')
                  : t('Fast recorded. Ending early still counts as information.')}
              </div>
              <div className="text-xs text-[#4e6b3e] mt-0.5">
                {formatDurationShort(justFinished.durationMs)} {t('fasted')} ·{' '}
                {t('target was')} {formatHours(justFinished.targetHours)} ·{' '}
                {t('break it gently, something small first')}
              </div>
            </div>
            <button
              onClick={() => setJustFinished(null)}
              className="text-[#627f50] hover:text-[#2f4026] cursor-pointer"
              aria-label={t('Dismiss')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* --- Timer / starter card --- */}
        <div className="bg-[#fdfaf3] rounded-3xl border border-[#e9dfc8] p-5 sm:p-7">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 rounded-full border-[3px] border-[#e9dfc8] border-t-[#4e6b3e] animate-spin" />
            </div>
          ) : activeFast ? (
            // ---------- Running fast ----------
            <div className="flex flex-col lg:flex-row items-center gap-7">
              <ProgressRing fraction={fraction} tone={stage.tone} complete={goalReached}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#627f50]">
                  {goalReached ? t('Goal reached') : t('Fasting')}
                </div>
                <div className="text-[28px] font-bold text-[#2f4026] font-numeric tabular-nums leading-tight mt-0.5">
                  {formatElapsed(elapsedMs)}
                </div>
                <div className="text-xs text-[#4e6b3e] font-numeric tabular-nums">
                  {t('of')} {formatHours(activeTargetHours)} · {Math.round(fraction * 100)}%
                </div>
              </ProgressRing>

              <div className="flex-1 min-w-0 w-full space-y-4">
                {/* Current metabolic stage */}
                <div
                  className="rounded-2xl border px-4 py-3.5"
                  style={{ borderColor: `${stage.tone}55`, backgroundColor: `${stage.tone}14` }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: stage.tone }}
                    />
                    <div className="text-sm font-bold text-[#2f4026]">{t(stage.title)}</div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#627f50] font-numeric tabular-nums ml-auto shrink-0">
                      {Math.floor(elapsedHours)}h+
                    </span>
                  </div>
                  <p className="text-[13px] leading-relaxed text-[#3e5531] mt-1.5">
                    {t(stage.body)}
                  </p>
                  {upcoming && (
                    <p className="text-[11px] text-[#5a6b4f] mt-2 pt-2 border-t border-dashed border-[#d4dfc6]">
                      {t('Next')}: <span className="font-semibold">{t(upcoming.title)}</span>{' '}
                      {t('in')}{' '}
                      <span className="font-numeric tabular-nums">
                        {formatDurationShort((upcoming.fromHours - elapsedHours) * MS_PER_HOUR)}
                      </span>
                    </p>
                  )}
                </div>

                {/* Window facts */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-white rounded-xl border border-[#e9dfc8] px-3 py-2.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#627f50]">
                      {t('Started')}
                    </div>
                    <div className="text-sm font-bold text-[#2f4026] font-numeric tabular-nums">
                      {formatClockTime(activeFast.startedAt)}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-[#e9dfc8] px-3 py-2.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#627f50]">
                      {t('Eat at')}
                    </div>
                    <div className="text-sm font-bold text-[#2f4026] font-numeric tabular-nums">
                      {formatClockTime(targetEndTime(activeFast.startedAt, activeTargetHours))}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-[#e9dfc8] px-3 py-2.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#627f50]">
                      {goalReached ? t('Over target') : t('To go')}
                    </div>
                    <div className="text-sm font-bold text-[#2f4026] font-numeric tabular-nums">
                      {formatDurationShort(Math.abs(remainingMs))}
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={handleStop}
                    disabled={isBusy}
                    className="flex-1 min-w-[180px] flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#4e6b3e] text-white text-sm font-bold hover:bg-[#3e5531] disabled:opacity-60 transition-colors cursor-pointer"
                  >
                    <Square className="w-4 h-4" />
                    {goalReached ? t('End fast and eat') : t('End fast now')}
                  </button>
                  <button
                    onClick={handleDiscard}
                    disabled={isBusy}
                    className="px-4 py-3.5 rounded-xl bg-white border border-[#e9dfc8] text-[#7a4e32] text-xs font-semibold hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 disabled:opacity-60 transition-colors cursor-pointer"
                    title={t('Remove this fast without saving it')}
                  >
                    {t('Started by mistake')}
                  </button>
                </div>

                <p className="text-[11px] text-[#5a6b4f]">
                  {t(
                    'Water, rooibos, black tea and black coffee are all fine while fasting. If you feel faint, shaky or your heart is racing, eat something now.',
                  )}
                </p>
              </div>
            </div>
          ) : (
            // ---------- No fast running: the starter ----------
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-[#2f4026]">{t('Choose your window')}</h3>
                <p className="text-xs text-[#5a6b4f] mt-0.5">
                  {t('New to this? Start at 12:12 or 14:10 for a week before going longer.')}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {FASTING_SCHEDULES.map((schedule) => {
                  const isSelected = selectedScheduleId === schedule.id;
                  return (
                    <button
                      key={schedule.id}
                      onClick={() => setSelectedScheduleId(schedule.id)}
                      className={`text-left rounded-2xl border p-3.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#4e6b3e] border-[#4e6b3e] text-white shadow-sm'
                          : 'bg-white border-[#e9dfc8] hover:border-[#4e6b3e]/40 hover:bg-[#faf6ec]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-lg font-bold font-numeric tabular-nums ${
                            isSelected ? 'text-white' : 'text-[#2f4026]'
                          }`}
                        >
                          {schedule.label}
                        </span>
                        {isSelected && <Check className="w-4 h-4 shrink-0" />}
                      </div>
                      <div
                        className={`text-[11px] font-semibold mt-0.5 ${
                          isSelected ? 'text-white/90' : 'text-[#4e6b3e]'
                        }`}
                      >
                        {t(schedule.name)}
                      </div>
                      <div
                        className={`text-[10px] font-bold uppercase tracking-wider mt-2 ${
                          isSelected
                            ? 'text-white/70'
                            : schedule.level === 'advanced'
                              ? 'text-[#b4642e]'
                              : 'text-[#627f50]'
                        }`}
                      >
                        {schedule.level === 'gentle'
                          ? t('Gentle')
                          : schedule.level === 'common'
                            ? t('Most common')
                            : t('Advanced')}
                      </div>
                    </button>
                  );
                })}

                {/* Custom window */}
                <button
                  onClick={() => setSelectedScheduleId('custom')}
                  className={`text-left rounded-2xl border p-3.5 transition-all cursor-pointer ${
                    isCustom
                      ? 'bg-[#4e6b3e] border-[#4e6b3e] text-white shadow-sm'
                      : 'bg-white border-dashed border-[#d4dfc6] hover:border-[#4e6b3e]/40 hover:bg-[#faf6ec]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-lg font-bold font-numeric tabular-nums ${
                        isCustom ? 'text-white' : 'text-[#2f4026]'
                      }`}
                    >
                      {isCustom ? `${customHours}h` : t('Custom')}
                    </span>
                    {isCustom && <Check className="w-4 h-4 shrink-0" />}
                  </div>
                  <div
                    className={`text-[11px] font-semibold mt-0.5 ${
                      isCustom ? 'text-white/90' : 'text-[#4e6b3e]'
                    }`}
                  >
                    {t('Your own target')}
                  </div>
                  <div
                    className={`text-[10px] font-bold uppercase tracking-wider mt-2 ${
                      isCustom ? 'text-white/70' : 'text-[#627f50]'
                    }`}
                  >
                    {t('4 to 48 hours')}
                  </div>
                </button>
              </div>

              {/* Selected schedule explanation */}
              {selectedSchedule && !isCustom && (
                <div className="rounded-2xl bg-[#eef3e3] border border-[#d4dfc6] px-4 py-3">
                  <p className="text-[13px] leading-relaxed text-[#3e5531]">
                    <span className="font-bold">
                      {selectedSchedule.label} — {t(selectedSchedule.name)}.
                    </span>{' '}
                    {t(selectedSchedule.blurb)}
                  </p>
                </div>
              )}

              {isCustom && (
                <div className="rounded-2xl bg-[#eef3e3] border border-[#d4dfc6] px-4 py-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <label
                      htmlFor="custom-hours"
                      className="text-xs font-bold text-[#2f4026] uppercase tracking-wider"
                    >
                      {t('Fasting target')}
                    </label>
                    <span className="text-lg font-bold text-[#2f4026] font-numeric tabular-nums">
                      {customHours}h
                    </span>
                  </div>
                  <input
                    id="custom-hours"
                    type="range"
                    min={4}
                    max={48}
                    step={0.5}
                    value={customHours}
                    onChange={(e) => setCustomHours(Number(e.target.value))}
                    className="w-full accent-[#4e6b3e] cursor-pointer"
                  />
                  {customHours > 24 && (
                    <p className="text-[11px] text-[#7a4e32] font-medium mt-2">
                      {t(
                        'Over 24 hours is an extended fast. Do these rarely, and talk to a clinic first if you take any daily medication.',
                      )}
                    </p>
                  )}
                </div>
              )}

              {/* Last meal backdating */}
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#2f4026] uppercase tracking-wider mb-2">
                  <Clock className="w-3.5 h-3.5 text-[#4e6b3e]" />
                  {t('When did you last eat?')}
                </div>
                <div className="flex flex-wrap gap-2">
                  {LAST_MEAL_OFFSETS.map((hours) => (
                    <button
                      key={hours}
                      onClick={() => setLastMealHoursAgo(hours)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer font-numeric tabular-nums ${
                        lastMealHoursAgo === hours
                          ? 'bg-[#3e5531] border-[#3e5531] text-white'
                          : 'bg-white border-[#e9dfc8] text-[#3e5531] hover:bg-[#eef3e3]'
                      }`}
                    >
                      {hours === 0 ? t('Just now') : `${hours}h ${t('ago')}`}
                    </button>
                  ))}
                </div>
                {lastMealHoursAgo > 0 && (
                  <p className="text-[11px] text-[#5a6b4f] mt-2 font-numeric tabular-nums">
                    {t('Timer will start from')} {formatClockTime(plannedStartedAt)} —{' '}
                    {formatDurationShort(lastMealHoursAgo * MS_PER_HOUR)} {t('already counted')}
                  </p>
                )}
              </div>

              {/* Start */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                <button
                  onClick={handleStart}
                  disabled={isBusy}
                  className="flex-1 flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-[#4e6b3e] text-white text-base font-bold hover:bg-[#3e5531] disabled:opacity-60 transition-colors cursor-pointer shadow-sm"
                >
                  <Play className="w-5 h-5" />
                  {isBusy ? t('Starting…') : t('Start fasting')}
                </button>
                <div className="text-center sm:text-left sm:min-w-[160px]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#627f50]">
                    {t('You can eat again at')}
                  </div>
                  <div className="text-lg font-bold text-[#2f4026] font-numeric tabular-nums leading-tight">
                    {formatClockTime(plannedEnd)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* --- Progress --- */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-[#2f4026]">{t('Your progress')}</h3>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatTile
              icon={Flame}
              label={t('Current streak')}
              value={String(streaks.current)}
              hint={streaks.current === 0 ? t('Start today') : t('days in a row')}
            />
            <StatTile
              icon={Trophy}
              label={t('Best streak')}
              value={String(streaks.best)}
              hint={t('days')}
            />
            <StatTile
              icon={CalendarCheck}
              label={t('Fasts logged')}
              value={String(totals.sessionCount)}
              hint={t('all time')}
            />
            <StatTile
              icon={Target}
              label={t('Target hit')}
              value={`${goalRate}%`}
              hint={`${totals.goalCount} ${t('of')} ${totals.sessionCount}`}
            />
            <StatTile
              icon={Hourglass}
              label={t('Longest fast')}
              value={formatHours(totals.longestHours)}
              hint={`${formatHours(totals.totalHours)} ${t('in total')}`}
            />
          </div>

          {/* 14-day consistency strip */}
          <div className="bg-white rounded-2xl border border-[#e9dfc8] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#627f50]">
                {t('Last 14 days')}
              </div>
              <div className="flex items-center gap-3 text-[10px] text-[#5a6b4f]">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#4e6b3e]" />
                  {t('target met')}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#a8b89a]" />
                  {t('fasted')}
                </span>
              </div>
            </div>

            <div className="flex items-end justify-between gap-1 sm:gap-1.5 h-24">
              {dayBars.map((bar) => {
                // Bars are scaled against 24 hours so a 16h fast and a 20h fast
                // are visibly different rather than both hitting the ceiling.
                const heightPct = Math.min(100, (bar.hours / 24) * 100);
                return (
                  <div
                    key={bar.key}
                    className="flex-1 flex flex-col items-center justify-end h-full gap-1 group relative"
                    title={
                      bar.hours > 0
                        ? `${formatHours(bar.hours)} ${t('fasted')}`
                        : t('nothing recorded')
                    }
                  >
                    <div className="w-full flex-1 flex items-end">
                      {bar.hours > 0 ? (
                        <div
                          className={`w-full rounded-t-md transition-all ${
                            bar.reachedGoal ? 'bg-[#4e6b3e]' : 'bg-[#a8b89a]'
                          }`}
                          style={{ height: `${Math.max(8, heightPct)}%` }}
                        />
                      ) : (
                        <div className="w-full h-1.5 rounded-full bg-[#ece2cc]" />
                      )}
                    </div>
                    <div
                      className={`text-[9px] font-numeric tabular-nums ${
                        bar.isToday ? 'font-bold text-[#2f4026]' : 'text-[#8a9a7c]'
                      }`}
                    >
                      {new Date(bar.ts).getDate()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* --- History --- */}
        {sessions.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-[#2f4026]">{t('Recent fasts')}</h3>
            <div className="bg-white rounded-2xl border border-[#e9dfc8] divide-y divide-[#f0e8d6] overflow-hidden">
              {sessions.slice(0, 12).map((session) => {
                const label =
                  session.scheduleId === 'custom'
                    ? `${formatHours(session.targetHours)} ${t('target')}`
                    : scheduleById(session.scheduleId)?.label || session.scheduleId;

                return (
                  <div key={session.id} className="flex items-center gap-3 px-4 py-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        session.reachedGoal
                          ? 'bg-[#eef3e3] text-[#4e6b3e]'
                          : 'bg-[#f2e9d6] text-[#8a9a7c]'
                      }`}
                    >
                      {session.reachedGoal ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Timer className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-[#2f4026] font-numeric tabular-nums">
                        {formatDurationShort(session.durationMs)}
                        <span className="text-[11px] font-semibold text-[#627f50] ml-2">
                          {label}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#5a6b4f] truncate">
                        {formatDayAndTime(session.startedAt)} → {formatClockTime(session.endedAt!)}
                      </div>
                    </div>

                    {confirmDeleteId === session.id ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleDeleteSession(session.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-[11px] font-bold hover:bg-rose-700 cursor-pointer"
                        >
                          {t('Delete')}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#f2e9d6] text-[#3e5531] text-[11px] font-bold hover:bg-[#e9dfc8] cursor-pointer"
                        >
                          {t('Keep')}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(session.id)}
                        className="p-2 rounded-lg text-[#a8b89a] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                        aria-label={t('Delete this record')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* --- Learn --- */}
        <FastingEducation onNavigate={onNavigate} />
      </div>
    </section>
  );
};
