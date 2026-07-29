'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Plus,
  Send,
  Save,
  Trash2,
  Reply,
  X,
  Loader2,
  AlertCircle,
  MessageSquare,
  Mailbox,
  Phone,
  PhoneCall,
  Languages,
  UserCircle2,
  GraduationCap,
  Search,
  Filter,
  BarChart3,
  Inbox,
  CheckCheck,
  Clock,
  ChevronRight,
  TrendingUp,
  FileText,
  AlertTriangle,
  Calendar,
  PartyPopper,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import {
  listParentContacts,
  createParentContact,
  updateParentContact,
  deleteParentContact,
  listParentMessages,
  createParentMessage,
  updateParentMessage,
  deleteParentMessage,
  type ParentContact,
  type ParentMessage,
  type ParentMessageCategory,
  type ParentMessagePriority,
  type ParentMessageStatus,
} from '@/lib/api';

/* ── Category config (icon + colors) ─────────────────────────────── */

type CategoryKey = ParentMessageCategory;

const CATEGORY_CONFIG: Record<
  CategoryKey,
  { iconComponent: React.ElementType; badgeClass: string; dotClass: string; barClass: string }
> = {
  general: {
    iconComponent: MessageSquare,
    badgeClass:
      'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
    dotClass: 'bg-gray-400',
    barClass: 'from-gray-400 to-gray-500',
  },
  progress: {
    iconComponent: TrendingUp,
    badgeClass:
      'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    dotClass: 'bg-emerald-500',
    barClass: 'from-emerald-400 to-emerald-500',
  },
  assessment: {
    iconComponent: FileText,
    badgeClass:
      'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    dotClass: 'bg-amber-500',
    barClass: 'from-amber-400 to-amber-500',
  },
  behavior: {
    iconComponent: AlertTriangle,
    badgeClass:
      'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    dotClass: 'bg-rose-500',
    barClass: 'from-rose-400 to-rose-500',
  },
  attendance: {
    iconComponent: Calendar,
    badgeClass:
      'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800',
    dotClass: 'bg-teal-500',
    barClass: 'from-teal-400 to-teal-500',
  },
  event: {
    iconComponent: PartyPopper,
    badgeClass:
      'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800',
    dotClass: 'bg-violet-500',
    barClass: 'from-violet-400 to-violet-500',
  },
};

const CATEGORIES: CategoryKey[] = [
  'general',
  'progress',
  'assessment',
  'behavior',
  'attendance',
  'event',
];

const CATEGORY_LABEL_KEY: Record<CategoryKey, string> = {
  general: 'parents.category_general',
  progress: 'parents.category_progress',
  assessment: 'parents.category_assessment',
  behavior: 'parents.category_behavior',
  attendance: 'parents.category_attendance',
  event: 'parents.category_event',
};

/* ── Priority config ─────────────────────────────────────────────── */

type PriorityKey = ParentMessagePriority;

const PRIORITY_CONFIG: Record<PriorityKey, { dotClass: string; pulse: boolean; labelKey: string }> = {
  low: { dotClass: 'bg-gray-400', pulse: false, labelKey: 'parents.priority_low' },
  normal: { dotClass: 'bg-emerald-500', pulse: false, labelKey: 'parents.priority_normal' },
  high: { dotClass: 'bg-amber-500', pulse: false, labelKey: 'parents.priority_high' },
  urgent: { dotClass: 'bg-rose-500', pulse: true, labelKey: 'parents.priority_urgent' },
};

const PRIORITIES: PriorityKey[] = ['low', 'normal', 'high', 'urgent'];

const PRIORITY_LABEL_KEY: Record<PriorityKey, string> = {
  low: 'parents.priority_low',
  normal: 'parents.priority_normal',
  high: 'parents.priority_high',
  urgent: 'parents.priority_urgent',
};

/* ── Status config ───────────────────────────────────────────────── */

const STATUS_LABEL_KEY: Record<string, string> = {
  draft: 'parents.status_draft',
  sent: 'parents.status_sent',
  delivered: 'parents.status_delivered',
  read: 'parents.status_read',
  replied: 'parents.status_replied',
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  draft:
    'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
  sent:
    'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
  delivered:
    'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800',
  read:
    'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
  replied:
    'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800',
};

/* ── Templates ───────────────────────────────────────────────────── */

interface Template {
  key: string;
  labelKey: string;
  category: CategoryKey;
  priority: PriorityKey;
  subjectDe: string;
  subjectEn: string;
  bodyDe: string;
  bodyEn: string;
}

const TEMPLATES: Template[] = [
  {
    key: 'progress_good',
    labelKey: 'parents.template_progress_good',
    category: 'progress',
    priority: 'normal',
    subjectDe: 'Positives Feedback zum Lernfortschritt',
    subjectEn: 'Positive feedback on learning progress',
    bodyDe:
      'Sehr geehrte(r) Frau/Herr {last},\n\nich möchte Ihnen heute eine positive Rückmeldung zum Lernfortschritt von {first} geben. In den letzten Wochen habe ich eine deutliche Entwicklung beobachtet, insbesondere im Bereich {area}. {first} arbeitet konzentriert mit und beteiligt sich regelmäßig am Unterricht.\n\nMit freundlichen Grüßen\n{teacher}',
    bodyEn:
      'Dear Mr./Ms. {last},\n\nI would like to share some positive feedback regarding {first}\'s learning progress. Over the past weeks I have observed clear development, especially in {area}. {first} works with focus and participates regularly in class.\n\nBest regards\n{teacher}',
  },
  {
    key: 'assessment_reminder',
    labelKey: 'parents.template_assessment_reminder',
    category: 'assessment',
    priority: 'high',
    subjectDe: 'Erinnerung: Baldige Überprüfung im Fach',
    subjectEn: 'Reminder: Upcoming assessment',
    bodyDe:
      'Sehr geehrte(r) Frau/Herr {last},\n\nhiermit möchte ich Sie darüber informieren, dass am {date} eine Überprüfung im Fach stattfindet. Bitte unterstützen Sie {first} bei der Vorbereitung. Die relevanten Themen wurden im Unterricht besprochen.\n\nMit freundlichen Grüßen\n{teacher}',
    bodyEn:
      'Dear Mr./Ms. {last},\n\nI would like to inform you that an assessment will take place on {date}. Please support {first} in preparing for it. The relevant topics have been discussed in class.\n\nBest regards\n{teacher}',
  },
  {
    key: 'behavior_concern',
    labelKey: 'parents.template_behavior_concern',
    category: 'behavior',
    priority: 'urgent',
    subjectDe: 'Verhalten im Unterricht — Gesprächsbedarf',
    subjectEn: 'Behavior in class — need to talk',
    bodyDe:
      'Sehr geehrte(r) Frau/Herr {last},\n\nin letzter Zeit ist mir aufgefallen, dass {first} im Unterricht häufiger unaufmerksam ist und den Unterricht störte. Ich würde gerne zeitnah ein Gespräch mit Ihnen führen, um gemeinsam Lösungen zu finden.\n\nMit freundlichen Grüßen\n{teacher}',
    bodyEn:
      'Dear Mr./Ms. {last},\n\nrecently I have noticed that {first} has been inattentive in class and disrupted lessons. I would like to have a conversation with you soon to find solutions together.\n\nBest regards\n{teacher}',
  },
  {
    key: 'meeting_request',
    labelKey: 'parents.template_meeting_request',
    category: 'general',
    priority: 'normal',
    subjectDe: 'Einladung zu einem Elternsprechgespräch',
    subjectEn: 'Invitation to a parent-teacher meeting',
    bodyDe:
      'Sehr geehrte(r) Frau/Herr {last},\n\nich würde Sie gerne zu einem Gespräch über die Entwicklung von {first} einladen. Bitte melden Sie sich bei mir mit einem passenden Terminvorschlag.\n\nMit freundlichen Grüßen\n{teacher}',
    bodyEn:
      'Dear Mr./Ms. {last},\n\nI would like to invite you to a conversation about {first}\'s development. Please let me know a suitable date.\n\nBest regards\n{teacher}',
  },
];

/* ── Helpers ─────────────────────────────────────────────────────── */

function formatDate(d: string | Date, locale: string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatDateTime(d: string | Date, locale: string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-US', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatRelative(d: string | Date, locale: string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1) return locale === 'de' ? 'gerade eben' : 'just now';
  if (diffMin < 60) return locale === 'de' ? `vor ${diffMin} Min.` : `${diffMin} min ago`;
  if (diffHours < 24) return locale === 'de' ? `vor ${diffHours} Std.` : `${diffHours}h ago`;
  if (diffDays < 7) return locale === 'de' ? `vor ${diffDays} Tg.` : `${diffDays}d ago`;
  return formatDate(date, locale);
}

function getInitials(first: string, last: string): string {
  return `${(first?.[0] ?? '?').toUpperCase()}${(last?.[0] ?? '?').toUpperCase()}`;
}

/* ── Conversation grouping ───────────────────────────────────────── */

interface Conversation {
  parentId: string;
  parent: ParentMessage['parent'] & { studentId: string };
  studentId: string;
  studentName: string;
  messages: ParentMessage[];
  lastMessageAt: string;
  unreadCount: number;
}

function groupByConversation(messages: ParentMessage[]): Conversation[] {
  const map = new Map<string, Conversation>();
  for (const m of messages) {
    const key = m.parentId;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        parentId: m.parentId,
        parent: {
          ...m.parent,
          studentId: m.studentId,
        },
        studentId: m.studentId,
        studentName: `${m.student.firstName} ${m.student.lastName}`,
        messages: [m],
        lastMessageAt: m.createdAt,
        unreadCount: m.status === 'sent' || m.status === 'delivered' ? 1 : 0,
      });
    } else {
      existing.messages.push(m);
      if (new Date(m.createdAt) > new Date(existing.lastMessageAt)) {
        existing.lastMessageAt = m.createdAt;
      }
      if (m.status === 'sent' || m.status === 'delivered') {
        existing.unreadCount += 1;
      }
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  );
}

/* ── Main View ───────────────────────────────────────────────────── */

export default function ParentCommunicationView() {
  const currentUser = useAppStore((s) => s.currentUser);
  const locale = useAppStore((s) => s.locale);

  const [tab, setTab] = useState<'inbox' | 'statistics'>('inbox');
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<ParentContact[]>([]);
  const [messages, setMessages] = useState<ParentMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStudentId, setFilterStudentId] = useState<string>('all');

  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [newContactOpen, setNewContactOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ParentContact | null>(null);
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);

  const threadScrollRef = useRef<HTMLDivElement | null>(null);

  const teacherId = currentUser?.id ?? '';

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [contactsResp, messagesResp] = await Promise.all([
        listParentContacts(),
        listParentMessages({ teacherId, limit: 200 }),
      ]);
      setContacts(contactsResp);
      setMessages(messagesResp.items);
    } catch (err) {
      console.error('Failed to load parent communication data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered conversations
  const conversations = useMemo(() => {
    let list = groupByConversation(messages);
    if (filterCategory !== 'all') {
      list = list
        .map((c) => ({
          ...c,
          messages: c.messages.filter((m) => m.category === filterCategory),
        }))
        .filter((c) => c.messages.length > 0);
    }
    if (filterStudentId !== 'all') {
      list = list.filter((c) => c.studentId === filterStudentId);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.parent.firstName.toLowerCase().includes(q) ||
          c.parent.lastName.toLowerCase().includes(q) ||
          c.studentName.toLowerCase().includes(q)
      );
    }
    return list;
  }, [messages, filterCategory, filterStudentId, searchQuery]);

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.parentId === selectedParentId) ?? null,
    [conversations, selectedParentId]
  );

  // When selectedParentId doesn't match any conversation but matches a contact
  const selectedParent = useMemo(() => {
    if (selectedParentId) {
      return contacts.find((c) => c.id === selectedParentId) ?? null;
    }
    return null;
  }, [contacts, selectedParentId]);

  const selectedMessages = useMemo(() => {
    if (!selectedParentId) return [];
    return messages
      .filter((m) => m.parentId === selectedParentId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [messages, selectedParentId]);

  // Mark as read on view
  useEffect(() => {
    if (!selectedParentId) return;
    const unread = selectedMessages.filter(
      (m) => m.status === 'sent' || m.status === 'delivered'
    );
    if (unread.length === 0) return;
    let cancelled = false;
    (async () => {
      for (const m of unread) {
        try {
          const updated = await updateParentMessage(m.id, { status: 'read' });
          if (cancelled) return;
          setMessages((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        } catch (err) {
          console.error('Failed to mark message read:', err);
        }
      }
      if (!cancelled) {
        toast.success(t('parents.marked_read'));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedParentId, selectedMessages]);

  // Scroll thread to bottom on selection
  useEffect(() => {
    if (threadScrollRef.current) {
      threadScrollRef.current.scrollTop = threadScrollRef.current.scrollHeight;
    }
  }, [selectedParentId, selectedMessages.length]);

  /* ── Handlers ─────────────────────────────────────────────────── */

  const handleMessageSent = useCallback((msg: ParentMessage) => {
    setMessages((prev) => {
      // Remove if same id (shouldn't happen but safe), then prepend
      const filtered = prev.filter((m) => m.id !== msg.id);
      return [msg, ...filtered];
    });
    setSelectedParentId(msg.parentId);
  }, []);

  const handleMessageUpdated = useCallback((msg: ParentMessage) => {
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
  }, []);

  const handleDeleteMessage = useCallback(async () => {
    if (!deleteMessageId) return;
    try {
      await deleteParentMessage(deleteMessageId);
      setMessages((prev) => prev.filter((m) => m.id !== deleteMessageId));
      toast.success(t('parents.deleted'));
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete message');
    } finally {
      setDeleteMessageId(null);
    }
  }, [deleteMessageId]);

  const handleContactSaved = useCallback(
    (contact: ParentContact) => {
      setContacts((prev) => {
        const idx = prev.findIndex((c) => c.id === contact.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = contact;
          return copy;
        }
        return [...prev, contact];
      });
    },
    []
  );

  const handleContactDeleted = useCallback(
    (id: string) => {
      setContacts((prev) => prev.filter((c) => c.id !== id));
      setMessages((prev) => prev.filter((m) => m.parentId !== id));
      if (selectedParentId === id) {
        setSelectedParentId(null);
      }
    },
    [selectedParentId]
  );

  /* ── Statistics ───────────────────────────────────────────────── */

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthMessages = messages.filter((m) => new Date(m.createdAt) >= monthStart);
    const sentCount = monthMessages.length;
    const repliedCount = messages.filter((m) => m.status === 'replied').length;
    const responseRate = messages.length > 0 ? Math.round((repliedCount / messages.length) * 100) : 0;

    // Average response time (hours) — for messages with reply
    const replyTimes: number[] = [];
    for (const m of messages) {
      if (m.replyAt && m.status === 'replied') {
        const diffH =
          (new Date(m.replyAt).getTime() - new Date(m.createdAt).getTime()) / (1000 * 60 * 60);
        if (diffH >= 0) replyTimes.push(diffH);
      }
    }
    const avgResponseHours =
      replyTimes.length > 0 ? replyTimes.reduce((a, b) => a + b, 0) / replyTimes.length : 0;

    // By category counts
    const byCategory: Record<string, number> = {};
    for (const c of CATEGORIES) byCategory[c] = 0;
    for (const m of messages) {
      if (byCategory[m.category] !== undefined) byCategory[m.category] += 1;
    }
    const maxCategory = Math.max(1, ...Object.values(byCategory));

    return {
      sentCount,
      responseRate,
      avgResponseHours,
      byCategory,
      maxCategory,
      total: messages.length,
    };
  }, [messages]);

  const uniqueStudents = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of contacts) {
      map.set(c.studentId, `${c.student.firstName} ${c.student.lastName}`);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [contacts]);

  /* ── Render ───────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="h-10 w-10 text-rose-500" />
        <p className="text-rose-600 dark:text-rose-400">{error}</p>
        <Button onClick={loadData} variant="outline">
          {t('parents.conversations')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 md:p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Mail className="h-7 w-7 text-emerald-500" />
            {t('parents.title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('parents.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setNewContactOpen(true)}
            variant="outline"
            className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/50 dark:text-emerald-300 dark:hover:bg-emerald-900/20"
          >
            <Plus className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">{t('parents.new_contact')}</span>
          </Button>
          <Button
            onClick={() => setNewMessageOpen(true)}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
          >
            <Send className="h-4 w-4 mr-1" />
            {t('parents.new_message')}
          </Button>
        </div>
      </motion.div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'inbox' | 'statistics')}>
        <TabsList className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-900/30">
          <TabsTrigger
            value="inbox"
            className="data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-900 dark:data-[state=active]:text-emerald-300"
          >
            <Inbox className="h-4 w-4 mr-1.5" />
            {t('parents.conversations')}
          </TabsTrigger>
          <TabsTrigger
            value="statistics"
            className="data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-900 dark:data-[state=active]:text-emerald-300"
          >
            <BarChart3 className="h-4 w-4 mr-1.5" />
            {t('parents.statistics')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="mt-4">
          {/* Mobile: collapsible conversation list; Desktop: 3 columns */}
          {conversations.length === 0 ? (
            <EmptyState
              title={t('parents.no_conversations')}
              description={t('parents.no_conversations_desc')}
              onAction={() => setNewMessageOpen(true)}
              actionLabel={t('parents.new_message')}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Left sidebar: conversations list */}
              <Card className="lg:col-span-1 border-emerald-200/60 dark:border-emerald-900/30 bg-white/80 dark:bg-gray-900/60 backdrop-blur-sm overflow-hidden">
                <CardHeader className="pb-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                      <MessageSquare className="h-4 w-4 text-emerald-500" />
                      {t('parents.conversations')}
                    </CardTitle>
                    <Badge
                      variant="secondary"
                      className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                    >
                      {conversations.length}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('parents.search_placeholder')}
                        className="pl-7 h-8 text-xs bg-white dark:bg-gray-800 border-emerald-200/60 dark:border-emerald-900/30"
                      />
                    </div>
                    <div className="flex items-start gap-1.5">
                      <Filter className="h-3 w-3 text-gray-400 shrink-0 mt-1.5" />
                      <div className="flex-1 grid grid-cols-2 gap-1.5 min-w-0">
                        <div className="space-y-1 min-w-0">
                          <label className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold">
                            {t('parents.field.student')}
                          </label>
                          <Select value={filterStudentId} onValueChange={setFilterStudentId}>
                            <SelectTrigger className="h-7 text-xs w-full min-w-0">
                              <SelectValue placeholder={t('parents.filter_by_student')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">{t('parents.filter_all')}</SelectItem>
                              {uniqueStudents.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1 min-w-0">
                          <label className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold">
                            {t('parents.field.category')}
                          </label>
                          <Select value={filterCategory} onValueChange={setFilterCategory}>
                            <SelectTrigger className="h-7 text-xs w-full min-w-0">
                              <SelectValue placeholder={t('parents.filter_by_category')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">{t('parents.filter_all')}</SelectItem>
                              {CATEGORIES.map((c) => {
                                const CatIcon = CATEGORY_CONFIG[c].iconComponent;
                                return (
                                <SelectItem key={c} value={c}>
                                  <CatIcon className="w-3.5 h-3.5 inline mr-0.5" /> {t(CATEGORY_LABEL_KEY[c])}
                                </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[calc(100vh-22rem)] lg:h-[calc(100vh-18rem)]">
                    <div className="space-y-1 px-2 pb-2">
                      {conversations.map((c) => {
                        const isActive = c.parentId === selectedParentId;
                        const last = c.messages[c.messages.length - 1];
                        const cfg = last ? CATEGORY_CONFIG[last.category as CategoryKey] : null;
                        return (
                          <button
                            key={c.parentId}
                            onClick={() => setSelectedParentId(c.parentId)}
                            className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                              isActive
                                ? 'bg-gradient-to-r from-emerald-50 to-teal-50/60 dark:from-emerald-950/40 dark:to-teal-950/20 border-emerald-200 dark:border-emerald-800/60 shadow-sm'
                                : 'bg-white/50 dark:bg-gray-900/30 border-transparent hover:border-emerald-200/60 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900 dark:to-teal-900 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-xs font-bold">
                                {getInitials(c.parent.firstName, c.parent.lastName)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                                    {c.parent.firstName} {c.parent.lastName}
                                  </p>
                                  {c.unreadCount > 0 && (
                                    <span className="flex-shrink-0 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                                  )}
                                </div>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                                  {c.studentName}
                                </p>
                                {last && (
                                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1 break-words mt-1">
                                    {cfg && <cfg.iconComponent className="w-3.5 h-3.5 inline mr-0.5" />} {last.subject}
                                  </p>
                                )}
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 shrink-0">
                                  {formatRelative(c.lastMessageAt, locale)}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Center column: thread */}
              <Card className="lg:col-span-2 border-emerald-200/60 dark:border-emerald-900/30 bg-white/80 dark:bg-gray-900/60 backdrop-blur-sm flex flex-col overflow-hidden">
                {selectedConversation ? (
                  <>
                    <CardHeader className="pb-3 border-b border-emerald-100 dark:border-emerald-900/30">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <CardTitle className="text-base text-gray-900 dark:text-gray-100 truncate">
                            {selectedConversation.parent.firstName}{' '}
                            {selectedConversation.parent.lastName}
                          </CardTitle>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {t('parents.field.student')}: {selectedConversation.studentName}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/50 dark:text-emerald-300 dark:hover:bg-emerald-900/20"
                          onClick={() => setNewMessageOpen(true)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          <span className="hidden sm:inline">{t('parents.new_message')}</span>
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0 flex-1">
                      <ScrollArea className="h-[calc(100vh-26rem)] lg:h-[calc(100vh-22rem)]">
                        <div
                          ref={threadScrollRef}
                          className="flex flex-col gap-3 p-4 min-h-full"
                        >
                          <AnimatePresence initial={false}>
                            {selectedMessages.map((m) => {
                              const cfg = CATEGORY_CONFIG[m.category as CategoryKey] ?? CATEGORY_CONFIG.general;
                              const pri = PRIORITY_CONFIG[m.priority as PriorityKey] ?? PRIORITY_CONFIG.normal;
                              return (
                                <motion.div
                                  key={m.id}
                                  layout
                                  initial={{ opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -8 }}
                                  transition={{ duration: 0.2 }}
                                  className="flex flex-col items-end"
                                >
                                  <div className="max-w-[85%] md:max-w-[75%] w-full">
                                    {/* Header bar */}
                                    <div className="flex items-center gap-1.5 mb-1 justify-end">
                                      <span
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border ${cfg.badgeClass}`}
                                      >
                                        <cfg.iconComponent className="w-3 h-3" />
                                        <span>{t(CATEGORY_LABEL_KEY[m.category as CategoryKey])}</span>
                                      </span>
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">
                                        <span
                                          className={`inline-block w-1.5 h-1.5 rounded-full ${pri.dotClass} ${
                                            pri.pulse ? 'animate-pulse' : ''
                                          }`}
                                        />
                                        {t(PRIORITY_LABEL_KEY[m.priority as PriorityKey])}
                                      </span>
                                      <span
                                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] border ${
                                          STATUS_BADGE_CLASS[m.status] ?? STATUS_BADGE_CLASS.sent
                                        }`}
                                      >
                                        {t(STATUS_LABEL_KEY[m.status] ?? 'parents.status_sent')}
                                      </span>
                                    </div>
                                    {/* Bubble */}
                                    <div className="rounded-2xl rounded-tr-sm bg-gradient-to-br from-emerald-500 to-teal-500 text-white p-3 shadow-sm">
                                      <p className="text-sm font-semibold mb-1">{m.subject}</p>
                                      <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                                      <p className="text-[10px] text-emerald-50/80 mt-1.5 text-right">
                                        {formatDateTime(m.createdAt, locale)}
                                      </p>
                                    </div>
                                    {/* Reply (parent) */}
                                    {m.reply && (
                                      <motion.div
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-2 self-start max-w-[90%]"
                                      >
                                        <div className="rounded-2xl rounded-tl-sm bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 p-3 border border-gray-200 dark:border-gray-700">
                                          <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 flex items-center gap-1">
                                            <Reply className="h-3 w-3" />
                                            {selectedConversation.parent.firstName}{' '}
                                            {selectedConversation.parent.lastName}
                                          </p>
                                          <p className="text-sm whitespace-pre-wrap break-words">{m.reply}</p>
                                          {m.replyAt && (
                                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 text-right">
                                              {formatDateTime(m.replyAt, locale)}
                                            </p>
                                          )}
                                        </div>
                                      </motion.div>
                                    )}
                                    {/* Actions */}
                                    <div className="flex items-center justify-end gap-1 mt-1">
                                      <ReplyBox
                                        message={m}
                                        parentName={`${selectedConversation.parent.firstName} ${selectedConversation.parent.lastName}`}
                                        locale={locale}
                                        onUpdated={handleMessageUpdated}
                                      />
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 w-6 p-0 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                        onClick={() => setDeleteMessageId(m.id)}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </AnimatePresence>
                          {selectedMessages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-64 text-center">
                              <Mailbox className="h-10 w-10 text-emerald-300 mb-2" />
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('parents.empty_thread')}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {t('parents.empty_thread_desc')}
                              </p>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </>
                ) : (
                  <CardContent className="flex flex-col items-center justify-center h-[60vh] text-center">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-950 dark:to-teal-950 flex items-center justify-center mb-3">
                      <Mail className="h-9 w-9 text-emerald-500" />
                    </div>
                    <p className="text-base font-semibold text-gray-800 dark:text-gray-200">
                      {t('parents.no_conversation_selected')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
                      {t('parents.no_conversations_desc')}
                    </p>
                    <Button
                      onClick={() => setNewMessageOpen(true)}
                      className="mt-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
                    >
                      <Send className="h-4 w-4 mr-1.5" />
                      {t('parents.new_message')}
                    </Button>
                  </CardContent>
                )}
              </Card>

              {/* Right sidebar: contact info */}
              <Card className="lg:col-span-1 border-emerald-200/60 dark:border-emerald-900/30 bg-white/80 dark:bg-gray-900/60 backdrop-blur-sm overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                    <UserCircle2 className="h-4 w-4 text-emerald-500" />
                    {t('parents.parent_info')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedParent ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900 dark:to-teal-900 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
                          {getInitials(selectedParent.firstName, selectedParent.lastName)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {selectedParent.firstName} {selectedParent.lastName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {t(
                              selectedParent.relationship === 'parent'
                                ? 'parents.relationship_parent'
                                : selectedParent.relationship === 'guardian'
                                  ? 'parents.relationship_guardian'
                                  : 'parents.relationship_emergency'
                            )}
                          </p>
                        </div>
                      </div>
                      <Separator className="bg-emerald-100 dark:bg-emerald-900/30" />
                      <div className="space-y-2 text-sm">
                        {selectedParent.email && (
                          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                            <Mail className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                            <span className="truncate text-xs">{selectedParent.email}</span>
                          </div>
                        )}
                        {selectedParent.phone && (
                          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                            <Phone className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                            <span className="text-xs">{selectedParent.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                          <PhoneCall className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                          <span className="text-xs">{selectedParent.preferredContact}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                          <Languages className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                          <span className="text-xs uppercase">{selectedParent.preferredLanguage}</span>
                        </div>
                      </div>
                      {selectedParent.notes && (
                        <>
                          <Separator className="bg-emerald-100 dark:bg-emerald-900/30" />
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">
                              {t('parents.field.notes')}
                            </p>
                            <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                              {selectedParent.notes}
                            </p>
                          </div>
                        </>
                      )}
                      <Separator className="bg-emerald-100 dark:bg-emerald-900/30" />
                      {/* Student info */}
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1.5 flex items-center gap-1">
                          <GraduationCap className="h-3 w-3" />
                          {t('parents.student_info')}
                        </p>
                        <div className="rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 p-2.5 border border-emerald-100 dark:border-emerald-900/40">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {selectedParent.student.firstName} {selectedParent.student.lastName}
                          </p>
                          {selectedParent.student.enrollments[0]?.classGroup && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {t('nav.classes')}: {selectedParent.student.enrollments[0].classGroup.name} · {t('label.grade')} {selectedParent.student.enrollments[0].classGroup.gradeLevel}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <Badge
                              variant="secondary"
                              className="bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"
                            >
                              <Mail className="h-3 w-3 mr-1" />
                              {selectedMessages.length} {t('parents.messages')}
                            </Badge>
                            {selectedMessages.some((m) => m.status === 'replied') && (
                              <Badge
                                variant="secondary"
                                className="bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800/60"
                              >
                                <CheckCheck className="h-3 w-3 mr-1" />
                                {t('parents.status_replied')}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/50 dark:text-emerald-300 dark:hover:bg-emerald-900/20"
                        onClick={() => setEditingContact(selectedParent)}
                      >
                        {t('parents.new_contact')}
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <UserCircle2 className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t('parents.select_conversation')}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="statistics" className="mt-4">
          <StatisticsPanel stats={stats} />
        </TabsContent>
      </Tabs>

      {/* New Message Dialog */}
      <NewMessageDialog
        open={newMessageOpen}
        onOpenChange={setNewMessageOpen}
        contacts={contacts}
        defaultParentId={selectedParentId}
        defaultStudentId={selectedConversation?.studentId ?? null}
        teacherName={currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : ''}
        onSent={handleMessageSent}
        onOpenContact={() => {
          setNewMessageOpen(false);
          setNewContactOpen(true);
        }}
      />

      {/* New/Edit Contact Dialog */}
      <ContactDialog
        open={newContactOpen || !!editingContact}
        onOpenChange={(open) => {
          if (!open) {
            setNewContactOpen(false);
            setEditingContact(null);
          }
        }}
        contact={editingContact}
        contacts={contacts}
        onSaved={(c) => {
          handleContactSaved(c);
          if (editingContact) {
            toast.success(t('parents.contact_updated'));
          } else {
            toast.success(t('parents.contact_created'));
          }
          setNewContactOpen(false);
          setEditingContact(null);
        }}
        onDeleted={(id) => {
          handleContactDeleted(id);
          toast.success(t('parents.contact_deleted'));
          setNewContactOpen(false);
          setEditingContact(null);
        }}
      />

      {/* Delete message confirm */}
      <AlertDialog
        open={!!deleteMessageId}
        onOpenChange={(open) => !open && setDeleteMessageId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('parents.delete_confirm')}</AlertDialogTitle>
            <AlertDialogDescription> </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('action.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMessage}
              className="bg-rose-500 hover:bg-rose-600 text-white"
            >
              {t('action.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ── Reply Box ────────────────────────────────────────────────────── */

function ReplyBox({
  message,
  parentName,
  locale,
  onUpdated,
}: {
  message: ParentMessage;
  parentName: string;
  locale: string;
  onUpdated: (m: ParentMessage) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const updated = await updateParentMessage(message.id, {
        reply: text.trim(),
        status: 'replied',
      });
      onUpdated(updated);
      setText('');
      setOpen(false);
      toast.success(t('parents.reply_sent'));
    } catch (err) {
      console.error(err);
      toast.error('Failed to save reply');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <Button
        size="sm"
        variant="ghost"
        className="h-6 px-2 text-[11px] text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
        onClick={() => setOpen(true)}
      >
        <Reply className="h-3 w-3 mr-0.5" />
        {t('parents.reply')}
      </Button>
    );
  }

  return (
    <div className="w-full mt-1 rounded-lg border border-emerald-200 dark:border-emerald-900/40 bg-white dark:bg-gray-800 p-2">
      <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">
        {t('parents.reply_placeholder')} ({parentName})
      </p>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        className="text-xs min-h-[60px] bg-white dark:bg-gray-900 border-emerald-100 dark:border-emerald-900/30"
        placeholder={t('parents.reply_placeholder')}
        autoFocus
      />
      <div className="flex items-center justify-end gap-1 mt-1">
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-xs"
          onClick={() => {
            setOpen(false);
            setText('');
          }}
        >
          <X className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          disabled={submitting || !text.trim()}
          onClick={handleSubmit}
          className="h-6 px-2 text-xs bg-emerald-500 hover:bg-emerald-600 text-white"
        >
          {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
        </Button>
      </div>
      <p className="sr-only">{locale}</p>
    </div>
  );
}

/* ── Statistics Panel ─────────────────────────────────────────────── */

function StatisticsPanel({
  stats,
}: {
  stats: {
    sentCount: number;
    responseRate: number;
    avgResponseHours: number;
    byCategory: Record<string, number>;
    maxCategory: number;
    total: number;
  };
}) {
  const avgRespLabel = useMemo(() => {
    const h = stats.avgResponseHours;
    if (h <= 0) return t('parents.no_response_yet');
    if (h < 1) return `${Math.round(h * 60)} ${t('parents.minutes')}`;
    if (h < 24) return `${Math.round(h * 10) / 10} ${t('parents.hours')}`;
    return `${Math.round((h / 24) * 10) / 10} ${t('parents.days')}`;
  }, [stats.avgResponseHours]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={<Send className="h-5 w-5" />}
          label={t('parents.messages_sent')}
          value={String(stats.sentCount)}
          subtitle={t('parents.this_month')}
          gradient="from-emerald-500 to-teal-500"
        />
        <StatCard
          icon={<CheckCheck className="h-5 w-5" />}
          label={t('parents.response_rate')}
          value={`${stats.responseRate}%`}
          subtitle={t('parents.status_replied')}
          gradient="from-violet-500 to-fuchsia-500"
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label={t('parents.avg_response_time')}
          value={avgRespLabel}
          subtitle={`${stats.total} ${t('parents.messages')}`}
          gradient="from-amber-500 to-orange-500"
        />
      </div>

      <Card className="border-emerald-200/60 dark:border-emerald-900/30 bg-white/80 dark:bg-gray-900/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4 text-emerald-500" />
            {t('parents.by_category')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {CATEGORIES.map((c) => {
              const cfg = CATEGORY_CONFIG[c];
              const count = stats.byCategory[c] ?? 0;
              const pct = stats.maxCategory > 0 ? (count / stats.maxCategory) * 100 : 0;
              return (
                <div key={c} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                      {(() => { const CatIcon = cfg.iconComponent; return <CatIcon className="w-3.5 h-3.5" />; })()}
                      {t(CATEGORY_LABEL_KEY[c])}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className={`h-full rounded-full bg-gradient-to-r ${cfg.barClass}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  subtitle,
  gradient,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle: string;
  gradient: string;
}) {
  return (
    <Card className="border-emerald-200/60 dark:border-emerald-900/30 bg-white/80 dark:bg-gray-900/60 backdrop-blur-sm overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">{subtitle}</p>
          </div>
          <div
            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center shadow-md`}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Empty State ──────────────────────────────────────────────────── */

function EmptyState({
  title,
  description,
  onAction,
  actionLabel,
}: {
  title: string;
  description: string;
  onAction: () => void;
  actionLabel: string;
}) {
  return (
    <Card className="border-emerald-200/60 dark:border-emerald-900/30 bg-white/80 dark:bg-gray-900/60 backdrop-blur-sm">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-950 dark:to-teal-950 flex items-center justify-center mb-4 shadow-inner"
        >
          <Mailbox className="h-12 w-12 text-emerald-500" />
        </motion.div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm">{description}</p>
        <Button
          onClick={onAction}
          className="mt-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
        >
          <Send className="h-4 w-4 mr-1.5" />
          {actionLabel}
        </Button>
      </CardContent>
    </Card>
  );
}

/* ── New Message Dialog ──────────────────────────────────────────── */

interface NewMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: ParentContact[];
  defaultParentId: string | null;
  defaultStudentId: string | null;
  teacherName: string;
  onSent: (msg: ParentMessage) => void;
  onOpenContact: () => void;
}

function NewMessageDialog({
  open,
  onOpenChange,
  contacts,
  defaultParentId,
  defaultStudentId,
  teacherName,
  onSent,
  onOpenContact,
}: NewMessageDialogProps) {
  const locale = useAppStore((s) => s.locale);
  const [parentId, setParentId] = useState<string>('');
  const [studentId, setStudentId] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<CategoryKey>('general');
  const [priority, setPriority] = useState<PriorityKey>('normal');
  const [templateKey, setTemplateKey] = useState<string>('none');
  const [status, setStatus] = useState<ParentMessageStatus>('sent');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setParentId(defaultParentId ?? '');
      setStudentId(defaultStudentId ?? '');
      setSubject('');
      setBody('');
      setCategory('general');
      setPriority('normal');
      setTemplateKey('none');
      setStatus('sent');
    }
  }, [open, defaultParentId, defaultStudentId]);

  // When parentId changes, sync studentId to parent's student
  useEffect(() => {
    if (parentId) {
      const c = contacts.find((c) => c.id === parentId);
      if (c) setStudentId(c.studentId);
    }
  }, [parentId, contacts]);

  const handleApplyTemplate = (key: string) => {
    setTemplateKey(key);
    if (key === 'none') return;
    const tpl = TEMPLATES.find((x) => x.key === key);
    if (!tpl) return;
    setCategory(tpl.category);
    setPriority(tpl.priority);
    const parent = contacts.find((c) => c.id === parentId);
    const studentFirst = parent?.student.firstName ?? '';
    const studentLast = parent?.student.lastName ?? '';
    const replacements: Record<string, string> = {
      first: studentFirst,
      last: studentLast,
      teacher: teacherName,
      area: 'Mathematik',
      date: new Date().toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US'),
    };
    const apply = (s: string) =>
      s.replace(/\{(\w+)\}/g, (_, k) => replacements[k] ?? `{${k}}`);
    setSubject(locale === 'de' ? apply(tpl.subjectDe) : apply(tpl.subjectEn));
    setBody(locale === 'de' ? apply(tpl.bodyDe) : apply(tpl.bodyEn));
  };

  const handleSubmit = async (e: React.FormEvent, asDraft = false) => {
    e.preventDefault();
    if (!parentId || !studentId || !subject.trim() || !body.trim()) {
      toast.error('Please fill all fields');
      return;
    }
    setSubmitting(true);
    try {
      const finalStatus: ParentMessageStatus = asDraft ? 'draft' : status;
      const msg = await createParentMessage({
        parentId,
        studentId,
        subject: subject.trim(),
        body: body.trim(),
        category,
        priority,
        status: finalStatus,
      });
      onSent(msg);
      toast.success(asDraft ? t('parents.draft_saved') : t('parents.sent'));
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSubmitting(false);
    }
  };

  // Group contacts by student for select
  const contactsByStudent = useMemo(() => {
    const map = new Map<string, ParentContact[]>();
    for (const c of contacts) {
      const arr = map.get(c.studentId) ?? [];
      arr.push(c);
      map.set(c.studentId, arr);
    }
    return map;
  }, [contacts]);

  const studentOptions = useMemo(() => {
    return Array.from(contactsByStudent.keys()).map((sid) => {
      const arr = contactsByStudent.get(sid)!;
      const first = arr[0];
      return {
        id: sid,
        name: `${first.student.firstName} ${first.student.lastName}`,
      };
    });
  }, [contactsByStudent]);

  const parentOptions = useMemo(() => {
    if (!studentId) return [];
    return contactsByStudent.get(studentId) ?? [];
  }, [studentId, contactsByStudent]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <Send className="h-5 w-5 text-emerald-500" />
            {t('parents.new_message')}
          </DialogTitle>
          <DialogDescription>{t('parents.subtitle')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4 py-2">
          {/* Templates */}
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-600 dark:text-gray-400">
              {t('parents.templates')}
            </Label>
            <Select value={templateKey} onValueChange={handleApplyTemplate}>
              <SelectTrigger className="bg-white dark:bg-gray-800 border-emerald-200/60 dark:border-emerald-900/30">
                <SelectValue placeholder={t('parents.templates')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {TEMPLATES.map((tpl) => {
                  const TplIcon = CATEGORY_CONFIG[tpl.category].iconComponent;
                  return (
                  <SelectItem key={tpl.key} value={tpl.key}>
                    <TplIcon className="w-3.5 h-3.5 inline mr-0.5" /> {t(tpl.labelKey)}
                  </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Student */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-600 dark:text-gray-400">
                {t('parents.field.student')}
              </Label>
              <Select
                value={studentId}
                onValueChange={(v) => {
                  setStudentId(v);
                  setParentId('');
                }}
              >
                <SelectTrigger className="bg-white dark:bg-gray-800 border-emerald-200/60 dark:border-emerald-900/30">
                  <SelectValue placeholder={t('parents.field.student')} />
                </SelectTrigger>
                <SelectContent>
                  {studentOptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-gray-600 dark:text-gray-400">
                {t('parents.field.parent')}
              </Label>
              {parentOptions.length === 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-dashed border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                  onClick={onOpenContact}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  {t('parents.create_contact_first')}
                </Button>
              ) : (
                <Select value={parentId} onValueChange={setParentId}>
                  <SelectTrigger className="bg-white dark:bg-gray-800 border-emerald-200/60 dark:border-emerald-900/30">
                    <SelectValue placeholder={t('parents.field.parent')} />
                  </SelectTrigger>
                  <SelectContent>
                    {parentOptions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.firstName} {p.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Category + Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-600 dark:text-gray-400">
                {t('parents.field.category')}
              </Label>
              <Select value={category} onValueChange={(v) => setCategory(v as CategoryKey)}>
                <SelectTrigger className="bg-white dark:bg-gray-800 border-emerald-200/60 dark:border-emerald-900/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => {
                    const CatIcon = CATEGORY_CONFIG[c].iconComponent;
                    return (
                    <SelectItem key={c} value={c}>
                      <CatIcon className="w-3.5 h-3.5 inline mr-0.5" /> {t(CATEGORY_LABEL_KEY[c])}
                    </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-600 dark:text-gray-400">
                {t('parents.field.priority')}
              </Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as PriorityKey)}>
                <SelectTrigger className="bg-white dark:bg-gray-800 border-emerald-200/60 dark:border-emerald-900/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className={`inline-block w-1.5 h-1.5 rounded-full ${PRIORITY_CONFIG[p].dotClass} ${
                            PRIORITY_CONFIG[p].pulse ? 'animate-pulse' : ''
                          }`}
                        />
                        {t(PRIORITY_LABEL_KEY[p])}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-600 dark:text-gray-400">
              {t('parents.field.subject')}
            </Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className="bg-white dark:bg-gray-800 border-emerald-200/60 dark:border-emerald-900/30"
              placeholder={t('parents.field.subject')}
            />
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-600 dark:text-gray-400">
              {t('parents.field.body')}
            </Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows={6}
              className="bg-white dark:bg-gray-800 border-emerald-200/60 dark:border-emerald-900/30 min-h-[140px]"
              placeholder={t('parents.field.body')}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={(e) => handleSubmit(e as unknown as React.FormEvent, true)}
              disabled={submitting || !parentId || !subject.trim() || !body.trim()}
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/50 dark:text-emerald-300 dark:hover:bg-emerald-900/20"
            >
              <Save className="h-4 w-4 mr-1" />
              {t('parents.save_draft')}
            </Button>
            <Button
              type="submit"
              disabled={submitting || !parentId || !subject.trim() || !body.trim()}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
            >
              {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
              {t('parents.send')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Contact Dialog (create/edit) ────────────────────────────────── */

interface ContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: ParentContact | null;
  contacts: ParentContact[];
  onSaved: (contact: ParentContact) => void;
  onDeleted: (id: string) => void;
}

function ContactDialog({
  open,
  onOpenChange,
  contact,
  contacts,
  onSaved,
  onDeleted,
}: ContactDialogProps) {
  const [studentId, setStudentId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState<'parent' | 'guardian' | 'emergency'>('parent');
  const [preferredContact, setPreferredContact] = useState<'email' | 'phone' | 'both'>('email');
  const [preferredLanguage, setPreferredLanguage] = useState('de');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (open) {
      if (contact) {
        setStudentId(contact.studentId);
        setFirstName(contact.firstName);
        setLastName(contact.lastName);
        setEmail(contact.email ?? '');
        setPhone(contact.phone ?? '');
        setRelationship(
          (contact.relationship as 'parent' | 'guardian' | 'emergency') ?? 'parent'
        );
        setPreferredContact(
          (contact.preferredContact as 'email' | 'phone' | 'both') ?? 'email'
        );
        setPreferredLanguage(contact.preferredLanguage ?? 'de');
        setNotes(contact.notes ?? '');
      } else {
        setStudentId('');
        setFirstName('');
        setLastName('');
        setEmail('');
        setPhone('');
        setRelationship('parent');
        setPreferredContact('email');
        setPreferredLanguage('de');
        setNotes('');
      }
      setConfirmDelete(false);
    }
  }, [open, contact]);

  // Student options from existing contacts (deduplicated)
  const studentOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const c of contacts) {
      if (!map.has(c.studentId)) {
        map.set(c.studentId, {
          id: c.studentId,
          name: `${c.student.firstName} ${c.student.lastName}`,
        });
      }
    }
    return Array.from(map.values());
  }, [contacts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !firstName.trim() || !lastName.trim()) {
      toast.error('Please fill required fields');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        studentId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        relationship,
        preferredContact,
        preferredLanguage,
        notes: notes.trim() || null,
      };
      let saved: ParentContact;
      if (contact) {
        saved = await updateParentContact(contact.id, payload);
      } else {
        saved = await createParentContact(payload);
      }
      onSaved(saved);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to save contact');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!contact) return;
    setSubmitting(true);
    try {
      await deleteParentContact(contact.id);
      onDeleted(contact.id);
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete contact');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <UserCircle2 className="h-5 w-5 text-emerald-500" />
            {contact ? t('parents.new_contact') : t('parents.new_contact')}
          </DialogTitle>
          <DialogDescription>{t('parents.parent_info')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-600 dark:text-gray-400">
                {t('parents.field.student')} *
              </Label>
              <Select
                value={studentId}
                onValueChange={setStudentId}
                disabled={!!contact}
              >
                <SelectTrigger className="bg-white dark:bg-gray-800 border-emerald-200/60 dark:border-emerald-900/30">
                  <SelectValue placeholder={t('parents.field.student')} />
                </SelectTrigger>
                <SelectContent>
                  {studentOptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-600 dark:text-gray-400">
                {t('parents.field.relationship')}
              </Label>
              <Select
                value={relationship}
                onValueChange={(v) => setRelationship(v as 'parent' | 'guardian' | 'emergency')}
              >
                <SelectTrigger className="bg-white dark:bg-gray-800 border-emerald-200/60 dark:border-emerald-900/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="parent">{t('parents.relationship_parent')}</SelectItem>
                  <SelectItem value="guardian">{t('parents.relationship_guardian')}</SelectItem>
                  <SelectItem value="emergency">{t('parents.relationship_emergency')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-600 dark:text-gray-400">
                {t('parents.field.parent')} *
              </Label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                placeholder="Vorname"
                className="bg-white dark:bg-gray-800 border-emerald-200/60 dark:border-emerald-900/30"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-600 dark:text-gray-400"> </Label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                placeholder="Nachname"
                className="bg-white dark:bg-gray-800 border-emerald-200/60 dark:border-emerald-900/30 mt-5 sm:mt-0"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-600 dark:text-gray-400">
                {t('parents.field.email')}
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="eltern@example.com"
                className="bg-white dark:bg-gray-800 border-emerald-200/60 dark:border-emerald-900/30"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-600 dark:text-gray-400">
                {t('parents.field.phone')}
              </Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+49 …"
                className="bg-white dark:bg-gray-800 border-emerald-200/60 dark:border-emerald-900/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-600 dark:text-gray-400">
                {t('parents.field.preferred_contact')}
              </Label>
              <Select
                value={preferredContact}
                onValueChange={(v) => setPreferredContact(v as 'email' | 'phone' | 'both')}
              >
                <SelectTrigger className="bg-white dark:bg-gray-800 border-emerald-200/60 dark:border-emerald-900/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">E-Mail</SelectItem>
                  <SelectItem value="phone">Telefon</SelectItem>
                  <SelectItem value="both">Beide</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-600 dark:text-gray-400">
                {t('parents.field.preferred_language')}
              </Label>
              <Select value={preferredLanguage} onValueChange={setPreferredLanguage}>
                <SelectTrigger className="bg-white dark:bg-gray-800 border-emerald-200/60 dark:border-emerald-900/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="de">Deutsch</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="tr">Türkçe</SelectItem>
                  <SelectItem value="ar">العربية</SelectItem>
                  <SelectItem value="ru">Русский</SelectItem>
                  <SelectItem value="pl">Polski</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-gray-600 dark:text-gray-400">
              {t('parents.field.notes')}
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder={t('parents.field.notes')}
              className="bg-white dark:bg-gray-800 border-emerald-200/60 dark:border-emerald-900/30"
            />
          </div>

          <DialogFooter className="gap-2 flex-wrap sm:flex-nowrap">
            {contact && !confirmDelete ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmDelete(true)}
                disabled={submitting}
                className="border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-300 dark:hover:bg-rose-950/30"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                {t('action.delete')}
              </Button>
            ) : null}
            {contact && confirmDelete ? (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={submitting}
                className="bg-rose-500 hover:bg-rose-600 text-white"
              >
                {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
                {t('parents.delete_confirm')}
              </Button>
            ) : null}
            <div className="flex-1" />
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              {t('action.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
            >
              {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              {t('action.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
