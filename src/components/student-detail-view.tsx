'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  ArrowLeft, User, Calendar, School, Hash, FileText, ClipboardCheck,
  Calculator, Flower2, BookOpen, GraduationCap, TrendingUp, Award,
  Printer, ChevronRight, Sparkles, MessageSquare, Grid3X3, Trophy, Flag, Zap,
  Rocket, Target, PenLine, Pencil, Home, ClipboardList, Star, BarChart3,
  LucideIcon, Download, FileSpreadsheet, FileDown, Heart, Users as UsersIcon,
  Eye, Plus, Trash2, Clock, CheckCircle2, XCircle, SlidersHorizontal, Lightbulb,
  Phone, PhoneCall, MapPin, ShieldAlert, UserCheck, AlertCircle, Globe,
  Bus, Car, Bike, Footprints, Train, Truck, Droplets, Pill, Stethoscope,
  EyeOff, Shield, Activity, HeartPulse, Syringe,
  QrCode, CalendarCheck, Leaf,
  Camera, Upload,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Tooltip as ShadTooltip,
  TooltipContent as ShadTooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAppStore, type CurrentUser } from '@/lib/store';
import { t } from '@/lib/i18n';
import StudentAvatar from '@/components/student-avatar';
import { fetchStudentDetail, getReportPdfUrl, type StudentDetailData, fetchParentLinks, type ParentStudentLinkData, apiGet, apiPost, apiPut, apiDelete, fetchBadgeProgress, type BadgeProgressData, fetchStudentBadges, type StudentBadgeData, type BadgeData } from '@/lib/api';
import { generateQRCodeSync, downloadQRCode, type QRCodeData } from '@/lib/qrcode';
import { toast } from 'sonner';
import TeacherNotesSection from './teacher-notes-section';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';

// ─── Self-Assessment & Learning Goal Types ────────────────────────────────
interface PeerAssessmentData {
  id: string;
  schoolId: string;
  assessorId: string;
  assessedId: string;
  competencyId: string | null;
  classGroupId: string | null;
  assessmentType: string;
  level: number | null;
  comment: string | null;
  rubricId: string | null;
  isAnonymous: boolean;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  assessor: { id: string; firstName: string; lastName: string };
  assessed: { id: string; firstName: string; lastName: string };
  competency: { id: string; code: string; title: string } | null;
  classGroup: { id: string; name: string } | null;
  rubric: { id: string; title: string } | null;
}

interface EmergencyContactData {
  id: string;
  schoolId: string;
  studentId: string;
  name: string;
  relationship: string;
  phone: string;
  phoneAlt: string | null;
  email: string | null;
  address: string | null;
  isPrimary: boolean;
  priority: number;
  notes: string | null;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  student: { id: string; firstName: string; lastName: string };
}

interface SelfAssessmentData {
  id: string;
  schoolId: string;
  studentId: string;
  competencyId: string;
  classGroupId: string | null;
  selfLevel: number;
  confidence: number | null;
  reflection: string | null;
  evidence: string | null;
  goalId: string | null;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  student: { id: string; firstName: string; lastName: string };
  competency: { id: string; code: string; title: string };
  classGroup: { id: string; name: string } | null;
  goal: { id: string; title: string; status: string } | null;
}

interface LearningGoalData {
  id: string;
  schoolId: string;
  studentId: string;
  competencyId: string | null;
  title: string;
  description: string | null;
  targetLevel: number | null;
  currentLevel: number | null;
  deadline: string | null;
  status: string;
  progress: number;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  student: { id: string; firstName: string; lastName: string };
  competency: { id: string; code: string; title: string } | null;
  selfAssessments: { id: string; selfLevel: number; confidence: number | null; createdAt: string }[];
}

// ─── Journey Timeline Time Filter State ─────────────────────────────────
type JourneyTimeRange = '30' | '90' | 'all';

function useJourneyTimeRange() {
  const [range, setRange] = React.useState<JourneyTimeRange>('all');
  return [range, setRange] as const;
}

function JourneyTimeFilter({ range, setRange }: { range: JourneyTimeRange; setRange: (v: JourneyTimeRange) => void }) {
  const options: { value: JourneyTimeRange; labelKey: string }[] = [
    { value: '30', labelKey: 'student.journey_last_30' },
    { value: '90', labelKey: 'student.journey_last_90' },
    { value: 'all', labelKey: 'student.journey_all' },
  ];
  return (
    <div className="flex gap-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setRange(opt.value)}
          className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all ${
            range === opt.value
              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50'
          }`}
        >
          {t(opt.labelKey)}
        </button>
      ))}
    </div>
  );
}

// ─── Journey Timeline Types ─────────────────────────────────────────────
interface MilestoneItem {
  key: string;
  date: string;
  type: 'achieved' | 'started' | 'above_avg' | 'grade';
  title: string;
  desc: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}

function JourneyTimeline({
  progressEntries,
  assessmentResults,
  computedGrades,
  reports,
  timeRange,
}: {
  progressEntries: StudentDetailData['progressEntries'];
  assessmentResults: StudentDetailData['assessmentResults'];
  computedGrades: StudentDetailData['computedGrades'];
  reports: StudentDetailData['reports'];
  timeRange: JourneyTimeRange;
}) {

  // Build milestones from data
  const milestones = React.useMemo(() => {
    const items: MilestoneItem[] = [];

    // Progress entries with mastery ≥ 3.5 → competency achieved
    const seenCategories = new Set<string>();
    for (const e of progressEntries) {
      const cat = e.competency.category?.name ?? '';
      // First entry in a new category → started new area
      if (cat && !seenCategories.has(cat)) {
        seenCategories.add(cat);
        items.push({
          key: `started-${e.id}`,
          date: e.date,
          type: 'started',
          title: e.competency.category.name,
          desc: t('student.journey_started'),
          icon: Rocket,
          color: 'bg-teal-500',
          bg: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-300',
        });
      }
      // Mastery ≥ 3.5 → competency achieved
      if (e.masteryLevelValue >= 3.5) {
        items.push({
          key: `achieved-${e.id}`,
          date: e.date,
          type: 'achieved',
          title: e.competency.title,
          desc: t('student.journey_achieved'),
          icon: Target,
          color: 'bg-emerald-500',
          bg: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300',
        });
      }
    }

    // Assessment results above average → above average performance
    if (assessmentResults.length > 0) {
      const scoresWithMax = assessmentResults.filter((r) => r.score !== null && r.assessment.maxScore);
      if (scoresWithMax.length > 0) {
        const avgRatio = scoresWithMax.reduce((s, r) => s + (r.score! / r.assessment.maxScore!), 0) / scoresWithMax.length;
        for (const r of scoresWithMax) {
          if (r.score !== null && r.assessment.maxScore && (r.score / r.assessment.maxScore) > avgRatio) {
            items.push({
              key: `above-${r.id}`,
              date: r.assessment.date,
              type: 'above_avg',
              title: r.assessment.title,
              desc: t('student.journey_above_avg'),
              icon: Sparkles,
              color: 'bg-amber-500',
              bg: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300',
            });
          }
        }
      }
    }

    // Grade computation milestones
    for (const g of computedGrades) {
      items.push({
        key: `grade-${g.id}`,
        date: g.period,
        type: 'grade',
        title: `${g.subject.name} · ${g.period}`,
        desc: `${t('student.journey_grade')} — ${(g.overriddenValue ?? g.computedValue).toFixed(1)}`,
        icon: Calculator,
        color: 'bg-violet-500',
        bg: 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300',
      });
    }

    // Sort by date descending
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Filter by time range
    if (timeRange !== 'all') {
      const days = parseInt(timeRange);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      return items.filter((item) => {
        const d = new Date(item.date);
        return d >= cutoff || isNaN(d.getTime());
      });
    }
    return items.slice(0, 20);
  }, [progressEntries, assessmentResults, computedGrades, timeRange]);

  if (milestones.length === 0) {
    return (
      <div className="text-center py-8">
        <Flag className="h-8 w-8 text-amber-400 dark:text-amber-500 mx-auto mb-2" />
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('student_detail.no_data')}</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-0 max-h-96 overflow-y-auto scrollbar-education">
      <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gradient-to-b from-emerald-400 via-amber-400 to-violet-400 dark:from-emerald-600 dark:via-amber-600 dark:to-violet-600" />
      {milestones.map((m, i) => (
        <motion.div
          key={m.key}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04 }}
          className="relative flex items-start gap-3 pl-6 py-2.5 group"
        >
          <div className={`absolute left-2.5 top-3.5 w-3 h-3 rounded-full ring-2 ring-white dark:ring-gray-900 ${m.color} group-hover:scale-125 transition-transform`} style={{ zIndex: 1 }} />
          <div className="flex-1 min-w-0 p-3 rounded-lg bg-gradient-to-r from-gray-50 to-transparent dark:from-gray-800/40 dark:to-transparent border border-gray-100/50 dark:border-gray-700/20">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className={`flex items-center justify-center w-5 h-5 rounded-md ${m.bg}`}>
                  <m.icon className="h-3 w-3" />
                </div>
                <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{m.title}</p>
              </div>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0">{new Date(m.date).toLocaleDateString()}</span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">{m.desc}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

const PETAL_COLORS = [
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#8b5cf6',
  '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#84cc16',
];

const masteryBadge = (level: number) => {
  if (level <= 0) return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
  if (level <= 1) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  if (level <= 2) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  if (level <= 3) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
  return 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300';
};

// Icon map for badge icons
const iconMap: Record<string, LucideIcon> = {
  CalendarCheck, Award, TrendingUp, Star, BookOpen, Pencil, ClipboardCheck,
  UsersIcon, Target, Leaf, Trophy, Zap, Rocket, Heart, GraduationCap,
  CheckCircle2, Shield, Activity, Flower2, Flag, Lightbulb,
};

const gradeColor = (value: number) => {
  if (value <= 2) return 'text-emerald-600 dark:text-emerald-400';
  if (value <= 4) return 'text-amber-600 dark:text-amber-400';
  return 'text-rose-600 dark:text-rose-400';
};

const assessmentTypeIcon: Record<string, LucideIcon> = {
  TEST: FileText,
  ORAL: Pencil,
  PROJECT: Target,
  HOMEWORK: Home,
  OTHER: ClipboardList,
};

function calcAge(dob: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
}

// ─── CSV Export Helper ───────────────────────────────────────────────────
function exportStudentCsv(data: StudentDetailData) {
  const { student, progressEntries, assessmentResults, computedGrades, flowers, stats } = data;
  const studentName = `${student.firstName} ${student.lastName}`;
  const primaryClass = student.enrollments[0]?.classGroup.name ?? '';
  const schoolName = student.school?.name ?? '';
  const rows: string[] = [];

  // Header section
  rows.push('CompetenceTrack - Student Export');
  rows.push(`Student,${studentName}`);
  rows.push(`Class,${primaryClass}`);
  rows.push(`School,${schoolName}`);
  rows.push(`Date of Birth,${student.dateOfBirth ?? ''}`);
  rows.push(`External ID,${student.externalId ?? ''}`);
  rows.push('');
  rows.push('Quick Stats');
  rows.push(`Total Progress Entries,${stats.totalProgressEntries}`);
  rows.push(`Average Mastery,${stats.averageMastery.toFixed(2)}`);
  rows.push(`Latest Grade,${stats.latestGrade ? stats.latestGrade.value.toFixed(1) : ''}`);
  rows.push(`Total Reports,${stats.totalReports}`);
  rows.push(`Total Assessments,${stats.totalAssessments}`);
  rows.push('');

  // Competence flower summary
  rows.push('Competence Flower Summary');
  rows.push('Subject,Category,Average Mastery,Assessed Competencies,Total Competencies');
  for (const flower of flowers) {
    for (const cat of flower.categories) {
      rows.push(`"${flower.subjectName}","${cat.categoryName}",${cat.averageMasteryLevel.toFixed(2)},${cat.assessedCompetencyCount},${cat.competencyCount}`);
    }
  }
  rows.push('');

  // Progress entries
  rows.push('Progress Entries');
  rows.push('Date,Competency Code,Competency Title,Category,Mastery Level,Class,Teacher,Note');
  for (const e of progressEntries) {
    const note = (e.note ?? '').replace(/"/g, '""');
    rows.push(`${e.date},"${e.competency.code}","${e.competency.title}","${e.competency.category?.name ?? ''}",${e.masteryLevelValue},"${e.classGroup.name}","${e.teacher.firstName} ${e.teacher.lastName}","${note}"`);
  }
  rows.push('');

  // Assessment results
  rows.push('Assessment Results');
  rows.push('Date,Assessment Title,Subject,Type,Score,Max Score,Mastery Level,Note');
  for (const r of assessmentResults) {
    const note = (r.note ?? '').replace(/"/g, '""');
    rows.push(`${r.assessment.date},"${r.assessment.title}","${r.assessment.subject.name}","${r.assessment.type}",${r.score ?? ''},${r.assessment.maxScore ?? ''},${r.masteryLevelValue ?? ''},"${note}"`);
  }
  rows.push('');

  // Computed grades
  rows.push('Computed Grades');
  rows.push('Subject,Period,Computed Value,Overridden Value,Finalized,Class,School Year');
  for (const g of computedGrades) {
    rows.push(`"${g.subject.name}","${g.period}",${g.computedValue.toFixed(2)},${g.overriddenValue !== null ? g.overriddenValue.toFixed(2) : ''},${g.isFinalized ? 'Yes' : 'No'},"${g.classGroup.name}","${g.schoolYear.label}"`);
  }
  rows.push('');

  const csvContent = rows.join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${studentName.replace(/\s+/g, '_')}_export.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function StudentDetailView() {
  const currentStudentId = useAppStore((s) => s.currentStudentId);
  const navigateBack = useAppStore((s) => s.navigateBack);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const currentUser = useAppStore((s) => s.currentUser);

  const isStudentSelf = currentUser?.role === 'STUDENT';
  const isParent = currentUser?.role === 'PARENT';
  const [parentLinks, setParentLinks] = useState<ParentStudentLinkData[]>([]);

  const [data, setData] = useState<StudentDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFlowerSubjectId, setSelectedFlowerSubjectId] = useState<string>('');
  const [timeRange, setTimeRange] = useState<JourneyTimeRange>('all');

  // Self-Assessment & Learning Goals state
  const [selfAssessments, setSelfAssessments] = useState<SelfAssessmentData[]>([]);
  const [learningGoals, setLearningGoals] = useState<LearningGoalData[]>([]);
  const [saDialogOpen, setSaDialogOpen] = useState(false);
  const [saEditId, setSaEditId] = useState<string | null>(null);
  const [saForm, setSaForm] = useState({ competencyId: '', selfLevel: 3, confidence: 3, reflection: '', evidence: '', goalId: '' });
  const [lgDialogOpen, setLgDialogOpen] = useState(false);
  const [lgEditId, setLgEditId] = useState<string | null>(null);
  const [lgForm, setLgForm] = useState({ title: '', description: '', competencyId: '', targetLevel: 4, currentLevel: 1, deadline: '', status: 'active', progress: 0 });
  const [goalCelebration, setGoalCelebration] = useState<string | null>(null);

  // Peer Assessment & Emergency Contacts state
  const [peerAssessments, setPeerAssessments] = useState<PeerAssessmentData[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContactData[]>([]);
  const [paDialogOpen, setPaDialogOpen] = useState(false);
  const [paForm, setPaForm] = useState({ assessmentType: 'competency', competencyId: '', level: 3, comment: '', isAnonymous: false });
  const [ecDialogOpen, setEcDialogOpen] = useState(false);
  const [ecEditId, setEcEditId] = useState<string | null>(null);
  const [ecForm, setEcForm] = useState({ name: '', relationship: 'mother', phone: '', phoneAlt: '', email: '', address: '', isPrimary: false, priority: 1, notes: '' });

  // Transportation state
  interface TransportData {
    id: string; schoolId: string; studentId: string; transportType: string;
    routeNumber: string | null; stopName: string | null; pickupTime: string | null;
    dropoffTime: string | null; driverName: string | null; driverPhone: string | null;
    distanceKm: number | null; notes: string | null; isDemo: boolean;
    createdAt: string; updatedAt: string; deletedAt: string | null;
    student: { id: string; firstName: string; lastName: string };
  }
  const [transports, setTransports] = useState<TransportData[]>([]);
  const [transportDialogOpen, setTransportDialogOpen] = useState(false);
  const [transportEditId, setTransportEditId] = useState<string | null>(null);
  const [transportForm, setTransportForm] = useState({
    transportType: 'bus', routeNumber: '', stopName: '', pickupTime: '',
    dropoffTime: '', driverName: '', driverPhone: '', distanceKm: '', notes: '',
  });

  // Health Records state
  interface HealthRecordData {
    id: string; schoolId: string; studentId: string; bloodType: string | null;
    allergies: string | null; medications: string | null; conditions: string | null;
    doctorName: string | null; doctorPhone: string | null; insuranceNumber: string | null;
    insuranceProvider: string | null; lastCheckup: string | null; notes: string | null;
    isConfidential: boolean; isDemo: boolean;
    createdAt: string; updatedAt: string; deletedAt: string | null;
    student: { id: string; firstName: string; lastName: string };
  }
  const [healthRecord, setHealthRecord] = useState<HealthRecordData | null>(null);
  const [healthDialogOpen, setHealthDialogOpen] = useState(false);
  const [healthEditId, setHealthEditId] = useState<string | null>(null);
  const [healthForm, setHealthForm] = useState({
    bloodType: '', allergies: '' as string, medications: '' as string,
    conditions: '' as string, doctorName: '', doctorPhone: '',
    insuranceNumber: '', insuranceProvider: '', lastCheckup: '',
    notes: '', isConfidential: true,
  });

  // QR Code & Badge state
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [badgeProgress, setBadgeProgress] = useState<BadgeProgressData[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<StudentBadgeData[]>([]);
  const [badgeDetailDialogOpen, setBadgeDetailDialogOpen] = useState(false);
  const [selectedBadgeDetail, setSelectedBadgeDetail] = useState<BadgeProgressData | null>(null);

  // Avatar upload dialog
  const [avatarUploadOpen, setAvatarUploadOpen] = useState(false);
  const [avatarUrlInput, setAvatarUrlInput] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Load parent links for parent users
  useEffect(() => {
    if (isParent && currentUser?.id) {
      fetchParentLinks(currentUser.id).then(setParentLinks).catch(() => {});
    }
  }, [isParent, currentUser?.id]);

  useEffect(() => {
    if (!currentStudentId) {
      setLoading(false);
      return;
    }
    const studentId = currentStudentId; // capture for closure
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const d = await fetchStudentDetail(studentId);
        if (cancelled) return;
        setData(d);
        if (d.flowers.length > 0) {
          setSelectedFlowerSubjectId(d.flowers[0].subjectId);
        } else {
          setSelectedFlowerSubjectId('');
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : t('error.generic'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [currentStudentId]);

  // Load self-assessments and learning goals
  useEffect(() => {
    if (!currentStudentId || !currentUser?.schoolId) return;
    const schoolId = currentUser.schoolId;
    async function loadSA() {
      try {
        const data = await apiGet<SelfAssessmentData[]>(`/api/self-assessments?schoolId=${schoolId}&studentId=${currentStudentId}`);
        setSelfAssessments(data);
      } catch { /* ignore */ }
    }
    async function loadLG() {
      try {
        const data = await apiGet<LearningGoalData[]>(`/api/learning-goals?schoolId=${schoolId}&studentId=${currentStudentId}`);
        setLearningGoals(data);
      } catch { /* ignore */ }
    }
    loadSA();
    loadLG();
  }, [currentStudentId, currentUser?.schoolId]);

  // Load peer assessments and emergency contacts
  useEffect(() => {
    if (!currentStudentId || !currentUser?.schoolId) return;
    const schoolId = currentUser.schoolId;
    async function loadPA() {
      try {
        const data = await apiGet<PeerAssessmentData[]>(`/api/peer-assessments?schoolId=${schoolId}&assessedId=${currentStudentId}`);
        setPeerAssessments(data);
      } catch { /* ignore */ }
    }
    async function loadEC() {
      try {
        const data = await apiGet<EmergencyContactData[]>(`/api/emergency-contacts?schoolId=${schoolId}&studentId=${currentStudentId}`);
        setEmergencyContacts(data);
      } catch { /* ignore */ }
    }
    loadPA();
    loadEC();
  }, [currentStudentId, currentUser?.schoolId]);

  // Load transportation and health records
  useEffect(() => {
    if (!currentStudentId || !currentUser?.schoolId) return;
    const schoolId = currentUser.schoolId;
    async function loadTransport() {
      try {
        const data = await apiGet<TransportData[]>(`/api/student-transport?schoolId=${schoolId}&studentId=${currentStudentId}`);
        setTransports(data);
      } catch { /* ignore */ }
    }
    async function loadHealth() {
      try {
        const data = await apiGet<HealthRecordData[]>(`/api/health-records?schoolId=${schoolId}&studentId=${currentStudentId}`);
        setHealthRecord(data.length > 0 ? data[0] : null);
      } catch { /* ignore */ }
    }
    loadTransport();
    loadHealth();
  }, [currentStudentId, currentUser?.schoolId]);

  // Load badge progress and earned badges
  useEffect(() => {
    if (!currentStudentId || !currentUser?.schoolId) return;
    const schoolId = currentUser.schoolId;
    async function loadBadges() {
      try {
        const progress = await fetchBadgeProgress(schoolId, currentStudentId!);
        setBadgeProgress(progress);
      } catch { /* ignore */ }
    }
    async function loadEarnedBadges() {
      try {
        const data = await fetchStudentBadges(schoolId, currentStudentId!);
        setEarnedBadges(data);
      } catch { /* ignore */ }
    }
    loadBadges();
    loadEarnedBadges();
  }, [currentStudentId, currentUser?.schoolId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!data || !currentStudentId) {
    return (
      <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
        <CardContent className="py-16 text-center">
          <User className="h-12 w-12 text-emerald-400 dark:text-emerald-500 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">{t('student_detail.no_data')}</p>
          <Button
            variant="outline"
            className="mt-4 rounded-xl"
            onClick={() => navigateBack()}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t('student_detail.back')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { student, progressEntries, assessmentResults, computedGrades, reports, flowers, stats } = data;
  const studentName = `${student.firstName} ${student.lastName}`;
  const age = calcAge(student.dateOfBirth);
  const initials = `${student.firstName[0] ?? ''}${student.lastName[0] ?? ''}`.toUpperCase();
  const primaryClass = student.enrollments[0]?.classGroup;
  const currentFlower = flowers.find((f) => f.subjectId === selectedFlowerSubjectId) ?? null;

  const chartData = currentFlower?.categories.map((cat, i) => ({
    category: cat.categoryName,
    value: cat.averageMasteryLevel > 0 ? cat.averageMasteryLevel : 0.2,
    fill: PETAL_COLORS[i % PETAL_COLORS.length],
  })) ?? [];

  return (
    <div className="space-y-6">
      {/* Back button + Export actions */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <Button
          variant="ghost"
          onClick={() => navigateBack()}
          className="text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 rounded-xl"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t('student_detail.back')}
        </Button>
        <div className="flex items-center gap-2 no-print">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
            onClick={() => {
              exportStudentCsv(data);
              toast.success(t('student.export_csv'));
            }}
          >
            <FileSpreadsheet className="h-4 w-4 mr-1.5" />
            {t('student.export_csv')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/20"
            onClick={() => {
              window.print();
            }}
          >
            <Printer className="h-4 w-4 mr-1.5" />
            {t('student.print_report')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/20"
            onClick={() => {
              window.print();
              toast.success(t('student.export_pdf'));
            }}
          >
            <FileDown className="h-4 w-4 mr-1.5" />
            {t('student.export_pdf')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
            onClick={() => {
              if (!currentStudentId) return;
              const qrData: QRCodeData = { type: 'student', id: currentStudentId, label: studentName };
              const dataUrl = generateQRCodeSync(qrData, { size: 256 });
              setQrCodeDataUrl(dataUrl);
              setQrDialogOpen(true);
            }}
          >
            <QrCode className="h-4 w-4 mr-1.5" />
            {t('qr.show_qr')}
          </Button>
        </div>
      </div>

      {/* Header card with student info & quick stats */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-emerald-500 overflow-hidden relative">
          {/* Decorative background pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/8 via-teal-500/4 to-violet-500/8 dark:from-emerald-500/12 dark:via-teal-500/6 dark:to-violet-500/10 pointer-events-none" />
          <div className="absolute inset-0 bg-pattern-dots opacity-50 pointer-events-none" />
          <CardContent className="p-6 relative">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Avatar + name */}
              <div className="flex items-center gap-5">
                <div className="relative shrink-0">
                  {/* Decorative halo */}
                  <div className="absolute -inset-1.5 rounded-3xl bg-gradient-to-br from-emerald-400/30 via-teal-400/20 to-amber-400/20 dark:from-emerald-500/20 dark:to-teal-500/10 blur-md animate-pulse-soft" />
                  <StudentAvatar
                    firstName={student.firstName}
                    lastName={student.lastName}
                    avatarUrl={student.avatarUrl}
                    size="xl"
                    className="w-20 h-20 text-2xl rounded-3xl ring-2 ring-emerald-200/60 dark:ring-emerald-700/40 shadow-lg shadow-emerald-200/40 dark:shadow-emerald-900/30"
                  />
                  {/* Mastery badge */}
                  <div className="absolute -bottom-1.5 -right-1.5 flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 dark:from-amber-400 dark:to-amber-600 ring-2 ring-white dark:ring-gray-900 shadow-sm text-xs">
                    <Star className="w-3.5 h-3.5 text-amber-900" />
                  </div>
                  {/* Upload button */}
                  <button
                    className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white ring-2 ring-white dark:ring-gray-900 shadow-md hover:scale-110 transition-transform"
                    onClick={() => setAvatarUploadOpen(true)}
                    title={t('avatar.change')}
                    aria-label={t('avatar.change')}
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div>
                  <h2 className="text-2xl font-bold gradient-text">{studentName}</h2>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
                    {primaryClass && (
                      <span className="flex items-center gap-1">
                        <School className="h-3.5 w-3.5 text-emerald-500" />
                        {t('student_detail.class')}: <strong className="text-gray-700 dark:text-gray-300">{primaryClass.name}</strong>
                      </span>
                    )}
                    {student.school && (
                      <span className="flex items-center gap-1">
                        <GraduationCap className="h-3.5 w-3.5 text-teal-500" />
                        {student.school.name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
                    {student.dateOfBirth && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-amber-500" />
                        {new Date(student.dateOfBirth).toLocaleDateString()}
                        {age !== null && (
                          <span className="text-amber-600/70 dark:text-amber-400/50">({age} {t('student_detail.years')})</span>
                        )}
                      </span>
                    )}
                    {student.externalId && (
                      <span className="flex items-center gap-1">
                        <Hash className="h-3.5 w-3.5 text-violet-500" />
                        {student.externalId}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1 md:justify-end">
                <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-900/10 border border-emerald-200/30 dark:border-emerald-900/20 text-center hover:shadow-md hover:shadow-emerald-100/40 dark:hover:shadow-emerald-900/20 transition-shadow">
                  <TrendingUp className="h-4 w-4 text-emerald-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 animate-count-up" key={`entries-${stats.totalProgressEntries}`}>{stats.totalProgressEntries}</p>
                  <p className="text-[10px] uppercase tracking-wider text-emerald-600/60 dark:text-emerald-400/40">{t('student_detail.total_entries')}</p>
                </div>
                <div className="p-3 rounded-xl bg-teal-50/60 dark:bg-teal-900/10 border border-teal-200/30 dark:border-teal-900/20 text-center hover:shadow-md hover:shadow-teal-100/40 dark:hover:shadow-teal-900/20 transition-shadow">
                  <Award className="h-4 w-4 text-teal-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-teal-700 dark:text-teal-300 animate-count-up" key={`mastery-${stats.averageMastery}`}>{stats.averageMastery.toFixed(1)}</p>
                  <p className="text-[10px] uppercase tracking-wider text-teal-600/60 dark:text-teal-400/40">{t('student_detail.avg_mastery')}</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-900/10 border border-amber-200/30 dark:border-amber-900/20 text-center hover:shadow-md hover:shadow-amber-100/40 dark:hover:shadow-amber-900/20 transition-shadow">
                  <Calculator className="h-4 w-4 text-amber-500 mx-auto mb-1" />
                  <p className={`text-lg font-bold ${stats.latestGrade ? gradeColor(stats.latestGrade.value) : 'text-gray-400'}`}>
                    {stats.latestGrade ? stats.latestGrade.value.toFixed(1) : '—'}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-amber-600/60 dark:text-amber-400/40">{t('student_detail.latest_grade')}</p>
                </div>
                <div className="p-3 rounded-xl bg-violet-50/60 dark:bg-violet-900/10 border border-violet-200/30 dark:border-violet-900/20 text-center hover:shadow-md hover:shadow-violet-100/40 dark:hover:shadow-violet-900/20 transition-shadow">
                  <FileText className="h-4 w-4 text-violet-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-violet-700 dark:text-violet-300 animate-count-up" key={`reports-${stats.totalReports}`}>{stats.totalReports}</p>
                  <p className="text-[10px] uppercase tracking-wider text-violet-600/60 dark:text-violet-400/40">{t('student_detail.reports')}</p>
                </div>
              </div>
            </div>

            {/* Class enrollment badges */}
            {student.enrollments.length > 0 && (
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500 dark:text-gray-400">{t('student_detail.class')}:</span>
                {student.enrollments.map((e, i) => (
                  <Badge
                    key={i}
                    className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-xs font-medium"
                  >
                    {e.classGroup.name} · {e.schoolYear.label}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Stats Bar + Badge Collection */}
      <div className="quick-stats-bar">
        <div className="quick-stat-item">
          <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-gray-700 dark:text-gray-300">{stats.totalProgressEntries} {t('student_detail.total_entries')}</span>
        </div>
        <div className="quick-stat-item">
          <Award className="h-3.5 w-3.5 text-teal-500" />
          <span className="text-gray-700 dark:text-gray-300">{stats.averageMastery.toFixed(1)} {t('student_detail.avg_mastery')}</span>
        </div>
        <div className="quick-stat-item">
          <QrCode className="h-3.5 w-3.5 text-violet-500" />
          <span className="text-gray-700 dark:text-gray-300">{student.externalId || student.id.slice(0, 8)}</span>
        </div>
        <div className="quick-stat-item">
          <Trophy className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-gray-700 dark:text-gray-300">
            {badgeProgress.filter(b => b.earned).length}/{badgeProgress.length} {t('badges.title')}
          </span>
        </div>
      </div>

      {/* Badge Collection Section */}
      {badgeProgress.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-amber-500 overflow-hidden">
            <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-900/10 dark:to-transparent">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                    <Trophy className="h-4 w-4" />
                  </div>
                  {t('badges.collection')}
                </CardTitle>
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-xs font-medium">
                  {t('badges.earned_count', { earned: badgeProgress.filter(b => b.earned).length, total: badgeProgress.length })}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {badgeProgress.map((bp) => {
                  const BadgeIcon = (iconMap as Record<string, LucideIcon>)[bp.icon] || Award;
                  return (
                    <TooltipProvider key={bp.badgeId}>
                      <ShadTooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={`badge-circle ${bp.earned ? 'badge-earned' : 'badge-unearned'}`}
                            style={bp.earned ? { background: `linear-gradient(135deg, ${bp.color}cc, ${bp.color}88)` } : undefined}
                            onClick={() => { setSelectedBadgeDetail(bp); setBadgeDetailDialogOpen(true); }}
                          >
                            <BadgeIcon className="h-6 w-6 text-white" />
                            {bp.earned && <div className="celebration-ring" />}
                            {!bp.earned && bp.progress > 0 && (
                              <div className="badge-progress">
                                <div className="badge-progress-fill" style={{ width: `${bp.progress}%` }} />
                              </div>
                            )}
                          </div>
                        </TooltipTrigger>
                        <ShadTooltipContent side="top" className="text-xs">
                          <strong>{bp.name}</strong>
                          {bp.earned ? ` — ${t('badges.earned')}` : ` — ${bp.progress}% ${t('badges.progress')}`}
                        </ShadTooltipContent>
                      </ShadTooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
              {/* Recent badge awards */}
              {earnedBadges.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{t('badges.recent')}</h4>
                  <div className="flex flex-wrap gap-2">
                    {earnedBadges.slice(0, 5).map((eb) => {
                      const BadgeIcon = (iconMap as Record<string, LucideIcon>)[eb.badge.icon] || Award;
                      return (
                        <div key={eb.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50/80 dark:bg-amber-900/10 border border-amber-200/30 dark:border-amber-900/20">
                          <BadgeIcon className="h-4 w-4" style={{ color: eb.badge.color }} />
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{eb.badge.name}</span>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">{new Date(eb.awardedAt).toLocaleDateString()}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Badge Detail Dialog */}
      <Dialog open={badgeDetailDialogOpen} onOpenChange={setBadgeDetailDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedBadgeDetail && (() => {
                const BadgeIcon = (iconMap as Record<string, LucideIcon>)[selectedBadgeDetail.icon] || Award;
                return <BadgeIcon className="h-5 w-5" style={{ color: selectedBadgeDetail.color }} />;
              })()}
              {selectedBadgeDetail?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedBadgeDetail?.earned ? t('badges.earned') : t('badges.unearned')}
            </DialogDescription>
          </DialogHeader>
          {selectedBadgeDetail && (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <div
                  className={`badge-circle ${selectedBadgeDetail.earned ? 'badge-earned' : 'badge-unearned'}`}
                  style={selectedBadgeDetail.earned ? { background: `linear-gradient(135deg, ${selectedBadgeDetail.color}cc, ${selectedBadgeDetail.color}88)` } : undefined}
                >
                  {(() => { const BadgeIcon = (iconMap as Record<string, LucideIcon>)[selectedBadgeDetail.icon] || Award; return <BadgeIcon className="h-8 w-8 text-white" />; })()}
                </div>
              </div>
              {!selectedBadgeDetail.earned && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">{t('badges.progress')}</span>
                    <span className="font-medium">{selectedBadgeDetail.current}/{selectedBadgeDetail.target}</span>
                  </div>
                  <Progress value={selectedBadgeDetail.progress} className="h-2" />
                </div>
              )}
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <span className="font-medium">{t('badges.category')}:</span> {t(`badges.${selectedBadgeDetail.category}`)}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-emerald-600" />
              {t('qr.student')}
            </DialogTitle>
            <DialogDescription>{studentName}</DialogDescription>
          </DialogHeader>
          <div className="qr-card mx-auto">
            {qrCodeDataUrl ? (
              <img src={qrCodeDataUrl} alt={t('qr.title')} className="mx-auto" width={200} height={200} />
            ) : (
              <div className="w-[200px] h-[200px] mx-auto bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                <QrCode className="h-12 w-12 text-gray-400" />
              </div>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">{studentName}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">{student.externalId || student.id.slice(0, 8)}</p>
          </div>
          <div className="flex justify-center gap-2 mt-4">
            <Button
              variant="outline"
              className="rounded-xl min-h-[44px]"
              onClick={() => { if (qrCodeDataUrl) downloadQRCode(qrCodeDataUrl, `${studentName}-qr.png`); }}
            >
              <FileDown className="h-4 w-4 mr-1.5" />
              {t('qr.download')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Competence Flower (mini radar) */}
      <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-teal-500 overflow-hidden">
        <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-teal-50/50 to-transparent dark:from-teal-900/10 dark:to-transparent">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
                <Flower2 className="h-4 w-4" />
              </div>
              {t('student_detail.competence_flower')}
            </CardTitle>
            {flowers.length > 0 && (
              <Select value={selectedFlowerSubjectId} onValueChange={setSelectedFlowerSubjectId}>
                <SelectTrigger className="h-8 w-48 rounded-lg text-xs border-teal-200 dark:border-teal-900/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {flowers.map((f) => (
                    <SelectItem key={f.subjectId} value={f.subjectId}>{f.subjectName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {flowers.length === 0 ? (
            <div className="text-center py-10">
              <Flower2 className="h-10 w-10 text-teal-400 dark:text-teal-500 mx-auto mb-2" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">{t('student_detail.no_flower')}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('student_detail.no_flower_hint')}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 rounded-xl border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300"
                onClick={() => setCurrentView('flower')}
              >
                {t('student_detail.view_flower')}
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          ) : !currentFlower || chartData.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500 dark:text-gray-400">{t('student_detail.flower_not_assigned')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="w-full">
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid stroke="#94a3b8" strokeOpacity={0.5} strokeDasharray="3 3" />
                    <PolarAngleAxis
                      dataKey="category"
                      tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 4]}
                      tick={{ fontSize: 9, fill: '#64748b' }}
                      tickCount={5}
                      stroke="#94a3b8"
                      strokeOpacity={0.6}
                    />
                    <Radar
                      name={studentName}
                      dataKey="value"
                      stroke="#14b8a6"
                      fill="#14b8a6"
                      fillOpacity={0.3}
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#14b8a6', stroke: '#fff', strokeWidth: 1.5 }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '12px',
                        border: '1px solid #a7f3d0',
                        background: '#ffffff',
                        fontSize: '12px',
                        padding: '8px 12px',
                        boxShadow: '0 10px 25px -5px rgba(20, 184, 166, 0.18)',
                      }}
                      itemStyle={{ color: '#0f172a' }}
                      labelStyle={{ color: '#0f766e', fontWeight: 600 }}
                      formatter={(value: number) => [`${value.toFixed(2)} / 4`, t('student_detail.value')]}
                    />
                  </RadarChart>
                </ResponsiveContainer>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 text-center mt-1 italic">
                  {t('student_detail.value_hint')}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-0.5 italic">
                  {t('student_detail.sparse_chart_hint')}
                </p>
              </div>
              {/* Category breakdown */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-education">
                {currentFlower.categories.map((cat, i) => (
                  <div
                    key={cat.categoryId}
                    className="p-3 rounded-lg bg-gray-50/80 dark:bg-gray-800/30 border-l-3"
                    style={{ borderLeftColor: PETAL_COLORS[i % PETAL_COLORS.length] }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: PETAL_COLORS[i % PETAL_COLORS.length] }}
                        />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{cat.categoryName}</span>
                      </div>
                      <TooltipProvider>
                        <ShadTooltip>
                          <TooltipTrigger asChild>
                            <Badge className={`${cat.averageMasteryLevel > 0 ? masteryBadge(cat.averageMasteryLevel) : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'} text-xs cursor-default`}>
                              {cat.averageMasteryLevel > 0 ? cat.averageMasteryLevel.toFixed(2) : t('student_detail.no_assessment')}
                            </Badge>
                          </TooltipTrigger>
                          <ShadTooltipContent side="top" className="text-xs">
                            {cat.averageMasteryLevel > 0 ? `${cat.averageMasteryLevel.toFixed(2)} / 4` : t('student_detail.no_assessment')}
                          </ShadTooltipContent>
                        </ShadTooltip>
                      </TooltipProvider>
                    </div>
                    <div className="relative h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400"
                        style={{ width: `${(cat.averageMasteryLevel / 4) * 100}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                      {cat.assessedCompetencyCount} / {cat.competencyCount} {t('student_detail.competency').toLowerCase()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress timeline */}
      <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-emerald-500 overflow-hidden">
        <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10 dark:to-transparent">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                <BookOpen className="h-4 w-4" />
              </div>
              {t('student_detail.progress_timeline')}
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-xs font-medium">
                {progressEntries.length}
              </Badge>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300"
              onClick={() => {
                useAppStore.getState().setCurrentStudent(student.id);
                setCurrentView('progress');
              }}
            >
              {t('student_detail.view_progress')}
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {progressEntries.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="h-8 w-8 text-emerald-400 dark:text-emerald-500 mx-auto mb-2" />
              <p className="text-gray-500 dark:text-gray-400">{t('student_detail.no_progress_entries')}</p>
            </div>
          ) : (
            <div className="relative max-h-96 overflow-y-auto scrollbar-education">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-emerald-200/50 dark:bg-emerald-900/30" />
              {progressEntries.map((entry, i) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="relative flex items-start gap-4 pl-4 py-3"
                >
                  <div className="absolute left-3.5 w-3 h-3 rounded-full ring-2 ring-white dark:ring-gray-900 shrink-0 bg-emerald-500" style={{ zIndex: 1 }} />
                  <div className="ml-6 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`${masteryBadge(entry.masteryLevelValue)} text-xs`}>
                        {entry.masteryLevelValue}
                      </Badge>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {entry.competency.code} — {entry.competency.title}
                      </span>
                    </div>
                    {entry.competency.category && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {entry.competency.category.name} · {entry.classGroup.name}
                      </p>
                    )}
                    {entry.note && (
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 italic">"{entry.note}"</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-3 w-3 text-emerald-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(entry.date).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-emerald-600/70 dark:text-emerald-400/50">
                        — {entry.teacher.firstName} {entry.teacher.lastName}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two-column: Assessment results + Computed grades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assessment results */}
        <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-amber-500 overflow-hidden">
          <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-900/10 dark:to-transparent">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                <ClipboardCheck className="h-4 w-4" />
              </div>
              {t('student_detail.assessment_results')}
              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-xs font-medium">
                {assessmentResults.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assessmentResults.length === 0 ? (
              <div className="text-center py-8">
                <ClipboardCheck className="h-8 w-8 text-amber-400 dark:text-amber-500 mx-auto mb-2" />
                <p className="text-gray-500 dark:text-gray-400">{t('student_detail.no_assessments')}</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto scrollbar-education">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-amber-200/30 dark:border-amber-900/20">
                      <TableHead className="text-xs uppercase text-amber-600/70 dark:text-amber-400/50">{t('student_detail.assessment')}</TableHead>
                      <TableHead className="text-xs uppercase text-amber-600/70 dark:text-amber-400/50">{t('student_detail.date')}</TableHead>
                      <TableHead className="text-right text-xs uppercase text-amber-600/70 dark:text-amber-400/50">{t('student_detail.score')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assessmentResults.map((r, idx) => (
                      <TableRow key={r.id} className={idx % 2 === 1 ? 'bg-amber-50/20 dark:bg-amber-900/5' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="flex items-center">{(() => { const Icon = assessmentTypeIcon[r.assessment.type] ?? ClipboardList; return <Icon className="w-4 h-4" />; })()}</span>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{r.assessment.title}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{r.assessment.subject.name}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">{new Date(r.assessment.date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          {r.score !== null && r.assessment.maxScore ? (
                            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-xs">
                              {r.score} / {r.assessment.maxScore}
                            </Badge>
                          ) : r.masteryLevelValue !== null ? (
                            <Badge className={`${masteryBadge(r.masteryLevelValue)} text-xs`}>
                              {r.masteryLevelValue}
                            </Badge>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Computed grades */}
        <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-violet-500 overflow-hidden">
          <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-violet-50/50 to-transparent dark:from-violet-900/10 dark:to-transparent">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                <Calculator className="h-4 w-4" />
              </div>
              {t('student_detail.computed_grades')}
              <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 text-xs font-medium">
                {computedGrades.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {computedGrades.length === 0 ? (
              <div className="text-center py-8">
                <Calculator className="h-8 w-8 text-violet-400 dark:text-violet-500 mx-auto mb-2" />
                <p className="text-gray-500 dark:text-gray-400">{t('student_detail.no_grades')}</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto scrollbar-education">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-violet-200/30 dark:border-violet-900/20">
                      <TableHead className="text-xs uppercase text-violet-600/70 dark:text-violet-400/50">{t('student_detail.subject')}</TableHead>
                      <TableHead className="text-xs uppercase text-violet-600/70 dark:text-violet-400/50">{t('student_detail.period')}</TableHead>
                      <TableHead className="text-right text-xs uppercase text-violet-600/70 dark:text-violet-400/50">{t('student_detail.value')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {computedGrades.map((g, idx) => {
                      const value = g.overriddenValue ?? g.computedValue;
                      return (
                        <TableRow key={g.id} className={idx % 2 === 1 ? 'bg-violet-50/20 dark:bg-violet-900/5' : ''}>
                          <TableCell className="text-sm font-medium">{g.subject.name}</TableCell>
                          <TableCell className="text-xs text-gray-500">{g.period}</TableCell>
                          <TableCell className="text-right">
                            <span className={`text-lg font-bold ${gradeColor(value)}`}>
                              {value.toFixed(1)}
                            </span>
                            {g.overriddenValue !== null && (
                              <Zap className="w-3 h-3 inline text-amber-600 dark:text-amber-400" />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reports list */}
      <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-rose-500 overflow-hidden">
        <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-rose-50/50 to-transparent dark:from-rose-900/10 dark:to-transparent">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
              <FileText className="h-4 w-4" />
            </div>
            {t('student_detail.reports')}
            <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 text-xs font-medium">
              {reports.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-8 w-8 text-rose-400 dark:text-rose-500 mx-auto mb-2" />
              <p className="text-gray-500 dark:text-gray-400">{t('student_detail.no_reports')}</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-education">
              {reports.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="p-4 rounded-xl bg-gradient-to-r from-gray-50 to-gray-50/0 dark:from-gray-800/50 dark:to-gray-800/0 border-l-3 border-l-rose-400/40 hover:border-l-rose-500 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{r.period}</p>
                        <Badge className={`text-xs ${r.status === 'FINAL' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'}`}>
                          {r.status}
                        </Badge>
                        {r.includesGrades && (
                          <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 text-xs">
                            <BarChart3 className="w-3 h-3 inline" /> {t('student_detail.computed_grades')}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {r.classGroup.name} · {r.schoolYear.label}
                      </p>
                      <p className="text-xs text-emerald-600/70 dark:text-emerald-400/50 mt-0.5">
                        {t('student_detail.generated_at')}: {new Date(r.generatedAt).toLocaleDateString()} — {r.generatedByUser.firstName} {r.generatedByUser.lastName}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-xl text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/20"
                      onClick={() => window.open(getReportPdfUrl(r.id), '_blank')}
                    >
                      <Printer className="h-4 w-4 mr-1" />
                      {t('student_detail.print_report')}
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student journey timeline + competency mastery grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Student journey timeline — enhanced with milestones & time filter */}
        <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-amber-500 overflow-hidden">
          <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-900/10 dark:to-transparent">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                  <Flag className="h-4 w-4" />
                </div>
                {t('student.journey')}
              </CardTitle>
              <JourneyTimeFilter range={timeRange} setRange={setTimeRange} />
            </div>
          </CardHeader>
          <CardContent>
            <JourneyTimeline
              progressEntries={progressEntries}
              assessmentResults={assessmentResults}
              computedGrades={computedGrades}
              reports={reports}
              timeRange={timeRange}
            />
          </CardContent>
        </Card>

        {/* Competency mastery grid */}
        <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-teal-500 overflow-hidden">
          <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-teal-50/50 to-transparent dark:from-teal-900/10 dark:to-transparent">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
                <Grid3X3 className="h-4 w-4" />
              </div>
              {t('polish.competency_grid')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentFlower && currentFlower.categories.length > 0 ? (
              <div className="space-y-3">
                {currentFlower.categories.map((cat, i) => {
                  const catColor = PETAL_COLORS[i % PETAL_COLORS.length];
                  // Generate deterministic pseudo mastery cells per category
                  let h = 0;
                  for (let j = 0; j < cat.categoryId.length; j++) h = (h * 31 + cat.categoryId.charCodeAt(j)) | 0;
                  h = Math.abs(h);
                  const cells = Array.from({ length: cat.competencyCount }, (_, idx) => {
                    if (idx < cat.assessedCompetencyCount) {
                      const lvl = 1 + ((h >> (idx * 2)) & 3);
                      return lvl;
                    }
                    return 0; // unassessed
                  });
                  return (
                    <div key={cat.categoryId}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: catColor }} />
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{cat.categoryName}</span>
                        </div>
                        <span className="text-[10px] text-gray-400">{cat.assessedCompetencyCount}/{cat.competencyCount}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {cells.map((lvl, idx) => (
                          <div
                            key={idx}
                            className={`w-4 h-4 rounded-sm transition-all hover:scale-110 cursor-default ${
                              lvl === 0 ? 'bg-gray-200 dark:bg-gray-700'
                              : lvl === 1 ? 'bg-red-400 dark:bg-red-500'
                              : lvl === 2 ? 'bg-amber-400 dark:bg-amber-500'
                              : lvl === 3 ? 'bg-emerald-400 dark:bg-emerald-500'
                              : 'bg-teal-400 dark:bg-teal-500'
                            }`}
                            title={`#${idx + 1} · ${lvl === 0 ? t('polish.never') : `${t('polish.level_' + lvl)}`}`}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
                {/* Legend */}
                <div className="flex items-center gap-3 text-[10px] text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200/40 dark:border-gray-700/30">
                  {[
                    { lvl: 0, label: t('polish.never'), color: 'bg-gray-300 dark:bg-gray-600' },
                    { lvl: 1, label: t('polish.level_1'), color: 'bg-red-400' },
                    { lvl: 2, label: t('polish.level_2'), color: 'bg-amber-400' },
                    { lvl: 3, label: t('polish.level_3'), color: 'bg-emerald-400' },
                    { lvl: 4, label: t('polish.level_4'), color: 'bg-teal-400' },
                  ].map((l) => (
                    <span key={l.lvl} className="inline-flex items-center gap-1">
                      <span className={`inline-block w-2.5 h-2.5 rounded-sm ${l.color}`} />
                      {l.label}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Grid3X3 className="h-8 w-8 text-teal-400 dark:text-teal-500 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('student_detail.no_flower')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent achievements + Teacher notes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent achievements */}
        <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-emerald-500 overflow-hidden">
          <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10 dark:to-transparent">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                <Trophy className="h-4 w-4" />
              </div>
              {t('polish.recent_achievements')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const achievements = progressEntries
                .filter((e) => e.masteryLevelValue >= 3.5)
                .slice(0, 6);
              if (achievements.length === 0) {
                return (
                  <div className="text-center py-8">
                    <Trophy className="h-8 w-8 text-emerald-400 dark:text-emerald-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('polish.no_results')}</p>
                  </div>
                );
              }
              const achievementBadges: { icon: LucideIcon; label: string; color: string }[] = [
                { icon: Trophy, label: t('polish.level_4'), color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300' },
                { icon: Star, label: t('polish.strengths'), color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
                { icon: Sparkles, label: t('polish.level_3'), color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
                { icon: Target, label: t('label.mastery'), color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
                { icon: BookOpen, label: t('nav.competencies'), color: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300' },
              ];
              return (
                <div className="space-y-2">
                  {achievements.map((e, i) => (
                    <motion.div
                      key={e.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 p-2.5 rounded-lg bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/15 dark:to-transparent border border-emerald-200/30 dark:border-emerald-900/20"
                    >
                      <div className={`flex items-center justify-center w-9 h-9 rounded-full ${achievementBadges[i % achievementBadges.length].color} text-base`}>
                        {(() => { const BadgeIcon = achievementBadges[i % achievementBadges.length].icon; return <BadgeIcon className="w-4 h-4" />; })()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{e.competency.title}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">{e.competency.category.name} · {new Date(e.date).toLocaleDateString()}</p>
                      </div>
                      <Badge className={`text-[10px] ${masteryBadge(e.masteryLevelValue)}`}>
                        {e.masteryLevelValue.toFixed(1)}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Teacher notes — replaced with the dedicated TeacherNotesSection */}
        <TeacherNotesSection studentId={student.id} />

        {/* My Progress section (for student self-view) */}
        {isStudentSelf && (
          <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-amber-500 overflow-hidden">
            <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-900/10 dark:to-transparent">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                  <TrendingUp className="h-4 w-4" />
                </div>
                {t('student.my_competencies')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{t('student.progress_overview')}</p>
              {/* Mastery Level Visualization */}
              <div className="space-y-3">
                {stats.averageMastery > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('student_detail.avg_mastery')}</span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{stats.averageMastery.toFixed(1)} / 4.0</span>
                    </div>
                    <div className="h-3 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-1000"
                        style={{ width: `${Math.min(100, (stats.averageMastery / 4) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
                {stats.totalProgressEntries > 0 && (
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100/50 dark:border-amber-900/20">
                    <span className="text-xs text-gray-600 dark:text-gray-400">{t('student_detail.total_entries')}</span>
                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{stats.totalProgressEntries}</span>
                  </div>
                )}
                {stats.latestGrade && (
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-teal-50/50 dark:bg-teal-900/10 border border-teal-100/50 dark:border-teal-900/20">
                    <span className="text-xs text-gray-600 dark:text-gray-400">{t('student_detail.latest_grade')}</span>
                    <span className="text-sm font-bold text-teal-600 dark:text-teal-400">{stats.latestGrade.value.toFixed(1)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Parent Info section (for parent users) */}
        {isParent && parentLinks.length > 0 && (
          <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-violet-500 overflow-hidden">
            <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-violet-50/50 to-transparent dark:from-violet-900/10 dark:to-transparent">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                  <Heart className="h-4 w-4" />
                </div>
                {t('parent.my_children')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="space-y-2">
                {parentLinks.map((link) => (
                  <div key={link.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-violet-50/50 dark:bg-violet-900/10 border border-violet-100/50 dark:border-violet-900/20">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-200 dark:bg-violet-800 text-violet-700 dark:text-violet-300 text-[10px] font-bold">
                        {link.student.firstName[0]}{link.student.lastName[0]}
                      </div>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{link.student.firstName} {link.student.lastName}</span>
                    </div>
                    {link.relationship && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-violet-50/50 dark:bg-violet-900/10 border-violet-200/50 dark:border-violet-900/30 text-violet-700 dark:text-violet-300 shrink-0">
                        {t(`parent.${link.relationship}`)}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ─── Self-Assessment Section ─────────────────────────────────── */}
      <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-cyan-500 overflow-hidden">
        <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-cyan-50/50 to-transparent dark:from-cyan-900/10 dark:to-transparent">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400">
                <Eye className="h-4 w-4" />
              </div>
              {t('self_assessment.title')}
              <Badge className="bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 text-xs font-medium">
                {selfAssessments.length}
              </Badge>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-cyan-300 dark:border-cyan-700 text-cyan-700 dark:text-cyan-300 min-h-[44px]"
              onClick={() => {
                setSaEditId(null);
                setSaForm({ competencyId: '', selfLevel: 3, confidence: 3, reflection: '', evidence: '', goalId: '' });
                setSaDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              {t('self_assessment.add_new')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {selfAssessments.length === 0 ? (
            <div className="text-center py-8">
              <Eye className="h-8 w-8 text-cyan-400 dark:text-cyan-500 mx-auto mb-2" />
              <p className="text-gray-500 dark:text-gray-400">{t('self_assessment.no_assessments')}</p>
            </div>
          ) : (
            <>
              {/* Comparison radar chart */}
              {(() => {
                const comparisonData = selfAssessments.map((sa) => {
                  const teacherEntry = data?.progressEntries.find(
                    (pe) => pe.competency.id === sa.competencyId
                  );
                  return {
                    competency: sa.competency.code.length > 12 ? sa.competency.code.slice(0, 12) : sa.competency.code,
                    self: sa.selfLevel,
                    teacher: teacherEntry ? teacherEntry.masteryLevelValue : 0,
                  };
                }).filter((d) => d.teacher > 0);
                if (comparisonData.length < 3) return null;
                return (
                  <div className="mb-6">
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-wider">{t('self_assessment.comparison_chart')}</p>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={comparisonData}>
                          <PolarGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <PolarAngleAxis dataKey="competency" tick={{ fontSize: 10, fill: '#6b7280' }} />
                          <PolarRadiusAxis domain={[0, 6]} tick={{ fontSize: 9 }} />
                          <Radar name={t('self_assessment.self')} dataKey="self" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.2} />
                          <Radar name={t('self_assessment.teacher')} dataKey="teacher" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
                          <Tooltip />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex items-center justify-center gap-6 mt-2">
                      <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 rounded-full bg-cyan-400 inline-block" />{t('self_assessment.self')}</span>
                      <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />{t('self_assessment.teacher')}</span>
                    </div>
                  </div>
                );
              })()}
              {/* Self-assessment list */}
              <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-education">
                {selfAssessments.map((sa, i) => {
                  const teacherEntry = data?.progressEntries.find((pe) => pe.competency.id === sa.competencyId);
                  const gap = teacherEntry ? sa.selfLevel - teacherEntry.masteryLevelValue : null;
                  return (
                    <motion.div
                      key={sa.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="p-3 rounded-xl bg-gradient-to-r from-cyan-50/40 to-transparent dark:from-cyan-900/10 dark:to-transparent border border-cyan-200/30 dark:border-cyan-900/20"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{sa.competency.code} — {sa.competency.title}</span>
                            <Badge className="bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 text-xs">{t('self_assessment.level')}: {sa.selfLevel}/6</Badge>
                            {sa.confidence && (
                              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-xs">{t('self_assessment.confidence')}: {sa.confidence}/5</Badge>
                            )}
                            {gap !== null && (
                              <Badge className={`${Math.abs(gap) <= 1 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'} text-xs`}>
                                {t('self_assessment.gap')}: {gap > 0 ? '+' : ''}{gap.toFixed(1)}
                              </Badge>
                            )}
                          </div>
                          {sa.reflection && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 italic">&ldquo;{sa.reflection}&rdquo;</p>
                          )}
                          {sa.evidence && (
                            <p className="text-xs text-cyan-600 dark:text-cyan-400 mt-0.5"><Lightbulb className="h-3 w-3 inline mr-1" />{sa.evidence}</p>
                          )}
                          <p className="text-[10px] text-gray-400 mt-1">{new Date(sa.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-lg min-h-[44px] min-w-[44px]"
                            onClick={() => {
                              setSaEditId(sa.id);
                              setSaForm({
                                competencyId: sa.competencyId,
                                selfLevel: sa.selfLevel,
                                confidence: sa.confidence ?? 3,
                                reflection: sa.reflection ?? '',
                                evidence: sa.evidence ?? '',
                                goalId: sa.goalId ?? '',
                              });
                              setSaDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-lg text-red-500 hover:text-red-700 min-h-[44px] min-w-[44px]"
                            onClick={async () => {
                              try {
                                await apiDelete(`/api/self-assessments/${sa.id}`);
                                setSelfAssessments((prev) => prev.filter((a) => a.id !== sa.id));
                                toast.success(t('action.delete'));
                              } catch { toast.error(t('error.generic')); }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ─── Learning Goals Section ─────────────────────────────────── */}
      <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-orange-500 overflow-hidden">
        <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-orange-50/50 to-transparent dark:from-orange-900/10 dark:to-transparent">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
                <Target className="h-4 w-4" />
              </div>
              {t('learning_goal.title')}
              <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 text-xs font-medium">
                {learningGoals.filter((g) => g.status === 'active').length}
              </Badge>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300 min-h-[44px]"
              onClick={() => {
                setLgEditId(null);
                setLgForm({ title: '', description: '', competencyId: '', targetLevel: 4, currentLevel: 1, deadline: '', status: 'active', progress: 0 });
                setLgDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              {t('learning_goal.add_new')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {learningGoals.length === 0 ? (
            <div className="text-center py-8">
              <Target className="h-8 w-8 text-orange-400 dark:text-orange-500 mx-auto mb-2" />
              <p className="text-gray-500 dark:text-gray-400">{t('learning_goal.no_goals')}</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-education">
              {learningGoals.map((goal, i) => {
                const daysLeft = goal.deadline ? Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
                const isOverdue = daysLeft !== null && daysLeft < 0;
                const statusColor = goal.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : goal.status === 'abandoned' ? 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300' : isOverdue ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
                const statusLabel = goal.status === 'completed' ? t('learning_goal.completed') : goal.status === 'abandoned' ? t('learning_goal.abandoned') : t('learning_goal.active');
                return (
                  <motion.div
                    key={goal.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="p-4 rounded-xl bg-gradient-to-r from-orange-50/40 to-transparent dark:from-orange-900/10 dark:to-transparent border border-orange-200/30 dark:border-orange-900/20"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{goal.title}</span>
                          <Badge className={`text-xs ${statusColor}`}>
                            {goal.status === 'completed' ? <CheckCircle2 className="h-3 w-3 mr-1" /> : goal.status === 'abandoned' ? <XCircle className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                            {statusLabel}
                          </Badge>
                          {goal.competency && (
                            <Badge variant="outline" className="text-xs">{goal.competency.code}</Badge>
                          )}
                        </div>
                        {goal.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{goal.description}</p>
                        )}
                        {/* Progress bar */}
                        <div className="mt-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-gray-500 dark:text-gray-400">{t('learning_goal.progress')}</span>
                            <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400">{goal.progress}%</span>
                          </div>
                          <Progress value={goal.progress} className="h-2" />
                        </div>
                        {/* Level indicators */}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                          {goal.currentLevel !== null && (
                            <span>{t('learning_goal.current_level')}: <strong className="text-gray-700 dark:text-gray-300">{goal.currentLevel}</strong></span>
                          )}
                          {goal.targetLevel !== null && (
                            <span>{t('learning_goal.target_level')}: <strong className="text-gray-700 dark:text-gray-300">{goal.targetLevel}</strong></span>
                          )}
                          {daysLeft !== null && (
                            <span className={isOverdue ? 'text-red-500 font-semibold' : 'text-orange-500'}>
                              {isOverdue ? t('learning_goal.overdue') : `${daysLeft} ${t('learning_goal.days_left')}`}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-lg min-h-[44px] min-w-[44px]"
                          onClick={() => {
                            setLgEditId(goal.id);
                            setLgForm({
                              title: goal.title,
                              description: goal.description ?? '',
                              competencyId: goal.competencyId ?? '',
                              targetLevel: goal.targetLevel ?? 4,
                              currentLevel: goal.currentLevel ?? 1,
                              deadline: goal.deadline ? new Date(goal.deadline).toISOString().split('T')[0] : '',
                              status: goal.status,
                              progress: goal.progress,
                            });
                            setLgDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {goal.status === 'active' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-lg text-emerald-600 hover:text-emerald-700 min-h-[44px] min-w-[44px]"
                            onClick={async () => {
                              try {
                                await apiPut(`/api/learning-goals/${goal.id}`, { status: 'completed', progress: 100 });
                                setLearningGoals((prev) => prev.map((g) => g.id === goal.id ? { ...g, status: 'completed', progress: 100 } : g));
                                setGoalCelebration(goal.id);
                                setTimeout(() => setGoalCelebration(null), 3000);
                                toast.success(t('learning_goal.celebration'));
                              } catch { toast.error(t('error.generic')); }
                            }}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-lg text-red-500 hover:text-red-700 min-h-[44px] min-w-[44px]"
                          onClick={async () => {
                            try {
                              await apiDelete(`/api/learning-goals/${goal.id}`);
                              setLearningGoals((prev) => prev.filter((g) => g.id !== goal.id));
                              toast.success(t('action.delete'));
                            } catch { toast.error(t('error.generic')); }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {/* Celebration overlay */}
                    {goalCelebration === goal.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="mt-2 p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold text-center"
                      >
                        {t('learning_goal.celebration')}
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Peer Assessment Section ─────────────────────────────────── */}
      <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-purple-500 overflow-hidden">
        <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-purple-50/50 to-transparent dark:from-purple-900/10 dark:to-transparent">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                <UsersIcon className="h-4 w-4" />
              </div>
              {t('peer.title')}
              <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-xs font-medium">
                {peerAssessments.length}
              </Badge>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 min-h-[44px]"
              onClick={() => {
                setPaForm({ assessmentType: 'competency', competencyId: '', level: 3, comment: '', isAnonymous: false });
                setPaDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              {t('peer.create')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {peerAssessments.length === 0 ? (
            <div className="text-center py-8">
              <UsersIcon className="h-8 w-8 text-purple-400 dark:text-purple-500 mx-auto mb-2" />
              <p className="text-gray-500 dark:text-gray-400">{t('peer.no_assessments')}</p>
            </div>
          ) : (
            <>
              {/* 3-column radar comparison: Peer / Teacher / Self */}
              {(() => {
                const peerByCompetency = peerAssessments.filter((pa) => pa.competencyId && pa.level);
                const selfByCompetency = selfAssessments.filter((sa) => sa.selfLevel);
                const teacherByCompetency = data?.progressEntries ?? [];

                const compIds = new Set<string>();
                peerByCompetency.forEach((pa) => { if (pa.competencyId) compIds.add(pa.competencyId); });
                selfByCompetency.forEach((sa) => compIds.add(sa.competencyId));
                teacherByCompetency.forEach((pe) => compIds.add(pe.competency.id));

                const comparisonData = Array.from(compIds).slice(0, 8).map((cId) => {
                  const peerLevels = peerByCompetency.filter((pa) => pa.competencyId === cId).map((pa) => pa.level!);
                  const selfEntry = selfByCompetency.find((sa) => sa.competencyId === cId);
                  const teacherEntry = teacherByCompetency.find((pe) => pe.competency.id === cId);
                  const code = peerLevels.length > 0
                    ? (peerByCompetency.find((pa) => pa.competencyId === cId)?.competency?.code ?? cId.slice(0, 8))
                    : selfEntry?.competency?.code ?? teacherEntry?.competency?.code ?? cId.slice(0, 8);
                  return {
                    competency: code.length > 12 ? code.slice(0, 12) : code,
                    peer: peerLevels.length > 0 ? peerLevels.reduce((a, b) => a + b, 0) / peerLevels.length : 0,
                    self: selfEntry ? selfEntry.selfLevel : 0,
                    teacher: teacherEntry ? teacherEntry.masteryLevelValue : 0,
                  };
                }).filter((d) => d.peer > 0 || d.self > 0 || d.teacher > 0);

                if (comparisonData.length < 3) return null;
                return (
                  <div className="mb-6">
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-wider">{t('peer.comparison')}</p>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={comparisonData}>
                          <PolarGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <PolarAngleAxis dataKey="competency" tick={{ fontSize: 10, fill: '#6b7280' }} />
                          <PolarRadiusAxis domain={[0, 6]} tick={{ fontSize: 9 }} />
                          <Radar name={t('peer.title')} dataKey="peer" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
                          <Radar name={t('peer.teacher')} dataKey="teacher" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
                          <Radar name={t('peer.self')} dataKey="self" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.2} />
                          <Tooltip />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex items-center justify-center gap-6 mt-2">
                      <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 rounded-full bg-purple-400 inline-block" />{t('peer.title')}</span>
                      <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />{t('peer.teacher')}</span>
                      <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 rounded-full bg-cyan-400 inline-block" />{t('peer.self')}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Average peer rating per competency */}
              {(() => {
                const groupedByComp = peerAssessments
                  .filter((pa) => pa.competencyId && pa.level)
                  .reduce((acc, pa) => {
                    const key = pa.competencyId!;
                    if (!acc[key]) acc[key] = { code: pa.competency?.code ?? '', title: pa.competency?.title ?? '', levels: [] };
                    acc[key].levels.push(pa.level!);
                    return acc;
                  }, {} as Record<string, { code: string; title: string; levels: number[] }>);
                const averages = Object.entries(groupedByComp);
                if (averages.length === 0) return null;
                return (
                  <div className="mb-4 p-3 rounded-xl bg-purple-50/50 dark:bg-purple-900/10 border border-purple-200/30 dark:border-purple-900/20">
                    <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-2 uppercase tracking-wider">{t('peer.average')}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {averages.map(([cId, data]) => {
                        const avg = data.levels.reduce((a, b) => a + b, 0) / data.levels.length;
                        return (
                          <div key={cId} className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-gray-800/50 border border-purple-100/50 dark:border-purple-900/20">
                            <Badge className={`${masteryBadge(avg)} text-xs`}>{avg.toFixed(1)}</Badge>
                            <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{data.code || data.title}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Peer assessment list */}
              <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-education">
                {peerAssessments.map((pa, i) => {
                  const typeLabel = t(`peer.type_${pa.assessmentType}`) || pa.assessmentType;
                  return (
                    <motion.div
                      key={pa.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="p-3 rounded-xl bg-gradient-to-r from-purple-50/40 to-transparent dark:from-purple-900/10 dark:to-transparent border border-purple-200/30 dark:border-purple-900/20"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-xs">{typeLabel}</Badge>
                            {pa.level && (
                              <Badge className={`${masteryBadge(pa.level)} text-xs`}>{pa.level}/6</Badge>
                            )}
                            {pa.isAnonymous && (
                              <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 text-xs">
                                <ShieldAlert className="h-3 w-3 mr-1" />{t('peer.anonymous')}
                              </Badge>
                            )}
                            {pa.competency && (
                              <span className="text-xs text-gray-600 dark:text-gray-400">{pa.competency.code} — {pa.competency.title}</span>
                            )}
                          </div>
                          {!pa.isAnonymous && (
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                              {t('peer.from')}: {pa.assessor.firstName} {pa.assessor.lastName}
                            </p>
                          )}
                          {pa.comment && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 italic">&ldquo;{pa.comment}&rdquo;</p>
                          )}
                          <p className="text-[10px] text-gray-400 mt-1">{new Date(pa.createdAt).toLocaleDateString()}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-lg text-red-500 hover:text-red-700 min-h-[44px] min-w-[44px]"
                          onClick={async () => {
                            try {
                              await apiDelete(`/api/peer-assessments/${pa.id}`);
                              setPeerAssessments((prev) => prev.filter((a) => a.id !== pa.id));
                              toast.success(t('action.delete'));
                            } catch { toast.error(t('error.generic')); }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ─── Emergency Contacts Section ─────────────────────────────────── */}
      <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-rose-500 overflow-hidden">
        <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-rose-50/50 to-transparent dark:from-rose-900/10 dark:to-transparent">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
                <AlertCircle className="h-4 w-4" />
              </div>
              {t('emergency.title')}
              <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 text-xs font-medium">
                {emergencyContacts.length}
              </Badge>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 min-h-[44px]"
              onClick={() => {
                setEcEditId(null);
                setEcForm({ name: '', relationship: 'mother', phone: '', phoneAlt: '', email: '', address: '', isPrimary: false, priority: 1, notes: '' });
                setEcDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              {t('emergency.add')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {emergencyContacts.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-8 w-8 text-rose-400 dark:text-rose-500 mx-auto mb-2" />
              <p className="text-gray-500 dark:text-gray-400">{t('emergency.no_contacts')}</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-education">
              {emergencyContacts.map((ec, i) => {
                const relLabel = t(`emergency.${ec.relationship}`) || ec.relationship;
                return (
                  <motion.div
                    key={ec.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="p-4 rounded-xl bg-gradient-to-r from-rose-50/40 to-transparent dark:from-rose-900/10 dark:to-transparent border border-rose-200/30 dark:border-rose-900/20"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{ec.name}</span>
                          <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 text-xs">{relLabel}</Badge>
                          {ec.isPrimary && (
                            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-xs">
                              <Star className="h-3 w-3 mr-1" />{t('emergency.primary')}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">{t('emergency.priority')}: {ec.priority}</Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <span className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                            <Phone className="h-3 w-3 text-rose-500" />
                            {ec.phone}
                          </span>
                          {ec.phoneAlt && (
                            <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                              <Phone className="h-3 w-3 text-gray-400" />
                              {ec.phoneAlt}
                            </span>
                          )}
                          {ec.email && (
                            <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                              <Globe className="h-3 w-3" />
                              {ec.email}
                            </span>
                          )}
                        </div>
                        {ec.address && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />{ec.address}
                          </p>
                        )}
                        {ec.notes && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">{ec.notes}</p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-lg text-rose-600 hover:text-rose-700 min-h-[44px] min-w-[44px]"
                          title={t('emergency.quick_call')}
                          onClick={() => {
                            toast.success(`${t('emergency.phone')}: ${ec.phone}`);
                          }}
                        >
                          <PhoneCall className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-lg min-h-[44px] min-w-[44px]"
                          onClick={() => {
                            setEcEditId(ec.id);
                            setEcForm({
                              name: ec.name,
                              relationship: ec.relationship,
                              phone: ec.phone,
                              phoneAlt: ec.phoneAlt ?? '',
                              email: ec.email ?? '',
                              address: ec.address ?? '',
                              isPrimary: ec.isPrimary,
                              priority: ec.priority,
                              notes: ec.notes ?? '',
                            });
                            setEcDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-lg text-red-500 hover:text-red-700 min-h-[44px] min-w-[44px]"
                          onClick={async () => {
                            try {
                              await apiDelete(`/api/emergency-contacts/${ec.id}`);
                              setEmergencyContacts((prev) => prev.filter((c) => c.id !== ec.id));
                              toast.success(t('action.delete'));
                            } catch { toast.error(t('error.generic')); }
                          }}
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
        </CardContent>
      </Card>

      {/* ─── Transportation Section ─────────────────────────────────── */}
      <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-amber-500 overflow-hidden">
        <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-900/10 dark:to-transparent">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                <Bus className="h-4 w-4" />
              </div>
              {t('transport.title')}
              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-xs font-medium">
                {transports.length}
              </Badge>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 min-h-[44px]"
              onClick={() => {
                setTransportEditId(null);
                setTransportForm({ transportType: 'bus', routeNumber: '', stopName: '', pickupTime: '', dropoffTime: '', driverName: '', driverPhone: '', distanceKm: '', notes: '' });
                setTransportDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              {t('transport.add')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {transports.length === 0 ? (
            <div className="text-center py-8">
              <Bus className="h-8 w-8 text-amber-400 dark:text-amber-500 mx-auto mb-2" />
              <p className="text-gray-500 dark:text-gray-400">{t('transport.no_transport')}</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-education">
              {transports.map((tr, i) => {
                const typeIcon: Record<string, React.ReactNode> = {
                  bus: <Bus className="h-4 w-4" />,
                  tram: <Train className="h-4 w-4" />,
                  walk: <Footprints className="h-4 w-4" />,
                  car: <Car className="h-4 w-4" />,
                  bike: <Bike className="h-4 w-4" />,
                  other: <Truck className="h-4 w-4" />,
                };
                const typeColor: Record<string, string> = {
                  bus: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
                  tram: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
                  walk: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
                  car: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
                  bike: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
                  other: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
                };
                return (
                  <motion.div
                    key={tr.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="p-4 rounded-xl bg-gradient-to-r from-amber-50/40 to-transparent dark:from-amber-900/10 dark:to-transparent border border-amber-200/30 dark:border-amber-900/20"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`${typeColor[tr.transportType] || typeColor.other} text-xs`}>{typeIcon[tr.transportType] || typeIcon.other}{t(`transport.${tr.transportType}`)}</Badge>
                          {tr.routeNumber && <Badge variant="outline" className="text-xs">{t('transport.route')}: {tr.routeNumber}</Badge>}
                          {tr.distanceKm != null && <Badge variant="outline" className="text-xs">{t('transport.distance_km', { count: tr.distanceKm })}</Badge>}
                        </div>
                        <div className="flex items-center gap-3 mt-2 flex-wrap text-xs text-gray-600 dark:text-gray-400">
                          {tr.stopName && <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3 text-amber-500" />{tr.stopName}</span>}
                          {tr.pickupTime && <span className="flex items-center gap-1.5"><Clock className="h-3 w-3 text-emerald-500" />{t('transport.pickup')}: {tr.pickupTime}</span>}
                          {tr.dropoffTime && <span className="flex items-center gap-1.5"><Clock className="h-3 w-3 text-rose-500" />{t('transport.dropoff')}: {tr.dropoffTime}</span>}
                        </div>
                        {(tr.driverName || tr.driverPhone) && (
                          <div className="flex items-center gap-3 mt-2 flex-wrap text-xs text-gray-600 dark:text-gray-400">
                            {tr.driverName && <span className="flex items-center gap-1.5"><User className="h-3 w-3 text-violet-500" />{tr.driverName}</span>}
                            {tr.driverPhone && (
                              <span className="flex items-center gap-1.5">
                                <Phone className="h-3 w-3 text-amber-500" />{tr.driverPhone}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="rounded-lg text-amber-600 hover:text-amber-700 min-h-[44px] min-w-[44px] p-0 h-6 w-6"
                                  title={t('transport.quick_call')}
                                  onClick={() => toast.success(`${t('transport.driver_phone')}: ${tr.driverPhone}`)}
                                >
                                  <PhoneCall className="h-3 w-3" />
                                </Button>
                              </span>
                            )}
                          </div>
                        )}
                        {tr.notes && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">{tr.notes}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-lg min-h-[44px] min-w-[44px]"
                          onClick={() => {
                            setTransportEditId(tr.id);
                            setTransportForm({
                              transportType: tr.transportType,
                              routeNumber: tr.routeNumber ?? '',
                              stopName: tr.stopName ?? '',
                              pickupTime: tr.pickupTime ?? '',
                              dropoffTime: tr.dropoffTime ?? '',
                              driverName: tr.driverName ?? '',
                              driverPhone: tr.driverPhone ?? '',
                              distanceKm: tr.distanceKm != null ? String(tr.distanceKm) : '',
                              notes: tr.notes ?? '',
                            });
                            setTransportDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-lg text-red-500 hover:text-red-700 min-h-[44px] min-w-[44px]"
                          onClick={async () => {
                            try {
                              await apiDelete(`/api/student-transport/${tr.id}`);
                              setTransports((prev) => prev.filter((t) => t.id !== tr.id));
                              toast.success(t('action.delete'));
                            } catch { toast.error(t('error.generic')); }
                          }}
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
        </CardContent>
      </Card>

      {/* ─── Health Records Section ─────────────────────────────────── */}
      <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-rose-500 overflow-hidden">
        <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-rose-50/50 to-transparent dark:from-rose-900/10 dark:to-transparent">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
                <HeartPulse className="h-4 w-4" />
              </div>
              {t('health.title')}
              {healthRecord?.isConfidential && (
                <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400 text-xs flex items-center gap-1">
                  <EyeOff className="h-3 w-3" />{t('health.confidential')}
                </Badge>
              )}
              {!healthRecord && <Badge className="bg-gray-100 text-gray-500 dark:bg-gray-900/30 dark:text-gray-400 text-xs">0</Badge>}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 min-h-[44px]"
              onClick={() => {
                if (healthRecord) {
                  setHealthEditId(healthRecord.id);
                  const parsedAllergies = healthRecord.allergies ? JSON.parse(healthRecord.allergies) : [];
                  const parsedMedications = healthRecord.medications ? JSON.parse(healthRecord.medications) : [];
                  const parsedConditions = healthRecord.conditions ? JSON.parse(healthRecord.conditions) : [];
                  setHealthForm({
                    bloodType: healthRecord.bloodType ?? '',
                    allergies: parsedAllergies.join(', '),
                    medications: parsedMedications.map((m: { name: string; dosage: string; frequency: string }) => `${m.name} (${m.dosage}, ${m.frequency})`).join('; '),
                    conditions: parsedConditions.join(', '),
                    doctorName: healthRecord.doctorName ?? '',
                    doctorPhone: healthRecord.doctorPhone ?? '',
                    insuranceNumber: healthRecord.insuranceNumber ?? '',
                    insuranceProvider: healthRecord.insuranceProvider ?? '',
                    lastCheckup: healthRecord.lastCheckup ? new Date(healthRecord.lastCheckup).toISOString().split('T')[0] : '',
                    notes: healthRecord.notes ?? '',
                    isConfidential: healthRecord.isConfidential,
                  });
                } else {
                  setHealthEditId(null);
                  setHealthForm({ bloodType: '', allergies: '', medications: '', conditions: '', doctorName: '', doctorPhone: '', insuranceNumber: '', insuranceProvider: '', lastCheckup: '', notes: '', isConfidential: true });
                }
                setHealthDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              {healthRecord ? t('health.edit') : t('health.add')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!healthRecord ? (
            <div className="text-center py-8">
              <HeartPulse className="h-8 w-8 text-rose-400 dark:text-rose-500 mx-auto mb-2" />
              <p className="text-gray-500 dark:text-gray-400">{t('health.no_record')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Blood Type */}
                {healthRecord.bloodType && (
                  <div className="p-3 rounded-xl bg-gradient-to-r from-rose-50/40 to-transparent dark:from-rose-900/10 dark:to-transparent border border-rose-200/30 dark:border-rose-900/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Droplets className="h-3.5 w-3.5 text-rose-500" />
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('health.blood_type')}</span>
                    </div>
                    <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 text-sm font-bold">{healthRecord.bloodType}</Badge>
                  </div>
                )}

                {/* Last Checkup */}
                {healthRecord.lastCheckup && (
                  <div className="p-3 rounded-xl bg-gradient-to-r from-teal-50/40 to-transparent dark:from-teal-900/10 dark:to-transparent border border-teal-200/30 dark:border-teal-900/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Stethoscope className="h-3.5 w-3.5 text-teal-500" />
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('health.last_checkup')}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{new Date(healthRecord.lastCheckup).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              {/* Allergies */}
              {healthRecord.allergies && (() => {
                const allergies: string[] = JSON.parse(healthRecord.allergies);
                if (allergies.length === 0) return null;
                return (
                  <div className="p-3 rounded-xl bg-gradient-to-r from-amber-50/40 to-transparent dark:from-amber-900/10 dark:to-transparent border border-amber-200/30 dark:border-amber-900/20">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                      <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">{t('health.allergies')}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {allergies.map((a, i) => (
                        <Badge key={i} className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-xs">{a}</Badge>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Medications */}
              {healthRecord.medications && (() => {
                const medications: Array<{ name: string; dosage: string; frequency: string }> = JSON.parse(healthRecord.medications);
                if (medications.length === 0) return null;
                return (
                  <div className="p-3 rounded-xl bg-gradient-to-r from-violet-50/40 to-transparent dark:from-violet-900/10 dark:to-transparent border border-violet-200/30 dark:border-violet-900/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Pill className="h-3.5 w-3.5 text-violet-500" />
                      <span className="text-xs font-semibold text-violet-700 dark:text-violet-300">{t('health.medications')}</span>
                    </div>
                    <div className="space-y-1.5">
                      {medications.map((m, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 text-xs">{m.name}</Badge>
                          {m.dosage && <span className="text-gray-500 dark:text-gray-400">{t('health.dosage')}: {m.dosage}</span>}
                          {m.frequency && <span className="text-gray-500 dark:text-gray-400">{t('health.frequency')}: {m.frequency}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Conditions */}
              {healthRecord.conditions && (() => {
                const conditions: string[] = JSON.parse(healthRecord.conditions);
                if (conditions.length === 0) return null;
                return (
                  <div className="p-3 rounded-xl bg-gradient-to-r from-rose-50/40 to-transparent dark:from-rose-900/10 dark:to-transparent border border-rose-200/30 dark:border-rose-900/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="h-3.5 w-3.5 text-rose-500" />
                      <span className="text-xs font-semibold text-rose-700 dark:text-rose-300">{t('health.conditions')}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {conditions.map((c, i) => (
                        <Badge key={i} className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 text-xs">{c}</Badge>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Doctor & Insurance */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(healthRecord.doctorName || healthRecord.doctorPhone) && (
                  <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-50/40 to-transparent dark:from-emerald-900/10 dark:to-transparent border border-emerald-200/30 dark:border-emerald-900/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Stethoscope className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('health.doctor')}</span>
                    </div>
                    {healthRecord.doctorName && <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{healthRecord.doctorName}</p>}
                    {healthRecord.doctorPhone && (
                      <span className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 mt-1">
                        <Phone className="h-3 w-3 text-emerald-500" />{healthRecord.doctorPhone}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-lg text-emerald-600 hover:text-emerald-700 min-h-[44px] min-w-[44px] p-0 h-6 w-6"
                          onClick={() => toast.success(`${t('health.doctor_phone')}: ${healthRecord.doctorPhone}`)}
                        >
                          <PhoneCall className="h-3 w-3" />
                        </Button>
                      </span>
                    )}
                  </div>
                )}
                {(healthRecord.insuranceNumber || healthRecord.insuranceProvider) && (
                  <div className="p-3 rounded-xl bg-gradient-to-r from-teal-50/40 to-transparent dark:from-teal-900/10 dark:to-transparent border border-teal-200/30 dark:border-teal-900/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="h-3.5 w-3.5 text-teal-500" />
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('health.insurance')}</span>
                    </div>
                    {healthRecord.insuranceProvider && <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{healthRecord.insuranceProvider}</p>}
                    {healthRecord.insuranceNumber && <p className="text-xs text-gray-500 dark:text-gray-400">{healthRecord.insuranceNumber}</p>}
                  </div>
                )}
              </div>

              {healthRecord.notes && (
                <p className="text-xs text-gray-500 dark:text-gray-400 italic p-3 rounded-xl bg-gray-50/50 dark:bg-gray-800/20">{healthRecord.notes}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Transportation Dialog ──────────────────────────────────── */}
      <Dialog open={transportDialogOpen} onOpenChange={setTransportDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{transportEditId ? t('transport.edit') : t('transport.add')}</DialogTitle>
            <DialogDescription>{t('transport.title')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-medium">{t('transport.type')}</Label>
              <Select value={transportForm.transportType} onValueChange={(v) => setTransportForm((f) => ({ ...f, transportType: v }))}>
                <SelectTrigger className="h-10 rounded-lg mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bus">{t('transport.bus')}</SelectItem>
                  <SelectItem value="tram">{t('transport.tram')}</SelectItem>
                  <SelectItem value="walk">{t('transport.walk')}</SelectItem>
                  <SelectItem value="car">{t('transport.car')}</SelectItem>
                  <SelectItem value="bike">{t('transport.bike')}</SelectItem>
                  <SelectItem value="other">{t('transport.other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium">{t('transport.route_number')}</Label>
                <Input value={transportForm.routeNumber} onChange={(e) => setTransportForm((f) => ({ ...f, routeNumber: e.target.value }))} className="mt-1 rounded-lg" placeholder="42" />
              </div>
              <div>
                <Label className="text-xs font-medium">{t('transport.stop_name')}</Label>
                <Input value={transportForm.stopName} onChange={(e) => setTransportForm((f) => ({ ...f, stopName: e.target.value }))} className="mt-1 rounded-lg" placeholder={t('transport.stop_name')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium">{t('transport.pickup_time')}</Label>
                <Input type="time" value={transportForm.pickupTime} onChange={(e) => setTransportForm((f) => ({ ...f, pickupTime: e.target.value }))} className="mt-1 rounded-lg" />
              </div>
              <div>
                <Label className="text-xs font-medium">{t('transport.dropoff_time')}</Label>
                <Input type="time" value={transportForm.dropoffTime} onChange={(e) => setTransportForm((f) => ({ ...f, dropoffTime: e.target.value }))} className="mt-1 rounded-lg" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium">{t('transport.driver_name')}</Label>
                <Input value={transportForm.driverName} onChange={(e) => setTransportForm((f) => ({ ...f, driverName: e.target.value }))} className="mt-1 rounded-lg" placeholder={t('transport.driver_name')} />
              </div>
              <div>
                <Label className="text-xs font-medium">{t('transport.driver_phone')}</Label>
                <Input value={transportForm.driverPhone} onChange={(e) => setTransportForm((f) => ({ ...f, driverPhone: e.target.value }))} className="mt-1 rounded-lg" placeholder="+49 123 456789" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium">{t('transport.distance_km_field')}</Label>
              <Input type="number" step="0.1" value={transportForm.distanceKm} onChange={(e) => setTransportForm((f) => ({ ...f, distanceKm: e.target.value }))} className="mt-1 rounded-lg" placeholder="2.5" />
            </div>
            <div>
              <Label className="text-xs font-medium">{t('transport.notes')}</Label>
              <Textarea value={transportForm.notes} onChange={(e) => setTransportForm((f) => ({ ...f, notes: e.target.value }))} className="mt-1 rounded-lg" rows={2} placeholder={t('transport.notes')} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl min-h-[44px]" onClick={() => setTransportDialogOpen(false)}>{t('action.cancel')}</Button>
            <Button
              className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white min-h-[44px]"
              onClick={async () => {
                try {
                  const payload = {
                    schoolId: currentUser?.schoolId,
                    studentId: currentStudentId,
                    transportType: transportForm.transportType,
                    routeNumber: transportForm.routeNumber || null,
                    stopName: transportForm.stopName || null,
                    pickupTime: transportForm.pickupTime || null,
                    dropoffTime: transportForm.dropoffTime || null,
                    driverName: transportForm.driverName || null,
                    driverPhone: transportForm.driverPhone || null,
                    distanceKm: transportForm.distanceKm ? parseFloat(transportForm.distanceKm) : null,
                    notes: transportForm.notes || null,
                  };
                  if (transportEditId) {
                    const updated = await apiPut<TransportData>(`/api/student-transport/${transportEditId}`, payload);
                    setTransports((prev) => prev.map((t) => t.id === transportEditId ? updated : t));
                  } else {
                    const created = await apiPost<TransportData>('/api/student-transport', payload);
                    setTransports((prev) => [created, ...prev]);
                  }
                  setTransportDialogOpen(false);
                  toast.success(transportEditId ? t('action.save') : t('action.create'));
                } catch { toast.error(t('error.generic')); }
              }}
            >
              {transportEditId ? t('action.save') : t('action.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Health Record Dialog ───────────────────────────────────── */}
      <Dialog open={healthDialogOpen} onOpenChange={setHealthDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{healthEditId ? t('health.edit') : t('health.add')}</DialogTitle>
            <DialogDescription>{t('health.title')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium">{t('health.blood_type')}</Label>
                <Select value={healthForm.bloodType || '_none'} onValueChange={(v) => setHealthForm((f) => ({ ...f, bloodType: v === '_none' ? '' : v }))}>
                  <SelectTrigger className="h-10 rounded-lg mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">—</SelectItem>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium">{t('health.last_checkup_date')}</Label>
                <Input type="date" value={healthForm.lastCheckup} onChange={(e) => setHealthForm((f) => ({ ...f, lastCheckup: e.target.value }))} className="mt-1 rounded-lg" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium">{t('health.allergies')} <span className="text-gray-400 font-normal">({t('health.add_allergy')}: kommagetrennt)</span></Label>
              <Input value={healthForm.allergies} onChange={(e) => setHealthForm((f) => ({ ...f, allergies: e.target.value }))} className="mt-1 rounded-lg" placeholder="Peanuts, Penicillin, ..." />
            </div>
            <div>
              <Label className="text-xs font-medium">{t('health.conditions')} <span className="text-gray-400 font-normal">({t('health.add_condition')}: kommagetrennt)</span></Label>
              <Input value={healthForm.conditions} onChange={(e) => setHealthForm((f) => ({ ...f, conditions: e.target.value }))} className="mt-1 rounded-lg" placeholder="Asthma, Diabetes, ..." />
            </div>
            <div>
              <Label className="text-xs font-medium">{t('health.medications')} <span className="text-gray-400 font-normal">(Name, Dosierung, Häufigkeit; pro Zeile)</span></Label>
              <Textarea value={healthForm.medications} onChange={(e) => setHealthForm((f) => ({ ...f, medications: e.target.value }))} className="mt-1 rounded-lg" rows={3} placeholder="Aspirin, 500mg, 1x täglich&#10;Insulin, 10IE, 2x täglich" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium">{t('health.doctor_name')}</Label>
                <Input value={healthForm.doctorName} onChange={(e) => setHealthForm((f) => ({ ...f, doctorName: e.target.value }))} className="mt-1 rounded-lg" placeholder="Dr. Schmidt" />
              </div>
              <div>
                <Label className="text-xs font-medium">{t('health.doctor_phone')}</Label>
                <Input value={healthForm.doctorPhone} onChange={(e) => setHealthForm((f) => ({ ...f, doctorPhone: e.target.value }))} className="mt-1 rounded-lg" placeholder="+49 123 456789" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium">{t('health.insurance_provider')}</Label>
                <Input value={healthForm.insuranceProvider} onChange={(e) => setHealthForm((f) => ({ ...f, insuranceProvider: e.target.value }))} className="mt-1 rounded-lg" placeholder="AOK" />
              </div>
              <div>
                <Label className="text-xs font-medium">{t('health.insurance_number')}</Label>
                <Input value={healthForm.insuranceNumber} onChange={(e) => setHealthForm((f) => ({ ...f, insuranceNumber: e.target.value }))} className="mt-1 rounded-lg" placeholder="X123456789" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium">{t('health.notes')}</Label>
              <Textarea value={healthForm.notes} onChange={(e) => setHealthForm((f) => ({ ...f, notes: e.target.value }))} className="mt-1 rounded-lg" rows={2} placeholder={t('health.notes')} />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={healthForm.isConfidential}
                onChange={(e) => setHealthForm((f) => ({ ...f, isConfidential: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <Label className="text-xs font-medium flex items-center gap-1">{t('health.confidential_toggle')} <EyeOff className="h-3 w-3" /></Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl min-h-[44px]" onClick={() => setHealthDialogOpen(false)}>{t('action.cancel')}</Button>
            <Button
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white min-h-[44px]"
              onClick={async () => {
                try {
                  const allergiesArr = healthForm.allergies ? healthForm.allergies.split(',').map((s) => s.trim()).filter(Boolean) : [];
                  const conditionsArr = healthForm.conditions ? healthForm.conditions.split(',').map((s) => s.trim()).filter(Boolean) : [];
                  const medicationsArr = healthForm.medications
                    ? healthForm.medications.split('\n').map((line) => {
                        const parts = line.split(',').map((s) => s.trim());
                        return { name: parts[0] || '', dosage: parts[1] || '', frequency: parts[2] || '' };
                      }).filter((m) => m.name)
                    : [];
                  const payload = {
                    schoolId: currentUser?.schoolId,
                    studentId: currentStudentId,
                    bloodType: healthForm.bloodType || null,
                    allergies: allergiesArr.length > 0 ? allergiesArr : null,
                    medications: medicationsArr.length > 0 ? medicationsArr : null,
                    conditions: conditionsArr.length > 0 ? conditionsArr : null,
                    doctorName: healthForm.doctorName || null,
                    doctorPhone: healthForm.doctorPhone || null,
                    insuranceNumber: healthForm.insuranceNumber || null,
                    insuranceProvider: healthForm.insuranceProvider || null,
                    lastCheckup: healthForm.lastCheckup || null,
                    notes: healthForm.notes || null,
                    isConfidential: healthForm.isConfidential,
                  };
                  if (healthEditId) {
                    const updated = await apiPut<HealthRecordData>(`/api/health-records/${healthEditId}`, payload);
                    setHealthRecord(updated);
                  } else {
                    const created = await apiPost<HealthRecordData>('/api/health-records', payload);
                    setHealthRecord(created);
                  }
                  setHealthDialogOpen(false);
                  toast.success(healthEditId ? t('action.save') : t('action.create'));
                } catch { toast.error(t('error.generic')); }
              }}
            >
              {healthEditId ? t('action.save') : t('action.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Self-Assessment Dialog ───────────────────────────────── */}
      <Dialog open={saDialogOpen} onOpenChange={setSaDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{saEditId ? t('self_assessment.edit') : t('self_assessment.create')}</DialogTitle>
            <DialogDescription>{t('self_assessment.title')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-medium">{t('self_assessment.competency')}</Label>
              <Select value={saForm.competencyId} onValueChange={(v) => setSaForm((f) => ({ ...f, competencyId: v }))}>
                <SelectTrigger className="h-10 rounded-lg mt-1">
                  <SelectValue placeholder={t('self_assessment.competency')} />
                </SelectTrigger>
                <SelectContent>
                  {data?.progressEntries.map((pe) => (
                    <SelectItem key={pe.competency.id} value={pe.competency.id}>
                      {pe.competency.code} — {pe.competency.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium">{t('self_assessment.self_level')} ({saForm.selfLevel}/6)</Label>
              <Slider
                value={[saForm.selfLevel]}
                onValueChange={([v]) => setSaForm((f) => ({ ...f, selfLevel: v }))}
                min={1}
                max={6}
                step={1}
                className="mt-2"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span>
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium">{t('self_assessment.confidence')} ({saForm.confidence}/5)</Label>
              <Slider
                value={[saForm.confidence]}
                onValueChange={([v]) => setSaForm((f) => ({ ...f, confidence: v }))}
                min={1}
                max={5}
                step={1}
                className="mt-2"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium">{t('self_assessment.reflection')}</Label>
              <Textarea
                value={saForm.reflection}
                onChange={(e) => setSaForm((f) => ({ ...f, reflection: e.target.value }))}
                className="mt-1 rounded-lg"
                rows={3}
                placeholder={t('self_assessment.reflection')}
              />
            </div>
            <div>
              <Label className="text-xs font-medium">{t('self_assessment.evidence')}</Label>
              <Textarea
                value={saForm.evidence}
                onChange={(e) => setSaForm((f) => ({ ...f, evidence: e.target.value }))}
                className="mt-1 rounded-lg"
                rows={2}
                placeholder={t('self_assessment.evidence')}
              />
            </div>
            {learningGoals.length > 0 && (
              <div>
                <Label className="text-xs font-medium">{t('learning_goal.title')}</Label>
                <Select value={saForm.goalId} onValueChange={(v) => setSaForm((f) => ({ ...f, goalId: v }))}>
                  <SelectTrigger className="h-10 rounded-lg mt-1">
                    <SelectValue placeholder={t('learning_goal.title')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {learningGoals.filter((g) => g.status === 'active').map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl min-h-[44px]" onClick={() => setSaDialogOpen(false)}>{t('action.cancel')}</Button>
            <Button
              className="rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white min-h-[44px]"
              onClick={async () => {
                if (!saForm.competencyId) { toast.error(t('self_assessment.competency')); return; }
                try {
                  const payload = {
                    schoolId: currentUser?.schoolId,
                    studentId: currentStudentId,
                    competencyId: saForm.competencyId,
                    selfLevel: saForm.selfLevel,
                    confidence: saForm.confidence,
                    reflection: saForm.reflection || null,
                    evidence: saForm.evidence || null,
                    goalId: saForm.goalId && saForm.goalId !== 'none' ? saForm.goalId : null,
                  };
                  if (saEditId) {
                    const updated = await apiPut<SelfAssessmentData>(`/api/self-assessments/${saEditId}`, payload);
                    setSelfAssessments((prev) => prev.map((a) => a.id === saEditId ? updated : a));
                  } else {
                    const created = await apiPost<SelfAssessmentData>('/api/self-assessments', payload);
                    setSelfAssessments((prev) => [created, ...prev]);
                  }
                  setSaDialogOpen(false);
                  toast.success(saEditId ? t('action.save') : t('action.create'));
                } catch { toast.error(t('error.generic')); }
              }}
            >
              {saEditId ? t('action.save') : t('action.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Learning Goal Dialog ───────────────────────────────── */}
      <Dialog open={lgDialogOpen} onOpenChange={setLgDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{lgEditId ? t('learning_goal.edit') : t('learning_goal.create')}</DialogTitle>
            <DialogDescription>{t('learning_goal.title')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-medium">{t('learning_goal.goal_title')}</Label>
              <Input
                value={lgForm.title}
                onChange={(e) => setLgForm((f) => ({ ...f, title: e.target.value }))}
                className="mt-1 rounded-lg"
                placeholder={t('learning_goal.goal_title')}
              />
            </div>
            <div>
              <Label className="text-xs font-medium">{t('learning_goal.description')}</Label>
              <Textarea
                value={lgForm.description}
                onChange={(e) => setLgForm((f) => ({ ...f, description: e.target.value }))}
                className="mt-1 rounded-lg"
                rows={2}
                placeholder={t('learning_goal.description')}
              />
            </div>
            <div>
              <Label className="text-xs font-medium">{t('self_assessment.competency')}</Label>
              <Select value={lgForm.competencyId} onValueChange={(v) => setLgForm((f) => ({ ...f, competencyId: v }))}>
                <SelectTrigger className="h-10 rounded-lg mt-1">
                  <SelectValue placeholder={t('self_assessment.competency')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {data?.progressEntries.map((pe) => (
                    <SelectItem key={pe.competency.id} value={pe.competency.id}>
                      {pe.competency.code} — {pe.competency.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium">{t('learning_goal.current_level')}</Label>
                <Slider
                  value={[lgForm.currentLevel]}
                  onValueChange={([v]) => setLgForm((f) => ({ ...f, currentLevel: v }))}
                  min={1}
                  max={6}
                  step={1}
                  className="mt-2"
                />
                <p className="text-xs text-center mt-1 text-gray-500">{lgForm.currentLevel}/6</p>
              </div>
              <div>
                <Label className="text-xs font-medium">{t('learning_goal.target_level')}</Label>
                <Slider
                  value={[lgForm.targetLevel]}
                  onValueChange={([v]) => setLgForm((f) => ({ ...f, targetLevel: v }))}
                  min={1}
                  max={6}
                  step={1}
                  className="mt-2"
                />
                <p className="text-xs text-center mt-1 text-gray-500">{lgForm.targetLevel}/6</p>
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium">{t('learning_goal.deadline')}</Label>
              <Input
                type="date"
                value={lgForm.deadline}
                onChange={(e) => setLgForm((f) => ({ ...f, deadline: e.target.value }))}
                className="mt-1 rounded-lg"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">{t('learning_goal.progress')} ({lgForm.progress}%)</Label>
              <Slider
                value={[lgForm.progress]}
                onValueChange={([v]) => setLgForm((f) => ({ ...f, progress: v }))}
                min={0}
                max={100}
                step={5}
                className="mt-2"
              />
            </div>
            {lgEditId && (
              <div>
                <Label className="text-xs font-medium">{t('learning_goal.status')}</Label>
                <Select value={lgForm.status} onValueChange={(v) => setLgForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger className="h-10 rounded-lg mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t('learning_goal.active')}</SelectItem>
                    <SelectItem value="completed">{t('learning_goal.completed')}</SelectItem>
                    <SelectItem value="abandoned">{t('learning_goal.abandoned')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl min-h-[44px]" onClick={() => setLgDialogOpen(false)}>{t('action.cancel')}</Button>
            <Button
              className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white min-h-[44px]"
              onClick={async () => {
                if (!lgForm.title) { toast.error(t('learning_goal.goal_title')); return; }
                try {
                  const payload = {
                    schoolId: currentUser?.schoolId,
                    studentId: currentStudentId,
                    title: lgForm.title,
                    description: lgForm.description || null,
                    competencyId: lgForm.competencyId && lgForm.competencyId !== 'none' ? lgForm.competencyId : null,
                    targetLevel: lgForm.targetLevel,
                    currentLevel: lgForm.currentLevel,
                    deadline: lgForm.deadline || null,
                    status: lgForm.status,
                    progress: lgForm.progress,
                  };
                  if (lgEditId) {
                    const updated = await apiPut<LearningGoalData>(`/api/learning-goals/${lgEditId}`, payload);
                    setLearningGoals((prev) => prev.map((g) => g.id === lgEditId ? updated : g));
                  } else {
                    const created = await apiPost<LearningGoalData>('/api/learning-goals', payload);
                    setLearningGoals((prev) => [created, ...prev]);
                  }
                  setLgDialogOpen(false);
                  toast.success(lgEditId ? t('action.save') : t('action.create'));
                } catch { toast.error(t('error.generic')); }
              }}
            >
              {lgEditId ? t('action.save') : t('action.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Peer Assessment Dialog ───────────────────────────────── */}
      <Dialog open={paDialogOpen} onOpenChange={setPaDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('peer.create')}</DialogTitle>
            <DialogDescription>{t('peer.title')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-medium">{t('peer.assessment_type')}</Label>
              <Select value={paForm.assessmentType} onValueChange={(v) => setPaForm((f) => ({ ...f, assessmentType: v }))}>
                <SelectTrigger className="h-10 rounded-lg mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="competency">{t('peer.type_competency')}</SelectItem>
                  <SelectItem value="project">{t('peer.type_project')}</SelectItem>
                  <SelectItem value="presentation">{t('peer.type_presentation')}</SelectItem>
                  <SelectItem value="teamwork">{t('peer.type_teamwork')}</SelectItem>
                  <SelectItem value="behavior">{t('peer.type_behavior')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium">{t('peer.competency')}</Label>
              <Select value={paForm.competencyId} onValueChange={(v) => setPaForm((f) => ({ ...f, competencyId: v }))}>
                <SelectTrigger className="h-10 rounded-lg mt-1">
                  <SelectValue placeholder={t('peer.competency')} />
                </SelectTrigger>
                <SelectContent>
                  {data?.progressEntries.map((pe) => (
                    <SelectItem key={pe.competency.id} value={pe.competency.id}>
                      {pe.competency.code} — {pe.competency.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium">{t('peer.level')} ({paForm.level}/6)</Label>
              <Slider
                value={[paForm.level]}
                onValueChange={([v]) => setPaForm((f) => ({ ...f, level: v }))}
                min={1}
                max={6}
                step={1}
                className="mt-2"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span>
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium">{t('peer.comment')}</Label>
              <Textarea
                value={paForm.comment}
                onChange={(e) => setPaForm((f) => ({ ...f, comment: e.target.value }))}
                className="mt-1 rounded-lg"
                rows={3}
                placeholder={t('peer.comment')}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={paForm.isAnonymous}
                onChange={(e) => setPaForm((f) => ({ ...f, isAnonymous: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <Label className="text-xs font-medium">{t('peer.anonymous')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl min-h-[44px]" onClick={() => setPaDialogOpen(false)}>{t('action.cancel')}</Button>
            <Button
              className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white min-h-[44px]"
              onClick={async () => {
                if (!paForm.assessmentType) { toast.error(t('peer.assessment_type')); return; }
                try {
                  const payload = {
                    schoolId: currentUser?.schoolId,
                    assessorId: currentUser?.id,
                    assessedId: currentStudentId,
                    assessmentType: paForm.assessmentType,
                    competencyId: paForm.competencyId || null,
                    level: paForm.level,
                    comment: paForm.comment || null,
                    isAnonymous: paForm.isAnonymous,
                  };
                  const created = await apiPost<PeerAssessmentData>('/api/peer-assessments', payload);
                  setPeerAssessments((prev) => [created, ...prev]);
                  setPaDialogOpen(false);
                  toast.success(t('action.create'));
                } catch { toast.error(t('error.generic')); }
              }}
            >
              {t('action.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Emergency Contact Dialog ───────────────────────────────── */}
      <Dialog open={ecDialogOpen} onOpenChange={setEcDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{ecEditId ? t('emergency.edit') : t('emergency.add')}</DialogTitle>
            <DialogDescription>{t('emergency.title')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-medium">{t('emergency.name')}</Label>
              <Input
                value={ecForm.name}
                onChange={(e) => setEcForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1 rounded-lg"
                placeholder={t('emergency.name')}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium">{t('emergency.relationship')}</Label>
                <Select value={ecForm.relationship} onValueChange={(v) => setEcForm((f) => ({ ...f, relationship: v }))}>
                  <SelectTrigger className="h-10 rounded-lg mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mother">{t('emergency.mother')}</SelectItem>
                    <SelectItem value="father">{t('emergency.father')}</SelectItem>
                    <SelectItem value="guardian">{t('emergency.guardian')}</SelectItem>
                    <SelectItem value="grandparent">{t('emergency.grandparent')}</SelectItem>
                    <SelectItem value="other">{t('emergency.other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium">{t('emergency.priority')}</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={ecForm.priority}
                  onChange={(e) => setEcForm((f) => ({ ...f, priority: parseInt(e.target.value) || 1 }))}
                  className="mt-1 rounded-lg"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium">{t('emergency.phone')}</Label>
                <Input
                  value={ecForm.phone}
                  onChange={(e) => setEcForm((f) => ({ ...f, phone: e.target.value }))}
                  className="mt-1 rounded-lg"
                  placeholder="+49 123 456789"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">{t('emergency.phone_alt')}</Label>
                <Input
                  value={ecForm.phoneAlt}
                  onChange={(e) => setEcForm((f) => ({ ...f, phoneAlt: e.target.value }))}
                  className="mt-1 rounded-lg"
                  placeholder="+49 987 654321"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium">{t('emergency.email')}</Label>
              <Input
                type="email"
                value={ecForm.email}
                onChange={(e) => setEcForm((f) => ({ ...f, email: e.target.value }))}
                className="mt-1 rounded-lg"
                placeholder="name@example.com"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">{t('emergency.address')}</Label>
              <Input
                value={ecForm.address}
                onChange={(e) => setEcForm((f) => ({ ...f, address: e.target.value }))}
                className="mt-1 rounded-lg"
                placeholder={t('emergency.address')}
              />
            </div>
            <div>
              <Label className="text-xs font-medium">{t('emergency.notes')}</Label>
              <Textarea
                value={ecForm.notes}
                onChange={(e) => setEcForm((f) => ({ ...f, notes: e.target.value }))}
                className="mt-1 rounded-lg"
                rows={2}
                placeholder={t('emergency.notes')}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={ecForm.isPrimary}
                onChange={(e) => setEcForm((f) => ({ ...f, isPrimary: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <Label className="text-xs font-medium">{t('emergency.primary')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl min-h-[44px]" onClick={() => setEcDialogOpen(false)}>{t('action.cancel')}</Button>
            <Button
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white min-h-[44px]"
              onClick={async () => {
                if (!ecForm.name || !ecForm.phone) { toast.error(t('emergency.name') + ' & ' + t('emergency.phone')); return; }
                try {
                  const payload = {
                    schoolId: currentUser?.schoolId,
                    studentId: currentStudentId,
                    name: ecForm.name,
                    relationship: ecForm.relationship,
                    phone: ecForm.phone,
                    phoneAlt: ecForm.phoneAlt || null,
                    email: ecForm.email || null,
                    address: ecForm.address || null,
                    isPrimary: ecForm.isPrimary,
                    priority: ecForm.priority,
                    notes: ecForm.notes || null,
                  };
                  if (ecEditId) {
                    const updated = await apiPut<EmergencyContactData>(`/api/emergency-contacts/${ecEditId}`, payload);
                    setEmergencyContacts((prev) => prev.map((c) => c.id === ecEditId ? updated : c));
                  } else {
                    const created = await apiPost<EmergencyContactData>('/api/emergency-contacts', payload);
                    setEmergencyContacts((prev) => [created, ...prev]);
                  }
                  setEcDialogOpen(false);
                  toast.success(ecEditId ? t('action.save') : t('action.create'));
                } catch { toast.error(t('error.generic')); }
              }}
            >
              {ecEditId ? t('action.save') : t('action.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Avatar Upload Dialog */}
      <Dialog open={avatarUploadOpen} onOpenChange={setAvatarUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('avatar.upload')}</DialogTitle>
            <DialogDescription>{t('avatar.change')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <StudentAvatar
                firstName={student?.firstName ?? ''}
                lastName={student?.lastName ?? ''}
                avatarUrl={avatarUrlInput || student?.avatarUrl}
                size="xl"
              />
              <div className="flex-1">
                <Label className="text-sm font-medium">URL</Label>
                <Input
                  value={avatarUrlInput}
                  onChange={(e) => setAvatarUrlInput(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {useAppStore.getState().locale === 'de' ? 'Geben Sie eine URL für das Schülerfoto ein.' : 'Enter a URL for the student photo.'}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAvatarUploadOpen(false); setAvatarUrlInput(''); }} className="min-h-[44px]">{t('action.cancel')}</Button>
            <Button
              onClick={async () => {
                if (!student?.id) return;
                setAvatarUploading(true);
                try {
                  await apiPut(`/api/students/${student.id}`, { avatarUrl: avatarUrlInput || null });
                  toast.success(t('toast.saved'));
                  setAvatarUploadOpen(false);
                  setAvatarUrlInput('');
                  // Reload student detail
                  if (currentStudentId) {
                    const fresh = await fetchStudentDetail(currentStudentId);
                    setData(fresh);
                  }
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : t('error.generic'));
                } finally {
                  setAvatarUploading(false);
                }
              }}
              disabled={avatarUploading}
              className="min-h-[44px] bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
            >
              {avatarUploading ? '...' : t('action.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
