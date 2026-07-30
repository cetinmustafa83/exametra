'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays,
  Plus,
  Search,
  Filter,
  MapPin,
  Clock,
  Users,
  Star,
  Edit,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Calendar,
  List,
  X,
  Check,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  DollarSign,
  Timer,
  PartyPopper,
  GraduationCap,
  BookOpen,
  Heart,
  Bus,
  Coffee,
  Megaphone,
  Palmtree,
  ArrowRight,
  UserPlus,
  MessageSquare,
  Send,
  Ban,
  MoreHorizontal,
  Copy,
  CheckCircle2,
  UserCheck,
  ExternalLink,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';

/* ─── Types ──────────────────────────────────────────────────────── */

interface OrganizerInfo {
  id: string;
  firstName: string;
  lastName: string;
}

interface ClassGroupInfo {
  id: string;
  name: string;
}

interface RegistrationInfo {
  id: string;
  userId: string;
  status: string;
  notes: string | null;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string };
}

interface FeedbackInfo {
  id: string;
  userId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string };
}

interface SchoolEvent {
  id: string;
  schoolId: string;
  title: string;
  description: string | null;
  eventType: string;
  startDate: string;
  endDate: string | null;
  location: string | null;
  organizerId: string | null;
  classGroupId: string | null;
  isAllSchool: boolean;
  isPublic: boolean;
  requiresRegistration: boolean;
  maxParticipants: number | null;
  notes: string | null;
  budget: number | null;
  registrationDeadline: string | null;
  capacity: number | null;
  isRecurring: boolean;
  recurrenceRule: string | null;
  bannerImageUrl: string | null;
  status: string;
  feedbackForm: string | null;
  createdAt: string;
  updatedAt: string;
  organizer: OrganizerInfo | null;
  classGroup: ClassGroupInfo | null;
  registrations: RegistrationInfo[];
  feedbacks: FeedbackInfo[];
}

/* ─── Constants ──────────────────────────────────────────────────── */

const EVENT_TYPES = [
  { value: 'sports_day', labelKey: 'se.type_sports', icon: PartyPopper, color: 'bg-orange-500' },
  { value: 'cultural', labelKey: 'se.type_cultural', icon: Coffee, color: 'bg-purple-500' },
  { value: 'academic', labelKey: 'se.type_academic', icon: BookOpen, color: 'bg-blue-500' },
  { value: 'social', labelKey: 'se.type_social', icon: Heart, color: 'bg-pink-500' },
  { value: 'parent_meeting', labelKey: 'se.type_parent_meeting', icon: Users, color: 'bg-amber-500' },
  { value: 'holiday', labelKey: 'se.type_holiday', icon: Palmtree, color: 'bg-green-500' },
  { value: 'field_trip', labelKey: 'se.type_field_trip', icon: Bus, color: 'bg-cyan-500' },
  { value: 'assembly', labelKey: 'se.type_assembly', icon: Megaphone, color: 'bg-red-500' },
  { value: 'concert', labelKey: 'se.type_concert', icon: Star, color: 'bg-indigo-500' },
  { value: 'graduation', labelKey: 'se.type_graduation', icon: GraduationCap, color: 'bg-emerald-500' },
  { value: 'fair', labelKey: 'se.type_fair', icon: PartyPopper, color: 'bg-rose-500' },
];

const EVENT_STATUSES = [
  { value: 'draft', labelKey: 'se.status_draft', color: 'bg-gray-500' },
  { value: 'published', labelKey: 'se.status_published', color: 'bg-emerald-500' },
  { value: 'cancelled', labelKey: 'se.status_cancelled', color: 'bg-red-500' },
  { value: 'completed', labelKey: 'se.status_completed', color: 'bg-blue-500' },
];

const RECURRENCE_TYPES = [
  { value: 'daily', labelKey: 'se.recurrence_daily' },
  { value: 'weekly', labelKey: 'se.recurrence_weekly' },
  { value: 'monthly', labelKey: 'se.recurrence_monthly' },
  { value: 'custom', labelKey: 'se.recurrence_custom' },
];

/* ─── Helpers ────────────────────────────────────────────────────── */

function getEventTypeConfig(type: string) {
  return EVENT_TYPES.find(et => et.value === type) || EVENT_TYPES[0];
}

function getStatusConfig(status: string) {
  return EVENT_STATUSES.find(s => s.value === status) || EVENT_STATUSES[0];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getDaysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getCalendarDays(year: number, month: number): (number | null)[][] {
  const firstDay = new Date(year, month, 1).getDay();
  const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[][] = [];
  let week: (number | null)[] = [];

  for (let i = 0; i < adjustedFirstDay; i++) {
    week.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    week.push(day);
    if (week.length === 7) {
      days.push(week);
      week = [];
    }
  }

  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    days.push(week);
  }

  return days;
}

/* ─── Animated Counter ───────────────────────────────────────────── */

function AnimatedCounter({ value, duration = 1.5 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start = 0;
    const step = value / (duration * 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(Math.floor(start));
      }
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [value, duration]);

  return <span>{display}</span>;
}

/* ─── Main Component ─────────────────────────────────────────────── */

export default function SchoolEventsView() {
  const currentUser = useAppStore((s) => s.currentUser);
  const locale = useAppStore((s) => s.locale);

  // Data state
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View state
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<SchoolEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<SchoolEvent | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    eventType: 'sports_day',
    startDate: '',
    endDate: '',
    location: '',
    organizerId: '',
    classGroupId: '',
    isAllSchool: true,
    isPublic: true,
    requiresRegistration: false,
    maxParticipants: '',
    capacity: '',
    notes: '',
    budget: '',
    registrationDeadline: '',
    isRecurring: false,
    recurrenceRule: '',
    bannerImageUrl: '',
    status: 'draft',
  });

  // Feedback form state
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackHover, setFeedbackHover] = useState(0);

  // Action state
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const schoolId = currentUser?.schoolId;
  const isAdmin = currentUser?.role === 'SCHOOL_ADMIN' || currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'VICE_PRINCIPAL';
  const isTeacher = currentUser?.role === 'TEACHER';
  const isStudent = currentUser?.role === 'STUDENT';
  const isParent = currentUser?.role === 'PARENT';

  /* ─── Data Fetching ─────────────────────────────────────────────── */

  const fetchEvents = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ schoolId });
      if (filterType !== 'all') params.set('eventType', filterType);
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (searchQuery) params.set('search', searchQuery);
      if (dateFrom) params.set('startDateFrom', dateFrom);
      if (dateTo) params.set('startDateTo', dateTo);

      const res = await fetch(`/api/school-events?${params.toString()}`);
      if (!res.ok) throw new Error(t('se.error_fetch'));
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      setError(t('se.error_fetch'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [schoolId, filterType, filterStatus, searchQuery, dateFrom, dateTo]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  /* ─── Computed Values ────────────────────────────────────────────── */

  const filteredEvents = useMemo(() => {
    return events;
  }, [events]);

  const stats = useMemo(() => {
    const total = events.length;
    const upcoming = events.filter(e => new Date(e.startDate) > new Date() && e.status !== 'cancelled').length;
    const published = events.filter(e => e.status === 'published').length;
    const completed = events.filter(e => e.status === 'completed').length;
    const totalBudget = events.reduce((sum, e) => sum + (e.budget || 0), 0);
    const totalRegistrations = events.reduce((sum, e) => sum + e.registrations.filter(r => r.status === 'registered').length, 0);
    const avgRating = events.reduce((sum, e) => {
      const ratings = e.feedbacks.map(f => f.rating);
      return ratings.length > 0 ? sum + ratings.reduce((a, b) => a + b, 0) / ratings.length : sum;
    }, 0);
    const ratedEvents = events.filter(e => e.feedbacks.length > 0).length;
    const overallAvgRating = ratedEvents > 0 ? avgRating / ratedEvents : 0;

    const typeDistribution: Record<string, number> = {};
    events.forEach(e => {
      typeDistribution[e.eventType] = (typeDistribution[e.eventType] || 0) + 1;
    });

    return {
      total, upcoming, published, completed,
      totalBudget, totalRegistrations,
      overallAvgRating: Math.round(overallAvgRating * 10) / 10,
      typeDistribution,
    };
  }, [events]);

  const calendarEvents = useMemo(() => {
    return events.filter(e => {
      const d = new Date(e.startDate);
      return d.getFullYear() === calendarYear && d.getMonth() === calendarMonth;
    });
  }, [events, calendarYear, calendarMonth]);

  /* ─── Form Handlers ──────────────────────────────────────────────── */

  const resetForm = useCallback(() => {
    setFormData({
      title: '',
      description: '',
      eventType: 'sports_day',
      startDate: '',
      endDate: '',
      location: '',
      organizerId: '',
      classGroupId: '',
      isAllSchool: true,
      isPublic: true,
      requiresRegistration: false,
      maxParticipants: '',
      capacity: '',
      notes: '',
      budget: '',
      registrationDeadline: '',
      isRecurring: false,
      recurrenceRule: '',
      bannerImageUrl: '',
      status: 'draft',
    });
    setEditingEvent(null);
  }, []);

  const openCreateDialog = useCallback(() => {
    resetForm();
    setShowCreateDialog(true);
  }, [resetForm]);

  const openEditDialog = useCallback((event: SchoolEvent) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || '',
      eventType: event.eventType,
      startDate: event.startDate ? new Date(event.startDate).toISOString().slice(0, 16) : '',
      endDate: event.endDate ? new Date(event.endDate).toISOString().slice(0, 16) : '',
      location: event.location || '',
      organizerId: event.organizerId || '',
      classGroupId: event.classGroupId || '',
      isAllSchool: event.isAllSchool,
      isPublic: event.isPublic,
      requiresRegistration: event.requiresRegistration,
      maxParticipants: event.maxParticipants?.toString() || '',
      capacity: event.capacity?.toString() || '',
      notes: event.notes || '',
      budget: event.budget?.toString() || '',
      registrationDeadline: event.registrationDeadline ? new Date(event.registrationDeadline).toISOString().slice(0, 16) : '',
      isRecurring: event.isRecurring,
      recurrenceRule: event.recurrenceRule || '',
      bannerImageUrl: event.bannerImageUrl || '',
      status: event.status,
    });
    setShowCreateDialog(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!formData.title || !formData.eventType || !formData.startDate) {
      setToast({ message: t('se.error_required_fields'), type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        schoolId,
        title: formData.title,
        description: formData.description || null,
        eventType: formData.eventType,
        startDate: formData.startDate,
        endDate: formData.endDate || null,
        location: formData.location || null,
        organizerId: formData.organizerId || null,
        classGroupId: formData.classGroupId || null,
        isAllSchool: formData.isAllSchool,
        isPublic: formData.isPublic,
        requiresRegistration: formData.requiresRegistration,
        maxParticipants: formData.maxParticipants ? parseInt(formData.maxParticipants) : null,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        notes: formData.notes || null,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        registrationDeadline: formData.registrationDeadline || null,
        isRecurring: formData.isRecurring,
        recurrenceRule: formData.isRecurring ? formData.recurrenceRule : null,
        bannerImageUrl: formData.bannerImageUrl || null,
        status: formData.status,
      };

      if (editingEvent) {
        const res = await fetch(`/api/school-events/${editingEvent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(t('se.error_update'));
        setToast({ message: t('se.event_updated'), type: 'success' });
      } else {
        const res = await fetch('/api/school-events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(t('se.error_create'));
        setToast({ message: t('se.event_created'), type: 'success' });
      }

      setShowCreateDialog(false);
      resetForm();
      fetchEvents();
    } catch (err) {
      setToast({ message: editingEvent ? t('se.error_update') : t('se.error_create'), type: 'error' });
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }, [formData, editingEvent, schoolId, resetForm, fetchEvents]);

  const handleDelete = useCallback(async () => {
    if (!selectedEvent) return;
    try {
      const res = await fetch(`/api/school-events/${selectedEvent.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(t('se.error_delete'));
      setToast({ message: t('se.event_deleted'), type: 'success' });
      setShowDeleteConfirm(false);
      setSelectedEvent(null);
      setShowDetailDialog(false);
      fetchEvents();
    } catch (err) {
      setToast({ message: t('se.error_delete'), type: 'error' });
      console.error(err);
    }
  }, [selectedEvent, fetchEvents]);

  const handleRegister = useCallback(async (eventId: string) => {
    if (!currentUser?.id) return;
    try {
      const res = await fetch(`/api/school-events/${eventId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        if (data.waitlist) {
          setToast({ message: t('se.event_full_waitlist'), type: 'error' });
        } else {
          throw new Error(data.error);
        }
        return;
      }
      setToast({ message: t('se.registration_success'), type: 'success' });
      fetchEvents();
    } catch (err) {
      setToast({ message: t('se.error_register'), type: 'error' });
      console.error(err);
    }
  }, [currentUser, fetchEvents]);

  const handleCancelRegistration = useCallback(async (eventId: string) => {
    if (!currentUser?.id) return;
    try {
      const res = await fetch(`/api/school-events/${eventId}/register?userId=${currentUser.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(t('se.error_cancel_registration'));
      setToast({ message: t('se.registration_cancelled'), type: 'success' });
      fetchEvents();
    } catch (err) {
      setToast({ message: t('se.error_cancel_registration'), type: 'error' });
      console.error(err);
    }
  }, [currentUser, fetchEvents]);

  const handleSubmitFeedback = useCallback(async () => {
    if (!selectedEvent || !currentUser?.id || feedbackRating === 0) return;
    try {
      const res = await fetch(`/api/school-events/${selectedEvent.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          rating: feedbackRating,
          comment: feedbackComment,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setToast({ message: t('se.feedback_submitted'), type: 'success' });
      setShowFeedbackDialog(false);
      setFeedbackRating(0);
      setFeedbackComment('');
      fetchEvents();
    } catch (err) {
      setToast({ message: t('se.error_feedback'), type: 'error' });
      console.error(err);
    }
  }, [selectedEvent, currentUser, feedbackRating, feedbackComment, fetchEvents]);

  const handleMarkAttendance = useCallback(async (eventId: string, regId: string, status: string) => {
    try {
      const registration = events.find(e => e.id === eventId)?.registrations.find(r => r.id === regId);
      if (!registration) return;
      const res = await fetch(`/api/school-events/${eventId}/register`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: registration.userId, status }),
      });
      if (!res.ok) throw new Error(t('se.error_update'));
      setToast({ message: t('se.attendance_updated'), type: 'success' });
      fetchEvents();
    } catch (err) {
      setToast({ message: t('se.error_update'), type: 'error' });
      console.error(err);
    }
  }, [events, fetchEvents]);

  /* ─── Toast ──────────────────────────────────────────────────────── */

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  /* ─── Calendar Navigation ────────────────────────────────────────── */

  const prevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(y => y - 1);
    } else {
      setCalendarMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(y => y + 1);
    } else {
      setCalendarMonth(m => m + 1);
    }
  };

  const monthName = new Date(calendarYear, calendarMonth).toLocaleDateString(
    locale === 'de' ? 'de-DE' : 'en-US',
    { month: 'long', year: 'numeric' }
  );

  const calendarDays = useMemo(
    () => getCalendarDays(calendarYear, calendarMonth),
    [calendarYear, calendarMonth]
  );

  const dayNames = locale === 'de'
    ? ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const isUserRegistered = useCallback((event: SchoolEvent) => {
    return event.registrations.some(
      r => r.userId === currentUser?.id && r.status === 'registered'
    );
  }, [currentUser]);

  const hasUserFeedback = useCallback((event: SchoolEvent) => {
    return event.feedbacks.some(f => f.userId === currentUser?.id);
  }, [currentUser]);

  /* ─── Render ─────────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${
              toast.type === 'success'
                ? 'bg-emerald-500 text-white'
                : 'bg-red-500 text-white'
            }`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
                <CalendarDays className="h-8 w-8" />
                {t('se.title')}
              </h1>
              <p className="text-emerald-100 mt-1">{t('se.subtitle')}</p>
            </div>
            {(isAdmin || isTeacher) && (
              <Button
                onClick={openCreateDialog}
                className="bg-white text-emerald-700 hover:bg-emerald-50 font-semibold"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('se.create_event')}
              </Button>
            )}
          </motion.div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: t('se.total_events'), value: stats.total, icon: CalendarDays, color: 'from-emerald-500 to-teal-500' },
            { label: t('se.upcoming_events'), value: stats.upcoming, icon: Timer, color: 'from-amber-500 to-orange-500' },
            { label: t('se.total_registrations'), value: stats.totalRegistrations, icon: Users, color: 'from-blue-500 to-indigo-500' },
            { label: t('se.total_budget'), value: stats.totalBudget, icon: DollarSign, color: 'from-purple-500 to-pink-500', isCurrency: true },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="border-0 shadow-lg overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                      <p className="text-2xl font-bold mt-1">
                        {stat.isCurrency ? (
                          <><AnimatedCounter value={Math.round(stat.value)} /> &euro;</>
                        ) : (
                          <AnimatedCounter value={stat.value} />
                        )}
                      </p>
                    </div>
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.color} text-white`}>
                      <stat.icon className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Filters & Search */}
        <Card className="mb-6 border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('se.search_placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder={t('se.filter_type')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('se.all_types')}</SelectItem>
                  {EVENT_TYPES.map(et => (
                    <SelectItem key={et.value} value={et.value}>
                      {t(et.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder={t('se.filter_status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('se.all_statuses')}</SelectItem>
                  {EVENT_STATUSES.map(s => (
                    <SelectItem key={s.value} value={s.value}>
                      {t(s.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full sm:w-36"
                  placeholder={t('se.date_from')}
                />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full sm:w-36"
                  placeholder={t('se.date_to')}
                />
              </div>
              <div className="flex gap-1 bg-muted rounded-lg p-1">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={viewMode === 'list' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('calendar')}
                  className={viewMode === 'calendar' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                >
                  <Calendar className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admin Stats Panel */}
        {isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-emerald-600" />
                  {t('se.event_statistics')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Type Distribution */}
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">{t('se.events_by_type')}</h4>
                    <div className="space-y-2">
                      {Object.entries(stats.typeDistribution)
                        .sort((a, b) => b[1] - a[1])
                        .map(([type, count]) => {
                          const config = getEventTypeConfig(type);
                          const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                          return (
                            <div key={type} className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${config.color}`} />
                              <span className="text-sm w-28 truncate">{t(config.labelKey)}</span>
                              <Progress value={pct} className="flex-1 h-2" />
                              <span className="text-sm font-medium w-8 text-right">{count}</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                  {/* Quick Stats */}
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">{t('se.overview')}</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm">{t('se.published_events')}</span>
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">{stats.published}</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm">{t('se.completed_events')}</span>
                        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">{stats.completed}</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm">{t('se.avg_rating')}</span>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                          <span className="font-medium">{stats.overallAvgRating}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm">{t('se.total_budget')}</span>
                        <span className="font-medium">{stats.totalBudget.toLocaleString(locale === 'de' ? 'de-DE' : 'en-US', { style: 'currency', currency: 'EUR' })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              <span className="text-muted-foreground">{t('se.loading')}</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <Card className="border-0 shadow-md">
            <CardContent className="p-8 text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 font-medium">{error}</p>
              <Button onClick={fetchEvents} variant="outline" className="mt-4">
                {t('action.refresh')}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Calendar View */}
        {!loading && !error && viewMode === 'calendar' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="sm" onClick={prevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h3 className="text-lg font-semibold capitalize">{monthName}</h3>
                  <Button variant="ghost" size="sm" onClick={nextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-px bg-muted rounded-lg overflow-hidden">
                  {/* Day headers */}
                  {dayNames.map(day => (
                    <div key={day} className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground">
                      {day}
                    </div>
                  ))}
                  {/* Calendar days */}
                  {calendarDays.map((week, wi) =>
                    week.map((day, di) => {
                      const dayEvents = day
                        ? calendarEvents.filter(e => {
                            const d = new Date(e.startDate);
                            return d.getDate() === day;
                          })
                        : [];
                      return (
                        <div
                          key={`${wi}-${di}`}
                          className={`bg-background min-h-[80px] sm:min-h-[100px] p-1 sm:p-2 ${
                            day ? 'cursor-pointer hover:bg-muted/30' : ''
                          }`}
                          onClick={() => {
                            if (day && (isAdmin || isTeacher)) {
                              const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T09:00`;
                              setFormData(prev => ({ ...prev, startDate: dateStr }));
                              openCreateDialog();
                            }
                          }}
                        >
                          {day && (
                            <>
                              <span className="text-xs font-medium">{day}</span>
                              <div className="mt-1 space-y-0.5">
                                {dayEvents.slice(0, 3).map(event => {
                                  const config = getEventTypeConfig(event.eventType);
                                  return (
                                    <TooltipProvider key={event.id}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div
                                            className={`text-[10px] sm:text-xs px-1 py-0.5 rounded ${config.color} text-white truncate cursor-pointer`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedEvent(event);
                                              setShowDetailDialog(true);
                                            }}
                                          >
                                            {event.title}
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p className="font-medium">{event.title}</p>
                                          <p className="text-xs">{formatTime(event.startDate)}</p>
                                          {event.location && <p className="text-xs">{event.location}</p>}
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  );
                                })}
                                {dayEvents.length > 3 && (
                                  <div className="text-[10px] text-muted-foreground pl-1">
                                    +{dayEvents.length - 3} {t('se.more')}
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* List View */}
        {!loading && !error && viewMode === 'list' && (
          <div className="space-y-4">
            {filteredEvents.length === 0 ? (
              <Card className="border-0 shadow-md">
                <CardContent className="p-12 text-center">
                  <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground font-medium">{t('se.no_events')}</p>
                  {(isAdmin || isTeacher) && (
                    <Button onClick={openCreateDialog} className="mt-4 bg-emerald-600 hover:bg-emerald-700">
                      <Plus className="h-4 w-4 mr-2" />
                      {t('se.create_first_event')}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEvents.map((event, i) => {
                  const typeConfig = getEventTypeConfig(event.eventType);
                  const statusConfig = getStatusConfig(event.status);
                  const daysUntil = getDaysUntil(event.startDate);
                  const registeredCount = event.registrations.filter(r => r.status === 'registered').length;
                  const maxCap = event.capacity ?? event.maxParticipants;
                  const capacityPct = maxCap ? Math.min((registeredCount / maxCap) * 100, 100) : 0;
                  const isFull = maxCap ? registeredCount >= maxCap : false;
                  const userRegistered = isUserRegistered(event);
                  const TypeIcon = typeConfig.icon;

                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.05, 0.3) }}
                    >
                      <Card className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer group overflow-hidden" onClick={() => { setSelectedEvent(event); setShowDetailDialog(true); }}>
                        {/* Banner */}
                        {event.bannerImageUrl && (
                          <div className="h-32 w-full overflow-hidden">
                            <img src={event.bannerImageUrl} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          </div>
                        )}
                        {!event.bannerImageUrl && (
                          <div className={`h-2 w-full bg-gradient-to-r ${typeConfig.color} to-transparent`} />
                        )}
                        <CardContent className="p-4">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <TypeIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <Badge variant="secondary" className="text-xs">
                                  {t(typeConfig.labelKey)}
                                </Badge>
                                <Badge className={`text-xs text-white ${statusConfig.color}`}>
                                  {t(statusConfig.labelKey)}
                                </Badge>
                              </div>
                              <h3 className="font-semibold text-sm truncate">{event.title}</h3>
                            </div>
                            {(isAdmin || (isTeacher && event.organizerId === currentUser?.id)) && (
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={(e) => { e.stopPropagation(); openEditDialog(event); }}
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                                  onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); setShowDeleteConfirm(true); }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Details */}
                          <div className="space-y-1.5 text-xs text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Clock className="h-3.5 w-3.5" />
                              <span>{formatDate(event.startDate)}</span>
                              <span>{formatTime(event.startDate)}</span>
                              {event.endDate && (
                                <span className="flex items-center gap-1">
                                  <ArrowRight className="h-3 w-3" />
                                  {formatDate(event.endDate)}
                                </span>
                              )}
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3.5 w-3.5" />
                                <span className="truncate">{event.location}</span>
                              </div>
                            )}
                            {event.organizer && (
                              <div className="flex items-center gap-2">
                                <Users className="h-3.5 w-3.5" />
                                <span>{event.organizer.firstName} {event.organizer.lastName}</span>
                              </div>
                            )}
                          </div>

                          {/* Registration Info */}
                          {event.requiresRegistration && (
                            <div className="mt-3">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-muted-foreground">
                                  {t('se.registered')}: {registeredCount}/{maxCap || '∞'}
                                </span>
                                {isFull && (
                                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                    {t('se.full')}
                                  </Badge>
                                )}
                              </div>
                              {maxCap && (
                                <Progress value={capacityPct} className="h-1.5" />
                              )}
                              {/* Registration Deadline Countdown */}
                              {event.registrationDeadline && daysUntil > 0 && (
                                <div className="flex items-center gap-1 mt-1 text-xs text-amber-600">
                                  <Timer className="h-3 w-3" />
                                  <span>{t('se.deadline_in')}: {getDaysUntil(event.registrationDeadline)} {t('se.days')}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Countdown Badge */}
                          {daysUntil > 0 && daysUntil <= 7 && event.status === 'published' && (
                            <div className="mt-2">
                              <Badge variant="outline" className="text-xs border-amber-400 text-amber-600">
                                <Timer className="h-3 w-3 mr-1" />
                                {t('se.in')} {daysUntil} {t('se.days')}
                              </Badge>
                            </div>
                          )}

                          {/* User Actions */}
                          {(isStudent || isParent) && event.requiresRegistration && event.status === 'published' && (
                            <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                              {userRegistered ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs text-red-600 hover:text-red-700"
                                  onClick={() => handleCancelRegistration(event.id)}
                                >
                                  <Ban className="h-3 w-3 mr-1" />
                                  {t('se.cancel_registration')}
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  className="text-xs bg-emerald-600 hover:bg-emerald-700"
                                  onClick={() => handleRegister(event.id)}
                                  disabled={isFull}
                                >
                                  <UserPlus className="h-3 w-3 mr-1" />
                                  {isFull ? t('se.full') : t('se.register')}
                                </Button>
                              )}
                            </div>
                          )}

                          {/* Feedback indicator */}
                          {event.feedbacks.length > 0 && (
                            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                              <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                              <span>
                                {(event.feedbacks.reduce((s, f) => s + f.rating, 0) / event.feedbacks.length).toFixed(1)}
                              </span>
                              <span>({event.feedbacks.length})</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Event Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => { if (!open) { setShowCreateDialog(false); resetForm(); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-emerald-600" />
              {editingEvent ? t('se.edit_event') : t('se.create_event')}
            </DialogTitle>
            <DialogDescription>
              {editingEvent ? t('se.edit_event_desc') : t('se.create_event_desc')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <div className="sm:col-span-2">
              <Label htmlFor="title">{t('se.event_title')} *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder={t('se.event_title_placeholder')}
              />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="description">{t('se.event_description')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder={t('se.event_description_placeholder')}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="eventType">{t('se.event_type')} *</Label>
              <Select value={formData.eventType} onValueChange={(v) => setFormData(prev => ({ ...prev, eventType: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map(et => (
                    <SelectItem key={et.value} value={et.value}>
                      {t(et.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">{t('se.status')}</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_STATUSES.map(s => (
                    <SelectItem key={s.value} value={s.value}>
                      {t(s.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="startDate">{t('se.start_date')} *</Label>
              <Input
                id="startDate"
                type="datetime-local"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="endDate">{t('se.end_date')}</Label>
              <Input
                id="endDate"
                type="datetime-local"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="location">{t('se.location')}</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder={t('se.location_placeholder')}
              />
            </div>

            <div>
              <Label htmlFor="budget">{t('se.budget')}</Label>
              <Input
                id="budget"
                type="number"
                step="0.01"
                value={formData.budget}
                onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            <div className="sm:col-span-2 border-t pt-4">
              <h4 className="font-medium text-sm mb-3">{t('se.registration_settings')}</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="requiresRegistration"
                    checked={formData.requiresRegistration}
                    onChange={(e) => setFormData(prev => ({ ...prev, requiresRegistration: e.target.checked }))}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <Label htmlFor="requiresRegistration" className="text-sm">{t('se.requires_registration')}</Label>
                </div>

                {formData.requiresRegistration && (
                  <>
                    <div>
                      <Label htmlFor="capacity" className="text-xs">{t('se.capacity')}</Label>
                      <Input
                        id="capacity"
                        type="number"
                        value={formData.capacity}
                        onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
                        placeholder="∞"
                      />
                    </div>
                    <div>
                      <Label htmlFor="registrationDeadline" className="text-xs">{t('se.registration_deadline')}</Label>
                      <Input
                        id="registrationDeadline"
                        type="datetime-local"
                        value={formData.registrationDeadline}
                        onChange={(e) => setFormData(prev => ({ ...prev, registrationDeadline: e.target.value }))}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="sm:col-span-2 border-t pt-4">
              <h4 className="font-medium text-sm mb-3">{t('se.recurring_settings')}</h4>
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="isRecurring"
                  checked={formData.isRecurring}
                  onChange={(e) => setFormData(prev => ({ ...prev, isRecurring: e.target.checked }))}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <Label htmlFor="isRecurring" className="text-sm">{t('se.is_recurring')}</Label>
              </div>
              {formData.isRecurring && (
                <Select value={formData.recurrenceRule} onValueChange={(v) => setFormData(prev => ({ ...prev, recurrenceRule: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('se.recurrence_type')} />
                  </SelectTrigger>
                  <SelectContent>
                    {RECURRENCE_TYPES.map(rt => (
                      <SelectItem key={rt.value} value={rt.value}>
                        {t(rt.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="bannerImageUrl">{t('se.banner_image_url')}</Label>
              <Input
                id="bannerImageUrl"
                value={formData.bannerImageUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, bannerImageUrl: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="notes">{t('se.notes')}</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder={t('se.notes_placeholder')}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetForm(); }}>
              {t('action.cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
              {submitting ? (
                <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />{t('se.saving')}</>
              ) : (
                <>{editingEvent ? t('action.save') : t('action.create')}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        {selectedEvent && (
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${getEventTypeConfig(selectedEvent.eventType).color} text-white`}>
                  {React.createElement(getEventTypeConfig(selectedEvent.eventType).icon, { className: 'h-5 w-5' })}
                </div>
                <div>
                  <DialogTitle>{selectedEvent.title}</DialogTitle>
                  <DialogDescription className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">{t(getEventTypeConfig(selectedEvent.eventType).labelKey)}</Badge>
                    <Badge className={`text-xs text-white ${getStatusConfig(selectedEvent.status).color}`}>
                      {t(getStatusConfig(selectedEvent.status).labelKey)}
                    </Badge>
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Banner Image */}
            {selectedEvent.bannerImageUrl && (
              <div className="w-full h-48 rounded-lg overflow-hidden mb-4">
                <img src={selectedEvent.bannerImageUrl} alt={selectedEvent.title} className="w-full h-full object-cover" />
              </div>
            )}

            {/* Event Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{formatDate(selectedEvent.startDate)}</p>
                    <p className="text-muted-foreground">{formatTime(selectedEvent.startDate)}{selectedEvent.endDate ? ` - ${formatTime(selectedEvent.endDate)}` : ''}</p>
                  </div>
                </div>
                {selectedEvent.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedEvent.location}</span>
                  </div>
                )}
                {selectedEvent.organizer && (
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedEvent.organizer.firstName} {selectedEvent.organizer.lastName}</span>
                  </div>
                )}
                {selectedEvent.budget !== null && selectedEvent.budget > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedEvent.budget.toLocaleString(locale === 'de' ? 'de-DE' : 'en-US', { style: 'currency', currency: 'EUR' })}</span>
                  </div>
                )}
                {selectedEvent.isRecurring && (
                  <div className="flex items-center gap-2 text-sm">
                    <Copy className="h-4 w-4 text-muted-foreground" />
                    <span>{t('se.recurring')}: {selectedEvent.recurrenceRule || '-'}</span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {selectedEvent.description && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">{t('se.event_description')}</p>
                    <p className="text-sm whitespace-pre-wrap">{selectedEvent.description}</p>
                  </div>
                )}
                {selectedEvent.notes && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">{t('se.notes')}</p>
                    <p className="text-sm whitespace-pre-wrap">{selectedEvent.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Registration Section */}
            {selectedEvent.requiresRegistration && (
              <div className="border-t pt-4">
                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-emerald-600" />
                  {t('se.registrations')} ({selectedEvent.registrations.filter(r => r.status === 'registered').length}/{selectedEvent.capacity ?? selectedEvent.maxParticipants ?? '∞'})
                </h4>

                {/* Registration Deadline */}
                {selectedEvent.registrationDeadline && (
                  <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                      <Timer className="h-4 w-4" />
                      <span>
                        {t('se.registration_deadline')}: {formatDateTime(selectedEvent.registrationDeadline)}
                        {getDaysUntil(selectedEvent.registrationDeadline) > 0 && (
                          <span className="ml-2 font-medium">({getDaysUntil(selectedEvent.registrationDeadline)} {t('se.days')})</span>
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {/* Capacity Bar */}
                {(selectedEvent.capacity ?? selectedEvent.maxParticipants) && (
                  <div className="mb-3">
                    <Progress
                      value={Math.min(
                        (selectedEvent.registrations.filter(r => r.status === 'registered').length / ((selectedEvent.capacity ?? selectedEvent.maxParticipants)!)) * 100,
                        100
                      )}
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('se.capacity_used')}: {Math.round(
                        (selectedEvent.registrations.filter(r => r.status === 'registered').length / ((selectedEvent.capacity ?? selectedEvent.maxParticipants)!)) * 100
                      )}%
                    </p>
                  </div>
                )}

                {/* Registration List */}
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {selectedEvent.registrations.filter(r => r.status !== 'cancelled').map(reg => (
                    <div key={reg.id} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${reg.status === 'attended' ? 'bg-emerald-500' : reg.status === 'registered' ? 'bg-blue-500' : 'bg-gray-400'}`} />
                        <span>{reg.user.firstName} {reg.user.lastName}</span>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1">
                          {reg.status === 'registered' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs text-emerald-600"
                              onClick={() => handleMarkAttendance(selectedEvent.id, reg.id, 'attended')}
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              {t('se.mark_attended')}
                            </Button>
                          )}
                          {reg.status === 'attended' && (
                            <Badge className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              {t('se.attended')}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {selectedEvent.registrations.filter(r => r.status !== 'cancelled').length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">{t('se.no_registrations')}</p>
                  )}
                </div>

                {/* Student/Parent Registration Actions */}
                {(isStudent || isParent) && selectedEvent.status === 'published' && (
                  <div className="mt-4 flex gap-2">
                    {isUserRegistered(selectedEvent) ? (
                      <Button
                        variant="outline"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleCancelRegistration(selectedEvent.id)}
                      >
                        <Ban className="h-4 w-4 mr-2" />
                        {t('se.cancel_registration')}
                      </Button>
                    ) : (
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => handleRegister(selectedEvent.id)}
                        disabled={(selectedEvent.capacity ?? selectedEvent.maxParticipants)
                          ? selectedEvent.registrations.filter(r => r.status === 'registered').length >= (selectedEvent.capacity ?? selectedEvent.maxParticipants)!
                          : false
                        }
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        {t('se.register')}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Feedback Section */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-emerald-600" />
                  {t('se.feedback')} ({selectedEvent.feedbacks.length})
                </h4>
                {!hasUserFeedback(selectedEvent) && (isStudent || isParent || isTeacher) && selectedEvent.status !== 'draft' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFeedbackDialog(true)}
                  >
                    <Star className="h-4 w-4 mr-1" />
                    {t('se.leave_feedback')}
                  </Button>
                )}
              </div>

              {/* Average Rating */}
              {selectedEvent.feedbacks.length > 0 && (
                <div className="flex items-center gap-2 mb-3 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star
                        key={star}
                        className={`h-5 w-5 ${
                          star <= Math.round(selectedEvent.feedbacks.reduce((s, f) => s + f.rating, 0) / selectedEvent.feedbacks.length)
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-medium">
                    {(selectedEvent.feedbacks.reduce((s, f) => s + f.rating, 0) / selectedEvent.feedbacks.length).toFixed(1)}
                  </span>
                  <span className="text-muted-foreground text-sm">({selectedEvent.feedbacks.length} {t('se.reviews')})</span>
                </div>
              )}

              {/* Feedback List */}
              <div className="max-h-48 overflow-y-auto space-y-2">
                {selectedEvent.feedbacks.map(fb => (
                  <div key={fb.id} className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{fb.user.firstName} {fb.user.lastName}</span>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star
                              key={star}
                              className={`h-3 w-3 ${
                                star <= fb.rating ? 'text-amber-500 fill-amber-500' : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDate(fb.createdAt)}</span>
                    </div>
                    {fb.comment && <p className="text-sm text-muted-foreground">{fb.comment}</p>}
                  </div>
                ))}
                {selectedEvent.feedbacks.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">{t('se.no_feedback')}</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex gap-2">
                {(isAdmin || (isTeacher && selectedEvent.organizerId === currentUser?.id)) && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setShowDetailDialog(false); openEditDialog(selectedEvent); }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      {t('action.edit')}
                    </Button>
                    {isAdmin && selectedEvent.status === 'draft' && (
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={async () => {
                          await fetch(`/api/school-events/${selectedEvent.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: 'published' }),
                          });
                          fetchEvents();
                          setShowDetailDialog(false);
                          setToast({ message: t('se.event_published'), type: 'success' });
                        }}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        {t('se.publish')}
                      </Button>
                    )}
                  </>
                )}
              </div>
              {(isAdmin || (isTeacher && selectedEvent.organizerId === currentUser?.id)) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {t('action.delete')}
                </Button>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              {t('se.leave_feedback')}
            </DialogTitle>
            <DialogDescription>{t('se.feedback_desc')}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {/* Star Rating */}
            <div className="flex items-center justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map(star => (
                <motion.button
                  key={star}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setFeedbackRating(star)}
                  onMouseEnter={() => setFeedbackHover(star)}
                  onMouseLeave={() => setFeedbackHover(0)}
                  className="focus:outline-none"
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      star <= (feedbackHover || feedbackRating)
                        ? 'text-amber-500 fill-amber-500'
                        : 'text-gray-300 dark:text-gray-600'
                    }`}
                  />
                </motion.button>
              ))}
            </div>
            {feedbackRating > 0 && (
              <p className="text-center text-sm text-muted-foreground mb-4">
                {feedbackRating === 1 && t('se.rating_poor')}
                {feedbackRating === 2 && t('se.rating_fair')}
                {feedbackRating === 3 && t('se.rating_good')}
                {feedbackRating === 4 && t('se.rating_very_good')}
                {feedbackRating === 5 && t('se.rating_excellent')}
              </p>
            )}
            <Textarea
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              placeholder={t('se.feedback_comment_placeholder')}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFeedbackDialog(false)}>
              {t('action.cancel')}
            </Button>
            <Button
              onClick={handleSubmitFeedback}
              disabled={feedbackRating === 0}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Send className="h-4 w-4 mr-2" />
              {t('se.submit_feedback')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              {t('se.delete_confirm_title')}
            </DialogTitle>
            <DialogDescription>
              {t('se.delete_confirm_desc').replace('{title}', selectedEvent?.title || '')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              {t('action.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              {t('action.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
