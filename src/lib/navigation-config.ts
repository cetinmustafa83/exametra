/**
 * Centralized Navigation Configuration
 * Single source of truth for all app navigation routes and menu items
 * Eliminates duplication across multiple navigation files
 */

import {
  LayoutDashboard,
  BookOpen,
  Users,
  MessageSquare,
  TrendingUp,
  Settings,
  BarChart3,
  Calendar,
  AlertCircle,
  Heart,
  Trophy,
  FileText,
  Shield,
  Tv2,
  Bell,
  Grid3x3,
  LucideIcon,
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  roles: string[];
  badge?: string | number;
  description?: string;
  children?: NavItem[];
  requiresApproval?: boolean; // For Module L compliance
}

export interface NavGroup {
  id: string;
  title: string;
  items: NavItem[];
}

/**
 * Core navigation routes - single source of truth
 */
export const NAVIGATION_ROUTES = {
  DASHBOARD: '/dashboard',
  GRADES: '/grades',
  CALENDAR: '/calendar',
  ASSESSMENTS: '/assessments',
  CLASSES: '/classes',
  COMMUNICATION: '/communication',
  ATTENDANCE: '/attendance',
  BEHAVIOR: '/behavior',
  WELLNESS: '/wellness',
  ANALYTICS: '/analytics',
  REPORTS: '/reports',
  SETTINGS: '/settings',
  NOTIFICATIONS: '/notifications',
  COMPLIANCE: '/admin/compliance',
  SIGNAGE: '/admin/signage',
  EXAM_PROCTORING: '/admin/exam-proctoring',
  WIDGETS: '/admin/dashboard-widgets',
} as const;

/**
 * Teacher Navigation Menu
 */
export const TEACHER_NAV_ITEMS: NavGroup[] = [
  {
    id: 'main',
    title: 'Main',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        href: NAVIGATION_ROUTES.DASHBOARD,
        icon: LayoutDashboard,
        roles: ['TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'],
      },
      {
        id: 'classes',
        label: 'Classes',
        href: NAVIGATION_ROUTES.CLASSES,
        icon: Users,
        roles: ['TEACHER', 'SCHOOL_ADMIN'],
      },
    ],
  },
  {
    id: 'academic',
    title: 'Academic',
    items: [
      {
        id: 'calendar',
        label: 'Calendar',
        href: NAVIGATION_ROUTES.CALENDAR,
        icon: Calendar,
        roles: ['TEACHER', 'STUDENT', 'PARENT', 'SCHOOL_ADMIN'],
        description: 'View all events, exams, and school calendar',
      },
      {
        id: 'grades',
        label: 'Grades',
        href: NAVIGATION_ROUTES.GRADES,
        icon: BookOpen,
        roles: ['TEACHER', 'SCHOOL_ADMIN'],
      },
      {
        id: 'assessments',
        label: 'Assessments',
        href: NAVIGATION_ROUTES.ASSESSMENTS,
        icon: FileText,
        roles: ['TEACHER', 'SCHOOL_ADMIN'],
      },
    ],
  },
  {
    id: 'student-management',
    title: 'Student Management',
    items: [
      {
        id: 'attendance',
        label: 'Attendance',
        href: NAVIGATION_ROUTES.ATTENDANCE,
        icon: AlertCircle,
        roles: ['TEACHER', 'SCHOOL_ADMIN'],
      },
      {
        id: 'behavior',
        label: 'Behavior',
        href: NAVIGATION_ROUTES.BEHAVIOR,
        icon: Heart,
        roles: ['TEACHER', 'SCHOOL_ADMIN'],
      },
      {
        id: 'wellness',
        label: 'Wellness',
        href: NAVIGATION_ROUTES.WELLNESS,
        icon: Heart,
        roles: ['TEACHER'],
        requiresApproval: true, // Module L
      },
    ],
  },
  {
    id: 'communication',
    title: 'Communication',
    items: [
      {
        id: 'messages',
        label: 'Messages',
        href: NAVIGATION_ROUTES.COMMUNICATION,
        icon: MessageSquare,
        roles: ['TEACHER', 'PARENT', 'STUDENT', 'SCHOOL_ADMIN'],
      },
      {
        id: 'notifications',
        label: 'Notifications',
        href: NAVIGATION_ROUTES.NOTIFICATIONS,
        icon: Bell,
        roles: ['TEACHER', 'PARENT', 'STUDENT', 'SCHOOL_ADMIN'],
      },
    ],
  },
  {
    id: 'admin',
    title: 'Administration',
    items: [
      {
        id: 'analytics',
        label: 'Analytics',
        href: NAVIGATION_ROUTES.ANALYTICS,
        icon: BarChart3,
        roles: ['SCHOOL_ADMIN', 'SUPER_ADMIN'],
      },
      {
        id: 'reports',
        label: 'Reports',
        href: NAVIGATION_ROUTES.REPORTS,
        icon: TrendingUp,
        roles: ['SCHOOL_ADMIN', 'SUPER_ADMIN'],
      },
      {
        id: 'compliance',
        label: 'Compliance',
        href: NAVIGATION_ROUTES.COMPLIANCE,
        icon: Shield,
        roles: ['DPO', 'SCHOOL_ADMIN', 'SUPER_ADMIN'],
        requiresApproval: true, // Module L
      },
      {
        id: 'signage',
        label: 'Signage',
        href: NAVIGATION_ROUTES.SIGNAGE,
        icon: Tv2,
        roles: ['SCHOOL_ADMIN', 'SUPER_ADMIN'],
        requiresApproval: true, // Module B
      },
      {
        id: 'exam-proctoring',
        label: 'Exam Proctoring',
        href: NAVIGATION_ROUTES.EXAM_PROCTORING,
        icon: Trophy,
        roles: ['SCHOOL_ADMIN', 'SUPER_ADMIN'],
        requiresApproval: true, // Module F
      },
      {
        id: 'widgets',
        label: 'Dashboard Widgets',
        href: NAVIGATION_ROUTES.WIDGETS,
        icon: Grid3x3,
        roles: ['SCHOOL_ADMIN', 'SUPER_ADMIN'],
      },
    ],
  },
  {
    id: 'system',
    title: 'System',
    items: [
      {
        id: 'settings',
        label: 'Settings',
        href: NAVIGATION_ROUTES.SETTINGS,
        icon: Settings,
        roles: ['TEACHER', 'PARENT', 'STUDENT', 'SCHOOL_ADMIN', 'SUPER_ADMIN', 'DPO'],
      },
    ],
  },
];

/**
 * Student Navigation Menu
 */
export const STUDENT_NAV_ITEMS: NavGroup[] = [
  {
    id: 'main',
    title: 'Main',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        href: NAVIGATION_ROUTES.DASHBOARD,
        icon: LayoutDashboard,
        roles: ['STUDENT'],
      },
    ],
  },
  {
    id: 'academics',
    title: 'My Academics',
    items: [
      {
        id: 'grades',
        label: 'My Grades',
        href: NAVIGATION_ROUTES.GRADES,
        icon: BookOpen,
        roles: ['STUDENT'],
      },
      {
        id: 'assessments',
        label: 'Assessments',
        href: NAVIGATION_ROUTES.ASSESSMENTS,
        icon: FileText,
        roles: ['STUDENT'],
      },
    ],
  },
  {
    id: 'communication',
    title: 'Communication',
    items: [
      {
        id: 'messages',
        label: 'Messages',
        href: NAVIGATION_ROUTES.COMMUNICATION,
        icon: MessageSquare,
        roles: ['STUDENT'],
      },
      {
        id: 'notifications',
        label: 'Notifications',
        href: NAVIGATION_ROUTES.NOTIFICATIONS,
        icon: Bell,
        roles: ['STUDENT'],
      },
    ],
  },
  {
    id: 'system',
    title: 'System',
    items: [
      {
        id: 'settings',
        label: 'Settings',
        href: NAVIGATION_ROUTES.SETTINGS,
        icon: Settings,
        roles: ['STUDENT'],
      },
    ],
  },
];

/**
 * Parent Navigation Menu
 */
export const PARENT_NAV_ITEMS: NavGroup[] = [
  {
    id: 'main',
    title: 'Main',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        href: NAVIGATION_ROUTES.DASHBOARD,
        icon: LayoutDashboard,
        roles: ['PARENT'],
      },
    ],
  },
  {
    id: 'child-info',
    title: 'Child Information',
    items: [
      {
        id: 'grades',
        label: 'Grades & Progress',
        href: NAVIGATION_ROUTES.GRADES,
        icon: BookOpen,
        roles: ['PARENT'],
      },
      {
        id: 'attendance',
        label: 'Attendance',
        href: NAVIGATION_ROUTES.ATTENDANCE,
        icon: AlertCircle,
        roles: ['PARENT'],
      },
    ],
  },
  {
    id: 'communication',
    title: 'Communication',
    items: [
      {
        id: 'messages',
        label: 'Messages',
        href: NAVIGATION_ROUTES.COMMUNICATION,
        icon: MessageSquare,
        roles: ['PARENT'],
      },
      {
        id: 'notifications',
        label: 'Notifications',
        href: NAVIGATION_ROUTES.NOTIFICATIONS,
        icon: Bell,
        roles: ['PARENT'],
      },
    ],
  },
  {
    id: 'system',
    title: 'System',
    items: [
      {
        id: 'settings',
        label: 'Settings',
        href: NAVIGATION_ROUTES.SETTINGS,
        icon: Settings,
        roles: ['PARENT'],
      },
    ],
  },
];

/**
 * Get navigation items for a specific user role
 */
export function getNavItemsForRole(role?: string): NavGroup[] {
  if (!role) return [];
  
  switch (role) {
    case 'STUDENT':
      return STUDENT_NAV_ITEMS;
    case 'PARENT':
      return PARENT_NAV_ITEMS;
    case 'TEACHER':
    case 'SCHOOL_ADMIN':
    case 'SUPER_ADMIN':
    case 'DPO':
    case 'VICE_PRINCIPAL':
      return TEACHER_NAV_ITEMS;
    default:
      return TEACHER_NAV_ITEMS;
  }
}

/**
 * Flatten navigation structure for routing
 */
export function flattenNavItems(groups: NavGroup[]): NavItem[] {
  const items: NavItem[] = [];
  
  groups.forEach((group) => {
    group.items.forEach((item) => {
      items.push(item);
      if (item.children) {
        items.push(...item.children);
      }
    });
  });
  
  return items;
}
