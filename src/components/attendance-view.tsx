'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarCheck,
  Plus,
  Check,
  Clock,
  FileText,
  Trash2,
  RotateCcw,
  Save,
  ChevronDown,
  ChevronRight,
  Loader2,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ClipboardList,
  Timer,
  BarChart3,
  LucideIcon,
  FilePenLine,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import {
  fetchAttendanceSessions,
  createAttendanceSession,
  updateAttendanceSession,
  updateAttendanceRecord,
  deleteAttendanceSession,
  fetchClasses,
  fetchSubjects,
  type AttendanceSession,
  type AttendanceRecord,
  type AttendanceStatus,
  type ClassGroup,
  type Subject,
} from '@/lib/api';

/* ── Status helpers ────────────────────────────────────────────────── */

const STATUS_CONFIG: Record<AttendanceStatus, {
  icon: LucideIcon;
  labelKey: string;
  bgClass: string;
  bgDarkClass: string;
  borderClass: string;
  borderDarkClass: string;
  textClass: string;
  textDarkClass: string;
  dotClass: string;
  heatLevel: number; // 0-4 for heatmap
}> = {
  PRESENT: {
    icon: CheckCircle2,
    labelKey: 'attendance.present',
    bgClass: 'bg-emerald-100',
    bgDarkClass: 'dark:bg-emerald-900/40',
    borderClass: 'border-emerald-300',
    borderDarkClass: 'dark:border-emerald-700',
    textClass: 'text-emerald-700',
    textDarkClass: 'dark:text-emerald-300',
    dotClass: 'bg-emerald-500',
    heatLevel: 4,
  },
  ABSENT: {
    icon: XCircle,
    labelKey: 'attendance.absent',
    bgClass: 'bg-rose-100',
    bgDarkClass: 'dark:bg-rose-900/40',
    borderClass: 'border-rose-300',
    borderDarkClass: 'dark:border-rose-700',
    textClass: 'text-rose-700',
    textDarkClass: 'dark:text-rose-300',
    dotClass: 'bg-rose-500',
    heatLevel: 0,
  },
  EXCUSED: {
    icon: ClipboardList,
    labelKey: 'attendance.excused',
    bgClass: 'bg-amber-100',
    bgDarkClass: 'dark:bg-amber-900/40',
    borderClass: 'border-amber-300',
    borderDarkClass: 'dark:border-amber-700',
    textClass: 'text-amber-700',
    textDarkClass: 'dark:text-amber-300',
    dotClass: 'bg-amber-500',
    heatLevel: 2,
  },
  LATE: {
    icon: Timer,
    labelKey: 'attendance.late',
    bgClass: 'bg-orange-100',
    bgDarkClass: 'dark:bg-orange-900/40',
    borderClass: 'border-orange-300',
    borderDarkClass: 'dark:border-orange-700',
    textClass: 'text-orange-700',
    textDarkClass: 'dark:text-orange-300',
    dotClass: 'bg-orange-500',
    heatLevel: 3,
  },
};

function StatusBadge({ status }: { status: AttendanceStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border
        ${cfg.bgClass} ${cfg.bgDarkClass} ${cfg.borderClass} ${cfg.borderDarkClass}
        ${cfg.textClass} ${cfg.textDarkClass}`}
    >
      <cfg.icon className="w-3 h-3" />
      <span>{t(cfg.labelKey)}</span>
    </span>
  );
}

/* ── Status Toggle Button ──────────────────────────────────────────── */

function StatusToggle({
  currentStatus,
  targetStatus,
  onChange,
  disabled,
}: {
  currentStatus: AttendanceStatus;
  targetStatus: AttendanceStatus;
  onChange: (status: AttendanceStatus) => void;
  disabled?: boolean;
}) {
  const cfg = STATUS_CONFIG[targetStatus];
  const isActive = currentStatus === targetStatus;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.1 }}
            onClick={() => onChange(targetStatus)}
            disabled={disabled}
            className={`
              relative flex items-center justify-center w-9 h-9 rounded-lg border-2 transition-all duration-200
              ${isActive
                ? `${cfg.bgClass} ${cfg.bgDarkClass} ${cfg.borderClass} ${cfg.borderDarkClass} shadow-md`
                : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <cfg.icon className="w-3.5 h-3.5" />
            {isActive && (
              <motion.div
                layoutId="status-ring"
                className="absolute inset-0 rounded-lg ring-2 ring-offset-1 ring-emerald-400 dark:ring-emerald-500"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.3 }}
              />
            )}
          </motion.button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t(cfg.labelKey)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/* ── Monthly Heatmap ───────────────────────────────────────────────── */

function MonthlyHeatmap({ sessions }: { sessions: AttendanceSession[] }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // Build a map of date -> attendance rate
  const dateMap = useMemo(() => {
    const map = new Map<string, { present: number; total: number }>();
    for (const session of sessions) {
      const d = new Date(session.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const existing = map.get(key) || { present: 0, total: 0 };
      for (const record of session.records) {
        existing.total++;
        if (record.status === 'PRESENT' || record.status === 'LATE') {
          existing.present++;
        }
      }
      map.set(key, existing);
    }
    return map;
  }, [sessions]);

  // Generate days of the current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sun
  const adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Mon=0

  const dayLabels = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  const cells: Array<{ day: number | null; dateKey: string | null }> = [];
  // Empty cells for alignment
  for (let i = 0; i < adjustedFirstDay; i++) {
    cells.push({ day: null, dateKey: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, dateKey });
  }

  function getHeatColor(day: number | null, dateKey: string | null): string {
    if (!day || !dateKey) return 'bg-transparent';
    const data = dateMap.get(dateKey);
    if (!data || data.total === 0) return 'bg-gray-100 dark:bg-gray-800';
    const rate = data.present / data.total;
    if (rate >= 0.9) return 'bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-500 dark:to-emerald-600';
    if (rate >= 0.7) return 'bg-gradient-to-br from-emerald-400 to-teal-500 dark:from-emerald-500 dark:to-emerald-600';
    if (rate >= 0.5) return 'bg-gradient-to-br from-emerald-300 to-emerald-400 dark:from-emerald-700 dark:to-emerald-800';
    if (rate >= 0.3) return 'bg-gradient-to-br from-amber-200 to-amber-300 dark:from-emerald-800 dark:to-emerald-900';
    return 'bg-gradient-to-br from-rose-300 to-rose-400 dark:from-rose-700 dark:to-rose-800';
  }

  return (
    <Card className="border-0 shadow-lg rounded-xl bg-gradient-to-br from-white to-emerald-50/30 dark:from-gray-900 dark:to-emerald-950/20 overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-emerald-50/50 to-teal-50/30 dark:from-emerald-900/10 dark:to-teal-900/5">
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarCheck className="h-5 w-5 text-emerald-500" />
          {t('attendance.calendar')} — {monthNames[month]} {year}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {dayLabels.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, i) => (
            <TooltipProvider key={i}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`aspect-square rounded-sm flex items-center justify-center text-xs
                      ${getHeatColor(cell.day, cell.dateKey)}
                      ${cell.day ? 'hover:ring-2 hover:ring-emerald-400 hover:scale-110 transition-all duration-150 cursor-default' : ''}
                    `}
                  >
                    {cell.day && (
                      <span className="text-gray-700 dark:text-gray-300 font-medium">
                        {cell.day}
                      </span>
                    )}
                  </div>
                </TooltipTrigger>
                {cell.dateKey && cell.day && (
                  <TooltipContent>
                    {(() => {
                      const data = dateMap.get(cell.dateKey);
                      if (!data || data.total === 0) return <p>{t('attendance.no_sessions')}</p>;
                      const rate = Math.round((data.present / data.total) * 100);
                      return (
                        <p>
                          {t('attendance.rate')}: {rate}% ({data.present}/{data.total})
                        </p>
                      );
                    })()}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-4 pt-3 border-t border-emerald-100/60 dark:border-emerald-900/30 text-xs text-muted-foreground">
          <span>{t('attendance.absent')}</span>
          <div className="flex gap-0.5">
            <div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-800" />
            <div className="w-3 h-3 rounded-sm bg-gradient-to-br from-rose-300 to-rose-400 dark:from-rose-700 dark:to-rose-800" />
            <div className="w-3 h-3 rounded-sm bg-gradient-to-br from-amber-200 to-amber-300 dark:from-emerald-800 dark:to-emerald-900" />
            <div className="w-3 h-3 rounded-sm bg-gradient-to-br from-emerald-300 to-emerald-400 dark:from-emerald-700 dark:to-emerald-800" />
            <div className="w-3 h-3 rounded-sm bg-gradient-to-br from-emerald-400 to-teal-500 dark:from-emerald-500 dark:to-emerald-600" />
            <div className="w-3 h-3 rounded-sm bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-500 dark:to-emerald-600" />
          </div>
          <span>{t('attendance.present')}</span>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Stats Cards ───────────────────────────────────────────────────── */

function StatsCards({ sessions }: { sessions: AttendanceSession[] }) {
  const stats = useMemo(() => {
    let total = 0;
    let present = 0;
    let absent = 0;
    let excused = 0;
    let late = 0;

    for (const session of sessions) {
      for (const record of session.records) {
        total++;
        if (record.status === 'PRESENT') present++;
        else if (record.status === 'ABSENT') absent++;
        else if (record.status === 'EXCUSED') excused++;
        else if (record.status === 'LATE') late++;
      }
    }

    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

    return { total, present, absent, excused, late, rate };
  }, [sessions]);

  const cards = [
    {
      label: t('attendance.rate'),
      value: `${stats.rate}%`,
      icon: BarChart3,
      gradient: 'from-emerald-500 to-teal-600',
      border: 'border-emerald-200 dark:border-emerald-800',
    },
    {
      label: t('attendance.present_count'),
      value: stats.present,
      icon: CheckCircle2,
      gradient: 'from-emerald-400 to-green-500',
      border: 'border-emerald-200 dark:border-emerald-800',
    },
    {
      label: t('attendance.absent_count'),
      value: stats.absent,
      icon: XCircle,
      gradient: 'from-rose-400 to-red-500',
      border: 'border-rose-200 dark:border-rose-800',
    },
    {
      label: t('attendance.excused_count'),
      value: stats.excused,
      icon: ClipboardList,
      gradient: 'from-amber-400 to-yellow-500',
      border: 'border-amber-200 dark:border-amber-800',
    },
    {
      label: t('attendance.late_count_short'),
      value: stats.late,
      icon: Timer,
      gradient: 'from-orange-400 to-amber-500',
      border: 'border-orange-200 dark:border-orange-800',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((card, idx) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: idx * 0.06 }}
          whileHover={{ y: -2 }}
        >
          <Card className={`border-2 ${card.border} shadow-md hover:shadow-lg transition-shadow rounded-xl overflow-hidden`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <card.icon className="w-4 h-4" />
                <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
              </div>
              <div className={`text-2xl font-bold bg-gradient-to-r ${card.gradient} bg-clip-text text-transparent`}>
                {card.value}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

/* ── Session Detail (Attendance Grid) ──────────────────────────────── */

function SessionDetail({
  session,
  onBack,
  onUpdate,
  onDelete,
  onComplete,
  onReopen,
}: {
  session: AttendanceSession;
  onBack: () => void;
  onUpdate: (session: AttendanceSession) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
  onReopen: (id: string) => void;
}) {
  const [localRecords, setLocalRecords] = useState<AttendanceRecord[]>(session.records);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalRecords(session.records);
  }, [session.records]);

  const handleStatusChange = useCallback((recordId: string, newStatus: AttendanceStatus) => {
    setLocalRecords((prev) =>
      prev.map((r) => (r.id === recordId ? { ...r, status: newStatus } : r))
    );
  }, []);

  const handleCommentChange = useCallback((recordId: string, comment: string) => {
    setLocalRecords((prev) =>
      prev.map((r) => (r.id === recordId ? { ...r, comment } : r))
    );
  }, []);

  const handleArrivalTimeChange = useCallback((recordId: string, arrivalTime: string) => {
    setLocalRecords((prev) =>
      prev.map((r) => (r.id === recordId ? { ...r, arrivalTime } : r))
    );
  }, []);

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const changedRecords = localRecords.filter((localRecord) => {
        const original = session.records.find((r) => r.id === localRecord.id);
        if (!original) return true;
        return (
          localRecord.status !== original.status ||
          localRecord.comment !== original.comment ||
          localRecord.arrivalTime !== original.arrivalTime
        );
      });

      if (changedRecords.length > 0) {
        const updated = await updateAttendanceSession(session.id, {
          records: changedRecords.map((r) => ({
            id: r.id,
            status: r.status,
            arrivalTime: r.arrivalTime ?? undefined,
            comment: r.comment ?? undefined,
          })),
        });
        onUpdate(updated);
      }
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  const isOpen = session.status === 'OPEN';

  // Session stats
  const sessionStats = useMemo(() => {
    const total = localRecords.length;
    const present = localRecords.filter((r) => r.status === 'PRESENT').length;
    const absent = localRecords.filter((r) => r.status === 'ABSENT').length;
    const excused = localRecords.filter((r) => r.status === 'EXCUSED').length;
    const late = localRecords.filter((r) => r.status === 'LATE').length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    return { total, present, absent, excused, late, rate };
  }, [localRecords]);

  const sessionDate = new Date(session.date);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ChevronRight className="h-4 w-4 rotate-180" />
          </Button>
          <div>
            <h3 className="text-lg font-semibold">
              {t('attendance.session_for')} {sessionDate.toLocaleDateString()}
              {session.period && ` — ${session.period}`}
              {session.subject && ` — ${session.subject.name}`}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant={isOpen ? 'outline' : 'default'}
                className={
                  isOpen
                    ? 'border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                }
              >
                {isOpen ? t('attendance.open') : t('attendance.completed')}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {t('attendance.rate')}: {sessionStats.rate}%
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isOpen && (
            <>
              <Button
                size="sm"
                onClick={handleSaveAll}
                disabled={saving}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md shadow-emerald-300/20 rounded-xl"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                {t('attendance.save_all')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onComplete(session.id)}
                className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-950"
              >
                <Check className="h-4 w-4 mr-1" />
                {t('attendance.complete_session')}
              </Button>
            </>
          )}
          {!isOpen && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReopen(session.id)}
              className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-950"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              {t('attendance.reopen_session')}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDelete(session.id)}
            className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-950"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            {t('attendance.delete_session')}
          </Button>
        </div>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: t('attendance.present_count'), value: sessionStats.present, color: 'text-emerald-600 dark:text-emerald-400' },
          { label: t('attendance.absent_count'), value: sessionStats.absent, color: 'text-rose-600 dark:text-rose-400' },
          { label: t('attendance.excused_count'), value: sessionStats.excused, color: 'text-amber-600 dark:text-amber-400' },
          { label: t('attendance.late_count_short'), value: sessionStats.late, color: 'text-orange-600 dark:text-orange-400' },
        ].map((s) => (
          <div
            key={s.label}
            className="text-center p-3 rounded-xl bg-gradient-to-br from-gray-50 to-gray-50/50 dark:from-gray-800/60 dark:to-gray-800/30 border border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow"
          >
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Attendance Grid */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>{t('attendance.total_students')}</TableHead>
                  <TableHead className="text-center">{t('attendance.status')}</TableHead>
                  <TableHead className="w-48">{t('attendance.arrival_time')}</TableHead>
                  <TableHead className="w-48">{t('attendance.comment')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {localRecords.map((record, idx) => (
                  <React.Fragment key={record.id}>
                    <TableRow className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                      <TableCell className="text-muted-foreground text-sm">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {record.student.lastName}, {record.student.firstName}
                          </span>
                          <StatusBadge status={record.status} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          {(['PRESENT', 'ABSENT', 'EXCUSED', 'LATE'] as AttendanceStatus[]).map(
                            (status) => (
                              <StatusToggle
                                key={status}
                                currentStatus={record.status}
                                targetStatus={status}
                                onChange={(s) => handleStatusChange(record.id, s)}
                                disabled={!isOpen}
                              />
                            )
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {record.status === 'LATE' ? (
                          <Input
                            type="time"
                            value={record.arrivalTime ?? ''}
                            onChange={(e) => handleArrivalTimeChange(record.id, e.target.value)}
                            disabled={!isOpen}
                            className="h-8 text-sm"
                          />
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={record.comment ?? ''}
                          onChange={(e) => handleCommentChange(record.id, e.target.value)}
                          disabled={!isOpen}
                          placeholder={t('attendance.comment')}
                          className="h-8 text-sm"
                        />
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Main Attendance View ──────────────────────────────────────────── */

export default function AttendanceView() {
  const currentClassId = useAppStore((s) => s.currentClassId);
  const setCurrentClass = useAppStore((s) => s.setCurrentClass);

  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Quick stats for the empty state (loaded only when no class is selected)
  const [quickStats, setQuickStats] = useState<{
    totalSessionsMonth: number;
    avgRate: number | null;
    commonReason: string | null;
    loading: boolean;
    hasClasses: boolean;
  }>({ totalSessionsMonth: 0, avgRate: null, commonReason: null, loading: false, hasClasses: false });

  // New session form
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newSubjectId, setNewSubjectId] = useState('');
  const [newPeriod, setNewPeriod] = useState('');
  const [creating, setCreating] = useState(false);

  // Load classes
  useEffect(() => {
    fetchClasses()
      .then((data) => setClasses(data))
      .catch(console.error);
  }, []);

  // Load subjects when class is selected
  useEffect(() => {
    if (currentClassId) {
      fetchSubjects()
        .then((data) => setSubjects(data))
        .catch(console.error);
    }
  }, [currentClassId]);

  // Load school-wide attendance quick stats when no class is selected.
  // We fetch sessions for the current month for each class in parallel (capped at 8 classes).
  useEffect(() => {
    if (currentClassId) return;
    if (classes.length === 0) {
      setQuickStats({ totalSessionsMonth: 0, avgRate: null, commonReason: null, loading: false, hasClasses: false });
      return;
    }
    if (quickStats.loading || quickStats.hasClasses) return;

    let cancelled = false;
    setQuickStats((s) => ({ ...s, loading: true, hasClasses: true }));

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const from = monthStart.toISOString();
    const to = monthEnd.toISOString();

    const targetClasses = classes.slice(0, 8);
    Promise.all(
      targetClasses.map((c) =>
        fetchAttendanceSessions(c.id, from, to).catch(() => [] as AttendanceSession[])
      )
    )
      .then((results) => {
        if (cancelled) return;
        const allSessions = results.flat();
        const totalSessionsMonth = allSessions.length;
        let presentCount = 0;
        let totalCount = 0;
        const reasonCounts: Record<string, number> = { ABSENT: 0, EXCUSED: 0, LATE: 0 };
        for (const session of allSessions) {
          for (const rec of session.records) {
            totalCount += 1;
            if (rec.status === 'PRESENT') presentCount += 1;
            else if (rec.status in reasonCounts) reasonCounts[rec.status] += 1;
          }
        }
        const avgRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : null;
        let commonReason: string | null = null;
        let maxReasonCount = 0;
        for (const [reason, count] of Object.entries(reasonCounts)) {
          if (count > maxReasonCount) {
            maxReasonCount = count;
            commonReason = reason;
          }
        }
        if (maxReasonCount === 0) commonReason = null;
        setQuickStats({ totalSessionsMonth, avgRate, commonReason, loading: false, hasClasses: true });
      })
      .catch(() => {
        if (!cancelled) setQuickStats((s) => ({ ...s, loading: false }));
      });

    return () => {
      cancelled = true;
    };
  }, [currentClassId, classes, quickStats.loading, quickStats.hasClasses]);

  const reasonLabel = (reason: string | null) => {
    if (reason === 'ABSENT') return t('attendance.absent');
    if (reason === 'EXCUSED') return t('attendance.excused');
    if (reason === 'LATE') return t('attendance.late');
    return t('polish.attendance_no_absences');
  };
  const reasonIcon = (reason: string | null) => {
    if (reason === 'ABSENT') return <XCircle className="w-4 h-4 inline" />;
    if (reason === 'EXCUSED') return <FilePenLine className="w-4 h-4 inline" />;
    if (reason === 'LATE') return <Timer className="w-4 h-4 inline" />;
    return <CheckCircle2 className="w-4 h-4 inline" />;
  };

  // Load sessions when class changes
  const loadSessions = useCallback(async () => {
    if (!currentClassId) return;
    setLoading(true);
    try {
      const data = await fetchAttendanceSessions(currentClassId);
      setSessions(data);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  }, [currentClassId]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleCreateSession = async () => {
    if (!currentClassId) return;
    setCreating(true);
    try {
      const newSession = await createAttendanceSession({
        classGroupId: currentClassId,
        date: newDate,
        subjectId: newSubjectId || undefined,
        period: newPeriod || undefined,
      });
      setSessions((prev) => [newSession, ...prev]);
      setCreateDialogOpen(false);
      setNewDate(new Date().toISOString().split('T')[0]);
      setNewSubjectId('');
      setNewPeriod('');
      // Auto-select the new session
      setSelectedSessionId(newSession.id);
    } catch (error) {
      console.error('Create session error:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateSession = useCallback((updated: AttendanceSession) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s))
    );
  }, []);

  const handleDeleteSession = async (id: string) => {
    try {
      await deleteAttendanceSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (selectedSessionId === id) setSelectedSessionId(null);
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleCompleteSession = async (id: string) => {
    try {
      const updated = await updateAttendanceSession(id, { status: 'COMPLETED' });
      handleUpdateSession(updated);
    } catch (error) {
      console.error('Complete error:', error);
    }
  };

  const handleReopenSession = async (id: string) => {
    try {
      const updated = await updateAttendanceSession(id, { status: 'OPEN' });
      handleUpdateSession(updated);
    } catch (error) {
      console.error('Reopen error:', error);
    }
  };

  const selectedSession = sessions.find((s) => s.id === selectedSessionId);

  // If viewing a specific session, show the detail view
  if (selectedSession) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <SessionDetail
          session={selectedSession}
          onBack={() => setSelectedSessionId(null)}
          onUpdate={handleUpdateSession}
          onDelete={handleDeleteSession}
          onComplete={handleCompleteSession}
          onReopen={handleReopenSession}
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent flex items-center gap-2">
            <CalendarCheck className="h-8 w-8 text-emerald-500" />
            {t('attendance.title')}
          </h1>
          <p className="text-emerald-600/60 dark:text-emerald-400/40 mt-1">{t('attendance.subtitle')}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Class selector */}
          <Select
            value={currentClassId ?? ''}
            onValueChange={(v) => setCurrentClass(v)}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t('attendance.select_class')} />
            </SelectTrigger>
            <SelectContent>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* New session button */}
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md shadow-emerald-300/20 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
                  disabled={!currentClassId}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t('attendance.new_session')}
                </Button>
              </motion.div>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('attendance.new_session')}</DialogTitle>
                <DialogDescription>
                  {t('attendance.subtitle')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>{t('attendance.date')}</Label>
                  <Input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('attendance.period')}</Label>
                  <Input
                    value={newPeriod}
                    onChange={(e) => setNewPeriod(e.target.value)}
                    placeholder="z.B. 1. Stunde"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('attendance.subject')}</Label>
                  <Select value={newSubjectId} onValueChange={setNewSubjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subj) => (
                        <SelectItem key={subj.id} value={subj.id}>
                          {subj.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleCreateSession}
                  disabled={creating || !newDate}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md shadow-emerald-300/20 rounded-xl"
                >
                  {creating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  {t('attendance.new_session')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* No class selected */}
      {!currentClassId && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="text-center py-16">
            <div className="flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 mx-auto mb-5 shadow-lg shadow-emerald-200/40 dark:shadow-emerald-900/20">
              <CalendarCheck className="h-12 w-12 text-emerald-500 dark:text-emerald-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {t('polish.empty_title_attendance')}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {t('polish.empty_subtitle_attendance')}
            </p>
          </div>

          {/* Quick Stats card — fills the empty space with school-wide attendance stats */}
          <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-emerald-400 overflow-hidden">
            <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10 dark:to-transparent">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="h-4 w-4" />
                </div>
                {t('polish.attendance_quick_stats_title')}
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1 hidden sm:inline">
                  · {t('polish.attendance_quick_stats_subtitle')}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {classes.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('polish.attendance_no_classes_hint')}
                  </p>
                </div>
              ) : quickStats.loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Skeleton className="h-24 rounded-xl" />
                  <Skeleton className="h-24 rounded-xl" />
                  <Skeleton className="h-24 rounded-xl" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Total sessions this month */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50/60 to-emerald-50/0 dark:from-emerald-900/15 dark:to-emerald-900/0 border border-emerald-100/60 dark:border-emerald-900/30">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-sm">
                        <CalendarCheck className="h-4 w-4" />
                      </div>
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-emerald-600/70 dark:text-emerald-400/60">
                        {t('polish.attendance_total_sessions_month')}
                      </p>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      {quickStats.totalSessionsMonth}
                    </p>
                  </div>
                  {/* Average attendance rate */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-teal-50/60 to-teal-50/0 dark:from-teal-900/15 dark:to-teal-900/0 border border-teal-100/60 dark:border-teal-900/30">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-teal-500 text-white shadow-sm">
                        <TrendingUp className="h-4 w-4" />
                      </div>
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-teal-600/70 dark:text-teal-400/60">
                        {t('polish.attendance_avg_rate')}
                      </p>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      {quickStats.avgRate === null ? '—' : `${quickStats.avgRate}%`}
                    </p>
                  </div>
                  {/* Most common absence reason */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50/60 to-amber-50/0 dark:from-amber-900/15 dark:to-amber-900/0 border border-amber-100/60 dark:border-amber-900/30">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-sm">
                        <AlertCircle className="h-4 w-4" />
                      </div>
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-amber-600/70 dark:text-amber-400/60">
                        {t('polish.attendance_common_reason')}
                      </p>
                    </div>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                      <span>{reasonIcon(quickStats.commonReason)}</span>
                      <span className="truncate">{reasonLabel(quickStats.commonReason)}</span>
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Loading */}
      {currentClassId && loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      )}

      {/* Content */}
      {currentClassId && !loading && (
        <Tabs defaultValue="sessions" className="space-y-4">
          <TabsList className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex flex-wrap gap-1 h-auto p-1">
            <TabsTrigger value="sessions" className="rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
              {t('attendance.status')}
            </TabsTrigger>
            <TabsTrigger value="stats" className="rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
              {t('attendance.stats')}
            </TabsTrigger>
            <TabsTrigger value="calendar" className="rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
              {t('attendance.calendar')}
            </TabsTrigger>
          </TabsList>

          {/* Sessions List Tab */}
          <TabsContent value="sessions" className="space-y-3">
            {sessions.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <div className="flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 mx-auto mb-5 shadow-md shadow-emerald-200/40 dark:shadow-emerald-900/20">
                  <CalendarCheck className="h-10 w-10 text-emerald-500 dark:text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">{t('polish.empty_title_no_data')}</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">{t('attendance.empty_action_hint')}</p>
              </motion.div>
            ) : (
              <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                <AnimatePresence>
                  {sessions.map((session, idx) => {
                    const sessionDate = new Date(session.date);
                    const totalRecords = session.records.length;
                    const presentCount = session.records.filter((r) => r.status === 'PRESENT').length;
                    const absentCount = session.records.filter((r) => r.status === 'ABSENT').length;
                    const excusedCount = session.records.filter((r) => r.status === 'EXCUSED').length;
                    const lateCount = session.records.filter((r) => r.status === 'LATE').length;
                    const rate = totalRecords > 0 ? Math.round(((presentCount + lateCount) / totalRecords) * 100) : 0;

                    return (
                      <motion.div
                        key={session.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <Card
                          className="cursor-pointer hover:shadow-lg transition-all border-0 shadow-md
                            bg-gradient-to-r from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50
                            hover:from-emerald-50/30 hover:to-teal-50/20 dark:hover:from-emerald-950/20 dark:hover:to-teal-950/10"
                          onClick={() => setSelectedSessionId(session.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                                  <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                                    {sessionDate.getDate()}
                                  </span>
                                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase">
                                    {sessionDate.toLocaleDateString(undefined, { month: 'short' })}
                                  </span>
                                </div>
                                <div>
                                  <div className="font-semibold flex items-center gap-2">
                                    {sessionDate.toLocaleDateString()}
                                    {session.period && (
                                      <Badge variant="outline" className="text-xs">
                                        {session.period}
                                      </Badge>
                                    )}
                                    {session.subject && (
                                      <Badge variant="outline" className="text-xs">
                                        {session.subject.name}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-sm text-muted-foreground mt-0.5">
                                    {session.teacher.firstName} {session.teacher.lastName}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                {/* Mini status bars */}
                                <div className="flex items-center gap-1">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-md">
                                          <CheckCircle2 className="w-3.5 h-3.5" />
                                          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">{presentCount}</span>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>{t('attendance.present')}</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-900/30 px-2 py-1 rounded-md">
                                          <XCircle className="w-3.5 h-3.5" />
                                          <span className="text-xs font-medium text-rose-700 dark:text-rose-300">{absentCount}</span>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>{t('attendance.absent')}</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded-md">
                                          <ClipboardList className="w-3.5 h-3.5" />
                                          <span className="text-xs font-medium text-amber-700 dark:text-amber-300">{excusedCount}</span>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>{t('attendance.excused')}</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="flex items-center gap-1 bg-orange-50 dark:bg-orange-900/30 px-2 py-1 rounded-md">
                                          <Timer className="w-3.5 h-3.5" />
                                          <span className="text-xs font-medium text-orange-700 dark:text-orange-300">{lateCount}</span>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>{t('attendance.late')}</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>

                                {/* Rate badge */}
                                <div
                                  className={`text-sm font-bold px-2 py-1 rounded-lg ${
                                    rate >= 90
                                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                                      : rate >= 70
                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                                        : 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300'
                                  }`}
                                >
                                  {rate}%
                                </div>

                                {/* Session status */}
                                <Badge
                                  variant={session.status === 'OPEN' ? 'outline' : 'default'}
                                  className={
                                    session.status === 'OPEN'
                                      ? 'border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300'
                                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                                  }
                                >
                                  {session.status === 'OPEN' ? t('attendance.open') : t('attendance.completed')}
                                </Badge>

                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats" className="space-y-4">
            <StatsCards sessions={sessions} />
          </TabsContent>

          {/* Calendar Tab */}
          <TabsContent value="calendar" className="space-y-4">
            <MonthlyHeatmap sessions={sessions} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
