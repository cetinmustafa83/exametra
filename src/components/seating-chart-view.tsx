'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid,
  Users,
  Shuffle,
  Sparkles,
  Save,
  Plus,
  Trash2,
  GripVertical,
  DoorOpen,
  AppWindow as WindowsIcon,
  X,
  Search,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Download,
  Printer,
  Settings2,
  Eye,
  User as UserIcon,
  Rows3,
  CircleDot,
  Square,
  LayoutDashboard,
  Info,
  CheckCircle2,
  AlertCircle,
  ArrowRightLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { toast } from 'sonner';

// ── Types ─────────────────────────────────────────────────────────────

interface SeatingPosition {
  studentId: string;
  row: number;
  col: number;
}

interface StudentInfo {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  avatarInitials?: string;
  behaviorScore?: number;
}

interface SeatingChartType {
  id: string;
  name: string;
  layoutType: string;
  rows: number;
  columns: number;
  gap: number;
  arrangement: SeatingPosition[];
  showDoor: boolean;
  showWindows: boolean;
  doorPosition: string;
  windowPosition: string;
  isTemplate: boolean;
  isDefault: boolean;
  notes?: string;
  classGroup: { id: string; name: string; gradeLevel: number };
  teacher: { id: string; firstName: string; lastName: string };
  createdAt: string;
  updatedAt: string;
}

interface ClassGroupType {
  id: string;
  name: string;
  gradeLevel: number;
}

// ── Gradient backgrounds for student avatars ────────────────────────────

const AVATAR_GRADIENTS = [
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500',
  'from-violet-400 to-purple-500',
  'from-cyan-400 to-sky-500',
  'from-lime-400 to-green-500',
  'from-fuchsia-400 to-pink-500',
  'from-yellow-400 to-amber-500',
];

function getAvatarGradient(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

// ── Layout Templates ──────────────────────────────────────────────────

type LayoutType = 'rows' | 'groups' | 'u-shape' | 'circle' | 'custom';

interface LayoutTemplate {
  key: LayoutType;
  labelKey: string;
  icon: React.ElementType;
  description: string;
}

const LAYOUT_TEMPLATES: LayoutTemplate[] = [
  { key: 'rows', labelKey: 'seating.layout_rows', icon: Rows3, description: 'Traditional rows' },
  { key: 'groups', labelKey: 'seating.layout_groups', icon: LayoutGrid, description: 'Student groups' },
  { key: 'u-shape', labelKey: 'seating.layout_ushape', icon: CircleDot, description: 'U-shape arrangement' },
  { key: 'circle', labelKey: 'seating.layout_circle', icon: CircleDot, description: 'Circle arrangement' },
  { key: 'custom', labelKey: 'seating.layout_custom', icon: Square, description: 'Free custom layout' },
];

// ── Main Component ─────────────────────────────────────────────────────

export default function SeatingChartView() {
  const currentUser = useAppStore((s) => s.currentUser);
  const currentClassId = useAppStore((s) => s.currentClassId);
  const setCurrentClass = useAppStore((s) => s.setCurrentClass);
  const navigateToStudentDetail = useAppStore((s) => s.navigateToStudentDetail);

  // Data state
  const [classes, setClasses] = useState<ClassGroupType[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>(currentClassId || '');
  const [charts, setCharts] = useState<SeatingChartType[]>([]);
  const [activeChart, setActiveChart] = useState<SeatingChartType | null>(null);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Layout state
  const [gridRows, setGridRows] = useState(5);
  const [gridCols, setGridCols] = useState(5);
  const [layoutType, setLayoutType] = useState<LayoutType>('rows');
  const [showDoor, setShowDoor] = useState(true);
  const [showWindows, setShowWindows] = useState(true);
  const [doorPosition, setDoorPosition] = useState('left');
  const [windowPosition, setWindowPosition] = useState('right');

  // Interaction state
  const [draggedStudentId, setDraggedStudentId] = useState<string | null>(null);
  const [dragSourceRow, setDragSourceRow] = useState<number | null>(null);
  const [dragSourceCol, setDragSourceCol] = useState<number | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<{ row: number; col: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newChartName, setNewChartName] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [studentPopoverOpen, setStudentPopoverOpen] = useState<string | null>(null);

  // Local arrangement state for drag-and-drop
  const [localArrangement, setLocalArrangement] = useState<SeatingPosition[]>([]);

  const gridRef = useRef<HTMLDivElement>(null);

  // ── Derived state ────────────────────────────────────────────────────

  const assignedStudentIds = useMemo(
    () => new Set(localArrangement.map((a) => a.studentId)),
    [localArrangement]
  );

  const unassignedStudents = useMemo(
    () => students.filter((s) => !assignedStudentIds.has(s.id)),
    [students, assignedStudentIds]
  );

  const filteredUnassigned = useMemo(() => {
    if (!searchQuery) return unassignedStudents;
    const q = searchQuery.toLowerCase();
    return unassignedStudents.filter(
      (s) =>
        s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q)
    );
  }, [unassignedStudents, searchQuery]);

  const isReadOnly = useMemo(
    () => currentUser?.role === 'STUDENT' || currentUser?.role === 'PARENT',
    [currentUser]
  );

  // ── Get student at position ──────────────────────────────────────────

  const getStudentAtPos = useCallback(
    (row: number, col: number): SeatingPosition | undefined => {
      return localArrangement.find((a) => a.row === row && a.col === col);
    },
    [localArrangement]
  );

  const getStudentInfo = useCallback(
    (studentId: string): StudentInfo | undefined => {
      return students.find((s) => s.id === studentId);
    },
    [students]
  );

  // ── Generate grid cells based on layout type ─────────────────────────

  const gridCells = useMemo(() => {
    const cells: Array<{ row: number; col: number; active: boolean }> = [];

    if (layoutType === 'rows') {
      for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
          cells.push({ row: r, col: c, active: true });
        }
      }
    } else if (layoutType === 'groups') {
      // Groups of 4 (2x2)
      for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
          // Add gap between groups
          const isGroupGap = (c % 3 === 2) || (r % 3 === 2);
          cells.push({ row: r, col: c, active: !isGroupGap });
        }
      }
    } else if (layoutType === 'u-shape') {
      // U-shape: first row full, then first and last column only
      for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
          const isActive = r === 0 || c === 0 || c === gridCols - 1;
          cells.push({ row: r, col: c, active: isActive });
        }
      }
    } else if (layoutType === 'circle') {
      // Circle: only cells within a circular boundary
      const centerR = gridRows / 2;
      const centerC = gridCols / 2;
      const radius = Math.min(gridRows, gridCols) / 2;
      for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
          const dist = Math.sqrt((r - centerR) ** 2 + (c - centerC) ** 2);
          const isOuter = dist >= radius - 1.5 && dist <= radius + 0.5;
          cells.push({ row: r, col: c, active: isOuter });
        }
      }
    } else {
      // Custom: all cells active
      for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
          cells.push({ row: r, col: c, active: true });
        }
      }
    }

    return cells;
  }, [gridRows, gridCols, layoutType]);

  // ── Fetch classes ────────────────────────────────────────────────────

  useEffect(() => {
    if (!currentUser?.schoolId) return;
    apiGet<{ classes: ClassGroupType[] }>(`/api/classes?schoolId=${currentUser.schoolId}`)
      .then((data) => {
        const classList = data.classes || [];
        setClasses(classList);
        if (!selectedClassId && classList.length > 0) {
          const defaultClass = classList[0];
          setSelectedClassId(defaultClass.id);
          setCurrentClass(defaultClass.id);
        }
      })
      .catch(() => {
        toast.error(t('error.generic'));
      });
  }, [currentUser?.schoolId]);

  // ── Fetch charts when class changes ──────────────────────────────────

  useEffect(() => {
    if (!selectedClassId || !currentUser?.schoolId) return;
    setLoading(true);
    apiGet<{ charts: SeatingChartType[] }>(
      `/api/seating-charts?schoolId=${currentUser.schoolId}&classGroupId=${selectedClassId}`
    )
      .then((data) => {
        const chartList = data.charts || [];
        setCharts(chartList);
        // Load the default chart if one exists
        const defaultChart = chartList.find((c: SeatingChartType) => c.isDefault);
        if (defaultChart) {
          loadChart(defaultChart.id);
        } else if (chartList.length > 0) {
          loadChart(chartList[0].id);
        } else {
          setActiveChart(null);
          setLocalArrangement([]);
          setStudents([]);
        }
      })
      .catch(() => {
        toast.error(t('error.generic'));
      })
      .finally(() => setLoading(false));
  }, [selectedClassId, currentUser?.schoolId]);

  // ── Load chart with students ─────────────────────────────────────────

  const loadChart = useCallback(async (chartId: string) => {
    setLoading(true);
    try {
      const data = await apiGet<SeatingChartType & { students: StudentInfo[] }>(
        `/api/seating-charts/${chartId}`
      );
      setActiveChart(data);
      setStudents(data.students || []);
      setLocalArrangement(data.arrangement || []);
      setGridRows(data.rows);
      setGridCols(data.columns);
      setLayoutType(data.layoutType as LayoutType);
      setShowDoor(data.showDoor);
      setShowWindows(data.showWindows);
      setDoorPosition(data.doorPosition);
      setWindowPosition(data.windowPosition);
    } catch {
      toast.error(t('error.generic'));
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Create new chart ─────────────────────────────────────────────────

  const handleCreateChart = useCallback(async () => {
    if (!newChartName.trim() || !selectedClassId || !currentUser?.schoolId) return;
    try {
      const chart = await apiPost<SeatingChartType>('/api/seating-charts', {
        name: newChartName.trim(),
        classGroupId: selectedClassId,
        schoolId: currentUser.schoolId,
        layoutType,
        rows: gridRows,
        columns: gridCols,
        isDefault: charts.length === 0,
      });
      setCharts((prev) => [...prev, chart]);
      setActiveChart(chart);
      setLocalArrangement([]);
      setNewChartName('');
      setCreateDialogOpen(false);
      toast.success(t('seating.chart_created'));
      // Reload students for this chart
      loadChart(chart.id);
    } catch {
      toast.error(t('error.generic'));
    }
  }, [newChartName, selectedClassId, currentUser?.schoolId, layoutType, gridRows, gridCols, charts.length, loadChart]);

  // ── Save arrangement ─────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!activeChart || isReadOnly) return;
    setSaving(true);
    try {
      await apiPut(`/api/seating-charts/${activeChart.id}`, {
        arrangement: localArrangement,
        layoutType,
        rows: gridRows,
        columns: gridCols,
        showDoor,
        showWindows,
        doorPosition,
        windowPosition,
      });
      toast.success(t('seating.arrangement_saved'));
      // Refresh charts list
      const data = await apiGet<{ charts: SeatingChartType[] }>(
        `/api/seating-charts?schoolId=${currentUser?.schoolId}&classGroupId=${selectedClassId}`
      );
      setCharts(data.charts || []);
    } catch {
      toast.error(t('error.generic'));
    } finally {
      setSaving(false);
    }
  }, [activeChart, localArrangement, layoutType, gridRows, gridCols, showDoor, showWindows, doorPosition, windowPosition, isReadOnly, currentUser?.schoolId, selectedClassId]);

  // ── Delete chart ─────────────────────────────────────────────────────

  const handleDeleteChart = useCallback(async () => {
    if (!activeChart || isReadOnly) return;
    try {
      await apiDelete(`/api/seating-charts/${activeChart.id}`);
      setCharts((prev) => prev.filter((c) => c.id !== activeChart.id));
      setActiveChart(null);
      setLocalArrangement([]);
      setDeleteDialogOpen(false);
      toast.success(t('seating.chart_deleted'));
      // Load another chart if available
      if (charts.length > 1) {
        const remaining = charts.filter((c) => c.id !== activeChart.id);
        if (remaining.length > 0) {
          loadChart(remaining[0].id);
        }
      }
    } catch {
      toast.error(t('error.generic'));
    }
  }, [activeChart, isReadOnly, charts, loadChart]);

  // ── Arrange actions ──────────────────────────────────────────────────

  const handleArrangeAction = useCallback(
    async (action: string) => {
      if (!activeChart || isReadOnly) return;
      try {
        const result = await apiPut<{ success: boolean; arrangement: SeatingPosition[] }>(
          `/api/seating-charts/${activeChart.id}/arrange`,
          { action }
        );
        if (result.arrangement) {
          setLocalArrangement(result.arrangement);
        }
        toast.success(t('seating.arrangement_updated'));
      } catch {
        toast.error(t('error.generic'));
      }
    },
    [activeChart, isReadOnly]
  );

  // ── Drag-and-drop handlers ───────────────────────────────────────────

  const handleDragStart = useCallback(
    (studentId: string, fromRow?: number, fromCol?: number) => {
      if (isReadOnly) return;
      setDraggedStudentId(studentId);
      setDragSourceRow(fromRow ?? null);
      setDragSourceCol(fromCol ?? null);
    },
    [isReadOnly]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedStudentId(null);
    setDragSourceRow(null);
    setDragSourceCol(null);
    setSelectedSeat(null);
  }, []);

  const handleDropOnSeat = useCallback(
    (row: number, col: number) => {
      if (!draggedStudentId || isReadOnly) return;

      setLocalArrangement((prev) => {
        const newArr = [...prev];
        const existingAtTarget = newArr.find((a) => a.row === row && a.col === col);
        const sourceIndex = newArr.findIndex((a) => a.studentId === draggedStudentId);

        if (sourceIndex !== -1) {
          // Student is being moved from another seat
          if (existingAtTarget && existingAtTarget.studentId !== draggedStudentId) {
            // Swap: move target student to source position
            if (dragSourceRow !== null && dragSourceCol !== null) {
              existingAtTarget.row = dragSourceRow;
              existingAtTarget.col = dragSourceCol;
            } else {
              // Remove target student (they become unassigned)
              const targetIdx = newArr.findIndex((a) => a.studentId === existingAtTarget.studentId);
              newArr.splice(targetIdx, 1);
            }
          }
          newArr[sourceIndex] = { ...newArr[sourceIndex], row, col };
        } else {
          // Student is being placed from unassigned list
          if (existingAtTarget) {
            // Remove the student at target (they become unassigned)
            const targetIdx = newArr.findIndex((a) => a.studentId === existingAtTarget.studentId);
            newArr.splice(targetIdx, 1);
          }
          newArr.push({ studentId: draggedStudentId, row, col });
        }

        return newArr;
      });

      handleDragEnd();
    },
    [draggedStudentId, dragSourceRow, dragSourceCol, isReadOnly, handleDragEnd]
  );

  // Click-to-assign: select a student, then click a seat
  const handleSeatClick = useCallback(
    (row: number, col: number) => {
      if (isReadOnly) return;

      if (selectedSeat) {
        // Already have a seat selected, swap
        const firstSeat = localArrangement.find(
          (a) => a.row === selectedSeat.row && a.col === selectedSeat.col
        );
        const secondSeat = localArrangement.find((a) => a.row === row && a.col === col);

        setLocalArrangement((prev) => {
          const newArr = prev.map((a) => ({ ...a }));
          if (firstSeat) {
            const idx = newArr.findIndex((a) => a.studentId === firstSeat.studentId);
            newArr[idx] = { ...newArr[idx], row, col };
          }
          if (secondSeat) {
            const idx = newArr.findIndex((a) => a.studentId === secondSeat.studentId);
            newArr[idx] = { ...newArr[idx], row: selectedSeat.row, col: selectedSeat.col };
          }
          return newArr;
        });

        setSelectedSeat(null);
        return;
      }

      const seatAssignment = getStudentAtPos(row, col);
      if (seatAssignment) {
        // Select this seat for swapping
        setSelectedSeat({ row, col });
        setStudentPopoverOpen(seatAssignment.studentId);
      } else if (draggedStudentId) {
        // Place dragged student
        handleDropOnSeat(row, col);
      }
    },
    [isReadOnly, selectedSeat, localArrangement, getStudentAtPos, draggedStudentId, handleDropOnSeat]
  );

  const handleRemoveFromSeat = useCallback(
    (studentId: string) => {
      if (isReadOnly) return;
      setLocalArrangement((prev) => prev.filter((a) => a.studentId !== studentId));
      setStudentPopoverOpen(null);
    },
    [isReadOnly]
  );

  // ── Print ────────────────────────────────────────────────────────────

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 border-b bg-gradient-to-r from-emerald-50/80 via-teal-50/50 to-transparent dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-transparent print:hidden"
      >
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
            <LayoutGrid className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('seating.title')}</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('seating.subtitle')}</p>
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2 flex-wrap">
          {/* Class selector */}
          <Select value={selectedClassId} onValueChange={(v) => { setSelectedClassId(v); setCurrentClass(v); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('seating.select_class')} />
            </SelectTrigger>
            <SelectContent>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name} ({cls.gradeLevel}. {t('label.grade')})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Chart selector */}
          {charts.length > 0 && (
            <Select
              value={activeChart?.id || ''}
              onValueChange={(v) => loadChart(v)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t('seating.select_chart')} />
              </SelectTrigger>
              <SelectContent>
                {charts.map((chart) => (
                  <SelectItem key={chart.id} value={chart.id}>
                    {chart.name} {chart.isDefault ? `(${t('seating.default')})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {!isReadOnly && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                {t('seating.new_chart')}
              </Button>
              {activeChart && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
        </div>
      </motion.div>

      {/* Main content area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Student sidebar */}
        {showSidebar && !isReadOnly && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-r bg-muted/30 flex flex-col print:hidden"
          >
            <div className="p-3 border-b">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">{t('seating.unassigned_students')}</h3>
                <Badge variant="secondary" className="text-xs">
                  {filteredUnassigned.length}
                </Badge>
              </div>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder={t('action.search')}
                  className="pl-7 h-8 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {filteredUnassigned.length === 0 ? (
                  <div className="text-center text-muted-foreground text-xs py-4">
                    {t('seating.all_students_assigned')}
                  </div>
                ) : (
                  filteredUnassigned.map((student) => (
                    <div
                      key={student.id}
                      draggable
                      onDragStart={() => handleDragStart(student.id)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-grab active:cursor-grabbing
                        hover:bg-accent/50 transition-colors
                        ${draggedStudentId === student.id ? 'opacity-50 ring-2 ring-emerald-500' : ''}
                        ${student.behaviorScore && student.behaviorScore >= 2 ? 'border-l-2 border-amber-400' : ''}
                      `}
                    >
                      <div
                        className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarGradient(student.id)}
                          flex items-center justify-center text-white text-xs font-bold shrink-0`}
                      >
                        {getInitials(student.firstName, student.lastName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {student.firstName} {student.lastName}
                        </div>
                        {student.behaviorScore && student.behaviorScore >= 2 && (
                          <div className="text-xs text-amber-600 flex items-center gap-0.5">
                            <AlertCircle className="h-3 w-3" />
                            {t('seating.behavior_note')}
                          </div>
                        )}
                      </div>
                      <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Quick actions */}
            <div className="p-3 border-t space-y-1">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => handleArrangeAction('assign-all')}
              >
                <Users className="h-3.5 w-3.5 mr-1.5" />
                {t('seating.assign_all')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => handleArrangeAction('randomize')}
              >
                <Shuffle className="h-3.5 w-3.5 mr-1.5" />
                {t('seating.randomize')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => handleArrangeAction('smart-arrange')}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                {t('seating.smart_arrange')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => handleArrangeAction('clear')}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                {t('seating.clear_all')}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Toggle sidebar button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-0 top-1/2 z-10 print:hidden"
          style={{ left: showSidebar ? 252 : 0 }}
          onClick={() => setShowSidebar(!showSidebar)}
        >
          {showSidebar ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>

        {/* Classroom grid */}
        <div className="flex-1 overflow-auto p-4 print:p-2" ref={gridRef}>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            </div>
          ) : !activeChart ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <LayoutGrid className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-lg font-medium">{t('seating.no_chart_title')}</p>
              <p className="text-sm mt-1">{t('seating.no_chart_subtitle')}</p>
              {!isReadOnly && (
                <Button
                  className="mt-4"
                  onClick={() => setCreateDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t('seating.new_chart')}
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center">
              {/* Toolbar */}
              <div className="flex items-center gap-2 mb-4 flex-wrap print:hidden">
                {/* Layout templates */}
                <div className="flex items-center gap-1 mr-2">
                  {LAYOUT_TEMPLATES.map((tmpl) => {
                    const Icon = tmpl.icon;
                    return (
                      <TooltipProvider key={tmpl.key}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant={layoutType === tmpl.key ? 'default' : 'outline'}
                              size="sm"
                              className={layoutType === tmpl.key ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                              onClick={() => setLayoutType(tmpl.key)}
                            >
                              <Icon className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {t(tmpl.labelKey)}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>

                <Separator orientation="vertical" className="h-6" />

                {/* Grid size controls */}
                <div className="flex items-center gap-1">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">
                    {t('seating.rows')}:
                  </Label>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setGridRows(Math.max(2, gridRows - 1))}
                    disabled={isReadOnly}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                  <span className="text-sm font-mono w-6 text-center">{gridRows}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setGridRows(Math.min(10, gridRows + 1))}
                    disabled={isReadOnly}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                </div>

                <div className="flex items-center gap-1">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">
                    {t('seating.columns')}:
                  </Label>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setGridCols(Math.max(2, gridCols - 1))}
                    disabled={isReadOnly}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                  <span className="text-sm font-mono w-6 text-center">{gridCols}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setGridCols(Math.min(10, gridCols + 1))}
                    disabled={isReadOnly}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                </div>

                <Separator orientation="vertical" className="h-6" />

                {/* Settings & actions */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <Settings2 className="h-4 w-4 mr-1" />
                  {t('seating.settings')}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                >
                  <Printer className="h-4 w-4 mr-1" />
                  {t('action.print')}
                </Button>

                {!isReadOnly && (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    {saving ? t('status.processing') : t('action.save')}
                  </Button>
                )}
              </div>

              {/* Settings panel */}
              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="w-full max-w-2xl mb-4 overflow-hidden print:hidden"
                  >
                    <Card>
                      <CardContent className="p-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="showDoor"
                              checked={showDoor}
                              onChange={(e) => setShowDoor(e.target.checked)}
                              className="rounded"
                            />
                            <Label htmlFor="showDoor" className="text-sm flex items-center gap-1">
                              <DoorOpen className="h-3.5 w-3.5" />
                              {t('seating.show_door')}
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="showWindows"
                              checked={showWindows}
                              onChange={(e) => setShowWindows(e.target.checked)}
                              className="rounded"
                            />
                            <Label htmlFor="showWindows" className="text-sm flex items-center gap-1">
                              <WindowsIcon className="h-3.5 w-3.5" />
                              {t('seating.show_windows')}
                            </Label>
                          </div>
                          {showDoor && (
                            <div>
                              <Label className="text-xs text-muted-foreground">{t('seating.door_position')}</Label>
                              <Select value={doorPosition} onValueChange={setDoorPosition}>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="left">{t('seating.pos_left')}</SelectItem>
                                  <SelectItem value="right">{t('seating.pos_right')}</SelectItem>
                                  <SelectItem value="back">{t('seating.pos_back')}</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          {showWindows && (
                            <div>
                              <Label className="text-xs text-muted-foreground">{t('seating.window_position')}</Label>
                              <Select value={windowPosition} onValueChange={setWindowPosition}>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="left">{t('seating.pos_left')}</SelectItem>
                                  <SelectItem value="right">{t('seating.pos_right')}</SelectItem>
                                  <SelectItem value="both">{t('seating.pos_both')}</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Classroom container */}
              <div className="w-full max-w-3xl">
                {/* Chart name */}
                <div className="text-center mb-2">
                  <h2 className="text-lg font-semibold">{activeChart.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {activeChart.classGroup.name}
                    {' '}&middot;{' '}
                    {t('seating.assigned_count', { assigned: String(localArrangement.length), total: String(students.length) })}
                  </p>
                </div>

                {/* Teacher's desk */}
                <div className="flex justify-center mb-4">
                  <div className="w-48 h-10 bg-gradient-to-r from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/40 border-2 border-amber-300 dark:border-amber-700 rounded-lg flex items-center justify-center gap-2 print:border-amber-400">
                    <UserIcon className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                    <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      {t('seating.teacher_desk')}
                    </span>
                  </div>
                </div>

                {/* Classroom area with markers */}
                <div className="relative">
                  {/* Door marker */}
                  {showDoor && (
                    <div
                      className={`absolute z-10 flex items-center gap-0.5 text-xs font-medium text-amber-700 dark:text-amber-300
                        ${doorPosition === 'left' ? '-left-6 top-1/2 -translate-y-1/2 -rotate-90' : ''}
                        ${doorPosition === 'right' ? '-right-6 top-1/2 -translate-y-1/2 rotate-90' : ''}
                        ${doorPosition === 'back' ? 'top-[-24px] left-1/2 -translate-x-1/2' : ''}
                      `}
                    >
                      <DoorOpen className="h-4 w-4" />
                      <span className="print:hidden">{t('seating.door')}</span>
                    </div>
                  )}

                  {/* Window markers */}
                  {showWindows && (
                    <>
                      {(windowPosition === 'left' || windowPosition === 'both') && (
                        <div className="absolute -left-6 top-0 bottom-0 flex flex-col items-center justify-around gap-2">
                          {[...Array(Math.min(gridRows, 4))].map((_, i) => (
                            <WindowsIcon key={i} className="h-4 w-4 text-sky-500" />
                          ))}
                        </div>
                      )}
                      {(windowPosition === 'right' || windowPosition === 'both') && (
                        <div className="absolute -right-6 top-0 bottom-0 flex flex-col items-center justify-around gap-2">
                          {[...Array(Math.min(gridRows, 4))].map((_, i) => (
                            <WindowsIcon key={i} className="h-4 w-4 text-sky-500" />
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {/* The grid */}
                  <div
                    className="grid gap-2 print:gap-1"
                    style={{
                      gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      // Handle drop on the grid area
                    }}
                  >
                    {gridCells.map((cell) => {
                      if (!cell.active) {
                        return <div key={`${cell.row}-${cell.col}`} className="h-16 sm:h-20" />;
                      }

                      const assignment = getStudentAtPos(cell.row, cell.col);
                      const student = assignment ? getStudentInfo(assignment.studentId) : null;
                      const isSelected = selectedSeat?.row === cell.row && selectedSeat?.col === cell.col;
                      const isDragOver = draggedStudentId && !assignment;

                      return (
                        <div
                          key={`${cell.row}-${cell.col}`}
                          className={`
                            relative h-16 sm:h-20 rounded-lg border-2 transition-all duration-200
                            ${student
                              ? 'bg-card border-border shadow-sm hover:shadow-lg hover:shadow-emerald-500/10 hover:border-emerald-400 dark:hover:border-emerald-600 hover:scale-[1.02] active:scale-[0.98]'
                              : `border-dashed border-muted-foreground/30 hover:border-emerald-400/60 dark:hover:border-emerald-600/60
                                ${isDragOver ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-400 border-solid' : 'bg-muted/20'}
                              `
                            }
                            ${isSelected ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}
                          `}
                          draggable={!!student && !isReadOnly}
                          onDragStart={() => student && handleDragStart(student.id, cell.row, cell.col)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDropOnSeat(cell.row, cell.col);
                          }}
                          onClick={() => handleSeatClick(cell.row, cell.col)}
                        >
                          {student ? (
                            <Popover
                              open={studentPopoverOpen === student.id}
                              onOpenChange={(open) => {
                                if (!open) setStudentPopoverOpen(null);
                              }}
                            >
                              <PopoverTrigger asChild>
                                <div className="flex flex-col items-center justify-center h-full p-1 cursor-pointer group/desk">
                                  <motion.div
                                    className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br ${getAvatarGradient(student.id)}
                                      flex items-center justify-center text-white text-xs sm:text-sm font-bold
                                      ${student.behaviorScore && student.behaviorScore >= 2 ? 'ring-2 ring-amber-400' : ''}
                                    `}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    {getInitials(student.firstName, student.lastName)}
                                    {/* Status indicator dot */}
                                    <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-900 ${
                                      student.behaviorScore && student.behaviorScore >= 2 ? 'bg-amber-400' : 'bg-emerald-400'
                                    }`} />
                                  </motion.div>
                                  <span className="text-[10px] sm:text-xs font-medium mt-0.5 truncate max-w-full text-center leading-tight group-hover/desk:text-emerald-600 dark:group-hover/desk:text-emerald-400 transition-colors">
                                    {student.firstName}
                                  </span>
                                  <span className="text-[9px] sm:text-[10px] text-muted-foreground truncate max-w-full text-center leading-tight">
                                    {student.lastName}
                                  </span>
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-56 p-3" side="top">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarGradient(student.id)}
                                        flex items-center justify-center text-white font-bold text-sm shrink-0`}
                                    >
                                      {getInitials(student.firstName, student.lastName)}
                                    </div>
                                    <div>
                                      <div className="font-semibold text-sm">
                                        {student.firstName} {student.lastName}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {t('seating.seat_position', { row: String(cell.row + 1), col: String(cell.col + 1) })}
                                      </div>
                                    </div>
                                  </div>
                                  <Separator />
                                  {student.behaviorScore && student.behaviorScore >= 2 && (
                                    <div className="flex items-center gap-1.5 text-amber-600 text-xs">
                                      <AlertCircle className="h-3.5 w-3.5" />
                                      {t('seating.behavior_note')}
                                    </div>
                                  )}
                                  <div className="flex gap-1">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="flex-1 text-xs h-7"
                                      onClick={() => {
                                        setStudentPopoverOpen(null);
                                        navigateToStudentDetail(student.id, 'seating-chart');
                                      }}
                                    >
                                      <Eye className="h-3 w-3 mr-1" />
                                      {t('seating.view_profile')}
                                    </Button>
                                    {!isReadOnly && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-xs h-7 text-destructive hover:text-destructive"
                                        onClick={() => handleRemoveFromSeat(student.id)}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground/40">
                              <motion.div
                                className="flex flex-col items-center gap-0.5"
                                whileHover={{ scale: 1.05 }}
                              >
                                <span className="text-xs print:hidden">
                                  {cell.row + 1},{cell.col + 1}
                                </span>
                                {isDragOver && <GripVertical className="h-3 w-3 text-emerald-400 animate-pulse" />}
                              </motion.div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Legend */}
                <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground print:hidden">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span>{t('seating.legend_assigned')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full border-2 border-dashed border-muted-foreground/30" />
                    <span>{t('seating.legend_empty')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full border-2 border-amber-400" />
                    <span>{t('seating.legend_behavior')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create chart dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('seating.create_chart_title')}</DialogTitle>
            <DialogDescription>{t('seating.create_chart_desc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('seating.chart_name')}</Label>
              <Input
                placeholder={t('seating.chart_name_placeholder')}
                value={newChartName}
                onChange={(e) => setNewChartName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateChart();
                }}
              />
            </div>
            <div>
              <Label>{t('seating.layout_type')}</Label>
              <Select value={layoutType} onValueChange={(v) => setLayoutType(v as LayoutType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LAYOUT_TEMPLATES.map((tmpl) => (
                    <SelectItem key={tmpl.key} value={tmpl.key}>
                      {t(tmpl.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('seating.rows')}</Label>
                <Input
                  type="number"
                  min={2}
                  max={10}
                  value={gridRows}
                  onChange={(e) => setGridRows(parseInt(e.target.value) || 5)}
                />
              </div>
              <div>
                <Label>{t('seating.columns')}</Label>
                <Input
                  type="number"
                  min={2}
                  max={10}
                  value={gridCols}
                  onChange={(e) => setGridCols(parseInt(e.target.value) || 5)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              {t('action.cancel')}
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleCreateChart}
              disabled={!newChartName.trim()}
            >
              {t('action.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('seating.delete_chart_title')}</DialogTitle>
            <DialogDescription>
              {t('seating.delete_chart_desc')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t('action.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDeleteChart}>
              {t('action.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper icons (missing from lucide import)
function ChevronLeft(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
