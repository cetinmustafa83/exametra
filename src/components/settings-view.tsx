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
  Leaf,
  DatabaseIcon,
  Upload,
  FileDown,
  FileUp,
  Loader2,
  ClipboardCheck,
  CalendarDays,
  HardDrive,
  Archive,
  RotateCcw,
  Volume2,
  VolumeX,
  Bell,
  MapPin,
  Building2,
  ArrowRightLeft,
  TrendingDown,
  ArrowUpRight,
  Palette,
  Eye,
  Send,
  Globe,
  FileJson,
  FileType,
  Phone,
  PhoneCall,
  AlertCircle,
  Star,
  Printer,
  Trophy,
  Award,
  Target,
  CalendarCheck,
  Flame,
  MessageSquare,
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
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { toast } from 'sonner';
import { getNotificationSoundPref, setNotificationSoundPref, playNotificationSound } from '@/lib/websocket';

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
  createStudentUserAccount,
  bulkCreateStudentAccounts,
  fetchStudents,
  type School as SchoolType,
  type SchoolYear,
  type Subject,
  type AuditLogEntry,
  type UserAccount,
  exportAuditLogCsv,
  type SchoolDistrictData,
  fetchDistricts,
  createDistrict,
  updateDistrict,
  deleteDistrict,
  fetchDistrictSchools,
  assignSchoolToDistrict,
  fetchEmailTemplates,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  sendTestEmail,
  fetchEmailLogs,
  type EmailTemplate,
  type EmailLog,
  fetchBadges,
  createBadge,
  updateBadge,
  deleteBadge,
  fetchStudentBadges,
  awardBadgeToStudent,
  type BadgeData,
  type StudentBadgeData,
  seedBadges,
} from '@/lib/api';
import { RateLimitStatus } from '@/components/offline-indicator';

// ─── Emergency Contact Data Type ─────────────────────────────────────
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

// ─── Emergency Contacts Manager Component ────────────────────────────
function EmergencyContactsManager({ schoolId }: { schoolId: string }) {
  const [contacts, setContacts] = useState<EmergencyContactData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [ecDialogOpen, setEcDialogOpen] = useState(false);
  const [ecEditId, setEcEditId] = useState<string | null>(null);
  const [ecForm, setEcForm] = useState({ studentId: '', name: '', relationship: 'mother', phone: '', phoneAlt: '', email: '', address: '', isPrimary: false, priority: 1, notes: '' });

  const loadContacts = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const data = await apiGet<EmergencyContactData[]>(`/api/emergency-contacts?schoolId=${schoolId}`);
      setContacts(data);
    } catch { /* ignore */ }
    setLoading(false);
  }, [schoolId]);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  const filtered = contacts.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-rose-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('emergency.search')}
            className="pl-10 rounded-xl border-rose-200/50 dark:border-rose-900/30"
          />
        </div>
        <Button
          className="bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-xl min-h-[44px]"
          onClick={() => {
            setEcEditId(null);
            setEcForm({ studentId: '', name: '', relationship: 'mother', phone: '', phoneAlt: '', email: '', address: '', isPrimary: false, priority: 1, notes: '' });
            setEcDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" />
          {t('emergency.add')}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-rose-400 dark:text-rose-500 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">{t('emergency.no_contacts')}</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto scrollbar-education">
          {filtered.map((ec) => {
            const relLabel = t(`emergency.${ec.relationship}`) || ec.relationship;
            return (
              <div key={ec.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50/50 dark:bg-gray-800/30 border border-gray-100/60 dark:border-gray-800/40 hover:border-rose-200/60 dark:hover:border-rose-800/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 shrink-0">
                    {ec.isPrimary ? <Star className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{ec.name}</span>
                      <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 text-[10px]">{relLabel}</Badge>
                      {ec.isPrimary && <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-[10px]"><Star className="h-2.5 w-2.5 mr-0.5" />{t('emergency.primary')}</Badge>}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                      <span>{t('emergency.student')}: {ec.student.firstName} {ec.student.lastName}</span>
                      <span className="text-rose-500">{ec.phone}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="rounded-lg min-h-[44px] min-w-[44px]" onClick={() => {
                    setEcEditId(ec.id);
                    setEcForm({ studentId: ec.studentId, name: ec.name, relationship: ec.relationship, phone: ec.phone, phoneAlt: ec.phoneAlt ?? '', email: ec.email ?? '', address: ec.address ?? '', isPrimary: ec.isPrimary, priority: ec.priority, notes: ec.notes ?? '' });
                    setEcDialogOpen(true);
                  }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="sm" className="rounded-lg text-red-500 hover:text-red-700 min-h-[44px] min-w-[44px]" onClick={async () => {
                    try { await apiDelete(`/api/emergency-contacts/${ec.id}`); setContacts((prev) => prev.filter((c) => c.id !== ec.id)); toast.success(t('action.delete')); } catch { toast.error(t('error.generic')); }
                  }}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={ecDialogOpen} onOpenChange={setEcDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{ecEditId ? t('emergency.edit') : t('emergency.add')}</DialogTitle>
            <DialogDescription>{t('emergency.title')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-medium">{t('emergency.name')}</Label>
              <Input value={ecForm.name} onChange={(e) => setEcForm((f) => ({ ...f, name: e.target.value }))} className="mt-1 rounded-lg" placeholder={t('emergency.name')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium">{t('emergency.relationship')}</Label>
                <Select value={ecForm.relationship} onValueChange={(v) => setEcForm((f) => ({ ...f, relationship: v }))}>
                  <SelectTrigger className="h-10 rounded-lg mt-1"><SelectValue /></SelectTrigger>
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
                <Input type="number" min={1} max={10} value={ecForm.priority} onChange={(e) => setEcForm((f) => ({ ...f, priority: parseInt(e.target.value) || 1 }))} className="mt-1 rounded-lg" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium">{t('emergency.phone')}</Label>
                <Input value={ecForm.phone} onChange={(e) => setEcForm((f) => ({ ...f, phone: e.target.value }))} className="mt-1 rounded-lg" placeholder="+49 123 456789" />
              </div>
              <div>
                <Label className="text-xs font-medium">{t('emergency.phone_alt')}</Label>
                <Input value={ecForm.phoneAlt} onChange={(e) => setEcForm((f) => ({ ...f, phoneAlt: e.target.value }))} className="mt-1 rounded-lg" placeholder="+49 987 654321" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium">{t('emergency.email')}</Label>
              <Input type="email" value={ecForm.email} onChange={(e) => setEcForm((f) => ({ ...f, email: e.target.value }))} className="mt-1 rounded-lg" placeholder="name@example.com" />
            </div>
            <div>
              <Label className="text-xs font-medium">{t('emergency.address')}</Label>
              <Input value={ecForm.address} onChange={(e) => setEcForm((f) => ({ ...f, address: e.target.value }))} className="mt-1 rounded-lg" />
            </div>
            <div>
              <Label className="text-xs font-medium">{t('emergency.notes')}</Label>
              <Input value={ecForm.notes} onChange={(e) => setEcForm((f) => ({ ...f, notes: e.target.value }))} className="mt-1 rounded-lg" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={ecForm.isPrimary} onChange={(e) => setEcForm((f) => ({ ...f, isPrimary: e.target.checked }))} className="rounded border-gray-300" />
              <Label className="text-xs font-medium">{t('emergency.primary')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl min-h-[44px]" onClick={() => setEcDialogOpen(false)}>{t('action.cancel')}</Button>
            <Button className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white min-h-[44px]" onClick={async () => {
              if (!ecForm.name || !ecForm.phone || !ecForm.studentId) { toast.error(t('emergency.name') + ' & ' + t('emergency.phone')); return; }
              try {
                const payload = { schoolId, studentId: ecForm.studentId, name: ecForm.name, relationship: ecForm.relationship, phone: ecForm.phone, phoneAlt: ecForm.phoneAlt || null, email: ecForm.email || null, address: ecForm.address || null, isPrimary: ecForm.isPrimary, priority: ecForm.priority, notes: ecForm.notes || null };
                if (ecEditId) {
                  await apiPut(`/api/emergency-contacts/${ecEditId}`, payload);
                } else {
                  await apiPost('/api/emergency-contacts', payload);
                }
                setEcDialogOpen(false);
                loadContacts();
                toast.success(ecEditId ? t('action.save') : t('action.create'));
              } catch { toast.error(t('error.generic')); }
            }}>{ecEditId ? t('action.save') : t('action.create')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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

// ─── Notification Sound Setting Component ─────────────────────────────

function NotificationSoundSetting() {
  const [enabled, setEnabled] = useState(getNotificationSoundPref());

  const handleToggle = () => {
    const newValue = !enabled;
    setEnabled(newValue);
    setNotificationSoundPref(newValue);
    if (newValue) {
      playNotificationSound();
    }
    toast.success(newValue ? t('settings.notification_sound_enabled') : t('settings.notification_sound_disabled'));
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
          {enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {t('settings.notification_sound')}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('settings.notification_sound_desc')}
          </p>
        </div>
      </div>
      <Switch checked={enabled} onCheckedChange={handleToggle} />
    </div>
  );
}

// ─── Badge Management Tab Component ─────────────────────────────────────
function BadgeManagementTab() {
  const currentUser = useAppStore((s) => s.currentUser);
  const [badges, setBadges] = useState<BadgeData[]>([]);
  const [studentBadges, setStudentBadges] = useState<StudentBadgeData[]>([]);
  const [students, setStudentsList] = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [createBadgeOpen, setCreateBadgeOpen] = useState(false);
  const [awardBadgeOpen, setAwardBadgeOpen] = useState(false);
  const [newBadgeForm, setNewBadgeForm] = useState({
    name: '', description: '', icon: 'Award', color: '#10b981',
    category: 'achievement', requirementType: 'custom', requirementValue: 5, isAuto: true,
  });
  const [awardForm, setAwardForm] = useState({ studentId: '', badgeId: '', notes: '' });

  const categoryOptions = [
    { value: 'competency', label: t('badges.competency') },
    { value: 'attendance', label: t('badges.attendance') },
    { value: 'behavior', label: t('badges.behavior') },
    { value: 'achievement', label: t('badges.achievement') },
    { value: 'milestone', label: t('badges.milestone') },
  ];
  const reqTypeOptions = [
    { value: 'mastery_level', label: 'Mastery Level' },
    { value: 'attendance_rate', label: 'Attendance Rate' },
    { value: 'behavior_count', label: 'Behavior Count' },
    { value: 'progress_entries', label: 'Progress Entries' },
    { value: 'custom', label: 'Custom' },
  ];
  const iconOptions = ['Award', 'Star', 'Trophy', 'Target', 'CalendarCheck', 'TrendingUp', 'BookOpen', 'Pencil', 'ClipboardCheck', 'Leaf', 'Heart', 'Zap', 'Rocket', 'Flame'];

  const loadBadges = useCallback(async () => {
    if (!currentUser?.schoolId) return;
    setLoading(true);
    try {
      // Seed default badges first
      await seedBadges(currentUser.schoolId);
      const data = await fetchBadges(currentUser.schoolId);
      setBadges(data);
      const sbData = await fetchStudentBadges(currentUser.schoolId);
      setStudentBadges(sbData);
      const stuData = await fetchStudents(currentUser.schoolId);
      setStudentsList(stuData.map(s => ({ id: s.id, firstName: s.firstName, lastName: s.lastName })));
    } catch { /* ignore */ }
    setLoading(false);
  }, [currentUser?.schoolId]);

  useEffect(() => { loadBadges(); }, [loadBadges]);

  const handleCreateBadge = async () => {
    if (!currentUser?.schoolId || !newBadgeForm.name) return;
    try {
      await createBadge({ schoolId: currentUser.schoolId, ...newBadgeForm });
      toast.success(t('badges.create'));
      setCreateBadgeOpen(false);
      setNewBadgeForm({ name: '', description: '', icon: 'Award', color: '#10b981', category: 'achievement', requirementType: 'custom', requirementValue: 5, isAuto: true });
      loadBadges();
    } catch { toast.error(t('error.generic')); }
  };

  const handleAwardBadge = async () => {
    if (!currentUser?.schoolId || !awardForm.studentId || !awardForm.badgeId) return;
    try {
      await awardBadgeToStudent({ schoolId: currentUser.schoolId, studentId: awardForm.studentId, badgeId: awardForm.badgeId, notes: awardForm.notes });
      toast.success(t('badges.award'));
      setAwardBadgeOpen(false);
      setAwardForm({ studentId: '', badgeId: '', notes: '' });
      loadBadges();
    } catch { toast.error(t('error.generic')); }
  };

  const handleDeleteBadge = async (id: string) => {
    try {
      await deleteBadge(id);
      toast.success(t('badges.delete'));
      loadBadges();
    } catch { toast.error(t('error.generic')); }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-amber-500" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Badge Statistics */}
      <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-amber-500 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-900/10 dark:to-transparent">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                <Trophy className="h-4 w-4" />
              </div>
              {t('badges.statistics')}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="rounded-xl min-h-[44px]" onClick={() => setAwardBadgeOpen(true)}>
                <Award className="h-4 w-4 mr-1" />
                {t('badges.award_manually')}
              </Button>
              <Button size="sm" className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white min-h-[44px]" onClick={() => setCreateBadgeOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                {t('badges.create')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-900/10 border border-amber-200/30 dark:border-amber-900/20 text-center">
              <Trophy className="h-5 w-5 text-amber-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{badges.length}</p>
              <p className="text-[10px] uppercase tracking-wider text-amber-600/60 dark:text-amber-400/40">{t('badges.title')}</p>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-900/10 border border-emerald-200/30 dark:border-emerald-900/20 text-center">
              <Award className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{studentBadges.length}</p>
              <p className="text-[10px] uppercase tracking-wider text-emerald-600/60 dark:text-emerald-400/40">{t('badges.earned')}</p>
            </div>
            <div className="p-4 rounded-xl bg-teal-50/60 dark:bg-teal-900/10 border border-teal-200/30 dark:border-teal-900/20 text-center">
              <Star className="h-5 w-5 text-teal-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-teal-700 dark:text-teal-300">{badges.filter(b => b.isAuto).length}</p>
              <p className="text-[10px] uppercase tracking-wider text-teal-600/60 dark:text-teal-400/40">{t('badges.auto')}</p>
            </div>
          </div>

          {/* Badge List */}
          <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-education">
            {badges.map((badge) => {
              const awardedCount = badge._count?.studentBadges ?? 0;
              return (
                <div key={badge.id} className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
                  <div className="flex items-center gap-3">
                    <div className="badge-circle badge-earned" style={{ background: `linear-gradient(135deg, ${badge.color}cc, ${badge.color}88)`, width: 40, height: 40 }}>
                      <Award className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{badge.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{badge.description}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">{t(`badges.${badge.category}`)}</Badge>
                        {badge.isAuto && <Badge className="text-[10px] bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">{t('badges.auto')}</Badge>}
                        <Badge className="text-[10px] bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">{awardedCount} {t('badges.earned')}</Badge>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg min-h-[44px]" onClick={() => handleDeleteBadge(badge.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Create Badge Dialog */}
      <Dialog open={createBadgeOpen} onOpenChange={setCreateBadgeOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-600" />
              {t('badges.create')}
            </DialogTitle>
            <DialogDescription>{t('badges.create')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">{t('label.name')}</Label>
              <Input value={newBadgeForm.name} onChange={(e) => setNewBadgeForm(f => ({ ...f, name: e.target.value }))} placeholder={t('badges.name' in {} ? 'badges.name' : 'label.name')} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">{t('label.description')}</Label>
              <Input value={newBadgeForm.description} onChange={(e) => setNewBadgeForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">{t('badges.icon')}</Label>
                <Select value={newBadgeForm.icon} onValueChange={(v) => setNewBadgeForm(f => ({ ...f, icon: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {iconOptions.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">{t('badges.color')}</Label>
                <Input type="color" value={newBadgeForm.color} onChange={(e) => setNewBadgeForm(f => ({ ...f, color: e.target.value }))} className="h-10" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">{t('badges.category')}</Label>
                <Select value={newBadgeForm.category} onValueChange={(v) => setNewBadgeForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">{t('badges.type')}</Label>
                <Select value={newBadgeForm.requirementType} onValueChange={(v) => setNewBadgeForm(f => ({ ...f, requirementType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {reqTypeOptions.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">{t('badges.threshold')}</Label>
                <Input type="number" value={newBadgeForm.requirementValue} onChange={(e) => setNewBadgeForm(f => ({ ...f, requirementValue: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="flex items-end gap-2 pb-2">
                <input type="checkbox" checked={newBadgeForm.isAuto} onChange={(e) => setNewBadgeForm(f => ({ ...f, isAuto: e.target.checked }))} className="rounded" />
                <Label className="text-xs font-medium">{t('badges.is_auto')}</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setCreateBadgeOpen(false)}>{t('action.cancel')}</Button>
            <Button className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white" onClick={handleCreateBadge}>{t('badges.create')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Award Badge Dialog */}
      <Dialog open={awardBadgeOpen} onOpenChange={setAwardBadgeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-600" />
              {t('badges.award_manually')}
            </DialogTitle>
            <DialogDescription>{t('badges.award')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">{t('label.student_count')}</Label>
              <Select value={awardForm.studentId} onValueChange={(v) => setAwardForm(f => ({ ...f, studentId: v }))}>
                <SelectTrigger><SelectValue placeholder={t('action.select')} /></SelectTrigger>
                <SelectContent className="max-h-48">
                  {students.map(s => <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">{t('badges.title')}</Label>
              <Select value={awardForm.badgeId} onValueChange={(v) => setAwardForm(f => ({ ...f, badgeId: v }))}>
                <SelectTrigger><SelectValue placeholder={t('action.select')} /></SelectTrigger>
                <SelectContent className="max-h-48">
                  {badges.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">{t('label.note')}</Label>
              <Input value={awardForm.notes} onChange={(e) => setAwardForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setAwardBadgeOpen(false)}>{t('action.cancel')}</Button>
            <Button className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white" onClick={handleAwardBadge} disabled={!awardForm.studentId || !awardForm.badgeId}>{t('badges.award')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Privacy / DSGVO Tab Component ─────────────────────────────────────
function PrivacyTab({ currentUser }: { currentUser: { id: string; role: string; email: string; firstName: string; lastName: string } | null }) {
  const [exporting, setExporting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deletionStatus, setDeletionStatus] = useState<{ scheduledForDeletion: boolean; scheduledDeletionDate?: string; canCancel?: boolean } | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const loadDeletionStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/account-deletion');
      if (res.ok) {
        const data = await res.json();
        setDeletionStatus(data);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadDeletionStatus();
  }, [loadDeletionStatus]);

  const handleExportData = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/gdpr-export');
      if (!res.ok) throw new Error('Export failed');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `competencetrack-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(t('dsgvo.export_data_success'));
    } catch {
      toast.error(t('dsgvo.export_data_error'));
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/account-deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'Wrong password') {
          toast.error(t('dsgvo.delete_wrong_password'));
        } else {
          toast.error(data.error || t('dsgvo.delete_error'));
        }
        return;
      }
      toast.success(t('dsgvo.delete_success'));
      setDeleteDialogOpen(false);
      setDeletePassword('');
      loadDeletionStatus();
    } catch {
      toast.error(t('dsgvo.delete_error'));
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDeletion = async () => {
    setCancelling(true);
    try {
      const res = await fetch('/api/account-deletion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t('dsgvo.delete_error'));
        return;
      }
      toast.success(t('dsgvo.delete_cancel_success'));
      loadDeletionStatus();
    } catch {
      toast.error(t('dsgvo.delete_error'));
    } finally {
      setCancelling(false);
    }
  };

  const isAdmin = currentUser?.role === 'SCHOOL_ADMIN' || currentUser?.role === 'SUPER_ADMIN';

  const userRights = [
    { key: 'right_access', icon: Eye, color: 'emerald' },
    { key: 'right_rectification', icon: Pencil, color: 'teal' },
    { key: 'right_erasure', icon: Trash2, color: 'rose' },
    { key: 'right_portability', icon: Download, color: 'amber' },
    { key: 'right_restriction', icon: Shield, color: 'violet' },
    { key: 'right_objection', icon: AlertTriangle, color: 'orange' },
  ];

  return (
    <div className="space-y-6">
      {/* ── Privacy Policy Card ─────────────────────────────── */}
      <Card className="card-hover-lift border-0 shadow-sm rounded-xl border-l-3 border-l-emerald-500 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10 dark:to-transparent">
          <CardTitle className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
              <Shield className="h-4 w-4" />
            </div>
            {t('dsgvo.privacy_policy')}
          </CardTitle>
          <CardDescription>{t('dsgvo.data_processing')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {t('dsgvo.privacy_policy_text')}
          </p>

          {/* Data collected */}
          <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200/30 dark:border-emerald-900/20">
            <div className="flex items-center gap-2 mb-2">
              <Database className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{t('dsgvo.data_collected')}</h4>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('dsgvo.data_collected_list')}</p>
          </div>

          {/* Purpose */}
          <div className="p-4 rounded-xl bg-teal-50/50 dark:bg-teal-900/10 border border-teal-200/30 dark:border-teal-900/20">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              <h4 className="text-sm font-semibold text-teal-700 dark:text-teal-300">{t('dsgvo.data_purpose')}</h4>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('dsgvo.data_purpose_list')}</p>
          </div>

          {/* Retention */}
          <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/30 dark:border-amber-900/20">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-300">{t('dsgvo.data_retention')}</h4>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('dsgvo.data_retention_list')}</p>
          </div>

          {/* Third party */}
          <div className="p-4 rounded-xl bg-violet-50/50 dark:bg-violet-900/10 border border-violet-200/30 dark:border-violet-900/20">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              <h4 className="text-sm font-semibold text-violet-700 dark:text-violet-300">{t('dsgvo.data_third_party')}</h4>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('dsgvo.data_third_party_list')}</p>
          </div>

          {/* DPO Contact */}
          <div className="p-4 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 border border-gray-200/30 dark:border-gray-700/20">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('dsgvo.contact_dpo')}</h4>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">datenschutz@competencetrack.org</p>
          </div>
        </CardContent>
      </Card>

      {/* ── User Rights Card ─────────────────────────────── */}
      <Card className="card-hover-lift border-0 shadow-sm rounded-xl border-l-3 border-l-teal-500 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-teal-50/50 to-transparent dark:from-teal-900/10 dark:to-transparent">
          <CardTitle className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            {t('dsgvo.rights_title')}
          </CardTitle>
          <CardDescription>{t('dsgvo.rights_desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {userRights.map((right) => {
              const Icon = right.icon;
              const colorMap: Record<string, { bg: string; text: string; border: string }> = {
                emerald: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200/30 dark:border-emerald-900/20' },
                teal: { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-200/30 dark:border-teal-900/20' },
                rose: { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-200/30 dark:border-rose-900/20' },
                amber: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200/30 dark:border-amber-900/20' },
                violet: { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-200/30 dark:border-violet-900/20' },
                orange: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-200/30 dark:border-orange-900/20' },
              };
              const c = colorMap[right.color] || colorMap.emerald;
              return (
                <div key={right.key} className={`p-3 rounded-xl ${c.bg} border ${c.border}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`h-4 w-4 ${c.text}`} />
                    <h5 className={`text-sm font-semibold ${c.text}`}>{t(`dsgvo.${right.key}`)}</h5>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{t(`dsgvo.${right.key}_desc`)}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Data Export Card ─────────────────────────────── */}
      <Card className="card-hover-lift border-0 shadow-sm rounded-xl border-l-3 border-l-amber-500 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-900/10 dark:to-transparent">
          <CardTitle className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
              <Download className="h-4 w-4" />
            </div>
            {t('dsgvo.data_portability')}
          </CardTitle>
          <CardDescription>DSGVO Art. 20</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('dsgvo.export_data_desc')}</p>
          <Button
            onClick={handleExportData}
            disabled={exporting}
            className="min-h-[44px] bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-600 hover:to-emerald-600 text-white rounded-xl shadow-md font-semibold"
          >
            {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileJson className="h-4 w-4 mr-2" />}
            {t('dsgvo.export_data')}
          </Button>
        </CardContent>
      </Card>

      {/* ── Account Deletion Card ─────────────────────────────── */}
      <Card className="card-hover-lift border-0 shadow-sm rounded-xl border-l-3 border-l-rose-500 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-rose-50/50 to-transparent dark:from-rose-900/10 dark:to-transparent">
          <CardTitle className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
              <Trash2 className="h-4 w-4" />
            </div>
            {t('dsgvo.delete_account')}
          </CardTitle>
          <CardDescription>DSGVO Art. 17</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('dsgvo.delete_account_desc')}</p>

          {/* Deletion status */}
          {deletionStatus?.scheduledForDeletion && (
            <div className="p-4 rounded-xl bg-rose-50/50 dark:bg-rose-900/10 border border-rose-200/30 dark:border-rose-900/20">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                <span className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                  {t('dsgvo.delete_scheduled')} {new Date(deletionStatus.scheduledDeletionDate!).toLocaleDateString()}
                </span>
              </div>
              {deletionStatus.canCancel && (
                <Button
                  onClick={handleCancelDeletion}
                  disabled={cancelling}
                  variant="outline"
                  className="min-h-[44px] rounded-xl border-emerald-200 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 mt-2"
                >
                  {cancelling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                  {t('dsgvo.delete_cancel')}
                </Button>
              )}
            </div>
          )}

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50/50 dark:bg-rose-900/10 border border-rose-200/30 dark:border-rose-900/20">
            <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <p className="text-xs text-rose-700 dark:text-rose-300">{t('dsgvo.delete_warning')}</p>
          </div>

          {!deletionStatus?.scheduledForDeletion && (
            <Button
              onClick={() => setDeleteDialogOpen(true)}
              variant="outline"
              className="min-h-[44px] rounded-xl border-rose-200 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 font-semibold"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('dsgvo.delete_account')}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ── Jugendschutz Card ─────────────────────────────── */}
      <Card className="card-hover-lift border-0 shadow-sm rounded-xl border-l-3 border-l-amber-400 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-900/10 dark:to-transparent">
          <CardTitle className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
              <GraduationCap className="h-4 w-4" />
            </div>
            {t('dsgvo.jugendschutz')}
          </CardTitle>
          <CardDescription>Jugendschutzgesetz</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/30 dark:border-amber-900/20">
            <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">{t('dsgvo.jugendschutz_notice')}</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200/30 dark:border-gray-700/20">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 shrink-0">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('dsgvo.parental_consent')}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('dsgvo.jugendschutz_notice')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200/30 dark:border-gray-700/20">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 shrink-0">
                <Eye className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('dsgvo.no_advertising')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200/30 dark:border-gray-700/20">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 shrink-0">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('dsgvo.no_tracking')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200/30 dark:border-gray-700/20">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 shrink-0">
                <Trophy className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('dsgvo.jugendschutz_rewards')}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── DPA / AVV Card (Admin only) ─────────────────────── */}
      {isAdmin && (
        <Card className="card-hover-lift border-0 shadow-sm rounded-xl border-l-3 border-l-violet-500 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-violet-50/50 to-transparent dark:from-violet-900/10 dark:to-transparent">
            <CardTitle className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                <FileText className="h-4 w-4" />
              </div>
              {t('dsgvo.dpa')}
            </CardTitle>
            <CardDescription>Art. 28 DSGVO</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('dsgvo.dpa_template_text')}</p>

            {/* DPA Status */}
            <div className="p-4 rounded-xl bg-violet-50/50 dark:bg-violet-900/10 border border-violet-200/30 dark:border-violet-900/20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">{t('dsgvo.dpa')}</span>
                <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200/50 dark:border-amber-900/30">
                  {t('dsgvo.dpa_status_pending')}
                </Badge>
              </div>
              <Button
                variant="outline"
                className="min-h-[44px] rounded-xl border-violet-200 dark:border-violet-900/30 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 font-semibold"
                onClick={() => {
                  // Generate a simple DPA template as a downloadable text file
                  const dpaTemplate = `Auftragsverarbeitungsvertrag (AVV)\ngemäß Art. 28 DSGVO\n\nVerantwortliche Stelle (Schule):\n[Name der Schule]\n[Adresse]\n\nAuftragsverarbeiter:\nCompetenceTrack\n[Adresse]\n\n1. Gegenstand und Dauer der Verarbeitung\nDer Auftragsverarbeiter verarbeitet personenbezogene Daten im Auftrag der verantwortlichen Stelle gemäß den Bestimmungen dieses Vertrages.\n\n2. Art und Zweck der Verarbeitung\n- Bereitstellung und Betrieb der CompetenceTrack-Plattform\n- Verwaltung von Schüler- und Klassendaten\n- Dokumentation von Lernfortschritten\n- Erstellung von Zeugnissen und Berichten\n\n3. Art der personenbezogenen Daten\n- Name, E-Mail-Adresse\n- Schülereinschreibungsdaten\n- Lernfortschrittsdaten\n- Bewertungsdaten\n- Anwesenheitsdaten\n\n4. Betroffene Personenkreise\n- Schülerinnen und Schüler\n- Lehrkräfte\n- Eltern / Erziehungsberechtigte\n\n5. Technisch-organisatorische Maßnahmen\nDer Auftragsverarbeiter implementiert angemessene technisch-organisatorische Maßnahmen gemäß Art. 32 DSGVO.\n\n6. Löschung und Rückgabe von Daten\nNach Beendigung des Auftragsverhältnisses werden alle personenbezogenen Daten gelöscht.\n\n7. Kontrolle durch die verantwortliche Stelle\nDie verantwortliche Stelle hat das Recht, die Einhaltung der Maßnahmen zu kontrollieren.\n\n8. Unterauftragsverhältnisse\nEine Weitergabe an Unterauftragnehmer bedarf der vorherigen Zustimmung der verantwortlichen Stelle.\n\nOrt, Datum: _______________\n\nUnterschrift Verantwortliche Stelle: _______________\nUnterschrift Auftragsverarbeiter: _______________`;
                  const blob = new Blob([dpaTemplate], { type: 'text/plain;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'AVV_CompetenceTrack_Vorlage.txt';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                {t('dsgvo.dpa_download')}
              </Button>
            </div>

            {/* Data Processing Register */}
            <div className="p-4 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 border border-gray-200/30 dark:border-gray-700/20">
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('dsgvo.data_register')}</h4>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{t('dsgvo.data_register_desc')}</p>
              <Button
                variant="outline"
                className="min-h-[44px] rounded-xl border-gray-200 dark:border-gray-700/30 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 font-semibold"
                onClick={() => {
                  const registerData = {
                    title: 'Verzeichnis von Verarbeitungstätigkeiten',
                    legalBasis: 'Art. 30 DSGVO',
                    controller: '[Name der Schule]',
                    processor: 'CompetenceTrack',
                    processingActivities: [
                      { name: 'Benutzerverwaltung', purpose: 'Bereitstellung der Plattform', dataCategories: 'Name, E-Mail, Rolle', retention: 'Dauer der Nutzung + 30 Tage', legalBasis: 'Art. 6 Abs. 1 lit. b DSGVO' },
                      { name: 'Schülerverwaltung', purpose: 'Verwaltung von Klassen und Schülern', dataCategories: 'Name, Geburtsdatum, Geschlecht', retention: 'Dauer der Nutzung + 30 Tage', legalBasis: 'Art. 6 Abs. 1 lit. b DSGVO' },
                      { name: 'Lernfortschrittsdokumentation', purpose: 'Dokumentation des Lernfortschritts', dataCategories: 'Kompetenzlevel, Kommentare', retention: 'Dauer der Nutzung + 30 Tage', legalBasis: 'Art. 6 Abs. 1 lit. b DSGVO' },
                      { name: 'Bewertung', purpose: 'Leistungsüberprüfung und Benotung', dataCategories: 'Bewertungsergebnisse, Noten', retention: 'Dauer der Nutzung + 30 Tage', legalBasis: 'Art. 6 Abs. 1 lit. b DSGVO' },
                      { name: 'Anwesenheitserfassung', purpose: 'Dokumentation der Anwesenheit', dataCategories: 'Anwesenheitsstatus, Datum', retention: 'Dauer der Nutzung + 30 Tage', legalBasis: 'Art. 6 Abs. 1 lit. b DSGVO' },
                      { name: 'Berichtserstellung', purpose: 'Erstellung von Zeugnissen und Berichten', dataCategories: 'Berichtsinhalte, Noten', retention: 'Dauer der Nutzung + 30 Tage', legalBasis: 'Art. 6 Abs. 1 lit. b DSGVO' },
                      { name: 'Kommunikation mit Eltern', purpose: 'Elterninformation und Kommunikation', dataCategories: 'Nachrichten, Kontaktdaten', retention: 'Dauer der Nutzung + 30 Tage', legalBasis: 'Art. 6 Abs. 1 lit. b DSGVO' },
                    ],
                  };
                  const blob = new Blob([JSON.stringify(registerData, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'Verzeichnis_Verarbeitungstaetigkeiten.json';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                {t('dsgvo.data_register_download')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Consent Management Card ─────────────────────────────── */}
      <Card className="card-hover-lift border-0 shadow-sm rounded-xl border-l-3 border-l-teal-500 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-teal-50/50 to-transparent dark:from-teal-900/10 dark:to-transparent">
          <CardTitle className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
              <Shield className="h-4 w-4" />
            </div>
            {t('dsgvo.consent_management')}
          </CardTitle>
          <CardDescription>{t('dsgvo.consent_management_desc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'data_processing', icon: Database, color: 'emerald' },
            { key: 'communication', icon: Mail, color: 'teal' },
            { key: 'analytics', icon: BarChart3, color: 'amber' },
            { key: 'third_party', icon: Users, color: 'violet' },
          ].map((consent) => {
            const Icon = consent.icon;
            const colorMap: Record<string, { bg: string; text: string; border: string }> = {
              emerald: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200/30 dark:border-emerald-900/20' },
              teal: { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-200/30 dark:border-teal-900/20' },
              amber: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200/30 dark:border-amber-900/20' },
              violet: { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-200/30 dark:border-violet-900/20' },
            };
            const c = colorMap[consent.color] || colorMap.emerald;
            return (
              <div key={consent.key} className={`flex items-center justify-between p-4 rounded-xl ${c.bg} border ${c.border}`}>
                <div className="flex items-center gap-3">
                  <Icon className={`h-5 w-5 ${c.text}`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t(`dsgvo.consent_${consent.key}`)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t(`dsgvo.consent_${consent.key}_desc`)}</p>
                  </div>
                </div>
                <Badge className={`${c.bg} ${c.text} border ${c.border} text-xs`}>
                  {t('dsgvo.consent_granted')}
                </Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ── Data Retention Settings Card ─────────────────────────────── */}
      <Card className="card-hover-lift border-0 shadow-sm rounded-xl border-l-3 border-l-amber-500 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-900/10 dark:to-transparent">
          <CardTitle className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
              <HardDrive className="h-4 w-4" />
            </div>
            {t('dsgvo.retention_settings')}
          </CardTitle>
          <CardDescription>{t('dsgvo.retention_settings_desc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'grades', icon: GraduationCap, color: 'emerald', defaultYears: 3 },
            { key: 'attendance', icon: CalendarCheck, color: 'teal', defaultYears: 2 },
            { key: 'behavior', icon: Heart, color: 'violet', defaultYears: 1 },
          ].map((retention) => {
            const Icon = retention.icon;
            const colorMap: Record<string, { bg: string; text: string; border: string }> = {
              emerald: { bg: 'bg-emerald-50/50 dark:bg-emerald-900/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200/30 dark:border-emerald-900/20' },
              teal: { bg: 'bg-teal-50/50 dark:bg-teal-900/10', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-200/30 dark:border-teal-900/20' },
              violet: { bg: 'bg-violet-50/50 dark:bg-violet-900/10', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-200/30 dark:border-violet-900/20' },
            };
            const c = colorMap[retention.color] || colorMap.emerald;
            return (
              <div key={retention.key} className={`flex items-center justify-between p-4 rounded-xl ${c.bg} border ${c.border}`}>
                <div className="flex items-center gap-3">
                  <Icon className={`h-5 w-5 ${c.text}`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t(`dsgvo.retention_${retention.key}`)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{retention.defaultYears}</span>
                  <span className="text-xs text-muted-foreground">{t('dsgvo.retention_years')}</span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ── Cookie Consent Management Card ─────────────────────────────── */}
      <Card className="card-hover-lift border-0 shadow-sm rounded-xl border-l-3 border-l-rose-400 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-rose-50/50 to-transparent dark:from-rose-900/10 dark:to-transparent">
          <CardTitle className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
              <Shield className="h-4 w-4" />
            </div>
            {t('dsgvo.cookie_settings')}
          </CardTitle>
          <CardDescription>{t('dsgvo.cookie_consent')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 border border-gray-200/30 dark:border-gray-700/20">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('dsgvo.cookie_essential')}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('dsgvo.cookie_essential_desc')}</p>
              </div>
            </div>
            <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs">
              {t('dsgvo.consent_granted')}
            </Badge>
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 border border-gray-200/30 dark:border-gray-700/20">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('dsgvo.cookie_analytics')}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('dsgvo.cookie_analytics_desc')}</p>
              </div>
            </div>
            <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs">
              {t('dsgvo.consent_revoked')}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* ── Delete Account Confirmation Dialog ─────────────────────── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => { if (!open) { setDeleteDialogOpen(false); setDeletePassword(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-500" />
              {t('dsgvo.delete_confirm_title')}
            </AlertDialogTitle>
            <AlertDialogDescription>{t('dsgvo.delete_confirm_desc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50/50 dark:bg-rose-900/10 border border-rose-200/30 dark:border-rose-900/20">
              <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <p className="text-xs text-rose-700 dark:text-rose-300">{t('dsgvo.delete_warning')}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="delete-password" className="text-sm font-medium">{t('dsgvo.delete_password_label')}</Label>
              <Input
                id="delete-password"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="rounded-xl border-rose-200 dark:border-rose-900/30"
                placeholder="••••••"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('action.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleting || !deletePassword}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              {t('dsgvo.delete_account')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Vice Principal Manager Sub-Component ────────────────────────────────
function VicePrincipalManager({ schoolId }: { schoolId: string }) {
  const [users, setUsers] = useState<Array<{ id: string; firstName: string; lastName: string; email: string; role: string; schoolId: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ userId: string; newRole: string; userName: string } | null>(null);
  const locale = useAppStore((s) => s.locale);

  const loadUsers = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const data = await apiGet<Array<{ id: string; firstName: string; lastName: string; email: string; role: string; schoolId: string | null }>>(`/api/users?schoolId=${schoolId}`);
      setUsers(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const vicePrincipals = users.filter((u) => u.role === 'VICE_PRINCIPAL');
  const admins = users.filter((u) => u.role === 'SCHOOL_ADMIN' || u.role === 'SUPER_ADMIN' || u.role === 'VICE_PRINCIPAL');
  const teachers = users.filter((u) => u.role === 'TEACHER');

  const handleRoleChange = async (userId: string, newRole: string) => {
    setChangingRole(userId);
    try {
      await apiPut('/api/users/role', { userId, role: newRole });
      await loadUsers();
      toast.success(t('settings.role_changed'));
      setConfirmDialog(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('error.generic'));
    } finally {
      setChangingRole(null);
    }
  };

  const roleLabel = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'Super Admin';
      case 'SCHOOL_ADMIN': return locale === 'de' ? 'Schulleiter' : 'School Admin';
      case 'VICE_PRINCIPAL': return t('settings.vice_principal_short');
      case 'TEACHER': return locale === 'de' ? 'Lehrer' : 'Teacher';
      default: return role;
    }
  };

  const roleBadgeClass = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
      case 'SCHOOL_ADMIN': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
      case 'VICE_PRINCIPAL': return 'bg-gradient-to-r from-teal-500 to-teal-600 text-white';
      case 'TEACHER': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/60 dark:bg-gray-800/40">
            <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-1/3 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
              <div className="h-2.5 w-2/3 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Vice Principals */}
      <div>
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4 text-teal-500" />
          {t('settings.current_admins')}
        </p>
        {admins.length === 0 ? (
          <div className="text-center py-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-900/30 mx-auto mb-3">
              <Shield className="h-6 w-6 text-teal-600 dark:text-teal-400" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'de' ? 'Keine Administratoren gefunden' : 'No administrators found'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {admins.map((admin) => (
              <motion.div
                key={admin.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-teal-50/40 to-transparent dark:from-teal-900/10 dark:to-transparent border border-teal-100/40 dark:border-teal-900/20"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-teal-500 text-white shadow-sm text-sm font-bold">
                    {admin.firstName[0]}{admin.lastName[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{admin.firstName} {admin.lastName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{admin.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`${roleBadgeClass(admin.role)} text-xs font-medium rounded-md px-2 py-0.5`}>
                    {roleLabel(admin.role)}
                  </Badge>
                  {admin.role === 'VICE_PRINCIPAL' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-rose-300 dark:border-rose-700 text-rose-600 dark:text-rose-400 rounded-xl text-xs h-7"
                      disabled={changingRole === admin.id}
                      onClick={() => setConfirmDialog({ userId: admin.id, newRole: 'TEACHER', userName: `${admin.firstName} ${admin.lastName}` })}
                    >
                      {changingRole === admin.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3 mr-1" />}
                      {t('settings.remove_vice_principal')}
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Assign Vice Principal */}
      <div>
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-emerald-500" />
          {t('settings.assign_vice_principal')}
        </p>
        {teachers.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{locale === 'de' ? 'Keine Lehrer verfuegbar' : 'No teachers available'}</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-education">
            {teachers.map((teacher) => (
              <div
                key={teacher.id}
                className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-emerald-50/30 to-transparent dark:from-emerald-900/5 dark:to-transparent border border-emerald-100/30 dark:border-emerald-900/10"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                    {teacher.firstName[0]}{teacher.lastName[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{teacher.firstName} {teacher.lastName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{teacher.email}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-md text-xs h-7"
                  disabled={changingRole === teacher.id}
                  onClick={() => setConfirmDialog({ userId: teacher.id, newRole: 'VICE_PRINCIPAL', userName: `${teacher.firstName} ${teacher.lastName}` })}
                >
                  {changingRole === teacher.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Shield className="h-3 w-3 mr-1" />}
                  {t('settings.assign_vice_principal')}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm Dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              {t('settings.confirm_role_change')}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog?.newRole === 'VICE_PRINCIPAL'
                ? t('settings.assign_vice_principal')
                : t('settings.confirm_role_remove')
              } — {confirmDialog?.userName}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)} className="rounded-xl">{t('action.cancel')}</Button>
            <Button
              onClick={() => confirmDialog && handleRoleChange(confirmDialog.userId, confirmDialog.newRole)}
              className="rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 text-white"
            >
              {t('action.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
  const [auditEntityTypeFilter, setAuditEntityTypeFilter] = useState('all');
  const [auditDateFrom, setAuditDateFrom] = useState('');
  const [auditDateTo, setAuditDateTo] = useState('');
  const [auditSearch, setAuditSearch] = useState('');
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditDetailEntry, setAuditDetailEntry] = useState<AuditLogEntry | null>(null);

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
    role: 'TEACHER' as 'TEACHER' | 'SCHOOL_ADMIN' | 'SUPER_ADMIN' | 'STUDENT' | 'PARENT',
  });
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  // Student account creation state
  const [showStudentAccountDialog, setShowStudentAccountDialog] = useState(false);
  const [showBulkStudentDialog, setShowBulkStudentDialog] = useState(false);
  const [studentAccountForm, setStudentAccountForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: 'Schule2025!',
    studentId: '',
  });
  const [bulkForm, setBulkForm] = useState({
    defaultPassword: 'Schule2025!',
    emailDomain: 'schule.de',
    selectedStudentIds: [] as string[],
  });
  const [availableStudents, setAvailableStudents] = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);
  const [bulkCreating, setBulkCreating] = useState(false);

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

  // Data import state
  const [importType, setImportType] = useState<'students' | 'assessments' | 'grades'>('students');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    created: number;
    skipped: number;
    errorCount: number;
    errors: string[];
    detectedColumns: string[];
  } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Export history
  const [exportHistory, setExportHistory] = useState<Array<{ type: string; date: string; format: string }>>([]);

  // Branding state
  const [brandingForm, setBrandingForm] = useState({
    logoUrl: '',
    primaryColor: '#10b981',
    secondaryColor: '#14b8a6',
    accentColor: '#059669',
    fontFamily: 'Inter',
    customCss: '',
    motto: '',
    websiteUrl: '',
    emailDomain: '',
    address: '',
    phone: '',
  });
  const [brandingSaving, setBrandingSaving] = useState(false);

  // Email templates state
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [emailTemplatesLoading, setEmailTemplatesLoading] = useState(true);
  const [showEmailTemplateDialog, setShowEmailTemplateDialog] = useState(false);
  const [editingEmailTemplate, setEditingEmailTemplate] = useState<EmailTemplate | null>(null);
  const [emailTemplateForm, setEmailTemplateForm] = useState({ name: '', subject: '', body: '' });
  const [emailTemplateSaving, setEmailTemplateSaving] = useState(false);
  const [deleteEmailTemplateId, setDeleteEmailTemplateId] = useState<string | null>(null);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [emailPreviewTemplate, setEmailPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState('');

  // Email log state
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [emailLogCounts, setEmailLogCounts] = useState({ total: 0, sent: 0, failed: 0, pending: 0, bounced: 0 });
  const [emailLogsLoading, setEmailLogsLoading] = useState(true);
  const [emailLogFilter, setEmailLogFilter] = useState('all');

  // Email settings state
  const [emailSettings, setEmailSettings] = useState({
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPassword: '',
    smtpFrom: '',
    frequency: 'weekly',
    autoReports: true,
    autoBehavior: true,
    autoAttendance: false,
  });

  // Enhanced export state
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'pdf'>('csv');
  const [exportClassFilter, setExportClassFilter] = useState('');
  const [exportDateFrom, setExportDateFrom] = useState('');
  const [exportDateTo, setExportDateTo] = useState('');
  const [exporting, setExporting] = useState(false);

  // Backup state
  const [backups, setBackups] = useState<Array<{
    id: string;
    schoolId: string;
    filename: string;
    size: number;
    type: string;
    status: string;
    notes: string | null;
    createdAt: string;
  }>>([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupCreating, setBackupCreating] = useState(false);
  const [deleteBackupId, setDeleteBackupId] = useState<string | null>(null);
  const [restoreBackupId, setRestoreBackupId] = useState<string | null>(null);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [autoBackupFrequency, setAutoBackupFrequency] = useState<'daily' | 'weekly'>('weekly');

  // District state
  const [districts, setDistricts] = useState<SchoolDistrictData[]>([]);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [districtDialogOpen, setDistrictDialogOpen] = useState(false);
  const [editingDistrict, setEditingDistrict] = useState<SchoolDistrictData | null>(null);
  const [districtForm, setDistrictForm] = useState({ name: '', code: '', region: '', country: 'DE', adminEmail: '' });
  const [districtSaving, setDistrictSaving] = useState(false);
  const [deleteDistrictId, setDeleteDistrictId] = useState<string | null>(null);
  const [districtSchools, setDistrictSchools] = useState<Array<{
    id: string; name: string; schoolType: string; country: string;
    _count: { students: number; classGroups: number; users: number };
  }>>([]);
  const [districtSchoolsLoading, setDistrictSchoolsLoading] = useState(false);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);
  const [assignSchoolId, setAssignSchoolId] = useState('');

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
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
        entityType: auditEntityTypeFilter !== 'all' ? auditEntityTypeFilter : undefined,
        startDate: auditDateFrom || undefined,
        endDate: auditDateTo || undefined,
        page: auditPage,
        pageSize: 50,
      });
      setAuditEntries(data.entries);
      setAuditTotalPages(data.pagination.totalPages);
    } catch {
      toast.error(t('error.generic'));
    } finally {
      setAuditLoading(false);
    }
  }, [currentUser?.schoolId, auditActionFilter, auditEntityTypeFilter, auditDateFrom, auditDateTo, auditPage]);

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

  // Load email templates
  const loadEmailTemplates = useCallback(async () => {
    if (!currentUser?.schoolId) return;
    setEmailTemplatesLoading(true);
    try {
      const data = await fetchEmailTemplates(currentUser.schoolId);
      setEmailTemplates(data);
    } catch {
      // ignore
    } finally {
      setEmailTemplatesLoading(false);
    }
  }, [currentUser?.schoolId]);

  // Load email logs
  const loadEmailLogs = useCallback(async () => {
    if (!currentUser?.schoolId) return;
    setEmailLogsLoading(true);
    try {
      const data = await fetchEmailLogs(currentUser.schoolId, emailLogFilter !== 'all' ? emailLogFilter : undefined);
      setEmailLogs(data.logs);
      setEmailLogCounts(data.counts);
    } catch {
      // ignore
    } finally {
      setEmailLogsLoading(false);
    }
  }, [currentUser?.schoolId, emailLogFilter]);

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

  // Backup functions
  const loadBackups = useCallback(async () => {
    if (!currentUser?.schoolId) return;
    setBackupLoading(true);
    try {
      const response = await fetch(`/api/backup?schoolId=${currentUser.schoolId}`);
      if (!response.ok) throw new Error('Failed to load backups');
      const data = await response.json();
      setBackups(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load backups:', err);
      setBackups([]);
    } finally {
      setBackupLoading(false);
    }
  }, [currentUser?.schoolId]);

  // Reload demo accounts when demo tab is selected
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    if (tab === 'demo' && isAdmin) {
      loadDemoAccounts();
    }
    if (tab === 'backup') {
      loadBackups();
    }
    if (tab === 'district' && isSuperAdmin) {
      loadDistricts();
    }
    if (tab === 'email') {
      loadEmailTemplates();
      loadEmailLogs();
    }
    if (tab === 'branding' && selectedSchool) {
      setBrandingForm({
        logoUrl: selectedSchool.logoUrl || '',
        primaryColor: selectedSchool.primaryColor || '#10b981',
        secondaryColor: selectedSchool.secondaryColor || '#14b8a6',
        accentColor: selectedSchool.accentColor || '#059669',
        fontFamily: selectedSchool.fontFamily || 'Inter',
        customCss: selectedSchool.customCss || '',
        motto: selectedSchool.motto || '',
        websiteUrl: selectedSchool.websiteUrl || '',
        emailDomain: selectedSchool.emailDomain || '',
        address: selectedSchool.address || '',
        phone: selectedSchool.phone || '',
      });
    }
  }, [isAdmin, loadDemoAccounts, loadBackups, isSuperAdmin, loadEmailTemplates, loadEmailLogs, selectedSchool]);

  // District handlers
  const loadDistricts = useCallback(async () => {
    setDistrictsLoading(true);
    try {
      const data = await fetchDistricts();
      setDistricts(data);
    } catch {
      // ignore
    } finally {
      setDistrictsLoading(false);
    }
  }, []);

  const loadDistrictSchoolsData = useCallback(async (districtId: string) => {
    setSelectedDistrictId(districtId);
    setDistrictSchoolsLoading(true);
    try {
      const data = await fetchDistrictSchools(districtId);
      setDistrictSchools(data);
    } catch {
      // ignore
    } finally {
      setDistrictSchoolsLoading(false);
    }
  }, []);

  const handleCreateDistrict = async () => {
    setDistrictSaving(true);
    try {
      await createDistrict({
        name: districtForm.name,
        code: districtForm.code || undefined,
        region: districtForm.region || undefined,
        country: districtForm.country,
        adminEmail: districtForm.adminEmail || undefined,
      });
      toast.success(t('district.create'));
      setDistrictDialogOpen(false);
      resetDistrictForm();
      loadDistricts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('error.generic'));
    } finally {
      setDistrictSaving(false);
    }
  };

  const handleUpdateDistrict = async () => {
    if (!editingDistrict) return;
    setDistrictSaving(true);
    try {
      await updateDistrict(editingDistrict.id, {
        name: districtForm.name,
        code: districtForm.code || undefined,
        region: districtForm.region || undefined,
        country: districtForm.country,
        adminEmail: districtForm.adminEmail || undefined,
      });
      toast.success(t('district.edit'));
      setDistrictDialogOpen(false);
      setEditingDistrict(null);
      resetDistrictForm();
      loadDistricts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('error.generic'));
    } finally {
      setDistrictSaving(false);
    }
  };

  const handleDeleteDistrict = async (id: string) => {
    try {
      await deleteDistrict(id);
      toast.success(t('district.delete'));
      setDeleteDistrictId(null);
      if (selectedDistrictId === id) setSelectedDistrictId(null);
      loadDistricts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('error.generic'));
    }
  };

  const handleAssignSchool = async () => {
    if (!selectedDistrictId || !assignSchoolId) return;
    try {
      await assignSchoolToDistrict(selectedDistrictId, assignSchoolId);
      toast.success(t('district.assign_school'));
      setAssignSchoolId('');
      loadDistrictSchoolsData(selectedDistrictId);
      loadDistricts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('error.generic'));
    }
  };

  const handleUnassignSchool = async (schoolId: string) => {
    // Unassign by setting districtId to null on the school
    try {
      await apiPut(`/api/schools`, { id: schoolId, districtId: null });
      toast.success(t('district.unassign_school'));
      if (selectedDistrictId) loadDistrictSchoolsData(selectedDistrictId);
      loadDistricts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('error.generic'));
    }
  };

  const openEditDistrict = (district: SchoolDistrictData) => {
    setEditingDistrict(district);
    setDistrictForm({
      name: district.name,
      code: district.code ?? '',
      region: district.region ?? '',
      country: district.country,
      adminEmail: district.adminEmail ?? '',
    });
    setDistrictDialogOpen(true);
  };

  const resetDistrictForm = () => {
    setDistrictForm({ name: '', code: '', region: '', country: 'DE', adminEmail: '' });
  };

  const handleCreateBackup = useCallback(async () => {
    if (!currentUser?.schoolId) return;
    setBackupCreating(true);
    try {
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId: currentUser.schoolId }),
      });
      if (!response.ok) throw new Error('Failed to create backup');
      toast.success(t('backup.created_success'));
      loadBackups();
    } catch (err) {
      console.error('Failed to create backup:', err);
      toast.error(t('backup.error_create'));
    } finally {
      setBackupCreating(false);
    }
  }, [currentUser?.schoolId, loadBackups]);

  const handleRestoreBackup = useCallback(async () => {
    if (!restoreBackupId || !currentUser?.schoolId) return;
    try {
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId: currentUser.schoolId, action: 'restore', backupId: restoreBackupId }),
      });
      if (!response.ok) throw new Error('Failed to restore backup');
      toast.success(t('backup.restored_success'));
      setRestoreBackupId(null);
    } catch (err) {
      console.error('Failed to restore backup:', err);
      toast.error(t('backup.error_restore'));
    }
  }, [restoreBackupId, currentUser?.schoolId]);

  const handleDeleteBackup = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/backup?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete backup');
      toast.success(t('backup.deleted_success'));
      setDeleteBackupId(null);
      loadBackups();
    } catch (err) {
      console.error('Failed to delete backup:', err);
      toast.error(t('backup.error_delete'));
    }
  }, [loadBackups]);

  const handleDownloadBackup = useCallback(async (backup: typeof backups[0]) => {
    if (!currentUser?.schoolId) return;
    try {
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId: currentUser.schoolId }),
      });
      if (!response.ok) throw new Error('Failed to download backup');
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = backup.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download backup:', err);
      toast.error(t('backup.error_create'));
    }
  }, [currentUser?.schoolId]);

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

  const handleCsvExport = (type: 'students' | 'progress' | 'assessments' | 'grades' | 'attendance') => {
    setExporting(true);
    downloadCsvExport({
      type,
      schoolId: currentUser?.schoolId ?? undefined,
      schoolYearId: useAppStore.getState().schoolYearId ?? undefined,
      format: exportFormat,
      classGroupId: exportClassFilter || undefined,
      dateFrom: exportDateFrom || undefined,
      dateTo: exportDateTo || undefined,
    });
    setExportHistory((prev) => [{ type, date: new Date().toLocaleDateString(), format: exportFormat }, ...prev].slice(0, 20));
    toast.success(t('settings.data_export_started'));
    setTimeout(() => setExporting(false), 1500);
  };

  // Branding save handler
  const handleSaveBranding = async () => {
    if (!selectedSchool) return;
    setBrandingSaving(true);
    try {
      await updateSchool({
        id: selectedSchool.id,
        logoUrl: brandingForm.logoUrl || null,
        primaryColor: brandingForm.primaryColor || null,
        secondaryColor: brandingForm.secondaryColor || null,
        accentColor: brandingForm.accentColor || null,
        fontFamily: brandingForm.fontFamily || null,
        customCss: brandingForm.customCss || null,
        motto: brandingForm.motto || null,
        websiteUrl: brandingForm.websiteUrl || null,
        emailDomain: brandingForm.emailDomain || null,
        address: brandingForm.address || null,
        phone: brandingForm.phone || null,
      });
      toast.success(t('branding.saved'));
      loadSchools();
    } catch {
      toast.error(t('error.generic'));
    } finally {
      setBrandingSaving(false);
    }
  };

  // Email template handlers
  const handleSaveEmailTemplate = async () => {
    if (!currentUser?.schoolId) return;
    setEmailTemplateSaving(true);
    try {
      if (editingEmailTemplate) {
        await updateEmailTemplate(editingEmailTemplate.id, {
          name: emailTemplateForm.name,
          subject: emailTemplateForm.subject,
          body: emailTemplateForm.body,
        });
        toast.success(t('email.template_edit'));
      } else {
        await createEmailTemplate({
          schoolId: currentUser.schoolId,
          name: emailTemplateForm.name,
          subject: emailTemplateForm.subject,
          body: emailTemplateForm.body,
        });
        toast.success(t('email.template_create'));
      }
      setShowEmailTemplateDialog(false);
      setEditingEmailTemplate(null);
      setEmailTemplateForm({ name: '', subject: '', body: '' });
      loadEmailTemplates();
    } catch {
      toast.error(t('error.generic'));
    } finally {
      setEmailTemplateSaving(false);
    }
  };

  const handleDeleteEmailTemplate = async () => {
    if (!deleteEmailTemplateId) return;
    try {
      await deleteEmailTemplate(deleteEmailTemplateId);
      toast.success(t('email.template_delete'));
      setDeleteEmailTemplateId(null);
      loadEmailTemplates();
    } catch {
      toast.error(t('error.generic'));
    }
  };

  const handleSendTestEmail = async () => {
    if (!currentUser?.schoolId || !testEmailRecipient || !emailPreviewTemplate) return;
    setTestEmailSending(true);
    try {
      await sendTestEmail({
        schoolId: currentUser.schoolId,
        templateId: emailPreviewTemplate.id,
        recipientEmail: testEmailRecipient,
        recipientName: currentUser.firstName + ' ' + currentUser.lastName,
        subject: emailPreviewTemplate.subject,
        body: emailPreviewTemplate.body,
      });
      toast.success(t('email.test_sent'));
      setShowEmailPreview(false);
      setTestEmailRecipient('');
      loadEmailLogs();
    } catch {
      toast.error(t('error.generic'));
    } finally {
      setTestEmailSending(false);
    }
  };

  const handleImport = async () => {
    if (!importFile || !currentUser?.schoolId) return;
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('type', importType);
      formData.append('schoolId', currentUser.schoolId);

      const res = await fetch('/api/data-import', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Import failed' }));
        throw new Error(err.error || 'Import failed');
      }

      const result = await res.json();
      setImportResult(result);
      toast.success(t('import.success'));
      setImportFile(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('import.errors'));
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadSample = (type: 'students' | 'assessments' | 'grades') => {
    window.open(`/api/data-import?type=${type}`, '_blank');
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

  const openCreateStudentAccountDialog = async () => {
    setStudentAccountForm({ firstName: '', lastName: '', email: '', password: 'Schule2025!', studentId: '' });
    try {
      const students = await fetchStudents(currentUser?.schoolId ?? undefined);
      setAvailableStudents(students.map((s) => ({ id: s.id, firstName: s.firstName, lastName: s.lastName })));
    } catch {
      // ignore
    }
    setShowStudentAccountDialog(true);
  };

  const openBulkStudentDialog = async () => {
    setBulkForm({ defaultPassword: 'Schule2025!', emailDomain: 'schule.de', selectedStudentIds: [] });
    try {
      const students = await fetchStudents(currentUser?.schoolId ?? undefined);
      setAvailableStudents(students.map((s) => ({ id: s.id, firstName: s.firstName, lastName: s.lastName })));
    } catch {
      // ignore
    }
    setShowBulkStudentDialog(true);
  };

  const handleCreateStudentAccount = async () => {
    try {
      await createStudentUserAccount({
        schoolId: currentUser?.schoolId ?? '',
        email: studentAccountForm.email,
        password: studentAccountForm.password,
        firstName: studentAccountForm.firstName,
        lastName: studentAccountForm.lastName,
        role: 'STUDENT',
        studentId: studentAccountForm.studentId || undefined,
      });
      toast.success(t('settings.student_account_created'));
      setShowStudentAccountDialog(false);
      loadUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error.generic');
      toast.error(message);
    }
  };

  const handleBulkCreateStudents = async () => {
    if (bulkForm.selectedStudentIds.length === 0) {
      toast.error(t('error.generic'));
      return;
    }
    setBulkCreating(true);
    try {
      const result = await bulkCreateStudentAccounts({
        schoolId: currentUser?.schoolId ?? '',
        defaultPassword: bulkForm.defaultPassword,
        studentIds: bulkForm.selectedStudentIds,
        emailDomain: bulkForm.emailDomain,
      });
      toast.success(t('settings.bulk_accounts_created') + ` (${result.count})`);
      setShowBulkStudentDialog(false);
      loadUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error.generic');
      toast.error(message);
    } finally {
      setBulkCreating(false);
    }
  };

  const openEditUserDialog = (u: UserAccount) => {
    setEditingUser(u);
    setUserForm({
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      password: '',
      role: u.role as 'TEACHER' | 'SCHOOL_ADMIN' | 'SUPER_ADMIN' | 'STUDENT' | 'PARENT',
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
            <TabsTrigger value="branding" className="rounded-lg min-h-[44px] data-[state=active]:bg-teal-500 data-[state=active]:text-white">
              <Palette className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">{t('branding.tab')}</span>
            </TabsTrigger>
            <TabsTrigger value="email" className="rounded-lg min-h-[44px] data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              <Mail className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">{t('email.tab')}</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="demo" className="rounded-lg min-h-[44px] data-[state=active]:bg-amber-500 data-[state=active]:text-white">
                <Zap className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">{t('settings.demo_accounts')}</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="backup" className="rounded-lg min-h-[44px] data-[state=active]:bg-teal-500 data-[state=active]:text-white">
              <HardDrive className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">{t('backup.title')}</span>
            </TabsTrigger>
            {isSuperAdmin && (
              <TabsTrigger value="district" className="rounded-lg min-h-[44px] data-[state=active]:bg-violet-500 data-[state=active]:text-white">
                <Building2 className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">{t('district.title')}</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="rate-limit" className="rounded-lg min-h-[44px] data-[state=active]:bg-rose-500 data-[state=active]:text-white">
              <Shield className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">{t('rate_limit.status_title')}</span>
            </TabsTrigger>
            <TabsTrigger value="badges" className="rounded-lg min-h-[44px] data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              <Trophy className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">{t('badges.manage')}</span>
            </TabsTrigger>
            <TabsTrigger value="privacy" className="rounded-lg min-h-[44px] data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <Shield className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">{t('dsgvo.tab_privacy')}</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="rounded-lg min-h-[44px] data-[state=active]:bg-violet-500 data-[state=active]:text-white">
              <Zap className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">{t('settings.tab_ai')}</span>
            </TabsTrigger>
            <TabsTrigger value="management" className="rounded-lg min-h-[44px] data-[state=active]:bg-teal-500 data-[state=active]:text-white">
              <Users className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">{t('settings.tab_management')}</span>
            </TabsTrigger>
          </TabsList>

          {/* ── School Info Tab ─────────────────────────────────── */}
          <TabsContent value="school">
            <Card className="card-hover-lift border-0 shadow-sm rounded-xl border-l-3 border-l-emerald-500 overflow-hidden">
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

              {/* Notification Sound Setting */}
              <div className="px-6 pb-4 border-t border-gray-100 dark:border-gray-800 pt-4">
                <NotificationSoundSetting />
              </div>
            </Card>
          </TabsContent>

          {/* ── School Years Tab ────────────────────────────────── */}
          <TabsContent value="years">
            <Card className="card-hover-lift border-0 shadow-sm rounded-xl border-l-3 border-l-teal-500 overflow-hidden">
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
            <Card className="card-hover-lift border-0 shadow-sm rounded-xl border-l-3 border-l-amber-500 overflow-hidden">
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
            <Card className="card-hover-lift border-0 shadow-sm rounded-xl border-l-3 border-l-rose-500 overflow-hidden">
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
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 text-xs font-medium">
                    {t('users.count', { count: users.length })}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={openCreateStudentAccountDialog}
                      variant="outline"
                      className="border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl px-4 min-h-[44px]"
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      {t('settings.create_student_account')}
                    </Button>
                    <Button
                      onClick={openBulkStudentDialog}
                      variant="outline"
                      className="border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-xl px-4 min-h-[44px]"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      {t('settings.bulk_create_students')}
                    </Button>
                    <Button
                      onClick={openCreateUserDialog}
                      className="bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white shadow-md rounded-xl px-6 min-h-[44px]"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      {t('users.create_user')}
                    </Button>
                  </div>
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
                          onValueChange={(v) => setUserForm({ ...userForm, role: v as 'TEACHER' | 'SCHOOL_ADMIN' | 'SUPER_ADMIN' | 'STUDENT' | 'PARENT' })}
                        >
                          <SelectTrigger className="rounded-xl border-rose-200/50 dark:border-rose-900/30">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="TEACHER">{t('role.teacher')}</SelectItem>
                            <SelectItem value="SCHOOL_ADMIN">{t('role.school_admin')}</SelectItem>
                            <SelectItem value="STUDENT">{t('role.student')}</SelectItem>
                            <SelectItem value="PARENT">{t('role.parent')}</SelectItem>
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

                {/* Create Student Account Dialog */}
                <Dialog open={showStudentAccountDialog} onOpenChange={(open) => { if (!open) setShowStudentAccountDialog(false); }}>
                  <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-amber-500" />
                        {t('settings.create_student_account')}
                      </DialogTitle>
                      <DialogDescription>{t('auth.student_login_desc')}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{t('label.first_name')}</Label>
                          <Input value={studentAccountForm.firstName} onChange={(e) => setStudentAccountForm({ ...studentAccountForm, firstName: e.target.value })} className="rounded-xl" />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('label.last_name')}</Label>
                          <Input value={studentAccountForm.lastName} onChange={(e) => setStudentAccountForm({ ...studentAccountForm, lastName: e.target.value })} className="rounded-xl" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1"><Mail className="h-3 w-3" />{t('users.email')}</Label>
                        <Input type="email" value={studentAccountForm.email} onChange={(e) => setStudentAccountForm({ ...studentAccountForm, email: e.target.value })} className="rounded-xl" placeholder="name@schule.de" />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1"><Key className="h-3 w-3" />{t('settings.default_password')}</Label>
                        <Input type="text" value={studentAccountForm.password} onChange={(e) => setStudentAccountForm({ ...studentAccountForm, password: e.target.value })} className="rounded-xl" />
                      </div>
                      {availableStudents.length > 0 && (
                        <div className="space-y-2">
                          <Label>{t('settings.link_student')}</Label>
                          <Select value={studentAccountForm.studentId} onValueChange={(v) => setStudentAccountForm({ ...studentAccountForm, studentId: v })}>
                            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">--</SelectItem>
                              {availableStudents.map((s) => (
                                <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowStudentAccountDialog(false)} className="rounded-xl">{t('action.cancel')}</Button>
                      <Button onClick={handleCreateStudentAccount} disabled={!studentAccountForm.firstName || !studentAccountForm.lastName || !studentAccountForm.email || studentAccountForm.password.length < 6} className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl">{t('action.create')}</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Bulk Create Student Accounts Dialog */}
                <Dialog open={showBulkStudentDialog} onOpenChange={(open) => { if (!open) setShowBulkStudentDialog(false); }}>
                  <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-teal-500" />
                        {t('settings.bulk_create_students')}
                      </DialogTitle>
                      <DialogDescription>{t('auth.bulk_create')}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1"><Key className="h-3 w-3" />{t('settings.default_password')}</Label>
                        <Input type="text" value={bulkForm.defaultPassword} onChange={(e) => setBulkForm({ ...bulkForm, defaultPassword: e.target.value })} className="rounded-xl" />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1"><Mail className="h-3 w-3" />{t('settings.generate_email')}</Label>
                        <Input type="text" value={bulkForm.emailDomain} onChange={(e) => setBulkForm({ ...bulkForm, emailDomain: e.target.value })} className="rounded-xl" placeholder="schule.de" />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('settings.link_student')} ({bulkForm.selectedStudentIds.length} {t('label.selected')})</Label>
                        <div className="max-h-48 overflow-y-auto scrollbar-education rounded-xl border border-gray-200/30 dark:border-gray-800/20">
                          {availableStudents.map((s) => (
                            <label key={s.id} className="flex items-center gap-2 px-3 py-2 hover:bg-teal-50/50 dark:hover:bg-teal-900/10 cursor-pointer min-h-[44px]">
                              <Checkbox
                                checked={bulkForm.selectedStudentIds.includes(s.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setBulkForm({ ...bulkForm, selectedStudentIds: [...bulkForm.selectedStudentIds, s.id] });
                                  } else {
                                    setBulkForm({ ...bulkForm, selectedStudentIds: bulkForm.selectedStudentIds.filter((id) => id !== s.id) });
                                  }
                                }}
                              />
                              <span className="text-sm font-medium">{s.firstName} {s.lastName}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowBulkStudentDialog(false)} className="rounded-xl">{t('action.cancel')}</Button>
                      <Button onClick={handleBulkCreateStudents} disabled={bulkForm.selectedStudentIds.length === 0 || bulkCreating} className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl">
                        {bulkCreating ? (
                          <span className="flex items-center gap-2">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            {t('empty.loading')}
                          </span>
                        ) : (
                          <span>{t('action.create')} ({bulkForm.selectedStudentIds.length})</span>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Audit Log Tab ───────────────────────────────────── */}
          <TabsContent value="audit">
            <Card className="card-hover-lift border-0 shadow-sm rounded-xl border-l-3 border-l-violet-500 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-violet-50/50 to-transparent dark:from-violet-900/10 dark:to-transparent">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                      <Shield className="h-4 w-4" />
                    </div>
                    {t('settings.audit_title')}
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportAuditLogCsv({
                      schoolId: currentUser?.schoolId ?? undefined,
                      action: auditActionFilter !== 'all' ? auditActionFilter : undefined,
                      entityType: auditEntityTypeFilter !== 'all' ? auditEntityTypeFilter : undefined,
                      startDate: auditDateFrom || undefined,
                      endDate: auditDateTo || undefined,
                    })}
                    className="h-8 rounded-lg border-violet-200 dark:border-violet-900/30 text-violet-700 dark:text-violet-300 min-h-[36px]"
                  >
                    <FileDown className="h-3.5 w-3.5 mr-1" />
                    {t('audit.export_csv')}
                  </Button>
                </div>
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
                      onClick={() => { setAuditActionFilter(chip.value); setAuditPage(1); }}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all min-h-[36px] ${
                        auditActionFilter === chip.value
                          ? `${chip.color} ring-1 shadow-sm`
                          : 'bg-white/60 dark:bg-gray-800/40 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200/50 dark:border-gray-700/30'
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                {/* Entity type filter */}
                <div className="flex flex-wrap gap-1.5">
                  <Label className="text-xs text-gray-500 dark:text-gray-400 self-center">{t('audit.entity_type_filter')}</Label>
                  {(() => {
                    const entityTypes = Array.from(new Set(auditEntries.map((e) => e.entityType))).sort();
                    return [
                      { value: 'all', label: t('audit.all_entity_types') },
                      ...entityTypes.map((et) => ({ value: et, label: et })),
                    ].map((chip) => (
                      <button
                        key={chip.value}
                        onClick={() => { setAuditEntityTypeFilter(chip.value); setAuditPage(1); }}
                        className={`px-2 py-1 rounded-md text-xs font-medium transition-all min-h-[36px] ${
                          auditEntityTypeFilter === chip.value
                            ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 ring-1 ring-violet-300 dark:ring-violet-700'
                            : 'bg-white/60 dark:bg-gray-800/40 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200/50 dark:border-gray-700/30'
                        }`}
                      >
                        {chip.label}
                      </button>
                    ));
                  })()}
                </div>

                {/* Date filters */}
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs">{t('settings.audit_filter_date_from')}</Label>
                    <Input
                      type="date"
                      value={auditDateFrom}
                      onChange={(e) => { setAuditDateFrom(e.target.value); setAuditPage(1); }}
                      className="h-8 w-36 rounded-lg text-xs border-violet-200 dark:border-violet-900/30"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t('settings.audit_filter_date_to')}</Label>
                    <Input
                      type="date"
                      value={auditDateTo}
                      onChange={(e) => { setAuditDateTo(e.target.value); setAuditPage(1); }}
                      className="h-8 w-36 rounded-lg text-xs border-violet-200 dark:border-violet-900/30"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadAuditLog}
                    className="h-8 rounded-lg border-violet-200 dark:border-violet-900/30 text-violet-700 dark:text-violet-300 min-h-[36px]"
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
                          className="relative flex items-start gap-4 pl-4 py-3 group cursor-pointer"
                          onClick={() => setAuditDetailEntry(entry)}
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
                              {entry.ipAddress && (
                                <span className="text-gray-400 dark:text-gray-500 ml-2">IP: {entry.ipAddress}</span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                  );
                })()}

                {/* Pagination */}
                {auditTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={auditPage <= 1}
                      onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                      className="h-8 min-h-[36px] rounded-lg border-violet-200 dark:border-violet-900/30"
                    >
                      {t('audit.previous')}
                    </Button>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {t('audit.page')} {auditPage} {t('audit.of')} {auditTotalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={auditPage >= auditTotalPages}
                      onClick={() => setAuditPage((p) => Math.min(auditTotalPages, p + 1))}
                      className="h-8 min-h-[36px] rounded-lg border-violet-200 dark:border-violet-900/30"
                    >
                      {t('audit.next')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Audit Detail Dialog */}
            <Dialog open={!!auditDetailEntry} onOpenChange={(o) => { if (!o) setAuditDetailEntry(null); }}>
              <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
                {auditDetailEntry && (
                  <>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-violet-500" />
                        {t('audit.detail')}
                      </DialogTitle>
                      <DialogDescription>
                        {auditDetailEntry.action} - {auditDetailEntry.entityType}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-1">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <Label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{t('settings.audit_action')}</Label>
                          <p className="mt-1 font-medium">{auditDetailEntry.action}</p>
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{t('audit.entity_type')}</Label>
                          <p className="mt-1 font-medium">{auditDetailEntry.entityType}</p>
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{t('settings.audit_timestamp')}</Label>
                          <p className="mt-1 text-xs">{new Date(auditDetailEntry.timestamp).toLocaleString()}</p>
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">ID</Label>
                          <p className="mt-1 text-xs font-mono">{auditDetailEntry.entityId ?? '-'}</p>
                        </div>
                        {auditDetailEntry.ipAddress && (
                          <div>
                            <Label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{t('audit.ip_address')}</Label>
                            <p className="mt-1 text-xs">{auditDetailEntry.ipAddress}</p>
                          </div>
                        )}
                        {auditDetailEntry.userAgent && (
                          <div>
                            <Label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{t('audit.user_agent')}</Label>
                            <p className="mt-1 text-xs truncate max-w-[200px]">{auditDetailEntry.userAgent}</p>
                          </div>
                        )}
                      </div>

                      {/* Changes before/after */}
                      {auditDetailEntry.changes && (() => {
                        try {
                          const parsed = JSON.parse(auditDetailEntry.changes);
                          return (
                            <div className="space-y-2">
                              {parsed.before && (
                                <div>
                                  <Label className="text-[10px] uppercase tracking-wider text-rose-500 font-semibold">{t('audit.before')}</Label>
                                  <pre className="mt-1 p-2 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-xs text-rose-700 dark:text-rose-300 overflow-auto max-h-40 font-mono whitespace-pre-wrap">
                                    {JSON.stringify(parsed.before, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {parsed.after && (
                                <div>
                                  <Label className="text-[10px] uppercase tracking-wider text-emerald-500 font-semibold">{t('audit.after')}</Label>
                                  <pre className="mt-1 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-xs text-emerald-700 dark:text-emerald-300 overflow-auto max-h-40 font-mono whitespace-pre-wrap">
                                    {JSON.stringify(parsed.after, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          );
                        } catch {
                          return <p className="text-xs text-gray-500">{t('audit.no_changes')}</p>;
                        }
                      })()}
                    </div>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* ── Data Management Tab ─────────────────────────────── */}
          <TabsContent value="data">
            <div className="space-y-6">
              {/* Data Import */}
              <Card className="card-hover-lift border-0 shadow-sm rounded-xl border-l-3 border-l-amber-500 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-900/10 dark:to-transparent">
                  <CardTitle className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                      <Upload className="h-4 w-4" />
                    </div>
                    {t('import.title')}
                  </CardTitle>
                  <CardDescription>{t('import.csv_upload')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Import type selector */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('calendar.event_type')}</Label>
                    <div className="flex gap-2">
                      {(['students', 'assessments', 'grades'] as const).map((impType) => {
                        const icons = { students: GraduationCap, assessments: ClipboardCheck, grades: BarChart3 };
                        const Icon = icons[impType];
                        return (
                          <Button
                            key={impType}
                            variant={importType === impType ? 'default' : 'outline'}
                            size="sm"
                            className={importType === impType ? 'bg-emerald-500 hover:bg-emerald-600 text-white min-h-[44px] rounded-xl' : 'min-h-[44px] rounded-xl'}
                            onClick={() => { setImportType(impType); setImportResult(null); }}
                          >
                            <Icon className="h-4 w-4 mr-1.5" />
                            {impType === 'students' ? t('label.student') : impType === 'assessments' ? t('nav.assessments') : t('nav.grading')}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Drag and drop zone */}
                  <div
                    className={`file-drop-zone ${dragOver ? 'drag-over' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      const file = e.dataTransfer.files[0];
                      if (file && file.name.endsWith('.csv')) {
                        setImportFile(file);
                        setImportResult(null);
                      } else {
                        toast.error('Please upload a CSV file');
                      }
                    }}
                  >
                    <Upload className="h-8 w-8 text-amber-400 dark:text-amber-500 mb-2" />
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {importFile ? importFile.name : t('import.csv_upload')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Drag & drop or click to select
                    </p>
                    <input
                      type="file"
                      accept=".csv"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setImportFile(file);
                          setImportResult(null);
                        }
                      }}
                    />
                  </div>

                  {/* Import button */}
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={handleImport}
                      disabled={!importFile || importing}
                      className="bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-600 hover:to-emerald-600 text-white shadow-md rounded-xl min-h-[44px]"
                    >
                      {importing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <FileUp className="h-4 w-4 mr-1.5" />}
                      {importing ? t('import.progress') : t('action.upload')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadSample(importType)}
                      className="rounded-xl min-h-[44px]"
                    >
                      <Download className="h-4 w-4 mr-1.5" />
                      {t('import.sample_csv')}
                    </Button>
                  </div>

                  {/* Import result */}
                  {importResult && (
                    <div className="import-progress p-4 rounded-xl bg-gradient-to-r from-emerald-50/60 to-teal-50/30 dark:from-emerald-900/15 dark:to-teal-900/10 border border-emerald-200/30 dark:border-emerald-900/20">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">{t('import.summary')}</p>
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <div className="text-center">
                          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{importResult.created}</p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400">{t('import.success')}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{importResult.skipped}</p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400">Skipped</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xl font-bold text-red-600 dark:text-red-400">{importResult.errorCount}</p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400">{t('import.errors')}</p>
                        </div>
                      </div>
                      {importResult.detectedColumns.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {importResult.detectedColumns.map((col) => (
                            <Badge key={col} variant="outline" className="text-[10px] bg-gray-50 dark:bg-gray-800/50">{col}</Badge>
                          ))}
                        </div>
                      )}
                      {importResult.errors.length > 0 && (
                        <div className="mt-2 max-h-24 overflow-y-auto scrollbar-education">
                          {importResult.errors.slice(0, 5).map((err, i) => (
                            <p key={i} className="text-xs text-red-600 dark:text-red-400">{err}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Enhanced Data Export */}
              <Card className="card-hover-lift border-0 shadow-sm rounded-xl border-l-3 border-l-emerald-500 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10 dark:to-transparent">
                  <CardTitle className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                      <Download className="h-4 w-4" />
                    </div>
                    {t('export.enhanced_title')}
                  </CardTitle>
                  <CardDescription>{t('export.enhanced_desc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Export format & filters */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('export.format')}</Label>
                      <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as 'csv' | 'json' | 'pdf')}>
                        <SelectTrigger className="border-emerald-200 dark:border-emerald-900/30 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="csv"><Download className="h-3 w-3 mr-1 inline" /> {t('export.csv')}</SelectItem>
                          <SelectItem value="json"><FileJson className="h-3 w-3 mr-1 inline" /> {t('export.json')}</SelectItem>
                          <SelectItem value="pdf"><FileType className="h-3 w-3 mr-1 inline" /> {t('export.pdf')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('export.date_from')}</Label>
                      <Input
                        type="date"
                        value={exportDateFrom}
                        onChange={(e) => setExportDateFrom(e.target.value)}
                        className="border-emerald-200 dark:border-emerald-900/30 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('export.date_to')}</Label>
                      <Input
                        type="date"
                        value={exportDateTo}
                        onChange={(e) => setExportDateTo(e.target.value)}
                        className="border-emerald-200 dark:border-emerald-900/30 rounded-xl"
                      />
                    </div>
                  </div>

                  {/* Export cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {[
                      { type: 'students' as const, iconComponent: GraduationCap, label: t('export.students'), desc: t('export.grade_report'), color: 'from-emerald-50/60 to-emerald-100/0 dark:from-emerald-900/15 dark:to-emerald-900/0', border: 'border-emerald-200/40 dark:border-emerald-900/30', iconBg: 'bg-gradient-to-br from-emerald-400 to-emerald-500' },
                      { type: 'progress' as const, iconComponent: TrendingUp, label: t('export.progress'), desc: t('export.competency_report'), color: 'from-amber-50/60 to-amber-100/0 dark:from-amber-900/15 dark:to-amber-900/0', border: 'border-amber-200/40 dark:border-amber-900/30', iconBg: 'bg-gradient-to-br from-amber-400 to-amber-500' },
                      { type: 'assessments' as const, iconComponent: ClipboardCheck, label: t('export.assessments'), desc: t('export.attendance_report'), color: 'from-teal-50/60 to-teal-100/0 dark:from-teal-900/15 dark:to-teal-900/0', border: 'border-teal-200/40 dark:border-teal-900/30', iconBg: 'bg-gradient-to-br from-teal-400 to-teal-500' },
                      { type: 'grades' as const, iconComponent: BarChart3, label: t('export.grades'), desc: t('export.grade_report'), color: 'from-violet-50/60 to-violet-100/0 dark:from-violet-900/15 dark:to-violet-900/0', border: 'border-violet-200/40 dark:border-violet-900/30', iconBg: 'bg-gradient-to-br from-violet-400 to-violet-500' },
                      { type: 'attendance' as const, iconComponent: CalendarDays, label: t('export.attendance'), desc: t('export.attendance_report'), color: 'from-rose-50/60 to-rose-100/0 dark:from-rose-900/15 dark:to-rose-900/0', border: 'border-rose-200/40 dark:border-rose-900/30', iconBg: 'bg-gradient-to-br from-rose-400 to-rose-500' },
                    ].map((item) => (
                      <motion.div
                        key={item.type}
                        whileHover={{ scale: 1.03, y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        className={`p-5 rounded-xl bg-gradient-to-br ${item.color} border ${item.border} hover:shadow-lg transition-all cursor-pointer`}
                        onClick={() => handleCsvExport(item.type)}
                      >
                        <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${item.iconBg} text-white shadow-sm mb-3`}>
                          <item.iconComponent className="w-5 h-5" />
                        </div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{item.label}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.desc}</p>
                        <div className="flex items-center gap-1 mt-2">
                          <Badge variant="outline" className="text-[10px] bg-white/50 dark:bg-gray-800/50">{exportFormat.toUpperCase()}</Badge>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Progress indicator */}
                  {exporting && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200/30">
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                      <p className="text-sm text-emerald-700 dark:text-emerald-300">{t('export.progress_indicator')}</p>
                    </div>
                  )}

                  {/* Export history */}
                  {exportHistory.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('export.download_history')}</p>
                      <div className="max-h-32 overflow-y-auto scrollbar-education space-y-1">
                        {exportHistory.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-700 dark:text-gray-300 capitalize">{item.type}</span>
                              <Badge variant="outline" className="text-[10px]">{item.format?.toUpperCase() || 'CSV'}</Badge>
                            </div>
                            <span className="text-gray-500 dark:text-gray-400">{item.date}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* GDPR Data Erasure — Danger Zone */}
              <div className="danger-zone">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-rose-700 dark:text-rose-300">
                      {t('settings.data_erasure')}
                    </h3>
                    <p className="text-xs text-rose-600/70 dark:text-rose-400/60">
                      {t('settings.data_erasure_desc')}
                    </p>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-rose-50/50 dark:bg-rose-900/10 border border-rose-200/30 dark:border-rose-900/20 mb-3">
                  <p className="text-xs text-rose-700 dark:text-rose-300 font-medium">
                    <AlertTriangle className="w-3 h-3 inline mr-1" /> {t('settings.data_erasure_desc')}
                  </p>
                </div>
                <Button
                  onClick={() => setShowErasureDialog(true)}
                  variant="outline"
                  className="border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl px-6 min-h-[44px]"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('settings.data_erasure_request')}
                </Button>
              </div>

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
              {/* Demo Data Danger Zone Card */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="card-hover-lift border-2 border-rose-200 dark:border-rose-900/40 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-gray-950 mb-6">
                  <CardHeader className="bg-gradient-to-r from-rose-50/80 to-rose-100/40 dark:from-rose-900/20 dark:to-rose-900/10 pb-3 pt-6">
                    <CardTitle className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
                        <Trash2 className="h-5 w-5" />
                      </div>
                      {t('settings.demo_data_title')}
                    </CardTitle>
                    <CardDescription className="text-rose-600/60 dark:text-rose-400/40">{t('settings.demo_data_desc')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Demo record count */}
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-rose-50/60 to-rose-50/0 dark:from-rose-900/15 dark:to-rose-900/0 border border-rose-100/50 dark:border-rose-900/20">
                      <DatabaseIcon className="h-5 w-5 text-rose-500 shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {t('settings.demo_record_count')}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {demoAccounts.length} {t('settings.demo_record_count').toLowerCase()}
                        </p>
                      </div>
                    </div>

                    {/* Big red Delete All Demo Data button */}
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        onClick={() => setDeleteAllDemoOpen(true)}
                        className="w-full h-12 min-h-[44px] bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white shadow-lg shadow-rose-300/20 rounded-xl"
                      >
                        <Trash2 className="h-5 w-5 mr-2" />
                        {t('settings.demo_delete_all_data')}
                      </Button>
                    </motion.div>

                    {/* Environmental-friendly messaging */}
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-gradient-to-r from-emerald-50/60 to-teal-50/30 dark:from-emerald-900/15 dark:to-teal-900/10 border border-emerald-200/30 dark:border-emerald-900/20">
                      <Leaf className="h-4 w-4 text-emerald-500 shrink-0" />
                      <p className="text-xs text-emerald-700/70 dark:text-emerald-400/50">
                        {t('settings.env_tip')}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Demo Accounts Card */}
              <Card className="card-hover-lift border-0 shadow-sm rounded-xl border-l-3 border-l-amber-500 overflow-hidden bg-white dark:bg-gray-950">
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
                  <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50/50 to-emerald-50/30 dark:from-amber-900/10 dark:to-emerald-900/5 border border-amber-200/30 dark:border-amber-900/20">
                    <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {t('settings.demo_toggle_hint')}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2">
                    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                      <Button
                        onClick={handleEnableAllDemo}
                        className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md shadow-emerald-300/20 rounded-xl min-h-[44px]"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1.5" />
                        {t('settings.demo_enable')}
                      </Button>
                    </motion.div>
                    <Button
                      onClick={handleDisableAllDemo}
                      variant="outline"
                      className="border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl min-h-[44px]"
                    >
                      <Clock className="h-4 w-4 mr-1.5" />
                      {t('settings.demo_disable_all')}
                    </Button>
                    <Button
                      onClick={() => setDeleteAllDemoOpen(true)}
                      variant="outline"
                      className="border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl min-h-[44px]"
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

          {/* ── Backup Tab ─────────────────────────────────────────── */}
          <TabsContent value="backup">
            <Card className="card-hover-lift border-0 shadow-sm rounded-xl border-l-3 border-l-teal-500 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-teal-50/50 to-transparent dark:from-teal-900/10 dark:to-transparent">
                <CardTitle className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
                    <HardDrive className="h-4 w-4" />
                  </div>
                  {t('backup.title')}
                </CardTitle>
                <CardDescription>{t('backup.auto')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Create backup + Auto-backup toggle */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <Button
                    onClick={handleCreateBackup}
                    disabled={backupCreating}
                    className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white shadow-md rounded-xl px-6 min-h-[44px]"
                  >
                    {backupCreating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Archive className="h-4 w-4 mr-2" />
                    )}
                    {backupCreating ? t('backup.creating') : t('backup.create')}
                  </Button>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={autoBackupEnabled}
                        onCheckedChange={setAutoBackupEnabled}
                        className="data-[state=checked]:bg-teal-500"
                      />
                      <Label className="text-sm text-gray-600 dark:text-gray-400">{t('backup.auto')}</Label>
                    </div>
                    {autoBackupEnabled && (
                      <Select value={autoBackupFrequency} onValueChange={(v) => setAutoBackupFrequency(v as 'daily' | 'weekly')}>
                        <SelectTrigger className="w-32 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">{t('backup.daily')}</SelectItem>
                          <SelectItem value="weekly">{t('backup.weekly')}</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                {/* Last backup info */}
                {backups.length > 0 && backups[0].status === 'completed' && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Clock className="h-4 w-4" />
                    {t('backup.last')}: {new Date(backups[0].createdAt).toLocaleString()}
                  </div>
                )}

                {/* Backup list */}
                {backupLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
                  </div>
                ) : backups.length === 0 ? (
                  <div className="text-center py-8">
                    <HardDrive className="h-8 w-8 text-teal-400 dark:text-teal-500 mx-auto mb-2" />
                    <p className="text-gray-500 dark:text-gray-400">{t('backup.no_backups')}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('backup.no_backups_desc')}</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-education">
                    {backups.map((backup) => {
                      const sizeKB = Math.round(backup.size / 1024);
                      const sizeMB = (backup.size / (1024 * 1024)).toFixed(1);
                      const sizeDisplay = backup.size > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;
                      const statusColor = backup.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : backup.status === 'failed'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
                      const statusText = backup.status === 'completed'
                        ? t('backup.completed')
                        : backup.status === 'failed'
                        ? t('backup.failed')
                        : t('backup.pending');

                      return (
                        <motion.div
                          key={backup.id}
                          whileHover={{ scale: 1.01 }}
                          className="p-4 rounded-xl bg-gradient-to-r from-gray-50 to-gray-50/0 dark:from-gray-800/50 dark:to-gray-800/0 border-l-3 border-l-teal-400/40 hover:border-l-teal-500 transition-colors"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 shrink-0">
                                <Archive className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{backup.filename}</p>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {new Date(backup.createdAt).toLocaleString()}
                                  </span>
                                  <Badge className={`${statusColor} text-[10px] px-1.5 py-0`}>
                                    {statusText}
                                  </Badge>
                                  <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400 text-[10px] px-1.5 py-0">
                                    {backup.type === 'full' ? t('backup.type_full') : t('backup.type_incremental')}
                                  </Badge>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">{t('backup.size')}: {sizeDisplay}</span>
                                </div>
                                {backup.notes && (
                                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{backup.notes}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadBackup(backup)}
                                className="h-8 w-8 text-gray-400 hover:text-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20"
                                aria-label={t('backup.download')}
                              >
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setRestoreBackupId(backup.id)}
                                className="h-8 w-8 text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                                aria-label={t('backup.restore')}
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteBackupId(backup.id)}
                                className="h-8 w-8 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                                aria-label={t('backup.delete')}
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
          </TabsContent>

      {/* ── Backup Restore Confirmation ──────────────────────────── */}
      <AlertDialog open={!!restoreBackupId} onOpenChange={(open) => { if (!open) setRestoreBackupId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('backup.restore_confirm')}</AlertDialogTitle>
            <AlertDialogDescription>{t('backup.restore_confirm_desc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('action.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestoreBackup} className="bg-amber-600 hover:bg-amber-700 text-white">
              <RotateCcw className="h-4 w-4 mr-1.5" />
              {t('backup.restore')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Backup Delete Confirmation ───────────────────────────── */}
      <AlertDialog open={!!deleteBackupId} onOpenChange={(open) => { if (!open) setDeleteBackupId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('backup.delete_confirm')}</AlertDialogTitle>
            <AlertDialogDescription>{t('backup.delete_confirm_desc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('action.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteBackupId && handleDeleteBackup(deleteBackupId)} className="bg-rose-600 hover:bg-rose-700 text-white">
              {t('action.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── District Tab (SUPER_ADMIN only) ─────────────────────────── */}
      {isSuperAdmin && (
        <TabsContent value="district">
          <div className="space-y-6">
            {/* District Management Card */}
            <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
              <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-violet-50/50 to-transparent dark:from-violet-900/10 dark:to-transparent">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                      <Building2 className="h-4 w-4" />
                    </div>
                    {t('district.title')}
                  </CardTitle>
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <Button
                      className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white shadow-md shadow-violet-300/20 rounded-xl min-h-[44px]"
                      onClick={() => { resetDistrictForm(); setEditingDistrict(null); setDistrictDialogOpen(true); }}
                    >
                      <Plus className="h-4 w-4 mr-1.5" />
                      {t('district.create')}
                    </Button>
                  </motion.div>
                </div>
              </CardHeader>
              <CardContent>
                {districtsLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
                  </div>
                ) : districts.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 mx-auto mb-5 shadow-md shadow-violet-200/40 dark:shadow-violet-900/20">
                      <Building2 className="h-10 w-10 text-violet-500 dark:text-violet-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">{t('district.no_districts')}</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">{t('district.no_districts_desc')}</p>
                    <Button className="mt-5 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white rounded-xl min-h-[44px]" onClick={() => { resetDistrictForm(); setEditingDistrict(null); setDistrictDialogOpen(true); }}>
                      <Plus className="h-4 w-4 mr-1" />
                      {t('district.create')}
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {districts.map((district) => (
                      <motion.div
                        key={district.id}
                        whileHover={{ scale: 1.01 }}
                        className="district-card p-5 bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 cursor-pointer"
                        onClick={() => loadDistrictSchoolsData(district.id)}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 text-white shadow-sm">
                            <Building2 className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{district.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {district.code && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">{district.code}</span>
                              )}
                              {district.region && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-0.5">
                                  <MapPin className="h-3 w-3" />{district.region}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mb-3">
                          <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 text-[10px] px-1.5 py-0 rounded-xl">
                            {t('district.school_count')}: {district.schools.length}
                          </Badge>
                          {district.isActive ? (
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px] px-1.5 py-0 rounded-xl">
                              {t('schedules.active')}
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-500 dark:bg-gray-900/30 dark:text-gray-400 text-[10px] px-1.5 py-0 rounded-xl">
                              {t('schedules.inactive')}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="min-h-[44px] min-w-[44px] rounded-xl text-gray-400 hover:text-violet-500"
                            onClick={(e) => { e.stopPropagation(); openEditDistrict(district); }}
                            aria-label={t('action.edit')}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="min-h-[44px] min-w-[44px] rounded-xl text-gray-400 hover:text-rose-500"
                            onClick={(e) => { e.stopPropagation(); setDeleteDistrictId(district.id); }}
                            aria-label={t('action.delete')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* District Schools Detail */}
            {selectedDistrictId && (
              <Card className="card-hover-lift border-0 shadow-sm rounded-xl border-l-3 border-l-violet-500 overflow-hidden">
                <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-violet-50/50 to-transparent dark:from-violet-900/10 dark:to-transparent">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                      <School className="h-4 w-4" />
                    </div>
                    {t('district.schools')}
                    {districts.find((d) => d.id === selectedDistrictId) && (
                      <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                        · {districts.find((d) => d.id === selectedDistrictId)!.name}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Assign school */}
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="space-y-1 min-w-[200px]">
                      <Label className="text-sm font-medium">{t('district.assign_school')}</Label>
                      <Select value={assignSchoolId} onValueChange={setAssignSchoolId}>
                        <SelectTrigger className="rounded-xl border-violet-200/50 dark:border-violet-900/30">
                          <SelectValue placeholder={t('district.select_school')} />
                        </SelectTrigger>
                        <SelectContent>
                          {schools
                            .filter((s) => !districtSchools.find((ds) => ds.id === s.id))
                            .map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white rounded-xl min-h-[44px]"
                      onClick={handleAssignSchool}
                      disabled={!assignSchoolId}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {t('district.assign_school')}
                    </Button>
                  </div>

                  {/* Schools list */}
                  {districtSchoolsLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
                    </div>
                  ) : districtSchools.length === 0 ? (
                    <div className="text-center py-8">
                      <School className="h-8 w-8 text-violet-400 dark:text-violet-500 mx-auto mb-2" />
                      <p className="text-gray-500 dark:text-gray-400">{t('district.no_schools_assigned')}</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-education">
                      {districtSchools.map((school) => (
                        <div key={school.id} className="p-4 rounded-xl bg-gradient-to-r from-gray-50 to-gray-50/0 dark:from-gray-800/50 dark:to-gray-800/0 border-l-3 border-l-violet-400/40 hover:border-l-violet-500 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                                <School className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{school.name}</p>
                                <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                  <span>{t('district.total_students')}: {school._count.students}</span>
                                  <span>{t('district.total_classes')}: {school._count.classGroups}</span>
                                  <span>{t('district.total_teachers')}: {school._count.users}</span>
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="min-h-[44px] min-w-[44px] text-gray-400 hover:text-rose-500 rounded-xl"
                              onClick={() => handleUnassignSchool(school.id)}
                              aria-label={t('district.unassign_school')}
                            >
                              <ArrowRightLeft className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Cross-School Comparison */}
            {districts.length > 0 && (
              <Card className="card-hover-lift border-0 shadow-sm rounded-xl border-l-3 border-l-purple-500 overflow-hidden">
                <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-purple-50/50 to-transparent dark:from-purple-900/10 dark:to-transparent">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                      <BarChart3 className="h-4 w-4" />
                    </div>
                    {t('district.cross_school_comparison')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="cross-school-comparison">
                    {districts.map((district) => {
                      const totalStudents = district.schools.length;
                      const maxSchools = Math.max(...districts.map((d) => d.schools.length), 1);
                      const pct = Math.round((totalStudents / maxSchools) * 100);
                      return (
                        <div key={district.id} className="p-4 rounded-xl bg-gradient-to-r from-gray-50 to-gray-50/0 dark:from-gray-800/50 dark:to-gray-800/0">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{district.name}</p>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 text-[10px] px-1.5 py-0 rounded-xl">
                                {district.schools.length} {t('district.schools')}
                              </Badge>
                              {totalStudents === maxSchools && districts.length > 1 && (
                                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px] px-1.5 py-0 rounded-xl">
                                  <ArrowUpRight className="h-3 w-3 mr-0.5" />
                                  {t('district.top_performing')}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="comparison-bar">
                            <div
                              className="comparison-bar-fill bg-gradient-to-r from-violet-400 to-purple-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      )}

      {/* ── District Create/Edit Dialog ─────────────────────────────── */}
      <Dialog open={districtDialogOpen} onOpenChange={(open) => { if (!open) { setDistrictDialogOpen(false); setEditingDistrict(null); } }}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingDistrict ? t('district.edit') : t('district.create')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('district.name')}</Label>
              <Input
                value={districtForm.name}
                onChange={(e) => setDistrictForm({ ...districtForm, name: e.target.value })}
                className="rounded-xl border-violet-200/50 dark:border-violet-900/30"
                placeholder={t('district.name')}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('district.code')}</Label>
                <Input
                  value={districtForm.code}
                  onChange={(e) => setDistrictForm({ ...districtForm, code: e.target.value })}
                  className="rounded-xl border-violet-200/50 dark:border-violet-900/30"
                  placeholder="DE-NW-001"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('district.region')}</Label>
                <Input
                  value={districtForm.region}
                  onChange={(e) => setDistrictForm({ ...districtForm, region: e.target.value })}
                  className="rounded-xl border-violet-200/50 dark:border-violet-900/30"
                  placeholder="Nordrhein-Westfalen"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('district.country')}</Label>
                <Input
                  value={districtForm.country}
                  onChange={(e) => setDistrictForm({ ...districtForm, country: e.target.value })}
                  className="rounded-xl border-violet-200/50 dark:border-violet-900/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('district.admin_email')}</Label>
                <Input
                  type="email"
                  value={districtForm.adminEmail}
                  onChange={(e) => setDistrictForm({ ...districtForm, adminEmail: e.target.value })}
                  className="rounded-xl border-violet-200/50 dark:border-violet-900/30"
                  placeholder="admin@bezirk.de"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDistrictDialogOpen(false); setEditingDistrict(null); }} className="rounded-xl">{t('action.cancel')}</Button>
            <Button
              className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white rounded-xl shadow-md min-h-[44px]"
              onClick={editingDistrict ? handleUpdateDistrict : handleCreateDistrict}
              disabled={districtSaving || !districtForm.name}
            >
              {districtSaving ? t('empty.loading') : (editingDistrict ? t('action.save') : t('district.create'))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── District Delete Confirmation ────────────────────────────── */}
      <AlertDialog open={!!deleteDistrictId} onOpenChange={(open) => { if (!open) setDeleteDistrictId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('district.confirm_delete')}</AlertDialogTitle>
            <AlertDialogDescription>{t('district.confirm_delete_desc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('action.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteDistrictId && handleDeleteDistrict(deleteDistrictId)} className="bg-rose-600 hover:bg-rose-700 text-white">
              {t('action.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Rate Limit Tab ─────────────────────────────────────────── */}
      <TabsContent value="rate-limit">
        <Card className="card-hover-lift border-0 shadow-sm rounded-xl border-l-3 border-l-rose-500 overflow-hidden">
          <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-rose-50/50 to-transparent dark:from-rose-900/10 dark:to-transparent">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
                <Shield className="h-4 w-4" />
              </div>
              {t('rate_limit.status_title')}
            </CardTitle>
            <CardDescription className="text-xs text-gray-500 dark:text-gray-400">
              {t('rate_limit.auth_limit')} · {t('rate_limit.data_limit')} · {t('rate_limit.write_limit')} · {t('rate_limit.heavy_limit')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RateLimitStatus />
          </CardContent>
        </Card>
      </TabsContent>

      {/* ── Branding Tab ───────────────────────────────────────────── */}
      <TabsContent value="branding">
        <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-teal-500 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-teal-50/50 to-transparent dark:from-teal-900/10 dark:to-transparent">
            <CardTitle className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
                <Palette className="h-4 w-4" />
              </div>
              {t('branding.title')}
            </CardTitle>
            <CardDescription>{t('branding.colors')} · {t('branding.typography')} · {t('branding.contact')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Logo */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-teal-700 dark:text-teal-400">{t('branding.logo_url')}</Label>
              <Input
                value={brandingForm.logoUrl}
                onChange={(e) => setBrandingForm({ ...brandingForm, logoUrl: e.target.value })}
                placeholder={t('branding.logo_placeholder')}
                className="border-teal-200 dark:border-teal-900/30 rounded-xl"
              />
              {brandingForm.logoUrl && (
                <div className="mt-2 flex items-center gap-3">
                  <img src={brandingForm.logoUrl} alt="Logo preview" className="w-12 h-12 rounded-xl object-contain border border-teal-200 dark:border-teal-900/30" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <span className="text-xs text-gray-500 dark:text-gray-400">{t('branding.preview')}</span>
                </div>
              )}
            </div>

            {/* Colors */}
            <div className="space-y-4">
              <p className="text-sm font-semibold text-teal-700 dark:text-teal-400">{t('branding.colors')}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600 dark:text-gray-400">{t('branding.primary_color')}</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={brandingForm.primaryColor}
                      onChange={(e) => setBrandingForm({ ...brandingForm, primaryColor: e.target.value })}
                      className="w-10 h-10 rounded-lg border border-teal-200 dark:border-teal-900/30 cursor-pointer min-h-[44px]"
                    />
                    <Input
                      value={brandingForm.primaryColor}
                      onChange={(e) => setBrandingForm({ ...brandingForm, primaryColor: e.target.value })}
                      className="border-teal-200 dark:border-teal-900/30 rounded-xl text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600 dark:text-gray-400">{t('branding.secondary_color')}</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={brandingForm.secondaryColor}
                      onChange={(e) => setBrandingForm({ ...brandingForm, secondaryColor: e.target.value })}
                      className="w-10 h-10 rounded-lg border border-teal-200 dark:border-teal-900/30 cursor-pointer min-h-[44px]"
                    />
                    <Input
                      value={brandingForm.secondaryColor}
                      onChange={(e) => setBrandingForm({ ...brandingForm, secondaryColor: e.target.value })}
                      className="border-teal-200 dark:border-teal-900/30 rounded-xl text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600 dark:text-gray-400">{t('branding.accent_color')}</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={brandingForm.accentColor}
                      onChange={(e) => setBrandingForm({ ...brandingForm, accentColor: e.target.value })}
                      className="w-10 h-10 rounded-lg border border-teal-200 dark:border-teal-900/30 cursor-pointer min-h-[44px]"
                    />
                    <Input
                      value={brandingForm.accentColor}
                      onChange={(e) => setBrandingForm({ ...brandingForm, accentColor: e.target.value })}
                      className="border-teal-200 dark:border-teal-900/30 rounded-xl text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Typography */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-teal-700 dark:text-teal-400">{t('branding.font')}</Label>
              <Select value={brandingForm.fontFamily} onValueChange={(v) => setBrandingForm({ ...brandingForm, fontFamily: v })}>
                <SelectTrigger className="border-teal-200 dark:border-teal-900/30 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Inter">Inter</SelectItem>
                  <SelectItem value="Roboto">Roboto</SelectItem>
                  <SelectItem value="Open Sans">Open Sans</SelectItem>
                  <SelectItem value="Lato">Lato</SelectItem>
                  <SelectItem value="Nunito">Nunito</SelectItem>
                  <SelectItem value="Poppins">Poppins</SelectItem>
                  <SelectItem value="Source Sans Pro">Source Sans Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Motto */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-teal-700 dark:text-teal-400">{t('branding.motto')}</Label>
              <Input
                value={brandingForm.motto}
                onChange={(e) => setBrandingForm({ ...brandingForm, motto: e.target.value })}
                placeholder={t('branding.motto_placeholder')}
                className="border-teal-200 dark:border-teal-900/30 rounded-xl"
              />
            </div>

            {/* Contact info */}
            <div className="space-y-4">
              <p className="text-sm font-semibold text-teal-700 dark:text-teal-400">{t('branding.contact')}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600 dark:text-gray-400">{t('branding.website')}</Label>
                  <Input
                    value={brandingForm.websiteUrl}
                    onChange={(e) => setBrandingForm({ ...brandingForm, websiteUrl: e.target.value })}
                    placeholder={t('branding.website_placeholder')}
                    className="border-teal-200 dark:border-teal-900/30 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600 dark:text-gray-400">{t('branding.email_domain')}</Label>
                  <Input
                    value={brandingForm.emailDomain}
                    onChange={(e) => setBrandingForm({ ...brandingForm, emailDomain: e.target.value })}
                    placeholder={t('branding.email_domain_placeholder')}
                    className="border-teal-200 dark:border-teal-900/30 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600 dark:text-gray-400">{t('branding.address')}</Label>
                  <Input
                    value={brandingForm.address}
                    onChange={(e) => setBrandingForm({ ...brandingForm, address: e.target.value })}
                    className="border-teal-200 dark:border-teal-900/30 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600 dark:text-gray-400">{t('branding.phone')}</Label>
                  <Input
                    value={brandingForm.phone}
                    onChange={(e) => setBrandingForm({ ...brandingForm, phone: e.target.value })}
                    className="border-teal-200 dark:border-teal-900/30 rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Custom CSS */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-teal-700 dark:text-teal-400">{t('branding.custom_css')}</Label>
              <textarea
                value={brandingForm.customCss}
                onChange={(e) => setBrandingForm({ ...brandingForm, customCss: e.target.value })}
                placeholder={t('branding.custom_css_placeholder')}
                rows={4}
                className="w-full border border-teal-200 dark:border-teal-900/30 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-900 focus:border-teal-500 focus:outline-none resize-y"
              />
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-teal-700 dark:text-teal-400">{t('branding.preview')}</Label>
              <div className="p-4 rounded-xl border border-teal-200/50 dark:border-teal-900/30 bg-white dark:bg-gray-900" style={{ fontFamily: `"${brandingForm.fontFamily}", sans-serif` }}>
                <div className="flex items-center gap-3 mb-3">
                  {brandingForm.logoUrl ? (
                    <img src={brandingForm.logoUrl} alt="Logo" className="w-10 h-10 rounded-xl object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: `linear-gradient(135deg, ${brandingForm.primaryColor}, ${brandingForm.secondaryColor})` }}>
                      <BookOpen className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-gray-900 dark:text-gray-100" style={{ color: brandingForm.primaryColor }}>{selectedSchool?.name || 'CompetenceTrack'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{brandingForm.motto || t('app.subtitle')}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Button size="sm" className="rounded-xl min-h-[44px]" style={{ backgroundColor: brandingForm.primaryColor, color: '#fff' }}>
                    {t('action.save')}
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-xl min-h-[44px]" style={{ borderColor: brandingForm.secondaryColor, color: brandingForm.secondaryColor }}>
                    {t('action.cancel')}
                  </Button>
                  <div className="flex gap-1 mt-2">
                    <div className="w-6 h-6 rounded-full" style={{ backgroundColor: brandingForm.primaryColor }} />
                    <div className="w-6 h-6 rounded-full" style={{ backgroundColor: brandingForm.secondaryColor }} />
                    <div className="w-6 h-6 rounded-full" style={{ backgroundColor: brandingForm.accentColor }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Save button */}
            <div className="flex items-center gap-3">
              <Button
                onClick={handleSaveBranding}
                disabled={brandingSaving}
                className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white shadow-md rounded-xl px-6 min-h-[44px]"
              >
                {brandingSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                {t('action.save')}
              </Button>
              <Button
                variant="outline"
                onClick={() => setBrandingForm({
                  logoUrl: '',
                  primaryColor: '#10b981',
                  secondaryColor: '#14b8a6',
                  accentColor: '#059669',
                  fontFamily: 'Inter',
                  customCss: '',
                  motto: '',
                  websiteUrl: '',
                  emailDomain: '',
                  address: '',
                  phone: '',
                })}
                className="rounded-xl min-h-[44px]"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                {t('branding.reset')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ── Email Tab ───────────────────────────────────────────────── */}
      <TabsContent value="email">
        <div className="space-y-6">
          {/* Email Templates */}
          <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-amber-500 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-900/10 dark:to-transparent">
              <CardTitle className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                  <Mail className="h-4 w-4" />
                </div>
                {t('email.templates_title')}
              </CardTitle>
              <CardDescription>{t('email.templates_desc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => { setEditingEmailTemplate(null); setEmailTemplateForm({ name: '', subject: '', body: '' }); setShowEmailTemplateDialog(true); }}
                className="bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-600 hover:to-emerald-600 text-white shadow-md rounded-xl px-6 min-h-[44px]"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('email.template_create')}
              </Button>

              {emailTemplatesLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
                </div>
              ) : emailTemplates.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="h-8 w-8 text-amber-400 dark:text-amber-500 mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-gray-400">{t('empty.no_data')}</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-education">
                  {emailTemplates.map((template) => (
                    <motion.div
                      key={template.id}
                      whileHover={{ scale: 1.01 }}
                      className="p-4 rounded-xl bg-gradient-to-r from-gray-50 to-gray-50/0 dark:from-gray-800/50 dark:to-gray-800/0 border border-gray-200/40 dark:border-gray-700/30 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{template.name}</p>
                            {template.isDefault && <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-xs">{t('email.template_default')}</Badge>}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{template.subject}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 min-h-[44px] min-w-[44px] hover:bg-amber-50 dark:hover:bg-amber-900/20"
                            onClick={() => { setEmailPreviewTemplate(template); setShowEmailPreview(true); setTestEmailRecipient(currentUser?.email || ''); }}
                          >
                            <Eye className="h-4 w-4 text-amber-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 min-h-[44px] min-w-[44px] hover:bg-amber-50 dark:hover:bg-amber-900/20"
                            onClick={() => { setEditingEmailTemplate(template); setEmailTemplateForm({ name: template.name, subject: template.subject, body: template.body }); setShowEmailTemplateDialog(true); }}
                          >
                            <Pencil className="h-4 w-4 text-gray-500" />
                          </Button>
                          {!template.isDefault && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 min-h-[44px] min-w-[44px] hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                              onClick={() => setDeleteEmailTemplateId(template.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Email Settings */}
          <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-teal-500 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-teal-50/50 to-transparent dark:from-teal-900/10 dark:to-transparent">
              <CardTitle className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
                  <SettingsIcon className="h-4 w-4" />
                </div>
                {t('email.settings')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* SMTP config (display only — placeholder) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600 dark:text-gray-400">{t('email.smtp_host')}</Label>
                  <Input
                    value={emailSettings.smtpHost}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtpHost: e.target.value })}
                    placeholder="smtp.example.com"
                    className="border-teal-200 dark:border-teal-900/30 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600 dark:text-gray-400">{t('email.smtp_port')}</Label>
                  <Input
                    value={emailSettings.smtpPort}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtpPort: e.target.value })}
                    placeholder="587"
                    className="border-teal-200 dark:border-teal-900/30 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600 dark:text-gray-400">{t('email.smtp_user')}</Label>
                  <Input
                    value={emailSettings.smtpUser}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtpUser: e.target.value })}
                    className="border-teal-200 dark:border-teal-900/30 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600 dark:text-gray-400">{t('email.smtp_from')}</Label>
                  <Input
                    value={emailSettings.smtpFrom}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtpFrom: e.target.value })}
                    className="border-teal-200 dark:border-teal-900/30 rounded-xl"
                  />
                </div>
              </div>

              {/* Frequency */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-600 dark:text-gray-400">{t('email.frequency')}</Label>
                <Select value={emailSettings.frequency} onValueChange={(v) => setEmailSettings({ ...emailSettings, frequency: v })}>
                  <SelectTrigger className="border-teal-200 dark:border-teal-900/30 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">{t('email.frequency_daily')}</SelectItem>
                    <SelectItem value="weekly">{t('email.frequency_weekly')}</SelectItem>
                    <SelectItem value="monthly">{t('email.frequency_monthly')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Toggle switches */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <Label className="text-sm">{t('email.auto_reports')}</Label>
                  <Switch checked={emailSettings.autoReports} onCheckedChange={(v) => setEmailSettings({ ...emailSettings, autoReports: v })} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <Label className="text-sm">{t('email.auto_behavior')}</Label>
                  <Switch checked={emailSettings.autoBehavior} onCheckedChange={(v) => setEmailSettings({ ...emailSettings, autoBehavior: v })} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <Label className="text-sm">{t('email.auto_attendance')}</Label>
                  <Switch checked={emailSettings.autoAttendance} onCheckedChange={(v) => setEmailSettings({ ...emailSettings, autoAttendance: v })} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email Log */}
          <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-emerald-500 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10 dark:to-transparent">
              <CardTitle className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                  <Activity className="h-4 w-4" />
                </div>
                {t('email.log_title')}
              </CardTitle>
              <CardDescription>{t('email.counts')}: {emailLogCounts.sent} {t('email.status_sent')} · {emailLogCounts.failed} {t('email.status_failed')} · {emailLogCounts.pending} {t('email.status_pending')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Select value={emailLogFilter} onValueChange={(v) => { setEmailLogFilter(v); }}>
                  <SelectTrigger className="border-emerald-200 dark:border-emerald-900/30 rounded-xl w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('export.all_classes')}</SelectItem>
                    <SelectItem value="sent">{t('email.status_sent')}</SelectItem>
                    <SelectItem value="failed">{t('email.status_failed')}</SelectItem>
                    <SelectItem value="pending">{t('email.status_pending')}</SelectItem>
                    <SelectItem value="bounced">{t('email.status_bounced')}</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => loadEmailLogs()} className="rounded-xl min-h-[44px]">
                  <RefreshCw className="h-4 w-4 mr-1.5" />
                  {t('action.refresh')}
                </Button>
              </div>

              {emailLogsLoading ? (
                <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
              ) : emailLogs.length === 0 ? (
                <div className="text-center py-6">
                  <Mail className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{t('empty.no_data')}</p>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto scrollbar-education space-y-2">
                  {emailLogs.map((log) => (
                    <div key={log.id} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200/30 dark:border-gray-700/20">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{log.subject}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{log.recipientEmail} · {log.recipientName}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={`text-xs ${log.status === 'sent' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : log.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : log.status === 'bounced' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700/30 dark:text-gray-300'}`}>
                            {log.status === 'sent' ? t('email.status_sent') : log.status === 'failed' ? t('email.status_failed') : log.status === 'bounced' ? t('email.status_bounced') : t('email.status_pending')}
                          </Badge>
                          <span className="text-xs text-gray-400">{new Date(log.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* ── Email Template Create/Edit Dialog ───────────────────────────── */}
      <Dialog open={showEmailTemplateDialog} onOpenChange={(open) => { if (!open) { setShowEmailTemplateDialog(false); setEditingEmailTemplate(null); } }}>
        <DialogContent className="rounded-xl max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingEmailTemplate ? t('email.template_edit') : t('email.template_create')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('email.template_name')}</Label>
              <Input
                value={emailTemplateForm.name}
                onChange={(e) => setEmailTemplateForm({ ...emailTemplateForm, name: e.target.value })}
                className="rounded-xl border-amber-200/50 dark:border-amber-900/30"
                placeholder="weekly_report"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('email.template_subject')}</Label>
              <Input
                value={emailTemplateForm.subject}
                onChange={(e) => setEmailTemplateForm({ ...emailTemplateForm, subject: e.target.value })}
                className="rounded-xl border-amber-200/50 dark:border-amber-900/30"
                placeholder="Wochenbericht {{studentName}}"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('email.template_body')}</Label>
              <textarea
                value={emailTemplateForm.body}
                onChange={(e) => setEmailTemplateForm({ ...emailTemplateForm, body: e.target.value })}
                rows={8}
                className="w-full border border-amber-200/50 dark:border-amber-900/30 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-900 focus:border-amber-500 focus:outline-none resize-y"
                placeholder="<h1>Willkommen {{studentName}}</h1><p>...</p>"
              />
            </div>
            {/* Variable help */}
            <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/30 dark:border-amber-900/20">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-2">{t('email.template_variables')}</p>
              <div className="flex flex-wrap gap-1.5">
                {['{{studentName}}', '{{className}}', '{{teacherName}}', '{{date}}', '{{score}}', '{{schoolName}}', '{{subjectName}}', '{{behaviorDescription}}', '{{behaviorCategory}}', '{{attendanceStatus}}', '{{email}}', '{{competencyProgress}}'].map((v) => (
                  <Badge key={v} variant="outline" className="text-xs cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/30" onClick={() => setEmailTemplateForm({ ...emailTemplateForm, body: emailTemplateForm.body + v })}>{v}</Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEmailTemplateDialog(false); setEditingEmailTemplate(null); }} className="rounded-xl">{t('action.cancel')}</Button>
            <Button
              className="bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-600 hover:to-emerald-600 text-white rounded-xl shadow-md min-h-[44px]"
              onClick={handleSaveEmailTemplate}
              disabled={emailTemplateSaving || !emailTemplateForm.name || !emailTemplateForm.subject}
            >
              {emailTemplateSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              {t('action.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Email Preview Dialog ────────────────────────────────────────── */}
      <Dialog open={showEmailPreview} onOpenChange={(open) => { if (!open) { setShowEmailPreview(false); setEmailPreviewTemplate(null); } }}>
        <DialogContent className="rounded-xl max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{t('email.template_preview')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {emailPreviewTemplate && (
              <>
                <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{t('email.template_subject')}: {emailPreviewTemplate.subject}</p>
                  <div className="mt-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-sm max-h-64 overflow-y-auto scrollbar-education">
                    {emailPreviewTemplate.body.replace(/\{\{studentName\}\}/g, 'Max Mustermann').replace(/\{\{className\}\}/g, 'Klasse 5a').replace(/\{\{teacherName\}\}/g, 'Frau Muster').replace(/\{\{date\}\}/g, new Date().toLocaleDateString()).replace(/\{\{schoolName\}\}/g, 'CompetenceTrack Schule').replace(/\{\{subjectName\}\}/g, 'Mathematik').replace(/\{\{score\}\}/g, '85%')}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t('email.test_recipient')}</Label>
                  <Input
                    value={testEmailRecipient}
                    onChange={(e) => setTestEmailRecipient(e.target.value)}
                    className="rounded-xl border-amber-200/50 dark:border-amber-900/30"
                    placeholder={currentUser?.email || ''}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEmailPreview(false); setEmailPreviewTemplate(null); }} className="rounded-xl">{t('action.cancel')}</Button>
            <Button
              className="bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-600 hover:to-emerald-600 text-white rounded-xl shadow-md min-h-[44px]"
              onClick={handleSendTestEmail}
              disabled={testEmailSending || !testEmailRecipient}
            >
              {testEmailSending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              {t('email.send_test')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Email Template Delete Confirmation ──────────────────────────── */}
      <AlertDialog open={!!deleteEmailTemplateId} onOpenChange={(open) => { if (!open) setDeleteEmailTemplateId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('email.template_delete')}</AlertDialogTitle>
            <AlertDialogDescription>{t('email.template_delete_confirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('action.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEmailTemplate} className="bg-rose-600 hover:bg-rose-700 text-white">
              {t('action.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Badge Management Tab ─────────────────────────────────── */}
      <TabsContent value="badges">
        <BadgeManagementTab />
      </TabsContent>

      {/* ── Datenschutz / Privacy Tab ─────────────────────────────── */}
      <TabsContent value="privacy">
        <PrivacyTab currentUser={currentUser} />
      </TabsContent>

      {/* ── AI Settings Tab ─────────────────────────────────────────── */}
      <TabsContent value="ai">
        <Card className="card-hover-lift border-0 shadow-sm rounded-xl border-l-3 border-l-violet-500 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-violet-50/50 to-transparent dark:from-violet-900/10 dark:to-transparent">
            <CardTitle className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-400 to-violet-500 text-white shadow-sm">
                <Zap className="h-4 w-4" />
              </div>
              {t('settings.ai_settings')}
            </CardTitle>
            <CardDescription>{t('settings.ai_settings_desc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* AI Provider Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('settings.ai_provider')}</Label>
              <Select defaultValue="pollination">
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pollination">Pollination AI</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* API Key */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('settings.ai_api_key')}</Label>
              <Input type="password" placeholder="sk-..." className="rounded-xl" />
              <p className="text-xs text-gray-500 dark:text-gray-400">{locale === 'de' ? 'Ihr API-Schluessel wird verschluesselt gespeichert.' : 'Your API key is stored encrypted.'}</p>
            </div>
            {/* Model Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('settings.ai_model')}</Label>
              <Select defaultValue="gpt-4o-mini">
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                  <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                  <SelectItem value="claude-3-haiku">Claude 3 Haiku</SelectItem>
                  <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Test Connection */}
            <Button className="rounded-xl bg-gradient-to-r from-violet-500 to-violet-600 text-white shadow-md" onClick={() => toast.success(t('settings.ai_connection_ok'))}>
              <Zap className="h-4 w-4 mr-1" />
              {t('settings.ai_test_connection')}
            </Button>

            {/* Virtual Character Toggle */}
            <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-teal-50/60 to-teal-50/0 dark:from-teal-900/15 dark:to-teal-900/0 border border-teal-100/60 dark:border-teal-900/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-teal-500 text-white shadow-sm">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{t('settings.virtual_character')}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.virtual_character_desc')}</p>
                  </div>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ── Management Tab ─────────────────────────────────────────── */}
      <TabsContent value="management">
        <div className="space-y-6">
          {/* Responsible Teacher */}
          <Card className="card-hover-lift border-0 shadow-sm rounded-xl border-l-3 border-l-emerald-500 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10 dark:to-transparent">
              <CardTitle className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-sm">
                  <GraduationCap className="h-4 w-4" />
                </div>
                {t('settings.responsible_teacher')}
              </CardTitle>
              <CardDescription>{t('settings.responsible_teacher_desc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {classes.slice(0, 5).map((cls) => (
                  <div key={cls.id} className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-emerald-50/40 to-transparent dark:from-emerald-900/10 dark:to-transparent border border-emerald-100/40 dark:border-emerald-900/20">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                        {cls.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{cls.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('label.grade')} {cls.gradeLevel}</p>
                      </div>
                    </div>
                    <Select defaultValue="">
                      <SelectTrigger className="w-48 rounded-xl h-8 text-xs">
                        <SelectValue placeholder={locale === 'de' ? 'Lehrer zuweisen' : 'Assign teacher'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">{locale === 'de' ? 'Automatisch' : 'Automatic'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Vice Principal Management */}
          <Card className="card-hover-lift border-0 shadow-sm rounded-xl border-l-3 border-l-teal-500 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-teal-50/50 to-transparent dark:from-teal-900/10 dark:to-transparent">
              <CardTitle className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-teal-500 text-white shadow-sm">
                  <Shield className="h-4 w-4" />
                </div>
                {t('settings.vice_principal')}
              </CardTitle>
              <CardDescription>{t('settings.vice_principal_desc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <VicePrincipalManager schoolId={currentUser?.schoolId ?? ''} />
            </CardContent>
          </Card>

          {/* Disciplinary Committee */}
          <Card className="card-hover-lift border-0 shadow-sm rounded-xl border-l-3 border-l-amber-500 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-900/10 dark:to-transparent">
              <CardTitle className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-sm">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                {t('settings.disciplinary_committee')}
              </CardTitle>
              <CardDescription>{t('settings.disciplinary_committee_desc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 mx-auto mb-3">
                  <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{locale === 'de' ? 'Kein Ausschuss konfiguriert' : 'No committee configured'}</p>
                <Button className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md" onClick={() => toast.info(locale === 'de' ? 'Funktion wird bald verfuegbar sein' : 'Feature coming soon')}>
                  <UserPlus className="h-4 w-4 mr-1" />
                  {t('action.add')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Data Import */}
          <Card className="card-hover-lift border-0 shadow-sm rounded-xl border-l-3 border-l-violet-500 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-violet-50/50 to-transparent dark:from-violet-900/10 dark:to-transparent">
              <CardTitle className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-400 to-violet-500 text-white shadow-sm">
                  <Upload className="h-4 w-4" />
                </div>
                {t('settings.data_import')}
              </CardTitle>
              <CardDescription>{t('settings.data_import_desc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-dashed border-violet-200 dark:border-violet-800 bg-violet-50/30 dark:bg-violet-900/10">
                  <Upload className="h-8 w-8 text-violet-400 dark:text-violet-500" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('settings.data_import_file')}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">CSV, JSON</p>
                  </div>
                  <Button className="rounded-xl bg-gradient-to-r from-violet-500 to-violet-600 text-white shadow-md" onClick={() => toast.info(t('settings.data_import_started'))}>
                    {t('settings.data_import_file')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
      </Tabs>
    </motion.div>
    </motion.div>
  );
}
