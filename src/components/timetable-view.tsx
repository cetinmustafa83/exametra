'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  Printer,
  Plus,
  Trash2,
  GripVertical,
  Edit3,
  X,
  ChevronDown,
  ChevronUp,
  Coffee,
  BookOpen,
  MapPin,
  User,
  CalendarDays,
  LayoutGrid,
  List,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';

// ── Subject Color Palette ──────────────────────────────────────────────
const SUBJECT_COLORS: Record<string, string> = {
  'Deutsch': 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/40 dark:text-rose-200 dark:border-rose-800',
  'Mathematik': 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-800',
  'Englisch': 'bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-900/40 dark:text-violet-200 dark:border-violet-800',
  'Sachunterricht': 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-800',
  'Musik': 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/40 dark:text-orange-200 dark:border-orange-800',
  'Sport': 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900/40 dark:text-teal-200 dark:border-teal-800',
  'Religion': 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-800',
  'Kunst': 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300 dark:bg-fuchsia-900/40 dark:text-fuchsia-200 dark:border-fuchsia-800',
  'German': 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/40 dark:text-rose-200 dark:border-rose-800',
  'Mathematics': 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-800',
  'English': 'bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-900/40 dark:text-violet-200 dark:border-violet-800',
  'Science': 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-800',
  'Music': 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/40 dark:text-orange-200 dark:border-orange-800',
  'Physical Education': 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900/40 dark:text-teal-200 dark:border-teal-800',
  'Religion/Ethics': 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-800',
  'Art': 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300 dark:bg-fuchsia-900/40 dark:text-fuchsia-200 dark:border-fuchsia-800',
};

// Subject accent colors for borders and highlights
const SUBJECT_ACCENT_COLORS: Record<string, string> = {
  'Deutsch': 'border-l-rose-500 ring-rose-200 dark:ring-rose-800',
  'Mathematik': 'border-l-blue-500 ring-blue-200 dark:ring-blue-800',
  'Englisch': 'border-l-violet-500 ring-violet-200 dark:ring-violet-800',
  'Sachunterricht': 'border-l-emerald-500 ring-emerald-200 dark:ring-emerald-800',
  'Musik': 'border-l-orange-500 ring-orange-200 dark:ring-orange-800',
  'Sport': 'border-l-teal-500 ring-teal-200 dark:ring-teal-800',
  'Religion': 'border-l-amber-500 ring-amber-200 dark:ring-amber-800',
  'Kunst': 'border-l-fuchsia-500 ring-fuchsia-200 dark:ring-fuchsia-800',
  'German': 'border-l-rose-500 ring-rose-200 dark:ring-rose-800',
  'Mathematics': 'border-l-blue-500 ring-blue-200 dark:ring-blue-800',
  'English': 'border-l-violet-500 ring-violet-200 dark:ring-violet-800',
  'Science': 'border-l-emerald-500 ring-emerald-200 dark:ring-emerald-800',
  'Music': 'border-l-orange-500 ring-orange-200 dark:ring-orange-800',
  'Physical Education': 'border-l-teal-500 ring-teal-200 dark:ring-teal-800',
  'Religion/Ethics': 'border-l-amber-500 ring-amber-200 dark:ring-amber-800',
  'Art': 'border-l-fuchsia-500 ring-fuchsia-200 dark:ring-fuchsia-800',
};

const FALLBACK_COLOR = 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/40 dark:text-gray-200 dark:border-gray-800';
const FALLBACK_ACCENT = 'border-l-gray-400 ring-gray-200 dark:ring-gray-800';
const BREAK_COLOR = 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800/30 dark:text-gray-400 dark:border-gray-700';

function getSubjectColor(subjectName: string | null): string {
  if (!subjectName) return FALLBACK_COLOR;
  return SUBJECT_COLORS[subjectName] ?? FALLBACK_COLOR;
}

function getSubjectAccentColor(subjectName: string | null): string {
  if (!subjectName) return FALLBACK_ACCENT;
  return SUBJECT_ACCENT_COLORS[subjectName] ?? FALLBACK_ACCENT;
}

// ── Types ──────────────────────────────────────────────────────────────
interface TimetableSlot {
  id: string;
  schoolId: string;
  classGroupId: string;
  dayOfWeek: number;
  period: number;
  subjectId: string | null;
  teacherId: string | null;
  roomId: string | null;
  startTime: string;
  endTime: string;
  isBreak: boolean;
  classGroup: { id: string; name: string; gradeLevel: number };
  subject: { id: string; name: string } | null;
  teacher: { id: string; firstName: string; lastName: string } | null;
}

interface SubjectOption {
  id: string;
  name: string;
}

interface TeacherOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface ClassOption {
  id: string;
  name: string;
  gradeLevel: number;
}

const DAYS = [0, 1, 2, 3, 4]; // Mon-Fri
const PERIODS = [1, 2, 3, 4, 5, 6];
const DEFAULT_TIMES: Record<number, { start: string; end: string }> = {
  1: { start: '08:00', end: '08:45' },
  2: { start: '08:45', end: '09:30' },
  3: { start: '09:30', end: '10:15' },
  4: { start: '10:15', end: '11:00' },
  5: { start: '11:00', end: '11:45' },
  6: { start: '11:45', end: '12:30' },
  7: { start: '13:00', end: '13:45' },
  8: { start: '13:45', end: '14:30' },
};

function getDayLabel(dayOfWeek: number): string {
  const keys = ['timetable.monday', 'timetable.tuesday', 'timetable.wednesday', 'timetable.thursday', 'timetable.friday'];
  return t(keys[dayOfWeek] ?? 'timetable.day');
}

function getDayShortLabel(dayOfWeek: number): string {
  const keys = ['timetable.mon_short', 'timetable.tue_short', 'timetable.wed_short', 'timetable.thu_short', 'timetable.fri_short'];
  return t(keys[dayOfWeek] ?? 'timetable.day');
}

// ── Current Period Detection ─────────────────────────────────────────
function getCurrentPeriodInfo(): { day: number; period: number } | null {
  const now = new Date();
  const jsDay = now.getDay(); // 0=Sun, 1=Mon...
  const dayOfWeek = jsDay - 1; // 0=Mon, 1=Tue...
  if (dayOfWeek < 0 || dayOfWeek > 4) return null; // weekend

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  for (const [periodStr, times] of Object.entries(DEFAULT_TIMES)) {
    const period = parseInt(periodStr);
    const [startH, startM] = times.start.split(':').map(Number);
    const [endH, endM] = times.end.split(':').map(Number);
    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;
    if (currentMinutes >= startMin && currentMinutes < endMin) {
      return { day: dayOfWeek, period };
    }
  }
  return null;
}

// ── Loading Skeleton ────────────────────────────────────────────────
function TimetableSkeleton() {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[640px]">
            <thead>
              <tr className="bg-emerald-50 dark:bg-emerald-950/30">
                <th className="p-2 w-[80px]"><Skeleton className="h-4 w-12" /></th>
                <th className="p-2"><Skeleton className="h-4 w-20 mx-auto" /></th>
                {DAYS.map((d) => (
                  <th key={d} className="p-2 min-w-[120px]"><Skeleton className="h-4 w-16 mx-auto" /></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERIODS.map((p) => (
                <tr key={p}>
                  <td className="p-2"><Skeleton className="h-4 w-6 mx-auto" /></td>
                  <td className="p-2"><Skeleton className="h-3 w-16 mx-auto" /></td>
                  {DAYS.map((d) => (
                    <td key={`${d}-${p}`} className="p-1">
                      <Skeleton className="h-12 w-full rounded-md" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Slot Dialog ────────────────────────────────────────────────────────
function SlotDialog({
  open,
  onClose,
  slot,
  subjects,
  teachers,
  schoolId,
  classGroupId,
  dayOfWeek,
  period,
  onSave,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  slot: TimetableSlot | null;
  subjects: SubjectOption[];
  teachers: TeacherOption[];
  schoolId: string;
  classGroupId: string;
  dayOfWeek: number;
  period: number;
  onSave: (data: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
}) {
  const [subjectId, setSubjectId] = useState<string>('none');
  const [teacherId, setTeacherId] = useState<string>('none');
  const [roomId, setRoomId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isBreak, setIsBreak] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (slot) {
      setSubjectId(slot.subjectId ?? 'none');
      setTeacherId(slot.teacherId ?? 'none');
      setRoomId(slot.roomId ?? '');
      setStartTime(slot.startTime);
      setEndTime(slot.endTime);
      setIsBreak(slot.isBreak);
    } else {
      setSubjectId('none');
      setTeacherId('none');
      setRoomId('');
      const defaultTime = DEFAULT_TIMES[period];
      setStartTime(defaultTime?.start ?? '08:00');
      setEndTime(defaultTime?.end ?? '08:45');
      setIsBreak(false);
    }
  }, [slot, period, open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data: Record<string, unknown> = {
        schoolId,
        classGroupId,
        dayOfWeek,
        period,
        subjectId: subjectId === 'none' ? null : subjectId,
        teacherId: teacherId === 'none' ? null : teacherId,
        roomId: roomId || null,
        startTime,
        endTime,
        isBreak,
      };
      if (slot) {
        data.id = slot.id;
      }
      onSave(data);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {slot ? t('timetable.edit_slot') : t('timetable.add_slot')}
          </DialogTitle>
          <DialogDescription>
            {getDayLabel(dayOfWeek)} — {t('timetable.period_num', { n: period })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3">
            <Label htmlFor="slot-break" className="flex items-center gap-2 min-h-[44px]">
              <Coffee className="h-4 w-4" />
              {t('timetable.break')}
            </Label>
            <Switch id="slot-break" checked={isBreak} onCheckedChange={setIsBreak} />
          </div>

          {!isBreak && (
            <>
              <div className="space-y-2">
                <Label htmlFor="slot-subject">{t('timetable.subject')}</Label>
                <Select value={subjectId} onValueChange={setSubjectId}>
                  <SelectTrigger id="slot-subject" className="min-h-[44px]">
                    <SelectValue placeholder={t('timetable.no_subject')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('timetable.no_subject')}</SelectItem>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="slot-teacher">{t('timetable.teacher')}</Label>
                <Select value={teacherId} onValueChange={setTeacherId}>
                  <SelectTrigger id="slot-teacher" className="min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {teachers.map((tch) => (
                      <SelectItem key={tch.id} value={tch.id}>
                        {tch.firstName} {tch.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="slot-room">{t('timetable.room')}</Label>
                <Input id="slot-room" value={roomId} onChange={(e) => setRoomId(e.target.value)} placeholder={t('timetable.room_placeholder')} className="min-h-[44px]" />
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="slot-start">{t('timetable.start_time')}</Label>
              <Input id="slot-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="min-h-[44px]" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slot-end">{t('timetable.end_time')}</Label>
              <Input id="slot-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="min-h-[44px]" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 justify-end">
          {slot && (
            <Button
              variant="destructive"
              size="sm"
              className="min-h-[44px]"
              onClick={() => { onDelete(slot.id); onClose(); }}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {t('timetable.delete_slot')}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onClose} className="min-h-[44px]">
            {t('action.cancel')}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="min-h-[44px]">
            {saving ? '...' : t('action.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main View ──────────────────────────────────────────────────────────
export default function TimetableView() {
  const currentUser = useAppStore((s) => s.currentUser);
  const locale = useAppStore((s) => s.locale);

  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSlot, setEditSlot] = useState<TimetableSlot | null>(null);
  const [dialogDay, setDialogDay] = useState(0);
  const [dialogPeriod, setDialogPeriod] = useState(1);
  const [dragSlot, setDragSlot] = useState<string | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ day: number; period: number } | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const schoolId = currentUser?.schoolId ?? '';

  // Current period detection
  const currentPeriod = useMemo(() => getCurrentPeriodInfo(), []);
  // Refresh current period every minute
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);
  const liveCurrentPeriod = useMemo(() => getCurrentPeriodInfo(), [now]);

  // Load classes
  useEffect(() => {
    if (!schoolId) return;
    apiGet<ClassOption[]>(`/api/classes?schoolId=${schoolId}`)
      .then((data) => {
        setClasses(data);
        if (data.length > 0 && !selectedClassId) {
          setSelectedClassId(data[0].id);
        }
      })
      .catch(() => {});
  }, [schoolId]);

  // Load subjects
  useEffect(() => {
    if (!schoolId) return;
    apiGet<SubjectOption[]>(`/api/subjects?schoolId=${schoolId}`)
      .then((data) => setSubjects(data))
      .catch(() => {});
  }, [schoolId]);

  // Load teachers
  useEffect(() => {
    if (!schoolId) return;
    apiGet<{ id: string; firstName: string; lastName: string; role: string }[]>(`/api/users?schoolId=${schoolId}`)
      .then((data) => {
        const teacherList = data.filter((u) => u.role === 'TEACHER' || u.role === 'SCHOOL_ADMIN');
        setTeachers(teacherList);
      })
      .catch(() => {});
  }, [schoolId]);

  // Load timetable slots
  const loadSlots = useCallback(async () => {
    if (!schoolId || !selectedClassId) {
      setSlots([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<TimetableSlot[]>(`/api/timetable?schoolId=${schoolId}&classGroupId=${selectedClassId}`);
      setSlots(data);
    } catch (err) {
      setSlots([]);
      setError(err instanceof Error ? err.message : t('timetable.load_error'));
    }
    setLoading(false);
  }, [schoolId, selectedClassId]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  // Build grid lookup
  const gridMap = useMemo(() => {
    const map: Record<string, TimetableSlot> = {};
    for (const slot of slots) {
      map[`${slot.dayOfWeek}-${slot.period}`] = slot;
    }
    return map;
  }, [slots]);

  // Get unique subjects for legend
  const subjectLegend = useMemo(() => {
    const seen = new Map<string, string>();
    for (const slot of slots) {
      if (slot.subject && !seen.has(slot.subject.id)) {
        seen.set(slot.subject.id, slot.subject.name);
      }
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [slots]);

  // Handlers
  const handleSaveSlot = async (data: Record<string, unknown>) => {
    try {
      if (data.id) {
        await apiPut<TimetableSlot>(`/api/timetable/${data.id}`, {
          subjectId: data.subjectId,
          teacherId: data.teacherId,
          roomId: data.roomId,
          startTime: data.startTime,
          endTime: data.endTime,
          isBreak: data.isBreak,
        });
      } else {
        await apiPost<TimetableSlot>('/api/timetable', data);
      }
      await loadSlots();
      setDialogOpen(false);
      setEditSlot(null);
    } catch (err) {
      console.error('Error saving slot:', err);
    }
  };

  const handleDeleteSlot = async (id: string) => {
    try {
      await apiDelete(`/api/timetable/${id}`);
      await loadSlots();
    } catch (err) {
      console.error('Error deleting slot:', err);
    }
  };

  const handleDragStart = (slotId: string) => {
    setDragSlot(slotId);
  };

  const handleDragEnd = () => {
    setDragSlot(null);
    setDragOverCell(null);
  };

  const handleDragOver = (day: number, period: number) => {
    setDragOverCell({ day, period });
  };

  const handleDrop = async (targetDay: number, targetPeriod: number) => {
    if (!dragSlot) return;
    try {
      await apiPut(`/api/timetable/${dragSlot}`, {
        dayOfWeek: targetDay,
        period: targetPeriod,
      });
      await loadSlots();
    } catch (err) {
      console.error('Error moving slot:', err);
    }
    setDragSlot(null);
    setDragOverCell(null);
  };

  const handlePrint = () => {
    window.print();
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Clock className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          <div>
            <h1 className="text-2xl font-bold">{t('timetable.title')}</h1>
            {liveCurrentPeriod && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                {t('timetable.current_period', { period: liveCurrentPeriod.period })} — {getDayLabel(liveCurrentPeriod.day)}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex items-center border rounded-md overflow-hidden">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              className="min-h-[44px] rounded-none"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              className="min-h-[44px] rounded-none"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger className="w-[180px] min-h-[44px]">
              <SelectValue placeholder={t('timetable.select_class')} />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name} (Grade {c.gradeLevel})</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="min-h-[44px]"
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4 mr-1" />
            {t('timetable.print')}
          </Button>
        </div>
      </div>

      {/* Subject Legend */}
      {subjectLegend.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium">{t('timetable.legend')}:</span>
          {subjectLegend.map(({ id, name }) => (
            <div
              key={id}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs border ${getSubjectColor(name)}`}
            >
              <span className="font-medium">{name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-rose-200 dark:border-rose-800">
          <CardContent className="py-6 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-rose-500" />
            <p className="text-rose-600 dark:text-rose-400 mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={loadSlots} className="min-h-[44px]">
              <RefreshCw className="h-4 w-4 mr-1" />
              {t('action.refresh')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Timetable Grid */}
      {!error && loading && (
        <TimetableSkeleton />
      )}
      {!error && !loading && !selectedClassId && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium mb-1">{t('timetable.select_class')}</p>
            <p className="text-sm">{t('timetable.select_class_hint')}</p>
          </CardContent>
        </Card>
      )}
      {!error && !loading && selectedClassId && viewMode === 'grid' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="print:shadow-none print:border-0">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[640px]">
                  {/* Header row: Day names */}
                  <thead>
                    <tr className="bg-emerald-50 dark:bg-emerald-950/30">
                      <th className="p-2 text-sm font-semibold text-left w-[80px] border border-gray-200 dark:border-gray-700">
                        {t('timetable.period')}
                      </th>
                      <th className="p-2 text-sm font-semibold text-center border border-gray-200 dark:border-gray-700">
                        {t('timetable.start_time')} / {t('timetable.end_time')}
                      </th>
                      {DAYS.map((day) => {
                        const isToday = liveCurrentPeriod?.day === day;
                        return (
                          <th
                            key={day}
                            className={`p-2 text-sm font-semibold text-center border border-gray-200 dark:border-gray-700 min-w-[120px] ${
                              isToday ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300' : ''
                            }`}
                          >
                            <div>{getDayLabel(day)}</div>
                            {isToday && (
                              <div className="text-xs font-normal flex items-center justify-center gap-1">
                                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                {t('timetable.today')}
                              </div>
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {PERIODS.map((period) => {
                      const defaultTime = DEFAULT_TIMES[period];
                      const slotInRow = slots.find((s) => s.period === period);
                      const timeDisplay = slotInRow
                        ? `${slotInRow.startTime}–${slotInRow.endTime}`
                        : `${defaultTime?.start ?? ''}–${defaultTime?.end ?? ''}`;
                      const isCurrentPeriod = liveCurrentPeriod?.period === period;

                      return (
                        <React.Fragment key={period}>
                          <tr className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/20 ${
                            isCurrentPeriod ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''
                          }`}>
                            <td className={`p-2 text-sm font-medium text-center border border-gray-200 dark:border-gray-700 ${
                              isCurrentPeriod
                                ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                                : 'bg-gray-50 dark:bg-gray-800/30'
                            }`}>
                              <div className="flex items-center justify-center gap-1">
                                {period}
                                {isCurrentPeriod && (
                                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                )}
                              </div>
                            </td>
                            <td className="p-2 text-xs text-muted-foreground text-center border border-gray-200 dark:border-gray-700">
                              {timeDisplay}
                            </td>
                            {DAYS.map((day) => {
                              const cellSlot = gridMap[`${day}-${period}`];
                              const isDragOver = dragOverCell?.day === day && dragOverCell?.period === period;
                              const isDragTarget = dragSlot && !cellSlot;
                              const isCurrentCell = liveCurrentPeriod?.day === day && liveCurrentPeriod?.period === period;

                              return (
                                <td
                                  key={`${day}-${period}`}
                                  className={`p-1 border border-gray-200 dark:border-gray-700 transition-colors ${
                                    isDragOver && isDragTarget ? 'bg-emerald-50 dark:bg-emerald-950/40' : ''
                                  } ${isCurrentCell ? 'ring-2 ring-inset ring-emerald-400 dark:ring-emerald-600' : ''} ${
                                    cellSlot?.isBreak ? BREAK_COLOR.split(' ')[0] : ''
                                  }`}
                                  onDragOver={(e) => { e.preventDefault(); handleDragOver(day, period); }}
                                  onDragLeave={() => setDragOverCell(null)}
                                  onDrop={() => handleDrop(day, period)}
                                >
                                  {cellSlot ? (
                                    <motion.div
                                      layout
                                      draggable
                                      onDragStart={() => handleDragStart(cellSlot.id)}
                                      onDragEnd={handleDragEnd}
                                      className={`rounded-md p-2 cursor-pointer min-h-[44px] flex flex-col gap-0.5 border-l-4 ${
                                        cellSlot.isBreak
                                          ? `${BREAK_COLOR} border-l-gray-300 dark:border-l-gray-600`
                                          : `${getSubjectColor(cellSlot.subject?.name ?? null)} ${getSubjectAccentColor(cellSlot.subject?.name ?? null)}`
                                      } ${isCurrentCell ? 'shadow-md' : ''}`}
                                      onClick={() => {
                                        setEditSlot(cellSlot);
                                        setDialogDay(day);
                                        setDialogPeriod(period);
                                        setDialogOpen(true);
                                      }}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-medium text-xs truncate">
                                          {cellSlot.isBreak
                                            ? t('timetable.break_period')
                                            : cellSlot.subject?.name ?? t('timetable.no_subject')}
                                        </span>
                                        <GripVertical className="h-3 w-3 opacity-40 shrink-0" />
                                      </div>
                                      {!cellSlot.isBreak && cellSlot.teacher && (
                                        <span className="text-xs opacity-70 truncate flex items-center gap-0.5">
                                          <User className="h-2.5 w-2.5" />
                                          {cellSlot.teacher.firstName[0]}. {cellSlot.teacher.lastName}
                                        </span>
                                      )}
                                      {cellSlot.roomId && (
                                        <span className="text-xs opacity-60 truncate flex items-center gap-0.5">
                                          <MapPin className="h-2.5 w-2.5" />
                                          {cellSlot.roomId}
                                        </span>
                                      )}
                                    </motion.div>
                                  ) : (
                                    <button
                                      className={`w-full h-full min-h-[44px] flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-800/30 transition-colors cursor-pointer ${
                                        isCurrentCell ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''
                                      }`}
                                      onClick={() => {
                                        setEditSlot(null);
                                        setDialogDay(day);
                                        setDialogPeriod(period);
                                        setDialogOpen(true);
                                      }}
                                      aria-label={`${t('timetable.add_slot')} - ${getDayLabel(day)} Period ${period}`}
                                    >
                                      <Plus className="h-4 w-4 text-muted-foreground opacity-30" />
                                    </button>
                                  )}
                                </td>
                              );
                            })}
                          </tr>

                          {/* Break row after period 3 */}
                          {period === 3 && (
                            <tr className="bg-gray-100 dark:bg-gray-800/20">
                              <td className="p-2 text-xs text-center border border-gray-200 dark:border-gray-700">
                                <Coffee className="h-3 w-3 mx-auto text-gray-400" />
                              </td>
                              <td className="p-2 text-xs text-muted-foreground text-center border border-gray-200 dark:border-gray-700">
                                10:15–10:30
                              </td>
                              {DAYS.map((day) => (
                                <td
                                  key={`break-${day}`}
                                  className="p-1 border border-gray-200 dark:border-gray-700"
                                >
                                  <div className={`rounded-md p-2 min-h-[28px] flex items-center justify-center border ${BREAK_COLOR}`}>
                                    <span className="text-xs font-medium">{t('timetable.break_period')}</span>
                                  </div>
                                </td>
                              ))}
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {slots.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium mb-1">{t('timetable.no_slots')}</p>
                  <p className="text-sm">{t('timetable.no_slots_hint')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
      {!error && !loading && selectedClassId && viewMode === 'list' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="space-y-4">
            {DAYS.map((day) => {
              const daySlots = slots
                .filter((s) => s.dayOfWeek === day)
                .sort((a, b) => a.period - b.period);
              const isToday = liveCurrentPeriod?.day === day;

              return (
                <Card key={day} className={isToday ? 'ring-2 ring-emerald-400 dark:ring-emerald-600' : ''}>
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        {getDayLabel(day)}
                        {isToday && (
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-xs">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse mr-1" />
                            {t('timetable.today')}
                          </Badge>
                        )}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="min-h-[44px]"
                        onClick={() => {
                          setEditSlot(null);
                          setDialogDay(day);
                          setDialogPeriod(1);
                          setDialogOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    {daySlots.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">{t('timetable.no_slots')}</p>
                    ) : (
                      <div className="space-y-2">
                        {daySlots.map((slot) => {
                          const isCurrentSlot = liveCurrentPeriod?.day === day && liveCurrentPeriod?.period === slot.period;
                          return (
                            <motion.div
                              key={slot.id}
                              layout
                              draggable
                              onDragStart={() => handleDragStart(slot.id)}
                              onDragEnd={handleDragEnd}
                              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-shadow ${
                                slot.isBreak
                                  ? BREAK_COLOR
                                  : `${getSubjectColor(slot.subject?.name ?? null)} ${getSubjectAccentColor(slot.subject?.name ?? null)}`
                              } ${isCurrentSlot ? 'ring-2 ring-emerald-400 dark:ring-emerald-600 shadow-md' : ''}`}
                              onClick={() => {
                                setEditSlot(slot);
                                setDialogDay(day);
                                setDialogPeriod(slot.period);
                                setDialogOpen(true);
                              }}
                            >
                              <div className="flex items-center gap-1 text-sm font-medium min-w-[40px]">
                                {slot.period}
                                {isCurrentSlot && (
                                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">
                                    {slot.isBreak
                                      ? t('timetable.break_period')
                                      : slot.subject?.name ?? t('timetable.no_subject')}
                                  </span>
                                </div>
                                {!slot.isBreak && (
                                  <div className="flex items-center gap-3 text-xs opacity-70 mt-0.5">
                                    {slot.teacher && (
                                      <span className="flex items-center gap-0.5">
                                        <User className="h-3 w-3" />
                                        {slot.teacher.firstName} {slot.teacher.lastName}
                                      </span>
                                    )}
                                    {slot.roomId && (
                                      <span className="flex items-center gap-0.5">
                                        <MapPin className="h-3 w-3" />
                                        {slot.roomId}
                                      </span>
                                    )}
                                    <span className="flex items-center gap-0.5">
                                      <Clock className="h-3 w-3" />
                                      {slot.startTime}–{slot.endTime}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <GripVertical className="h-4 w-4 opacity-40 shrink-0" />
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Drag hint */}
      {slots.length > 0 && !error && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <GripVertical className="h-3 w-3" />
          {t('timetable.drag_hint')}
        </p>
      )}

      {/* Slot Dialog */}
      <SlotDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditSlot(null); }}
        slot={editSlot}
        subjects={subjects}
        teachers={teachers}
        schoolId={schoolId}
        classGroupId={selectedClassId}
        dayOfWeek={dialogDay}
        period={dialogPeriod}
        onSave={handleSaveSlot}
        onDelete={handleDeleteSlot}
      />
    </div>
  );
}
