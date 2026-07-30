'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass,
  Target,
  Calendar,
  Briefcase,
  GraduationCap,
  Plus,
  CheckCircle2,
  Clock,
  ChevronRight,
  Heart,
  Brain,
  Cpu,
  Palette,
  Leaf,
  Users,
  TrendingUp,
  FileText,
  Award,
  Star,
  MapPin,
  DollarSign,
  BookOpen,
  Edit3,
  Trash2,
  X,
  Save,
  AlertCircle,
  Lightbulb,
  BarChart3,
  ArrowRight,
  Sparkles,
  Timer,
  Check,
  Trophy,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';

// ── Types ──────────────────────────────────────────────────────────────
interface CareerProfileData {
  id: string;
  schoolId: string;
  studentId: string;
  interests: string | null;
  strengths: string | null;
  careerCluster: string | null;
  desiredCareer: string | null;
  educationPath: string | null;
  workExperiences: string | null;
  volunteerExps: string | null;
  certifications: string | null;
  documents: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  goals?: CareerGoalData[];
  appointments?: CareerAppointmentData[];
  student?: { id: string; firstName: string; lastName: string; avatarUrl?: string };
}

interface CareerGoalData {
  id: string;
  profileId: string;
  title: string;
  description: string | null;
  category: string;
  targetDate: string | null;
  progress: number;
  status: string;
  milestones: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CareerAppointmentData {
  id: string;
  schoolId: string;
  profileId: string;
  counselorId: string;
  date: string;
  duration: number;
  type: string;
  status: string;
  notes: string | null;
  actionItems: string | null;
  createdAt: string;
  updatedAt: string;
  counselor?: { id: string; firstName: string; lastName: string };
  profile?: { student?: { id: string; firstName: string; lastName: string } };
}

interface CareerStats {
  totalProfiles: number;
  clusterCounts: Record<string, number>;
  pathCounts: Record<string, number>;
  goalStats: { total: number; active: number; completed: number; avgProgress: number };
  appointmentStats: { total: number; scheduled: number; completed: number; cancelled: number };
}

// ── Career Data ────────────────────────────────────────────────────────
const CAREER_CLUSTERS = [
  { key: 'Technology', icon: Cpu, color: '#10b981', gradient: 'from-emerald-500 to-teal-600' },
  { key: 'Health', icon: Heart, color: '#f43f5e', gradient: 'from-rose-500 to-pink-600' },
  { key: 'Business', icon: Briefcase, color: '#f59e0b', gradient: 'from-amber-500 to-orange-600' },
  { key: 'Arts', icon: Palette, color: '#8b5cf6', gradient: 'from-violet-500 to-purple-600' },
  { key: 'Science', icon: Brain, color: '#3b82f6', gradient: 'from-blue-500 to-cyan-600' },
  { key: 'Social', icon: Users, color: '#06b6d4', gradient: 'from-cyan-500 to-teal-600' },
];

const CAREER_PROFILES = [
  { name: 'Software Engineer', cluster: 'Technology', salary: '€45k-€85k', requirements: ['Gymnasium', 'Informatikstudium'], subjects: ['Mathematik', 'Informatik', 'Physik'], skills: ['Logisches Denken', 'Teamarbeit', 'Problemlösung'] },
  { name: 'Krankenpfleger/in', cluster: 'Health', salary: '€30k-€45k', requirements: ['Realschule', 'Ausbildung'], subjects: ['Biologie', 'Chemie', 'Mathematik'], skills: ['Empathie', 'Belastbarkeit', 'Kommunikation'] },
  { name: 'Kaufmann/-frau', cluster: 'Business', salary: '€30k-€55k', requirements: ['Realschule', 'Ausbildung'], subjects: ['Mathematik', 'Deutsch', 'Englisch'], skills: ['Organisation', 'Kommunikation', 'Analytisches Denken'] },
  { name: 'Designer/in', cluster: 'Arts', salary: '€28k-€60k', requirements: ['Realschule/Gymnasium', 'Studium/Ausbildung'], subjects: ['Kunst', 'Deutsch', 'Informatik'], skills: ['Kreativität', 'Ästhetisches Empfinden', 'Technik'] },
  { name: 'Biologe/Biologin', cluster: 'Science', salary: '€35k-€65k', requirements: ['Gymnasium', 'Studium'], subjects: ['Biologie', 'Chemie', 'Mathematik'], skills: ['Analytisches Denken', 'Geduld', 'Forschung'] },
  { name: 'Lehrer/in', cluster: 'Social', salary: '€35k-€60k', requirements: ['Gymnasium', 'Referendariat'], subjects: ['Alle Fächer', 'Pädagogik'], skills: ['Kommunikation', 'Geduld', 'Organisation'] },
  { name: 'Mechatroniker/in', cluster: 'Technology', salary: '€30k-€50k', requirements: ['Hauptschule/Realschule', 'Ausbildung'], subjects: ['Mathematik', 'Physik', 'Technik'], skills: ['Handwerk', 'Technikverständnis', 'Präzision'] },
  { name: 'Arzt/Ärztin', cluster: 'Health', salary: '€60k-€120k', requirements: ['Gymnasium', 'Medizinstudium'], subjects: ['Biologie', 'Chemie', 'Physik'], skills: ['Analytisches Denken', 'Empathie', 'Belastbarkeit'] },
  { name: 'Bankkaufmann/-frau', cluster: 'Business', salary: '€32k-€60k', requirements: ['Realschule', 'Ausbildung'], subjects: ['Mathematik', 'Deutsch', 'Englisch'], skills: ['Zahlenverständnis', 'Kommunikation', 'Verantwortung'] },
  { name: 'Musiker/in', cluster: 'Arts', salary: '€20k-€80k', requirements: ['Ausbildung/Studium'], subjects: ['Musik', 'Deutsch'], skills: ['Kreativität', 'Disziplin', 'Ausdruck'] },
  { name: 'Physiker/in', cluster: 'Science', salary: '€40k-€75k', requirements: ['Gymnasium', 'Studium'], subjects: ['Physik', 'Mathematik', 'Chemie'], skills: ['Analytisches Denken', 'Mathematik', 'Forschung'] },
  { name: 'Sozialarbeiter/in', cluster: 'Social', salary: '€28k-€48k', requirements: ['Realschule/Gymnasium', 'Studium'], subjects: ['Deutsch', 'Sozialkunde', 'Psychologie'], skills: ['Empathie', 'Kommunikation', 'Organisation'] },
];

const QUIZ_QUESTIONS = [
  { id: 'creativity', labelKey: 'career.interest_creativity', icon: Palette, cluster: 'Arts' },
  { id: 'analytical', labelKey: 'career.interest_analytical', icon: Brain, cluster: 'Science' },
  { id: 'social_skill', labelKey: 'career.interest_social_skill', icon: Users, cluster: 'Social' },
  { id: 'technical', labelKey: 'career.interest_technical', icon: Cpu, cluster: 'Technology' },
  { id: 'leadership', labelKey: 'career.interest_leadership', icon: TrendingUp, cluster: 'Business' },
  { id: 'nature', labelKey: 'career.interest_nature', icon: Leaf, cluster: 'Science' },
  { id: 'communication', labelKey: 'career.interest_communication', icon: BookOpen, cluster: 'Social' },
  { id: 'organization', labelKey: 'career.interest_organization', icon: Target, cluster: 'Business' },
];

const EDUCATION_PATHS = [
  { key: 'Hauptschule', labelKey: 'career.path_hauptschule' },
  { key: 'Realschule', labelKey: 'career.path_realschule' },
  { key: 'Gymnasium', labelKey: 'career.path_gymnasium' },
  { key: 'Berufsschule', labelKey: 'career.path_berufsschule' },
];

// ── Animated Counter ───────────────────────────────────────────────────
function AnimatedCounter({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = value / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setCount(value); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [value, duration]);
  return <span>{count}</span>;
}

// ── Main Component ─────────────────────────────────────────────────────
export default function StudentCareerView() {
  const { currentUser } = useAppStore();
  const role = currentUser?.role || 'STUDENT';

  const [profile, setProfile] = useState<CareerProfileData | null>(null);
  const [goals, setGoals] = useState<CareerGoalData[]>([]);
  const [appointments, setAppointments] = useState<CareerAppointmentData[]>([]);
  const [stats, setStats] = useState<CareerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('exploration');

  // Quiz state
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizActive, setQuizActive] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);

  // Dialog state
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [editingGoal, setEditingGoal] = useState<CareerGoalData | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [selectedCareer, setSelectedCareer] = useState<typeof CAREER_PROFILES[0] | null>(null);

  // Form state
  const [goalForm, setGoalForm] = useState({ title: '', description: '', category: 'short_term', targetDate: '' });
  const [appointmentForm, setAppointmentForm] = useState({ date: '', duration: '30', type: 'guidance', notes: '' });
  const [profileForm, setProfileForm] = useState({
    interests: [] as string[],
    strengths: [] as string[],
    careerCluster: '',
    desiredCareer: '',
    educationPath: '',
    notes: '',
  });

  const schoolId = currentUser?.schoolId;

  // ── Fetch data ───────────────────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    if (!schoolId) return;
    try {
      const res = await fetch(`/api/career/profile?schoolId=${schoolId}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        if (data) {
          setGoals(data.goals || []);
          setAppointments(data.appointments || []);
          // Load quiz answers from interests
          if (data.interests) {
            try {
              const interests = JSON.parse(data.interests);
              if (typeof interests === 'object' && !Array.isArray(interests)) {
                setQuizAnswers(interests);
                setQuizCompleted(true);
              }
            } catch { /* ignore */ }
          }
          // Load profile form
          if (data.strengths) {
            try { setProfileForm(prev => ({ ...prev, strengths: JSON.parse(data.strengths) })); } catch { /* ignore */ }
          }
          if (data.interests) {
            try {
              const parsed = JSON.parse(data.interests);
              if (Array.isArray(parsed)) setProfileForm(prev => ({ ...prev, interests: parsed }));
            } catch { /* ignore */ }
          }
          setProfileForm(prev => ({
            ...prev,
            careerCluster: data.careerCluster || '',
            desiredCareer: data.desiredCareer || '',
            educationPath: data.educationPath || '',
            notes: data.notes || '',
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching career profile:', error);
    }
  }, [schoolId]);

  const fetchStats = useCallback(async () => {
    if (!schoolId || (role !== 'ADMIN' && role !== 'VICE_PRINCIPAL' && role !== 'TEACHER')) return;
    try {
      const res = await fetch(`/api/career?schoolId=${schoolId}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching career stats:', error);
    }
  }, [schoolId, role]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchProfile();
      await fetchStats();
      setLoading(false);
    };
    loadData();
  }, [fetchProfile, fetchStats]);

  // ── Create profile if not exists ─────────────────────────────────────
  const createProfile = async () => {
    if (!schoolId) return;
    try {
      // Find student ID for current user
      const studentRes = await fetch('/api/students?schoolId=' + schoolId);
      let studentId = '';
      if (studentRes.ok) {
        const students = await studentRes.json();
        const me = students.find((s: { userId?: string }) => s.userId === currentUser?.id);
        if (me) studentId = me.id;
      }
      if (!studentId) return;

      const res = await fetch('/api/career', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId, studentId }),
      });
      if (res.ok) {
        const newProfile = await res.json();
        setProfile(newProfile);
      }
    } catch (error) {
      console.error('Error creating career profile:', error);
    }
  };

  // ── Save profile ─────────────────────────────────────────────────────
  const saveProfile = async () => {
    if (!profile) return;
    try {
      const res = await fetch('/api/career/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: profile.id,
          interests: profileForm.interests,
          strengths: profileForm.strengths,
          careerCluster: profileForm.careerCluster,
          desiredCareer: profileForm.desiredCareer,
          educationPath: profileForm.educationPath,
          notes: profileForm.notes,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile(updated);
        setShowProfileDialog(false);
      }
    } catch (error) {
      console.error('Error saving career profile:', error);
    }
  };

  // ── Save quiz results ────────────────────────────────────────────────
  const saveQuizResults = async () => {
    if (!profile) return;
    try {
      const res = await fetch('/api/career/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: profile.id,
          interests: quizAnswers,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile(updated);
        setQuizCompleted(true);
      }
    } catch (error) {
      console.error('Error saving quiz results:', error);
    }
  };

  // ── Goal CRUD ────────────────────────────────────────────────────────
  const saveGoal = async () => {
    if (!profile) return;
    try {
      if (editingGoal) {
        const res = await fetch(`/api/career/goals/${editingGoal.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(goalForm),
        });
        if (res.ok) {
          const updated = await res.json();
          setGoals(prev => prev.map(g => g.id === updated.id ? updated : g));
        }
      } else {
        const res = await fetch('/api/career/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileId: profile.id, ...goalForm }),
        });
        if (res.ok) {
          const newGoal = await res.json();
          setGoals(prev => [newGoal, ...prev]);
        }
      }
      setShowGoalDialog(false);
      setEditingGoal(null);
      setGoalForm({ title: '', description: '', category: 'short_term', targetDate: '' });
    } catch (error) {
      console.error('Error saving goal:', error);
    }
  };

  const deleteGoal = async (id: string) => {
    try {
      const res = await fetch(`/api/career/goals/${id}`, { method: 'DELETE' });
      if (res.ok) setGoals(prev => prev.filter(g => g.id !== id));
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  };

  // ── Appointment CRUD ─────────────────────────────────────────────────
  const saveAppointment = async () => {
    if (!profile || !schoolId) return;
    try {
      // Find a counselor (teacher)
      const res = await fetch('/api/career/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId,
          profileId: profile.id,
          counselorId: currentUser?.id, // Will use self as placeholder
          date: appointmentForm.date,
          duration: parseInt(appointmentForm.duration),
          type: appointmentForm.type,
          notes: appointmentForm.notes,
        }),
      });
      if (res.ok) {
        const newAppt = await res.json();
        setAppointments(prev => [newAppt, ...prev]);
        setShowAppointmentDialog(false);
        setAppointmentForm({ date: '', duration: '30', type: 'guidance', notes: '' });
      }
    } catch (error) {
      console.error('Error saving appointment:', error);
    }
  };

  const updateAppointmentStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/career/appointments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const updated = await res.json();
        setAppointments(prev => prev.map(a => a.id === updated.id ? updated : a));
      }
    } catch (error) {
      console.error('Error updating appointment:', error);
    }
  };

  const deleteAppointment = async (id: string) => {
    try {
      const res = await fetch(`/api/career/appointments/${id}`, { method: 'DELETE' });
      if (res.ok) setAppointments(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error('Error deleting appointment:', error);
    }
  };

  // ── Quiz computations ────────────────────────────────────────────────
  const quizResult = useMemo(() => {
    if (!quizCompleted || Object.keys(quizAnswers).length === 0) return null;
    const clusterScores: Record<string, number> = {};
    QUIZ_QUESTIONS.forEach(q => {
      const answer = quizAnswers[q.id] || 0;
      clusterScores[q.cluster] = (clusterScores[q.cluster] || 0) + answer;
    });
    const maxCluster = Object.entries(clusterScores).sort((a, b) => b[1] - a[1])[0];
    return { topCluster: maxCluster?.[0] || '', clusterScores };
  }, [quizAnswers, quizCompleted]);

  const radarData = useMemo(() => {
    if (!quizResult) return [];
    return Object.entries(quizResult.clusterScores).map(([key, value]) => ({
      subject: t(`career.cluster_${key.toLowerCase()}`),
      value: Math.round((value / 10) * 100) / 10,
      fullMark: 5,
    }));
  }, [quizResult]);

  // ── Stats chart data ─────────────────────────────────────────────────
  const clusterChartData = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.clusterCounts).map(([key, value]) => ({
      name: t(`career.cluster_${key.toLowerCase()}`) || key,
      value,
      color: CAREER_CLUSTERS.find(c => c.key === key)?.color || '#6b7280',
    }));
  }, [stats]);

  const pathChartData = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.pathCounts).map(([key, value]) => ({
      name: t(`career.path_${key.toLowerCase()}`) || key,
      value,
    }));
  }, [stats]);

  // ── Filtered appointments ────────────────────────────────────────────
  const upcomingAppointments = useMemo(() =>
    appointments.filter(a => a.status === 'scheduled' && new Date(a.date) >= new Date()),
    [appointments]
  );
  const pastAppointments = useMemo(() =>
    appointments.filter(a => a.status !== 'scheduled' || new Date(a.date) < new Date()),
    [appointments]
  );

  // ── Render Loading ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full"
        />
      </div>
    );
  }

  // ── Render Header Banner ─────────────────────────────────────────────
  const renderHeader = () => (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-6 md:p-8 mb-6"
    >
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djZoLTZ2LTZoNnptMC0zMHY2aC02VjRoNnptMCAxMHY2aC02di02aDZ6bTAgMTB2NmgtNnYtNmg2em0tMTAgMHY2aC02di02aDZ6bS0xMCAwdjZoLTZ2LTZoNnptMzAgMHY2aC02di02aDZ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20" />
      <div className="relative z-10 flex items-center gap-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
          className="flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm"
        >
          <Compass className="w-8 h-8 text-white" />
        </motion.div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">{t('career.title')}</h1>
          <p className="text-emerald-100 mt-1">{t('career.subtitle')}</p>
        </div>
      </div>
      {/* Decorative elements */}
      <motion.div
        animate={{ x: [0, 20, 0], y: [0, -10, 0] }}
        transition={{ duration: 8, repeat: Infinity }}
        className="absolute top-4 right-4 w-20 h-20 bg-white/10 rounded-full"
      />
      <motion.div
        animate={{ x: [0, -15, 0], y: [0, 15, 0] }}
        transition={{ duration: 6, repeat: Infinity }}
        className="absolute bottom-4 right-20 w-12 h-12 bg-white/10 rounded-full"
      />
    </motion.div>
  );

  // ── Render Stat Cards ────────────────────────────────────────────────
  const renderStatCards = () => {
    const isStudent = role === 'STUDENT';
    const activeGoals = goals.filter(g => g.status === 'active').length;
    const completedGoals = goals.filter(g => g.status === 'completed').length;
    const avgProgress = goals.length > 0 ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length) : 0;

    const cards = [
      { label: t('career.goals'), value: goals.length, icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
      { label: t('career.status_active'), value: activeGoals, icon: CheckCircle2, color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-950/40' },
      { label: t('career.status_completed'), value: completedGoals, icon: Award, color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-950/40' },
      { label: t('career.progress'), value: avgProgress, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/40', suffix: '%' },
    ];

    if (!isStudent && stats) {
      return [
        { label: t('career.students_with_profiles'), value: stats.totalProfiles, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
        { label: t('career.total_goals'), value: stats.goalStats.total, icon: Target, color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-950/40' },
        { label: t('career.avg_progress'), value: stats.goalStats.avgProgress, icon: TrendingUp, color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-950/40', suffix: '%' },
        { label: t('career.appointments_this_month'), value: stats.appointmentStats.scheduled, icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/40' },
      ].map((card, i) => renderStatCard(card, i));
    }

    return cards.map((card, i) => renderStatCard(card, i));
  };

  const renderStatCard = (card: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; color: string; bg: string; suffix?: string }, i: number) => (
    <motion.div
      key={i}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.1 }}
    >
      <Card className={`hover:shadow-lg transition-all duration-300 border-0 ${card.bg}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="text-2xl font-bold mt-1">
                <AnimatedCounter value={card.value} />
                {card.suffix || ''}
              </p>
            </div>
            <motion.div
              whileHover={{ rotate: 15, scale: 1.1 }}
              className={`p-3 rounded-xl ${card.bg}`}
            >
              <card.icon className={`w-6 h-6 ${card.color}`} />
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  // ── Render Career Quiz ───────────────────────────────────────────────
  const renderQuiz = () => (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ rotate: 15 }}
            className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40"
          >
            <Sparkles className="w-5 h-5 text-emerald-600" />
          </motion.div>
          <div>
            <CardTitle>{t('career.quiz_title')}</CardTitle>
            <CardDescription>{t('career.quiz_subtitle')}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!quizActive && !quizCompleted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8"
          >
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
              <Compass className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{t('career.quiz_not_taken')}</h3>
            <p className="text-muted-foreground mb-4">{t('career.quiz_not_taken_desc')}</p>
            <Button onClick={() => setQuizActive(true)} className="bg-emerald-600 hover:bg-emerald-700">
              <Sparkles className="w-4 h-4 mr-2" />
              {t('career.quiz_start')}
            </Button>
          </motion.div>
        )}

        {quizActive && (
          <div className="space-y-4">
            {QUIZ_QUESTIONS.map((q, i) => (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
              >
                <q.icon className="w-6 h-6 text-emerald-600 shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-sm mb-2">{t(q.labelKey)}</p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(n => (
                      <motion.button
                        key={n}
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setQuizAnswers(prev => ({ ...prev, [q.id]: n }))}
                        className={`w-10 h-10 rounded-lg text-sm font-semibold transition-all ${
                          quizAnswers[q.id] === n
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'bg-muted hover:bg-emerald-100 dark:hover:bg-emerald-950/40'
                        }`}
                      >
                        {n}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setQuizActive(false)}>
                {t('action.cancel')}
              </Button>
              <Button
                onClick={() => { setQuizActive(false); setQuizCompleted(true); saveQuizResults(); }}
                disabled={Object.keys(quizAnswers).length < QUIZ_QUESTIONS.length}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Check className="w-4 h-4 mr-2" />
                {t('action.save')}
              </Button>
            </div>
          </div>
        )}

        {quizCompleted && quizResult && !quizActive && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">{t('career.quiz_result')}</h3>
                <p className="text-sm text-muted-foreground">{t('career.quiz_result_desc')}</p>
              </div>
              <Badge className="bg-emerald-600 ml-auto">{t(`career.cluster_${quizResult.topCluster.toLowerCase()}`)}</Badge>
            </div>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid strokeDasharray="3 3" />
                  <PolarAngleAxis dataKey="subject" className="text-xs" />
                  <PolarRadiusAxis angle={30} domain={[0, 5]} />
                  <Radar
                    name="Interest"
                    dataKey="value"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <Button variant="outline" onClick={() => { setQuizActive(true); setQuizCompleted(false); }}>
              <Sparkles className="w-4 h-4 mr-2" />
              {t('career.quiz_retake')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // ── Render Career Clusters ───────────────────────────────────────────
  const renderClusters = () => (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/40">
            <Compass className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <CardTitle>{t('career.clusters')}</CardTitle>
            <CardDescription>{t('career.exploration')}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {CAREER_CLUSTERS.map((cluster, i) => (
            <motion.button
              key={cluster.key}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setSelectedCluster(selectedCluster === cluster.key ? null : cluster.key)}
              className={`relative p-4 rounded-xl border-2 text-left transition-all overflow-hidden ${
                selectedCluster === cluster.key
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
                  : 'border-transparent bg-muted/50 hover:border-emerald-200 dark:hover:border-emerald-800'
              }`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${cluster.gradient} opacity-5`} />
              <cluster.icon className="w-8 h-8 mb-2" style={{ color: cluster.color }} />
              <h3 className="font-semibold text-sm">{t(`career.cluster_${cluster.key.toLowerCase()}`)}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {CAREER_PROFILES.filter(c => c.cluster === cluster.key).length} {t('career.profiles')}
              </p>
            </motion.button>
          ))}
        </div>

        <AnimatePresence>
          {selectedCluster && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 space-y-3"
            >
              <Separator />
              <h4 className="font-semibold text-sm mt-3">
                {t('career.profiles')} — {t(`career.cluster_${selectedCluster.toLowerCase()}`)}
              </h4>
              {CAREER_PROFILES.filter(c => c.cluster === selectedCluster).map((career, i) => (
                <motion.div
                  key={career.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <button
                    onClick={() => setSelectedCareer(selectedCareer?.name === career.name ? null : career)}
                    className="w-full text-left p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{career.name}</span>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs text-muted-foreground">{career.salary}</span>
                      </div>
                    </div>
                  </button>

                  <AnimatePresence>
                    {selectedCareer?.name === career.name && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 space-y-3"
                      >
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">{t('career.requirements')}</p>
                          <div className="flex flex-wrap gap-1">
                            {career.requirements.map(r => (
                              <Badge key={r} variant="secondary" className="text-xs">{r}</Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">{t('career.subject_recommendations')}</p>
                          <div className="flex flex-wrap gap-1">
                            {career.subjects.map(s => (
                              <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">{t('career.skills_needed')}</p>
                          <div className="flex flex-wrap gap-1">
                            {career.skills.map(s => (
                              <Badge key={s} className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">{s}</Badge>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );

  // ── Render Career Portfolio ──────────────────────────────────────────
  const renderPortfolio = () => {
    if (!profile) {
      return (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
              <Briefcase className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{t('career.no_profile')}</h3>
            <p className="text-muted-foreground mb-4">{t('career.no_profile_desc')}</p>
            <Button onClick={createProfile} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              {t('career.create_profile')}
            </Button>
          </CardContent>
        </Card>
      );
    }

    const interests = profileForm.interests;
    const strengths = profileForm.strengths;
    const workExps = profile.workExperiences ? JSON.parse(profile.workExperiences) : [];
    const volunteerExps = profile.volunteerExps ? JSON.parse(profile.volunteerExps) : [];
    const certifications = profile.certifications ? JSON.parse(profile.certifications) : [];

    return (
      <div className="space-y-4">
        {/* Profile Card */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40">
                  <GraduationCap className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <CardTitle>{t('career.profile_title')}</CardTitle>
                  <CardDescription>{t('career.profile_subtitle')}</CardDescription>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowProfileDialog(true)}>
                <Edit3 className="w-4 h-4 mr-2" />
                {t('career.edit_profile')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Interests */}
              <div className="p-4 rounded-xl bg-muted/50">
                <p className="text-xs font-semibold text-muted-foreground mb-2">{t('career.interests')}</p>
                <div className="flex flex-wrap gap-2">
                  {interests.length > 0 ? interests.map(i => (
                    <Badge key={i} className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">{i}</Badge>
                  )) : <span className="text-sm text-muted-foreground">—</span>}
                </div>
              </div>
              {/* Strengths */}
              <div className="p-4 rounded-xl bg-muted/50">
                <p className="text-xs font-semibold text-muted-foreground mb-2">{t('career.strengths')}</p>
                <div className="flex flex-wrap gap-2">
                  {strengths.length > 0 ? strengths.map(s => (
                    <Badge key={s} variant="secondary">{s}</Badge>
                  )) : <span className="text-sm text-muted-foreground">—</span>}
                </div>
              </div>
              {/* Career Cluster */}
              <div className="p-4 rounded-xl bg-muted/50">
                <p className="text-xs font-semibold text-muted-foreground mb-2">{t('career.career_cluster')}</p>
                <p className="font-medium">{profile.careerCluster ? t(`career.cluster_${profile.careerCluster.toLowerCase()}`) : '—'}</p>
              </div>
              {/* Education Path */}
              <div className="p-4 rounded-xl bg-muted/50">
                <p className="text-xs font-semibold text-muted-foreground mb-2">{t('career.education_path')}</p>
                <p className="font-medium">{profile.educationPath ? t(`career.path_${profile.educationPath.toLowerCase()}`) : '—'}</p>
              </div>
              {/* Desired Career */}
              <div className="p-4 rounded-xl bg-muted/50 md:col-span-2">
                <p className="text-xs font-semibold text-muted-foreground mb-2">{t('career.desired_career')}</p>
                <p className="font-medium">{profile.desiredCareer || '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Work Experience */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t('career.work_experience')}</CardTitle>
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-1" />
                {t('career.add_work_exp')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {workExps.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t('career.no_profile_desc')}</p>
            ) : (
              <div className="space-y-3">
                {workExps.map((exp: { company: string; role: string; startDate: string; endDate: string }, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                    <Briefcase className="w-5 h-5 text-emerald-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">{exp.role}</p>
                      <p className="text-xs text-muted-foreground">{exp.company} · {exp.startDate} – {exp.endDate || 'Heute'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Volunteer Experience */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t('career.volunteer_experience')}</CardTitle>
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-1" />
                {t('career.add_volunteer')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {volunteerExps.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t('career.no_profile_desc')}</p>
            ) : (
              <div className="space-y-3">
                {volunteerExps.map((exp: { organization: string; role: string; startDate: string; endDate: string }, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                    <Heart className="w-5 h-5 text-rose-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">{exp.role}</p>
                      <p className="text-xs text-muted-foreground">{exp.organization} · {exp.startDate} – {exp.endDate || 'Heute'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Certifications */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t('career.certifications')}</CardTitle>
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-1" />
                {t('career.add_certification')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {certifications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t('career.no_profile_desc')}</p>
            ) : (
              <div className="space-y-3">
                {certifications.map((cert: { name: string; date: string; issuer: string }, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                    <Award className="w-5 h-5 text-amber-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">{cert.name}</p>
                      <p className="text-xs text-muted-foreground">{cert.issuer} · {cert.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // ── Render Goals ─────────────────────────────────────────────────────
  const renderGoals = () => {
    const activeGoals = goals.filter(g => g.status === 'active');
    const completedGoals = goals.filter(g => g.status === 'completed');

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{t('career.goal_title')}</h3>
          <Button onClick={() => { setEditingGoal(null); setGoalForm({ title: '', description: '', category: 'short_term', targetDate: '' }); setShowGoalDialog(true); }} className="bg-emerald-600 hover:bg-emerald-700" size="sm">
            <Plus className="w-4 h-4 mr-1" />
            {t('career.add_goal')}
          </Button>
        </div>

        {goals.length === 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
                <Target className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{t('career.no_goals')}</h3>
              <p className="text-muted-foreground mb-4">{t('career.no_goals_desc')}</p>
              <Button onClick={() => { setEditingGoal(null); setGoalForm({ title: '', description: '', category: 'short_term', targetDate: '' }); setShowGoalDialog(true); }} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-2" />
                {t('career.add_goal')}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Active Goals */}
        {activeGoals.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground">{t('career.status_active')}</h4>
            {activeGoals.map((goal, i) => (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm">{goal.title}</h4>
                          <Badge variant="secondary" className="text-xs">
                            {t(`career.goal_${goal.category}`)}
                          </Badge>
                        </div>
                        {goal.description && (
                          <p className="text-xs text-muted-foreground">{goal.description}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => {
                          setEditingGoal(goal);
                          setGoalForm({
                            title: goal.title,
                            description: goal.description || '',
                            category: goal.category,
                            targetDate: goal.targetDate ? new Date(goal.targetDate).toISOString().split('T')[0] : '',
                          });
                          setShowGoalDialog(true);
                        }}>
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteGoal(goal.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-3">
                      <Progress value={goal.progress} className="flex-1 h-2" />
                      <span className="text-xs font-medium text-muted-foreground w-10 text-right">{goal.progress}%</span>
                    </div>
                    {goal.targetDate && (
                      <div className="flex items-center gap-1 mt-2">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {new Date(goal.targetDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {/* Milestones */}
                    {goal.milestones && (() => {
                      try {
                        const milestones = JSON.parse(goal.milestones);
                        if (Array.isArray(milestones) && milestones.length > 0) {
                          return (
                            <div className="mt-3 space-y-1">
                              <p className="text-xs font-semibold text-muted-foreground">{t('career.milestones')}</p>
                              {milestones.map((m: { title: string; completed: boolean }, j: number) => (
                                <div key={j} className="flex items-center gap-2">
                                  {m.completed ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                  ) : (
                                    <div className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground/30" />
                                  )}
                                  <span className={`text-xs ${m.completed ? 'line-through text-muted-foreground' : ''}`}>{m.title}</span>
                                </div>
                              ))}
                            </div>
                          );
                        }
                      } catch { /* ignore */ }
                      return null;
                    })()}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Completed Goals */}
        {completedGoals.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground">{t('career.status_completed')}</h4>
            {completedGoals.map(goal => (
              <Card key={goal.id} className="border-0 shadow-sm opacity-75">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <div className="flex-1">
                      <h4 className="font-medium text-sm line-through">{goal.title}</h4>
                      <Badge variant="secondary" className="text-xs mt-1">{t(`career.goal_${goal.category}`)}</Badge>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => deleteGoal(goal.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ── Render Appointments ──────────────────────────────────────────────
  const renderAppointments = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{t('career.appointments')}</h3>
        <Button onClick={() => { setAppointmentForm({ date: '', duration: '30', type: 'guidance', notes: '' }); setShowAppointmentDialog(true); }} className="bg-emerald-600 hover:bg-emerald-700" size="sm">
          <Plus className="w-4 h-4 mr-1" />
          {t('career.schedule_appointment')}
        </Button>
      </div>

      {/* Upcoming */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-muted-foreground">{t('career.upcoming_appointments')}</h4>
        {upcomingAppointments.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-8 text-center">
              <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{t('career.no_appointments')}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('career.no_appointments_desc')}</p>
            </CardContent>
          </Card>
        ) : (
          upcomingAppointments.map((appt, i) => (
            <motion.div
              key={appt.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40">
                        <Calendar className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {new Date(appt.date).toLocaleDateString()} · {appt.duration} {t('career.minutes')}
                        </p>
                        <Badge variant="secondary" className="text-xs mt-1">
                          {t(`career.appointment_type_${appt.type}`)}
                        </Badge>
                        {appt.counselor && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {t('career.counselor')}: {appt.counselor.firstName} {appt.counselor.lastName}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => updateAppointmentStatus(appt.id, 'completed')}>
                        <Check className="w-4 h-4 text-emerald-600" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => updateAppointmentStatus(appt.id, 'cancelled')}>
                        <X className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  {appt.notes && (
                    <p className="text-xs text-muted-foreground mt-2 pl-10">{appt.notes}</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Past */}
      {pastAppointments.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground">{t('career.past_appointments')}</h4>
          <ScrollArea className="max-h-64">
            {pastAppointments.map(appt => (
              <Card key={appt.id} className="border-0 shadow-sm mb-2 opacity-70">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-muted">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{new Date(appt.date).toLocaleDateString()}</p>
                      <Badge variant={appt.status === 'completed' ? 'secondary' : 'destructive'} className="text-xs">
                        {t(`career.status_${appt.status}`)}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => deleteAppointment(appt.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </ScrollArea>
        </div>
      )}
    </div>
  );

  // ── Render Admin Statistics ──────────────────────────────────────────
  const renderAdminStats = () => {
    if (!stats || (role !== 'ADMIN' && role !== 'VICE_PRINCIPAL' && role !== 'TEACHER')) return null;

    return (
      <div className="space-y-4">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
              </div>
              <CardTitle>{t('career.cluster_distribution')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {clusterChartData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={clusterChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {clusterChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">{t('career.no_profile_desc')}</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/40">
                <GraduationCap className="w-5 h-5 text-teal-600" />
              </div>
              <CardTitle>{t('career.path_distribution')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {pathChartData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pathChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">{t('career.no_profile_desc')}</p>
            )}
          </CardContent>
        </Card>

        {/* Goal stats */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{t('career.total_goals')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40">
                <p className="text-2xl font-bold text-emerald-600"><AnimatedCounter value={stats.goalStats.total} /></p>
                <p className="text-xs text-muted-foreground">{t('career.total_goals')}</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40">
                <p className="text-2xl font-bold text-teal-600"><AnimatedCounter value={stats.goalStats.active} /></p>
                <p className="text-xs text-muted-foreground">{t('career.status_active')}</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/40">
                <p className="text-2xl font-bold text-cyan-600"><AnimatedCounter value={stats.goalStats.completed} /></p>
                <p className="text-xs text-muted-foreground">{t('career.status_completed')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // ── Render Planning Tab ──────────────────────────────────────────────
  const renderPlanning = () => (
    <div className="space-y-4">
      {renderGoals()}
      <Separator />
      {/* Scholarship Finder placeholder */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40">
              <Star className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-base">{t('career.scholarship_finder')}</CardTitle>
              <CardDescription>{t('career.important_dates')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: 'Deutschlandstipendium', deadline: '2025-07-15', amount: '€300/Monat' },
              { name: 'Bafög', deadline: 'Rolling', amount: 'Bis €934/Monat' },
              { name: 'Erasmus+ Stipendium', deadline: '2025-03-01', amount: '€450-€550/Monat' },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Star className="w-4 h-4 text-amber-500" />
                  <div>
                    <p className="font-medium text-sm">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.amount}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">{s.deadline}</Badge>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Application Tracker placeholder */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <CardTitle className="text-base">{t('career.application_tracker')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            {t('career.no_profile_desc')}
          </p>
        </CardContent>
      </Card>
    </div>
  );

  // ── Render Dialogs ───────────────────────────────────────────────────
  const renderGoalDialog = () => (
    <Dialog open={showGoalDialog} onOpenChange={setShowGoalDialog}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editingGoal ? t('action.edit') : t('career.add_goal')}</DialogTitle>
          <DialogDescription>{t('career.goal_subtitle')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t('career.name')}</Label>
            <Input value={goalForm.title} onChange={e => setGoalForm(p => ({ ...p, title: e.target.value }))} placeholder={t('career.goal_title')} />
          </div>
          <div>
            <Label>{t('career.type')}</Label>
            <Select value={goalForm.category} onValueChange={v => setGoalForm(p => ({ ...p, category: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="short_term">{t('career.goal_short_term')}</SelectItem>
                <SelectItem value="long_term">{t('career.goal_long_term')}</SelectItem>
                <SelectItem value="academic">{t('career.goal_academic')}</SelectItem>
                <SelectItem value="professional">{t('career.goal_professional')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('career.target_date')}</Label>
            <Input type="date" value={goalForm.targetDate} onChange={e => setGoalForm(p => ({ ...p, targetDate: e.target.value }))} />
          </div>
          <div>
            <Label>{t('career.appointment_notes')}</Label>
            <Textarea value={goalForm.description} onChange={e => setGoalForm(p => ({ ...p, description: e.target.value }))} placeholder={t('career.goal_subtitle')} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowGoalDialog(false)}>{t('action.cancel')}</Button>
          <Button onClick={saveGoal} className="bg-emerald-600 hover:bg-emerald-700" disabled={!goalForm.title}>
            <Save className="w-4 h-4 mr-2" />
            {t('action.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const renderAppointmentDialog = () => (
    <Dialog open={showAppointmentDialog} onOpenChange={setShowAppointmentDialog}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('career.schedule_appointment')}</DialogTitle>
          <DialogDescription>{t('career.appointment_subtitle')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t('career.date')}</Label>
            <Input type="datetime-local" value={appointmentForm.date} onChange={e => setAppointmentForm(p => ({ ...p, date: e.target.value }))} />
          </div>
          <div>
            <Label>{t('career.duration')}</Label>
            <Select value={appointmentForm.duration} onValueChange={v => setAppointmentForm(p => ({ ...p, duration: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 {t('career.minutes')}</SelectItem>
                <SelectItem value="30">30 {t('career.minutes')}</SelectItem>
                <SelectItem value="45">45 {t('career.minutes')}</SelectItem>
                <SelectItem value="60">60 {t('career.minutes')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('career.type')}</Label>
            <Select value={appointmentForm.type} onValueChange={v => setAppointmentForm(p => ({ ...p, type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="guidance">{t('career.appointment_type_guidance')}</SelectItem>
                <SelectItem value="career">{t('career.appointment_type_career')}</SelectItem>
                <SelectItem value="academic">{t('career.appointment_type_academic')}</SelectItem>
                <SelectItem value="college">{t('career.appointment_type_college')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('career.appointment_notes')}</Label>
            <Textarea value={appointmentForm.notes} onChange={e => setAppointmentForm(p => ({ ...p, notes: e.target.value }))} placeholder={t('career.appointment_notes')} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowAppointmentDialog(false)}>{t('action.cancel')}</Button>
          <Button onClick={saveAppointment} className="bg-emerald-600 hover:bg-emerald-700" disabled={!appointmentForm.date}>
            <Save className="w-4 h-4 mr-2" />
            {t('action.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const renderProfileDialog = () => (
    <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('career.edit_profile')}</DialogTitle>
          <DialogDescription>{t('career.profile_subtitle')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t('career.interests')}</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {QUIZ_QUESTIONS.map(q => (
                <Badge
                  key={q.id}
                  variant={profileForm.interests.includes(q.id) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => {
                    setProfileForm(prev => ({
                      ...prev,
                      interests: prev.interests.includes(q.id)
                        ? prev.interests.filter((i: string) => i !== q.id)
                        : [...prev.interests, q.id],
                    }));
                  }}
                >
                  {t(q.labelKey)}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <Label>{t('career.strengths')}</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {['Mathematik', 'Sprachen', 'Kommunikation', 'Teamarbeit', 'Kreativität', 'Organisation', 'Analyse', 'Technik'].map(s => (
                <Badge
                  key={s}
                  variant={profileForm.strengths.includes(s) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => {
                    setProfileForm(prev => ({
                      ...prev,
                      strengths: prev.strengths.includes(s)
                        ? prev.strengths.filter((st: string) => st !== s)
                        : [...prev.strengths, s],
                    }));
                  }}
                >
                  {s}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <Label>{t('career.career_cluster')}</Label>
            <Select value={profileForm.careerCluster} onValueChange={v => setProfileForm(p => ({ ...p, careerCluster: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CAREER_CLUSTERS.map(c => (
                  <SelectItem key={c.key} value={c.key}>{t(`career.cluster_${c.key.toLowerCase()}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('career.education_path')}</Label>
            <Select value={profileForm.educationPath} onValueChange={v => setProfileForm(p => ({ ...p, educationPath: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EDUCATION_PATHS.map(p => (
                  <SelectItem key={p.key} value={p.key}>{t(p.labelKey)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('career.desired_career')}</Label>
            <Input value={profileForm.desiredCareer} onChange={e => setProfileForm(p => ({ ...p, desiredCareer: e.target.value }))} placeholder={t('career.desired_career')} />
          </div>
          <div>
            <Label>{t('career.appointment_notes')}</Label>
            <Textarea value={profileForm.notes} onChange={e => setProfileForm(p => ({ ...p, notes: e.target.value }))} placeholder={t('career.appointment_notes')} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowProfileDialog(false)}>{t('action.cancel')}</Button>
          <Button onClick={saveProfile} className="bg-emerald-600 hover:bg-emerald-700">
            <Save className="w-4 h-4 mr-2" />
            {t('career.save_profile')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // ── Career Detail Dialog ─────────────────────────────────────────────
  const renderCareerDetailDialog = () => (
    <Dialog open={!!selectedCareer} onOpenChange={() => setSelectedCareer(null)}>
      <DialogContent className="max-w-md">
        {selectedCareer && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-emerald-600" />
                {selectedCareer.name}
              </DialogTitle>
              <DialogDescription>
                <Badge variant="secondary" className="mt-1">
                  {t(`career.cluster_${selectedCareer.cluster.toLowerCase()}`)}
                </Badge>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium">{t('career.salary_range')}: {selectedCareer.salary}</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">{t('career.requirements')}</p>
                <div className="flex flex-wrap gap-1">
                  {selectedCareer.requirements.map(r => (
                    <Badge key={r} variant="secondary" className="text-xs">{r}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">{t('career.subject_recommendations')}</p>
                <div className="flex flex-wrap gap-1">
                  {selectedCareer.subjects.map(s => (
                    <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">{t('career.skills_needed')}</p>
                <div className="flex flex-wrap gap-1">
                  {selectedCareer.skills.map(s => (
                    <Badge key={s} className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">{s}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );

  // ── Main Render ──────────────────────────────────────────────────────
  const isAdmin = role === 'ADMIN' || role === 'VICE_PRINCIPAL';
  const isStudent = role === 'STUDENT';
  const isParent = role === 'PARENT';

  return (
    <div className="space-y-6 p-4 md:p-6">
      {renderHeader()}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {renderStatCards()}
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="exploration" className="flex-1 min-w-[120px]">
            <Compass className="w-4 h-4 mr-2" />
            {t('career.exploration')}
          </TabsTrigger>
          <TabsTrigger value="portfolio" className="flex-1 min-w-[120px]">
            <Briefcase className="w-4 h-4 mr-2" />
            {t('career.portfolio')}
          </TabsTrigger>
          <TabsTrigger value="planning" className="flex-1 min-w-[120px]">
            <Target className="w-4 h-4 mr-2" />
            {t('career.planning')}
          </TabsTrigger>
          <TabsTrigger value="appointments" className="flex-1 min-w-[120px]">
            <Calendar className="w-4 h-4 mr-2" />
            {t('career.appointments')}
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="statistics" className="flex-1 min-w-[120px]">
              <BarChart3 className="w-4 h-4 mr-2" />
              {t('career.statistics')}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="exploration" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {renderQuiz()}
            {renderClusters()}
          </div>
        </TabsContent>

        <TabsContent value="portfolio" className="mt-4">
          {renderPortfolio()}
        </TabsContent>

        <TabsContent value="planning" className="mt-4">
          {renderPlanning()}
        </TabsContent>

        <TabsContent value="appointments" className="mt-4">
          {renderAppointments()}
        </TabsContent>

        {isAdmin && (
          <TabsContent value="statistics" className="mt-4">
            {renderAdminStats()}
          </TabsContent>
        )}
      </Tabs>

      {/* Dialogs */}
      {renderGoalDialog()}
      {renderAppointmentDialog()}
      {renderProfileDialog()}
      {renderCareerDetailDialog()}
    </div>
  );
}
