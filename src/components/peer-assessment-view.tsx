'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UsersRound,
  Plus,
  CheckCircle2,
  Clock,
  BarChart3,
  Eye,
  Shield,
  Send,
  X,
  ChevronRight,
  Trash2,
  Edit3,
  Calendar,
  Lock,
  Unlock,
  UserCheck,
  AlertTriangle,
  Star,
  TrendingUp,
  Activity,
  FileText,
  ArrowRight,
  RefreshCw,
  Search,
  Filter,
  Users,
  MessageSquare,
  Sliders,
  Award,
  Target,
  Settings,
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
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Tooltip as RechartsTooltip,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────

interface Criterion {
  name: string;
  description: string;
  maxScore: number;
}

interface AssignedPair {
  assessorId: string;
  assessedId: string;
}

interface StudentInfo {
  id: string;
  firstName: string;
  lastName: string;
}

interface SessionStats {
  total: number;
  submitted: number;
  pending: number;
}

interface PeerAssessmentSessionType {
  id: string;
  schoolId: string;
  teacherId: string | null;
  classGroupId: string | null;
  title: string;
  description: string | null;
  assessmentType: string;
  criteria: string | null;
  anonymityMode: string;
  status: string;
  deadline: string | null;
  assignMode: string;
  assignedPairs: string | null;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  teacher: { id: string; firstName: string; lastName: string } | null;
  classGroup: { id: string; name: string } | null;
  _count?: { peerAssessments: number };
  stats?: SessionStats;
}

interface PeerAssessmentType {
  id: string;
  schoolId: string;
  sessionId: string | null;
  assessorId: string;
  assessedId: string;
  assessmentType: string;
  criteria: string | null;
  level: number | null;
  comment: string | null;
  isAnonymous: boolean;
  status: string;
  assessor: StudentInfo;
  assessed: StudentInfo;
  competency?: { id: string; code: string; title: string } | null;
}

interface ResultData {
  student: StudentInfo;
  ratings: number[];
  criteriaScores: Record<string, { total: number; count: number; scores: number[]; average: number }>;
  comments: string[];
  averageRating: number;
  assessmentCount: number;
}

interface ResultsPayload {
  session: PeerAssessmentSessionType;
  studentResults: ResultData[];
  overallStats: {
    totalAssessments: number;
    overallAverage: number;
    ratingStdDev: number;
    uniqueAssessors: number;
    uniqueAssessed: number;
  };
  competencyAverages: Record<string, number>;
  outliers: {
    id: string;
    assessor: StudentInfo;
    assessed: StudentInfo;
    level: number | null;
    comment: string | null;
  }[];
}

// ─── Animated Counter ─────────────────────────────────────────────────

function AnimatedCounter({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const startTime = Date.now();
    const step = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value * 100) / 100);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value, duration]);
  return <span>{display % 1 === 0 ? display : display.toFixed(1)}</span>;
}

// ─── Rating Slider ────────────────────────────────────────────────────

function RatingSlider({
  value,
  onChange,
  maxScore = 5,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  maxScore?: number;
  label?: string;
}) {
  const getColor = (v: number, max: number) => {
    const ratio = v / max;
    if (ratio >= 0.8) return 'text-emerald-500';
    if (ratio >= 0.6) return 'text-yellow-500';
    if (ratio >= 0.4) return 'text-orange-500';
    return 'text-red-500';
  };

  const getBgColor = (v: number, max: number) => {
    const ratio = v / max;
    if (ratio >= 0.8) return 'bg-emerald-500';
    if (ratio >= 0.6) return 'bg-yellow-500';
    if (ratio >= 0.4) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">{label}</Label>
          <span className={`text-lg font-bold ${getColor(value, maxScore)}`}>
            {value} / {maxScore}
          </span>
        </div>
      )}
      <div className="flex items-center gap-3">
        <Slider
          value={[value]}
          onValueChange={([v]) => onChange(v)}
          min={0}
          max={maxScore}
          step={1}
          className="flex-1"
        />
        <div className="flex gap-0.5">
          {Array.from({ length: maxScore }, (_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-colors ${
                i < value ? getBgColor(value, maxScore) : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────

export default function PeerAssessmentView() {
  const { theme } = useTheme();
  const currentUser = useAppStore((s) => s.currentUser);
  const locale = useAppStore((s) => s.locale);
  const isDark = theme === 'dark';

  // ── State ──
  const [sessions, setSessions] = useState<PeerAssessmentSessionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedSession, setSelectedSession] = useState<PeerAssessmentSessionType | null>(null);
  const [sessionDetail, setSessionDetail] = useState<PeerAssessmentSessionType | null>(null);
  const [sessionAssessments, setSessionAssessments] = useState<PeerAssessmentType[]>([]);
  const [results, setResults] = useState<ResultsPayload | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showConductDialog, setShowConductDialog] = useState(false);
  const [conductingAssessment, setConductingAssessment] = useState<PeerAssessmentType | null>(null);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [submitting, setSubmitting] = useState(false);

  // Create form state
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    assessmentType: 'competency',
    anonymityMode: 'anonymous',
    assignMode: 'manual',
    classGroupId: '',
    deadline: '',
    criteria: [{ name: '', description: '', maxScore: 5 }] as Criterion[],
  });

  // Conduct assessment state
  const [conductRatings, setConductRatings] = useState<Record<string, number>>({});
  const [conductComment, setConductComment] = useState('');
  const [conductOverallRating, setConductOverallRating] = useState(3);

  // ── Data Fetching ──

  const fetchSessions = useCallback(async () => {
    if (!currentUser?.schoolId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/peer-assessment-sessions?schoolId=${currentUser.schoolId}`
      );
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.schoolId]);

  const fetchSessionDetail = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/peer-assessment-sessions/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setSessionDetail(data);
        setSessionAssessments(data.peerAssessments || []);
      }
    } catch (err) {
      console.error('Failed to fetch session detail:', err);
    }
  }, []);

  const fetchResults = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/peer-assessment-sessions/${sessionId}/results`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch (err) {
      console.error('Failed to fetch results:', err);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // ── Computed Stats ──

  const stats = useMemo(() => {
    const total = sessions.length;
    const active = sessions.filter((s) => s.status === 'active').length;
    const completed = sessions.filter((s) => s.status === 'completed').length;
    const totalAssessments = sessions.reduce((acc, s) => acc + (s.stats?.total || 0), 0);
    const submittedAssessments = sessions.reduce((acc, s) => acc + (s.stats?.submitted || 0), 0);
    const completionRate = totalAssessments > 0
      ? Math.round((submittedAssessments / totalAssessments) * 100)
      : 0;
    return { total, active, completed, totalAssessments, submittedAssessments, completionRate };
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (searchQuery && !s.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterStatus !== 'all' && s.status !== filterStatus) return false;
      if (filterType !== 'all' && s.assessmentType !== filterType) return false;
      return true;
    });
  }, [sessions, searchQuery, filterStatus, filterType]);

  // ── Handlers ──

  const handleCreateSession = async () => {
    if (!currentUser?.schoolId || !createForm.title) return;
    try {
      const res = await fetch('/api/peer-assessment-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: currentUser.schoolId,
          teacherId: currentUser.id,
          title: createForm.title,
          description: createForm.description,
          assessmentType: createForm.assessmentType,
          criteria: createForm.criteria.filter((c) => c.name),
          anonymityMode: createForm.anonymityMode,
          assignMode: createForm.assignMode,
          classGroupId: createForm.classGroupId || null,
          deadline: createForm.deadline || null,
          assignedPairs: [],
        }),
      });
      if (res.ok) {
        setShowCreateDialog(false);
        setCreateForm({
          title: '',
          description: '',
          assessmentType: 'competency',
          anonymityMode: 'anonymous',
          assignMode: 'manual',
          classGroupId: '',
          deadline: '',
          criteria: [{ name: '', description: '', maxScore: 5 }],
        });
        fetchSessions();
      }
    } catch (err) {
      console.error('Failed to create session:', err);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/peer-assessment-sessions/${sessionId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchSessions();
        setSelectedSession(null);
        setSessionDetail(null);
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  const handleCloseSession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/peer-assessment-sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      });
      if (res.ok) {
        fetchSessions();
        if (selectedSession?.id === sessionId) {
          fetchSessionDetail(sessionId);
        }
      }
    } catch (err) {
      console.error('Failed to close session:', err);
    }
  };

  const handleSubmitAssessment = async () => {
    if (!selectedSession || !conductingAssessment) return;
    setSubmitting(true);
    try {
      const criteria = sessionDetail?.criteria
        ? JSON.parse(sessionDetail.criteria)
        : [];
      const updatedCriteria = criteria.map((c: Criterion) => ({
        name: c.name,
        score: conductRatings[c.name] || 0,
        maxScore: c.maxScore,
      }));

      const res = await fetch(
        `/api/peer-assessment-sessions/${selectedSession.id}/submit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assessmentId: conductingAssessment.id,
            criteria: updatedCriteria,
            level: conductOverallRating,
            comment: conductComment,
          }),
        }
      );
      if (res.ok) {
        setShowConductDialog(false);
        setConductingAssessment(null);
        setConductRatings({});
        setConductComment('');
        setConductOverallRating(3);
        fetchSessionDetail(selectedSession.id);
        fetchSessions();
      }
    } catch (err) {
      console.error('Failed to submit assessment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewResults = (session: PeerAssessmentSessionType) => {
    setSelectedSession(session);
    fetchResults(session.id);
    setShowResultsDialog(true);
  };

  const handleStartConduct = (assessment: PeerAssessmentType) => {
    setConductingAssessment(assessment);
    setConductRatings({});
    setConductComment('');
    setConductOverallRating(3);
    // Initialize criteria ratings from session
    if (sessionDetail?.criteria) {
      try {
        const criteria = JSON.parse(sessionDetail.criteria);
        const ratings: Record<string, number> = {};
        criteria.forEach((c: Criterion) => {
          ratings[c.name] = 0;
        });
        setConductRatings(ratings);
      } catch {
        // ignore
      }
    }
    setShowConductDialog(true);
  };

  const addCriterion = () => {
    setCreateForm((prev) => ({
      ...prev,
      criteria: [...prev.criteria, { name: '', description: '', maxScore: 5 }],
    }));
  };

  const removeCriterion = (index: number) => {
    setCreateForm((prev) => ({
      ...prev,
      criteria: prev.criteria.filter((_, i) => i !== index),
    }));
  };

  const updateCriterion = (index: number, field: keyof Criterion, value: string | number) => {
    setCreateForm((prev) => ({
      ...prev,
      criteria: prev.criteria.map((c, i) =>
        i === index ? { ...c, [field]: value } : c
      ),
    }));
  };

  const getAnonymityIcon = (mode: string) => {
    switch (mode) {
      case 'anonymous': return <Lock className="h-3.5 w-3.5" />;
      case 'semi-anonymous': return <Shield className="h-3.5 w-3.5" />;
      case 'open': return <Unlock className="h-3.5 w-3.5" />;
      default: return <Lock className="h-3.5 w-3.5" />;
    }
  };

  const getAnonymityLabel = (mode: string) => {
    switch (mode) {
      case 'anonymous': return t('pa.anonymous');
      case 'semi-anonymous': return t('pa.semi_anonymous');
      case 'open': return t('pa.open');
      default: return mode;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">{t('pa.status_active')}</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{t('pa.status_completed')}</Badge>;
      case 'closed':
        return <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">{t('pa.status_closed')}</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">{t('pa.status_pending')}</Badge>;
      case 'submitted':
        return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">{t('pa.status_submitted')}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'competency': return <Target className="h-4 w-4" />;
      case 'project': return <FileText className="h-4 w-4" />;
      case 'presentation': return <MessageSquare className="h-4 w-4" />;
      case 'teamwork': return <Users className="h-4 w-4" />;
      default: return <Star className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'competency': return t('pa.type_competency');
      case 'project': return t('pa.type_project');
      case 'presentation': return t('pa.type_presentation');
      case 'teamwork': return t('pa.type_teamwork');
      default: return type;
    }
  };

  const isTeacherOrAdmin = currentUser?.role === 'TEACHER' ||
    currentUser?.role === 'SCHOOL_ADMIN' ||
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'VICE_PRINCIPAL';

  const isStudent = currentUser?.role === 'STUDENT';
  const isParent = currentUser?.role === 'PARENT';

  // ── Radar Chart Data ──

  const radarData = useMemo(() => {
    if (!results) return [];
    return Object.entries(results.competencyAverages).map(([name, avg]) => ({
      criterion: name,
      average: avg,
      fullMark: 5,
    }));
  }, [results]);

  // ── Bar Chart Data (self vs peer comparison) ──

  const barData = useMemo(() => {
    if (!results) return [];
    return results.studentResults.slice(0, 10).map((sr) => ({
      name: `${sr.student.firstName} ${sr.student.lastName.charAt(0)}.`,
      peerAvg: sr.averageRating,
      selfAvg: sr.ratings.length > 0 ? sr.ratings[0] : 0,
    }));
  }, [results]);

  // ── Activity Timeline ──

  const recentActivity = useMemo(() => {
    return sessions
      .slice(0, 5)
      .map((s) => ({
        id: s.id,
        title: s.title,
        type: s.status === 'active' ? 'created' : s.status === 'completed' ? 'completed' : 'closed',
        date: new Date(s.createdAt).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US'),
        time: new Date(s.createdAt).toLocaleTimeString(locale === 'de' ? 'de-DE' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      }));
  }, [sessions, locale]);

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Gradient Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-6 text-white shadow-lg"
      >
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djZoLTZ2LTZoNnptMC0zMHY2aC02VjRoNnptMCAxMHY2aC02di02aDZ6bTAgMTB2NmgtNnYtNmg2em0tMTAgMHY2aC02di02aDZ6bTAgMTB2NmgtNnYtNmg2em0tMTAgMHY2aC02di02aDZ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm"
            >
              <UsersRound className="h-7 w-7" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold">{t('pa.title')}</h1>
              <p className="text-emerald-100 text-sm">{t('pa.subtitle')}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="dashboard" className="gap-1.5">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">{t('pa.tab_dashboard')}</span>
            </TabsTrigger>
            <TabsTrigger value="sessions" className="gap-1.5">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">{t('pa.tab_sessions')}</span>
            </TabsTrigger>
            {isTeacherOrAdmin && (
              <TabsTrigger value="create" className="gap-1.5">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{t('pa.tab_create')}</span>
              </TabsTrigger>
            )}
            {(isStudent || isTeacherOrAdmin) && (
              <TabsTrigger value="conduct" className="gap-1.5">
                <Sliders className="h-4 w-4" />
                <span className="hidden sm:inline">{t('pa.tab_conduct')}</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="results" className="gap-1.5">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">{t('pa.tab_results')}</span>
            </TabsTrigger>
          </TabsList>

          {isTeacherOrAdmin && activeTab === 'sessions' && (
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
            >
              <Plus className="h-4 w-4" />
              {t('pa.new_session')}
            </Button>
          )}
        </div>

        {/* ── Dashboard Tab ── */}
        <TabsContent value="dashboard" className="space-y-6 mt-4">
          {/* Quick Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: t('pa.stat_total_sessions'),
                value: stats.total,
                icon: FileText,
                color: 'from-emerald-500 to-teal-500',
                accent: 'bg-emerald-50 dark:bg-emerald-950/30',
              },
              {
                label: t('pa.stat_active'),
                value: stats.active,
                icon: Activity,
                color: 'from-blue-500 to-cyan-500',
                accent: 'bg-blue-50 dark:bg-blue-950/30',
              },
              {
                label: t('pa.stat_completed'),
                value: stats.completed,
                icon: CheckCircle2,
                color: 'from-green-500 to-emerald-500',
                accent: 'bg-green-50 dark:bg-green-950/30',
              },
              {
                label: t('pa.stat_completion_rate'),
                value: stats.completionRate,
                icon: Target,
                color: 'from-purple-500 to-pink-500',
                accent: 'bg-purple-50 dark:bg-purple-950/30',
                suffix: '%',
              },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
                  <div className={`h-1 bg-gradient-to-r ${stat.color}`} />
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                        <p className="text-2xl font-bold mt-1">
                          <AnimatedCounter value={stat.value} />
                          {stat.suffix || ''}
                        </p>
                      </div>
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.accent}`}>
                        <stat.icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Assessment Overview & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sessions Overview */}
            <Card className="lg:col-span-2 border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-emerald-600" />
                  {t('pa.sessions_overview')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <UsersRound className="h-12 w-12 mb-3 opacity-30" />
                    <p className="text-sm">{t('pa.no_sessions')}</p>
                    {isTeacherOrAdmin && (
                      <Button
                        variant="outline"
                        className="mt-3 gap-1.5"
                        onClick={() => setActiveTab('create')}
                      >
                        <Plus className="h-4 w-4" />
                        {t('pa.create_first')}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                    {sessions.slice(0, 8).map((session, i) => (
                      <motion.div
                        key={session.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedSession(session);
                          fetchSessionDetail(session.id);
                          setActiveTab('conduct');
                        }}
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                          {getTypeIcon(session.assessmentType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{session.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">
                              {getTypeLabel(session.assessmentType)}
                            </span>
                            {getAnonymityIcon(session.anonymityMode)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(session.status)}
                          {session.stats && (
                            <span className="text-xs text-muted-foreground">
                              {session.stats.submitted}/{session.stats.total}
                            </span>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-emerald-600" />
                  {t('pa.recent_activity')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentActivity.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">{t('pa.no_activity')}</p>
                ) : (
                  <div className="space-y-3">
                    {recentActivity.map((activity, i) => (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-start gap-3"
                      >
                        <div className={`flex h-7 w-7 items-center justify-center rounded-full mt-0.5 ${
                          activity.type === 'created' ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                          activity.type === 'completed' ? 'bg-blue-100 dark:bg-blue-900/30' :
                          'bg-gray-100 dark:bg-gray-800'
                        }`}>
                          {activity.type === 'created' ? (
                            <Plus className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : activity.type === 'completed' ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Lock className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{activity.title}</p>
                          <p className="text-xs text-muted-foreground">{activity.date} {activity.time}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Average Ratings by Competency */}
          {sessions.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="h-5 w-5 text-emerald-600" />
                  {t('pa.avg_ratings_by_type')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {['competency', 'project', 'presentation', 'teamwork'].map((type) => {
                    const typeSessions = sessions.filter((s) => s.assessmentType === type);
                    const count = typeSessions.length;
                    const totalSubmitted = typeSessions.reduce((a, s) => a + (s.stats?.submitted || 0), 0);
                    return (
                      <motion.div
                        key={type}
                        whileHover={{ scale: 1.02 }}
                        className="flex flex-col items-center p-4 rounded-xl bg-muted/30 border border-border/50"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30 mb-2">
                          {getTypeIcon(type)}
                        </div>
                        <p className="text-xs font-medium">{getTypeLabel(type)}</p>
                        <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                          {count}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {totalSubmitted} {t('pa.submitted')}
                        </p>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Sessions Tab ── */}
        <TabsContent value="sessions" className="space-y-4 mt-4">
          {/* Search & Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('pa.search_sessions')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('pa.all_statuses')}</SelectItem>
                <SelectItem value="active">{t('pa.status_active')}</SelectItem>
                <SelectItem value="completed">{t('pa.status_completed')}</SelectItem>
                <SelectItem value="closed">{t('pa.status_closed')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('pa.all_types')}</SelectItem>
                <SelectItem value="competency">{t('pa.type_competency')}</SelectItem>
                <SelectItem value="project">{t('pa.type_project')}</SelectItem>
                <SelectItem value="presentation">{t('pa.type_presentation')}</SelectItem>
                <SelectItem value="teamwork">{t('pa.type_teamwork')}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchSessions}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Session List */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="border-0 shadow-sm animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-4 bg-muted rounded w-3/4 mb-3" />
                    <div className="h-3 bg-muted rounded w-1/2 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredSessions.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center">
                <UsersRound className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground">{t('pa.no_sessions_found')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredSessions.map((session, i) => (
                  <motion.div
                    key={session.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30 shrink-0">
                              {getTypeIcon(session.assessmentType)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{session.title}</p>
                              {session.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                  {session.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                {getStatusBadge(session.status)}
                                <Badge variant="outline" className="text-xs gap-1">
                                  {getTypeIcon(session.assessmentType)}
                                  {getTypeLabel(session.assessmentType)}
                                </Badge>
                                <Badge variant="outline" className="text-xs gap-1">
                                  {getAnonymityIcon(session.anonymityMode)}
                                  {getAnonymityLabel(session.anonymityMode)}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {isTeacherOrAdmin && session.status === 'active' && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCloseSession(session.id);
                                      }}
                                    >
                                      <Lock className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>{t('pa.close_session')}</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {isTeacherOrAdmin && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteSession(session.id);
                                      }}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>{t('pa.delete_session')}</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </div>

                        {/* Progress */}
                        {session.stats && session.stats.total > 0 && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                              <span>{t('pa.progress')}</span>
                              <span>
                                {session.stats.submitted}/{session.stats.total} ({Math.round((session.stats.submitted / session.stats.total) * 100)}%)
                              </span>
                            </div>
                            <Progress
                              value={(session.stats.submitted / session.stats.total) * 100}
                              className="h-1.5"
                            />
                          </div>
                        )}

                        {/* Footer info */}
                        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(session.createdAt).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US')}
                          </div>
                          {session.deadline && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(session.deadline).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US')}
                            </div>
                          )}
                          {session.classGroup && (
                            <span>{session.classGroup.name}</span>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2 mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs gap-1 flex-1"
                            onClick={() => {
                              setSelectedSession(session);
                              fetchSessionDetail(session.id);
                              setActiveTab('conduct');
                            }}
                          >
                            <Eye className="h-3 w-3" />
                            {t('pa.view_details')}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs gap-1 flex-1"
                            onClick={() => handleViewResults(session)}
                          >
                            <TrendingUp className="h-3 w-3" />
                            {t('pa.view_results')}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        {/* ── Create Tab ── */}
        {isTeacherOrAdmin && (
          <TabsContent value="create" className="space-y-6 mt-4">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-emerald-600" />
                  {t('pa.create_session')}
                </CardTitle>
                <CardDescription>{t('pa.create_session_desc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('pa.session_title')} *</Label>
                      <Input
                        value={createForm.title}
                        onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))}
                        placeholder={t('pa.session_title_placeholder')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('pa.assessment_type')}</Label>
                      <Select
                        value={createForm.assessmentType}
                        onValueChange={(v) => setCreateForm((p) => ({ ...p, assessmentType: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="competency">{t('pa.type_competency')}</SelectItem>
                          <SelectItem value="project">{t('pa.type_project')}</SelectItem>
                          <SelectItem value="presentation">{t('pa.type_presentation')}</SelectItem>
                          <SelectItem value="teamwork">{t('pa.type_teamwork')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('pa.description')}</Label>
                    <Textarea
                      value={createForm.description}
                      onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                      placeholder={t('pa.description_placeholder')}
                      rows={3}
                    />
                  </div>
                </div>

                <Separator />

                {/* Settings */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Settings className="h-4 w-4 text-emerald-600" />
                    {t('pa.settings')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('pa.anonymity_mode')}</Label>
                      <Select
                        value={createForm.anonymityMode}
                        onValueChange={(v) => setCreateForm((p) => ({ ...p, anonymityMode: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="anonymous">{t('pa.anonymous')}</SelectItem>
                          <SelectItem value="semi-anonymous">{t('pa.semi_anonymous')}</SelectItem>
                          <SelectItem value="open">{t('pa.open')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {createForm.anonymityMode === 'anonymous'
                          ? t('pa.anonymous_desc')
                          : createForm.anonymityMode === 'semi-anonymous'
                            ? t('pa.semi_anonymous_desc')
                            : t('pa.open_desc')}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>{t('pa.assign_mode')}</Label>
                      <Select
                        value={createForm.assignMode}
                        onValueChange={(v) => setCreateForm((p) => ({ ...p, assignMode: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">{t('pa.assign_manual')}</SelectItem>
                          <SelectItem value="random">{t('pa.assign_random')}</SelectItem>
                          <SelectItem value="group-based">{t('pa.assign_group')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('pa.deadline')}</Label>
                      <Input
                        type="datetime-local"
                        value={createForm.deadline}
                        onChange={(e) => setCreateForm((p) => ({ ...p, deadline: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Criteria Builder */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Sliders className="h-4 w-4 text-emerald-600" />
                      {t('pa.criteria_builder')}
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-xs"
                      onClick={addCriterion}
                    >
                      <Plus className="h-3 w-3" />
                      {t('pa.add_criterion')}
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {createForm.criteria.map((criterion, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50"
                      >
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">{t('pa.criterion_name')}</Label>
                            <Input
                              value={criterion.name}
                              onChange={(e) => updateCriterion(index, 'name', e.target.value)}
                              placeholder={t('pa.criterion_name_placeholder')}
                              className="text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">{t('pa.criterion_desc')}</Label>
                            <Input
                              value={criterion.description}
                              onChange={(e) => updateCriterion(index, 'description', e.target.value)}
                              placeholder={t('pa.criterion_desc_placeholder')}
                              className="text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">{t('pa.max_score')}</Label>
                            <Select
                              value={String(criterion.maxScore)}
                              onValueChange={(v) => updateCriterion(index, 'maxScore', Number(v))}
                            >
                              <SelectTrigger className="text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="3">3</SelectItem>
                                <SelectItem value="4">4</SelectItem>
                                <SelectItem value="5">5</SelectItem>
                                <SelectItem value="6">6</SelectItem>
                                <SelectItem value="10">10</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        {createForm.criteria.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-destructive"
                            onClick={() => removeCriterion(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Submit */}
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab('sessions')}
                  >
                    {t('action.cancel')}
                  </Button>
                  <Button
                    onClick={handleCreateSession}
                    disabled={!createForm.title}
                    className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
                  >
                    <Send className="h-4 w-4" />
                    {t('pa.create_session')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ── Conduct Tab ── */}
        {(isStudent || isTeacherOrAdmin) && (
          <TabsContent value="conduct" className="space-y-4 mt-4">
            {selectedSession ? (
              <div className="space-y-4">
                {/* Session Header */}
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setSelectedSession(null);
                            setSessionDetail(null);
                          }}
                        >
                          <ChevronRight className="h-4 w-4 rotate-180" />
                        </Button>
                        <div>
                          <h2 className="text-lg font-semibold">{selectedSession.title}</h2>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {getStatusBadge(selectedSession.status)}
                            <Badge variant="outline" className="text-xs gap-1">
                              {getAnonymityIcon(selectedSession.anonymityMode)}
                              {getAnonymityLabel(selectedSession.anonymityMode)}
                            </Badge>
                            {selectedSession.deadline && (
                              <Badge variant="outline" className="text-xs gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(selectedSession.deadline).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US')}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-xs"
                          onClick={() => handleViewResults(selectedSession)}
                        >
                          <TrendingUp className="h-3 w-3" />
                          {t('pa.view_results')}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Assessment Criteria Preview */}
                {sessionDetail?.criteria && (
                  <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Sliders className="h-4 w-4 text-emerald-600" />
                        {t('pa.criteria')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {JSON.parse(sessionDetail.criteria).map((c: Criterion, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {c.name} ({c.maxScore} {t('pa.points')})
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Assessment List */}
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Users className="h-4 w-4 text-emerald-600" />
                      {t('pa.assessment_list')}
                      <Badge variant="secondary" className="text-xs">
                        {sessionAssessments.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {sessionAssessments.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">{t('pa.no_assessments')}</p>
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                        {sessionAssessments.map((assessment, i) => (
                          <motion.div
                            key={assessment.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-xs font-medium">
                              {assessment.assessed.firstName.charAt(0)}
                              {assessment.assessed.lastName.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {assessment.assessed.firstName} {assessment.assessed.lastName}
                                </span>
                                {assessment.isAnonymous && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <Lock className="h-3 w-3 text-muted-foreground" />
                                      </TooltipTrigger>
                                      <TooltipContent>{t('pa.anonymous_mode')}</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {t('pa.assessed_by')}{' '}
                                {assessment.isAnonymous && selectedSession.anonymityMode === 'anonymous'
                                  ? t('pa.anonymous_assessor')
                                  : `${assessment.assessor.firstName} ${assessment.assessor.lastName}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(assessment.status)}
                              {assessment.level && (
                                <Badge variant="outline" className="text-xs">
                                  {assessment.level}/6
                                </Badge>
                              )}
                            </div>
                            {assessment.status === 'pending' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs gap-1"
                                onClick={() => handleStartConduct(assessment)}
                              >
                                <Edit3 className="h-3 w-3" />
                                {t('pa.rate')}
                              </Button>
                            )}
                            {assessment.status === 'submitted' && (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            )}
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              /* Select a session to conduct */
              <Card className="border-0 shadow-sm">
                <CardContent className="py-12 text-center">
                  <UsersRound className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <p className="text-muted-foreground mb-2">{t('pa.select_session')}</p>
                  <Button
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => setActiveTab('sessions')}
                  >
                    <ArrowRight className="h-4 w-4" />
                    {t('pa.go_to_sessions')}
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {/* ── Results Tab ── */}
        <TabsContent value="results" className="space-y-4 mt-4">
          {sessions.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center">
                <TrendingUp className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground">{t('pa.no_sessions_for_results')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Select
                  value={selectedSession?.id || ''}
                  onValueChange={(v) => {
                    const session = sessions.find((s) => s.id === v);
                    if (session) {
                      setSelectedSession(session);
                      fetchResults(session.id);
                    }
                  }}
                >
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder={t('pa.select_session_results')} />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedSession && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={() => fetchResults(selectedSession.id)}
                  >
                    <RefreshCw className="h-3 w-3" />
                    {t('action.refresh')}
                  </Button>
                )}
              </div>

              {results && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* Overall Stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {[
                      { label: t('pa.total_assessments'), value: results.overallStats.totalAssessments, icon: FileText },
                      { label: t('pa.overall_average'), value: results.overallStats.overallAverage, icon: Star },
                      { label: t('pa.std_deviation'), value: results.overallStats.ratingStdDev, icon: BarChart3 },
                      { label: t('pa.unique_assessors'), value: results.overallStats.uniqueAssessors, icon: Users },
                      { label: t('pa.unique_assessed'), value: results.overallStats.uniqueAssessed, icon: UserCheck },
                    ].map((stat, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <Card className="border-0 shadow-sm">
                          <CardContent className="p-3 text-center">
                            <stat.icon className="h-5 w-5 mx-auto mb-1 text-emerald-600 dark:text-emerald-400" />
                            <p className="text-lg font-bold">
                              <AnimatedCounter value={stat.value} />
                            </p>
                            <p className="text-xs text-muted-foreground">{stat.label}</p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>

                  {/* Radar Chart */}
                  {radarData.length > 0 && (
                    <Card className="border-0 shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <Target className="h-4 w-4 text-emerald-600" />
                          {t('pa.competency_radar')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={radarData}>
                              <PolarGrid stroke={isDark ? '#374151' : '#e5e7eb'} />
                              <PolarAngleAxis
                                dataKey="criterion"
                                tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 11 }}
                              />
                              <PolarRadiusAxis
                                angle={30}
                                domain={[0, 5]}
                                tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 10 }}
                              />
                              <Radar
                                name={t('pa.average_score')}
                                dataKey="average"
                                stroke="#10b981"
                                fill="#10b981"
                                fillOpacity={0.25}
                                strokeWidth={2}
                              />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Student Results Table */}
                  <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Users className="h-4 w-4 text-emerald-600" />
                        {t('pa.student_results')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                        {results.studentResults.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-6">{t('pa.no_results')}</p>
                        ) : (
                          results.studentResults.map((sr, i) => (
                            <motion.div
                              key={sr.student.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className="p-3 rounded-lg bg-muted/30 border border-border/50"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-xs font-medium">
                                    {sr.student.firstName.charAt(0)}
                                    {sr.student.lastName.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">
                                      {sr.student.firstName} {sr.student.lastName}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {sr.assessmentCount} {t('pa.assessments_received')}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-sm font-bold">
                                    <AnimatedCounter value={sr.averageRating} />
                                  </Badge>
                                </div>
                              </div>

                              {/* Criteria breakdown */}
                              {Object.entries(sr.criteriaScores).length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                                  {Object.entries(sr.criteriaScores).map(([name, data]) => (
                                    <div
                                      key={name}
                                      className="flex items-center justify-between text-xs p-1.5 rounded bg-background/50"
                                    >
                                      <span className="text-muted-foreground truncate">{name}</span>
                                      <span className="font-medium">
                                        {data.average}/{data.count > 0 ? Math.round(data.total / data.count) : 0}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Comments */}
                              {sr.comments.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {sr.comments.slice(0, 2).map((comment, ci) => (
                                    <p key={ci} className="text-xs text-muted-foreground italic">
                                      &ldquo;{comment}&rdquo;
                                    </p>
                                  ))}
                                  {sr.comments.length > 2 && (
                                    <p className="text-xs text-muted-foreground">
                                      +{sr.comments.length - 2} {t('pa.more_comments')}
                                    </p>
                                  )}
                                </div>
                              )}
                            </motion.div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Comparison Chart */}
                  {barData.length > 0 && (
                    <Card className="border-0 shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-emerald-600" />
                          {t('pa.self_vs_peer')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData}>
                              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
                              <XAxis
                                dataKey="name"
                                tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 10 }}
                              />
                              <YAxis
                                domain={[0, 6]}
                                tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 10 }}
                              />
                              <RechartsTooltip
                                contentStyle={{
                                  backgroundColor: isDark ? '#1f2937' : '#ffffff',
                                  border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                }}
                              />
                              <Legend />
                              <Bar dataKey="peerAvg" name={t('pa.peer_avg')} fill="#10b981" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="selfAvg" name={t('pa.self_avg')} fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Outliers */}
                  {results.outliers.length > 0 && (
                    <Card className="border-0 shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          {t('pa.outliers_detected')}
                          <Badge variant="destructive" className="text-xs">
                            {results.outliers.length}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {results.outliers.map((outlier, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: i * 0.1 }}
                              className="flex items-center gap-3 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30"
                            >
                              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs">
                                  <span className="font-medium">{outlier.assessed.firstName} {outlier.assessed.lastName}</span>
                                  {' — '}
                                  {t('pa.rated_by')}{' '}
                                  {outlier.assessor.firstName === 'Anonym'
                                    ? t('pa.anonymous_assessor')
                                    : `${outlier.assessor.firstName} ${outlier.assessor.lastName}`}
                                </p>
                                {outlier.comment && (
                                  <p className="text-xs text-muted-foreground italic mt-0.5">
                                    &ldquo;{outlier.comment}&rdquo;
                                  </p>
                                )}
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {outlier.level}/6
                              </Badge>
                            </motion.div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Create Session Dialog ── */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-emerald-600" />
              {t('pa.new_session')}
            </DialogTitle>
            <DialogDescription>{t('pa.create_session_desc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('pa.session_title')} *</Label>
              <Input
                value={createForm.title}
                onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))}
                placeholder={t('pa.session_title_placeholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('pa.assessment_type')}</Label>
              <Select
                value={createForm.assessmentType}
                onValueChange={(v) => setCreateForm((p) => ({ ...p, assessmentType: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="competency">{t('pa.type_competency')}</SelectItem>
                  <SelectItem value="project">{t('pa.type_project')}</SelectItem>
                  <SelectItem value="presentation">{t('pa.type_presentation')}</SelectItem>
                  <SelectItem value="teamwork">{t('pa.type_teamwork')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('pa.description')}</Label>
              <Textarea
                value={createForm.description}
                onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                placeholder={t('pa.description_placeholder')}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t('pa.anonymity_mode')}</Label>
                <Select
                  value={createForm.anonymityMode}
                  onValueChange={(v) => setCreateForm((p) => ({ ...p, anonymityMode: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anonymous">{t('pa.anonymous')}</SelectItem>
                    <SelectItem value="semi-anonymous">{t('pa.semi_anonymous')}</SelectItem>
                    <SelectItem value="open">{t('pa.open')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('pa.deadline')}</Label>
                <Input
                  type="datetime-local"
                  value={createForm.deadline}
                  onChange={(e) => setCreateForm((p) => ({ ...p, deadline: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('pa.assign_mode')}</Label>
              <Select
                value={createForm.assignMode}
                onValueChange={(v) => setCreateForm((p) => ({ ...p, assignMode: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">{t('pa.assign_manual')}</SelectItem>
                  <SelectItem value="random">{t('pa.assign_random')}</SelectItem>
                  <SelectItem value="group-based">{t('pa.assign_group')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              {t('action.cancel')}
            </Button>
            <Button
              onClick={handleCreateSession}
              disabled={!createForm.title}
              className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
            >
              <Send className="h-4 w-4" />
              {t('pa.create_session')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Conduct Assessment Dialog ── */}
      <Dialog open={showConductDialog} onOpenChange={setShowConductDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sliders className="h-5 w-5 text-emerald-600" />
              {t('pa.rate_peer')}
            </DialogTitle>
            <DialogDescription>
              {conductingAssessment && (
                <>
                  {t('pa.rating_for')}{' '}
                  <span className="font-medium">
                    {conductingAssessment.assessed.firstName} {conductingAssessment.assessed.lastName}
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Anonymous indicator */}
            {conductingAssessment?.isAnonymous && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30">
                <Lock className="h-4 w-4 text-blue-500" />
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  {t('pa.anonymous_mode_active')}
                </p>
              </div>
            )}

            {/* Criteria ratings */}
            {Object.entries(conductRatings).length > 0 && (
              <div className="space-y-4">
                <Label className="text-sm font-semibold">{t('pa.criteria_ratings')}</Label>
                {Object.entries(conductRatings).map(([name, value]) => {
                  const maxScore = sessionDetail?.criteria
                    ? JSON.parse(sessionDetail.criteria).find((c: Criterion) => c.name === name)?.maxScore || 5
                    : 5;
                  return (
                    <RatingSlider
                      key={name}
                      label={name}
                      value={value}
                      maxScore={maxScore}
                      onChange={(v) => setConductRatings((prev) => ({ ...prev, [name]: v }))}
                    />
                  );
                })}
              </div>
            )}

            {/* Overall rating */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">{t('pa.overall_rating')}</Label>
              <RatingSlider
                value={conductOverallRating}
                maxScore={6}
                onChange={setConductOverallRating}
              />
            </div>

            {/* Comment */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">{t('pa.feedback_comment')}</Label>
              <Textarea
                value={conductComment}
                onChange={(e) => setConductComment(e.target.value)}
                placeholder={t('pa.comment_placeholder')}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConductDialog(false)}>
              {t('action.cancel')}
            </Button>
            <Button
              onClick={handleSubmitAssessment}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
            >
              {submitting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {t('pa.submit_assessment')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Results Dialog ── */}
      <Dialog open={showResultsDialog} onOpenChange={setShowResultsDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              {t('pa.results_title')}
              {selectedSession && (
                <span className="text-muted-foreground font-normal">
                  — {selectedSession.title}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {results ? (
            <div className="space-y-4">
              {/* Radar Chart */}
              {radarData.length > 0 && (
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke={isDark ? '#374151' : '#e5e7eb'} />
                      <PolarAngleAxis
                        dataKey="criterion"
                        tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 11 }}
                      />
                      <PolarRadiusAxis angle={30} domain={[0, 5]} />
                      <Radar
                        name={t('pa.average_score')}
                        dataKey="average"
                        stroke="#10b981"
                        fill="#10b981"
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Student Results */}
              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                {results.studentResults.map((sr) => (
                  <div
                    key={sr.student.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-xs font-medium">
                        {sr.student.firstName.charAt(0)}
                        {sr.student.lastName.charAt(0)}
                      </div>
                      <span className="text-sm">{sr.student.firstName} {sr.student.lastName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{sr.averageRating}</span>
                      <Badge variant="outline" className="text-xs">
                        {sr.assessmentCount} {t('pa.ratings')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>

              {/* Outliers */}
              {results.outliers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {t('pa.outliers_detected')} ({results.outliers.length})
                  </p>
                  {results.outliers.map((o, i) => (
                    <div key={i} className="text-xs p-2 rounded bg-amber-50 dark:bg-amber-950/20">
                      {o.assessed.firstName} {o.assessed.lastName} — {t('pa.rated_by')}{' '}
                      {o.assessor.firstName === 'Anonym' ? t('pa.anonymous_assessor') : `${o.assessor.firstName} ${o.assessor.lastName}`}
                      {' '}({o.level}/6)
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResultsDialog(false)}>
              {t('action.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom scrollbar styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 3px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #4b5563;
        }
      `}</style>
    </div>
  );
}
