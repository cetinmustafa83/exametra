// @ts-nocheck
'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Newspaper, Plus, Search, Filter, Edit3, Trash2, Copy, Send, Archive,
  Eye, Clock, CheckCircle2, XCircle, MoreVertical, Calendar, Users,
  BarChart3, TrendingUp, Mail, MousePointerClick, AlertCircle,
  ChevronDown, ChevronUp, ArrowLeft, Image as ImageIcon, FileText, Save,
  Bold, Italic, Underline, List, AlignLeft, AlignCenter, AlignRight,
  Link as LinkIcon, Smartphone, Monitor, X, Globe, BookOpen,
  GraduationCap, Heart, UserCheck, ChevronRight, Sparkles,
  ArrowUpRight, ArrowDownRight, Minus, Palette, Tag,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────

interface Author {
  id: string;
  firstName: string;
  lastName: string;
}

interface Newsletter {
  id: string;
  schoolId: string;
  authorId: string;
  title: string;
  subject?: string | null;
  content: string;
  summary?: string | null;
  imageUrl?: string | null;
  bannerImageUrl?: string | null;
  category: string;
  templateType: string;
  targetAudience?: string | null;
  status: string;
  isPublished: boolean;
  publishedAt?: string | null;
  scheduledAt?: string | null;
  sentAt?: string | null;
  tags?: string | null;
  openCount: number;
  clickCount: number;
  bounceCount: number;
  totalRecipients: number;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  author: Author;
}

interface NewsletterStats {
  overview: {
    totalSent: number;
    totalRecipients: number;
    totalOpens: number;
    totalClicks: number;
    totalBounces: number;
    overallOpenRate: number;
    overallClickRate: number;
    overallBounceRate: number;
  };
  monthlyTrend: Array<{
    month: string;
    openRate: number;
    clickRate: number;
    sent: number;
    recipients: number;
  }>;
  bestSendingTime: { hour: number; openRate: number } | null;
  templatePerformance: Record<string, { count: number; openRate: number; clickRate: number }>;
  recentNewsletters: Array<{
    id: string;
    title: string;
    templateType: string;
    sentAt: string | null;
    totalRecipients: number;
    openCount: number;
    clickCount: number;
    openRate: number;
    clickRate: number;
  }>;
}

type TabView = 'newsletters' | 'editor' | 'analytics';

// ─── Helpers ──────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  scheduled: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  sent: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  archived: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  draft: Edit3,
  scheduled: Clock,
  sent: CheckCircle2,
  archived: Archive,
};

const TEMPLATE_TYPES = [
  { value: 'monthly', labelKey: 'newsletter.template_monthly' },
  { value: 'event', labelKey: 'newsletter.template_event' },
  { value: 'parent', labelKey: 'newsletter.template_parent' },
  { value: 'emergency', labelKey: 'newsletter.template_emergency' },
];

const CATEGORIES = [
  { value: 'general', labelKey: 'newsletter.category_general' },
  { value: 'academic', labelKey: 'newsletter.category_academic' },
  { value: 'sports', labelKey: 'newsletter.category_sports' },
  { value: 'arts', labelKey: 'newsletter.category_arts' },
  { value: 'events', labelKey: 'newsletter.category_events' },
  { value: 'community', labelKey: 'newsletter.category_community' },
];

const AUDIENCE_TYPES = [
  { value: 'all', labelKey: 'newsletter.audience_all', icon: Globe },
  { value: 'teachers', labelKey: 'newsletter.audience_teachers', icon: GraduationCap },
  { value: 'parents', labelKey: 'newsletter.audience_parents', icon: Heart },
  { value: 'classes', labelKey: 'newsletter.audience_classes', icon: Users },
  { value: 'roles', labelKey: 'newsletter.audience_roles', icon: UserCheck },
];

const CHART_COLORS = ['#10b981', '#14b8a6', '#059669', '#0d9488', '#047857', '#065f46'];

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d`;
  return formatDate(dateStr);
}

// ─── Animated Counter ─────────────────────────────────────────────────

function AnimatedCounter({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = value / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value, duration]);
  return <span>{display.toLocaleString()}</span>;
}

// ─── Main Component ───────────────────────────────────────────────────

export default function SchoolNewsletterView() {
  const currentUser = useAppStore((s) => s.currentUser);
  const locale = useAppStore((s) => s.locale);

  const [activeTab, setActiveTab] = useState<TabView>('newsletters');
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [stats, setStats] = useState<NewsletterStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterTemplate, setFilterTemplate] = useState<string>('all');

  // Editor state
  const [editingNewsletter, setEditingNewsletter] = useState<Newsletter | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorSubject, setEditorSubject] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorSummary, setEditorSummary] = useState('');
  const [editorBannerUrl, setEditorBannerUrl] = useState('');
  const [editorCategory, setEditorCategory] = useState('general');
  const [editorTemplateType, setEditorTemplateType] = useState('monthly');
  const [editorAudience, setEditorAudience] = useState('all');
  const [editorTags, setEditorTags] = useState('');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isMobilePreview, setIsMobilePreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  // Send dialog
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [sendNewsletterId, setSendNewsletterId] = useState<string | null>(null);
  const [sendAudience, setSendAudience] = useState('all');
  const [sendScheduledAt, setSendScheduledAt] = useState('');
  const [isSending, setIsSending] = useState(false);

  // View newsletter dialog
  const [viewNewsletter, setViewNewsletter] = useState<Newsletter | null>(null);

  const schoolId = currentUser?.schoolId;
  const role = currentUser?.role || 'TEACHER';
  const isAdmin = role === 'SCHOOL_ADMIN' || role === 'VICE_PRINCIPAL' || role === 'SUPER_ADMIN';
  const isTeacher = role === 'TEACHER';
  const isStudentOrParent = role === 'STUDENT' || role === 'PARENT';

  // ─── Fetch newsletters ──────────────────────────────────────────

  const fetchNewsletters = useCallback(async () => {
    if (!schoolId) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ schoolId, limit: '50' });
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (filterCategory !== 'all') params.set('category', filterCategory);
      if (filterTemplate !== 'all') params.set('templateType', filterTemplate);
      if (searchQuery) params.set('search', searchQuery);
      if (isTeacher) params.set('authorId', currentUser?.id || '');

      const res = await fetch(`/api/newsletters?${params}`);
      if (res.ok) {
        const data = await res.json();
        setNewsletters(data.newsletters || []);
      }
    } catch (err) {
      console.error('Failed to fetch newsletters:', err);
    } finally {
      setIsLoading(false);
    }
  }, [schoolId, filterStatus, filterCategory, filterTemplate, searchQuery, isTeacher, currentUser?.id]);

  const fetchStats = useCallback(async () => {
    if (!schoolId || isStudentOrParent) return;
    try {
      const res = await fetch(`/api/newsletters/aggregate/stats?schoolId=${schoolId}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [schoolId, isStudentOrParent]);

  useEffect(() => {
    fetchNewsletters();
  }, [fetchNewsletters]);

  useEffect(() => {
    if (activeTab === 'analytics') fetchStats();
  }, [activeTab, fetchStats]);

  // ─── Filtered newsletters ───────────────────────────────────────

  const filteredNewsletters = useMemo(() => {
    let list = [...newsletters];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.summary?.toLowerCase().includes(q) ||
          n.author.firstName.toLowerCase().includes(q) ||
          n.author.lastName.toLowerCase().includes(q)
      );
    }
    return list;
  }, [newsletters, searchQuery]);

  // ─── Stats summary ──────────────────────────────────────────────

  const draftCount = newsletters.filter((n) => n.status === 'draft').length;
  const scheduledCount = newsletters.filter((n) => n.status === 'scheduled').length;
  const sentCount = newsletters.filter((n) => n.status === 'sent').length;

  // ─── Editor handlers ────────────────────────────────────────────

  const openNewEditor = useCallback(() => {
    setEditingNewsletter(null);
    setEditorTitle('');
    setEditorSubject('');
    setEditorContent('');
    setEditorSummary('');
    setEditorBannerUrl('');
    setEditorCategory('general');
    setEditorTemplateType('monthly');
    setEditorAudience('all');
    setEditorTags('');
    setIsPreviewMode(false);
    setIsEditorOpen(true);
    setIsMobilePreview(false);
  }, []);

  const openEditEditor = useCallback((newsletter: Newsletter) => {
    setEditingNewsletter(newsletter);
    setEditorTitle(newsletter.title);
    setEditorSubject(newsletter.subject || '');
    setEditorContent(newsletter.content);
    setEditorSummary(newsletter.summary || '');
    setEditorBannerUrl(newsletter.bannerImageUrl || '');
    setEditorCategory(newsletter.category);
    setEditorTemplateType(newsletter.templateType);
    try {
      const audience = newsletter.targetAudience ? JSON.parse(newsletter.targetAudience) : { type: 'all' };
      setEditorAudience(audience.type || 'all');
    } catch {
      setEditorAudience('all');
    }
    setEditorTags(newsletter.tags ? JSON.parse(newsletter.tags).join(', ') : '');
    setIsPreviewMode(false);
    setIsMobilePreview(false);
    setIsEditorOpen(true);
  }, []);

  const handleSave = useCallback(async (saveAsDraft = true) => {
    if (!schoolId || !currentUser?.id) return;
    setIsSaving(true);
    try {
      const payload = {
        schoolId,
        authorId: currentUser.id,
        title: editorTitle,
        subject: editorSubject || null,
        content: editorContent,
        summary: editorSummary || null,
        bannerImageUrl: editorBannerUrl || null,
        category: editorCategory,
        templateType: editorTemplateType,
        targetAudience: { type: editorAudience },
        status: saveAsDraft ? 'draft' : 'scheduled',
        tags: editorTags ? editorTags.split(',').map((t) => t.trim()).filter(Boolean) : null,
      };

      if (editingNewsletter) {
        const res = await fetch(`/api/newsletters/${editingNewsletter.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const updated = await res.json();
          setNewsletters((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
        }
      } else {
        const res = await fetch('/api/newsletters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const created = await res.json();
          setNewsletters((prev) => [created, ...prev]);
        }
      }
      setIsEditorOpen(false);
      fetchNewsletters();
    } catch (err) {
      console.error('Failed to save newsletter:', err);
    } finally {
      setIsSaving(false);
    }
  }, [schoolId, currentUser, editingNewsletter, editorTitle, editorSubject, editorContent,
    editorSummary, editorBannerUrl, editorCategory, editorTemplateType, editorAudience,
    editorTags, fetchNewsletters]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/newsletters/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setNewsletters((prev) => prev.filter((n) => n.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete newsletter:', err);
    }
  }, []);

  const handleDuplicate = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/newsletters/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'duplicate', authorId: currentUser?.id }),
      });
      if (res.ok) {
        fetchNewsletters();
      }
    } catch (err) {
      console.error('Failed to duplicate newsletter:', err);
    }
  }, [currentUser?.id, fetchNewsletters]);

  const handleArchive = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/newsletters/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive' }),
      });
      if (res.ok) {
        fetchNewsletters();
      }
    } catch (err) {
      console.error('Failed to archive newsletter:', err);
    }
  }, [fetchNewsletters]);

  const handleSend = useCallback(async () => {
    if (!sendNewsletterId) return;
    setIsSending(true);
    try {
      const res = await fetch(`/api/newsletters/${sendNewsletterId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetAudience: { type: sendAudience },
          scheduledAt: sendScheduledAt || undefined,
        }),
      });
      if (res.ok) {
        setSendDialogOpen(false);
        setSendNewsletterId(null);
        fetchNewsletters();
      }
    } catch (err) {
      console.error('Failed to send newsletter:', err);
    } finally {
      setIsSending(false);
    }
  }, [sendNewsletterId, sendAudience, sendScheduledAt, fetchNewsletters]);

  // ─── Rich text editor commands ──────────────────────────────────

  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setEditorContent(editorRef.current.innerHTML);
    }
  }, []);

  const handleEditorInput = useCallback(() => {
    if (editorRef.current) {
      setEditorContent(editorRef.current.innerHTML);
    }
  }, []);

  // ─── Template defaults ──────────────────────────────────────────

  const applyTemplate = useCallback((templateType: string) => {
    setEditorTemplateType(templateType);
    const templates: Record<string, { content: string; title: string }> = {
      monthly: {
        title: t('newsletter.template_monthly_title'),
        content: `<h2>${t('newsletter.section_header')}</h2><p>${t('newsletter.template_monthly_header')}</p><h3>${t('newsletter.section_highlights')}</h3><p>${t('newsletter.template_placeholder')}</p><h3>${t('newsletter.section_upcoming')}</h3><p>${t('newsletter.template_placeholder')}</p><h3>${t('newsletter.section_announcements')}</h3><p>${t('newsletter.template_placeholder')}</p>`,
      },
      event: {
        title: t('newsletter.template_event_title'),
        content: `<h2>${t('newsletter.section_header')}</h2><p>${t('newsletter.template_event_header')}</p><h3>${t('newsletter.section_details')}</h3><p>${t('newsletter.template_placeholder')}</p><h3>${t('newsletter.section_registration')}</h3><p>${t('newsletter.template_placeholder')}</p>`,
      },
      parent: {
        title: t('newsletter.template_parent_title'),
        content: `<h2>${t('newsletter.section_header')}</h2><p>${t('newsletter.template_parent_header')}</p><h3>${t('newsletter.section_important')}</h3><p>${t('newsletter.template_placeholder')}</p><h3>${t('newsletter.section_dates')}</h3><p>${t('newsletter.template_placeholder')}</p>`,
      },
      emergency: {
        title: t('newsletter.template_emergency_title'),
        content: `<h2>${t('newsletter.section_header')}</h2><p>${t('newsletter.template_emergency_header')}</p><h3>${t('newsletter.section_details')}</h3><p>${t('newsletter.template_placeholder')}</p><h3>${t('newsletter.section_actions')}</h3><p>${t('newsletter.template_placeholder')}</p>`,
      },
    };
    const tmpl = templates[templateType];
    if (tmpl && !editorTitle) {
      setEditorTitle(tmpl.title);
    }
    if (tmpl && (!editorContent || editorContent === '<p><br></p>')) {
      setEditorContent(tmpl.content);
      if (editorRef.current) {
        editorRef.current.innerHTML = tmpl.content;
      }
    }
  }, [editorTitle, editorContent]);

  // ─── Render: Newsletter List ────────────────────────────────────

  const renderNewsletterList = () => (
    <div className="space-y-4">
      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t('newsletter.status_draft'), value: draftCount, icon: Edit3, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-900/30' },
          { label: t('newsletter.status_scheduled'), value: scheduledCount, icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
          { label: t('newsletter.status_sent'), value: sentCount, icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: t('newsletter.total_newsletters'), value: newsletters.length, icon: Newspaper, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-900/20' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className={`${stat.bg} border-0 shadow-sm hover:shadow-md transition-shadow`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1">
                      <AnimatedCounter value={stat.value} />
                    </p>
                  </div>
                  <stat.icon className={`h-8 w-8 ${stat.color} opacity-60`} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('newsletter.search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder={t('newsletter.filter_status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('newsletter.filter_all')}</SelectItem>
            <SelectItem value="draft">{t('newsletter.status_draft')}</SelectItem>
            <SelectItem value="scheduled">{t('newsletter.status_scheduled')}</SelectItem>
            <SelectItem value="sent">{t('newsletter.status_sent')}</SelectItem>
            <SelectItem value="archived">{t('newsletter.status_archived')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder={t('newsletter.filter_category')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('newsletter.filter_all')}</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{t(c.labelKey)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!isStudentOrParent && (
          <Button onClick={openNewEditor} className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            {t('newsletter.create_new')}
          </Button>
        )}
      </div>

      {/* Newsletter list */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded w-3/4 mb-3" />
                <div className="h-3 bg-muted rounded w-1/2 mb-2" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredNewsletters.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Newspaper className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-lg font-medium text-muted-foreground">{t('newsletter.no_newsletters')}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('newsletter.no_newsletters_desc')}</p>
            {!isStudentOrParent && (
              <Button onClick={openNewEditor} className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                {t('newsletter.create_first')}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredNewsletters.map((newsletter, i) => {
              const StatusIcon = STATUS_ICONS[newsletter.status] || Edit3;
              return (
                <motion.div
                  key={newsletter.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.05 }}
                  layout
                >
                  <Card className="group hover:shadow-lg transition-all duration-300 border-0 shadow-sm overflow-hidden">
                    {newsletter.bannerImageUrl && (
                      <div className="h-32 bg-gradient-to-r from-emerald-500 to-teal-500 relative overflow-hidden">
                        <img
                          src={newsletter.bannerImageUrl}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                    )}
                    {!newsletter.bannerImageUrl && (
                      <div className="h-20 bg-gradient-to-r from-emerald-500 to-teal-500 relative">
                        <div className="absolute inset-0 bg-black/20" />
                        <div className="absolute bottom-2 left-3">
                          <Badge className={`${STATUS_COLORS[newsletter.status]} text-xs`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {t(`newsletter.status_${newsletter.status}`)}
                          </Badge>
                        </div>
                      </div>
                    )}
                    <CardContent className="p-4">
                      {newsletter.bannerImageUrl && (
                        <Badge className={`${STATUS_COLORS[newsletter.status]} text-xs mb-2`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {t(`newsletter.status_${newsletter.status}`)}
                        </Badge>
                      )}
                      <h3 className="font-semibold text-base line-clamp-2 mb-1">{newsletter.title}</h3>
                      {newsletter.summary && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{newsletter.summary}</p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                        <span>{newsletter.author.firstName} {newsletter.author.lastName}</span>
                        <span>·</span>
                        <span>{formatDate(newsletter.createdAt)}</span>
                      </div>
                      {newsletter.status === 'sent' && newsletter.totalRecipients > 0 && (
                        <div className="space-y-1 mb-3">
                          <div className="flex justify-between text-xs">
                            <span>{t('newsletter.open_rate')}</span>
                            <span className="font-medium">
                              {newsletter.totalRecipients > 0
                                ? Math.round((newsletter.openCount / newsletter.totalRecipients) * 100)
                                : 0}%
                            </span>
                          </div>
                          <Progress
                            value={newsletter.totalRecipients > 0
                              ? (newsletter.openCount / newsletter.totalRecipients) * 100
                              : 0}
                            className="h-1.5"
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex gap-1">
                          <Badge variant="outline" className="text-xs">
                            {t(`newsletter.template_${newsletter.templateType}`)}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {t(`newsletter.category_${newsletter.category}`)}
                          </Badge>
                        </div>
                        {!isStudentOrParent && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setViewNewsletter(newsletter)}>
                                <Eye className="h-4 w-4 mr-2" />
                                {t('action.view')}
                              </DropdownMenuItem>
                              {(isAdmin || newsletter.authorId === currentUser?.id) && newsletter.status === 'draft' && (
                                <DropdownMenuItem onClick={() => openEditEditor(newsletter)}>
                                  <Edit3 className="h-4 w-4 mr-2" />
                                  {t('action.edit')}
                                </DropdownMenuItem>
                              )}
                              {(isAdmin || newsletter.authorId === currentUser?.id) && (
                                <DropdownMenuItem onClick={() => handleDuplicate(newsletter.id)}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  {t('newsletter.duplicate')}
                                </DropdownMenuItem>
                              )}
                              {(isAdmin || newsletter.authorId === currentUser?.id) && newsletter.status === 'draft' && (
                                <DropdownMenuItem onClick={() => {
                                  setSendNewsletterId(newsletter.id);
                                  setSendAudience('all');
                                  setSendScheduledAt('');
                                  setSendDialogOpen(true);
                                }}>
                                  <Send className="h-4 w-4 mr-2" />
                                  {t('newsletter.send')}
                                </DropdownMenuItem>
                              )}
                              {isAdmin && newsletter.status === 'sent' && (
                                <DropdownMenuItem onClick={() => handleArchive(newsletter.id)}>
                                  <Archive className="h-4 w-4 mr-2" />
                                  {t('newsletter.archive')}
                                </DropdownMenuItem>
                              )}
                              {(isAdmin || newsletter.authorId === currentUser?.id) && (
                                <DropdownMenuItem
                                  className="text-red-600 dark:text-red-400"
                                  onClick={() => handleDelete(newsletter.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  {t('action.delete')}
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        {isStudentOrParent && (
                          <Button variant="ghost" size="sm" onClick={() => setViewNewsletter(newsletter)}>
                            <Eye className="h-4 w-4 mr-1" />
                            {t('action.view')}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );

  // ─── Render: Editor ─────────────────────────────────────────────

  const renderEditor = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => { setIsEditorOpen(false); setActiveTab('newsletters'); }}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-lg font-semibold">
            {editingNewsletter ? t('newsletter.edit_newsletter') : t('newsletter.create_new')}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
          >
            {isPreviewMode ? <Edit3 className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
            {isPreviewMode ? t('newsletter.edit_mode') : t('newsletter.preview_mode')}
          </Button>
          {isPreviewMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMobilePreview(!isMobilePreview)}
            >
              {isMobilePreview ? <Monitor className="h-4 w-4 mr-1" /> : <Smartphone className="h-4 w-4 mr-1" />}
              {isMobilePreview ? t('newsletter.desktop') : t('newsletter.mobile')}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSave(true)}
            disabled={isSaving || !editorTitle}
          >
            <Save className="h-4 w-4 mr-1" />
            {t('newsletter.save_draft')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main editor area */}
        <div className={`lg:col-span-2 space-y-4 ${isPreviewMode && isMobilePreview ? 'max-w-md mx-auto' : ''}`}>
          {/* Title */}
          <div>
            <label className="text-sm font-medium mb-1 block">{t('newsletter.title_label')}</label>
            <Input
              placeholder={t('newsletter.title_placeholder')}
              value={editorTitle}
              onChange={(e) => setEditorTitle(e.target.value)}
              className="text-lg font-semibold"
            />
          </div>

          {/* Subject line */}
          <div>
            <label className="text-sm font-medium mb-1 block">{t('newsletter.subject_label')}</label>
            <Input
              placeholder={t('newsletter.subject_placeholder')}
              value={editorSubject}
              onChange={(e) => setEditorSubject(e.target.value)}
            />
          </div>

          {/* Banner URL */}
          <div>
            <label className="text-sm font-medium mb-1 block">{t('newsletter.banner_url_label')}</label>
            <div className="flex gap-2">
              <Input
                placeholder={t('newsletter.banner_url_placeholder')}
                value={editorBannerUrl}
                onChange={(e) => setEditorBannerUrl(e.target.value)}
              />
              {editorBannerUrl && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setEditorBannerUrl('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {editorBannerUrl && (
              <div className="mt-2 h-32 rounded-lg overflow-hidden bg-gradient-to-r from-emerald-500 to-teal-500">
                <img
                  src={editorBannerUrl}
                  alt="Banner"
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}
          </div>

          {/* Summary */}
          <div>
            <label className="text-sm font-medium mb-1 block">{t('newsletter.summary_label')}</label>
            <Textarea
              placeholder={t('newsletter.summary_placeholder')}
              value={editorSummary}
              onChange={(e) => setEditorSummary(e.target.value)}
              rows={2}
            />
          </div>

          {/* Content editor */}
          {!isPreviewMode ? (
            <div>
              <label className="text-sm font-medium mb-1 block">{t('newsletter.content_label')}</label>
              {/* Formatting toolbar */}
              <div className="flex items-center gap-1 p-2 border rounded-t-lg bg-muted/30">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand('bold')}>
                  <Bold className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand('italic')}>
                  <Italic className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand('underline')}>
                  <Underline className="h-4 w-4" />
                </Button>
                <Separator orientation="vertical" className="h-6 mx-1" />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand('insertUnorderedList')}>
                  <List className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand('justifyLeft')}>
                  <AlignLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand('justifyCenter')}>
                  <AlignCenter className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand('justifyRight')}>
                  <AlignRight className="h-4 w-4" />
                </Button>
                <Separator orientation="vertical" className="h-6 mx-1" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    const url = prompt(t('newsletter.enter_url'));
                    if (url) execCommand('createLink', url);
                  }}
                >
                  <LinkIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    const url = prompt(t('newsletter.enter_image_url'));
                    if (url) execCommand('insertImage', url);
                  }}
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
                <Separator orientation="vertical" className="h-6 mx-1" />
                <Select onValueChange={(v) => execCommand('formatBlock', v)}>
                  <SelectTrigger className="h-8 w-28 text-xs">
                    <SelectValue placeholder={t('newsletter.heading')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="h2">{t('newsletter.heading2')}</SelectItem>
                    <SelectItem value="h3">{t('newsletter.heading3')}</SelectItem>
                    <SelectItem value="p">{t('newsletter.paragraph')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                className="min-h-[300px] p-4 border border-t-0 rounded-b-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 prose dark:prose-invert max-w-none"
                onInput={handleEditorInput}
                dangerouslySetInnerHTML={{ __html: editorContent }}
              />
            </div>
          ) : (
            /* Preview mode */
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white">
                {editorBannerUrl && (
                  <img
                    src={editorBannerUrl}
                    alt="Banner"
                    className="w-full h-40 object-cover rounded-lg mb-4"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                <h1 className="text-2xl font-bold">{editorTitle || t('newsletter.untitled')}</h1>
                {editorSummary && <p className="text-emerald-100 mt-2">{editorSummary}</p>}
              </div>
              <div
                className="p-6 prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: editorContent }}
              />
            </div>
          )}
        </div>

        {/* Sidebar settings */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{t('newsletter.template_section')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t('newsletter.template_type')}</label>
                <Select value={editorTemplateType} onValueChange={(v) => applyTemplate(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_TYPES.map((tp) => (
                      <SelectItem key={tp.value} value={tp.value}>{t(tp.labelKey)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t('newsletter.category_label')}</label>
                <Select value={editorCategory} onValueChange={setEditorCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{t(c.labelKey)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{t('newsletter.audience_section')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {AUDIENCE_TYPES.map((at) => (
                  <button
                    key={at.value}
                    className={`w-full flex items-center gap-2 p-2 rounded-lg text-sm transition-colors ${
                      editorAudience === at.value
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => setEditorAudience(at.value)}
                  >
                    <at.icon className="h-4 w-4" />
                    {t(at.labelKey)}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{t('newsletter.tags_section')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                placeholder={t('newsletter.tags_placeholder')}
                value={editorTags}
                onChange={(e) => setEditorTags(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">{t('newsletter.tags_hint')}</p>
            </CardContent>
          </Card>

          {/* Quick template previews */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{t('newsletter.quick_templates')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {TEMPLATE_TYPES.map((tp) => (
                <button
                  key={tp.value}
                  className={`w-full flex items-center gap-2 p-2 rounded-lg text-sm transition-colors ${
                    editorTemplateType === tp.value
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => applyTemplate(tp.value)}
                >
                  <Palette className="h-4 w-4" />
                  {t(tp.labelKey)}
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="space-y-2">
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={isSaving || !editorTitle}
              onClick={() => handleSave(true)}
            >
              <Save className="h-4 w-4 mr-2" />
              {t('newsletter.save_draft')}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              disabled={isSaving || !editorTitle}
              onClick={() => {
                setSendNewsletterId(editingNewsletter?.id || null);
                setSendAudience(editorAudience);
                setSendScheduledAt('');
                if (editingNewsletter) {
                  setSendDialogOpen(true);
                } else {
                  // Save first, then send
                  handleSave(true);
                }
              }}
            >
              <Send className="h-4 w-4 mr-2" />
              {t('newsletter.send')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Render: Analytics ──────────────────────────────────────────

  const renderAnalytics = () => {
    if (!stats) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">{t('newsletter.no_analytics')}</p>
          </div>
        </div>
      );
    }

    const { overview, monthlyTrend, bestSendingTime, templatePerformance, recentNewsletters } = stats;

    const templateChartData = Object.entries(templatePerformance).map(([type, data]) => ({
      name: t(`newsletter.template_${type}`),
      openRate: data.openRate,
      clickRate: data.clickRate,
      count: data.count,
    }));

    const pieData = [
      { name: t('newsletter.opens'), value: overview.totalOpens, color: '#10b981' },
      { name: t('newsletter.clicks'), value: overview.totalClicks, color: '#14b8a6' },
      { name: t('newsletter.bounces'), value: overview.totalBounces, color: '#f59e0b' },
    ];

    return (
      <div className="space-y-6">
        {/* Overview stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: t('newsletter.total_sent'), value: overview.totalSent, icon: Send, color: 'text-emerald-600', trend: null },
            { label: t('newsletter.open_rate'), value: `${overview.overallOpenRate}%`, icon: Mail, color: 'text-teal-600', trend: overview.overallOpenRate > 20 ? 'up' : 'down' },
            { label: t('newsletter.click_rate'), value: `${overview.overallClickRate}%`, icon: MousePointerClick, color: 'text-cyan-600', trend: overview.overallClickRate > 5 ? 'up' : 'down' },
            { label: t('newsletter.bounce_rate'), value: `${overview.overallBounceRate}%`, icon: AlertCircle, color: 'text-amber-600', trend: overview.overallBounceRate < 5 ? 'up' : 'down' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold mt-1">
                        {typeof stat.value === 'number' ? (
                          <AnimatedCounter value={stat.value} />
                        ) : (
                          stat.value
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <stat.icon className={`h-6 w-6 ${stat.color} opacity-60`} />
                      {stat.trend === 'up' && <ArrowUpRight className="h-4 w-4 text-emerald-500" />}
                      {stat.trend === 'down' && <ArrowDownRight className="h-4 w-4 text-red-500" />}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Best sending time */}
        {bestSendingTime && (
          <Card className="border-0 shadow-sm bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
                  <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">{t('newsletter.best_send_time')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('newsletter.best_send_time_desc', `${bestSendingTime.hour}:00`, `${bestSendingTime.openRate}%`)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly trend chart */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('newsletter.engagement_trend')}</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--background)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        fontSize: 12,
                      }}
                    />
                    <Area type="monotone" dataKey="openRate" stroke="#10b981" fill="#10b98120" name={t('newsletter.open_rate')} />
                    <Area type="monotone" dataKey="clickRate" stroke="#14b8a6" fill="#14b8a620" name={t('newsletter.click_rate')} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                  {t('newsletter.no_data')}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Template performance chart */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('newsletter.template_performance')}</CardTitle>
            </CardHeader>
            <CardContent>
              {templateChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={templateChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--background)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="openRate" fill="#10b981" name={t('newsletter.open_rate')} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="clickRate" fill="#14b8a6" name={t('newsletter.click_rate')} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                  {t('newsletter.no_data')}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pie chart and recent newsletters */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Distribution pie chart */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('newsletter.engagement_distribution')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-2">
                {pieData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span>{entry.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent newsletters performance */}
          <Card className="lg:col-span-2 border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('newsletter.recent_performance')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {recentNewsletters.length > 0 ? (
                  recentNewsletters.map((rn) => (
                    <div key={rn.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{rn.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>{t(`newsletter.template_${rn.templateType}`)}</span>
                          <span>·</span>
                          <span>{formatDate(rn.sentAt)}</span>
                          <span>·</span>
                          <span>{rn.totalRecipients} {t('newsletter.recipients')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs shrink-0">
                        <div className="text-center">
                          <p className="font-semibold text-emerald-600 dark:text-emerald-400">{rn.openRate}%</p>
                          <p className="text-muted-foreground">{t('newsletter.opens')}</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-teal-600 dark:text-teal-400">{rn.clickRate}%</p>
                          <p className="text-muted-foreground">{t('newsletter.clicks')}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    {t('newsletter.no_data')}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subscriber growth chart (simulated) */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('newsletter.subscriber_growth')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyTrend.map((mt, i) => ({
                ...mt,
                subscribers: mt.recipients + Math.floor(i * mt.recipients * 0.05),
              }))}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: 12,
                  }}
                />
                <Line type="monotone" dataKey="subscribers" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name={t('newsletter.subscribers')} />
                <Line type="monotone" dataKey="recipients" stroke="#14b8a6" strokeWidth={2} dot={{ r: 4 }} name={t('newsletter.recipients')} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    );
  };

  // ─── Render: View Newsletter Dialog ─────────────────────────────

  const renderViewDialog = () => (
    <Dialog open={!!viewNewsletter} onOpenChange={(open) => !open && setViewNewsletter(null)}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{viewNewsletter?.title}</DialogTitle>
          <DialogDescription>
            {viewNewsletter?.author.firstName} {viewNewsletter?.author.lastName} · {formatDateTime(viewNewsletter?.createdAt)}
          </DialogDescription>
        </DialogHeader>
        {viewNewsletter?.bannerImageUrl && (
          <div className="h-40 rounded-lg overflow-hidden">
            <img
              src={viewNewsletter.bannerImageUrl}
              alt="Banner"
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        )}
        {viewNewsletter?.summary && (
          <p className="text-muted-foreground italic">{viewNewsletter.summary}</p>
        )}
        <div
          className="prose dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: viewNewsletter?.content || '' }}
        />
        {viewNewsletter?.status === 'sent' && viewNewsletter.totalRecipients > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t">
            <div className="text-center p-2 rounded-lg bg-muted/30">
              <p className="text-lg font-bold text-emerald-600">{viewNewsletter.totalRecipients}</p>
              <p className="text-xs text-muted-foreground">{t('newsletter.recipients')}</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/30">
              <p className="text-lg font-bold text-teal-600">{viewNewsletter.openCount}</p>
              <p className="text-xs text-muted-foreground">{t('newsletter.opens')}</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/30">
              <p className="text-lg font-bold text-cyan-600">{viewNewsletter.clickCount}</p>
              <p className="text-xs text-muted-foreground">{t('newsletter.clicks')}</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/30">
              <p className="text-lg font-bold text-amber-600">{viewNewsletter.bounceCount}</p>
              <p className="text-xs text-muted-foreground">{t('newsletter.bounces')}</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  // ─── Render: Send Dialog ────────────────────────────────────────

  const renderSendDialog = () => (
    <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('newsletter.send_newsletter')}</DialogTitle>
          <DialogDescription>{t('newsletter.send_description')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">{t('newsletter.target_audience')}</label>
            <div className="space-y-2">
              {AUDIENCE_TYPES.map((at) => (
                <button
                  key={at.value}
                  className={`w-full flex items-center gap-2 p-3 rounded-lg text-sm transition-colors ${
                    sendAudience === at.value
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'hover:bg-muted border'
                  }`}
                  onClick={() => setSendAudience(at.value)}
                >
                  <at.icon className="h-4 w-4" />
                  {t(at.labelKey)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">{t('newsletter.schedule_send')}</label>
            <Input
              type="datetime-local"
              value={sendScheduledAt}
              onChange={(e) => setSendScheduledAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
            <p className="text-xs text-muted-foreground mt-1">{t('newsletter.schedule_hint')}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setSendDialogOpen(false)}>
            {t('action.cancel')}
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={isSending}
            onClick={handleSend}
          >
            {isSending ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            {sendScheduledAt ? t('newsletter.schedule') : t('newsletter.send_now')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // ─── Main Render ────────────────────────────────────────────────

  if (isEditorOpen) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        {renderEditor()}
        {renderSendDialog()}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-6 text-white"
      >
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <Newspaper className="h-8 w-8" />
            <h1 className="text-2xl font-bold">{t('newsletter.title')}</h1>
          </div>
          <p className="text-emerald-100 text-sm max-w-xl">
            {isStudentOrParent ? t('newsletter.subtitle_readonly') : t('newsletter.subtitle')}
          </p>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabView)}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="newsletters" className="gap-1.5">
            <Newspaper className="h-4 w-4" />
            {t('newsletter.tab_newsletters')}
          </TabsTrigger>
          {!isStudentOrParent && (
            <TabsTrigger value="analytics" className="gap-1.5">
              <BarChart3 className="h-4 w-4" />
              {t('newsletter.tab_analytics')}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="newsletters" className="mt-4">
          {renderNewsletterList()}
        </TabsContent>

        {!isStudentOrParent && (
          <TabsContent value="analytics" className="mt-4">
            {renderAnalytics()}
          </TabsContent>
        )}
      </Tabs>

      {/* Dialogs */}
      {renderViewDialog()}
      {renderSendDialog()}
    </div>
  );
}
