'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Users,
  Plus,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Gavel,
  UserPlus,
  Trash2,
  ChevronRight,
  FileWarning,
  Scale,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { toast } from 'sonner';

interface CommitteeMember {
  id: string;
  userId: string;
  role: string;
  isLead: boolean;
  user: { id: string; firstName: string; lastName: string; role: string };
}

interface DisciplinaryCommittee {
  id: string;
  schoolId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  members: CommitteeMember[];
  _count?: { cases: number };
}

interface DisciplinaryCase {
  id: string;
  schoolId: string;
  committeeId: string;
  studentId: string;
  reportedBy: string;
  reviewedBy: string | null;
  caseType: string;
  description: string;
  evidence: string | null;
  status: string;
  resolution: string | null;
  resolutionDate: string | null;
  createdAt: string;
  updatedAt: string;
  student: { id: string; firstName: string; lastName: string };
  reporter: { id: string; firstName: string; lastName: string };
  reviewer: { id: string; firstName: string; lastName: string } | null;
  committee: { id: string; name: string };
}

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
}

export default function DisciplinaryView() {
  const currentUser = useAppStore((s) => s.currentUser);
  const [committees, setCommittees] = useState<DisciplinaryCommittee[]>([]);
  const [cases, setCases] = useState<DisciplinaryCase[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [createCommitteeOpen, setCreateCommitteeOpen] = useState(false);
  const [reportCaseOpen, setReportCaseOpen] = useState(false);
  const [reviewCaseOpen, setReviewCaseOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<DisciplinaryCase | null>(null);

  // Form state
  const [committeeName, setCommitteeName] = useState('');
  const [committeeDescription, setCommitteeDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [caseCommitteeId, setCaseCommitteeId] = useState('');
  const [caseStudentId, setCaseStudentId] = useState('');
  const [caseType, setCaseType] = useState('warning');
  const [caseDescription, setCaseDescription] = useState('');
  const [caseEvidence, setCaseEvidence] = useState('');
  const [resolution, setResolution] = useState('');
  const [resolutionStatus, setResolutionStatus] = useState('resolved');

  const schoolId = currentUser?.schoolId;
  const role = currentUser?.role;
  const isAdmin = role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN' || role === 'VICE_PRINCIPAL';
  const isTeacher = role === 'TEACHER';

  const fetchData = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      if (isAdmin) {
        const [committeesData, casesData, teachersData, studentsData] = await Promise.all([
          apiGet<DisciplinaryCommittee[]>(`/api/disciplinary-committees?schoolId=${schoolId}`).catch(() => []),
          apiGet<DisciplinaryCase[]>(`/api/disciplinary-cases?schoolId=${schoolId}`).catch(() => []),
          apiGet<Teacher[]>(`/api/users?schoolId=${schoolId}&role=TEACHER`).catch(() => []),
          apiGet<Student[]>(`/api/students?schoolId=${schoolId}`).catch(() => []),
        ]);
        setCommittees(committeesData);
        setCases(casesData);
        setTeachers(teachersData);
        setStudents(studentsData);
      } else {
        const casesData = await apiGet<DisciplinaryCase[]>(`/api/disciplinary-cases?schoolId=${schoolId}`).catch(() => []);
        setCases(casesData);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, [schoolId, isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateCommittee = async () => {
    if (!committeeName) return;
    try {
      await apiPost('/api/disciplinary-committees', {
        schoolId,
        name: committeeName,
        description: committeeDescription,
        members: selectedMembers.map((userId) => ({
          userId,
          role: 'member',
          isLead: false,
        })),
      });
      toast.success(t('disciplinary.create_committee'));
      setCreateCommitteeOpen(false);
      setCommitteeName('');
      setCommitteeDescription('');
      setSelectedMembers([]);
      fetchData();
    } catch (err) {
      toast.error(String(err) || 'Failed to create committee');
    }
  };

  const handleReportCase = async () => {
    if (!caseCommitteeId || !caseStudentId || !caseDescription) return;
    try {
      await apiPost('/api/disciplinary-cases', {
        schoolId,
        committeeId: caseCommitteeId,
        studentId: caseStudentId,
        caseType,
        description: caseDescription,
        evidence: caseEvidence,
      });
      toast.success(t('disciplinary.report_case'));
      setReportCaseOpen(false);
      setCaseDescription('');
      setCaseEvidence('');
      fetchData();
    } catch (err) {
      toast.error(String(err) || 'Failed to report case');
    }
  };

  const handleReviewCase = async () => {
    if (!selectedCase || !resolution) return;
    try {
      await apiPut(`/api/disciplinary-cases/${selectedCase.id}`, {
        status: resolutionStatus,
        resolution,
      });
      toast.success(t('disciplinary.review_case'));
      setReviewCaseOpen(false);
      setResolution('');
      setSelectedCase(null);
      fetchData();
    } catch (err) {
      toast.error(String(err) || 'Failed to review case');
    }
  };

  const handleToggleCommittee = async (id: string, isActive: boolean) => {
    try {
      if (isActive) {
        await apiPut(`/api/disciplinary-committees/${id}`, { isActive: false });
        toast.success(t('disciplinary.deactivate'));
      } else {
        await apiPut(`/api/disciplinary-committees/${id}`, { isActive: true });
        toast.success(t('disciplinary.activate'));
      }
      fetchData();
    } catch (err) {
      toast.error(String(err) || 'Failed to update committee');
    }
  };

  const getCaseTypeColor = (type: string) => {
    switch (type) {
      case 'warning': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      case 'minor_violation': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'major_violation': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'serious_offense': return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCaseStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      case 'under_review': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'resolved': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'dismissed': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCaseTypeIcon = (type: string) => {
    switch (type) {
      case 'warning': return AlertTriangle;
      case 'minor_violation': return FileWarning;
      case 'major_violation': return Shield;
      case 'serious_offense': return Gavel;
      default: return AlertTriangle;
    }
  };

  const openCases = cases.filter((c) => c.status === 'open' || c.status === 'under_review');
  const closedCases = cases.filter((c) => c.status === 'resolved' || c.status === 'dismissed');

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('disciplinary.title')}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('disciplinary.cases')}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button onClick={() => setCreateCommitteeOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              {t('disciplinary.create_committee')}
            </Button>
          )}
          {(isTeacher || isAdmin) && (
            <Button variant="outline" onClick={() => setReportCaseOpen(true)} className="border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400">
              <FileWarning className="h-4 w-4 mr-2" />
              {t('disciplinary.report_case')}
            </Button>
          )}
          <Button variant="outline" onClick={fetchData}>
            {t('action.refresh')}
          </Button>
        </div>
      </motion.div>

      {/* Admin Stats */}
      {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{t('disciplinary.committee')}</p>
              <p className="text-2xl font-bold">{committees.length}</p>
              <p className="text-xs text-muted-foreground">{committees.filter((c) => c.isActive).length} {t('disciplinary.active')}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{t('disciplinary.open')}</p>
              <p className="text-2xl font-bold">{openCases.length}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{t('disciplinary.under_review')}</p>
              <p className="text-2xl font-bold">{cases.filter((c) => c.status === 'under_review').length}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-teal-500">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{t('disciplinary.resolved')}</p>
              <p className="text-2xl font-bold">{closedCases.length}</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="cases" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cases">{t('disciplinary.cases')}</TabsTrigger>
          {isAdmin && <TabsTrigger value="committees">{t('disciplinary.committee')}</TabsTrigger>}
        </TabsList>

        {/* Cases Tab */}
        <TabsContent value="cases">
          {loading ? (
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : cases.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  <div className="h-20 w-20 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-4">
                    <Scale className="h-10 w-10 text-emerald-300 dark:text-emerald-600" />
                  </div>
                </motion.div>
                <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">{t('disciplinary.no_cases')}</p>
                <p className="text-gray-400 text-sm mt-1">All clear</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              <AnimatePresence>
                {cases.map((c, idx) => {
                  const CaseIcon = getCaseTypeIcon(c.caseType);
                  return (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Card className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${getCaseTypeColor(c.caseType)}`}>
                                <CaseIcon className="h-5 w-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold">{t(`disciplinary.${c.caseType}`)}</span>
                                  <Badge className={getCaseStatusColor(c.status)} variant="secondary">
                                    {t(`disciplinary.${c.status}`)}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                  {t('disciplinary.student_involved')}: {c.student.firstName} {c.student.lastName}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{c.description}</p>
                                {/* Case status timeline */}
                                <div className="flex items-center gap-2 mt-2">
                                  {['open', 'under_review', 'resolved'].map((step, si) => (
                                    <div key={step} className="flex items-center gap-1.5">
                                      <div className={`h-2 w-2 rounded-full ${
                                        c.status === step ? 'bg-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-800' :
                                        ['open', 'under_review', 'resolved'].indexOf(c.status) > si ? 'bg-emerald-400' : 'bg-gray-300 dark:bg-gray-600'
                                      }`} />
                                      <span className={`text-[10px] ${
                                        c.status === step ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-gray-400'
                                      }`}>{t(`disciplinary.${step}`)}</span>
                                      {si < 2 && <div className="h-px w-4 bg-gray-300 dark:bg-gray-600" />}
                                    </div>
                                  ))}
                                </div>
                                {/* Evidence file attachment cards */}
                                {c.evidence && (
                                  <div className="mt-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 flex items-center gap-2">
                                    <FileWarning className="h-4 w-4 text-amber-500 shrink-0" />
                                    <span className="text-xs text-gray-600 dark:text-gray-400 truncate">{c.evidence}</span>
                                  </div>
                                )}
                                <p className="text-xs text-gray-400 mt-1">
                                  {t('disciplinary.reported_by')}: {c.reporter.firstName} {c.reporter.lastName} | {t('disciplinary.committee')}: {c.committee.name}
                                </p>
                                {c.resolution && (
                                  <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                                    {t('disciplinary.resolution')}: {c.resolution}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {(c.status === 'open' || c.status === 'under_review') && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedCase(c);
                                    setReviewCaseOpen(true);
                                  }}
                                  className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  {t('disciplinary.review_case')}
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        {/* Committees Tab (Admin only) */}
        {isAdmin && (
          <TabsContent value="committees">
            {committees.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">{t('disciplinary.no_committees')}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {committees.map((committee, idx) => (
                  <motion.div
                    key={committee.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card className={`hover:shadow-md transition-shadow ${!committee.isActive ? 'opacity-60' : ''}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{committee.name}</CardTitle>
                          <Badge className={committee.isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'}>
                            {committee.isActive ? t('disciplinary.active') : t('disciplinary.inactive')}
                          </Badge>
                        </div>
                        {committee.description && (
                          <CardDescription>{committee.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('disciplinary.members')}</p>
                            <div className="flex flex-wrap gap-1">
                              {committee.members.map((m) => (
                                <Badge key={m.id} variant="secondary" className={`text-xs ${
                                  m.role === 'chair' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                  m.isLead ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' : ''
                                }`}>
                                  {m.user.firstName} {m.user.lastName}
                                  {m.role === 'chair' && ` (${t('disciplinary.member_chair')})`}
                                  {m.isLead && ` (${t('disciplinary.lead')})`}
                                </Badge>
                              ))}
                              {committee.members.length === 0 && (
                                <span className="text-xs text-gray-400">{t('disciplinary.no_committees')}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">{t('disciplinary.cases')}: {committee._count?.cases ?? 0}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleCommittee(committee.id, committee.isActive)}
                            >
                              {committee.isActive ? t('disciplinary.deactivate') : t('disciplinary.activate')}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Create Committee Dialog */}
      <Dialog open={createCommitteeOpen} onOpenChange={setCreateCommitteeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('disciplinary.create_committee')}</DialogTitle>
            <DialogDescription>{t('disciplinary.committee_description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('disciplinary.committee_name')}</Label>
              <Input
                value={committeeName}
                onChange={(e) => setCommitteeName(e.target.value)}
                placeholder={t('disciplinary.committee_name')}
              />
            </div>
            <div>
              <Label>{t('disciplinary.committee_description')}</Label>
              <Textarea
                value={committeeDescription}
                onChange={(e) => setCommitteeDescription(e.target.value)}
                placeholder={t('disciplinary.committee_description')}
                rows={3}
              />
            </div>
            <div>
              <Label>{t('disciplinary.members')}</Label>
              <ScrollArea className="h-40 rounded border p-2">
                {teachers.map((teacher) => (
                  <label key={teacher.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 px-2 rounded">
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(teacher.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedMembers([...selectedMembers, teacher.id]);
                        } else {
                          setSelectedMembers(selectedMembers.filter((id) => id !== teacher.id));
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{teacher.firstName} {teacher.lastName}</span>
                  </label>
                ))}
              </ScrollArea>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateCommitteeOpen(false)}>
                {t('action.cancel')}
              </Button>
              <Button onClick={handleCreateCommittee} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {t('action.create')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report Case Dialog */}
      <Dialog open={reportCaseOpen} onOpenChange={setReportCaseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('disciplinary.report_case')}</DialogTitle>
            <DialogDescription>{t('disciplinary.case_description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('disciplinary.committee')}</Label>
              <Select value={caseCommitteeId} onValueChange={setCaseCommitteeId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('action.select')} />
                </SelectTrigger>
                <SelectContent>
                  {committees.filter((c) => c.isActive).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('disciplinary.student_involved')}</Label>
              <Select value={caseStudentId} onValueChange={setCaseStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('action.select')} />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('disciplinary.case_type')}</Label>
              <Select value={caseType} onValueChange={setCaseType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="warning">{t('disciplinary.warning')}</SelectItem>
                  <SelectItem value="minor_violation">{t('disciplinary.minor_violation')}</SelectItem>
                  <SelectItem value="major_violation">{t('disciplinary.major_violation')}</SelectItem>
                  <SelectItem value="serious_offense">{t('disciplinary.serious_offense')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('disciplinary.case_description')}</Label>
              <Textarea
                value={caseDescription}
                onChange={(e) => setCaseDescription(e.target.value)}
                placeholder={t('disciplinary.case_description')}
                rows={3}
              />
            </div>
            <div>
              <Label>{t('disciplinary.evidence')}</Label>
              <Textarea
                value={caseEvidence}
                onChange={(e) => setCaseEvidence(e.target.value)}
                placeholder={t('disciplinary.evidence')}
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReportCaseOpen(false)}>
                {t('action.cancel')}
              </Button>
              <Button onClick={handleReportCase} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {t('disciplinary.report_case')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Case Dialog */}
      <Dialog open={reviewCaseOpen} onOpenChange={setReviewCaseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('disciplinary.review_case')}</DialogTitle>
            <DialogDescription>
              {selectedCase && `${t('disciplinary.student_involved')}: ${selectedCase.student.firstName} ${selectedCase.student.lastName}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedCase && (
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className={getCaseTypeColor(selectedCase.caseType)} variant="secondary">
                    {t(`disciplinary.${selectedCase.caseType}`)}
                  </Badge>
                  <Badge className={getCaseStatusColor(selectedCase.status)} variant="secondary">
                    {t(`disciplinary.${selectedCase.status}`)}
                  </Badge>
                </div>
                <p className="text-sm">{selectedCase.description}</p>
                {selectedCase.evidence && (
                  <p className="text-xs text-gray-500">{t('disciplinary.evidence')}: {selectedCase.evidence}</p>
                )}
              </div>
            )}
            <div>
              <Label>{t('disciplinary.resolution')}</Label>
              <Select value={resolutionStatus} onValueChange={setResolutionStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="under_review">{t('disciplinary.under_review')}</SelectItem>
                  <SelectItem value="resolved">{t('disciplinary.resolve_case')}</SelectItem>
                  <SelectItem value="dismissed">{t('disciplinary.dismiss_case')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('disciplinary.resolution')}</Label>
              <Textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder={t('disciplinary.resolution')}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReviewCaseOpen(false)}>
                {t('action.cancel')}
              </Button>
              <Button onClick={handleReviewCase} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {t('action.confirm')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
