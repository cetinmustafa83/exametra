'use client';

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  CalendarCheck,
  TrendingUp,
  FileText,
  BookOpen,
  Loader2,
  AlertCircle,
  Clock,
  Plus,
  Pencil,
  Trash2,
  Bell,
  CheckCircle2,
  Repeat,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addWeeks,
  isSameDay,
  isSameMonth,
  isToday as isDateToday,
  parseISO,
  addMonths,
  addDays as dateAddDays,
  differenceInCalendarDays,
  isWithinInterval,
  setHours,
  setMinutes,
} from 'date-fns';
import { de as deLocale, enUS as enLocale } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import {
  fetchCalendarEvents,
  type CalendarEvent,
  type CalendarEventType,
  createCalendarEventItem,
  updateCalendarEventItem,
  deleteCalendarEventItem,
  type CalendarEventItemType,
  type RecurrencePattern,
  fetchClasses,
  fetchSubjects,
  type ClassGroup,
  type Subject,
} from '@/lib/api';
import { toast } from 'sonner';

/* ── Event type visual config ─────────────────────────────────────── */

type TypeConfig = {
  icon: React.ElementType;
  labelKey: string;
  chipBg: string;
  chipText: string;
  dotClass: string;
  ringClass: string;
};

const TYPE_CONFIG: Record<CalendarEventType, TypeConfig> = {
  assessment: {
    icon: ClipboardCheck,
    labelKey: 'calendar.event_types.assessment',
    chipBg: 'bg-amber-100 dark:bg-amber-900/30',
    chipText: 'text-amber-700 dark:text-amber-300',
    dotClass: 'bg-amber-500',
    ringClass: 'ring-amber-300 dark:ring-amber-700',
  },
  attendance: {
    icon: CalendarCheck,
    labelKey: 'calendar.event_types.attendance',
    chipBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    chipText: 'text-emerald-700 dark:text-emerald-300',
    dotClass: 'bg-emerald-500',
    ringClass: 'ring-emerald-300 dark:ring-emerald-700',
  },
  progress: {
    icon: TrendingUp,
    labelKey: 'calendar.event_types.progress',
    chipBg: 'bg-teal-100 dark:bg-teal-900/30',
    chipText: 'text-teal-700 dark:text-teal-300',
    dotClass: 'bg-teal-500',
    ringClass: 'ring-teal-300 dark:ring-teal-700',
  },
  report: {
    icon: FileText,
    labelKey: 'calendar.event_types.report',
    chipBg: 'bg-violet-100 dark:bg-violet-900/30',
    chipText: 'text-violet-700 dark:text-violet-300',
    dotClass: 'bg-violet-500',
    ringClass: 'ring-violet-300 dark:ring-violet-700',
  },
  lesson: {
    icon: BookOpen,
    labelKey: 'calendar.event_types.lesson',
    chipBg: 'bg-rose-100 dark:bg-rose-900/30',
    chipText: 'text-rose-700 dark:text-rose-300',
    dotClass: 'bg-rose-500',
    ringClass: 'ring-rose-300 dark:ring-rose-700',
  },
};

/* Custom event type visual config */
const CUSTOM_TYPE_CONFIG: Record<CalendarEventItemType, { icon: React.ElementType; labelKey: string; chipBg: string; chipText: string; dotClass: string }> = {
  assessment: {
    icon: ClipboardCheck,
    labelKey: 'calendar.event_types.assessment',
    chipBg: 'bg-amber-100 dark:bg-amber-900/30',
    chipText: 'text-amber-700 dark:text-amber-300',
    dotClass: 'bg-amber-500',
  },
  lesson: {
    icon: BookOpen,
    labelKey: 'calendar.event_types.lesson',
    chipBg: 'bg-rose-100 dark:bg-rose-900/30',
    chipText: 'text-rose-700 dark:text-rose-300',
    dotClass: 'bg-rose-500',
  },
  reminder: {
    icon: Bell,
    labelKey: 'calendar.reminder',
    chipBg: 'bg-sky-100 dark:bg-sky-900/30',
    chipText: 'text-sky-700 dark:text-sky-300',
    dotClass: 'bg-sky-500',
  },
};

const ALL_TYPES: CalendarEventType[] = ['assessment', 'attendance', 'progress', 'report', 'lesson'];

/* ── helpers ──────────────────────────────────────────────────────── */

function getMonthLabel(date: Date, locale: 'de' | 'en'): string {
  const localeObj = locale === 'de' ? deLocale : enLocale;
  return format(date, 'MMMM yyyy', { locale: localeObj });
}

function getWeekLabel(date: Date, locale: 'de' | 'en'): string {
  const localeObj = locale === 'de' ? deLocale : enLocale;
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = endOfWeek(date, { weekStartsOn: 1 });
  return `${format(start, 'd. MMM', { locale: localeObj })} – ${format(end, 'd. MMM yyyy', { locale: localeObj })}`;
}

function getWeekdayLabels(locale: 'de' | 'en'): string[] {
  const localeObj = locale === 'de' ? deLocale : enLocale;
  const base = startOfWeek(new Date(), { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) =>
    format(dateAddDays(base, i), 'EEEEEE', { locale: localeObj })
  );
}

function getWeekdayFullLabels(locale: 'de' | 'en'): string[] {
  const localeObj = locale === 'de' ? deLocale : enLocale;
  const base = startOfWeek(new Date(), { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) =>
    format(dateAddDays(base, i), 'EEE', { locale: localeObj })
  );
}

function buildMonthGrid(monthDate: Date): Date[] {
  const start = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });
  const days: Date[] = [];
  let cursor = start;
  while (cursor <= end) {
    days.push(cursor);
    cursor = dateAddDays(cursor, 1);
  }
  return days;
}

function buildWeekGrid(weekDate: Date): Date[] {
  const start = startOfWeek(weekDate, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => dateAddDays(start, i));
}

function formatDayLong(date: Date, locale: 'de' | 'en'): string {
  const localeObj = locale === 'de' ? deLocale : enLocale;
  return format(date, 'EEEE, d. MMMM yyyy', { locale: localeObj });
}

/* ── Event Form Data ──────────────────────────────────────────────── */

interface EventFormData {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  eventType: CalendarEventItemType;
  subjectId: string;
  classGroupId: string;
  notes: string;
  allDay: boolean;
  recurrenceType: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurrenceInterval: number;
  recurrenceEndType: 'never' | 'on_date';
  recurrenceEndDate: string;
  recurrenceDaysOfWeek: number[];
  editMode: 'series' | 'instance';
}

const EMPTY_FORM: EventFormData = {
  title: '',
  date: format(new Date(), 'yyyy-MM-dd'),
  startTime: '08:00',
  endTime: '09:00',
  eventType: 'reminder',
  subjectId: '',
  classGroupId: '',
  notes: '',
  allDay: false,
  recurrenceType: 'none',
  recurrenceInterval: 1,
  recurrenceEndType: 'never',
  recurrenceEndDate: '',
  recurrenceDaysOfWeek: [],
  editMode: 'instance',
};

/* ── Sub-components ───────────────────────────────────────────────── */

function EventDetailContent({ event, onEdit, onDelete }: { event: CalendarEvent; onEdit?: () => void; onDelete?: () => void }) {
  const cfg = TYPE_CONFIG[event.type];
  const Icon = cfg.icon;
  const meta = event.meta as Record<string, unknown>;
  const isCustomEvent = meta.customEvent === true;

  const rows: Array<{ key: string; value: string | number | null | undefined }> = [];
  if (typeof meta.subject === 'string' && meta.subject) rows.push({ key: 'calendar.meta.subject', value: meta.subject });
  if (typeof meta.classGroup === 'string' && meta.classGroup) rows.push({ key: 'calendar.meta.class', value: meta.classGroup });
  if (typeof meta.assessmentType === 'string' && meta.assessmentType) rows.push({ key: 'calendar.meta.type', value: meta.assessmentType });
  if (typeof meta.period === 'string' && meta.period) rows.push({ key: 'calendar.meta.period', value: meta.period });
  if (typeof meta.status === 'string' && meta.status) rows.push({ key: 'calendar.meta.status', value: meta.status });
  if (typeof meta.studentName === 'string' && meta.studentName) rows.push({ key: 'calendar.meta.student', value: meta.studentName });
  if (typeof meta.weight === 'number') rows.push({ key: 'calendar.meta.weight', value: meta.weight });
  if (typeof meta.maxScore === 'number') rows.push({ key: 'calendar.meta.max_score', value: meta.maxScore });
  if (typeof meta.includesGrades === 'boolean') rows.push({ key: 'calendar.meta.includes_grades', value: meta.includesGrades ? 'Ja' : 'Nein' });
  if (typeof meta.count === 'number') rows.push({ key: 'calendar.meta.count', value: meta.count });

  // Custom event specific fields
  if (isCustomEvent) {
    if (typeof meta.eventType === 'string') rows.push({ key: 'calendar.event_type', value: meta.eventType as string });
    if (typeof meta.startTime === 'string' && meta.startTime) rows.push({ key: 'calendar.start_time', value: meta.startTime as string });
    if (typeof meta.endTime === 'string' && meta.endTime) rows.push({ key: 'calendar.end_time', value: meta.endTime as string });
    if (typeof meta.allDay === 'boolean' && meta.allDay) rows.push({ key: 'calendar.all_day', value: 'Ja' });
    if (typeof meta.notes === 'string' && meta.notes) rows.push({ key: 'calendar.notes', value: meta.notes as string });
  }

  // Attendance rates
  if (typeof meta.rate === 'number') rows.push({ key: 'calendar.meta.rate', value: `${meta.rate}%` });
  if (typeof meta.present === 'number') rows.push({ key: 'calendar.meta.present', value: meta.present });
  if (typeof meta.absent === 'number') rows.push({ key: 'calendar.meta.absent', value: meta.absent });
  if (typeof meta.excused === 'number') rows.push({ key: 'calendar.meta.excused', value: meta.excused });
  if (typeof meta.late === 'number') rows.push({ key: 'calendar.meta.late', value: meta.late });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${cfg.chipBg} ${cfg.chipText} shrink-0`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-tight truncate">
            {event.title}
          </p>
          <p className={`text-xs ${cfg.chipText} font-medium`}>
            {t(cfg.labelKey)}
          </p>
        </div>
      </div>
      {rows.length > 0 && (
        <dl className="grid grid-cols-1 gap-1 pt-1 border-t border-gray-100 dark:border-gray-800">
          {rows.map((row, idx) => (
            <div key={idx} className="flex justify-between gap-3 text-xs">
              <dt className="text-gray-500 dark:text-gray-400">{t(row.key)}</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100 text-right">
                {String(row.value)}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {event.type === 'progress' && Array.isArray(meta.classGroups) && meta.classGroups.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {(meta.classGroups as string[]).map((g) => (
            <Badge key={g} variant="outline" className="bg-teal-50/60 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 border-teal-200/60 dark:border-teal-900/30 text-[10px]">
              {g}
            </Badge>
          ))}
        </div>
      )}
      {isCustomEvent && (onEdit || onDelete) && (
        <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          {onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit} className="flex-1 border-emerald-200/60 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 min-h-[44px]">
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              {t('calendar.edit_event')}
            </Button>
          )}
          {onDelete && (
            <Button variant="outline" size="sm" onClick={onDelete} className="border-red-200/60 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 min-h-[44px]">
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              {t('action.delete')}
            </Button>
          )}
        </div>
      )}
      {/* Recurring indicator */}
      {isCustomEvent && typeof meta.recurrencePattern === 'string' && meta.recurrencePattern && (
        <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100 dark:border-gray-800">
          <Repeat className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{t('calendar.recurring')}</span>
        </div>
      )}
    </div>
  );
}

/* ── Mini Calendar Widget ─────────────────────────────────────────── */

function MiniCalendar({
  monthDate,
  eventsByDay,
  onDateSelect,
  onMonthChange,
  localeCode,
}: {
  monthDate: Date;
  eventsByDay: Map<string, CalendarEvent[]>;
  onDateSelect: (date: Date) => void;
  onMonthChange: (date: Date) => void;
  localeCode: 'de' | 'en';
}) {
  const today = new Date();
  const days = useMemo(() => buildMonthGrid(monthDate), [monthDate]);
  const weekdayLabels = useMemo(() => getWeekdayLabels(localeCode), [localeCode]);

  return (
    <Card className="border-emerald-100/60 dark:border-emerald-900/30 shadow-sm">
      <CardHeader className="p-3 pb-1">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMonthChange(addMonths(monthDate, -1))}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 capitalize">
            {getMonthLabel(monthDate, localeCode)}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMonthChange(addMonths(monthDate, 1))}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-1">
        <div className="grid grid-cols-7 mb-1">
          {weekdayLabels.map((label) => (
            <div key={label} className="text-center text-[9px] font-semibold uppercase tracking-wider text-emerald-700/70 dark:text-emerald-400/60 py-0.5">
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {days.map((day, idx) => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDay.get(dayKey) ?? [];
            const inMonth = isSameMonth(day, monthDate);
            const isToday = isDateToday(day);

            return (
              <button
                key={idx}
                type="button"
                onClick={() => onDateSelect(day)}
                className={`relative flex items-center justify-center h-6 w-full rounded text-[10px] font-medium transition-colors ${
                  isToday
                    ? 'bg-emerald-500 text-white'
                    : inMonth
                    ? 'text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                    : 'text-gray-300 dark:text-gray-600'
                }`}
              >
                {format(day, 'd')}
                {dayEvents.length > 0 && inMonth && !isToday && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500" />
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Week View ────────────────────────────────────────────────────── */

function WeekView({
  weekDate,
  events,
  eventsByDay,
  onEventClick,
  onDayHeaderClick,
  onPrevWeek,
  onNextWeek,
  localeCode,
}: {
  weekDate: Date;
  events: CalendarEvent[];
  eventsByDay: Map<string, CalendarEvent[]>;
  onEventClick: (event: CalendarEvent) => void;
  onDayHeaderClick: (day: Date) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  localeCode: 'de' | 'en';
}) {
  const days = useMemo(() => buildWeekGrid(weekDate), [weekDate]);
  const weekdayLabels = useMemo(() => getWeekdayFullLabels(localeCode), [localeCode]);
  const hours = useMemo(() => Array.from({ length: 11 }, (_, i) => i + 7), []); // 7am - 5pm

  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to 8am on mount
  useEffect(() => {
    if (scrollRef.current) {
      const hourHeight = 48;
      scrollRef.current.scrollTop = hourHeight * 1; // 8am
    }
  }, []);

  return (
    <Card className="overflow-hidden border-emerald-100/60 dark:border-emerald-900/30 shadow-sm">
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPrevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 capitalize">
              {getWeekLabel(weekDate, localeCode)}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex">
          {/* Time gutter */}
          <div className="w-12 shrink-0 border-r border-gray-100 dark:border-gray-800">
            <div className="h-10 border-b border-gray-100 dark:border-gray-800" />
            {hours.map((hour) => (
              <div key={hour} className="h-12 flex items-start justify-end pr-1 pt-0.5">
                <span className="text-[9px] text-gray-400 dark:text-gray-500 font-medium">
                  {String(hour).padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div className="flex-1 overflow-x-auto">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-800">
              {days.map((day, idx) => {
                const isToday = isDateToday(day);
                const dayKey = format(day, 'yyyy-MM-dd');
                const dayEvents = eventsByDay.get(dayKey) ?? [];

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onDayHeaderClick(day)}
                    className="flex flex-col items-center justify-center h-10 border-r border-gray-100 dark:border-gray-800 last:border-r-0 hover:bg-emerald-50/60 dark:hover:bg-emerald-900/10 transition-colors cursor-pointer"
                  >
                    <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {weekdayLabels[idx]}
                    </span>
                    <span className={`text-xs font-bold ${isToday ? 'flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white' : 'text-gray-900 dark:text-gray-100'}`}>
                      {format(day, 'd')}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[8px] text-gray-400 dark:text-gray-500">{dayEvents.length}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Time grid */}
            <div ref={scrollRef} className="overflow-y-auto max-h-[480px]">
              <div className="grid grid-cols-7">
                {days.map((day, idx) => {
                  const dayKey = format(day, 'yyyy-MM-dd');
                  const dayEvents = eventsByDay.get(dayKey) ?? [];

                  return (
                    <div key={idx} className="border-r border-gray-100 dark:border-gray-800 last:border-r-0 relative">
                      {hours.map((hour) => (
                        <div key={hour} className="h-12 border-b border-gray-50 dark:border-gray-800/50 relative" />
                      ))}
                      {/* Place events in their time slots */}
                      {dayEvents.map((ev) => {
                        const meta = ev.meta as Record<string, unknown>;
                        const cfg = TYPE_CONFIG[ev.type];
                        const Icon = cfg.icon;

                        // Calculate position based on start time
                        let topOffset = 0;
                        let eventHeight = 44;
                        const startTime = typeof meta.startTime === 'string' ? meta.startTime : null;
                        const endTime = typeof meta.endTime === 'string' ? meta.endTime : null;

                        if (startTime) {
                          const [startH, startM] = startTime.split(':').map(Number);
                          const startMinutes = startH * 60 + startM;
                          const gridStartMinutes = 7 * 60; // 7am
                          topOffset = Math.max(0, ((startMinutes - gridStartMinutes) / 60) * 48);

                          if (endTime) {
                            const [endH, endM] = endTime.split(':').map(Number);
                            const endMinutes = endH * 60 + endM;
                            const duration = Math.max(15, endMinutes - startMinutes);
                            eventHeight = Math.max(20, (duration / 60) * 48);
                          }
                        } else {
                          // All-day or no time, place at top
                          topOffset = 4;
                          eventHeight = 28;
                        }

                        return (
                          <button
                            key={`${ev.type}-${ev.id}`}
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                            className={`absolute left-0.5 right-0.5 ${cfg.chipBg} ${cfg.chipText} rounded px-1 py-0.5 text-left hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-1 ${cfg.ringClass} z-10 overflow-hidden`}
                            style={{ top: `${topOffset}px`, height: `${eventHeight}px` }}
                          >
                            <div className="flex items-center gap-0.5">
                              <Icon className="h-2.5 w-2.5 shrink-0" />
                              <span className="text-[9px] font-medium leading-tight truncate">
                                {ev.title}
                              </span>
                            </div>
                            {startTime && (
                              <span className="text-[8px] opacity-70">{startTime}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {events.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-1 py-8 text-center">
            <CalendarIcon className="h-8 w-8 text-emerald-300/60 dark:text-emerald-700/50 mb-1" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('calendar.no_events')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Main component ───────────────────────────────────────────────── */

export default function CalendarView() {
  const currentUser = useAppStore((s) => s.currentUser);
  const locale = useAppStore((s) => s.locale);
  const localeCode = (locale === 'en' ? 'en' : 'de') as 'de' | 'en';

  // Month state
  const [monthDate, setMonthDate] = useState<Date>(() => startOfMonth(new Date()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // View mode
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [weekDate, setWeekDate] = useState<Date>(() => new Date());

  // Selected day (opens sheet)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  // Selected event (opens detail dialog)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Event form dialog
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [formData, setFormData] = useState<EventFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteConfirmEvent, setDeleteConfirmEvent] = useState<CalendarEvent | null>(null);
  // Edit mode dialog for recurring events
  const [showEditModeDialog, setShowEditModeDialog] = useState(false);
  const [pendingEditEvent, setPendingEditEvent] = useState<CalendarEvent | null>(null);

  // Classes and subjects for form
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // Detect mobile
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 768px)');
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  // Fetch events when month or school changes
  const monthKey = useMemo(() => format(monthDate, 'yyyy-MM'), [monthDate]);

  const loadEvents = useCallback(async () => {
    if (!currentUser?.schoolId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchCalendarEvents(currentUser.schoolId, monthKey);
      setEvents(res.events ?? []);
    } catch (err) {
      console.error('Calendar fetch failed:', err);
      setError(t('calendar.error'));
      toast.error(t('calendar.error'));
    } finally {
      setLoading(false);
    }
  }, [currentUser?.schoolId, monthKey]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Load classes and subjects for form
  useEffect(() => {
    async function load() {
      try {
        const [cls, subjs] = await Promise.all([
          fetchClasses(currentUser?.schoolId ?? undefined),
          fetchSubjects(currentUser?.schoolId ?? undefined),
        ]);
        setClasses(cls);
        setSubjects(subjs);
      } catch {
        // ignore
      }
    }
    if (currentUser?.schoolId) load();
  }, [currentUser?.schoolId]);

  // Group events by YYYY-MM-DD
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    }
    return map;
  }, [events]);

  // Upcoming events
  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekEnd = dateAddDays(today, 7);
    return events
      .filter((e) => {
        const d = parseISO(e.date);
        return (d >= today || isSameDay(d, today)) && d <= weekEnd;
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5);
  }, [events]);

  // Build month grid
  const days = useMemo(() => buildMonthGrid(monthDate), [monthDate]);
  const weekdayLabels = useMemo(() => getWeekdayLabels(localeCode), [localeCode]);

  const handlePrev = useCallback(() => {
    if (viewMode === 'month') setMonthDate((d) => addMonths(d, -1));
    else setWeekDate((d) => addWeeks(d, -1));
  }, [viewMode]);
  const handleNext = useCallback(() => {
    if (viewMode === 'month') setMonthDate((d) => addMonths(d, 1));
    else setWeekDate((d) => addWeeks(d, 1));
  }, [viewMode]);
  const handleToday = useCallback(() => {
    if (viewMode === 'month') setMonthDate(startOfMonth(new Date()));
    else setWeekDate(new Date());
  }, [viewMode]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) return [];
    const key = format(selectedDay, 'yyyy-MM-dd');
    return eventsByDay.get(key) ?? [];
  }, [selectedDay, eventsByDay]);

  // Event form handlers
  const handleNewEvent = useCallback((date?: string) => {
    setEditingEvent(null);
    setFormData({
      ...EMPTY_FORM,
      date: date ?? format(new Date(), 'yyyy-MM-dd'),
    });
    setShowEventForm(true);
  }, []);

  const handleEditEvent = useCallback((event: CalendarEvent) => {
    const meta = event.meta as Record<string, unknown>;
    const isRecurring = typeof meta.recurrencePattern === 'string' && meta.recurrencePattern;
    const isChild = typeof meta.parentEventId === 'string' && meta.parentEventId;

    if (isRecurring || isChild) {
      setPendingEditEvent(event);
      setShowEditModeDialog(true);
      return;
    }

    setEditingEvent(event);
    setFormData({
      title: event.title,
      date: event.date,
      startTime: (typeof meta.startTime === 'string' && meta.startTime) ? meta.startTime : '08:00',
      endTime: (typeof meta.endTime === 'string' && meta.endTime) ? meta.endTime : '09:00',
      eventType: (typeof meta.eventType === 'string' ? meta.eventType : 'reminder') as CalendarEventItemType,
      subjectId: '',
      classGroupId: '',
      notes: (typeof meta.notes === 'string' && meta.notes) ? meta.notes : '',
      allDay: typeof meta.allDay === 'boolean' ? meta.allDay : false,
      recurrenceType: 'none',
      recurrenceInterval: 1,
      recurrenceEndType: 'never',
      recurrenceEndDate: '',
      recurrenceDaysOfWeek: [],
      editMode: 'instance',
    });
    setShowEventForm(true);
    setSelectedEvent(null);
  }, []);

  const handleEditEventWithMode = useCallback((event: CalendarEvent, mode: 'series' | 'instance') => {
    const meta = event.meta as Record<string, unknown>;
    let parsedRecurrence: RecurrencePattern | null = null;
    if (typeof meta.recurrencePattern === 'string' && meta.recurrencePattern) {
      try { parsedRecurrence = JSON.parse(meta.recurrencePattern as string); } catch { /* ignore */ }
    }

    setEditingEvent(event);
    setFormData({
      title: event.title,
      date: event.date,
      startTime: (typeof meta.startTime === 'string' && meta.startTime) ? meta.startTime : '08:00',
      endTime: (typeof meta.endTime === 'string' && meta.endTime) ? meta.endTime : '09:00',
      eventType: (typeof meta.eventType === 'string' ? meta.eventType : 'reminder') as CalendarEventItemType,
      subjectId: '',
      classGroupId: '',
      notes: (typeof meta.notes === 'string' && meta.notes) ? meta.notes : '',
      allDay: typeof meta.allDay === 'boolean' ? meta.allDay : false,
      recurrenceType: parsedRecurrence?.type ?? 'none',
      recurrenceInterval: parsedRecurrence?.interval ?? 1,
      recurrenceEndType: parsedRecurrence?.endDate ? 'on_date' : 'never',
      recurrenceEndDate: parsedRecurrence?.endDate ?? '',
      recurrenceDaysOfWeek: parsedRecurrence?.daysOfWeek ?? [],
      editMode: mode,
    });
    setShowEventForm(true);
    setSelectedEvent(null);
    setShowEditModeDialog(false);
    setPendingEditEvent(null);
  }, []);

  const handleDeleteEvent = useCallback(async () => {
    if (!deleteConfirmEvent) return;
    try {
      await deleteCalendarEventItem(deleteConfirmEvent.id);
      toast.success(t('calendar.event_deleted'));
      loadEvents();
    } catch {
      toast.error(t('calendar.event_delete_error'));
    }
    setDeleteConfirmEvent(null);
    setSelectedEvent(null);
  }, [deleteConfirmEvent, loadEvents]);

  const handleSaveEvent = useCallback(async () => {
    if (!currentUser?.schoolId || !formData.title.trim()) return;
    setSaving(true);
    try {
      const recurrencePattern: RecurrencePattern | null = formData.recurrenceType !== 'none'
        ? {
            type: formData.recurrenceType,
            interval: formData.recurrenceInterval,
            ...(formData.recurrenceEndType === 'on_date' && formData.recurrenceEndDate
              ? { endDate: formData.recurrenceEndDate }
              : {}),
            ...(formData.recurrenceType === 'weekly' && formData.recurrenceDaysOfWeek.length > 0
              ? { daysOfWeek: formData.recurrenceDaysOfWeek }
              : {}),
          }
        : null;

      const recurrenceEnd = formData.recurrenceEndType === 'on_date' && formData.recurrenceEndDate
        ? formData.recurrenceEndDate
        : null;

      if (editingEvent) {
        await updateCalendarEventItem(editingEvent.id, {
          title: formData.title,
          date: formData.date,
          startTime: formData.allDay ? null : formData.startTime,
          endTime: formData.allDay ? null : formData.endTime,
          eventType: formData.eventType,
          subjectId: formData.subjectId || null,
          classGroupId: formData.classGroupId || null,
          notes: formData.notes || null,
          allDay: formData.allDay,
          recurrencePattern,
          recurrenceEnd,
          editMode: formData.editMode,
        });
        toast.success(t('calendar.event_updated'));
      } else {
        await createCalendarEventItem({
          schoolId: currentUser.schoolId,
          title: formData.title,
          date: formData.date,
          startTime: formData.allDay ? null : formData.startTime,
          endTime: formData.allDay ? null : formData.endTime,
          eventType: formData.eventType,
          subjectId: formData.subjectId || null,
          classGroupId: formData.classGroupId || null,
          notes: formData.notes || null,
          allDay: formData.allDay,
          recurrencePattern,
          recurrenceEnd,
        });
        toast.success(t('calendar.event_created'));
      }
      setShowEventForm(false);
      setEditingEvent(null);
      loadEvents();
    } catch {
      toast.error(editingEvent ? t('calendar.event_update_error') : t('calendar.event_create_error'));
    } finally {
      setSaving(false);
    }
  }, [currentUser?.schoolId, formData, editingEvent, loadEvents]);

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-300/40 dark:shadow-emerald-900/40 shrink-0">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
              {t('calendar.title')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('calendar.subtitle')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View mode toggle */}
          <div className="flex items-center rounded-lg border border-emerald-200/60 dark:border-emerald-900/30 bg-white dark:bg-gray-800/50 p-0.5">
            <Button
              variant={viewMode === 'month' ? 'default' : 'ghost'}
              size="sm"
              className={viewMode === 'month' ? 'bg-emerald-500 hover:bg-emerald-600 text-white h-7 text-xs' : 'h-7 text-xs text-gray-600 dark:text-gray-300'}
              onClick={() => setViewMode('month')}
            >
              {t('calendar.month_view')}
            </Button>
            <Button
              variant={viewMode === 'week' ? 'default' : 'ghost'}
              size="sm"
              className={viewMode === 'week' ? 'bg-emerald-500 hover:bg-emerald-600 text-white h-7 text-xs' : 'h-7 text-xs text-gray-600 dark:text-gray-300'}
              onClick={() => setViewMode('week')}
            >
              {t('calendar.week_view')}
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="border-emerald-200/60 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
          >
            <CalendarIcon className="h-4 w-4 mr-1.5" />
            {t('calendar.today')}
          </Button>
          <div className="flex items-center gap-1 rounded-lg border border-emerald-200/60 dark:border-emerald-900/30 bg-white dark:bg-gray-800/50 p-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-gray-600 dark:text-gray-300"
              onClick={handlePrev}
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 min-w-[140px] text-center text-sm font-semibold text-gray-900 dark:text-gray-100 capitalize">
              {viewMode === 'month' ? getMonthLabel(monthDate, localeCode) : getWeekLabel(weekDate, localeCode)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-gray-600 dark:text-gray-300"
              onClick={handleNext}
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {/* New Event button */}
          <Button
            size="sm"
            onClick={() => handleNewEvent()}
            className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm min-h-[44px]"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            {t('calendar.new_event')}
          </Button>
        </div>
      </motion.div>

      {/* Legend */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-50/60 to-teal-50/40 dark:from-emerald-950/20 dark:to-teal-950/10 border border-emerald-100/60 dark:border-emerald-900/30"
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700/70 dark:text-emerald-400/60 mr-1">
          {t('calendar.legend')}:
        </span>
        {ALL_TYPES.map((type) => {
          const cfg = TYPE_CONFIG[type];
          const Icon = cfg.icon;
          return (
            <Badge
              key={type}
              variant="outline"
              className={`gap-1 ${cfg.chipBg} ${cfg.chipText} border-transparent opacity-80 cursor-default select-none`}
            >
              <Icon className="h-3 w-3" />
              <span className="text-[11px] font-medium">{t(cfg.labelKey)}</span>
            </Badge>
          );
        })}
        {/* Reminder type */}
        <Badge
          variant="outline"
          className="gap-1 bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-transparent opacity-80 cursor-default select-none"
        >
          <Bell className="h-3 w-3" />
          <span className="text-[11px] font-medium">{t('calendar.reminder')}</span>
        </Badge>
      </motion.div>

      {/* Main content area - sidebar + calendar */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar with mini calendar */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="w-full lg:w-64 shrink-0 space-y-4"
        >
          <MiniCalendar
            monthDate={monthDate}
            eventsByDay={eventsByDay}
            onDateSelect={(date) => {
              setMonthDate(startOfMonth(date));
              setWeekDate(date);
              if (eventsByDay.get(format(date, 'yyyy-MM-dd'))?.length) {
                setSelectedDay(date);
              }
            }}
            onMonthChange={(date) => setMonthDate(date)}
            localeCode={localeCode}
          />

          {/* Upcoming this week */}
          <Card className="border-emerald-100/60 dark:border-emerald-900/30 shadow-sm">
            <CardHeader className="pb-2 p-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                {t('calendar.upcoming_week')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              {upcomingEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-4 text-center">
                  <Clock className="h-6 w-6 text-emerald-300/60 dark:text-emerald-700/50 mb-1" />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('calendar.no_upcoming')}
                  </p>
                </div>
              ) : (
                <ul className="space-y-1.5">
                  <AnimatePresence>
                    {upcomingEvents.map((ev, idx) => {
                      const cfg = TYPE_CONFIG[ev.type];
                      const Icon = cfg.icon;
                      const evDate = parseISO(ev.date);
                      const relativeDays = differenceInCalendarDays(evDate, new Date());
                      const relativeLabel =
                        relativeDays === 0
                          ? localeCode === 'de' ? 'Heute' : 'Today'
                          : relativeDays === 1
                          ? localeCode === 'de' ? 'Morgen' : 'Tomorrow'
                          : format(evDate, 'EEE, d. MMM', {
                              locale: localeCode === 'de' ? deLocale : enLocale,
                            });
                      return (
                        <motion.li
                          key={`${ev.type}-${ev.id}`}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: idx * 0.04 }}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedEvent(ev)}
                            className="w-full text-left flex items-center gap-2 p-1.5 rounded-lg hover:bg-emerald-50/60 dark:hover:bg-emerald-900/10 transition-colors group"
                          >
                            <div className={`flex items-center justify-center w-7 h-7 rounded-md ${cfg.chipBg} ${cfg.chipText} shrink-0`}>
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                                {ev.title}
                              </p>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                {relativeLabel}
                              </p>
                            </div>
                            <ChevronRight className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </button>
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ul>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Calendar grid / Week view */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="flex-1 min-w-0"
        >
          {viewMode === 'week' ? (
            <WeekView
              weekDate={weekDate}
              events={events}
              eventsByDay={eventsByDay}
              onEventClick={(ev) => setSelectedEvent(ev)}
              onDayHeaderClick={(day) => setSelectedDay(day)}
              onPrevWeek={() => setWeekDate((d) => addWeeks(d, -1))}
              onNextWeek={() => setWeekDate((d) => addWeeks(d, 1))}
              localeCode={localeCode}
            />
          ) : (
            <Card className="overflow-hidden border-emerald-100/60 dark:border-emerald-900/30 shadow-sm">
              <CardContent className="p-2 sm:p-3">
                {/* Weekday header */}
                <div className="grid grid-cols-7 mb-1">
                  {weekdayLabels.map((label) => (
                    <div
                      key={label}
                      className="text-center text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-emerald-700/70 dark:text-emerald-400/60 py-1.5"
                    >
                      {label}
                    </div>
                  ))}
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7 gap-1">
                  {days.map((day, idx) => {
                    const dayKey = format(day, 'yyyy-MM-dd');
                    const dayEvents = eventsByDay.get(dayKey) ?? [];
                    const inMonth = isSameMonth(day, monthDate);
                    const isToday = isDateToday(day);
                    const maxVisible = 3;
                    const visibleEvents = dayEvents.slice(0, maxVisible);
                    const overflow = dayEvents.length - maxVisible;

                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.18, delay: Math.min(idx * 0.005, 0.15) }}
                        onClick={() => dayEvents.length > 0 && setSelectedDay(day)}
                        className={`relative min-h-[80px] p-1 rounded-md border transition-all ${
                          inMonth
                            ? 'bg-white dark:bg-gray-900/40 border-gray-100 dark:border-gray-800'
                            : 'bg-gray-50/60 dark:bg-gray-900/20 border-transparent'
                        } ${
                          dayEvents.length > 0 && inMonth
                            ? 'cursor-pointer hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800/60 hover:-translate-y-0.5'
                            : ''
                        } ${isToday ? 'ring-2 ring-emerald-500 ring-offset-1 ring-offset-white dark:ring-offset-gray-950' : ''}`}
                      >
                        {/* Day number */}
                        <div className="flex items-center justify-between mb-0.5">
                          <span
                            className={`text-[11px] sm:text-xs font-semibold ${
                              isToday
                                ? 'flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-500 text-white'
                                : inMonth
                                ? 'text-gray-700 dark:text-gray-300'
                                : 'text-gray-300 dark:text-gray-600'
                            }`}
                          >
                            {format(day, 'd')}
                          </span>
                          {dayEvents.length > 0 && inMonth && (
                            <span className="text-[9px] sm:text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                              {dayEvents.length}
                            </span>
                          )}
                        </div>

                        {/* Empty cell placeholder */}
                        {inMonth && dayEvents.length === 0 && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleNewEvent(dayKey); }}
                            className="w-full h-full min-h-[40px] flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                          >
                            <Plus className="h-3.5 w-3.5 text-emerald-400" />
                          </button>
                        )}

                        {/* Event chips */}
                        <div className="space-y-0.5">
                          {visibleEvents.map((ev) => {
                            const cfg = TYPE_CONFIG[ev.type];
                            const Icon = cfg.icon;
                            return (
                              <button
                                key={`${ev.type}-${ev.id}`}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEvent(ev);
                                }}
                                className={`w-full max-w-full overflow-hidden text-left ${cfg.chipBg} ${cfg.chipText} rounded px-1 py-0.5 flex items-center gap-1 hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-1 ${cfg.ringClass}`}
                                title={ev.title}
                              >
                                <Icon className="h-2.5 w-2.5 shrink-0 hidden sm:block" />
                                <span className="min-w-0 text-[9px] sm:text-[10px] font-medium leading-tight line-clamp-2 break-words text-ellipsis overflow-hidden">
                                  {ev.title}
                                </span>
                              </button>
                            );
                          })}
                          {overflow > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDay(day);
                              }}
                              className="w-full text-left text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium px-1 py-0.5 transition-colors"
                            >
                              {t('calendar.more_events', { count: overflow })}
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Empty + Loading + Error states */}
                {loading && (
                  <div className="mt-3 flex items-center justify-center gap-2 py-3 text-xs text-emerald-700/70 dark:text-emerald-400/60">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t('calendar.loading')}
                  </div>
                )}
                {error && !loading && (
                  <div className="mt-3 flex items-center justify-center gap-2 py-3 text-xs text-red-600 dark:text-red-400">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {error}
                  </div>
                )}
                {!loading && !error && events.length === 0 && (
                  <div className="mt-3 flex flex-col items-center justify-center gap-1 py-6 text-center">
                    <CalendarIcon className="h-8 w-8 text-emerald-300/60 dark:text-emerald-700/50 mb-1" />
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('calendar.no_events')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t('calendar.no_events_desc')}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 border-emerald-200/60 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-300 min-h-[44px]"
                      onClick={() => handleNewEvent()}
                    >
                      <Plus className="h-4 w-4 mr-1.5" />
                      {t('calendar.new_event')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>

      {/* Day Events Sheet (desktop) / Drawer (mobile) */}
      {isMobile ? (
        <Drawer
          open={!!selectedDay}
          onOpenChange={(open) => !open && setSelectedDay(null)}
        >
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader className="pb-2">
              <DrawerTitle className="text-base font-semibold text-gray-900 dark:text-gray-100 capitalize">
                {selectedDay ? formatDayLong(selectedDay, localeCode) : ''}
              </DrawerTitle>
              <DrawerDescription className="sr-only">
                {t('calendar.day_events', { date: selectedDay ? formatDayLong(selectedDay, localeCode) : '' })}
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-6 overflow-y-auto max-h-[60vh] scrollbar-education">
              {selectedDayEvents.length === 0 ? (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">
                  {t('calendar.no_day_events')}
                </p>
              ) : (
                <ul className="space-y-2">
                  {selectedDayEvents.map((ev) => {
                    const cfg = TYPE_CONFIG[ev.type];
                    const Icon = cfg.icon;
                    return (
                      <li key={`${ev.type}-${ev.id}`}>
                        <button
                          type="button"
                          onClick={() => setSelectedEvent(ev)}
                          className="w-full text-left p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-emerald-200 dark:hover:border-emerald-800 hover:bg-emerald-50/40 dark:hover:bg-emerald-900/10 transition-colors"
                        >
                          <div className="flex items-start gap-2.5">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${cfg.chipBg} ${cfg.chipText} shrink-0`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {ev.title}
                              </p>
                              <p className={`text-xs ${cfg.chipText} font-medium`}>
                                {t(cfg.labelKey)}
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600 shrink-0" />
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3 border-emerald-200/60 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-300 min-h-[44px]"
                onClick={() => {
                  if (selectedDay) handleNewEvent(format(selectedDay, 'yyyy-MM-dd'));
                  setSelectedDay(null);
                }}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                {t('calendar.new_event')}
              </Button>
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Sheet
          open={!!selectedDay}
          onOpenChange={(open) => !open && setSelectedDay(null)}
        >
          <SheetContent
            side="right"
            className="w-full sm:max-w-md overflow-y-auto"
          >
            <SheetHeader className="pb-2">
              <SheetTitle className="text-base font-semibold text-gray-900 dark:text-gray-100 capitalize">
                {selectedDay ? formatDayLong(selectedDay, localeCode) : ''}
              </SheetTitle>
              <SheetDescription>
                {t('calendar.day_events', {
                  date: selectedDay ? format(selectedDay, 'yyyy-MM-dd') : '',
                })}
              </SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-6">
              {selectedDayEvents.length === 0 ? (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">
                  {t('calendar.no_day_events')}
                </p>
              ) : (
                <ul className="space-y-2">
                  {selectedDayEvents.map((ev) => {
                    const cfg = TYPE_CONFIG[ev.type];
                    const Icon = cfg.icon;
                    return (
                      <li key={`${ev.type}-${ev.id}`}>
                        <button
                          type="button"
                          onClick={() => setSelectedEvent(ev)}
                          className="w-full text-left p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-emerald-200 dark:hover:border-emerald-800 hover:bg-emerald-50/40 dark:hover:bg-emerald-900/10 transition-colors"
                        >
                          <div className="flex items-start gap-2.5">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${cfg.chipBg} ${cfg.chipText} shrink-0`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {ev.title}
                              </p>
                              <p className={`text-xs ${cfg.chipText} font-medium`}>
                                {t(cfg.labelKey)}
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600 shrink-0" />
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3 border-emerald-200/60 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-300 min-h-[44px]"
                onClick={() => {
                  if (selectedDay) handleNewEvent(format(selectedDay, 'yyyy-MM-dd'));
                  setSelectedDay(null);
                }}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                {t('calendar.new_event')}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Event detail dialog */}
      <Dialog
        open={!!selectedEvent && !showEventForm}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
      >
        <DialogContent
          className="max-w-sm p-4 rounded-2xl border-emerald-100/60 dark:border-emerald-900/30"
          aria-describedby={undefined}
        >
          <DialogHeader className="pb-1">
            <DialogTitle className="flex items-center justify-between gap-2 text-base font-semibold text-gray-900 dark:text-gray-100">
              <span className="capitalize">
                {selectedEvent ? formatDayLong(parseISO(selectedEvent.date), localeCode) : ''}
              </span>
            </DialogTitle>
            <DialogDescription className="sr-only">
              {selectedEvent ? t('calendar.day_events', { date: selectedEvent.date }) : ''}
            </DialogDescription>
          </DialogHeader>
          {selectedEvent ? (
            <div className="pt-1">
              <EventDetailContent
                event={selectedEvent}
                onEdit={(selectedEvent.meta as Record<string, unknown>)?.customEvent ? () => handleEditEvent(selectedEvent) : undefined}
                onDelete={(selectedEvent.meta as Record<string, unknown>)?.customEvent ? () => setDeleteConfirmEvent(selectedEvent) : undefined}
              />
              <div className="mt-3 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedEvent(null)}
                  className="border-emerald-200/60 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 min-h-[44px]"
                >
                  {t('calendar.close')}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Event form dialog */}
      <Dialog
        open={showEventForm}
        onOpenChange={(open) => {
          if (!open) {
            setShowEventForm(false);
            setEditingEvent(null);
          }
        }}
      >
        <DialogContent className="max-w-md p-4 rounded-2xl border-emerald-100/60 dark:border-emerald-900/30 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-1">
            <DialogTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {editingEvent ? t('calendar.edit_event') : t('calendar.new_event')}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {editingEvent ? t('calendar.edit_event') : t('calendar.new_event')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="event-title" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {t('label.name')}
              </Label>
              <Input
                id="event-title"
                value={formData.title}
                onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))}
                placeholder={t('calendar.new_event')}
                className="min-h-[44px]"
              />
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label htmlFor="event-date" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {t('label.date')}
              </Label>
              <Input
                id="event-date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData((f) => ({ ...f, date: e.target.value }))}
                className="min-h-[44px]"
              />
            </div>

            {/* All day toggle */}
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="event-allday" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {t('calendar.all_day')}
              </Label>
              <Switch
                id="event-allday"
                checked={formData.allDay}
                onCheckedChange={(checked) => setFormData((f) => ({ ...f, allDay: checked }))}
              />
            </div>

            {/* Start/End time (if not all day) */}
            {!formData.allDay && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="event-start" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {t('calendar.start_time')}
                  </Label>
                  <Input
                    id="event-start"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData((f) => ({ ...f, startTime: e.target.value }))}
                    className="min-h-[44px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="event-end" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {t('calendar.end_time')}
                  </Label>
                  <Input
                    id="event-end"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData((f) => ({ ...f, endTime: e.target.value }))}
                    className="min-h-[44px]"
                  />
                </div>
              </div>
            )}

            {/* Event type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {t('calendar.event_type')}
              </Label>
              <Select
                value={formData.eventType}
                onValueChange={(value) => setFormData((f) => ({ ...f, eventType: value as CalendarEventItemType }))}
              >
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CUSTOM_TYPE_CONFIG).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    return (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5" />
                          {t(cfg.labelKey)}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {t('label.subject')}
              </Label>
              <Select
                value={formData.subjectId}
                onValueChange={(value) => setFormData((f) => ({ ...f, subjectId: value === '_none' ? '' : value }))}
              >
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">—</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Class */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {t('label.class')}
              </Label>
              <Select
                value={formData.classGroupId}
                onValueChange={(value) => setFormData((f) => ({ ...f, classGroupId: value === '_none' ? '' : value }))}
              >
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">—</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="event-notes" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {t('calendar.notes')}
              </Label>
              <Textarea
                id="event-notes"
                value={formData.notes}
                onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))}
                placeholder={t('calendar.notes_placeholder')}
                rows={3}
                className="min-h-[44px] resize-none"
              />
            </div>

            {/* Recurrence options */}
            {!editingEvent || formData.editMode === 'series' ? (
              <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-emerald-500" />
                  <Label className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    {t('calendar.recurring')}
                  </Label>
                </div>

                {/* Repeat type */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {t('calendar.repeat_none')}
                  </Label>
                  <Select
                    value={formData.recurrenceType}
                    onValueChange={(value) => setFormData((f) => ({
                      ...f,
                      recurrenceType: value as 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly',
                      recurrenceDaysOfWeek: value === 'weekly' ? [1] : [],
                    }))}
                  >
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('calendar.repeat_none')}</SelectItem>
                      <SelectItem value="daily">{t('calendar.repeat_daily')}</SelectItem>
                      <SelectItem value="weekly">{t('calendar.repeat_weekly')}</SelectItem>
                      <SelectItem value="monthly">{t('calendar.repeat_monthly')}</SelectItem>
                      <SelectItem value="yearly">{t('calendar.repeat_yearly')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Interval */}
                {formData.recurrenceType !== 'none' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {t('calendar.repeat_interval', { interval: formData.recurrenceInterval })}
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={30}
                      value={formData.recurrenceInterval}
                      onChange={(e) => setFormData((f) => ({ ...f, recurrenceInterval: parseInt(e.target.value) || 1 }))}
                      className="min-h-[44px] w-20"
                    />
                  </div>
                )}

                {/* Days of week selector (for weekly) */}
                {formData.recurrenceType === 'weekly' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {t('calendar.repeat_weekdays')}
                    </Label>
                    <div className="flex gap-1">
                      {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((dayLabel, dayIndex) => {
                        const dayNum = dayIndex === 6 ? 0 : dayIndex + 1;
                        const isSelected = formData.recurrenceDaysOfWeek.includes(dayNum);
                        return (
                          <button
                            key={dayNum}
                            type="button"
                            onClick={() => {
                              setFormData((f) => ({
                                ...f,
                                recurrenceDaysOfWeek: isSelected
                                  ? f.recurrenceDaysOfWeek.filter((d) => d !== dayNum)
                                  : [...f.recurrenceDaysOfWeek, dayNum].sort(),
                              }));
                            }}
                            className={`w-10 h-10 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'bg-emerald-500 text-white shadow-sm'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/20'
                            }`}
                          >
                            {dayLabel}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Recurrence end */}
                {formData.recurrenceType !== 'none' && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {t('calendar.repeat_end')}
                    </Label>
                    <div className="flex gap-3">
                      <Button
                        variant={formData.recurrenceEndType === 'never' ? 'default' : 'outline'}
                        size="sm"
                        className={formData.recurrenceEndType === 'never' ? 'bg-emerald-500 hover:bg-emerald-600 text-white min-h-[44px]' : 'min-h-[44px]'}
                        onClick={() => setFormData((f) => ({ ...f, recurrenceEndType: 'never' }))}
                      >
                        {t('calendar.repeat_end_never')}
                      </Button>
                      <Button
                        variant={formData.recurrenceEndType === 'on_date' ? 'default' : 'outline'}
                        size="sm"
                        className={formData.recurrenceEndType === 'on_date' ? 'bg-emerald-500 hover:bg-emerald-600 text-white min-h-[44px]' : 'min-h-[44px]'}
                        onClick={() => setFormData((f) => ({ ...f, recurrenceEndType: 'on_date' }))}
                      >
                        {t('calendar.repeat_end_on')}
                      </Button>
                    </div>
                    {formData.recurrenceEndType === 'on_date' && (
                      <Input
                        type="date"
                        value={formData.recurrenceEndDate}
                        onChange={(e) => setFormData((f) => ({ ...f, recurrenceEndDate: e.target.value }))}
                        className="min-h-[44px]"
                      />
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              onClick={() => { setShowEventForm(false); setEditingEvent(null); }}
              className="min-h-[44px]"
            >
              {t('action.cancel')}
            </Button>
            <Button
              onClick={handleSaveEvent}
              disabled={!formData.title.trim() || saving}
              className="bg-emerald-500 hover:bg-emerald-600 text-white min-h-[44px]"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
              {editingEvent ? t('action.save') : t('action.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteConfirmEvent}
        onOpenChange={(open) => !open && setDeleteConfirmEvent(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('calendar.delete_confirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('calendar.delete_confirm_desc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-[44px]">{t('action.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEvent}
              className="bg-red-500 hover:bg-red-600 text-white min-h-[44px]"
            >
              {t('action.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit mode dialog for recurring events */}
      <AlertDialog
        open={showEditModeDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowEditModeDialog(false);
            setPendingEditEvent(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('calendar.edit_series')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('calendar.edit_instance')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="min-h-[44px]">{t('action.cancel')}</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => pendingEditEvent && handleEditEventWithMode(pendingEditEvent, 'instance')}
              className="border-emerald-200/60 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-300 min-h-[44px]"
            >
              {t('calendar.edit_instance')}
            </Button>
            <AlertDialogAction
              onClick={() => pendingEditEvent && handleEditEventWithMode(pendingEditEvent, 'series')}
              className="bg-emerald-500 hover:bg-emerald-600 text-white min-h-[44px]"
            >
              {t('calendar.edit_series')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
