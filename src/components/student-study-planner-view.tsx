'use client';

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Clock,
  Plus,
  Play,
  Pause,
  Square,
  Timer,
  Calendar,
  Trash2,
  Edit3,
  Save,
  CheckCircle2,
  AlertCircle,
  Flame,
  Target,
  Brain,
  Sparkles,
  ChevronRight,
  RotateCcw,
  Coffee,
  BookMarked,
  Calculator,
  Globe,
  Flower2,
  Music,
  Zap,
  TrendingUp,
  BarChart3,
  Star,
  History,
  CheckSquare,
  Square as SquareIcon,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────────────────────

interface StudyPlanData {
  id: string;
  schoolId: string;
  studentId: string;
  title: string;
  description: string | null;
  subjectId: string | null;
  subjectName: string | null;
  dayOfWeek: number;
  startTime: string;
  duration: number;
  isRecurring: boolean;
  specificDate: string | null;
  priority: string;
  status: string;
  color: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface StudySessionData {
  id: string;
  schoolId: string;
  studentId: string;
  studyPlanId: string | null;
  subjectId: string | null;
  subjectName: string | null;
  startTime: string;
  endTime: string | null;
  duration: number;
  plannedDuration: number | null;
  type: string;
  pomodorosCompleted: number;
  pomodoroLength: number;
  breakLength: number;
  status: string;
  focusScore: number | null;
  notes: string | null;
}

interface WeeklyStats {
  totalMinutes: number;
  sessionsCount: number;
  subjectBreakdown: Record<string, number>;
}

interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dayNamesFull = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const subjectIcons: Record<string, React.ElementType> = {
  Mathematik: Calculator,
  Deutsch: BookOpen,
  Englisch: Globe,
  Naturwissenschaften: Flower2,
  Mathematics: Calculator,
  German: BookOpen,
  English: Globe,
  Sciences: Flower2,
  Musik: Music,
  Sport: Zap,
};

const priorityColors: Record<string, { bg: string; text: string; border: string }> = {
  high: { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800' },
  medium: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
  low: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-amber-200 dark:border-emerald-800' },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

// ── Circular Timer Component ───────────────────────────────────────────

function CircularTimer({
  totalSeconds,
  remainingSeconds,
  isRunning,
  isBreak,
  size = 200,
}: {
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  isBreak: boolean;
  size?: number;
}) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = totalSeconds > 0 ? (remainingSeconds / totalSeconds) * 100 : 0;
  const offset = circumference - (progress / 100) * circumference;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  const colorClass = isBreak ? 'stroke-teal-400' : 'stroke-emerald-400';
  const gradientFrom = isBreak ? 'from-teal-400' : 'from-emerald-400';
  const gradientTo = isBreak ? 'to-cyan-400' : 'to-teal-500';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-gray-200 dark:text-gray-700" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth} strokeLinecap="round"
          className={colorClass} strokeDasharray={circumference}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold text-gray-900 dark:text-gray-100 ${isRunning ? '' : 'opacity-60'}`}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {isBreak ? t('study_planner.break') : t('study_planner.focus')}
        </span>
        {isRunning && (
          <motion.div
            className={`mt-2 h-2 w-2 rounded-full bg-gradient-to-r ${gradientFrom} ${gradientTo}`}
            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </div>
    </div>
  );
}

// ── Focus Score Input Dialog ───────────────────────────────────────────

function FocusScoreDialog({
  open,
  onClose,
  onSubmit,
  duration,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (score: number, notes: string) => void;
  duration: number;
}) {
  const [score, setScore] = useState(70);
  const [notes, setNotes] = useState('');

  const getScoreLabel = (s: number) => {
    if (s >= 90) return t('study_planner.focus_excellent');
    if (s >= 70) return t('study_planner.focus_good');
    if (s >= 50) return t('study_planner.focus_ok');
    return t('study_planner.focus_low');
  };

  const getScoreColor = (s: number) => {
    if (s >= 90) return 'text-emerald-500';
    if (s >= 70) return 'text-amber-500';
    if (s >= 50) return 'text-orange-500';
    return 'text-rose-500';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            {t('study_planner.rate_focus')}
          </DialogTitle>
          <DialogDescription>
            {t('study_planner.rate_focus_desc', { duration })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setScore(Math.max(10, score - 10))}>
                -
              </Button>
              <div className="text-center">
                <p className={`text-4xl font-bold ${getScoreColor(score)}`}>{score}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{getScoreLabel(score)}</p>
              </div>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setScore(Math.min(100, score + 10))}>
                +
              </Button>
            </div>
            <Input
              type="range"
              min={10}
              max={100}
              step={5}
              value={score}
              onChange={(e) => setScore(parseInt(e.target.value))}
              className="w-full max-w-xs"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('study_planner.session_notes')}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('study_planner.session_notes_placeholder')}
              className="min-h-[80px] resize-none"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            {t('action.cancel')}
          </Button>
          <Button onClick={() => onSubmit(score, notes)} className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {t('study_planner.save_session')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Pomodoro Timer Component ───────────────────────────────────────────

function PomodoroTimer({
  schoolId,
  studentId,
  onSessionComplete,
}: {
  schoolId: string;
  studentId: string;
  onSessionComplete: () => void;
}) {
  const [pomodoroLength, setPomodoroLength] = useState(25);
  const [breakLength, setBreakLength] = useState(5);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [pomodorosCompleted, setPomodorosCompleted] = useState(0);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [showFocusDialog, setShowFocusDialog] = useState(false);
  const [completedDuration, setCompletedDuration] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSeconds = isBreak ? breakLength * 60 : pomodoroLength * 60;

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Timer complete
            if (isBreak) {
              setIsBreak(false);
              setIsRunning(false);
              setTimeLeft(pomodoroLength * 60);
              toast.success(t('study_planner.break_over'));
            } else {
              // Pomodoro completed
              const newCount = pomodorosCompleted + 1;
              setPomodorosCompleted(newCount);
              setIsBreak(true);
              setTimeLeft(breakLength * 60);
              toast.success(t('study_planner.pomodoro_complete', { count: newCount }));

              // Complete session in DB
              if (currentSessionId) {
                apiPut(`/api/student-study-sessions`, {
                  sessionId: currentSessionId,
                  duration: pomodoroLength,
                  pomodorosCompleted: newCount,
                  status: 'completed',
                }).catch(() => {});
              }
              // Show focus score dialog
              setCompletedDuration(pomodoroLength);
              setShowFocusDialog(true);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, isBreak, timeLeft, pomodoroLength, breakLength, pomodorosCompleted, currentSessionId]);

  const handleStart = async () => {
    if (!isRunning) {
      // Start a new session
      try {
        const session = await apiPost<StudySessionData>('/api/student-study-sessions', {
          schoolId,
          studentId,
          subjectName: selectedSubject || null,
          type: 'pomodoro',
          pomodoroLength,
          breakLength,
          plannedDuration: pomodoroLength,
        });
        setCurrentSessionId(session.id);
      } catch {
        // Continue even if API fails
      }
      setIsRunning(true);
      if (timeLeft === totalSeconds) {
        setTimeLeft(pomodoroLength * 60);
      }
    } else {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsBreak(false);
    setTimeLeft(pomodoroLength * 60);
    setPomodorosCompleted(0);
    setCurrentSessionId(null);
  };

  const handleStop = async () => {
    setIsRunning(false);
    if (currentSessionId) {
      try {
        await apiPut('/api/student-study-sessions', {
          sessionId: currentSessionId,
          duration: pomodoroLength - Math.floor(timeLeft / 60),
          pomodorosCompleted,
          status: 'completed',
        });
        onSessionComplete();
      } catch {
        // Continue
      }
    }
    setCompletedDuration(pomodoroLength - Math.floor(timeLeft / 60));
    setShowFocusDialog(true);
  };

  const handleFocusSubmit = async (score: number, notes: string) => {
    if (currentSessionId) {
      try {
        await apiPut('/api/student-study-sessions', {
          sessionId: currentSessionId,
          focusScore: score,
          notes,
        });
        onSessionComplete();
      } catch {
        // Continue
      }
    }
    setShowFocusDialog(false);
    handleReset();
    toast.success(t('study_planner.session_saved'));
  };

  return (
    <>
      <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-sm">
              <Timer className="h-4 w-4" />
            </div>
            {t('study_planner.pomodoro_timer')}
            {pomodorosCompleted > 0 && (
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px]">
                {pomodorosCompleted} {t('study_planner.pomodoros')}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4">
            {/* Subject Selection */}
            <div className="w-full max-w-xs">
              <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('study_planner.subject')}</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t('study_planner.select_subject')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mathematics">{t('student.notebook_math')}</SelectItem>
                  <SelectItem value="German">{t('student.notebook_german')}</SelectItem>
                  <SelectItem value="English">{t('student.notebook_english')}</SelectItem>
                  <SelectItem value="Sciences">{t('student.notebook_science')}</SelectItem>
                  <SelectItem value="Music">Musik</SelectItem>
                  <SelectItem value="Sport">Sport</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Timer Display */}
            <CircularTimer
              totalSeconds={totalSeconds}
              remainingSeconds={timeLeft}
              isRunning={isRunning}
              isBreak={isBreak}
            />

            {/* Duration Settings */}
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <Label className="text-gray-500 dark:text-gray-400">{t('study_planner.focus')}</Label>
                <Select value={String(pomodoroLength)} onValueChange={(v) => {
                  const val = parseInt(v);
                  setPomodoroLength(val);
                  if (!isRunning) setTimeLeft(val * 60);
                }}>
                  <SelectTrigger className="h-7 w-16 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15m</SelectItem>
                    <SelectItem value="25">25m</SelectItem>
                    <SelectItem value="30">30m</SelectItem>
                    <SelectItem value="45">45m</SelectItem>
                    <SelectItem value="60">60m</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1.5">
                <Label className="text-gray-500 dark:text-gray-400">{t('study_planner.break')}</Label>
                <Select value={String(breakLength)} onValueChange={(v) => setBreakLength(parseInt(v))}>
                  <SelectTrigger className="h-7 w-16 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3m</SelectItem>
                    <SelectItem value="5">5m</SelectItem>
                    <SelectItem value="10">10m</SelectItem>
                    <SelectItem value="15">15m</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="h-9 px-3"
                disabled={!isRunning && timeLeft === totalSeconds}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                onClick={handleStart}
                className={`h-10 px-6 rounded-xl font-semibold shadow-md ${
                  isRunning
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white'
                }`}
              >
                {isRunning ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                {isRunning ? t('study_planner.pause') : t('study_planner.start')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleStop}
                className="h-9 px-3 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800"
                disabled={!isRunning && pomodorosCompleted === 0}
              >
                <Square className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <FocusScoreDialog
        open={showFocusDialog}
        onClose={() => { setShowFocusDialog(false); handleReset(); }}
        onSubmit={handleFocusSubmit}
        duration={completedDuration}
      />
    </>
  );
}

// ── Main Component ─────────────────────────────────────────────────────

export default function StudentStudyPlannerView() {
  const { currentUser, locale } = useAppStore();
  const [plans, setPlans] = useState<StudyPlanData[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null);
  const [recentSessions, setRecentSessions] = useState<StudySessionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('schedule');
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<StudyPlanData | null>(null);
  const [planForm, setPlanForm] = useState({
    title: '',
    description: '',
    subjectName: '',
    dayOfWeek: 1,
    startTime: '16:00',
    duration: 30,
    priority: 'medium',
    color: '#10b981',
  });
  const [studentId, setStudentId] = useState<string | null>(null);

  // Interactive exam checklist
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: '1', text: t('study_planner.checklist_review_notes'), done: false },
    { id: '2', text: t('study_planner.checklist_practice_problems'), done: false },
    { id: '3', text: t('study_planner.checklist_create_summary'), done: false },
    { id: '4', text: t('study_planner.checklist_teach_someone'), done: false },
    { id: '5', text: t('study_planner.checklist_take_breaks'), done: false },
  ]);

  const toggleChecklistItem = (id: string) => {
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, done: !item.done } : item));
  };

  const completedChecklistCount = useMemo(() => checklist.filter(i => i.done).length, [checklist]);
  const checklistProgress = useMemo(() => checklist.length > 0 ? (completedChecklistCount / checklist.length) * 100 : 0, [checklist, completedChecklistCount]);

  const fetchPlannerData = useCallback(async () => {
    if (!currentUser?.schoolId) return;
    setIsLoading(true);
    try {
      // Get student ID
      const studentData = await apiGet<{ id: string }[]>(`/api/students?schoolId=${currentUser.schoolId}&userId=${currentUser.id}`);
      if (studentData && studentData.length > 0) {
        const sId = studentData[0].id;
        setStudentId(sId);

        const data = await apiGet<{
          plans: StudyPlanData[];
          recentSessions: StudySessionData[];
          weeklyStats: WeeklyStats;
        }>(`/api/student-study-planner?schoolId=${currentUser.schoolId}&studentId=${sId}`);

        if (data) {
          setPlans(data.plans || []);
          setRecentSessions(data.recentSessions || []);
          setWeeklyStats(data.weeklyStats || { totalMinutes: 0, sessionsCount: 0, subjectBreakdown: {} });
        }
      }
    } catch {
      // Use demo data
      setPlans(demoPlans);
      setWeeklyStats(demoStats);
      setRecentSessions(demoSessions);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.schoolId, currentUser?.id]);

  useEffect(() => {
    fetchPlannerData();
  }, [fetchPlannerData]);

  const handleCreatePlan = async () => {
    if (!planForm.title.trim()) {
      toast.error(t('study_planner.title_required'));
      return;
    }
    try {
      if (editingPlan) {
        await apiPut(`/api/student-study-planner/${editingPlan.id}`, {
          title: planForm.title,
          description: planForm.description,
          subjectName: planForm.subjectName,
          dayOfWeek: planForm.dayOfWeek,
          startTime: planForm.startTime,
          duration: planForm.duration,
          priority: planForm.priority,
          color: planForm.color,
        });
        toast.success(t('study_planner.plan_updated'));
      } else {
        await apiPost('/api/student-study-planner', {
          schoolId: currentUser?.schoolId,
          studentId,
          title: planForm.title,
          description: planForm.description,
          subjectName: planForm.subjectName,
          dayOfWeek: planForm.dayOfWeek,
          startTime: planForm.startTime,
          duration: planForm.duration,
          priority: planForm.priority,
          color: planForm.color,
        });
        toast.success(t('study_planner.plan_created'));
      }
      setShowPlanDialog(false);
      setEditingPlan(null);
      setPlanForm({ title: '', description: '', subjectName: '', dayOfWeek: 1, startTime: '16:00', duration: 30, priority: 'medium', color: '#10b981' });
      fetchPlannerData();
    } catch {
      toast.error('Error saving plan');
    }
  };

  const handleDeletePlan = async (planId: string) => {
    try {
      await apiDelete(`/api/student-study-planner/${planId}`);
      toast.success(t('study_planner.plan_deleted'));
      fetchPlannerData();
    } catch {
      toast.error('Error deleting plan');
    }
  };

  const handleAddAISuggestion = async (suggestion: { subject: string; duration: number; day: number; type: string }) => {
    if (!currentUser?.schoolId || !studentId) return;
    try {
      await apiPost('/api/student-study-planner', {
        schoolId: currentUser.schoolId,
        studentId,
        title: `${suggestion.subject} - ${suggestion.type}`,
        subjectName: suggestion.subject,
        dayOfWeek: suggestion.day,
        startTime: '16:00',
        duration: suggestion.duration,
        priority: 'medium',
        color: '#10b981',
      });
      toast.success(t('study_planner.plan_created'));
      fetchPlannerData();
    } catch {
      toast.error('Error creating plan');
    }
  };

  const openEditPlan = (plan: StudyPlanData) => {
    setEditingPlan(plan);
    setPlanForm({
      title: plan.title,
      description: plan.description || '',
      subjectName: plan.subjectName || '',
      dayOfWeek: plan.dayOfWeek,
      startTime: plan.startTime,
      duration: plan.duration,
      priority: plan.priority,
      color: plan.color || '#10b981',
    });
    setShowPlanDialog(true);
  };

  const openNewPlan = () => {
    setEditingPlan(null);
    setPlanForm({ title: '', description: '', subjectName: '', dayOfWeek: 1, startTime: '16:00', duration: 30, priority: 'medium', color: '#10b981' });
    setShowPlanDialog(true);
  };

  // ── Demo Data ──────────────────────────────────────────────────────

  const demoPlans: StudyPlanData[] = [
    { id: '1', schoolId: '1', studentId: '1', title: 'Math Practice', description: 'Algebra exercises', subjectId: null, subjectName: 'Mathematics', dayOfWeek: 1, startTime: '16:00', duration: 45, isRecurring: true, specificDate: null, priority: 'high', status: 'active', color: '#10b981', notes: null, createdAt: '', updatedAt: '' },
    { id: '2', schoolId: '1', studentId: '1', title: 'German Essay', description: 'Essay writing practice', subjectId: null, subjectName: 'German', dayOfWeek: 1, startTime: '17:00', duration: 30, isRecurring: true, specificDate: null, priority: 'medium', status: 'active', color: '#f59e0b', notes: null, createdAt: '', updatedAt: '' },
    { id: '3', schoolId: '1', studentId: '1', title: 'English Vocab', description: 'Vocabulary review', subjectId: null, subjectName: 'English', dayOfWeek: 2, startTime: '16:00', duration: 30, isRecurring: true, specificDate: null, priority: 'medium', status: 'active', color: '#06b6d4', notes: null, createdAt: '', updatedAt: '' },
    { id: '4', schoolId: '1', studentId: '1', title: 'Science Review', description: 'Physics and chemistry', subjectId: null, subjectName: 'Sciences', dayOfWeek: 3, startTime: '16:00', duration: 45, isRecurring: true, specificDate: null, priority: 'high', status: 'active', color: '#8b5cf6', notes: null, createdAt: '', updatedAt: '' },
    { id: '5', schoolId: '1', studentId: '1', title: 'Math Review', description: 'Geometry exercises', subjectId: null, subjectName: 'Mathematics', dayOfWeek: 4, startTime: '16:00', duration: 30, isRecurring: true, specificDate: null, priority: 'medium', status: 'active', color: '#10b981', notes: null, createdAt: '', updatedAt: '' },
    { id: '6', schoolId: '1', studentId: '1', title: 'Test Prep', description: 'Prepare for upcoming test', subjectId: null, subjectName: 'German', dayOfWeek: 5, startTime: '15:00', duration: 60, isRecurring: false, specificDate: null, priority: 'high', status: 'active', color: '#ef4444', notes: null, createdAt: '', updatedAt: '' },
  ];

  const demoStats: WeeklyStats = {
    totalMinutes: 195,
    sessionsCount: 6,
    subjectBreakdown: { Mathematics: 60, German: 45, English: 30, Sciences: 60 },
  };

  const demoSessions: StudySessionData[] = [
    { id: '1', schoolId: '1', studentId: '1', studyPlanId: '1', subjectId: null, subjectName: 'Mathematics', startTime: new Date(Date.now() - 86400000).toISOString(), endTime: new Date(Date.now() - 86400000 + 2700000).toISOString(), duration: 45, plannedDuration: 45, type: 'pomodoro', pomodorosCompleted: 1, pomodoroLength: 25, breakLength: 5, status: 'completed', focusScore: 85, notes: 'Good session' },
    { id: '2', schoolId: '1', studentId: '1', studyPlanId: '2', subjectId: null, subjectName: 'German', startTime: new Date(Date.now() - 86400000 * 2).toISOString(), endTime: new Date(Date.now() - 86400000 * 2 + 1800000).toISOString(), duration: 30, plannedDuration: 30, type: 'pomodoro', pomodorosCompleted: 1, pomodoroLength: 25, breakLength: 5, status: 'completed', focusScore: 70, notes: null },
    { id: '3', schoolId: '1', studentId: '1', studyPlanId: null, subjectId: null, subjectName: 'English', startTime: new Date(Date.now() - 86400000 * 3).toISOString(), endTime: new Date(Date.now() - 86400000 * 3 + 3600000).toISOString(), duration: 60, plannedDuration: 45, type: 'free', pomodorosCompleted: 2, pomodoroLength: 25, breakLength: 5, status: 'completed', focusScore: 90, notes: 'Great focus today' },
  ];

  // ── Weekly Schedule View ─────────────────────────────────────────

  const weeklySchedule = useMemo(() => {
    const schedule: Record<number, StudyPlanData[]> = {};
    for (let i = 0; i <= 6; i++) schedule[i] = [];
    plans.forEach(plan => {
      if (schedule[plan.dayOfWeek]) {
        schedule[plan.dayOfWeek].push(plan);
      }
    });
    Object.values(schedule).forEach(dayPlans => {
      dayPlans.sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
    return schedule;
  }, [plans]);

  // ── Render ─────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="h-8 w-48 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto"
    >
      {/* ── Header with gradient banner */}
      <motion.div variants={itemVariants} className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-500 p-6 shadow-lg">
        {/* Decorative background shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
          <div className="absolute bottom-0 left-1/3 w-16 h-16 rounded-full bg-white/5" />
        </div>
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BookMarked className="h-7 w-7" />
              {t('study_planner.title')}
            </h1>
            <p className="text-sm text-emerald-100 mt-1">{t('study_planner.subtitle')}</p>
          </div>
          <Button onClick={openNewPlan} className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm border border-white/30 shadow-md rounded-xl">
            <Plus className="h-4 w-4 mr-2" />
            {t('study_planner.add_plan')}
          </Button>
        </div>
      </motion.div>

      {/* ── Stats Cards ────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: t('study_planner.weekly_minutes'), value: weeklyStats?.totalMinutes ?? 0, icon: Clock, color: 'from-emerald-400 to-teal-500', suffix: 'min' },
          { label: t('study_planner.sessions_this_week'), value: weeklyStats?.sessionsCount ?? 0, icon: CheckCircle2, color: 'from-amber-400 to-amber-500', suffix: '' },
          { label: t('study_planner.active_plans'), value: plans.length, icon: Calendar, color: 'from-violet-400 to-purple-500', suffix: '' },
          { label: t('study_planner.streak'), value: 5, icon: Flame, color: 'from-rose-400 to-pink-500', suffix: t('study_planner.days') },
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <motion.div key={idx} whileHover={{ scale: 1.02, y: -2 }} transition={{ type: 'spring', stiffness: 300 }}>
              <Card className="border-0 shadow-sm rounded-xl overflow-hidden group hover:shadow-md transition-all">
                <CardContent className="p-4 flex items-center gap-3">
                  <motion.div
                    className={`flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} text-white shadow-md shrink-0`}
                    whileHover={{ rotate: 5, scale: 1.1 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <Icon className="h-5 w-5" />
                  </motion.div>
                  <div>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{stat.value}{stat.suffix && <span className="text-sm font-normal text-gray-500 ml-0.5">{stat.suffix}</span>}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* ── Subject Time Allocation ────────────────────────────────── */}
      {weeklyStats && Object.keys(weeklyStats.subjectBreakdown).length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-emerald-500" />
                {t('study_planner.subject_allocation')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(weeklyStats.subjectBreakdown).map(([subject, minutes]) => {
                  const maxMinutes = Math.max(...Object.values(weeklyStats.subjectBreakdown));
                  const progress = maxMinutes > 0 ? (minutes / maxMinutes) * 100 : 0;
                  const Icon = subjectIcons[subject] || BookOpen;
                  return (
                    <div key={subject} className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 shrink-0">
                        <Icon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">{subject}</p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400">{minutes} min</p>
                        </div>
                        <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Main Content Tabs ──────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="schedule" className="gap-1.5">
              <Calendar className="h-4 w-4" />
              {t('study_planner.weekly_schedule')}
            </TabsTrigger>
            <TabsTrigger value="timer" className="gap-1.5">
              <Timer className="h-4 w-4" />
              {t('study_planner.timer')}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              <History className="h-4 w-4" />
              {t('study_planner.history')}
            </TabsTrigger>
            <TabsTrigger value="ai-plan" className="gap-1.5">
              <Sparkles className="h-4 w-4" />
              {t('study_planner.ai_plan')}
            </TabsTrigger>
          </TabsList>

          {/* ── Weekly Schedule Tab ─────────────────────────────────── */}
          <TabsContent value="schedule">
            <AnimatePresence mode="wait">
              <motion.div
                key="schedule-tab"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className="space-y-3"
              >
                {[1, 2, 3, 4, 5].map(day => {
                  const dayPlans = weeklySchedule[day] || [];
                  return (
                    <Card key={day} className="border-0 shadow-sm rounded-xl overflow-hidden">
                      <CardHeader className="pb-2 pt-4">
                        <CardTitle className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center justify-between">
                          <span>{dayNamesFull[day]}</span>
                          {dayPlans.length > 0 && (
                            <Badge variant="outline" className="text-[10px]">{dayPlans.length} {t('study_planner.sessions')}</Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {dayPlans.length === 0 ? (
                          <div className="flex items-center justify-center py-4 text-gray-400 dark:text-gray-500 text-xs">
                            {t('study_planner.no_plans')}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {dayPlans.map(plan => {
                              const pColors = priorityColors[plan.priority] || priorityColors.medium;
                              const Icon = subjectIcons[plan.subjectName || ''] || BookOpen;
                              return (
                                <motion.div
                                  key={plan.id}
                                  initial={{ opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  whileHover={{ scale: 1.005 }}
                                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800 group"
                                >
                                  <div
                                    className="flex items-center justify-center w-9 h-9 rounded-lg text-white shadow-sm shrink-0"
                                    style={{ background: plan.color || '#10b981' }}
                                  >
                                    <Icon className="h-4 w-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{plan.title}</p>
                                      <Badge className={`text-[10px] px-1.5 py-0 ${pColors.bg} ${pColors.text} ${pColors.border} border`}>
                                        {plan.priority}
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {plan.startTime} · {plan.duration} min
                                      {plan.subjectName && ` · ${plan.subjectName}`}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditPlan(plan)}>
                                      <Edit3 className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-500" onClick={() => handleDeletePlan(plan.id)}>
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </TabsContent>

          {/* ── Timer Tab ───────────────────────────────────────────── */}
          <TabsContent value="timer">
            <AnimatePresence mode="wait">
              <motion.div
                key="timer-tab"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className="space-y-4"
              >
                {studentId && currentUser?.schoolId && (
                  <PomodoroTimer
                    schoolId={currentUser.schoolId}
                    studentId={studentId}
                    onSessionComplete={fetchPlannerData}
                  />
                )}

                {/* Exam Preparation Checklist */}
                <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-sm">
                        <CheckSquare className="h-4 w-4" />
                      </div>
                      {t('study_planner.exam_checklist')}
                      <Badge variant="outline" className="text-[10px]">
                        {completedChecklistCount}/{checklist.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-3">
                      <Progress value={checklistProgress} className="h-2" />
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{Math.round(checklistProgress)}% {t('study_planner.completed')}</p>
                    </div>
                    <div className="space-y-2">
                      {checklist.map((item) => (
                        <motion.div
                          key={item.id}
                          layout
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                          onClick={() => toggleChecklistItem(item.id)}
                        >
                          <div className={`flex items-center justify-center w-5 h-5 rounded-full border-2 transition-colors ${
                            item.done
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}>
                            {item.done && <CheckCircle2 className="h-3 w-3" />}
                          </div>
                          <span className={`text-sm transition-all ${item.done ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-gray-900 dark:text-gray-100'}`}>
                            {item.text}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                    {completedChecklistCount === checklist.length && checklist.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-3 p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 border border-emerald-100 dark:border-emerald-900/20"
                      >
                        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          {t('study_planner.all_ready')}
                        </p>
                        <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">{t('study_planner.all_ready_desc')}</p>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>
          </TabsContent>

          {/* ── Session History Tab ─────────────────────────────────── */}
          <TabsContent value="history">
            <AnimatePresence mode="wait">
              <motion.div
                key="history-tab"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className="space-y-4"
              >
                <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <History className="h-5 w-5 text-emerald-500" />
                      {t('study_planner.session_history')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {recentSessions.length === 0 ? (
                      <div className="flex flex-col items-center gap-3 py-8 text-gray-400 dark:text-gray-500">
                        <Clock className="h-10 w-10" />
                        <p className="text-sm">{t('study_planner.no_sessions')}</p>
                      </div>
                    ) : (
                      <ScrollArea className="max-h-96">
                        <div className="space-y-3">
                          {recentSessions.map((session, idx) => {
                            const Icon = subjectIcons[session.subjectName || ''] || BookOpen;
                            const focusColor = session.focusScore
                              ? session.focusScore >= 80 ? 'text-emerald-500'
                                : session.focusScore >= 60 ? 'text-amber-500'
                                  : 'text-rose-500'
                              : 'text-gray-400';
                            return (
                              <motion.div
                                key={session.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800"
                              >
                                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-sm shrink-0">
                                  <Icon className="h-5 w-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    {session.subjectName || t('study_planner.general_study')}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {session.duration} min · {session.type === 'pomodoro' ? `Pomodoro (${session.pomodorosCompleted}x)` : t('study_planner.free_study')}
                                    {session.notes && ` · ${session.notes}`}
                                  </p>
                                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                                    {new Date(session.startTime).toLocaleDateString()} · {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  {session.focusScore && (
                                    <div className="flex items-center gap-1">
                                      <Star className={`h-3 w-3 ${focusColor}`} />
                                      <span className={`text-xs font-semibold ${focusColor}`}>{session.focusScore}</span>
                                    </div>
                                  )}
                                  <Badge variant="outline" className={`text-[10px] ${
                                    session.status === 'completed'
                                      ? 'text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                      : 'text-gray-400 border-gray-200 dark:border-gray-700'
                                  }`}>
                                    {session.status === 'completed' ? t('study_planner.completed') : session.status}
                                  </Badge>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>
          </TabsContent>

          {/* ── AI Study Plan Tab ───────────────────────────────────── */}
          <TabsContent value="ai-plan">
            <AnimatePresence mode="wait">
              <motion.div
                key="ai-plan-tab"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className="space-y-4"
              >
                <Card className="border-0 shadow-sm rounded-xl border-l-4 border-l-emerald-500 overflow-hidden">
                  <CardHeader className="pb-3 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10 dark:to-transparent">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-sm">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      {t('study_planner.ai_recommendation')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400">{t('study_planner.ai_recommendation_desc')}</p>

                      {/* Weak Areas Analysis */}
                      <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50/30 to-red-50/30 dark:from-amber-900/10 dark:to-red-900/5 border border-amber-100/30 dark:border-amber-900/10">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                          <Target className="h-4 w-4 text-amber-500" />
                          {t('study_planner.weak_areas')}
                        </h4>
                        <div className="space-y-2">
                          {[
                            { subject: t('student.notebook_science'), level: 1, progress: 44, minutes: 60 },
                            { subject: t('student.notebook_english'), level: 2, progress: 58, minutes: 45 },
                          ].map((area, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                                <Flower2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                              </div>
                              <div className="flex-1">
                                <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">{area.subject}</p>
                                <Progress value={area.progress} className="h-1.5 mt-1" />
                              </div>
                              <Badge className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                +{area.minutes} min
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* AI Suggested Plan */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                          <Brain className="h-4 w-4 text-emerald-500" />
                          {t('study_planner.suggested_plan')}
                        </h4>
                        {[
                          { day: 1, subject: t('student.notebook_science'), duration: 45, type: t('study_planner.review') },
                          { day: 2, subject: t('student.notebook_english'), duration: 30, type: t('study_planner.vocabulary') },
                          { day: 3, subject: t('student.notebook_science'), duration: 30, type: t('study_planner.practice') },
                          { day: 4, subject: t('student.notebook_english'), duration: 45, type: t('study_planner.writing') },
                          { day: 5, subject: t('student.notebook_math'), duration: 30, type: t('study_planner.review') },
                        ].map((suggestion, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800"
                          >
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-sm shrink-0">
                              <Brain className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{dayNamesFull[suggestion.day]}: {suggestion.subject}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{suggestion.duration} min · {suggestion.type}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs shrink-0"
                              onClick={() => handleAddAISuggestion(suggestion)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              {t('study_planner.add')}
                            </Button>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Study Materials Quick Access */}
                <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-violet-500" />
                      {t('study_planner.quick_access')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: t('study_planner.notebooks'), icon: BookOpen, color: 'from-emerald-400 to-teal-500', view: 'notebooks' },
                        { label: t('study_planner.subjects'), icon: Calculator, color: 'from-amber-400 to-amber-500', view: 'subjects' },
                        { label: t('study_planner.homework'), icon: CheckCircle2, color: 'from-violet-400 to-purple-500', view: 'homework' },
                        { label: t('study_planner.resources'), icon: Globe, color: 'from-sky-400 to-cyan-500', view: 'resources' },
                      ].map((item, idx) => {
                        const Icon = item.icon;
                        return (
                          <motion.div
                            key={idx}
                            whileHover={{ scale: 1.03, y: -2 }}
                            whileTap={{ scale: 0.97 }}
                          >
                            <Card
                              className="border-0 shadow-sm rounded-xl cursor-pointer overflow-hidden"
                              onClick={() => {
                                const store = useAppStore.getState();
                                store.setCurrentView(item.view as 'notebooks' | 'subjects' | 'homework' | 'resources');
                              }}
                            >
                              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                                <div className={`flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} text-white shadow-md`}>
                                  <Icon className="h-5 w-5" />
                                </div>
                                <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">{item.label}</p>
                              </CardContent>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* ── Plan Dialog ────────────────────────────────────────────── */}
      <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-emerald-500" />
              {editingPlan ? t('study_planner.edit_plan') : t('study_planner.add_plan')}
            </DialogTitle>
            <DialogDescription>
              {editingPlan ? t('study_planner.edit_plan_desc') : t('study_planner.add_plan_desc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="plan-title" className="text-sm font-medium">{t('study_planner.plan_title')}</Label>
              <Input
                id="plan-title"
                value={planForm.title}
                onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })}
                placeholder={t('study_planner.plan_title_placeholder')}
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-desc" className="text-sm font-medium">{t('study_planner.plan_description')}</Label>
              <Textarea
                id="plan-desc"
                value={planForm.description}
                onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                placeholder={t('study_planner.plan_description_placeholder')}
                className="min-h-[80px] resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('study_planner.day')}</Label>
                <Select value={String(planForm.dayOfWeek)} onValueChange={(v) => setPlanForm({ ...planForm, dayOfWeek: parseInt(v) })}>
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map(d => (
                      <SelectItem key={d} value={String(d)}>{dayNamesFull[d]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-time" className="text-sm font-medium">{t('study_planner.start_time')}</Label>
                <Input
                  id="plan-time"
                  type="time"
                  value={planForm.startTime}
                  onChange={(e) => setPlanForm({ ...planForm, startTime: e.target.value })}
                  className="min-h-[44px]"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('study_planner.subject')}</Label>
                <Select value={planForm.subjectName} onValueChange={(v) => setPlanForm({ ...planForm, subjectName: v })}>
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue placeholder={t('study_planner.select_subject')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mathematics">{t('student.notebook_math')}</SelectItem>
                    <SelectItem value="German">{t('student.notebook_german')}</SelectItem>
                    <SelectItem value="English">{t('student.notebook_english')}</SelectItem>
                    <SelectItem value="Sciences">{t('student.notebook_science')}</SelectItem>
                    <SelectItem value="Music">Musik</SelectItem>
                    <SelectItem value="Sport">Sport</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('study_planner.duration')}</Label>
                <Select value={String(planForm.duration)} onValueChange={(v) => setPlanForm({ ...planForm, duration: parseInt(v) })}>
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 min</SelectItem>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="45">45 min</SelectItem>
                    <SelectItem value="60">60 min</SelectItem>
                    <SelectItem value="90">90 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('study_planner.priority')}</Label>
              <Select value={planForm.priority} onValueChange={(v) => setPlanForm({ ...planForm, priority: v })}>
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t('study_planner.low')}</SelectItem>
                  <SelectItem value="medium">{t('study_planner.medium')}</SelectItem>
                  <SelectItem value="high">{t('study_planner.high')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowPlanDialog(false)} className="min-h-[44px]">
              {t('action.cancel')}
            </Button>
            <Button onClick={handleCreatePlan} className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white min-h-[44px] font-semibold">
              <Save className="h-4 w-4 mr-2" />
              {editingPlan ? t('action.save') : t('study_planner.add_plan')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
