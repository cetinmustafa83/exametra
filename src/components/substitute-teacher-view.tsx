'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserCheck, Plus, Search, Filter, Star, Phone, Mail, Calendar,
  Clock, AlertTriangle, CheckCircle2, XCircle, Edit3, Trash2,
  ChevronLeft, ChevronRight, Printer, Bell, BarChart3, TrendingUp,
  Users, FileText, Settings, Eye, Sparkles, ArrowRight, RefreshCw,
  UserPlus, CalendarDays, Shield, BookOpen, MapPin, Stethoscope,
  GraduationCap, Heart, Briefcase, X, Save, Info,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { apiGet } from '@/lib/api';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';

// ── Types ──────────────────────────────────────────────────────────

interface SubstituteTeacherData {
  id: string;
  schoolId: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  qualifications: string | null;
  subjects: string | null;
  gradeLevels: string | null;
  availability: string | null;
  maxDaysPerWeek: number;
  rating: number;
  totalAssignments: number;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; firstName: string; lastName: string; email: string } | null;
  assignments?: { id: string; date: string; status: string }[];
}

interface TeacherAbsenceData {
  id: string;
  schoolId: string;
  teacherId: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  teacher: { id: string; firstName: string; lastName: string; email: string };
  assignments?: SubstitutionAssignmentData[];
}

interface SubstitutionAssignmentData {
  id: string;
  schoolId: string;
  absenceId: string;
  substituteId: string;
  classGroupId: string | null;
  subjectId: string | null;
  date: string;
  period: number | null;
  room: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  absence?: TeacherAbsenceData;
  substitute?: { id: string; firstName: string; lastName: string; rating: number };
  classGroup?: { id: string; name: string } | null;
  subject?: { id: string; name: string } | null;
}

interface TeacherOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

// ── Helpers ────────────────────────────────────────────────────────

function parseJSON<T>(val: string | null | undefined, fallback: T): T {
  if (!val) return fallback;
  try { return JSON.parse(val) as T; } catch { return fallback; }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getDayOfWeek(date: Date): string {
  const days = ['sub.sunday', 'sub.monday', 'sub.tuesday', 'sub.wednesday', 'sub.thursday', 'sub.friday', 'sub.saturday'];
  return days[date.getDay()];
}

function getAbsenceTypeColor(type: string): string {
  switch (type) {
    case 'SICK': return 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300';
    case 'PERSONAL': return 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300';
    case 'TRAINING': return 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  }
}

function getAssignmentStatusColor(status: string): string {
  switch (status) {
    case 'pending': return 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300';
    case 'confirmed': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300';
    case 'completed': return 'bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300';
    case 'cancelled': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  }
}

function getAbsenceTypeIcon(type: string) {
  switch (type) {
    case 'SICK': return Stethoscope;
    case 'PERSONAL': return Heart;
    case 'TRAINING': return GraduationCap;
    default: return Briefcase;
  }
}

function renderStars(rating: number) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-3.5 w-3.5 ${star <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}
        />
      ))}
      <span className="ml-1 text-xs text-muted-foreground">{rating.toFixed(1)}</span>
    </div>
  );
}

// ── Animated Counter ───────────────────────────────────────────────

function AnimatedCounter({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = value / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [value, duration]);
  return <span>{display}</span>;
}

// ── Main Component ─────────────────────────────────────────────────

export default function SubstituteTeacherView() {
  const currentUser = useAppStore((s) => s.currentUser);
  const schoolId = currentUser?.schoolId;

  const role = currentUser?.role || 'TEACHER';
  const isAdmin = role === 'SCHOOL_ADMIN' || role === 'VICE_PRINCIPAL' || role === 'SUPER_ADMIN';
  const isTeacher = role === 'TEACHER';
  const isStudent = role === 'STUDENT';
  const isParent = role === 'PARENT';
  const isReadOnly = isStudent || isParent;

  // ── Data State ──────────────────────────────────────────────────
  const [substitutes, setSubstitutes] = useState<SubstituteTeacherData[]>([]);
  const [absences, setAbsences] = useState<TeacherAbsenceData[]>([]);
  const [assignments, setAssignments] = useState<SubstitutionAssignmentData[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pool');

  // ── Filter State ────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState(true);
  const [absenceFilter, setAbsenceFilter] = useState('all');
  const [weekOffset, setWeekOffset] = useState(0);

  // ── Dialog State ────────────────────────────────────────────────
  const [showSubstituteDialog, setShowSubstituteDialog] = useState(false);
  const [editingSubstitute, setEditingSubstitute] = useState<SubstituteTeacherData | null>(null);
  const [showAbsenceDialog, setShowAbsenceDialog] = useState(false);
  const [editingAbsence, setEditingAbsence] = useState<TeacherAbsenceData | null>(null);
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<SubstitutionAssignmentData | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string } | null>(null);
  const [showRateDialog, setShowRateDialog] = useState(false);
  const [ratingSubstitute, setRatingSubstitute] = useState<SubstituteTeacherData | null>(null);
  const [newRating, setNewRating] = useState(0);

  // ── Form State ──────────────────────────────────────────────────
  const [subForm, setSubForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    qualifications: [] as string[], subjects: [] as string[],
    gradeLevels: [] as string[], maxDaysPerWeek: 5, notes: '',
  });
  const [absenceForm, setAbsenceForm] = useState({
    teacherId: '', type: 'SICK', startDate: '', endDate: '', reason: '', notes: '',
  });
  const [assignmentForm, setAssignmentForm] = useState({
    absenceId: '', substituteId: '', classGroupId: '', subjectId: '',
    date: '', period: 1, room: '', notes: '',
  });
  const [qualInput, setQualInput] = useState('');
  const [gradeInput, setGradeInput] = useState('');

  // ── Fetch Data ──────────────────────────────────────────────────

  const fetchSubstitutes = useCallback(async () => {
    if (!schoolId) return;
    try {
      const data = await apiGet<SubstituteTeacherData[]>(`/api/substitutes?schoolId=${schoolId}`);
      setSubstitutes(data);
    } catch (err) {
      console.error('Error fetching substitutes:', err);
      toast.error(t('sub.error_load'));
    }
  }, [schoolId]);

  const fetchAbsences = useCallback(async () => {
    if (!schoolId) return;
    try {
      const data = await apiGet<TeacherAbsenceData[]>(`/api/substitutes/absences?schoolId=${schoolId}`);
      setAbsences(data);
    } catch (err) {
      console.error('Error fetching absences:', err);
      toast.error(t('sub.error_load'));
    }
  }, [schoolId]);

  const fetchAssignments = useCallback(async () => {
    if (!schoolId) return;
    try {
      const data = await apiGet<SubstitutionAssignmentData[]>(`/api/substitutes/assignments?schoolId=${schoolId}`);
      setAssignments(data);
    } catch (err) {
      console.error('Error fetching assignments:', err);
      toast.error(t('sub.error_load'));
    }
  }, [schoolId]);

  const fetchTeachers = useCallback(async () => {
    if (!schoolId) return;
    try {
      const data = await apiGet<TeacherOption[]>(`/api/users?schoolId=${schoolId}&role=TEACHER`);
      setTeachers(Array.isArray(data) ? data : []);
    } catch {
      // ignore — teachers list is optional
    }
  }, [schoolId]);

  useEffect(() => {
    if (schoolId) {
      setLoading(true);
      Promise.all([fetchSubstitutes(), fetchAbsences(), fetchAssignments(), fetchTeachers()])
        .finally(() => setLoading(false));
    }
  }, [schoolId, fetchSubstitutes, fetchAbsences, fetchAssignments, fetchTeachers]);

  // ── Computed Data ───────────────────────────────────────────────

  const filteredSubstitutes = useMemo(() => {
    let result = substitutes;
    if (filterActive) result = result.filter((s) => s.isActive);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.firstName.toLowerCase().includes(q) ||
          s.lastName.toLowerCase().includes(q) ||
          (s.email && s.email.toLowerCase().includes(q))
      );
    }
    return result;
  }, [substitutes, filterActive, searchQuery]);

  const filteredAbsences = useMemo(() => {
    let result = absences;
    if (absenceFilter !== 'all') result = result.filter((a) => a.status === absenceFilter);
    if (isTeacher) result = result.filter((a) => a.teacherId === currentUser?.id);
    return result;
  }, [absences, absenceFilter, isTeacher, currentUser?.id]);

  const weekDates = useMemo(() => {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - now.getDay() + 1 + weekOffset * 7);
    const dates: Date[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [weekOffset]);

  const weekAssignments = useMemo(() => {
    const weekStart = weekDates[0];
    const weekEnd = weekDates[5];
    return assignments.filter((a) => {
      const d = new Date(a.date);
      return d >= weekStart && d <= weekEnd && a.status !== 'cancelled';
    });
  }, [assignments, weekDates]);

  // ── Statistics ──────────────────────────────────────────────────

  const stats = useMemo(() => {
    const totalAbsences = absences.length;
    const coveredAbsences = absences.filter((a) => a.status === 'covered').length;
    const activeSubstitutes = substitutes.filter((s) => s.isActive).length;
    const totalAssignments = assignments.length;
    const pendingAssignments = assignments.filter((a) => a.status === 'pending').length;
    const confirmedAssignments = assignments.filter((a) => a.status === 'confirmed').length;
    const completedAssignments = assignments.filter((a) => a.status === 'completed').length;
    const avgRating = substitutes.length > 0
      ? substitutes.reduce((sum, s) => sum + s.rating, 0) / substitutes.length
      : 0;
    const coverageRate = totalAbsences > 0 ? Math.round((coveredAbsences / totalAbsences) * 100) : 100;

    // Absences per month (last 6 months)
    const monthLabels: string[] = [];
    const monthCounts: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthLabels.push(key);
      monthCounts[key] = 0;
    }
    absences.forEach((a) => {
      const d = new Date(a.startDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthCounts[key] !== undefined) monthCounts[key]++;
    });
    const absencesPerMonth = monthLabels.map((m) => ({
      month: m,
      count: monthCounts[m],
    }));

    // Assignments by status
    const assignmentsByStatus = [
      { name: t('sub.status_pending'), value: pendingAssignments, color: '#f59e0b' },
      { name: t('sub.status_confirmed'), value: confirmedAssignments, color: '#10b981' },
      { name: t('sub.status_completed'), value: completedAssignments, color: '#14b8a6' },
    ].filter((s) => s.value > 0);

    // Top absent teachers
    const teacherAbsenceCount: Record<string, { name: string; count: number }> = {};
    absences.forEach((a) => {
      const key = a.teacherId;
      if (!teacherAbsenceCount[key]) {
        teacherAbsenceCount[key] = { name: `${a.teacher.firstName} ${a.teacher.lastName}`, count: 0 };
      }
      teacherAbsenceCount[key].count++;
    });
    const topAbsentTeachers = Object.values(teacherAbsenceCount)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Substitute utilization
    const subUtilization = substitutes
      .filter((s) => s.isActive)
      .map((s) => ({
        name: `${s.firstName} ${s.lastName}`,
        assignments: s.totalAssignments,
        maxDays: s.maxDaysPerWeek,
      }))
      .sort((a, b) => b.assignments - a.assignments)
      .slice(0, 10);

    // Cost tracking (mock data based on assignments)
    const dailyRate = 150;
    const totalCost = assignments.filter((a) => a.status === 'completed').length * dailyRate;

    return {
      totalAbsences, coveredAbsences, activeSubstitutes, totalAssignments,
      pendingAssignments, confirmedAssignments, completedAssignments,
      avgRating, coverageRate, absencesPerMonth, assignmentsByStatus,
      topAbsentTeachers, subUtilization, totalCost, dailyRate,
    };
  }, [absences, substitutes, assignments]);

  // ── CRUD Handlers ───────────────────────────────────────────────

  const handleSaveSubstitute = async () => {
    if (!schoolId || !subForm.firstName || !subForm.lastName) {
      toast.error(t('sub.error_save'));
      return;
    }
    try {
      const payload = {
        schoolId,
        firstName: subForm.firstName,
        lastName: subForm.lastName,
        email: subForm.email || null,
        phone: subForm.phone || null,
        qualifications: subForm.qualifications.length > 0 ? subForm.qualifications : null,
        subjects: null,
        gradeLevels: subForm.gradeLevels.length > 0 ? subForm.gradeLevels : null,
        availability: null,
        maxDaysPerWeek: subForm.maxDaysPerWeek,
        notes: subForm.notes || null,
      };

      if (editingSubstitute) {
        const res = await fetch(`/api/substitutes/${editingSubstitute.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
      } else {
        const res = await fetch('/api/substitutes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
      }
      toast.success(t('sub.save_success'));
      setShowSubstituteDialog(false);
      setEditingSubstitute(null);
      resetSubForm();
      fetchSubstitutes();
    } catch {
      toast.error(t('sub.error_save'));
    }
  };

  const handleSaveAbsence = async () => {
    if (!schoolId || !absenceForm.teacherId || !absenceForm.startDate || !absenceForm.endDate) {
      toast.error(t('sub.error_save'));
      return;
    }
    try {
      const payload = {
        schoolId,
        teacherId: absenceForm.teacherId,
        type: absenceForm.type,
        startDate: absenceForm.startDate,
        endDate: absenceForm.endDate,
        reason: absenceForm.reason || null,
        notes: absenceForm.notes || null,
      };

      if (editingAbsence) {
        const res = await fetch(`/api/substitutes/absences/${editingAbsence.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
      } else {
        const res = await fetch('/api/substitutes/absences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
      }
      toast.success(t('sub.save_success'));
      setShowAbsenceDialog(false);
      setEditingAbsence(null);
      resetAbsenceForm();
      fetchAbsences();
    } catch {
      toast.error(t('sub.error_save'));
    }
  };

  const handleSaveAssignment = async () => {
    if (!schoolId || !assignmentForm.absenceId || !assignmentForm.substituteId || !assignmentForm.date) {
      toast.error(t('sub.error_save'));
      return;
    }
    try {
      const payload = {
        schoolId,
        absenceId: assignmentForm.absenceId,
        substituteId: assignmentForm.substituteId,
        classGroupId: assignmentForm.classGroupId || null,
        subjectId: assignmentForm.subjectId || null,
        date: assignmentForm.date,
        period: assignmentForm.period || null,
        room: assignmentForm.room || null,
        notes: assignmentForm.notes || null,
      };

      if (editingAssignment) {
        const res = await fetch(`/api/substitutes/assignments/${editingAssignment.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
      } else {
        const res = await fetch('/api/substitutes/assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
      }
      toast.success(t('sub.save_success'));
      setShowAssignmentDialog(false);
      setEditingAssignment(null);
      resetAssignmentForm();
      fetchAssignments();
      fetchAbsences();
    } catch {
      toast.error(t('sub.error_save'));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      let url = '';
      if (deleteTarget.type === 'substitute') url = `/api/substitutes/${deleteTarget.id}`;
      else if (deleteTarget.type === 'absence') url = `/api/substitutes/absences/${deleteTarget.id}`;
      else if (deleteTarget.type === 'assignment') url = `/api/substitutes/assignments/${deleteTarget.id}`;

      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) throw new Error();

      toast.success(t('sub.delete_success'));
      setShowDeleteDialog(false);
      setDeleteTarget(null);
      fetchSubstitutes();
      fetchAbsences();
      fetchAssignments();
    } catch {
      toast.error(t('sub.error_delete'));
    }
  };

  const handleUpdateAssignmentStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/substitutes/assignments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      toast.success(t('sub.save_success'));
      fetchAssignments();
      fetchAbsences();
    } catch {
      toast.error(t('sub.error_save'));
    }
  };

  const handleRateSubstitute = async () => {
    if (!ratingSubstitute || newRating < 1 || newRating > 5) return;
    try {
      const res = await fetch(`/api/substitutes/${ratingSubstitute.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: newRating }),
      });
      if (!res.ok) throw new Error();
      toast.success(t('sub.save_success'));
      setShowRateDialog(false);
      setRatingSubstitute(null);
      setNewRating(0);
      fetchSubstitutes();
    } catch {
      toast.error(t('sub.error_save'));
    }
  };

  // ── Form Helpers ────────────────────────────────────────────────

  const resetSubForm = () => {
    setSubForm({ firstName: '', lastName: '', email: '', phone: '', qualifications: [], subjects: [], gradeLevels: [], maxDaysPerWeek: 5, notes: '' });
  };

  const resetAbsenceForm = () => {
    setAbsenceForm({ teacherId: '', type: 'SICK', startDate: '', endDate: '', reason: '', notes: '' });
  };

  const resetAssignmentForm = () => {
    setAssignmentForm({ absenceId: '', substituteId: '', classGroupId: '', subjectId: '', date: '', period: 1, room: '', notes: '' });
  };

  const openEditSubstitute = (sub: SubstituteTeacherData) => {
    setEditingSubstitute(sub);
    setSubForm({
      firstName: sub.firstName,
      lastName: sub.lastName,
      email: sub.email || '',
      phone: sub.phone || '',
      qualifications: parseJSON<string[]>(sub.qualifications, []),
      subjects: parseJSON<string[]>(sub.subjects, []),
      gradeLevels: parseJSON<string[]>(sub.gradeLevels, []),
      maxDaysPerWeek: sub.maxDaysPerWeek,
      notes: sub.notes || '',
    });
    setShowSubstituteDialog(true);
  };

  const openEditAbsence = (abs: TeacherAbsenceData) => {
    setEditingAbsence(abs);
    setAbsenceForm({
      teacherId: abs.teacherId,
      type: abs.type,
      startDate: abs.startDate.slice(0, 10),
      endDate: abs.endDate.slice(0, 10),
      reason: abs.reason || '',
      notes: abs.notes || '',
    });
    setShowAbsenceDialog(true);
  };

  const openCreateAssignment = (absenceId?: string) => {
    setEditingAssignment(null);
    resetAssignmentForm();
    if (absenceId) setAssignmentForm((prev) => ({ ...prev, absenceId }));
    setShowAssignmentDialog(true);
  };

  const addQualification = () => {
    if (qualInput.trim()) {
      setSubForm((prev) => ({ ...prev, qualifications: [...prev.qualifications, qualInput.trim()] }));
      setQualInput('');
    }
  };

  const removeQualification = (idx: number) => {
    setSubForm((prev) => ({ ...prev, qualifications: prev.qualifications.filter((_, i) => i !== idx) }));
  };

  const addGradeLevel = () => {
    if (gradeInput.trim()) {
      setSubForm((prev) => ({ ...prev, gradeLevels: [...prev.gradeLevels, gradeInput.trim()] }));
      setGradeInput('');
    }
  };

  const removeGradeLevel = (idx: number) => {
    setSubForm((prev) => ({ ...prev, gradeLevels: prev.gradeLevels.filter((_, i) => i !== idx) }));
  };

  // ── Auto-assign logic ───────────────────────────────────────────

  const handleAutoAssign = async (absenceId: string) => {
    const absence = absences.find((a) => a.id === absenceId);
    if (!absence) return;

    const activeSubs = substitutes.filter((s) => s.isActive);
    if (activeSubs.length === 0) {
      toast.error(t('sub.no_substitutes'));
      return;
    }

    // Simple scoring: prefer substitutes with higher rating and fewer assignments
    const scored = activeSubs.map((s) => ({
      sub: s,
      score: s.rating * 10 - s.totalAssignments * 0.5,
    })).sort((a, b) => b.score - a.score);

    const best = scored[0].sub;
    const startDate = new Date(absence.startDate);
    const endDate = new Date(absence.endDate);

    try {
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        if (d.getDay() === 0 || d.getDay() === 6) continue; // Skip weekends
        await fetch('/api/substitutes/assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schoolId,
            absenceId,
            substituteId: best.id,
            date: d.toISOString().slice(0, 10),
            status: 'pending',
          }),
        });
      }
      toast.success(t('sub.save_success'));
      fetchAssignments();
      fetchAbsences();
    } catch {
      toast.error(t('sub.error_save'));
    }
  };

  // ── Render ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <span className="text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* ── Header Banner ──────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-6 md:p-8 text-white"
      >
        <div className="absolute inset-0 bg-[url('/logo.svg')] bg-no-repeat bg-right opacity-5" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <UserCheck className="h-8 w-8" />
            <h1 className="text-2xl md:text-3xl font-bold">{t('sub.title')}</h1>
          </div>
          <p className="text-emerald-100 text-sm md:text-base max-w-2xl">{t('sub.subtitle')}</p>
        </div>
        {/* Stats cards in header */}
        <div className="relative z-10 mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: t('sub.total_substitutes'), value: stats.activeSubstitutes, icon: Users },
            { label: t('sub.total_absences'), value: stats.totalAbsences, icon: CalendarDays },
            { label: t('sub.coverage_rate'), value: `${stats.coverageRate}%`, icon: Shield },
            { label: t('sub.avg_rating'), value: stats.avgRating.toFixed(1), icon: Star },
          ].map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-3 md:p-4"
            >
              <div className="flex items-center gap-2 mb-1">
                <s.icon className="h-4 w-4 text-emerald-200" />
                <span className="text-xs text-emerald-200">{s.label}</span>
              </div>
              <p className="text-xl md:text-2xl font-bold">
                {typeof s.value === 'number' ? <AnimatedCounter value={s.value} /> : s.value}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── Tabs ───────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pool" className="gap-1.5">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">{t('sub.pool')}</span>
          </TabsTrigger>
          <TabsTrigger value="absences" className="gap-1.5">
            <CalendarDays className="h-4 w-4" />
            <span className="hidden sm:inline">{t('sub.absences')}</span>
          </TabsTrigger>
          <TabsTrigger value="schedule" className="gap-1.5">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">{t('sub.schedule')}</span>
          </TabsTrigger>
          <TabsTrigger value="statistics" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">{t('sub.statistics')}</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Substitute Pool Tab ──────────────────────────────── */}
        <TabsContent value="pool" className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('sub.search_substitute')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterActive ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterActive(true)}
                className={filterActive ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
              >
                {t('sub.filter_active')}
              </Button>
              <Button
                variant={!filterActive ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterActive(false)}
                className={!filterActive ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
              >
                {t('sub.filter_all')}
              </Button>
              {!isReadOnly && (
                <Button
                  onClick={() => { setEditingSubstitute(null); resetSubForm(); setShowSubstituteDialog(true); }}
                  className="bg-emerald-600 hover:bg-emerald-700"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t('sub.add_substitute')}
                </Button>
              )}
            </div>
          </div>

          {/* Substitute Cards */}
          {filteredSubstitutes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mb-3 opacity-30" />
                <p>{t('sub.no_substitutes')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSubstitutes.map((sub, idx) => (
                <motion.div
                  key={sub.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm">
                            {sub.firstName[0]}{sub.lastName[0]}
                          </div>
                          <div>
                            <CardTitle className="text-base">{sub.firstName} {sub.lastName}</CardTitle>
                            <div className="mt-0.5">{renderStars(sub.rating)}</div>
                          </div>
                        </div>
                        <Badge variant={sub.isActive ? 'default' : 'secondary'} className={sub.isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' : ''}>
                          {sub.isActive ? t('sub.active') : t('sub.inactive')}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Contact Info */}
                      <div className="space-y-1.5 text-sm">
                        {sub.email && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="h-3.5 w-3.5" />
                            <span className="truncate">{sub.email}</span>
                          </div>
                        )}
                        {sub.phone && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-3.5 w-3.5" />
                            <span>{sub.phone}</span>
                          </div>
                        )}
                      </div>

                      {/* Qualifications */}
                      {parseJSON<string[]>(sub.qualifications, []).length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">{t('sub.qualifications')}</p>
                          <div className="flex flex-wrap gap-1">
                            {parseJSON<string[]>(sub.qualifications, []).map((q, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{q}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Grade Levels */}
                      {parseJSON<string[]>(sub.gradeLevels, []).length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">{t('sub.grade_levels')}</p>
                          <div className="flex flex-wrap gap-1">
                            {parseJSON<string[]>(sub.gradeLevels, []).map((g, i) => (
                              <Badge key={i} variant="outline" className="text-xs bg-teal-50 dark:bg-teal-950/30">{g}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Stats Row */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {sub.totalAssignments} {t('sub.lessons')}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {sub.maxDaysPerWeek}/w</span>
                        </div>
                        {!isReadOnly && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7"
                              onClick={() => { setRatingSubstitute(sub); setNewRating(Math.round(sub.rating)); setShowRateDialog(true); }}
                              title={t('sub.rate_substitute')}
                            >
                              <Star className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7"
                              onClick={() => openEditSubstitute(sub)}
                              title={t('sub.edit_substitute')}
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                              onClick={() => { setDeleteTarget({ type: 'substitute', id: sub.id }); setShowDeleteDialog(true); }}
                              title={t('sub.delete_substitute')}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Absences Tab ─────────────────────────────────────── */}
        <TabsContent value="absences" className="space-y-4">
          {/* Filter & Actions */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex gap-2">
              {['all', 'reported', 'covered', 'cancelled'].map((f) => (
                <Button
                  key={f}
                  variant={absenceFilter === f ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAbsenceFilter(f)}
                  className={absenceFilter === f ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                >
                  {f === 'all' ? t('sub.filter_all') : t(`sub.status_${f}`)}
                </Button>
              ))}
            </div>
            {!isReadOnly && (
              <Button
                onClick={() => {
                  setEditingAbsence(null);
                  resetAbsenceForm();
                  if (isTeacher && currentUser) {
                    setAbsenceForm((prev) => ({ ...prev, teacherId: currentUser.id }));
                  }
                  setShowAbsenceDialog(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                {t('sub.report_absence')}
              </Button>
            )}
          </div>

          {/* Absence List */}
          {filteredAbsences.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CalendarDays className="h-12 w-12 mb-3 opacity-30" />
                <p>{t('sub.no_absences')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredAbsences.map((abs, idx) => {
                const TypeIcon = getAbsenceTypeIcon(abs.type);
                const assignmentCount = abs.assignments?.length || 0;
                const coveredCount = abs.assignments?.filter((a) => a.status === 'confirmed' || a.status === 'completed').length || 0;
                return (
                  <motion.div
                    key={abs.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                          {/* Teacher & Type */}
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${getAbsenceTypeColor(abs.type)}`}>
                              <TypeIcon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{abs.teacher.firstName} {abs.teacher.lastName}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(abs.startDate)} — {formatDate(abs.endDate)}
                              </p>
                            </div>
                          </div>

                          {/* Type Badge */}
                          <Badge className={getAbsenceTypeColor(abs.type)}>
                            {t(`sub.type_${abs.type.toLowerCase()}`)}
                          </Badge>

                          {/* Coverage Progress */}
                          <div className="flex items-center gap-2 min-w-[140px]">
                            <Progress value={assignmentCount > 0 ? (coveredCount / assignmentCount) * 100 : 0} className="h-2 flex-1" />
                            <span className="text-xs text-muted-foreground whitespace-nowrap">{coveredCount}/{assignmentCount}</span>
                          </div>

                          {/* Status Badge */}
                          <Badge variant={abs.status === 'covered' ? 'default' : 'secondary'} className={abs.status === 'covered' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' : ''}>
                            {t(`sub.status_${abs.status}`)}
                          </Badge>

                          {/* Actions */}
                          {!isReadOnly && (
                            <div className="flex items-center gap-1">
                              {abs.status === 'reported' && (
                                <Button
                                  variant="outline" size="sm"
                                  onClick={() => openCreateAssignment(abs.id)}
                                  className="text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                                >
                                  <UserPlus className="h-3.5 w-3.5 mr-1" />
                                  {t('sub.create_assignment')}
                                </Button>
                              )}
                              {abs.status === 'reported' && isAdmin && (
                                <Button
                                  variant="outline" size="sm"
                                  onClick={() => handleAutoAssign(abs.id)}
                                  className="text-teal-600 border-teal-300 hover:bg-teal-50"
                                >
                                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                                  {t('sub.auto_assign')}
                                </Button>
                              )}
                              <Button
                                variant="ghost" size="icon" className="h-8 w-8"
                                onClick={() => openEditAbsence(abs)}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                                onClick={() => { setDeleteTarget({ type: 'absence', id: abs.id }); setShowDeleteDialog(true); }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                        {abs.reason && (
                          <p className="mt-2 text-sm text-muted-foreground pl-13">{abs.reason}</p>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Schedule Tab ─────────────────────────────────────── */}
        <TabsContent value="schedule" className="space-y-4">
          {/* Week Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setWeekOffset((w) => w - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[200px] text-center">
                {formatDate(weekDates[0].toISOString())} — {formatDate(weekDates[5].toISOString())}
              </span>
              <Button variant="outline" size="icon" onClick={() => setWeekOffset((w) => w + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)} className="ml-2">
                {t('sub.this_week')}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-1" />
                {t('sub.print_plan')}
              </Button>
              {!isReadOnly && isAdmin && (
                <Button variant="outline" size="sm">
                  <Bell className="h-4 w-4 mr-1" />
                  {t('sub.notify_teachers')}
                </Button>
              )}
            </div>
          </div>

          {/* Weekly Grid */}
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Header */}
                <div className="grid grid-cols-6 border-b bg-muted/50">
                  {weekDates.map((date, i) => (
                    <div key={i} className="p-3 text-center border-r last:border-r-0">
                      <p className="text-xs text-muted-foreground">{t(getDayOfWeek(date))}</p>
                      <p className="text-sm font-semibold">{date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</p>
                    </div>
                  ))}
                </div>
                {/* Body */}
                <div className="grid grid-cols-6 min-h-[400px]">
                  {weekDates.map((date, i) => {
                    const dayStr = date.toISOString().slice(0, 10);
                    const dayAssignments = weekAssignments.filter(
                      (a) => new Date(a.date).toISOString().slice(0, 10) === dayStr
                    );
                    return (
                      <div key={i} className="p-2 border-r last:border-r-0 space-y-2 min-h-[200px]">
                        {dayAssignments.length === 0 ? (
                          <div className="h-full flex items-center justify-center">
                            <p className="text-xs text-muted-foreground opacity-50">—</p>
                          </div>
                        ) : (
                          dayAssignments.map((assignment) => (
                            <motion.div
                              key={assignment.id}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className={`rounded-lg p-2 text-xs cursor-pointer hover:shadow-md transition-shadow ${getAssignmentStatusColor(assignment.status)}`}
                              onClick={() => {
                                if (!isReadOnly) {
                                  setEditingAssignment(assignment);
                                  setAssignmentForm({
                                    absenceId: assignment.absenceId,
                                    substituteId: assignment.substituteId,
                                    classGroupId: assignment.classGroupId || '',
                                    subjectId: assignment.subjectId || '',
                                    date: new Date(assignment.date).toISOString().slice(0, 10),
                                    period: assignment.period || 1,
                                    room: assignment.room || '',
                                    notes: assignment.notes || '',
                                  });
                                  setShowAssignmentDialog(true);
                                }
                              }}
                            >
                              <div className="flex items-center gap-1 mb-1">
                                <span className="font-semibold">
                                  {assignment.period ? `${assignment.period}. ` : ''}
                                  {assignment.subject?.name || ''}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span>{assignment.classGroup?.name || '—'}</span>
                              </div>
                              <div className="flex items-center gap-1 mt-0.5">
                                <UserCheck className="h-3 w-3" />
                                <span>{assignment.substitute?.firstName} {assignment.substitute?.lastName}</span>
                              </div>
                              {assignment.room && (
                                <div className="mt-0.5 text-muted-foreground">
                                  {t('sub.room')}: {assignment.room}
                                </div>
                              )}
                            </motion.div>
                          ))
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assignment List */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t('sub.schedule')}</CardTitle>
                {!isReadOnly && (
                  <Button
                    size="sm"
                    onClick={() => openCreateAssignment()}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {t('sub.create_assignment')}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-96">
                {assignments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Calendar className="h-10 w-10 mb-2 opacity-30" />
                    <p className="text-sm">{t('sub.no_assignments')}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {assignments
                      .filter((a) => a.status !== 'cancelled')
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map((assignment) => (
                        <div
                          key={assignment.id}
                          className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">
                                {new Date(assignment.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                              </span>
                              {assignment.period && (
                                <Badge variant="outline" className="text-xs">{assignment.period}. {t('sub.period')}</Badge>
                              )}
                              <Badge className={getAssignmentStatusColor(assignment.status)}>
                                {t(`sub.status_${assignment.status}`)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <UserCheck className="h-3.5 w-3.5" />
                                {assignment.substitute?.firstName} {assignment.substitute?.lastName}
                              </span>
                              <span className="flex items-center gap-1">
                                <BookOpen className="h-3.5 w-3.5" />
                                {assignment.subject?.name || '—'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="h-3.5 w-3.5" />
                                {assignment.classGroup?.name || '—'}
                              </span>
                              {assignment.room && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5" />
                                  {assignment.room}
                                </span>
                              )}
                            </div>
                            {assignment.absence && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {t('sub.teacher')}: {assignment.absence.teacher?.firstName} {assignment.absence.teacher?.lastName}
                              </p>
                            )}
                          </div>
                          {!isReadOnly && (
                            <div className="flex items-center gap-1">
                              {assignment.status === 'pending' && (
                                <Button
                                  variant="outline" size="sm"
                                  onClick={() => handleUpdateAssignmentStatus(assignment.id, 'confirmed')}
                                  className="text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                  {t('sub.status_confirmed')}
                                </Button>
                              )}
                              {assignment.status === 'confirmed' && (
                                <Button
                                  variant="outline" size="sm"
                                  onClick={() => handleUpdateAssignmentStatus(assignment.id, 'completed')}
                                  className="text-teal-600 border-teal-300 hover:bg-teal-50"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                  {t('sub.status_completed')}
                                </Button>
                              )}
                              <Button
                                variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                                onClick={() => { setDeleteTarget({ type: 'assignment', id: assignment.id }); setShowDeleteDialog(true); }}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Statistics Tab ───────────────────────────────────── */}
        <TabsContent value="statistics" className="space-y-4">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: t('sub.total_absences'), value: stats.totalAbsences, icon: CalendarDays, color: 'from-red-500 to-orange-500' },
              { label: t('sub.coverage_rate'), value: `${stats.coverageRate}%`, icon: Shield, color: 'from-emerald-500 to-teal-500' },
              { label: t('sub.total_assignments_count'), value: stats.totalAssignments, icon: FileText, color: 'from-blue-500 to-indigo-500' },
              { label: t('sub.total_cost'), value: `€${stats.totalCost}`, icon: BarChart3, color: 'from-amber-500 to-orange-500' },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card>
                  <CardContent className="p-4">
                    <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center text-white mb-3`}>
                      <s.icon className="h-5 w-5" />
                    </div>
                    <p className="text-2xl font-bold">
                      {typeof s.value === 'number' ? <AnimatedCounter value={s.value} /> : s.value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Monthly Absence Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('sub.monthly_trends')}</CardTitle>
                <CardDescription>{t('sub.absences_per_month')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stats.absencesPerMonth}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <RechartsTooltip />
                    <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: '#10b981' }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Assignments by Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('sub.assignments_per_status')}</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.assignmentsByStatus.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={stats.assignmentsByStatus}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {stats.assignmentsByStatus.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    <p>{t('sub.no_assignments')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Second Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Absent Teachers */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('sub.top_absent_teachers')}</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.topAbsentTeachers.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.topAbsentTeachers} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                      <RechartsTooltip />
                      <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    <p>{t('sub.no_absences')}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Substitute Utilization */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('sub.substitute_utilization')}</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.subUtilization.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.subUtilization}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis type="category" dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <RechartsTooltip />
                      <Bar dataKey="assignments" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    <p>{t('sub.no_substitutes')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Cost Tracking */}
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('sub.cost_tracking')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">{t('sub.daily_rate')}</p>
                    <p className="text-2xl font-bold mt-1">€{stats.dailyRate}</p>
                    <p className="text-xs text-muted-foreground">{t('sub.per_day')}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">{t('sub.total_cost')}</p>
                    <p className="text-2xl font-bold mt-1">€{stats.totalCost}</p>
                    <p className="text-xs text-muted-foreground">{stats.completedAssignments} {t('sub.lessons')}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">{t('sub.coverage_rate')}</p>
                    <p className="text-2xl font-bold mt-1">{stats.coverageRate}%</p>
                    <Progress value={stats.coverageRate} className="mt-2 h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Substitute Dialog ─────────────────────────────────────── */}
      <Dialog open={showSubstituteDialog} onOpenChange={setShowSubstituteDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSubstitute ? t('sub.edit_substitute') : t('sub.add_substitute')}</DialogTitle>
            <DialogDescription>
              {editingSubstitute ? t('sub.edit_substitute') : t('sub.add_substitute')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('sub.first_name')} *</Label>
                <Input
                  value={subForm.firstName}
                  onChange={(e) => setSubForm((p) => ({ ...p, firstName: e.target.value }))}
                />
              </div>
              <div>
                <Label>{t('sub.last_name')} *</Label>
                <Input
                  value={subForm.lastName}
                  onChange={(e) => setSubForm((p) => ({ ...p, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('sub.email')}</Label>
                <Input
                  type="email"
                  value={subForm.email}
                  onChange={(e) => setSubForm((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div>
                <Label>{t('sub.phone')}</Label>
                <Input
                  value={subForm.phone}
                  onChange={(e) => setSubForm((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>{t('sub.qualifications')}</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={qualInput}
                  onChange={(e) => setQualInput(e.target.value)}
                  placeholder={t('sub.add_substitute')}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addQualification(); } }}
                />
                <Button type="button" variant="outline" size="sm" onClick={addQualification}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {subForm.qualifications.map((q, i) => (
                  <Badge key={i} variant="secondary" className="gap-1">
                    {q}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => removeQualification(i)} />
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <Label>{t('sub.grade_levels')}</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={gradeInput}
                  onChange={(e) => setGradeInput(e.target.value)}
                  placeholder="5-6"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addGradeLevel(); } }}
                />
                <Button type="button" variant="outline" size="sm" onClick={addGradeLevel}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {subForm.gradeLevels.map((g, i) => (
                  <Badge key={i} variant="secondary" className="gap-1">
                    {g}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => removeGradeLevel(i)} />
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <Label>{t('sub.max_days')}</Label>
              <Input
                type="number"
                min={1}
                max={7}
                value={subForm.maxDaysPerWeek}
                onChange={(e) => setSubForm((p) => ({ ...p, maxDaysPerWeek: parseInt(e.target.value) || 5 }))}
              />
            </div>
            <div>
              <Label>{t('sub.notes')}</Label>
              <Textarea
                value={subForm.notes}
                onChange={(e) => setSubForm((p) => ({ ...p, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubstituteDialog(false)}>
              {t('action.cancel')}
            </Button>
            <Button onClick={handleSaveSubstitute} className="bg-emerald-600 hover:bg-emerald-700">
              <Save className="h-4 w-4 mr-1" />
              {t('action.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Absence Dialog ────────────────────────────────────────── */}
      <Dialog open={showAbsenceDialog} onOpenChange={setShowAbsenceDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAbsence ? t('sub.edit_absence') : t('sub.report_absence')}</DialogTitle>
            <DialogDescription>
              {editingAbsence ? t('sub.edit_absence') : t('sub.report_absence')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('sub.teacher')} *</Label>
              <Select
                value={absenceForm.teacherId}
                onValueChange={(v) => setAbsenceForm((p) => ({ ...p, teacherId: v }))}
                disabled={isTeacher}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('sub.no_teacher_selected')} />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((tch) => (
                    <SelectItem key={tch.id} value={tch.id}>
                      {tch.firstName} {tch.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('sub.absence_type')} *</Label>
              <Select
                value={absenceForm.type}
                onValueChange={(v) => setAbsenceForm((p) => ({ ...p, type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SICK">{t('sub.type_sick')}</SelectItem>
                  <SelectItem value="PERSONAL">{t('sub.type_personal')}</SelectItem>
                  <SelectItem value="TRAINING">{t('sub.type_training')}</SelectItem>
                  <SelectItem value="OTHER">{t('sub.type_other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('sub.start_date')} *</Label>
                <Input
                  type="date"
                  value={absenceForm.startDate}
                  onChange={(e) => setAbsenceForm((p) => ({ ...p, startDate: e.target.value }))}
                />
              </div>
              <div>
                <Label>{t('sub.end_date')} *</Label>
                <Input
                  type="date"
                  value={absenceForm.endDate}
                  onChange={(e) => setAbsenceForm((p) => ({ ...p, endDate: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>{t('sub.reason')}</Label>
              <Textarea
                value={absenceForm.reason}
                onChange={(e) => setAbsenceForm((p) => ({ ...p, reason: e.target.value }))}
                rows={2}
              />
            </div>
            <div>
              <Label>{t('sub.notes')}</Label>
              <Textarea
                value={absenceForm.notes}
                onChange={(e) => setAbsenceForm((p) => ({ ...p, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAbsenceDialog(false)}>
              {t('action.cancel')}
            </Button>
            <Button onClick={handleSaveAbsence} className="bg-emerald-600 hover:bg-emerald-700">
              <Save className="h-4 w-4 mr-1" />
              {t('action.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Assignment Dialog ─────────────────────────────────────── */}
      <Dialog open={showAssignmentDialog} onOpenChange={setShowAssignmentDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAssignment ? t('sub.edit_assignment') : t('sub.create_assignment')}</DialogTitle>
            <DialogDescription>
              {editingAssignment ? t('sub.edit_assignment') : t('sub.create_assignment')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('sub.absences')} *</Label>
              <Select
                value={assignmentForm.absenceId}
                onValueChange={(v) => setAssignmentForm((p) => ({ ...p, absenceId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('sub.absences')} />
                </SelectTrigger>
                <SelectContent>
                  {absences
                    .filter((a) => a.status !== 'cancelled')
                    .map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.teacher.firstName} {a.teacher.lastName} — {t(`sub.type_${a.type.toLowerCase()}`)} ({formatDate(a.startDate)})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('sub.substitute')} *</Label>
              <Select
                value={assignmentForm.substituteId}
                onValueChange={(v) => setAssignmentForm((p) => ({ ...p, substituteId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('sub.substitute')} />
                </SelectTrigger>
                <SelectContent>
                  {substitutes
                    .filter((s) => s.isActive)
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.firstName} {s.lastName} {s.rating > 0 ? `(★ ${s.rating.toFixed(1)})` : ''}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('sub.date')} *</Label>
                <Input
                  type="date"
                  value={assignmentForm.date}
                  onChange={(e) => setAssignmentForm((p) => ({ ...p, date: e.target.value }))}
                />
              </div>
              <div>
                <Label>{t('sub.period')}</Label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={assignmentForm.period}
                  onChange={(e) => setAssignmentForm((p) => ({ ...p, period: parseInt(e.target.value) || 1 }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('sub.room')}</Label>
                <Input
                  value={assignmentForm.room}
                  onChange={(e) => setAssignmentForm((p) => ({ ...p, room: e.target.value }))}
                />
              </div>
              <div>
                <Label>{t('sub.notes')}</Label>
                <Input
                  value={assignmentForm.notes}
                  onChange={(e) => setAssignmentForm((p) => ({ ...p, notes: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignmentDialog(false)}>
              {t('action.cancel')}
            </Button>
            <Button onClick={handleSaveAssignment} className="bg-emerald-600 hover:bg-emerald-700">
              <Save className="h-4 w-4 mr-1" />
              {t('action.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ────────────────────────────── */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('action.delete')}</DialogTitle>
            <DialogDescription>
              {deleteTarget?.type === 'substitute' && t('sub.confirm_delete_substitute')}
              {deleteTarget?.type === 'absence' && t('sub.confirm_delete_absence')}
              {deleteTarget?.type === 'assignment' && t('sub.confirm_cancel_assignment')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              {t('action.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-1" />
              {t('action.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Rate Substitute Dialog ────────────────────────────────── */}
      <Dialog open={showRateDialog} onOpenChange={setShowRateDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('sub.rate_substitute')}</DialogTitle>
            <DialogDescription>
              {ratingSubstitute && `${ratingSubstitute.firstName} ${ratingSubstitute.lastName}`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center gap-2 py-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <motion.button
                key={star}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setNewRating(star)}
                className="focus:outline-none"
              >
                <Star
                  className={`h-10 w-10 transition-colors ${star <= newRating ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}
                />
              </motion.button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRateDialog(false)}>
              {t('action.cancel')}
            </Button>
            <Button onClick={handleRateSubstitute} className="bg-emerald-600 hover:bg-emerald-700">
              {t('action.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
