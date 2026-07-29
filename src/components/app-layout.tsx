'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Grid3X3,
  PenLine,
  Flower2,
  ClipboardCheck,
  Calculator,
  FileText,
  BookOpen,
  Sun,
  Moon,
  Globe,
  LogOut,
  ChevronRight,
  Heart,
  Bell,
  GraduationCap,
  Settings,
  Search,
  HelpCircle,
  Command,
  CornerDownLeft,
  User as UserIcon,
  FolderSearch,
  X,
  TrendingUp,
  CalendarCheck,
  CalendarDays,
  Calendar as CalendarIconNav,
  Mail,
  Shield,
  Target,
  Ruler,
  MessageSquareText,
  Pencil,
  Plus,
  Palette,
  Leaf,
  Check,
  CheckCircle2,
  AlertTriangle,
  Info,
  BookMarked,
  StickyNote,
  Award,
  UserCheck,
  BarChart3,
  Trash2,
  BookCheck,
  Megaphone,
  Briefcase,
  Clock as ClockIcon,
  Library as LibraryIcon,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  SidebarRail,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
} from '@/components/ui/dialog';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppStore, type ViewName } from '@/lib/store';
import { t } from '@/lib/i18n';
import { fetchSchoolYears, fetchStudents, fetchClasses, fetchDBNotifications, markAllNotificationsRead, markSingleNotificationRead, type SchoolYear, type Student, type ClassGroup, type DBNotification, type DBNotificationData } from '@/lib/api';
import { apiGet } from '@/lib/api';
import OnboardingTour, { isOnboardingCompleted } from '@/components/onboarding-tour';
import KeyboardShortcutsDialog from '@/components/keyboard-shortcuts-dialog';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { toast } from 'sonner';
import { useWebSocket, usePushNotifications, playNotificationSound, getNotificationSoundPref } from '@/lib/websocket';
import { OfflineIndicator, PWAInstallPrompt, useServiceWorker, OfflineSyncManager } from '@/components/offline-indicator';

import DashboardView from './dashboard-view';
import ClassesView from './classes-view';
import CompetencyGridView from './competency-grid-view';
import ProgressEntriesView from './progress-entries-view';
import CompetenceFlowerView from './competence-flower-view';
import AssessmentsView from './assessments-view';
import GradingView from './grading-view';
import ReportsView from './reports-view';
import SettingsView from './settings-view';
import StudentDetailView from './student-detail-view';
import AnalyticsView from './analytics-view';
import MasteryMatrixView from './mastery-matrix-view';
import AttendanceView from './attendance-view';
import LessonPlansView from './lesson-plans-view';
import CalendarView from './calendar-view';
import ParentCommunicationView from './parent-communication-view';
import BehaviorTrackingView from './behavior-tracking-view';
import CurriculumCoverageView from './curriculum-coverage-view';
import RubricLibraryView from './rubric-library-view';
import CommentBankView from './comment-bank-view';
import NotebooksView from './notebooks-view';
import DrawingView from './drawing-view';
import HomeworkView from './homework-view';
import PortfolioView from './portfolio-view';
import TimetableView from './timetable-view';
import ResourceLibraryView from './resource-library-view';

type NavItem = { key: ViewName; icon: React.ElementType; labelKey: string };
type NavSection = { id: string; labelKey: string; items: NavItem[] };

const navSections: NavSection[] = [
  {
    id: 'analysis',
    labelKey: 'polish.nav_analysis',
    items: [
      { key: 'dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
      { key: 'calendar', icon: CalendarIconNav, labelKey: 'nav.calendar' },
      { key: 'analytics', icon: TrendingUp, labelKey: 'nav.analytics' },
      { key: 'reports', icon: FileText, labelKey: 'nav.reports' },
      { key: 'coverage', icon: Target, labelKey: 'nav.coverage' },
    ],
  },
  {
    id: 'teaching',
    labelKey: 'polish.nav_teaching',
    items: [
      { key: 'classes', icon: Users, labelKey: 'nav.classes' },
      { key: 'progress', icon: PenLine, labelKey: 'nav.progress' },
      { key: 'flower', icon: Flower2, labelKey: 'nav.flower' },
      { key: 'matrix', icon: Grid3X3, labelKey: 'nav.matrix' },
      { key: 'assessments', icon: ClipboardCheck, labelKey: 'nav.assessments' },
      { key: 'grading', icon: Calculator, labelKey: 'nav.grading' },
      { key: 'attendance', icon: CalendarCheck, labelKey: 'nav.attendance' },
      { key: 'lesson-plans', icon: CalendarDays, labelKey: 'nav.lesson_plans' },
      { key: 'parents', icon: Mail, labelKey: 'nav.parents' },
      { key: 'behavior', icon: Shield, labelKey: 'nav.behavior' },
      { key: 'homework', icon: BookCheck, labelKey: 'nav.homework' },
      { key: 'rubrics', icon: Ruler, labelKey: 'nav.rubrics' },
      { key: 'comments', icon: MessageSquareText, labelKey: 'nav.comments' },
      { key: 'notebooks', icon: BookOpen, labelKey: 'nav.notebooks' },
      { key: 'drawing', icon: Palette, labelKey: 'nav.drawing' },
      { key: 'portfolio', icon: Briefcase, labelKey: 'nav.portfolio' },
      { key: 'timetable', icon: ClockIcon, labelKey: 'nav.timetable' },
      { key: 'resources', icon: LibraryIcon, labelKey: 'nav.resources' },
    ],
  },
  {
    id: 'setup',
    labelKey: 'polish.nav_setup',
    items: [
      { key: 'competencies', icon: BookOpen, labelKey: 'nav.competencies' },
      { key: 'settings', icon: Settings, labelKey: 'nav.settings' },
    ],
  },
];

// Student-specific navigation (simplified)
const studentNavSections: NavSection[] = [
  {
    id: 'student-main',
    labelKey: 'student.dashboard_title',
    items: [
      { key: 'dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
      { key: 'notebooks', icon: BookOpen, labelKey: 'nav.student_notebooks' },
      { key: 'flower', icon: Flower2, labelKey: 'nav.student_competencies' },
      { key: 'grading', icon: Calculator, labelKey: 'nav.student_grades' },
      { key: 'homework', icon: BookCheck, labelKey: 'nav.homework' },
      { key: 'attendance', icon: CalendarCheck, labelKey: 'nav.student_attendance' },
      { key: 'portfolio', icon: Briefcase, labelKey: 'nav.portfolio' },
      { key: 'calendar', icon: CalendarIconNav, labelKey: 'nav.calendar' },
    ],
  },
];

// Parent-specific navigation (simplified)
const parentNavSections: NavSection[] = [
  {
    id: 'parent-main',
    labelKey: 'parent.dashboard_title',
    items: [
      { key: 'dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
      { key: 'parents', icon: Mail, labelKey: 'parent.my_children' },
      { key: 'parents', icon: MessageSquareText, labelKey: 'parent.messages' },
      { key: 'calendar', icon: CalendarIconNav, labelKey: 'nav.calendar' },
    ],
  },
];

/* ── Announcement Banner ────────────────────────────────────────── */

interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  priority: string;
  isPinned: boolean;
  author: { id: string; firstName: string; lastName: string };
  classGroup: { id: string; name: string } | null;
  createdAt: string;
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'urgent': return 'bg-rose-50 border-rose-300 dark:bg-rose-950/50 dark:border-rose-800';
    case 'high': return 'bg-amber-50 border-amber-300 dark:bg-amber-950/50 dark:border-amber-800';
    case 'normal': return 'bg-emerald-50 border-emerald-300 dark:bg-emerald-950/50 dark:border-emerald-800';
    case 'low': return 'bg-teal-50 border-teal-300 dark:bg-teal-950/50 dark:border-teal-800';
    default: return 'bg-emerald-50 border-emerald-300 dark:bg-emerald-950/50 dark:border-emerald-800';
  }
}

function getPriorityIcon(priority: string) {
  switch (priority) {
    case 'urgent': return AlertTriangle;
    case 'high': return Info;
    default: return Megaphone;
  }
}

function AnnouncementBanner({ schoolId }: { schoolId: string | null }) {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem('ct_dismissed_announcements');
      if (stored) setDismissed(new Set(JSON.parse(stored)));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!schoolId) return;
    apiGet<AnnouncementItem[]>(`/api/announcements?schoolId=${schoolId}&isPinned=true&limit=5`)
      .then((data) => setAnnouncements(data))
      .catch(() => {});
  }, [schoolId]);

  const visibleAnnouncements = announcements.filter((a) => !dismissed.has(a.id));

  const handleDismiss = (id: string) => {
    const newDismissed = new Set(dismissed);
    newDismissed.add(id);
    setDismissed(newDismissed);
    try {
      localStorage.setItem('ct_dismissed_announcements', JSON.stringify([...newDismissed]));
    } catch { /* ignore */ }
  };

  if (visibleAnnouncements.length === 0) return null;

  return (
    <div className="space-y-0">
      <AnimatePresence>
        {visibleAnnouncements.map((announcement) => {
          const PriorityIcon = getPriorityIcon(announcement.priority);
          return (
            <motion.div
              key={announcement.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className={`announcement-banner border-b px-4 py-2 flex items-center gap-3 ${getPriorityColor(announcement.priority)}`}
            >
              <PriorityIcon className="h-4 w-4 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm">{announcement.title}</span>
                <span className="text-sm text-muted-foreground ml-2 hidden sm:inline">{announcement.content.slice(0, 100)}{announcement.content.length > 100 ? '...' : ''}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 min-h-[44px] min-w-[44px]"
                onClick={() => handleDismiss(announcement.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function renderView(view: ViewName) {
  switch (view) {
    case 'dashboard': return <DashboardView />;
    case 'classes': return <ClassesView />;
    case 'competencies': return <CompetencyGridView />;
    case 'progress': return <ProgressEntriesView />;
    case 'flower': return <CompetenceFlowerView />;
    case 'matrix': return <MasteryMatrixView />;
    case 'analytics': return <AnalyticsView />;
    case 'assessments': return <AssessmentsView />;
    case 'grading': return <GradingView />;
    case 'reports': return <ReportsView />;
    case 'settings': return <SettingsView />;
    case 'student-detail': return <StudentDetailView />;
    case 'attendance': return <AttendanceView />;
    case 'lesson-plans': return <LessonPlansView />;
    case 'calendar': return <CalendarView />;
    case 'parents': return <ParentCommunicationView />;
    case 'behavior': return <BehaviorTrackingView />;
    case 'coverage': return <CurriculumCoverageView />;
    case 'rubrics': return <RubricLibraryView />;
    case 'comments': return <CommentBankView />;
    case 'notebooks': return <NotebooksView />;
    case 'drawing': return <DrawingView />;
    case 'homework': return <HomeworkView />;
    case 'portfolio': return <PortfolioView />;
    case 'timetable': return <TimetableView />;
    case 'resources': return <ResourceLibraryView />;
    default: return <DashboardView />;
  }
}

export default function AppLayout() {
  const { theme, setTheme } = useTheme();
  const currentView = useAppStore((s) => s.currentView);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const currentUser = useAppStore((s) => s.currentUser);
  const logout = useAppStore((s) => s.logout);
  const locale = useAppStore((s) => s.locale);
  const setLocale = useAppStore((s) => s.setLocale);
  const storeSchoolYearId = useAppStore((s) => s.schoolYearId);
  const setSchoolYearId = useAppStore((s) => s.setSchoolYearId);
  const navigateToStudentDetail = useAppStore((s) => s.navigateToStudentDetail);
  const setCurrentClass = useAppStore((s) => s.setCurrentClass);
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>(storeSchoolYearId ?? '');

  // Service Worker registration for PWA
  useServiceWorker();

  // WebSocket connection for real-time push notifications
  const { connected: wsConnected } = useWebSocket();
  const { notification: pushNotification } = usePushNotifications();

  // Quick search (Cmd+K) state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchStudents, setSearchStudents] = useState<Student[]>([]);
  const [searchClasses, setSearchClasses] = useState<ClassGroup[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifData, setNotifData] = useState<DBNotificationData | null>(null);
  const [notifLoading, setNotifLoading] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [recentActions, setRecentActions] = useState<{ key: string; label: string; view?: ViewName; timestamp: number }[]>([]);

  const initials = currentUser
    ? `${currentUser.firstName[0]}${currentUser.lastName[0]}`.toUpperCase()
    : '?';

  const displayName = currentUser
    ? `${currentUser.firstName} ${currentUser.lastName}`
    : '';

  const roleKey = currentUser?.role === 'TEACHER' ? 'role.teacher' : currentUser?.role === 'SCHOOL_ADMIN' ? 'role.school_admin' : currentUser?.role === 'STUDENT' ? 'role.student' : currentUser?.role === 'PARENT' ? 'role.parent' : 'role.super_admin';

  const isStudent = currentUser?.role === 'STUDENT';
  const isParent = currentUser?.role === 'PARENT';
  const activeNavSections = isStudent ? studentNavSections : isParent ? parentNavSections : navSections;

  const isDemoUser = currentUser?.isDemo === true || (currentUser?.email?.endsWith('@competencetrack.org') && currentUser?.email?.startsWith('demo'));

  const handleLogout = async () => {
    await logout();
    toast.success(t('auth.logout'));
  };

  const toggleLocale = () => {
    setLocale(locale === 'de' ? 'en' : 'de');
  };

  // Track recent actions for command palette
  const trackAction = useCallback((key: string, label: string, view?: ViewName) => {
    setRecentActions((prev) => {
      const filtered = prev.filter((a) => a.key !== key);
      return [{ key, label, view, timestamp: Date.now() }, ...filtered].slice(0, 5);
    });
  }, []);

  // View shortcut mapping: Ctrl/Cmd + number -> view
  const viewShortcuts: Record<number, ViewName> = {
    1: 'dashboard',
    2: 'classes',
    3: 'progress',
    4: 'flower',
    5: 'assessments',
    6: 'grading',
    7: 'reports',
    8: 'competencies',
    9: 'settings',
  };

  // Global keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;

      // Ctrl/Cmd + K: Open command palette
      if (isMod && !e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
        return;
      }

      // Ctrl/Cmd + /: Show keyboard shortcuts help
      if (isMod && e.key.toLowerCase() === '/') {
        e.preventDefault();
        setShortcutsOpen((v) => !v);
        return;
      }

      // Ctrl/Cmd + Shift + N: Add new page to current notebook (when on notebooks view)
      if (isMod && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        if (currentView === 'notebooks') {
          window.dispatchEvent(new CustomEvent('ct-shortcut', { detail: 'new-page' }));
          return;
        }
      }

      // Ctrl/Cmd + Shift + A: Toggle archive mode (when on notebooks view)
      if (isMod && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (currentView === 'notebooks') {
          window.dispatchEvent(new CustomEvent('ct-shortcut', { detail: 'archive-toggle' }));
          return;
        }
      }

      // Ctrl/Cmd + N: Context-dependent new action
      if (isMod && !e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setSearchOpen(false);
        if (currentView === 'notebooks') {
          // Open create notebook dialog
          window.dispatchEvent(new CustomEvent('ct-shortcut', { detail: 'new-notebook' }));
        } else {
          // Default: navigate to progress
          setCurrentView('progress');
          trackAction('new-entry', t('shortcuts.new_entry'), 'progress');
          toast.info(t('shortcuts.new_entry'));
        }
        return;
      }

      // Ctrl/Cmd + D: Open drawing canvas
      if (isMod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (currentView === 'notebooks') {
          window.dispatchEvent(new CustomEvent('ct-shortcut', { detail: 'drawing' }));
        } else {
          setCurrentView('drawing');
          trackAction('drawing', t('shortcuts.drawing'), 'drawing');
        }
        return;
      }

      // Ctrl/Cmd + E: Export current notebook as PDF
      if (isMod && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        if (currentView === 'notebooks') {
          window.dispatchEvent(new CustomEvent('ct-shortcut', { detail: 'export-pdf' }));
        }
        return;
      }

      // Ctrl/Cmd + .: Close current notebook (go back to library)
      if (isMod && e.key === '.') {
        e.preventDefault();
        if (currentView === 'notebooks') {
          window.dispatchEvent(new CustomEvent('ct-shortcut', { detail: 'close-notebook' }));
        }
        return;
      }

      // Ctrl/Cmd + 1-9: Switch to specific view
      if (isMod && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const view = viewShortcuts[Number(e.key)];
        if (view) {
          setCurrentView(view);
          trackAction(`view-${view}`, t(`nav.${view}`), view);
        }
        return;
      }

      // Escape: Close any open dialog
      if (e.key === 'Escape') {
        if (searchOpen) {
          setSearchOpen(false);
        } else if (shortcutsOpen) {
          setShortcutsOpen(false);
        } else if (helpOpen) {
          setHelpOpen(false);
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [searchOpen, shortcutsOpen, helpOpen, currentView, setCurrentView, trackAction]);

  // Debounced search
  useEffect(() => {
    if (!searchOpen) {
      setSearchQuery('');
      setSearchStudents([]);
      setSearchClasses([]);
      return;
    }
    if (!searchQuery.trim()) {
      setSearchStudents([]);
      setSearchClasses([]);
      return;
    }
    const q = searchQuery.trim();
    const handle = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const [students, classes] = await Promise.all([
          fetchStudents(currentUser?.schoolId ?? undefined, undefined, q).catch(() => []),
          fetchClasses(currentUser?.schoolId ?? undefined, undefined).catch(() => []),
        ]);
        const lowerQ = q.toLowerCase();
        setSearchStudents(students.slice(0, 6));
        setSearchClasses(classes.filter((c) => c.name.toLowerCase().includes(lowerQ)).slice(0, 4));
      } finally {
        setSearchLoading(false);
      }
    }, 220);
    return () => clearTimeout(handle);
  }, [searchQuery, searchOpen, currentUser?.schoolId]);

  const breadcrumbLabel = useMemo(() => {
    if (currentView === 'student-detail') return t('nav.student-detail');
    return t(`nav.${currentView}`);
  }, [currentView]);

  const handleSearchPickStudent = useCallback((s: Student) => {
    setSearchOpen(false);
    navigateToStudentDetail(s.id, currentView);
  }, [navigateToStudentDetail, currentView]);

  const handleSearchPickClass = useCallback((c: ClassGroup) => {
    setSearchOpen(false);
    setCurrentClass(c.id);
    setCurrentView('classes');
  }, [setCurrentClass, setCurrentView]);

  // Check onboarding status on mount
  useEffect(() => {
    if (!isOnboardingCompleted()) {
      setOnboardingOpen(true);
    }
  }, []);

  // Fetch notifications
  const loadNotifications = useCallback(async () => {
    if (!currentUser?.schoolId) return;
    setNotifLoading(true);
    try {
      const data = await fetchDBNotifications();
      setNotifData(data);
    } catch {
      // ignore
    } finally {
      setNotifLoading(false);
    }
  }, [currentUser?.schoolId]);

  useEffect(() => {
    loadNotifications();
    // Refresh notifications every 60 seconds
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Handle push notifications in real-time (after loadNotifications is defined)
  useEffect(() => {
    if (!pushNotification) return;
    // Play notification sound if enabled
    if (getNotificationSoundPref()) {
      playNotificationSound();
    }
    // Show toast notification
    const typeInfo = getNotifTypeInfo(pushNotification.type);
    toast(typeInfo.label, {
      description: pushNotification.message,
      duration: 5000,
    });
    // Refresh notification data to update the bell count
    loadNotifications();
  }, [pushNotification, loadNotifications]);

  const handleMarkAllRead = useCallback(async () => {
    if (!notifData || notifData.unreadCount === 0) return;
    try {
      await markAllNotificationsRead();
      setNotifData((prev) => prev ? {
        ...prev,
        notifications: prev.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      } : prev);
    } catch {
      // ignore
    }
  }, [notifData]);

  const handleMarkSingleRead = useCallback(async (id: string) => {
    try {
      await markSingleNotificationRead(id);
      setNotifData((prev) => {
        if (!prev) return prev;
        const updated = prev.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n
        );
        return {
          ...prev,
          notifications: updated,
          unreadCount: updated.filter((n) => !n.isRead).length,
        };
      });
    } catch {
      // ignore
    }
  }, []);

  const handleNotificationClick = useCallback((n: DBNotification) => {
    if (!n.isRead) {
      handleMarkSingleRead(n.id);
    }
    setNotifOpen(false);
    if (n.actionUrl) {
      setCurrentView(n.actionUrl as ViewName);
    }
  }, [handleMarkSingleRead, setCurrentView]);

  // Get icon and color for notification type
  const getNotifTypeInfo = (type: string) => {
    switch (type) {
      case 'ASSESSMENT_DUE':
        return { icon: AlertTriangle, bg: 'bg-amber-100/80 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400', label: t('notifications.type_assessment_due') };
      case 'MISSING_OBSERVATION':
        return { icon: Info, bg: 'bg-teal-100/80 dark:bg-teal-900/20', text: 'text-teal-600 dark:text-teal-400', label: t('notifications.type_missing_observation') };
      case 'NOTEBOOK_SHARED':
        return { icon: BookMarked, bg: 'bg-emerald-100/80 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', label: t('notifications.type_notebook_shared') };
      case 'BEHAVIOR_ALERT':
        return { icon: Shield, bg: 'bg-rose-100/80 dark:bg-rose-900/20', text: 'text-rose-600 dark:text-rose-400', label: t('notifications.type_behavior_alert') };
      case 'GRADE_COMPUTED':
        return { icon: Award, bg: 'bg-violet-100/80 dark:bg-violet-900/20', text: 'text-violet-600 dark:text-violet-400', label: t('notifications.type_grade_computed') };
      case 'ATTENDANCE_ALERT':
        return { icon: UserCheck, bg: 'bg-orange-100/80 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400', label: t('notifications.type_attendance_alert') };
      case 'REPORT_READY':
        return { icon: FileText, bg: 'bg-cyan-100/80 dark:bg-cyan-900/20', text: 'text-cyan-600 dark:text-cyan-400', label: t('notifications.type_report_ready') };
      default:
        return { icon: Bell, bg: 'bg-gray-100/80 dark:bg-gray-900/20', text: 'text-gray-600 dark:text-gray-400', label: t('notifications.type_general') };
    }
  };

  // Group notifications by date
  const groupedNotifications = useMemo(() => {
    if (!notifData?.notifications) return [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const weekAgo = new Date(today.getTime() - 7 * 86400000);

    const groups: { label: string; notifications: DBNotification[] }[] = [];
    const todayItems: DBNotification[] = [];
    const yesterdayItems: DBNotification[] = [];
    const weekItems: DBNotification[] = [];
    const earlierItems: DBNotification[] = [];

    for (const n of notifData.notifications) {
      const date = new Date(n.createdAt);
      if (date >= today) todayItems.push(n);
      else if (date >= yesterday) yesterdayItems.push(n);
      else if (date >= weekAgo) weekItems.push(n);
      else earlierItems.push(n);
    }

    if (todayItems.length > 0) groups.push({ label: t('notifications.today'), notifications: todayItems });
    if (yesterdayItems.length > 0) groups.push({ label: t('notifications.yesterday'), notifications: yesterdayItems });
    if (weekItems.length > 0) groups.push({ label: t('notifications.this_week'), notifications: weekItems });
    if (earlierItems.length > 0) groups.push({ label: t('notifications.earlier'), notifications: earlierItems });

    return groups;
  }, [notifData?.notifications]);

  useEffect(() => {
    async function loadYears() {
      if (!currentUser?.schoolId) return;
      try {
        const years = await fetchSchoolYears(currentUser.schoolId);
        setSchoolYears(years);
        if (years.length > 0 && !selectedYearId) {
          setSelectedYearId(years[0].id);
          setSchoolYearId(years[0].id);
        }
      } catch {
        // ignore
      }
    }
    loadYears();
  }, [currentUser?.schoolId]);

  return (
    <SidebarProvider>
      {/* Offline indicator bar */}
      <OfflineIndicator />
      {/* PWA install prompt */}
      <PWAInstallPrompt />
      {/* Offline sync manager */}
      <OfflineSyncManager />
      <Sidebar
        variant="sidebar"
        collapsible="icon"
        className="border-r border-emerald-200/50 dark:border-emerald-900/30 bg-gradient-to-b from-emerald-50/80 via-white to-white dark:from-gray-900 dark:via-emerald-950/20 dark:to-gray-950"
      >
        <SidebarHeader className="p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center"
          >
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shrink-0 shadow-lg shadow-emerald-300/40 dark:shadow-emerald-900/40">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="group-data-[collapsible=icon]:hidden">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight">CompetenceTrack</h2>
              <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/50 leading-tight">{t('app.subtitle')}</p>
            </div>
          </motion.div>
        </SidebarHeader>

        <SidebarContent>
          {activeNavSections.map((section) => (
            <SidebarGroup key={section.id}>
              <SidebarGroupLabel className="text-emerald-600/70 dark:text-emerald-400/50 text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-1.5">
                {section.id === 'analysis' && <TrendingUp className="h-3 w-3" />}
                {section.id === 'teaching' && <BookOpen className="h-3 w-3" />}
                {section.id === 'setup' && <Settings className="h-3 w-3" />}
                {section.id === 'student-main' && <GraduationCap className="h-3 w-3" />}
                {t(section.labelKey)}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.items.map((item) => (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuButton
                        isActive={currentView === item.key}
                        onClick={() => setCurrentView(item.key)}
                        tooltip={t(item.labelKey)}
                        className={`group relative transition-all duration-200 min-h-[44px] ${
                          currentView === item.key
                            ? 'bg-gradient-to-r from-emerald-100/90 via-emerald-50/70 to-teal-50/50 dark:from-emerald-900/40 dark:via-emerald-900/25 dark:to-teal-900/15 text-emerald-700 dark:text-emerald-300 font-semibold border-l-3 border-emerald-500 rounded-l-none shadow-sm shadow-emerald-100/40 dark:shadow-emerald-900/20'
                            : 'text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10'
                        }`}
                      >
                        {currentView === item.key && (
                          <span className="absolute inset-y-0 left-0 w-1 rounded-r-full bg-gradient-to-b from-emerald-400 to-teal-500" />
                        )}
                        <item.icon className={`h-5 w-5 transition-colors duration-200 ${
                          currentView === item.key
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-gray-400 dark:text-gray-500 group-hover:text-emerald-500 dark:group-hover:text-emerald-400'
                        }`} />
                        <span className="text-sm">{t(item.labelKey)}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter className="p-3">
          {/* Environmental message */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-center gap-2 px-3 py-2.5 mb-3 rounded-lg bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-transparent dark:from-emerald-900/15 dark:via-teal-900/10 dark:to-transparent border border-emerald-200/30 dark:border-emerald-800/20 group-data-[collapsible=icon]:hidden"
          >
            <Leaf className="h-4 w-4 text-emerald-500 shrink-0" />
            <p className="text-xs text-emerald-600/70 dark:text-emerald-400/50 font-medium leading-snug">
              {t('sidebar.eco_message')}
            </p>
          </motion.div>
          <Separator className="mb-3 bg-emerald-200/50 dark:bg-emerald-900/30" />
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
            <Avatar className="h-10 w-10 shrink-0 ring-2 ring-emerald-200 dark:ring-emerald-800">
              <AvatarFallback className="bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700 dark:from-emerald-900 dark:to-teal-900 dark:text-emerald-300 text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate flex items-center gap-1.5">
                {displayName}
                {isDemoUser && (
                  <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200/50 dark:border-amber-900/30 text-[9px] px-1.5 py-0 h-4">
                    {t('badge.demo')}
                  </Badge>
                )}
              </p>
              <p className="text-xs text-emerald-600/70 dark:text-emerald-400/50 truncate">{t(roleKey)}</p>
            </div>
          </div>
          <div className="flex gap-1 mt-3 group-data-[collapsible=icon]:justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 min-touch hover:bg-emerald-100 dark:hover:bg-emerald-900/20"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title={t('theme.toggle')}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-gray-500" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 min-touch hover:bg-emerald-100 dark:hover:bg-emerald-900/20"
              onClick={toggleLocale}
              title={t('language.toggle')}
            >
              <Globe className="h-4 w-4 text-teal-500" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 min-touch hover:bg-red-100 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 dark:hover:text-red-400"
              onClick={handleLogout}
              title={t('auth.logout')}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        {/* Announcement Banner */}
        <AnnouncementBanner schoolId={currentUser?.schoolId ?? null} />
        <header className="flex h-14 items-center gap-2 border-b border-emerald-200/50 dark:border-emerald-900/30 bg-white dark:bg-gray-950 backdrop-blur-sm px-4 sticky top-0 z-10 shadow-sm shadow-emerald-100/50 dark:shadow-emerald-900/10">
          <SidebarTrigger className="-ml-1 h-10 w-10 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 shrink-0" />
          <Separator orientation="vertical" className="h-6 bg-emerald-200/50 dark:bg-emerald-900/30 shrink-0" />
          <Breadcrumb className="min-w-0 flex-1">
            <BreadcrumbList className="text-sm">
              <BreadcrumbItem>
                <BreadcrumbLink
                  className="cursor-pointer text-emerald-600/70 dark:text-emerald-400/60 hover:text-emerald-700 dark:hover:text-emerald-300"
                  onClick={() => setCurrentView('dashboard')}
                >
                  {t('polish.breadcrumb_home')}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {breadcrumbLabel}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          {/* Right-aligned action group: Search | Help | School Year | Bell | Lang | Avatar */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Search (Cmd+K) */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchOpen(true)}
              className="hidden md:inline-flex h-9 w-64 px-3 text-xs text-gray-500 dark:text-gray-400 border-emerald-200/50 dark:border-emerald-900/30 bg-white/60 dark:bg-gray-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg gap-2 justify-between"
              title={t('polish.quick_search')}
            >
              <span className="inline-flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5 text-emerald-500" />
                <span className="hidden lg:inline">{t('polish.quick_search')}</span>
              </span>
              <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-100/70 dark:bg-emerald-900/30 text-[10px] font-mono text-emerald-700 dark:text-emerald-300">
                <Command className="h-2.5 w-2.5" />K
              </kbd>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSearchOpen(true)}
              className="md:hidden h-9 w-9 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-900/30 bg-white/60 dark:bg-gray-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg"
              title={t('polish.quick_search')}
            >
              <Search className="h-4 w-4" />
            </Button>
            {/* Help button — opens help dialog, long-press/Ctrl+click opens onboarding tour */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
              onClick={() => setHelpOpen(true)}
              onContextMenu={(e) => { e.preventDefault(); setOnboardingOpen(true); }}
              title={t('polish.help')}
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
            {/* School Year Selector */}
            {schoolYears.length > 0 && (
              <Select value={selectedYearId} onValueChange={(v) => {
                setSelectedYearId(v);
                setSchoolYearId(v);
              }}>
                <SelectTrigger className="hidden sm:flex h-9 w-auto text-xs rounded-lg border-emerald-200/50 dark:border-emerald-900/30 bg-white/60 dark:bg-gray-800/50 min-w-[120px] lg:min-w-[150px] hover:bg-emerald-50/40 dark:hover:bg-emerald-900/15">
                  <GraduationCap className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                  <SelectValue placeholder={t('header.select_year')} />
                </SelectTrigger>
                <SelectContent>
                  {schoolYears.map((yr) => (
                    <SelectItem key={yr.id} value={yr.id}>{yr.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {/* Notification Bell with Popover */}
            <Popover open={notifOpen} onOpenChange={setNotifOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 relative text-emerald-600 dark:text-emerald-400"
                  title={t('notifications.title')}
                >
                  <Bell className="h-4 w-4" />
                  {notifData && notifData.unreadCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                      className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-[9px] font-bold flex items-center justify-center shadow-sm shadow-emerald-300/30"
                    >
                      {notifData.unreadCount > 9 ? '9+' : notifData.unreadCount}
                    </motion.span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-[380px] p-0 rounded-xl border-emerald-200/60 dark:border-emerald-900/40 shadow-xl shadow-emerald-900/10"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-100/50 dark:border-emerald-900/30 bg-gradient-to-r from-emerald-50/50 to-teal-50/30 dark:from-emerald-950/20 dark:to-teal-950/10">
                  <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                    <Bell className="h-3.5 w-3.5" />
                    {t('notifications.title')}
                  </h3>
                  <div className="flex items-center gap-1">
                    {notifData && notifData.unreadCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleMarkAllRead}
                        className="h-7 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/20"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-0.5" />
                        {t('notifications.mark_all_read')}
                      </Button>
                    )}
                  </div>
                </div>
                {/* Content */}
                <ScrollArea className="max-h-[420px]">
                  {notifLoading && (
                    <div className="px-4 py-8 text-center">
                      <Bell className="h-6 w-6 animate-pulse mx-auto mb-2 text-emerald-400" />
                      <p className="text-xs text-emerald-600/70 dark:text-emerald-400/60">Loading…</p>
                    </div>
                  )}
                  {!notifLoading && notifData && notifData.notifications.length === 0 && (
                    <div className="px-4 py-8 text-center">
                      <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t('notifications.empty')}</p>
                    </div>
                  )}
                  {!notifLoading && groupedNotifications.map((group) => (
                    <div key={group.label} className="px-2">
                      <p className="px-2 py-1.5 text-[10px] uppercase tracking-wider font-semibold text-emerald-600/70 dark:text-emerald-400/60">
                        {group.label}
                      </p>
                      {group.notifications.map((n: DBNotification, i: number) => {
                        const typeInfo = getNotifTypeInfo(n.type);
                        const TypeIcon = typeInfo.icon;
                        return (
                          <motion.div
                            key={n.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            onClick={() => handleNotificationClick(n)}
                            className={`flex items-start gap-3 px-2 py-2.5 rounded-lg transition-colors cursor-pointer min-h-[44px] hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 ${!n.isRead ? 'bg-emerald-50/30 dark:bg-emerald-900/5' : 'opacity-70'}`}
                          >
                            <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${typeInfo.bg} shrink-0`}>
                              <TypeIcon className={`h-4 w-4 ${typeInfo.text}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{n.title}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{n.message}</p>
                              <Badge variant="outline" className="mt-1 text-[10px] px-1.5 py-0 bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200/50 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                                {typeInfo.label}
                              </Badge>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              {!n.isRead && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); handleMarkSingleRead(n.id); }}
                                  className="h-6 w-6 p-0 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/20"
                                  title={t('notifications.mark_read')}
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  ))}
                </ScrollArea>
                {/* Footer */}
                {!notifLoading && notifData && notifData.notifications.length > 0 && (
                  <div className="px-3 py-2 border-t border-emerald-100/30 dark:border-emerald-900/20 flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setNotifOpen(false); setCurrentView('progress'); }}
                      className="h-7 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/20"
                    >
                      <Pencil className="w-3 h-3 mr-0.5" /> {t('notifications.record_now')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setNotifOpen(false); setCurrentView('assessments'); }}
                      className="h-7 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/20"
                    >
                      <ClipboardCheck className="w-3 h-3 mr-0.5" /> {t('notifications.to_assessment')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setNotifOpen(false); setCurrentView('reports'); }}
                      className="h-7 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/20"
                    >
                      <FileText className="w-3 h-3 mr-0.5" /> {t('notifications.to_report')}
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
            {/* Language toggle (mobile: just flag) */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
              onClick={toggleLocale}
              title={t('language.toggle')}
            >
              <Globe className="h-4 w-4" />
            </Button>
            {/* User avatar */}
            <Avatar className="h-9 w-9 ring-2 ring-emerald-200 dark:ring-emerald-800 shrink-0">
              <AvatarFallback className="bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700 dark:from-emerald-900 dark:to-teal-900 dark:text-emerald-300 text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-6 bg-white dark:bg-gray-950">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {renderView(currentView)}
            </motion.div>
          </AnimatePresence>
        </div>

        <footer className="mt-auto border-t border-emerald-200/50 dark:border-emerald-900/30 bg-white dark:bg-gray-950 py-3 px-4">
          <div className="flex items-center justify-between text-xs text-emerald-600/60 dark:text-emerald-400/40">
            <span className="flex items-center gap-1">
              <Leaf className="h-3 w-3 text-emerald-500" />
              CompetenceTrack — {t('footer.copyright')}
            </span>
            <span className="flex items-center gap-2">
              <span className="hidden sm:inline">{t('footer.version')} · {t('footer.oss')}</span>
              <span className="sm:hidden">{t('footer.version')}</span>
            </span>
          </div>
        </footer>
      </SidebarInset>

      {/* ─── Command Palette (Cmd+K) ─────────────────────────── */}
      <CommandDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        title={t('shortcuts.command_palette')}
        description={t('shortcuts.description')}
        className="max-w-xl rounded-2xl border-emerald-200/60 dark:border-emerald-900/40 shadow-2xl shadow-emerald-900/10 [&_[cmdk-group-heading]]:text-emerald-600/70 [&_[cmdk-group-heading]]:dark:text-emerald-400/60 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-input-wrapper]]:border-emerald-200/40 [&_[cmdk-input-wrapper]]:dark:border-emerald-900/30 [&_[cmdk-input-wrapper]]:bg-gradient-to-r [&_[cmdk-input-wrapper]]:from-emerald-50/50 [&_[cmdk-input-wrapper]]:to-transparent [&_[cmdk-input-wrapper]]:dark:from-emerald-950/20 [&_[cmdk-item]]:rounded-lg [&_[cmdk-item]]:hover:bg-emerald-50 [&_[cmdk-item]]:dark:hover:bg-emerald-900/20 [&_[cmdk-item]]:data-[selected=true]:bg-emerald-50/70 [&_[cmdk-item]]:dark:data-[selected=true]:bg-emerald-900/30 [&_[cmdk-item]]:data-[selected=true]:text-emerald-700 [&_[cmdk-item]]:dark:data-[selected=true]:text-emerald-300"
      >
        <CommandInput
          placeholder={t('polish.search_placeholder')}
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList className="max-h-[60vh]">
          <CommandEmpty>
            <div className="py-6 text-center">
              <FolderSearch className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('polish.no_results')}</p>
            </div>
          </CommandEmpty>

          {/* Recent actions */}
          {!searchQuery.trim() && recentActions.length > 0 && (
            <CommandGroup heading={t('shortcuts.recent_actions')}>
              {recentActions.map((action) => (
                <CommandItem
                  key={action.key}
                  onSelect={() => {
                    if (action.view) {
                      setCurrentView(action.view);
                      trackAction(action.key, action.label, action.view);
                    }
                    setSearchOpen(false);
                  }}
                >
                  <CornerDownLeft className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                  <span>{action.label}</span>
                  <CommandShortcut className="text-emerald-600/60 dark:text-emerald-400/50">
                    {t('shortcuts.recent_actions')}
                  </CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Quick actions (shown when no search query) */}
          {!searchQuery.trim() && (
            <CommandGroup heading={t('shortcuts.quick_actions')}>
              <CommandItem
                onSelect={() => {
                  setCurrentView('progress');
                  trackAction('new-entry', t('shortcuts.new_entry'), 'progress');
                  setSearchOpen(false);
                }}
              >
                <Plus className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                <span>{t('shortcuts.new_entry')}</span>
                <CommandShortcut>
                  <kbd className="inline-flex items-center gap-0.5 text-[10px] font-mono">
                    <Command className="h-2.5 w-2.5" />N
                  </kbd>
                </CommandShortcut>
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setCurrentView('assessments');
                  trackAction('new-assessment', t('action.create_assessment'), 'assessments');
                  setSearchOpen(false);
                }}
              >
                <ClipboardCheck className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                <span>{t('action.create_assessment')}</span>
                <CommandShortcut>
                  <kbd className="inline-flex items-center gap-0.5 text-[10px] font-mono">
                    <Command className="h-2.5 w-2.5" />5
                  </kbd>
                </CommandShortcut>
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setCurrentView('reports');
                  trackAction('new-report', t('action.generate_report'), 'reports');
                  setSearchOpen(false);
                }}
              >
                <FileText className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                <span>{t('action.generate_report')}</span>
                <CommandShortcut>
                  <kbd className="inline-flex items-center gap-0.5 text-[10px] font-mono">
                    <Command className="h-2.5 w-2.5" />7
                  </kbd>
                </CommandShortcut>
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setShortcutsOpen(true);
                  setSearchOpen(false);
                }}
              >
                <HelpCircle className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                <span>{t('shortcuts.show_shortcuts')}</span>
                <CommandShortcut>
                  <kbd className="inline-flex items-center gap-0.5 text-[10px] font-mono">
                    <Command className="h-2.5 w-2.5" />/
                  </kbd>
                </CommandShortcut>
              </CommandItem>
            </CommandGroup>
          )}

          {/* Available views (shown when no search query) */}
          {!searchQuery.trim() && (
            <CommandGroup heading={t('shortcuts.views')}>
              {navSections.flatMap((section) => section.items).map((item, idx) => (
                <CommandItem
                  key={item.key}
                  onSelect={() => {
                    setCurrentView(item.key);
                    trackAction(`view-${item.key}`, t(item.labelKey), item.key);
                    setSearchOpen(false);
                  }}
                >
                  <item.icon className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                  <span>{t(item.labelKey)}</span>
                  {idx < 9 && (
                    <CommandShortcut>
                      <kbd className="inline-flex items-center gap-0.5 text-[10px] font-mono">
                        <Command className="h-2.5 w-2.5" />{idx + 1}
                      </kbd>
                    </CommandShortcut>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Search results: Students */}
          {searchStudents.length > 0 && (
            <CommandGroup heading={t('nav.classes')}>
              {searchStudents.map((s) => (
                <CommandItem
                  key={s.id}
                  value={`${s.firstName} ${s.lastName} ${s.externalId ?? ''}`}
                  onSelect={() => handleSearchPickStudent(s)}
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900 dark:to-teal-900 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold shrink-0">
                    {s.firstName[0]}{s.lastName[0]}
                  </div>
                  <span className="truncate">{s.firstName} {s.lastName}</span>
                  <CommandShortcut className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[120px]">
                    {s.enrollments?.[0]?.classGroup?.name ?? ''}
                  </CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Search results: Classes */}
          {searchClasses.length > 0 && (
            <CommandGroup heading={t('polish.class_overview')}>
              {searchClasses.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`${c.name} ${c.gradeLevel}`}
                  onSelect={() => handleSearchPickClass(c)}
                >
                  <Users className="h-4 w-4 text-teal-500 dark:text-teal-400" />
                  <span className="truncate">{c.name}</span>
                  <CommandShortcut className="text-xs text-gray-400 dark:text-gray-500">
                    {t('label.grade')} {c.gradeLevel}
                  </CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>

      {/* ─── Keyboard Shortcuts Dialog ────────────────────── */}
      <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />

      {/* ─── Help Modal ─────────────────────────────────────────── */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-lg rounded-2xl border-emerald-200/60 dark:border-emerald-900/40">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
              <HelpCircle className="h-5 w-5" />
              {t('polish.help')}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 dark:text-gray-400">
              CompetenceTrack · {t('footer.version')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            {[
              { kbd: '⌘K', label: t('shortcuts.command_palette') },
              { kbd: '⌘/', label: t('shortcuts.show_shortcuts') },
              { kbd: '⌘N', label: t('shortcuts.new_entry') },
              { kbd: '⌘1-9', label: t('shortcuts.switch_view') },
              { kbd: 'Esc', label: t('shortcuts.close_dialog') },
            ].map((row) => (
              <div key={row.kbd} className="flex items-center justify-between rounded-lg px-3 py-2 bg-emerald-50/40 dark:bg-emerald-900/10 border border-emerald-100/50 dark:border-emerald-900/20">
                <span className="text-gray-700 dark:text-gray-300">{row.label}</span>
                <kbd className="inline-flex items-center px-2 py-0.5 rounded bg-white dark:bg-gray-800 border border-emerald-200/50 dark:border-emerald-900/30 text-[11px] font-mono text-emerald-700 dark:text-emerald-300">
                  {row.kbd}
                </kbd>
              </div>
            ))}
            <p className="pt-2 text-xs text-gray-500 dark:text-gray-400">
              {t('app.tagline')}
            </p>
            {/* Restart onboarding tour */}
            <div className="pt-2 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setHelpOpen(false); setShortcutsOpen(true); }}
                className="flex-1 text-xs border-emerald-200/50 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
              >
                <Command className="w-3.5 h-3.5 mr-1" /> {t('shortcuts.show_shortcuts')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setHelpOpen(false); setOnboardingOpen(true); }}
                className="flex-1 text-xs border-emerald-200/50 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
              >
                <GraduationCap className="w-3.5 h-3.5 mr-1" /> Tour
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Onboarding Tour ─────────────────────────────────────── */}
      <OnboardingTour open={onboardingOpen} onClose={() => setOnboardingOpen(false)} />
    </SidebarProvider>
  );
}
