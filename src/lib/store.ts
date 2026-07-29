// CompetenceTrack — Zustand Store
import { create } from 'zustand';
import { setLocale, getLocale } from '@/lib/i18n';

export type ViewName =
  | 'dashboard'
  | 'classes'
  | 'competencies'
  | 'progress'
  | 'flower'
  | 'assessments'
  | 'grading'
  | 'reports'
  | 'settings'
  | 'student-detail'
  | 'analytics'
  | 'matrix'
  | 'attendance'
  | 'calendar'
  | 'lesson-plans'
  | 'parents'
  | 'behavior'
  | 'coverage'
  | 'rubrics'
  | 'comments'
  | 'notebooks'
  | 'drawing'
  | 'homework'
  | 'portfolio';

export interface CurrentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  schoolId: string | null;
  locale: string;
  isDemo?: boolean;
}

export interface NotificationPrefs {
  showProgress: boolean;
  showAssessments: boolean;
  showGrades: boolean;
  showReports: boolean;
}

interface AppState {
  // Navigation
  currentView: ViewName;
  previousView: ViewName | null;
  setCurrentView: (view: ViewName) => void;
  navigateToStudentDetail: (studentId: string, fromView?: ViewName) => void;
  navigateBack: () => void;

  // Auth
  currentUser: CurrentUser | null;
  isLoadingAuth: boolean;
  setCurrentUser: (user: CurrentUser | null) => void;
  logout: () => Promise<void>;

  // Selection
  currentClassId: string | null;
  currentStudentId: string | null;
  currentSubjectId: string | null;
  schoolYearId: string | null;
  setCurrentClass: (id: string | null) => void;
  setCurrentStudent: (id: string | null) => void;
  setCurrentSubject: (id: string | null) => void;
  setSchoolYearId: (id: string | null) => void;

  // UI
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;

  // Locale
  locale: string;
  setLocale: (locale: string) => void;

  // Notifications
  notificationPrefs: NotificationPrefs;
  setNotificationPrefs: (prefs: NotificationPrefs) => void;
}

function loadNotificationPrefs(): NotificationPrefs {
  try {
    const stored = localStorage.getItem('ct_notification_prefs');
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore
  }
  return { showProgress: true, showAssessments: true, showGrades: true, showReports: true };
}

export const useAppStore = create<AppState>((set, get) => ({
  // Navigation
  currentView: 'dashboard',
  previousView: null,
  setCurrentView: (view) => set({ currentView: view }),
  navigateToStudentDetail: (studentId, fromView) => set((s) => ({
    currentStudentId: studentId,
    previousView: fromView ?? s.currentView,
    currentView: 'student-detail' as ViewName,
  })),
  navigateBack: () => set((s) => ({
    currentView: s.previousView ?? 'classes',
    previousView: null,
  })),

  // Auth
  currentUser: null,
  isLoadingAuth: true,
  setCurrentUser: (user) => set({ currentUser: user, isLoadingAuth: false }),
  logout: async () => {
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
    } catch {
      // ignore
    }
    set({ currentUser: null, currentView: 'dashboard' });
  },

  // Selection
  currentClassId: null,
  currentStudentId: null,
  currentSubjectId: null,
  schoolYearId: null,
  setCurrentClass: (id) => set({ currentClassId: id, currentStudentId: null }),
  setCurrentStudent: (id) => set({ currentStudentId: id }),
  setCurrentSubject: (id) => set({ currentSubjectId: id }),
  setSchoolYearId: (id) => set({ schoolYearId: id }),

  // UI
  sidebarCollapsed: false,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  // Locale
  locale: getLocale(),
  setLocale: (locale) => {
    setLocale(locale);
    set({ locale });
  },

  // Notifications
  notificationPrefs: loadNotificationPrefs(),
  setNotificationPrefs: (prefs) => {
    try {
      localStorage.setItem('ct_notification_prefs', JSON.stringify(prefs));
    } catch {
      // ignore
    }
    set({ notificationPrefs: prefs });
  },
}));
