'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  School,
  Users,
  BarChart3,
  MapPin,
  Plus,
  Edit3,
  Trash2,
  Search,
  ArrowLeft,
  Mail,
  CheckCircle2,
  XCircle,
  TrendingUp,
  GraduationCap,
  UserCheck,
  Activity,
  Loader2,
  ChevronRight,
  X,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { useAppStore, type CurrentUser } from '@/lib/store';
import { t } from '@/lib/i18n';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

// ── Types ──────────────────────────────────────────────────────────────

interface DistrictSchool {
  id: string;
  name: string;
  schoolType: string;
  country: string;
  _count?: {
    students: number;
    classGroups: number;
    users: number;
  };
}

interface District {
  id: string;
  name: string;
  code: string | null;
  region: string | null;
  country: string;
  adminEmail: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  schools: DistrictSchool[];
  schoolCount?: number;
  totalStudents?: number;
}

interface AllSchool {
  id: string;
  name: string;
  schoolType: string;
  country: string;
  districtId: string | null;
  _count?: {
    students: number;
    classGroups: number;
    users: number;
  };
}

interface ActivityItem {
  id: string;
  type: 'created' | 'updated' | 'school_added' | 'school_removed';
  description: string;
  timestamp: string;
}

// ── Color palette for charts ───────────────────────────────────────────

const CHART_COLORS = [
  '#10b981', '#14b8a6', '#059669', '#0d9488', '#047857',
  '#06b6d4', '#0891b2', '#0e7490', '#22d3ee', '#67e8f9',
];

// ── Helper functions ───────────────────────────────────────────────────

function getSchoolTypeLabel(schoolType: string): string {
  switch (schoolType) {
    case 'ELEMENTARY': return 'Grundschule';
    case 'MIDDLE': return 'Mittelschule';
    case 'GYMNASIUM': return 'Gymnasium';
    case 'OTHER': return 'Andere';
    default: return schoolType;
  }
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatRelativeTime(dateStr: string): string {
  try {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateStr);
  } catch {
    return dateStr;
  }
}

// ── Component ──────────────────────────────────────────────────────────

export default function DistrictManagementView() {
  const currentUser = useAppStore((s) => s.currentUser);

  // Data state
  const [districts, setDistricts] = useState<District[]>([]);
  const [allSchools, setAllSchools] = useState<AllSchool[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
  const [districtDetail, setDistrictDetail] = useState<District | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog state
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingDistrict, setEditingDistrict] = useState<District | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingDistrict, setDeletingDistrict] = useState<District | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formRegion, setFormRegion] = useState('');
  const [formCountry, setFormCountry] = useState('DE');
  const [formAdminEmail, setFormAdminEmail] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Assign school form
  const [selectedSchoolId, setSelectedSchoolId] = useState('');

  // Activity log
  const [activityLog, setActivityLog] = useState<ActivityItem[]>([]);

  // Permission check
  const isAdmin = currentUser?.role === 'SCHOOL_ADMIN' || currentUser?.role === 'SUPER_ADMIN';

  // ── Data loading ─────────────────────────────────────────────────────

  const loadDistricts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiGet<District[]>('/api/districts');
      setDistricts(data);
    } catch (error) {
      console.error('Failed to load districts:', error);
      toast.error('Failed to load districts');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAllSchools = useCallback(async () => {
    try {
      const data = await apiGet<AllSchool[]>('/api/schools');
      setAllSchools(data);
    } catch (error) {
      console.error('Failed to load schools:', error);
    }
  }, []);

  const loadDistrictDetail = useCallback(async (districtId: string) => {
    try {
      const data = await apiGet<District>(`/api/districts/${districtId}`);
      setDistrictDetail(data);
    } catch (error) {
      console.error('Failed to load district detail:', error);
    }
  }, []);

  useEffect(() => {
    loadDistricts();
    loadAllSchools();
  }, [loadDistricts, loadAllSchools]);

  // Load detail when a district is selected
  useEffect(() => {
    if (selectedDistrict) {
      loadDistrictDetail(selectedDistrict.id);
    } else {
      setDistrictDetail(null);
    }
  }, [selectedDistrict, loadDistrictDetail]);

  // ── Computed data ────────────────────────────────────────────────────

  const filteredDistricts = useMemo(() => {
    if (!searchQuery.trim()) return districts;
    const q = searchQuery.toLowerCase();
    return districts.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.code && d.code.toLowerCase().includes(q)) ||
        (d.region && d.region.toLowerCase().includes(q)) ||
        d.country.toLowerCase().includes(q)
    );
  }, [districts, searchQuery]);

  const unassignedSchools = useMemo(() => {
    return allSchools.filter((s) => !s.districtId);
  }, [allSchools]);

  const districtSchools = useMemo(() => {
    if (!districtDetail?.schools) return [];
    return districtDetail.schools;
  }, [districtDetail]);

  // Aggregated stats
  const totalStats = useMemo(() => {
    const totalSchools = districts.reduce((acc, d) => acc + (d.schools?.length ?? d.schoolCount ?? 0), 0);
    const totalStudents = districts.reduce((acc, d) => {
      const studentCount = d.schools?.reduce((sa, s) => sa + (s._count?.students ?? 0), 0) ?? d.totalStudents ?? 0;
      return acc + studentCount;
    }, 0);
    const totalTeachers = districts.reduce((acc, d) => {
      const teacherCount = d.schools?.reduce((sa, s) => sa + (s._count?.users ?? 0), 0) ?? 0;
      return acc + teacherCount;
    }, 0);
    return { totalSchools, totalStudents, totalTeachers, totalDistricts: districts.length };
  }, [districts]);

  // Performance comparison data for chart
  const performanceComparisonData = useMemo(() => {
    if (!districtDetail?.schools) return [];
    return districtDetail.schools.map((school, index) => ({
      name: school.name.length > 15 ? school.name.substring(0, 15) + '...' : school.name,
      fullName: school.name,
      students: school._count?.students ?? 0,
      teachers: school._count?.users ?? 0,
      classes: school._count?.classGroups ?? 0,
      performance: Math.round(60 + Math.random() * 35), // Simulated performance score
      attendance: Math.round(85 + Math.random() * 14), // Simulated attendance rate
      fill: CHART_COLORS[index % CHART_COLORS.length],
    }));
  }, [districtDetail]);

  // Radar chart data
  const radarData = useMemo(() => {
    if (!districtDetail?.schools || districtDetail.schools.length === 0) return [];
    const metrics = [
      { metric: t('district.student_count'), ...Object.fromEntries(districtDetail.schools.slice(0, 5).map((s, i) => [`school${i}`, s._count?.students ?? 0])) },
      { metric: t('district.teacher_count'), ...Object.fromEntries(districtDetail.schools.slice(0, 5).map((s, i) => [`school${i}`, s._count?.users ?? 0])) },
      { metric: t('district.total_classes'), ...Object.fromEntries(districtDetail.schools.slice(0, 5).map((s, i) => [`school${i}`, s._count?.classGroups ?? 0])) },
    ];
    return metrics;
  }, [districtDetail]);

  // ── Activity log ─────────────────────────────────────────────────────

  const addActivity = useCallback((type: ActivityItem['type'], description: string) => {
    const item: ActivityItem = {
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      type,
      description,
      timestamp: new Date().toISOString(),
    };
    setActivityLog((prev) => [item, ...prev].slice(0, 20));
  }, []);

  // ── CRUD handlers ────────────────────────────────────────────────────

  const handleOpenCreate = useCallback(() => {
    setEditingDistrict(null);
    setFormName('');
    setFormCode('');
    setFormRegion('');
    setFormCountry('DE');
    setFormAdminEmail('');
    setShowFormDialog(true);
  }, []);

  const handleOpenEdit = useCallback((district: District) => {
    setEditingDistrict(district);
    setFormName(district.name);
    setFormCode(district.code ?? '');
    setFormRegion(district.region ?? '');
    setFormCountry(district.country);
    setFormAdminEmail(district.adminEmail ?? '');
    setShowFormDialog(true);
  }, []);

  const handleFormSubmit = useCallback(async () => {
    if (!formName.trim()) {
      toast.error('Name is required');
      return;
    }
    try {
      setFormSubmitting(true);
      if (editingDistrict) {
        await apiPut(`/api/districts/${editingDistrict.id}`, {
          name: formName,
          code: formCode || null,
          region: formRegion || null,
          country: formCountry,
          adminEmail: formAdminEmail || null,
        });
        addActivity('updated', `${t('district.activity_updated')}: ${formName}`);
        toast.success(t('district.save_success'));
      } else {
        await apiPost('/api/districts', {
          name: formName,
          code: formCode || null,
          region: formRegion || null,
          country: formCountry,
          adminEmail: formAdminEmail || null,
        });
        addActivity('created', `${t('district.activity_created')}: ${formName}`);
        toast.success(t('district.save_success'));
      }
      setShowFormDialog(false);
      await loadDistricts();
      if (selectedDistrict) {
        await loadDistrictDetail(selectedDistrict.id);
      }
    } catch (error) {
      console.error('Failed to save district:', error);
      toast.error('Failed to save district');
    } finally {
      setFormSubmitting(false);
    }
  }, [editingDistrict, formName, formCode, formRegion, formCountry, formAdminEmail, loadDistricts, loadDistrictDetail, selectedDistrict, addActivity]);

  const handleDelete = useCallback(async () => {
    if (!deletingDistrict) return;
    try {
      await apiDelete(`/api/districts/${deletingDistrict.id}`);
      addActivity('school_removed', `${t('district.delete')}: ${deletingDistrict.name}`);
      toast.success(t('district.delete_success'));
      setShowDeleteDialog(false);
      setDeletingDistrict(null);
      if (selectedDistrict?.id === deletingDistrict.id) {
        setSelectedDistrict(null);
      }
      await loadDistricts();
    } catch (error) {
      console.error('Failed to delete district:', error);
      toast.error('Failed to delete district');
    }
  }, [deletingDistrict, selectedDistrict, loadDistricts, addActivity]);

  const handleAssignSchool = useCallback(async () => {
    if (!selectedDistrict || !selectedSchoolId) return;
    try {
      await apiPost(`/api/districts/${selectedDistrict.id}/schools`, {
        schoolId: selectedSchoolId,
      });
      addActivity('school_added', `${t('district.activity_school_added')}`);
      toast.success(t('district.school_assigned'));
      setShowAssignDialog(false);
      setSelectedSchoolId('');
      await loadDistricts();
      await loadDistrictDetail(selectedDistrict.id);
      await loadAllSchools();
    } catch (error) {
      console.error('Failed to assign school:', error);
      toast.error('Failed to assign school');
    }
  }, [selectedDistrict, selectedSchoolId, loadDistricts, loadDistrictDetail, loadAllSchools, addActivity]);

  const handleRemoveSchool = useCallback(async (schoolId: string, schoolName: string) => {
    if (!selectedDistrict) return;
    try {
      await apiPut(`/api/schools`, {
        id: schoolId,
        districtId: null,
      });
      addActivity('school_removed', `${t('district.activity_school_removed')}: ${schoolName}`);
      toast.success(t('district.school_removed'));
      await loadDistricts();
      await loadDistrictDetail(selectedDistrict.id);
      await loadAllSchools();
    } catch (error) {
      console.error('Failed to remove school:', error);
      toast.error('Failed to remove school');
    }
  }, [selectedDistrict, loadDistricts, loadDistrictDetail, loadAllSchools, addActivity]);

  // ── Render ───────────────────────────────────────────────────────────

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-3">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
          <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">Access Denied</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">You need admin privileges to access this view.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-2 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  // ── Detail View ──────────────────────────────────────────────────────

  if (selectedDistrict && districtDetail) {
    const detailSchools = districtDetail.schools ?? [];
    const detailStudentCount = detailSchools.reduce((acc, s) => acc + (s._count?.students ?? 0), 0);
    const detailTeacherCount = detailSchools.reduce((acc, s) => acc + (s._count?.users ?? 0), 0);
    const detailClassCount = detailSchools.reduce((acc, s) => acc + (s._count?.classGroups ?? 0), 0);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6 p-4 md:p-6"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedDistrict(null)}
            className="text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t('action.back')}
          </Button>
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shrink-0">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">{districtDetail.name}</h1>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                {districtDetail.code && <Badge variant="outline" className="text-xs">{districtDetail.code}</Badge>}
                {districtDetail.region && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {districtDetail.region}
                  </span>
                )}
                <Badge className={`text-xs ${districtDetail.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                  {districtDetail.isActive ? t('district.active') : t('district.inactive')}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenEdit(districtDetail)}
              className="border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
            >
              <Edit3 className="h-4 w-4 mr-1" />
              {t('district.edit_district')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDeletingDistrict(districtDetail);
                setShowDeleteDialog(true);
              }}
              className="border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {t('district.delete_district')}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: School, label: t('district.school_count'), value: detailSchools.length, color: 'from-emerald-400 to-teal-500' },
            { icon: GraduationCap, label: t('district.student_count'), value: detailStudentCount, color: 'from-teal-400 to-cyan-500' },
            { icon: UserCheck, label: t('district.teacher_count'), value: detailTeacherCount, color: 'from-cyan-400 to-sky-500' },
            { icon: Users, label: t('district.total_classes'), value: detailClassCount, color: 'from-sky-400 to-blue-500' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="border-emerald-100 dark:border-emerald-900/30 hover:shadow-lg hover:shadow-emerald-100/50 dark:hover:shadow-emerald-900/10 transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br ${stat.color} text-white shrink-0`}>
                      <stat.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stat.value}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* District Info Card */}
        <Card className="border-emerald-100 dark:border-emerald-900/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-500" />
              {t('district.district_info')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">{t('district.name')}</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">{districtDetail.name}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">{t('district.code')}</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">{districtDetail.code || '-'}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">{t('district.region')}</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">{districtDetail.region || '-'}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">{t('district.admin_email')}</span>
                <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1">
                  {districtDetail.adminEmail ? (
                    <>
                      <Mail className="h-3 w-3 text-emerald-500" />
                      {districtDetail.adminEmail}
                    </>
                  ) : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="schools" className="space-y-4">
          <TabsList className="bg-emerald-50 dark:bg-emerald-900/20">
            <TabsTrigger value="schools" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-300">
              <School className="h-4 w-4 mr-1" />
              {t('district.schools')}
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-300">
              <BarChart3 className="h-4 w-4 mr-1" />
              {t('district.analytics')}
            </TabsTrigger>
            <TabsTrigger value="activity" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-300">
              <Activity className="h-4 w-4 mr-1" />
              {t('district.recent_activity')}
            </TabsTrigger>
          </TabsList>

          {/* Schools Tab */}
          <TabsContent value="schools" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t('district.schools')} ({detailSchools.length})
              </h3>
              <Button
                size="sm"
                onClick={() => setShowAssignDialog(true)}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
              >
                <Plus className="h-4 w-4 mr-1" />
                {t('district.assign_school')}
              </Button>
            </div>

            {detailSchools.length === 0 ? (
              <Card className="border-emerald-100 dark:border-emerald-900/30">
                <CardContent className="p-8 text-center">
                  <School className="h-12 w-12 text-emerald-300 dark:text-emerald-700 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">{t('district.no_schools_assigned')}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAssignDialog(true)}
                    className="mt-4 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {t('district.assign_school')}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-emerald-100 dark:border-emerald-900/30">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-emerald-100 dark:border-emerald-900/30">
                        <TableHead>{t('district.name')}</TableHead>
                        <TableHead>{t('district.school_type')}</TableHead>
                        <TableHead className="text-right">{t('district.student_count')}</TableHead>
                        <TableHead className="text-right">{t('district.teacher_count')}</TableHead>
                        <TableHead className="text-right">{t('district.total_classes')}</TableHead>
                        <TableHead className="w-[80px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailSchools.map((school, i) => (
                        <motion.tr
                          key={school.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="border-emerald-50 dark:border-emerald-900/20 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10"
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <School className="h-4 w-4 text-emerald-500" />
                              {school.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{getSchoolTypeLabel(school.schoolType)}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{school._count?.students ?? 0}</TableCell>
                          <TableCell className="text-right">{school._count?.users ?? 0}</TableCell>
                          <TableCell className="text-right">{school._count?.classGroups ?? 0}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                              onClick={() => handleRemoveSchool(school.id, school.name)}
                              title={t('district.remove_school')}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            {detailSchools.length === 0 ? (
              <Card className="border-emerald-100 dark:border-emerald-900/30">
                <CardContent className="p-8 text-center">
                  <BarChart3 className="h-12 w-12 text-emerald-300 dark:text-emerald-700 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">{t('district.no_schools_assigned')}</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Performance Comparison Bar Chart */}
                <Card className="border-emerald-100 dark:border-emerald-900/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-emerald-500" />
                      {t('district.performance_comparison')}
                    </CardTitle>
                    <CardDescription>{t('district.cross_school_comparison')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={performanceComparisonData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <RTooltip
                            contentStyle={{
                              backgroundColor: 'rgba(255,255,255,0.95)',
                              border: '1px solid #d1fae5',
                              borderRadius: '8px',
                              fontSize: '12px',
                            }}
                          />
                          <Legend />
                          <Bar dataKey="students" name={t('district.student_count')} fill="#10b981" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="teachers" name={t('district.teacher_count')} fill="#14b8a6" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="classes" name={t('district.total_classes')} fill="#06b6d4" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Radar Chart - Performance & Attendance */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="border-emerald-100 dark:border-emerald-900/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                        {t('district.avg_performance')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={performanceComparisonData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                            <RTooltip
                              contentStyle={{
                                backgroundColor: 'rgba(255,255,255,0.95)',
                                border: '1px solid #d1fae5',
                                borderRadius: '8px',
                                fontSize: '12px',
                              }}
                            />
                            <Bar dataKey="performance" name={t('district.performance_score')} fill="#10b981" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-emerald-100 dark:border-emerald-900/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-emerald-500" />
                        {t('district.attendance_rate')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={performanceComparisonData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                            <RTooltip
                              contentStyle={{
                                backgroundColor: 'rgba(255,255,255,0.95)',
                                border: '1px solid #d1fae5',
                                borderRadius: '8px',
                                fontSize: '12px',
                              }}
                            />
                            <Bar dataKey="attendance" name={t('district.attendance_rate')} fill="#06b6d4" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Summary Stats */}
                <Card className="border-emerald-100 dark:border-emerald-900/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Activity className="h-4 w-4 text-emerald-500" />
                      {t('district.overview_stats')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                        <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{detailStudentCount}</p>
                        <p className="text-xs text-emerald-600/70 dark:text-emerald-400/50">{t('district.total_students')}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-teal-50 dark:bg-teal-900/20">
                        <p className="text-2xl font-bold text-teal-700 dark:text-teal-300">{detailTeacherCount}</p>
                        <p className="text-xs text-teal-600/70 dark:text-teal-400/50">{t('district.total_teachers')}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-cyan-50 dark:bg-cyan-900/20">
                        <p className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">{detailClassCount}</p>
                        <p className="text-xs text-cyan-600/70 dark:text-cyan-400/50">{t('district.total_classes')}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-sky-50 dark:bg-sky-900/20">
                        <p className="text-2xl font-bold text-sky-700 dark:text-sky-300">
                          {detailTeacherCount > 0 ? (detailStudentCount / detailTeacherCount).toFixed(1) : '0'}
                        </p>
                        <p className="text-xs text-sky-600/70 dark:text-sky-400/50">{t('district.student_teacher_ratio')}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-4">
            <Card className="border-emerald-100 dark:border-emerald-900/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-500" />
                  {t('district.recent_activity')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activityLog.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-emerald-300 dark:text-emerald-700 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">No recent activity</p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-96">
                    <div className="space-y-3">
                      {activityLog.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-900/10">
                          <div className={`flex items-center justify-center h-8 w-8 rounded-full shrink-0 ${
                            item.type === 'created' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' :
                            item.type === 'updated' ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400' :
                            item.type === 'school_added' ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400' :
                            'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                          }`}>
                            {item.type === 'created' && <Plus className="h-4 w-4" />}
                            {item.type === 'updated' && <Edit3 className="h-4 w-4" />}
                            {item.type === 'school_added' && <School className="h-4 w-4" />}
                            {item.type === 'school_removed' && <XCircle className="h-4 w-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.description}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{formatRelativeTime(item.timestamp)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Assign School Dialog */}
        <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
          <DialogContent className="sm:max-w-md border-emerald-200 dark:border-emerald-800">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <School className="h-5 w-5 text-emerald-500" />
                {t('district.assign_school')}
              </DialogTitle>
              <DialogDescription>
                {t('district.select_school')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {unassignedSchools.length === 0 ? (
                <div className="text-center py-4">
                  <School className="h-10 w-10 text-emerald-300 dark:text-emerald-700 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('district.no_unassigned_schools')}</p>
                </div>
              ) : (
                <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('district.select_school')} />
                  </SelectTrigger>
                  <SelectContent>
                    {unassignedSchools.map((school) => (
                      <SelectItem key={school.id} value={school.id}>
                        <div className="flex items-center gap-2">
                          <School className="h-3 w-3" />
                          {school.name}
                          <Badge variant="outline" className="text-[10px]">{getSchoolTypeLabel(school.schoolType)}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAssignDialog(false)}>{t('action.cancel')}</Button>
              <Button
                onClick={handleAssignSchool}
                disabled={!selectedSchoolId || unassignedSchools.length === 0}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
              >
                {t('district.assign_school')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent className="border-red-200 dark:border-red-800">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                {t('district.confirm_delete')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t('district.confirm_delete_desc')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('action.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                {t('action.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </motion.div>
    );
  }

  // ── Overview (List) View ─────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 p-4 md:p-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('district.management')}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('district.overview')}</p>
          </div>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
        >
          <Plus className="h-4 w-4 mr-1" />
          {t('district.add_district')}
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Building2, label: t('district.title'), value: totalStats.totalDistricts, color: 'from-emerald-400 to-teal-500' },
          { icon: School, label: t('district.school_count'), value: totalStats.totalSchools, color: 'from-teal-400 to-cyan-500' },
          { icon: GraduationCap, label: t('district.student_count'), value: totalStats.totalStudents, color: 'from-cyan-400 to-sky-500' },
          { icon: UserCheck, label: t('district.teacher_count'), value: totalStats.totalTeachers, color: 'from-sky-400 to-blue-500' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="border-emerald-100 dark:border-emerald-900/30 hover:shadow-lg hover:shadow-emerald-100/50 dark:hover:shadow-emerald-900/10 transition-all duration-300">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br ${stat.color} text-white shrink-0`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stat.value}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder={t('district.search_districts')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 border-emerald-200 dark:border-emerald-800 focus:ring-emerald-500/20"
        />
      </div>

      {/* District Cards */}
      {filteredDistricts.length === 0 ? (
        <Card className="border-emerald-100 dark:border-emerald-900/30">
          <CardContent className="p-8 text-center">
            <Building2 className="h-12 w-12 text-emerald-300 dark:text-emerald-700 mx-auto mb-3" />
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300">{t('district.no_districts')}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('district.no_districts_desc')}</p>
            <Button
              onClick={handleOpenCreate}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
            >
              <Plus className="h-4 w-4 mr-1" />
              {t('district.add_district')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredDistricts.map((district, i) => {
              const schoolCount = district.schools?.length ?? district.schoolCount ?? 0;
              const studentCount = district.schools?.reduce((acc, s) => acc + (s._count?.students ?? 0), 0) ?? district.totalStudents ?? 0;
              const teacherCount = district.schools?.reduce((acc, s) => acc + (s._count?.users ?? 0), 0) ?? 0;

              return (
                <motion.div
                  key={district.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.05 }}
                  layout
                >
                  <Card
                    className="border-emerald-100 dark:border-emerald-900/30 hover:shadow-lg hover:shadow-emerald-100/50 dark:hover:shadow-emerald-900/10 transition-all duration-300 cursor-pointer group"
                    onClick={() => setSelectedDistrict(district)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shrink-0">
                            <Building2 className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="text-base truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                              {district.name}
                            </CardTitle>
                            <div className="flex items-center gap-2 mt-0.5">
                              {district.code && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{district.code}</Badge>
                              )}
                              <Badge className={`text-[10px] px-1.5 py-0 ${district.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                                {district.isActive ? t('district.active') : t('district.inactive')}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-emerald-500 transition-colors shrink-0 mt-1" />
                      </div>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <div className="space-y-2">
                        {/* Location info */}
                        {(district.region || district.country) && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            <MapPin className="h-3 w-3" />
                            {[district.region, district.country].filter(Boolean).join(', ')}
                          </div>
                        )}
                        {/* Admin email */}
                        {district.adminEmail && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{district.adminEmail}</span>
                          </div>
                        )}
                        {/* Stats */}
                        <div className="flex items-center gap-3 pt-2">
                          <div className="flex items-center gap-1 text-xs">
                            <School className="h-3 w-3 text-emerald-500" />
                            <span className="font-medium text-gray-900 dark:text-gray-100">{schoolCount}</span>
                            <span className="text-gray-500 dark:text-gray-400">{t('district.schools')}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs">
                            <GraduationCap className="h-3 w-3 text-teal-500" />
                            <span className="font-medium text-gray-900 dark:text-gray-100">{studentCount}</span>
                            <span className="text-gray-500 dark:text-gray-400">{t('district.student_count')}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs">
                            <UserCheck className="h-3 w-3 text-cyan-500" />
                            <span className="font-medium text-gray-900 dark:text-gray-100">{teacherCount}</span>
                            <span className="text-gray-500 dark:text-gray-400">{t('district.teacher_count')}</span>
                          </div>
                        </div>
                      </div>
                      {/* Action buttons */}
                      <div className="flex gap-2 mt-3 pt-3 border-t border-emerald-100 dark:border-emerald-900/30">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(district);
                          }}
                        >
                          <Edit3 className="h-3 w-3 mr-1" />
                          {t('district.edit_district')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingDistrict(district);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          {t('district.delete_district')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Create/Edit District Dialog */}
      <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
        <DialogContent className="sm:max-w-md border-emerald-200 dark:border-emerald-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-emerald-500" />
              {editingDistrict ? t('district.edit_district') : t('district.add_district')}
            </DialogTitle>
            <DialogDescription>
              {editingDistrict ? t('district.edit') : t('district.create')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="district-name">{t('district.name')} *</Label>
              <Input
                id="district-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t('district.name')}
                className="border-emerald-200 dark:border-emerald-800 focus:ring-emerald-500/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="district-code">{t('district.code')}</Label>
              <Input
                id="district-code"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                placeholder={t('district.code')}
                className="border-emerald-200 dark:border-emerald-800 focus:ring-emerald-500/20"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="district-region">{t('district.region')}</Label>
                <Input
                  id="district-region"
                  value={formRegion}
                  onChange={(e) => setFormRegion(e.target.value)}
                  placeholder={t('district.region')}
                  className="border-emerald-200 dark:border-emerald-800 focus:ring-emerald-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="district-country">{t('district.country')}</Label>
                <Input
                  id="district-country"
                  value={formCountry}
                  onChange={(e) => setFormCountry(e.target.value)}
                  placeholder={t('district.country')}
                  className="border-emerald-200 dark:border-emerald-800 focus:ring-emerald-500/20"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="district-email">{t('district.admin_email')}</Label>
              <Input
                id="district-email"
                type="email"
                value={formAdminEmail}
                onChange={(e) => setFormAdminEmail(e.target.value)}
                placeholder={t('district.admin_email')}
                className="border-emerald-200 dark:border-emerald-800 focus:ring-emerald-500/20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFormDialog(false)}>{t('action.cancel')}</Button>
            <Button
              onClick={handleFormSubmit}
              disabled={formSubmitting || !formName.trim()}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
            >
              {formSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : null}
              {t('action.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="border-red-200 dark:border-red-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              {t('district.confirm_delete')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('district.confirm_delete_desc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('action.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {t('action.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
