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

const FALLBACK_COLOR = 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/40 dark:text-gray-200 dark:border-gray-800';
const BREAK_COLOR = 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800/30 dark:text-gray-400 dark:border-gray-700';

function getSubjectColor(subjectName: string | null): string {
  if (!subjectName) return FALLBACK_COLOR;
  return SUBJECT_COLORS[subjectName] ?? FALLBACK_COLOR;
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
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];
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
                <Input id="slot-room" value={roomId} onChange={(e) => setRoomId(e.target.value)} placeholder="Room..." className="min-h-[44px]" />
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSlot, setEditSlot] = useState<TimetableSlot | null>(null);
  const [dialogDay, setDialogDay] = useState(0);
  const [dialogPeriod, setDialogPeriod] = useState(1);
  const [dragSlot, setDragSlot] = useState<string | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ day: number; period: number } | null>(null);

  const schoolId = currentUser?.schoolId ?? '';

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
    try {
      const data = await apiGet<TimetableSlot[]>(`/api/timetable?schoolId=${schoolId}&classGroupId=${selectedClassId}`);
      setSlots(data);
    } catch {
      setSlots([]);
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

  // Handlers
  const handleSaveSlot = async (data: Record<string, unknown>) => {
    try {
      if (data.id) {
        // Update existing
        await apiPut<TimetableSlot>(`/api/timetable/${data.id}`, {
          subjectId: data.subjectId,
          teacherId: data.teacherId,
          roomId: data.roomId,
          startTime: data.startTime,
          endTime: data.endTime,
          isBreak: data.isBreak,
        });
      } else {
        // Create new
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
          <h1 className="text-2xl font-bold">{t('timetable.title')}</h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
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

      {/* Timetable Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      ) : !selectedClassId ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t('timetable.select_class')}
          </CardContent>
        </Card>
      ) : (
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
                    {DAYS.map((day) => (
                      <th key={day} className="p-2 text-sm font-semibold text-center border border-gray-200 dark:border-gray-700 min-w-[120px]">
                        {getDayLabel(day)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PERIODS.map((period) => {
                    const defaultTime = DEFAULT_TIMES[period];
                    const slotInRow = slots.find((s) => s.period === period);
                    const timeDisplay = slotInRow
                      ? `${slotInRow.startTime}–${slotInRow.endTime}`
                      : `${defaultTime?.start ?? ''}–${defaultTime?.end ?? ''}`;

                    // Check if this is a break row (common convention: period 3 is break)
                    const isBreakRow = PERIODS.indexOf(period) === 2; // between period 3 and 4

                    return (
                      <React.Fragment key={period}>
                        <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                          <td className="p-2 text-sm font-medium text-center border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30">
                            {period}
                          </td>
                          <td className="p-2 text-xs text-muted-foreground text-center border border-gray-200 dark:border-gray-700">
                            {timeDisplay}
                          </td>
                          {DAYS.map((day) => {
                            const cellSlot = gridMap[`${day}-${period}`];
                            const isDragOver = dragOverCell?.day === day && dragOverCell?.period === period;
                            const isDragTarget = dragSlot && !cellSlot;

                            return (
                              <td
                                key={`${day}-${period}`}
                                className={`p-1 border border-gray-200 dark:border-gray-700 transition-colors ${
                                  isDragOver && isDragTarget ? 'bg-emerald-50 dark:bg-emerald-950/40' : ''
                                } ${cellSlot?.isBreak ? BREAK_COLOR.split(' ')[0] : ''}`}
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
                                    className={`rounded-md p-2 cursor-pointer min-h-[44px] flex flex-col gap-0.5 border ${cellSlot.isBreak ? BREAK_COLOR : getSubjectColor(cellSlot.subject?.name)}`}
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
                                      <span className="text-xs opacity-70 truncate">
                                        {cellSlot.teacher.firstName} {cellSlot.teacher.lastName}
                                      </span>
                                    )}
                                    {cellSlot.roomId && (
                                      <span className="text-xs opacity-60 truncate">
                                        R{cellSlot.roomId}
                                      </span>
                                    )}
                                  </motion.div>
                                ) : (
                                  <button
                                    className="w-full h-full min-h-[44px] flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-800/30 transition-colors cursor-pointer"
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

                        {/* Break row between period 3 and 4 */}
                        {isBreakRow && (
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
              <div className="py-8 text-center text-muted-foreground">
                <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
                {t('timetable.no_slots')}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Drag hint */}
      {slots.length > 0 && (
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
