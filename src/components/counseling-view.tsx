'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  Calendar,
  Clock,
  FileText,
  Plus,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  UserCheck,
  BarChart3,
  ChevronRight,
  Lock,
  CalendarPlus,
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
import { apiGet, apiPost, apiPut } from '@/lib/api';
import { toast } from 'sonner';

interface CounselingAppointment {
  id: string;
  schoolId: string;
  studentId: string;
  counselorId: string;
  requestType: string;
  description: string | null;
  status: string;
  scheduledAt: string | null;
  duration: number;
  notes: string | null;
  isPrivate: boolean;
  addToCalendar: boolean;
  createdAt: string;
  updatedAt: string;
  counselor: { id: string; firstName: string; lastName: string };
  student: { id: string; firstName: string; lastName: string };
}

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
}

export default function CounselingView() {
  const currentUser = useAppStore((s) => s.currentUser);
  const [appointments, setAppointments] = useState<CounselingAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<CounselingAppointment | null>(null);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);

  // Form state
  const [requestType, setRequestType] = useState('guidance');
  const [description, setDescription] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState('');

  const schoolId = currentUser?.schoolId;
  const role = currentUser?.role;
  const isStudent = role === 'STUDENT';
  const isCounselor = role === 'TEACHER';
  const isAdmin = role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN' || role === 'VICE_PRINCIPAL';

  const fetchAppointments = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const data = await apiGet<CounselingAppointment[]>(`/api/counseling?schoolId=${schoolId}`);
      setAppointments(data);
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleRequestAppointment = async () => {
    try {
      await apiPost('/api/counseling', {
        schoolId,
        requestType,
        description,
        addToCalendar: true,
        isPrivate: true,
      });
      toast.success(t('counseling.request'));
      setRequestDialogOpen(false);
      setDescription('');
      setRequestType('guidance');
      fetchAppointments();
    } catch (err) {
      toast.error(String(err) || 'Failed to request appointment');
    }
  };

  const handleScheduleAppointment = async () => {
    if (!selectedAppt || !scheduledAt) return;
    try {
      await apiPut(`/api/counseling/${selectedAppt.id}`, {
        scheduledAt,
        duration,
        status: 'scheduled',
        addToCalendar: true,
      });
      toast.success(t('counseling.schedule'));
      setScheduleDialogOpen(false);
      setScheduledAt('');
      setDuration(30);
      fetchAppointments();
    } catch (err) {
      toast.error(String(err) || 'Failed to schedule appointment');
    }
  };

  const handleAddNotes = async () => {
    if (!selectedAppt || !notes) return;
    try {
      await apiPut(`/api/counseling/${selectedAppt.id}`, {
        notes,
        status: 'completed',
      });
      toast.success(t('counseling.add_notes'));
      setNotesDialogOpen(false);
      setNotes('');
      fetchAppointments();
    } catch (err) {
      toast.error(String(err) || 'Failed to add notes');
    }
  };

  const handleCancelAppointment = async (id: string) => {
    try {
      await apiPut(`/api/counseling/${id}`, { status: 'cancelled' });
      toast.success(t('counseling.cancel'));
      fetchAppointments();
    } catch (err) {
      toast.error(String(err) || 'Failed to cancel');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'requested': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      case 'scheduled': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'completed': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'cancelled': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'guidance': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'psychological': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'career': return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400';
      case 'social': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const upcoming = appointments.filter((a) => a.status === 'requested' || a.status === 'scheduled');
  const history = appointments.filter((a) => a.status === 'completed' || a.status === 'cancelled');

  // Stats for admin
  const stats = {
    total: appointments.length,
    thisMonth: appointments.filter((a) => {
      const d = new Date(a.createdAt);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length,
    byType: {
      guidance: appointments.filter((a) => a.requestType === 'guidance').length,
      psychological: appointments.filter((a) => a.requestType === 'psychological').length,
      career: appointments.filter((a) => a.requestType === 'career').length,
      social: appointments.filter((a) => a.requestType === 'social').length,
    },
  };

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
            <Heart className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('counseling.title')}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('counseling.appointments')}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {isStudent && (
            <Button onClick={() => setRequestDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              {t('counseling.request')}
            </Button>
          )}
          <Button variant="outline" onClick={fetchAppointments}>
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
              <p className="text-sm text-muted-foreground">{t('counseling.total_appointments')}</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-teal-500">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{t('counseling.this_month')}</p>
              <p className="text-2xl font-bold">{stats.thisMonth}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{t('counseling.upcoming')}</p>
              <p className="text-2xl font-bold">{upcoming.length}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{t('counseling.by_type')}</p>
              <div className="flex gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">{stats.byType.guidance} G</Badge>
                <Badge variant="secondary" className="text-xs">{stats.byType.psychological} P</Badge>
                <Badge variant="secondary" className="text-xs">{stats.byType.career} C</Badge>
                <Badge variant="secondary" className="text-xs">{stats.byType.social} S</Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upcoming">{t('counseling.upcoming')}</TabsTrigger>
          <TabsTrigger value="history">{t('counseling.history')}</TabsTrigger>
          {isAdmin && <TabsTrigger value="statistics">{t('counseling.statistics')}</TabsTrigger>}
        </TabsList>

        {/* Upcoming Tab */}
        <TabsContent value="upcoming">
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
          ) : upcoming.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  <div className="h-20 w-20 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-4">
                    <Calendar className="h-10 w-10 text-emerald-300 dark:text-emerald-600" />
                  </div>
                </motion.div>
                <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">{t('counseling.no_appointments')}</p>
                <p className="text-gray-400 text-sm mt-1">{t('counseling.request')}</p>
                {isStudent && (
                  <Button
                    onClick={() => setRequestDialogOpen(true)}
                    className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('counseling.request')}
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              <AnimatePresence>
                {upcoming.map((appt, idx) => (
                  <motion.div
                    key={appt.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="shrink-0">
                              {/* Counselor avatar with initials */}
                              <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-sm font-bold ${getTypeColor(appt.requestType)}`}>
                                {appt.counselor.firstName[0]}{appt.counselor.lastName[0]}
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold">{t(`counseling.${appt.requestType}`)}</span>
                                <Badge className={getStatusColor(appt.status)} variant="secondary">
                                  {t(`counseling.${appt.status}`)}
                                </Badge>
                                {appt.isPrivate && (
                                  <Lock className="h-3.5 w-3.5 text-gray-400" />
                                )}
                              </div>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {isStudent
                                  ? `${t('counseling.counselor')}: ${appt.counselor.firstName} ${appt.counselor.lastName}`
                                  : `${t('counseling.student')}: ${appt.student.firstName} ${appt.student.lastName}`}
                              </p>
                              {appt.scheduledAt && (
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {new Date(appt.scheduledAt).toLocaleDateString()}
                                  </div>
                                  <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                                    <Clock className="h-3.5 w-3.5" />
                                    {new Date(appt.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                  <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                                    {appt.duration} min
                                  </div>
                                  {/* Time slot visualization */}
                                  <div className="flex items-center gap-0.5">
                                    {Array.from({ length: Math.ceil(appt.duration / 15) }).map((_, i) => (
                                      <div key={i} className="h-2 w-3 rounded-sm bg-emerald-300 dark:bg-emerald-700" />
                                    ))}
                                  </div>
                                </div>
                              )}
                              {appt.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{appt.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {isCounselor && appt.status === 'requested' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedAppt(appt);
                                  setScheduleDialogOpen(true);
                                }}
                                className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                              >
                                <CalendarPlus className="h-4 w-4 mr-1" />
                                {t('counseling.schedule')}
                              </Button>
                            )}
                            {isCounselor && appt.status === 'scheduled' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedAppt(appt);
                                  setNotesDialogOpen(true);
                                }}
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                {t('counseling.add_notes')}
                              </Button>
                            )}
                            {(isCounselor || isAdmin) && appt.status !== 'cancelled' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                onClick={() => handleCancelAppointment(appt.id)}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                {t('counseling.cancel')}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          {history.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-500 dark:text-gray-400">{t('counseling.no_appointments')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {history.map((appt, idx) => (
                <motion.div
                  key={appt.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="opacity-80 hover:opacity-100 transition-opacity">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${getTypeColor(appt.requestType)}`}>
                            <Heart className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{t(`counseling.${appt.requestType}`)}</span>
                              <Badge className={getStatusColor(appt.status)} variant="secondary">
                                {t(`counseling.${appt.status}`)}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {appt.scheduledAt ? new Date(appt.scheduledAt).toLocaleDateString() : new Date(appt.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {appt.notes && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedAppt(appt);
                              setNotesDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Statistics Tab (Admin only) */}
        {isAdmin && (
          <TabsContent value="statistics">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('counseling.by_type')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(stats.byType).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm">{t(`counseling.${type}`)}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%` }}
                              className="h-2 rounded-full bg-emerald-500"
                            />
                          </div>
                          <span className="text-sm font-medium w-8 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('counseling.status')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {['requested', 'scheduled', 'completed', 'cancelled'].map((status) => {
                      const count = appointments.filter((a) => a.status === status).length;
                      return (
                        <div key={status} className="flex items-center justify-between">
                          <span className="text-sm">{t(`counseling.${status}`)}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%` }}
                                className="h-2 rounded-full bg-emerald-500"
                              />
                            </div>
                            <span className="text-sm font-medium w-8 text-right">{count}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Request Dialog */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('counseling.request')}</DialogTitle>
            <DialogDescription>{t('counseling.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('counseling.type')}</Label>
              <Select value={requestType} onValueChange={setRequestType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="guidance">{t('counseling.guidance')}</SelectItem>
                  <SelectItem value="psychological">{t('counseling.psychological')}</SelectItem>
                  <SelectItem value="career">{t('counseling.career')}</SelectItem>
                  <SelectItem value="social">{t('counseling.social')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('counseling.description')}</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('counseling.description')}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRequestDialogOpen(false)}>
                {t('action.cancel')}
              </Button>
              <Button onClick={handleRequestAppointment} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {t('counseling.request')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('counseling.schedule')}</DialogTitle>
            <DialogDescription>
              {selectedAppt && `${t('counseling.student')}: ${selectedAppt.student.firstName} ${selectedAppt.student.lastName}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('counseling.scheduled_at')}</Label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
            <div>
              <Label>{t('counseling.duration')}</Label>
              <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 min</SelectItem>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="45">45 min</SelectItem>
                  <SelectItem value="60">60 min</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>
                {t('action.cancel')}
              </Button>
              <Button onClick={handleScheduleAppointment} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {t('counseling.schedule')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('counseling.session_notes')}</DialogTitle>
            <DialogDescription>
              {selectedAppt && `${t('counseling.student')}: ${selectedAppt.student.firstName} ${selectedAppt.student.lastName}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedAppt?.notes && (
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-300">{selectedAppt.notes}</p>
              </div>
            )}
            <div>
              <Label>{t('counseling.add_notes')}</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('counseling.add_notes')}
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNotesDialogOpen(false)}>
                {t('action.cancel')}
              </Button>
              <Button onClick={handleAddNotes} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {t('action.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
