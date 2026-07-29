'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Settings as SettingsIcon,
  School,
  Calendar,
  BookOpen,
  FileText,
  Shield,
  Download,
  Trash2,
  Plus,
  Pencil,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Filter,
  RefreshCw,
  Users,
  UserPlus,
  Mail,
  Key,
  Search,
  Database,
  Activity,
  GraduationCap,
  Heart,
  UserCheck,
  Zap,
  BarChart3,
  TrendingUp,
  CheckCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import {
  fetchSchools,
  updateSchool,
  fetchSchoolYears,
  createSchoolYear,
  fetchSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  fetchAuditLog,
  downloadCsvExport,
  requestDataErasure,
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
  type School as SchoolType,
  type SchoolYear,
  type Subject,
  type AuditLogEntry,
  type UserAccount,
} from '@/lib/api';
import { toast } from 'sonner';
import { apiGet, apiPut, apiDelete } from '@/lib/api';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

const schoolTypeLabels: Record<string, string> = {
  ELEMENTARY: 'Grundschule',
  MIDDLE: 'Mittelschule',
  GYMNASIUM: 'Gymnasium',
  OTHER: 'Weitere',
};

const actionColors: Record<string, string> = {
  CREATE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  UPDATE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  LOGIN: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  EXPORT: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
};

export default function SettingsView() {
  const currentUser = useAppStore((s) => s.currentUser);
  const [activeTab, setActiveTab] = useState('school');

  // School info state
  const [schools, setSchools] = useState<SchoolType[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<SchoolType | null>(null);
  const [schoolForm, setSchoolForm] = useState({ name: '', schoolType: '', country: '', timezone: '' });
  const [schoolLoading, setSchoolLoading] = useState(true);
  const [schoolSaving, setSchoolSaving] = useState(false);

  // School years state
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [yearsLoading, setYearsLoading] = useState(true);
  const [showCreateYear, setShowCreateYear] = useState(false);
  const [yearForm, setYearForm] = useState({ label: '', startDate: '', endDate: '' });

  // Subjects state
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [showCreateSubject, setShowCreateSubject] = useState(false);
  const [subjectForm, setSubjectForm] = useState({ name: '', gradeLevelMin: 1, gradeLevelMax: 13 });
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [deleteSubjectId, setDeleteSubjectId] = useState<string | null>(null);

  // Audit log state
  const [auditEntries, setAuditEntries] = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditActionFilter, setAuditActionFilter] = useState('all');
  const [auditDateFrom, setAuditDateFrom] = useState('');
  const [auditDateTo, setAuditDateTo] = useState('');
  const [auditSearch, setAuditSearch] = useState('');

  // Data erasure state
  const [showErasureDialog, setShowErasureDialog] = useState(false);
  const [erasureScope, setErasureScope] = useState('STUDENT');

  // Users state
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [userForm, setUserForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'TEACHER' as 'TEACHER' | 'SCHOOL_ADMIN' | 'SUPER_ADMIN',
  });
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  // Demo accounts state
  const [demoAccounts, setDemoAccounts] = useState<Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isDemo: boolean;
    deletedAt: string | null;
    createdAt: string;
    updatedAt: string;
  }>>([]);
  const [demoLoading, setDemoLoading] = useState(true);
  const [deleteDemoId, setDeleteDemoId] = useState<string | null>(null);
  const [deleteAllDemoOpen, setDeleteAllDemoOpen] = useState(false);

  const isAdmin = currentUser?.role === 'SCHOOL_ADMIN' || currentUser?.role === 'SUPER_ADMIN';

  const loadSchools = useCallback(async () => {
    setSchoolLoading(true);
    try {
      const data = await fetchSchools();
      setSchools(data);
      if (currentUser?.schoolId) {
        const mySchool = data.find((s) => s.id === currentUser.schoolId);
        if (mySchool) {
          setSelectedSchool(mySchool);
          setSchoolForm({
            name: mySchool.name,
            schoolType: mySchool.schoolType,
            country: mySchool.country,
            timezone: mySchool.timezone,
          });
        }
      } else if (data.length > 0) {
        setSelectedSchool(data[0]);
        setSchoolForm({
          name: data[0].name,
          schoolType: data[0].schoolType,
          country: data[0].country,
          timezone: data[0].timezone,
        });
      }
    } catch {
      toast.error(t('error.generic'));
    } finally {
      setSchoolLoading(false);
    }
  }, [currentUser?.schoolId]);

  const loadSchoolYears = useCallback(async () => {
    if (!currentUser?.schoolId) return;
    setYearsLoading(true);
    try {
      const data = await fetchSchoolYears(currentUser.schoolId);
      setSchoolYears(data);
    } catch {
      toast.error(t('error.generic'));
    } finally {
      setYearsLoading(false);
    }
  }, [currentUser?.schoolId]);

  const loadSubjects = useCallback(async () => {
    setSubjectsLoading(true);
    try {
      const data = await fetchSubjects(currentUser?.schoolId ?? undefined);
      setSubjects(data);
    } catch {
      toast.error(t('error.generic'));
    } finally {
      setSubjectsLoading(false);
    }
  }, [currentUser?.schoolId]);

  const loadAuditLog = useCallback(async () => {
    setAuditLoading(true);
    try {
      const data = await fetchAuditLog({
        schoolId: currentUser?.schoolId ?? undefined,
        action: auditActionFilter !== 'all' ? auditActionFilter : undefined,
        startDate: auditDateFrom || undefined,
        endDate: auditDateTo || undefined,
      });
      setAuditEntries(data);
    } catch {
      toast.error(t('error.generic'));
    } finally {
      setAuditLoading(false);
    }
  }, [currentUser?.schoolId, auditActionFilter, auditDateFrom, auditDateTo]);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const data = await fetchUsers(currentUser?.schoolId ?? undefined);
      setUsers(data);
    } catch {
      toast.error(t('error.generic'));
    } finally {
      setUsersLoading(false);
    }
  }, [currentUser?.schoolId]);

  const loadDemoAccounts = useCallback(async () => {
    setDemoLoading(true);
    try {
      const response = await fetch('/api/demo-accounts');
      if (!response.ok) {
        throw new Error(`API error ${response.status}`);
      }
      const data = await response.json();
      setDemoAccounts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load demo accounts:', err);
      setDemoAccounts([]);
    } finally {
      setDemoLoading(false);
    }
  }, []);

  // Reload demo accounts when demo tab is selected
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    if (tab === 'demo' && isAdmin) {
      loadDemoAccounts();
    }
  }, [isAdmin, loadDemoAccounts]);

  useEffect(() => {
    loadSchools();
    loadSchoolYears();
    loadSubjects();
    loadAuditLog();
    loadUsers();
    if (isAdmin) loadDemoAccounts();
  }, [loadSchools, loadSchoolYears, loadSubjects, loadAuditLog, loadUsers, isAdmin, loadDemoAccounts]);

  const handleSaveSchool = async () => {
    if (!selectedSchool) return;
    setSchoolSaving(true);
    try {
      await updateSchool({
        id: selectedSchool.id,
        ...schoolForm,
      });
      toast.success(t('settings.school_saved'));
      loadSchools();
    } catch {
      toast.error(t('error.generic'));
    } finally {
      setSchoolSaving(false);
    }
  };

  const handleCreateYear = async () => {
    if (!currentUser?.schoolId) return;
    try {
      await createSchoolYear({
        schoolId: currentUser.schoolId,
        ...yearForm,
      });
      toast.success(t('settings.year_created'));
      setShowCreateYear(false);
      setYearForm({ label: '', startDate: '', endDate: '' });
      loadSchoolYears();
    } catch {
      toast.error(t('error.generic'));
    }
  };

  const handleCreateSubject = async () => {
    try {
      await createSubject({
        schoolId: currentUser?.schoolId ?? null,
        ...subjectForm,
      });
      toast.success(t('settings.subject_created'));
      setShowCreateSubject(false);
      setSubjectForm({ name: '', gradeLevelMin: 1, gradeLevelMax: 13 });
      loadSubjects();
    } catch {
      toast.error(t('error.generic'));
    }
  };

  const handleUpdateSubject = async () => {
    if (!editingSubject) return;
    try {
      await updateSubject({
        id: editingSubject.id,
        name: subjectForm.name,
        gradeLevelMin: subjectForm.gradeLevelMin,
        gradeLevelMax: subjectForm.gradeLevelMax,
      });
      toast.success(t('settings.subject_updated'));
      setEditingSubject(null);
      setSubjectForm({ name: '', gradeLevelMin: 1, gradeLevelMax: 13 });
      loadSubjects();
    } catch {
      toast.error(t('error.generic'));
    }
  };

  const handleDeleteSubject = async () => {
    if (!deleteSubjectId) return;
    try {
      await deleteSubject(deleteSubjectId);
      toast.success(t('settings.subject_deleted'));
      setDeleteSubjectId(null);
      loadSubjects();
    } catch {
      toast.error(t('error.generic'));
    }
  };

  const handleCsvExport = (type: 'students' | 'progress' | 'assessments' | 'grades') => {
    downloadCsvExport({
      type,
      schoolId: currentUser?.schoolId ?? undefined,
      schoolYearId: useAppStore.getState().schoolYearId ?? undefined,
    });
    toast.success(t('settings.data_export_started'));
  };

  const handleErasureRequest = async () => {
    try {
      await requestDataErasure({
        scope: erasureScope,
      });
      toast.success(t('settings.data_erasure_requested'));
      setShowErasureDialog(false);
    } catch {
      toast.error(t('error.generic'));
    }
  };

  // ── Demo account handlers ──
  const handleToggleDemoAccount = async (id: string, currentDeletedAt: string | null) => {
    try {
      const action = currentDeletedAt ? 'enable' : 'disable';
      await apiPut(`/api/demo-accounts/${id}`, { action });
      toast.success(t('settings.demo_account_toggled'));
      loadDemoAccounts();
    } catch {
      toast.error(t('error.generic'));
    }
  };

  const handleDeleteDemoAccount = async (id: string) => {
    try {
      await apiDelete(`/api/demo-accounts/${id}`);
      toast.success(t('settings.demo_account_deleted'));
      setDeleteDemoId(null);
      loadDemoAccounts();
    } catch {
      toast.error(t('error.generic'));
    }
  };

  const handleDisableAllDemo = async () => {
    try {
      await apiPut('/api/demo-accounts', { action: 'disable' });
      toast.success(t('settings.demo_disabled'));
      loadDemoAccounts();
    } catch {
      toast.error(t('error.generic'));
    }
  };

  const handleEnableAllDemo = async () => {
    try {
      await apiPut('/api/demo-accounts', { action: 'enable' });
      toast.success(t('settings.demo_enabled'));
      loadDemoAccounts();
    } catch {
      toast.error(t('error.generic'));
    }
  };

  const handleDeleteAllDemo = async () => {
    try {
      await apiDelete('/api/demo-accounts');
      toast.success(t('settings.demo_deleted'));
      setDeleteAllDemoOpen(false);
      loadDemoAccounts();
    } catch {
      toast.error(t('error.generic'));
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SCHOOL_ADMIN': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
      case 'TEACHER': return 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300';
      case 'STUDENT': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
      case 'PARENT': return 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300';
      case 'SUPER_ADMIN': return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'SCHOOL_ADMIN': return Shield;
      case 'TEACHER': return GraduationCap;
      case 'STUDENT': return UserCheck;
      case 'PARENT': return Heart;
      default: return Users;
    }
  };

  const openCreateUserDialog = () => {
    setEditingUser(null);
    setUserForm({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      role: 'TEACHER',
    });
    setShowUserDialog(true);
  };

  const openEditUserDialog = (u: UserAccount) => {
    setEditingUser(u);
    setUserForm({
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      password: '',
      role: u.role as 'TEACHER' | 'SCHOOL_ADMIN' | 'SUPER_ADMIN',
    });
    setShowUserDialog(true);
  };

  const handleSaveUser = async () => {
    try {
      if (editingUser) {
        await updateUser({
          id: editingUser.id,
          firstName: userForm.firstName,
          lastName: userForm.lastName,
          email: userForm.email,
          role: userForm.role,
        });
        toast.success(t('users.updated'));
      } else {
        if (userForm.password.length < 8) {
          toast.error(t('users.password_hint'));
          return;
        }
        await createUser({
          schoolId: currentUser?.schoolId ?? null,
          email: userForm.email,
          password: userForm.password,
          firstName: userForm.firstName,
          lastName: userForm.lastName,
          role: userForm.role,
        });
        toast.success(t('users.created'));
      }
      setShowUserDialog(false);
      setUserForm({ firstName: '', lastName: '', email: '', password: '', role: 'TEACHER' });
      loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('error.generic'));
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;
    try {
      await deleteUser(deleteUserId);
      toast.success(t('users.deleted'));
      setDeleteUserId(null);
      loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('error.generic'));
    }
  };

  const roleBadge = (role: string) => {
    if (role === 'SUPER_ADMIN')
      return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
    if (role === 'SCHOOL_ADMIN')
      return 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300';
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
  };

  const roleLabel = (role: string) => {
    if (role === 'SUPER_ADMIN') return t('role.super_admin');
    if (role === 'SCHOOL_ADMIN') return t('role.school_admin');
    return t('role.teacher');
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-16">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 mx-auto mb-4">
          <Shield className="h-8 w-8 text-amber-500 dark:text-amber-400" />
        </div>
        <p className="text-gray-500 dark:text-gray-400 font-medium">{t('settings.title')} — {t('role.teacher')}</p>
        <p className="text-xs text-emerald-600/60 dark:text-emerald-400/40 mt-2">{t('error.forbidden')}</p>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-md shadow-emerald-300/30">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('settings.title')}</h2>
            <p className="text-emerald-600/60 dark:text-emerald-400/40 mt-0.5">{t('app.subtitle')}</p>
          </div>
        </div>
      </motion.div>

      {/* Quick stats banner */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {[
            { icon: School, label: t('polish.quick_stats'), value: schools.length, color: 'from-violet-50 to-violet-100/50 dark:from-violet-900/20 dark:to-violet-800/10', text: 'text-violet-700 dark:text-violet-300', iconBg: 'bg-gradient-to-br from-violet-400 to-violet-500', border: 'border-violet-200/40 dark:border-violet-900/30', tab: 'school' },
            { icon: Users, label: t('polish.total_users'), value: users.length, color: 'from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/10', text: 'text-emerald-700 dark:text-emerald-300', iconBg: 'bg-gradient-to-br from-emerald-400 to-teal-500', border: 'border-emerald-200/40 dark:border-emerald-900/30', tab: 'users' },
            { icon: BookOpen, label: t('polish.total_subjects'), value: subjects.length, color: 'from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10', text: 'text-amber-700 dark:text-amber-300', iconBg: 'bg-gradient-to-br from-amber-400 to-amber-500', border: 'border-amber-200/40 dark:border-amber-900/30', tab: 'subjects' },
            { icon: Calendar, label: t('polish.total_years'), value: schoolYears.length, color: 'from-teal-50 to-teal-100/50 dark:from-teal-900/20 dark:to-teal-800/10', text: 'text-teal-700 dark:text-teal-300', iconBg: 'bg-gradient-to-br from-teal-400 to-emerald-500', border: 'border-teal-200/40 dark:border-teal-900/30', tab: 'years' },
            { icon: Activity, label: t('settings.tab_audit'), value: auditEntries.length, color: 'from-slate-50 to-slate-100/50 dark:from-slate-800/40 dark:to-slate-700/10', text: 'text-slate-700 dark:text-slate-300', iconBg: 'bg-gradient-to-br from-slate-400 to-slate-500', border: 'border-slate-200/40 dark:border-slate-700/30', tab: 'audit' },
          ].map((stat) => (
            <div key={stat.label} className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} border ${stat.border} flex items-center gap-2.5 cursor-pointer hover:shadow-md transition-shadow`} onClick={() => setActiveTab(stat.tab)}>
              <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${stat.iconBg} text-white shadow-sm shrink-0`}>
                <stat.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-400 truncate">{stat.label}</p>
                <p className={`text-xl font-bold ${stat.text}`}>{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVariants}>
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex flex-wrap gap-1 h-auto p-1">
            <TabsTrigger value="school" className="rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
              <School className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">{t('settings.tab_school')}</span>
            </TabsTrigger>
            <TabsTrigger value="years" className="rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
              <Calendar className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">{t('settings.tab_years')}</span>
            </TabsTrigger>
            <TabsTrigger value="subjects" className="rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
              <BookOpen className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">{t('settings.tab_subjects')}</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
              <Users className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">{t('settings.tab_users')}</span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
              <Shield className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">{t('settings.tab_audit')}</span>
            </TabsTrigger>
            <TabsTrigger value="data" className="rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
              <FileText className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">{t('settings.tab_data')}</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="demo" className="rounded-lg data-[state=active]:bg-amber-500 data-[state=active]:text-white">
                <Zap className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">{t('settings.demo_accounts')}</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* ── School Info Tab ─────────────────────────────────── */}
          <TabsContent value="school">
            <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-emerald-500 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10 dark:to-transparent">
                <CardTitle className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                    <School className="h-4 w-4" />
                  </div>
                  {t('settings.tab_school')}
                </CardTitle>
                <CardDescription>{t('settings.school_name')} & {t('settings.school_type')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {schoolLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : selectedSchool ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="schoolName" className="text-emerald-700 dark:text-emerald-400">{t('settings.school_name')}</Label>
                      <Input
                        id="schoolName"
                        value={schoolForm.name}
                        onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
                        className="border-emerald-200 dark:border-emerald-900/30 focus:border-emerald-500 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="schoolType" className="text-emerald-700 dark:text-emerald-400">{t('settings.school_type')}</Label>
                      <Select value={schoolForm.schoolType} onValueChange={(v) => setSchoolForm({ ...schoolForm, schoolType: v })}>
                        <SelectTrigger className="border-emerald-200 dark:border-emerald-900/30 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ELEMENTARY">Grundschule</SelectItem>
                          <SelectItem value="MIDDLE">Mittelschule</SelectItem>
                          <SelectItem value="GYMNASIUM">Gymnasium</SelectItem>
                          <SelectItem value="OTHER">Weitere</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="schoolCountry" className="text-emerald-700 dark:text-emerald-400">{t('settings.school_country')}</Label>
                      <Input
                        id="schoolCountry"
                        value={schoolForm.country}
                        onChange={(e) => setSchoolForm({ ...schoolForm, country: e.target.value })}
                        className="border-emerald-200 dark:border-emerald-900/30 focus:border-emerald-500 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="schoolTimezone" className="text-emerald-700 dark:text-emerald-400">{t('settings.school_timezone')}</Label>
                      <Input
                        id="schoolTimezone"
                        value={schoolForm.timezone}
                        onChange={(e) => setSchoolForm({ ...schoolForm, timezone: e.target.value })}
                        className="border-emerald-200 dark:border-emerald-900/30 focus:border-emerald-500 rounded-xl"
                      />
                    </div>
                    <div className="md:col-span-2 flex items-center gap-3">
                      <Button
                        onClick={handleSaveSchool}
                        disabled={schoolSaving}
                        className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md shadow-emerald-300/30 rounded-xl px-6"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        {t('action.save')}
                      </Button>
                      {selectedSchool._count && (
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <span>{selectedSchool._count.users} {t('label.teacher') || 'Lehrkräfte'}</span>
                          <span>{selectedSchool._count.classGroups} {t('label.class')}</span>
                          <span>{selectedSchool._count.students} {t('label.student') || 'Schüler'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">{t('dashboard.no_classes')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── School Years Tab ────────────────────────────────── */}
          <TabsContent value="years">
            <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-teal-500 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-teal-50/50 to-transparent dark:from-teal-900/10 dark:to-transparent">
                <CardTitle className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
                    <Calendar className="h-4 w-4" />
                  </div>
                  {t('settings.tab_years')}
                </CardTitle>
                <CardDescription>{t('label.school_year')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={() => setShowCreateYear(true)}
                  className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white shadow-md rounded-xl px-6"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('action.create')}
                </Button>

                {yearsLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
                  </div>
                ) : schoolYears.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-8 w-8 text-teal-400 dark:text-teal-500 mx-auto mb-2" />
                    <p className="text-gray-500 dark:text-gray-400">{t('settings.audit_no_entries')}</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-education">
                    {schoolYears.map((yr) => {
                      const yearWithCount = yr as SchoolYear & { _count?: { classGroups: number; enrollments: number } };
                      return (
                        <motion.div
                          key={yr.id}
                          whileHover={{ scale: 1.01 }}
                          className="p-4 rounded-xl bg-gradient-to-r from-gray-50 to-gray-50/0 dark:from-gray-800/50 dark:to-gray-800/0 border-l-3 border-l-teal-400/40 hover:border-l-teal-500 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-gray-100">{yr.label}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {new Date(yr.startDate).toLocaleDateString()} — {new Date(yr.endDate).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {yearWithCount._count && (
                                <>
                                  <Badge className="bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 text-xs">
                                    {yearWithCount._count.classGroups} {t('settings.year_classes')}
                                  </Badge>
                                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-xs">
                                    {yearWithCount._count.enrollments} {t('settings.year_enrollments')}
                                  </Badge>
                                </>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {/* Create Year Dialog */}
                <Dialog open={showCreateYear} onOpenChange={setShowCreateYear}>
                  <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
                    <DialogHeader>
                      <DialogTitle>{t('action.create')} {t('label.school_year')}</DialogTitle>
                      <DialogDescription>{t('settings.year_label')}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>{t('settings.year_label')}</Label>
                        <Input
                          value={yearForm.label}
                          onChange={(e) => setYearForm({ ...yearForm, label: e.target.value })}
                          placeholder="2025/2026"
                          className="rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('settings.year_start')}</Label>
                        <Input
                          type="date"
                          value={yearForm.startDate}
                          onChange={(e) => setYearForm({ ...yearForm, startDate: e.target.value })}
                          className="rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('settings.year_end')}</Label>
                        <Input
                          type="date"
                          value={yearForm.endDate}
                          onChange={(e) => setYearForm({ ...yearForm, endDate: e.target.value })}
                          className="rounded-xl"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowCreateYear(false)} className="rounded-xl">{t('action.cancel')}</Button>
                      <Button onClick={handleCreateYear} className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl">{t('action.create')}</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Subjects Tab ────────────────────────────────────── */}
          <TabsContent value="subjects">
            <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-amber-500 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-900/10 dark:to-transparent">
                <CardTitle className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  {t('settings.tab_subjects')}
                </CardTitle>
                <CardDescription>{t('label.subject')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={() => setShowCreateSubject(true)}
                  className="bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-600 hover:to-emerald-600 text-white shadow-md rounded-xl px-6"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('action.create')}
                </Button>

                {subjectsLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
                  </div>
                ) : subjects.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="h-8 w-8 text-amber-400 dark:text-amber-500 mx-auto mb-2" />
                    <p className="text-gray-500 dark:text-gray-400">{t('settings.audit_no_entries')}</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-education">
                    {subjects.map((sub) => (
                      <motion.div
                        key={sub.id}
                        whileHover={{ scale: 1.01 }}
                        className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-gray-50 to-gray-50/0 dark:from-gray-800/50 dark:to-gray-800/0 border-l-3 border-l-amber-400/40 hover:border-l-amber-500 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-bold text-sm shrink-0">
                            {sub.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{sub.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {t('label.grade')} {sub.gradeLevelMin}–{sub.gradeLevelMax} ·
                              <Badge className="ml-1 text-xs px-1.5 py-0">
                                {sub.schoolId ? t('settings.subject_school') : t('settings.subject_global')}
                              </Badge>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-amber-100 dark:hover:bg-amber-900/20"
                            onClick={() => {
                              setEditingSubject(sub);
                              setSubjectForm({
                                name: sub.name,
                                gradeLevelMin: sub.gradeLevelMin,
                                gradeLevelMax: sub.gradeLevelMax,
                              });
                            }}
                          >
                            <Pencil className="h-4 w-4 text-amber-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-red-100 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500"
                            onClick={() => setDeleteSubjectId(sub.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Create/Edit Subject Dialog */}
                <Dialog open={showCreateSubject || editingSubject !== null} onOpenChange={(open) => {
                  if (!open) {
                    setShowCreateSubject(false);
                    setEditingSubject(null);
                    setSubjectForm({ name: '', gradeLevelMin: 1, gradeLevelMax: 13 });
                  }
                }}>
                  <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
                    <DialogHeader>
                      <DialogTitle>
                        {editingSubject ? t('action.edit') : t('action.create')} {t('label.subject')}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>{t('settings.subject_name')}</Label>
                        <Input
                          value={subjectForm.name}
                          onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                          className="rounded-xl"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{t('settings.subject_grade_min')}</Label>
                          <Input
                            type="number"
                            value={subjectForm.gradeLevelMin}
                            onChange={(e) => setSubjectForm({ ...subjectForm, gradeLevelMin: parseInt(e.target.value) || 1 })}
                            className="rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('settings.subject_grade_max')}</Label>
                          <Input
                            type="number"
                            value={subjectForm.gradeLevelMax}
                            onChange={(e) => setSubjectForm({ ...subjectForm, gradeLevelMax: parseInt(e.target.value) || 13 })}
                            className="rounded-xl"
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => {
                        setShowCreateSubject(false);
                        setEditingSubject(null);
                        setSubjectForm({ name: '', gradeLevelMin: 1, gradeLevelMax: 13 });
                      }} className="rounded-xl">{t('action.cancel')}</Button>
                      <Button
                        onClick={editingSubject ? handleUpdateSubject : handleCreateSubject}
                        className="bg-gradient-to-r from-amber-500 to-emerald-500 text-white rounded-xl"
                      >
                        {editingSubject ? t('action.save') : t('action.create')}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Delete Subject Alert */}
                <AlertDialog open={deleteSubjectId !== null} onOpenChange={(open) => { if (!open) setDeleteSubjectId(null); }}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('action.delete')} {t('label.subject')}</AlertDialogTitle>
                      <AlertDialogDescription>{t('settings.subject_deleted')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setDeleteSubjectId(null)}>{t('action.cancel')}</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteSubject}>{t('action.confirm')}</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Users Tab ──────────────────────────────────────── */}
          <TabsContent value="users">
            <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-rose-500 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-rose-50/50 to-transparent dark:from-rose-900/10 dark:to-transparent">
                <CardTitle className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
                    <Users className="h-4 w-4" />
                  </div>
                  {t('users.title')}
                </CardTitle>
                <CardDescription>{t('users.subtitle')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 text-xs font-medium">
                    {t('users.count', { count: users.length })}
                  </Badge>
                  <Button
                    onClick={openCreateUserDialog}
                    className="bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white shadow-md rounded-xl px-6"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    {t('users.create_user')}
                  </Button>
                </div>

                {usersLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-8 w-8 text-rose-400 dark:text-rose-500 mx-auto mb-2" />
                    <p className="text-gray-500 dark:text-gray-400">{t('users.no_users')}</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto scrollbar-education">
                    {users.map((u) => (
                      <motion.div
                        key={u.id}
                        whileHover={{ scale: 1.01 }}
                        className="p-4 rounded-xl bg-gradient-to-r from-gray-50 to-gray-50/0 dark:from-gray-800/50 dark:to-gray-800/0 border-l-3 border-l-rose-400/40 hover:border-l-rose-500 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-900/30 dark:to-amber-900/30 text-rose-600 dark:text-rose-300 font-bold text-sm shrink-0 ring-1 ring-rose-200/50 dark:ring-rose-900/20">
                              {u.firstName[0]}{u.lastName[0]}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                                  {u.firstName} {u.lastName}
                                </p>
                                <Badge className={`${roleBadge(u.role)} text-xs font-medium`}>
                                  {roleLabel(u.role)}
                                </Badge>
                                {u.deletedAt && (
                                  <Badge className="bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300 text-xs">
                                    {t('users.inactive')}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {u.email}
                                </span>
                              </div>
                              {/* Assigned classes */}
                              <div className="flex items-center gap-1 mt-2 flex-wrap">
                                {u.classGroupTeachers && u.classGroupTeachers.length > 0 ? (
                                  u.classGroupTeachers.map((ct) => (
                                    <Badge key={ct.id} className="bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300 text-[10px] font-medium border border-teal-200/50 dark:border-teal-900/30">
                                      {ct.classGroup.name}
                                      <span className="ml-1 text-teal-500/70 dark:text-teal-400/50">
                                        ({ct.role === 'HOMEROOM_TEACHER' ? t('classes.homeroom_teacher') : t('classes.subject_teacher')})
                                      </span>
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                                    {t('users.no_classes_assigned')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-rose-100 dark:hover:bg-rose-900/20"
                              onClick={() => openEditUserDialog(u)}
                              title={t('action.edit')}
                            >
                              <Pencil className="h-4 w-4 text-rose-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-red-100 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500"
                              onClick={() => setDeleteUserId(u.id)}
                              disabled={u.id === currentUser?.id}
                              title={t('action.delete')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Create/Edit User Dialog */}
                <Dialog open={showUserDialog} onOpenChange={(open) => {
                  if (!open) {
                    setShowUserDialog(false);
                    setEditingUser(null);
                    setUserForm({ firstName: '', lastName: '', email: '', password: '', role: 'TEACHER' });
                  }
                }}>
                  <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4 text-rose-500" />
                        {editingUser ? t('users.edit_user') : t('users.create_user')}
                      </DialogTitle>
                      <DialogDescription>{t('users.subtitle')}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{t('label.first_name')}</Label>
                          <Input
                            value={userForm.firstName}
                            onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
                            className="rounded-xl border-rose-200/50 dark:border-rose-900/30"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('label.last_name')}</Label>
                          <Input
                            value={userForm.lastName}
                            onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                            className="rounded-xl border-rose-200/50 dark:border-rose-900/30"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>{t('users.email')}</Label>
                        <Input
                          type="email"
                          value={userForm.email}
                          onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                          className="rounded-xl border-rose-200/50 dark:border-rose-900/30"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('users.role')}</Label>
                        <Select
                          value={userForm.role}
                          onValueChange={(v) => setUserForm({ ...userForm, role: v as 'TEACHER' | 'SCHOOL_ADMIN' | 'SUPER_ADMIN' })}
                        >
                          <SelectTrigger className="rounded-xl border-rose-200/50 dark:border-rose-900/30">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="TEACHER">{t('role.teacher')}</SelectItem>
                            <SelectItem value="SCHOOL_ADMIN">{t('role.school_admin')}</SelectItem>
                            {currentUser?.role === 'SUPER_ADMIN' && (
                              <SelectItem value="SUPER_ADMIN">{t('role.super_admin')}</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      {!editingUser && (
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1">
                            <Key className="h-3 w-3" />
                            {t('users.password')}
                          </Label>
                          <Input
                            type="password"
                            value={userForm.password}
                            onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                            placeholder="••••••••"
                            className="rounded-xl border-rose-200/50 dark:border-rose-900/30"
                          />
                          <p className="text-xs text-gray-400 dark:text-gray-500">{t('users.password_hint')}</p>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => {
                        setShowUserDialog(false);
                        setEditingUser(null);
                        setUserForm({ firstName: '', lastName: '', email: '', password: '', role: 'TEACHER' });
                      }} className="rounded-xl">{t('action.cancel')}</Button>
                      <Button
                        onClick={handleSaveUser}
                        disabled={!userForm.firstName || !userForm.lastName || !userForm.email || (!editingUser && userForm.password.length < 8)}
                        className="bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-xl"
                      >
                        {editingUser ? t('action.save') : t('action.create')}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Delete User Alert */}
                <AlertDialog open={deleteUserId !== null} onOpenChange={(open) => { if (!open) setDeleteUserId(null); }}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('users.delete_user')}</AlertDialogTitle>
                      <AlertDialogDescription>{t('users.delete_confirm')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setDeleteUserId(null)}>{t('action.cancel')}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteUser}
                        className="bg-rose-600 hover:bg-rose-700 text-white"
                      >
                        {t('action.confirm')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Audit Log Tab ───────────────────────────────────── */}
          <TabsContent value="audit">
            <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-violet-500 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-violet-50/50 to-transparent dark:from-violet-900/10 dark:to-transparent">
                <CardTitle className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                    <Shield className="h-4 w-4" />
                  </div>
                  {t('settings.audit_title')}
                </CardTitle>
                <CardDescription>{t('settings.audit_action')} & {t('settings.audit_timestamp')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-violet-400" />
                  <Input
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    placeholder={t('polish.audit_search')}
                    className="pl-9 h-9 rounded-lg border-violet-200/50 dark:border-violet-900/30 bg-violet-50/20 dark:bg-violet-900/10"
                  />
                </div>

                {/* Color-coded action filter chips */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { value: 'all', label: t('polish.all_actions'), color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 ring-gray-300 dark:ring-gray-700' },
                    { value: 'CREATE', label: t('polish.create_action'), color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 ring-emerald-300 dark:ring-emerald-700' },
                    { value: 'UPDATE', label: t('polish.update_action'), color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 ring-amber-300 dark:ring-amber-700' },
                    { value: 'DELETE', label: t('polish.delete_action'), color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 ring-red-300 dark:ring-red-700' },
                    { value: 'LOGIN', label: t('polish.login_action'), color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 ring-teal-300 dark:ring-teal-700' },
                    { value: 'EXPORT', label: t('action.export'), color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 ring-violet-300 dark:ring-violet-700' },
                  ].map((chip) => (
                    <button
                      key={chip.value}
                      onClick={() => setAuditActionFilter(chip.value)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                        auditActionFilter === chip.value
                          ? `${chip.color} ring-1 shadow-sm`
                          : 'bg-white/60 dark:bg-gray-800/40 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200/50 dark:border-gray-700/30'
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                {/* Date filters */}
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs">{t('settings.audit_filter_date_from')}</Label>
                    <Input
                      type="date"
                      value={auditDateFrom}
                      onChange={(e) => setAuditDateFrom(e.target.value)}
                      className="h-8 w-36 rounded-lg text-xs border-violet-200 dark:border-violet-900/30"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t('settings.audit_filter_date_to')}</Label>
                    <Input
                      type="date"
                      value={auditDateTo}
                      onChange={(e) => setAuditDateTo(e.target.value)}
                      className="h-8 w-36 rounded-lg text-xs border-violet-200 dark:border-violet-900/30"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadAuditLog}
                    className="h-8 rounded-lg border-violet-200 dark:border-violet-900/30 text-violet-700 dark:text-violet-300"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />
                    {t('action.refresh')}
                  </Button>
                </div>

                {/* Timeline */}
                {auditLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
                  </div>
                ) : auditEntries.length === 0 ? (
                  <div className="text-center py-8">
                    <Shield className="h-8 w-8 text-violet-400 dark:text-violet-500 mx-auto mb-2" />
                    <p className="text-gray-500 dark:text-gray-400">{t('settings.audit_no_entries')}</p>
                  </div>
                ) : (() => {
                  const searchLower = auditSearch.trim().toLowerCase();
                  const filtered = searchLower
                    ? auditEntries.filter((e) => {
                        const actorName = e.user ? `${e.user.firstName} ${e.user.lastName}`.toLowerCase() : 'system';
                        return (
                          e.entityType.toLowerCase().includes(searchLower) ||
                          e.action.toLowerCase().includes(searchLower) ||
                          actorName.includes(searchLower) ||
                          (e.entityId ?? '').toLowerCase().includes(searchLower)
                        );
                      })
                    : auditEntries;
                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-8">
                        <Search className="h-8 w-8 text-violet-400 dark:text-violet-500 mx-auto mb-2" />
                        <p className="text-gray-500 dark:text-gray-400">{t('polish.no_results')}</p>
                      </div>
                    );
                  }
                  return (
                  <div className="relative space-y-0 max-h-96 overflow-y-auto scrollbar-education">
                    {/* Vertical timeline line */}
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-violet-400 via-violet-300 to-violet-200 dark:from-violet-700 dark:via-violet-800 dark:to-violet-900" />

                    {filtered.map((entry, i) => {
                      const colorClass = actionColors[entry.action] || 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
                      const actorName = entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : 'System';
                      const dotColor = entry.action === 'CREATE' ? 'bg-emerald-500'
                        : entry.action === 'UPDATE' ? 'bg-amber-500'
                        : entry.action === 'DELETE' ? 'bg-red-500'
                        : entry.action === 'LOGIN' ? 'bg-teal-500'
                        : entry.action === 'EXPORT' ? 'bg-violet-500'
                        : 'bg-gray-400';
                      const iconBg = entry.action === 'CREATE' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300'
                        : entry.action === 'UPDATE' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300'
                        : entry.action === 'DELETE' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300'
                        : entry.action === 'LOGIN' ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-300'
                        : 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300';

                      return (
                        <motion.div
                          key={entry.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="relative flex items-start gap-4 pl-4 py-3 group"
                        >
                          {/* Timeline dot */}
                          <div className={`absolute left-3.5 w-3 h-3 rounded-full ring-2 ring-white dark:ring-gray-900 shrink-0 ${dotColor} group-hover:scale-125 transition-transform`} style={{ zIndex: 1 }} />

                          <div className="ml-6 min-w-0 flex-1 p-3 rounded-lg bg-gradient-to-r from-gray-50 to-transparent dark:from-gray-800/40 dark:to-transparent border-l-2 border-violet-200/40 dark:border-violet-900/20 group-hover:shadow-sm transition-shadow">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className={`flex items-center justify-center w-6 h-6 rounded-md ${iconBg}`}>
                                  {entry.action === 'CREATE' ? <Plus className="h-3 w-3" />
                                  : entry.action === 'UPDATE' ? <Pencil className="h-3 w-3" />
                                  : entry.action === 'DELETE' ? <Trash2 className="h-3 w-3" />
                                  : entry.action === 'LOGIN' ? <Key className="h-3 w-3" />
                                  : entry.action === 'EXPORT' ? <Download className="h-3 w-3" />
                                  : <Activity className="h-3 w-3" />}
                                </div>
                                <Badge className={`${colorClass} text-xs font-medium`}>
                                  {entry.action}
                                </Badge>
                                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                  {entry.entityType}
                                </span>
                                {entry.entityId && (
                                  <span className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[120px] font-mono">
                                    {entry.entityId.slice(0, 8)}…
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 shrink-0">
                                <Clock className="h-3 w-3 text-violet-400 dark:text-violet-500" />
                                <span>{new Date(entry.timestamp).toLocaleString()}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1.5 text-xs">
                              <div className="flex items-center gap-1 text-emerald-600/80 dark:text-emerald-400/70">
                                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-[9px] font-bold">
                                  {actorName === 'System' ? 'S' : actorName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                                </div>
                                <span>{actorName}</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Data Management Tab ─────────────────────────────── */}
          <TabsContent value="data">
            <div className="space-y-6">
              {/* CSV Export */}
              <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-emerald-500 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10 dark:to-transparent">
                  <CardTitle className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                      <Download className="h-4 w-4" />
                    </div>
                    {t('settings.data_export_csv')}
                  </CardTitle>
                  <CardDescription>{t('csv.export_title')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { type: 'students' as const, iconComponent: GraduationCap, label: t('settings.data_export_students'), color: 'emerald' },
                      { type: 'progress' as const, iconComponent: TrendingUp, label: t('settings.data_export_progress'), color: 'amber' },
                      { type: 'assessments' as const, iconComponent: CheckCircle, label: t('settings.data_export_assessments'), color: 'teal' },
                      { type: 'grades' as const, iconComponent: BarChart3, label: t('settings.data_export_grades'), color: 'violet' },
                    ].map((item) => (
                      <motion.div
                        key={item.type}
                        whileHover={{ scale: 1.03, y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        className="p-4 rounded-xl bg-gradient-to-br from-gray-50 to-gray-50/0 dark:from-gray-800/50 dark:to-gray-800/0 border border-gray-200/50 dark:border-gray-700/30 hover:border-emerald-200 dark:hover:border-emerald-900/30 hover:shadow-md transition-all cursor-pointer"
                        onClick={() => handleCsvExport(item.type)}
                      >
                        <div className="text-2xl mb-2"><item.iconComponent className="w-7 h-7 inline" /></div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{item.label}</p>
                        <p className="text-xs text-emerald-600/60 dark:text-emerald-400/40 mt-1">CSV</p>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* GDPR Data Erasure */}
              <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-rose-500 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-rose-50/50 to-transparent dark:from-rose-900/10 dark:to-transparent">
                  <CardTitle className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    {t('settings.data_erasure')}
                  </CardTitle>
                  <CardDescription>{t('settings.data_erasure_desc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-xl bg-rose-50/50 dark:bg-rose-900/10 border border-rose-200/30 dark:border-rose-900/20">
                    <p className="text-sm text-rose-700 dark:text-rose-300 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 inline mr-1" /> {t('settings.data_erasure_desc')}
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowErasureDialog(true)}
                    variant="outline"
                    className="border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl px-6"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('settings.data_erasure_request')}
                  </Button>
                </CardContent>
              </Card>

              {/* Erasure Dialog */}
              <AlertDialog open={showErasureDialog} onOpenChange={setShowErasureDialog}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('settings.data_erasure')}</AlertDialogTitle>
                    <AlertDialogDescription>{t('settings.data_erasure_desc')}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label>{t('settings.data_erasure_scope')}</Label>
                      <Select value={erasureScope} onValueChange={setErasureScope}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="STUDENT">{t('settings.data_erasure_scope_student')}</SelectItem>
                          <SelectItem value="CLASS">{t('settings.data_erasure_scope_class')}</SelectItem>
                          <SelectItem value="SCHOOL">{t('settings.data_erasure_scope_school')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('action.cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleErasureRequest} className="bg-rose-600 hover:bg-rose-700 text-white">
                      {t('settings.data_erasure_confirm')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </TabsContent>

          {/* ── Demo Accounts Tab ───────────────────────────────── */}
          {isAdmin && (
            <TabsContent value="demo">
              <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-amber-500 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-amber-50/50 to-emerald-50/30 dark:from-amber-900/10 dark:to-emerald-900/5">
                  <CardTitle className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                      <Zap className="h-4 w-4" />
                    </div>
                    {t('settings.demo_accounts')}
                  </CardTitle>
                  <CardDescription>{t('settings.demo_accounts_desc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Info hint */}
                  <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/30 dark:border-amber-900/20">
                    <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {t('settings.demo_toggle_hint')}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={handleEnableAllDemo}
                      variant="outline"
                      className="border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1.5" />
                      {t('settings.demo_enable')}
                    </Button>
                    <Button
                      onClick={handleDisableAllDemo}
                      variant="outline"
                      className="border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl"
                    >
                      <Clock className="h-4 w-4 mr-1.5" />
                      {t('settings.demo_disable_all')}
                    </Button>
                    <Button
                      onClick={() => setDeleteAllDemoOpen(true)}
                      variant="outline"
                      className="border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl"
                    >
                      <Trash2 className="h-4 w-4 mr-1.5" />
                      {t('settings.demo_delete_all')}
                    </Button>
                  </div>

                  {/* Demo accounts list */}
                  {demoLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
                    </div>
                  ) : demoAccounts.length === 0 ? (
                    <div className="text-center py-8">
                      <Zap className="h-8 w-8 text-amber-400 dark:text-amber-500 mx-auto mb-2" />
                      <p className="text-gray-500 dark:text-gray-400">{t('settings.demo_no_accounts')}</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-education">
                      {(demoAccounts ?? []).map((account) => {
                        const isActive = !account.deletedAt;
                        const RoleIcon = getRoleIcon(account.role);
                        return (
                          <motion.div
                            key={account.id}
                            whileHover={{ scale: 1.01 }}
                            className={`p-4 rounded-xl border transition-colors ${
                              isActive
                                ? 'bg-gradient-to-r from-gray-50 to-gray-50/0 dark:from-gray-800/50 dark:to-gray-800/0 border-l-3 border-l-amber-400/40 hover:border-l-amber-500'
                                : 'bg-gradient-to-r from-gray-50/50 to-gray-50/0 dark:from-gray-800/20 dark:to-gray-800/0 border-l-3 border-l-gray-300/40 opacity-60'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${getRoleBadgeColor(account.role)}`}>
                                  <RoleIcon className="h-4 w-4" />
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                                    {account.firstName} {account.lastName}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{account.email}</p>
                                    <Badge className={`${getRoleBadgeColor(account.role)} text-[10px] px-1.5 py-0`}>
                                      {account.role}
                                    </Badge>
                                    <Badge className={`text-[10px] px-1.5 py-0 ${isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-900/30 dark:text-gray-400'}`}>
                                      {isActive ? t('settings.demo_active') : t('settings.demo_inactive')}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={isActive}
                                  onCheckedChange={() => handleToggleDemoAccount(account.id, account.deletedAt)}
                                  className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-gray-300 dark:data-[state=unchecked]:bg-gray-600"
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-gray-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                                  onClick={() => setDeleteDemoId(account.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}

                  {/* Delete single demo account confirmation */}
                  <AlertDialog open={!!deleteDemoId} onOpenChange={(open) => { if (!open) setDeleteDemoId(null); }}>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('action.delete')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('settings.demo_delete_one_confirm')}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('action.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteDemoId && handleDeleteDemoAccount(deleteDemoId)} className="bg-rose-600 hover:bg-rose-700 text-white">
                          {t('action.delete')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  {/* Delete all demo accounts confirmation */}
                  <AlertDialog open={deleteAllDemoOpen} onOpenChange={setDeleteAllDemoOpen}>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('settings.demo_delete_all')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('settings.demo_delete_confirm')}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('action.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteAllDemo} className="bg-rose-600 hover:bg-rose-700 text-white">
                          {t('action.delete')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
