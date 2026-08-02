// @ts-nocheck
'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, GraduationCap, Brain, FlaskConical, Globe, Music, History,
  Zap, Heart, Search, ChevronRight, ChevronLeft, Plus, Edit, Trash2,
  Check, X, Eye, Play, ArrowLeft, Award, Calculator, Code, TrendingUp,
  Palette, Dumbbell, Map, Settings, FileText, MessageSquare, Shield,
  Loader2, Sparkles, RefreshCw, Filter, ToggleLeft, ToggleRight, Send,
  AlertTriangle, CheckCircle2, Clock, XCircle, ChevronDown, Info,
  PartyPopper, Trophy, RotateCcw,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { toast } from 'sonner';

/* ── Types ─────────────────────────────────────────────────────────── */

interface PracticeQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface SubjectCategory {
  id: string;
  schoolId: string;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  sortOrder: number;
  isActive: boolean;
  _count?: { contents: number };
}

interface SubjectContentItem {
  id: string;
  schoolId: string;
  categoryId: string;
  subjectId?: string | null;
  parentId?: string | null;
  title: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  contentType: string;
  content?: string | null;
  difficulty: string;
  questionCount: number;
  sortOrder: number;
  isActive: boolean;
  isPublic: boolean;
  sourceUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  category?: { id: string; name: string; slug: string };
  subject?: { id: string; name: string } | null;
  parent?: { id: string; title: string; slug: string } | null;
  children?: SubjectContentItem[];
  _count?: { children: number };
}

interface ChangeRequest {
  id: string;
  schoolId: string;
  contentId: string;
  requestedBy: string;
  requestType: string;
  title: string;
  description: string;
  proposedChanges?: string | null;
  status: string;
  reviewedBy?: string | null;
  reviewNote?: string | null;
  createdAt: string;
  updatedAt: string;
  content?: { id: string; title: string; contentType: string };
  requester?: { id: string; firstName: string; lastName: string };
  reviewer?: { id: string; firstName: string; lastName: string } | null;
}

interface AISettingsData {
  id: string;
  schoolId: string;
  pollinationEnabled: boolean;
  pollinationApiKey?: string | null;
  pollinationModel: string;
  openaiEnabled: boolean;
  openaiApiKey?: string | null;
  openaiModel: string;
  anthropicEnabled: boolean;
  anthropicApiKey?: string | null;
  anthropicModel: string;
  aiChatEnabled: boolean;
  aiImageGenEnabled: boolean;
  aiVideoGenEnabled: boolean;
  aiAutoTestEnabled: boolean;
  aiGradingAuditEnabled: boolean;
  aiTopicGenEnabled: boolean;
  virtualCharacterEnabled: boolean;
  aiMaxRequestsPerDay: number;
  aiHelperMode: string;
  aiSystemPrompt?: string | null;
}

/* ── Icon mapping ──────────────────────────────────────────────────── */

const ICON_MAP: Record<string, React.ElementType> = {
  Calculator, BookOpen, Globe, FlaskConical, Map, Music, History, Zap,
  Heart, GraduationCap, Award, Code, TrendingUp, Palette, Dumbbell, Shield,
  Brain, Settings, FileText, MessageSquare,
};

function getIcon(name?: string | null): React.ElementType {
  if (!name) return BookOpen;
  return ICON_MAP[name] || BookOpen;
}

/* ── Category colors ───────────────────────────────────────────────── */

const CATEGORY_COLORS = [
  'from-emerald-500 to-teal-500',
  'from-teal-500 to-cyan-500',
  'from-cyan-500 to-sky-500',
  'from-amber-500 to-orange-500',
  'from-orange-500 to-red-500',
  'from-violet-500 to-purple-500',
  'from-rose-500 to-pink-500',
];

/* ── Difficulty badge ──────────────────────────────────────────────── */

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const colors: Record<string, string> = {
    easy: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    hard: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  };
  return (
    <Badge variant="secondary" className={colors[difficulty] || colors.medium}>
      {t(`subjects.${difficulty}`)}
    </Badge>
  );
}

/* ── Status badge ──────────────────────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; icon: React.ElementType }> = {
    pending: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', icon: Clock },
    approved: { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', icon: CheckCircle2 },
    rejected: { color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300', icon: XCircle },
  };
  const c = config[status] || config.pending;
  const Icon = c.icon;
  return (
    <Badge variant="secondary" className={`${c.color} gap-1`}>
      <Icon className="h-3 w-3" />
      {t(`subjects.${status}`)}
    </Badge>
  );
}

/* ── Main Component ────────────────────────────────────────────────── */

export default function SubjectsView() {
  const currentUser = useAppStore((s) => s.currentUser);
  const role = currentUser?.role || 'STUDENT';
  const schoolId = currentUser?.schoolId;
  const isAdmin = role === 'SCHOOL_ADMIN' || role === 'VICE_PRINCIPAL' || role === 'SUPER_ADMIN';
  const isTeacher = role === 'TEACHER';
  const isStudent = role === 'STUDENT';

  // Data state
  const [categories, setCategories] = useState<SubjectCategory[]>([]);
  const [contents, setContents] = useState<SubjectContentItem[]>([]);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [aiSettings, setAiSettings] = useState<AISettingsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Navigation state
  const [selectedCategory, setSelectedCategory] = useState<SubjectCategory | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<SubjectContentItem | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<SubjectContentItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SubjectContentItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Practice state
  const [isPracticing, setIsPracticing] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [practiceScore, setPracticeScore] = useState(0);
  const [practiceComplete, setPracticeComplete] = useState(false);
  const [practiceQuestions, setPracticeQuestions] = useState<PracticeQuestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [answerHistory, setAnswerHistory] = useState<Array<{ questionIndex: number; selectedAnswer: number; isCorrect: boolean }>>([]);
  const [showConfetti, setShowConfetti] = useState(false);

  // Dialog state
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showContentDialog, setShowContentDialog] = useState(false);
  const [showChangeRequestDialog, setShowChangeRequestDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<SubjectCategory | null>(null);
  const [editingContent, setEditingContent] = useState<SubjectContentItem | null>(null);
  const [changeRequestTarget, setChangeRequestTarget] = useState<SubjectContentItem | null>(null);

  // Form state
  const [categoryForm, setCategoryForm] = useState({ name: '', slug: '', description: '', icon: 'GraduationCap', sortOrder: 0 });
  const [contentForm, setContentForm] = useState({ title: '', slug: '', description: '', icon: 'BookOpen', contentType: 'topic', difficulty: 'medium', isActive: true, isPublic: true });
  const [changeRequestForm, setChangeRequestForm] = useState({ requestType: 'edit' as const, title: '', description: '', proposedChanges: '' });

  // Crawl state
  const [showCrawlDialog, setShowCrawlDialog] = useState(false);
  const [crawlUrl, setCrawlUrl] = useState('');
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlResult, setCrawlResult] = useState<{ topicsFound: number; contentsCreated: number } | null>(null);

  /* ── Data loading ───────────────────────────────────────────────── */

  const loadCategories = useCallback(async () => {
    if (!schoolId) return;
    try {
      const data = await apiGet<SubjectCategory[]>(`/api/subject-categories?schoolId=${schoolId}&includeInactive=${isAdmin}`);
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }, [schoolId, isAdmin]);

  const loadContents = useCallback(async (categoryId: string) => {
    if (!schoolId) return;
    try {
      const data = await apiGet<SubjectContentItem[]>(`/api/subject-contents?schoolId=${schoolId}&categoryId=${categoryId}`);
      setContents(data);
    } catch (err) {
      console.error('Failed to load contents:', err);
    }
  }, [schoolId]);

  const loadChangeRequests = useCallback(async () => {
    if (!schoolId) return;
    try {
      const data = await apiGet<ChangeRequest[]>(`/api/content-change-requests?schoolId=${schoolId}`);
      setChangeRequests(data);
    } catch (err) {
      console.error('Failed to load change requests:', err);
    }
  }, [schoolId]);

  const loadAISettings = useCallback(async () => {
    if (!schoolId) return;
    try {
      const data = await apiGet<AISettingsData>(`/api/ai-settings?schoolId=${schoolId}`);
      setAiSettings(data);
    } catch (err) {
      console.error('Failed to load AI settings:', err);
    }
  }, [schoolId]);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      await loadCategories();
      setIsLoading(false);
    }
    load();
  }, [loadCategories]);

  useEffect(() => {
    if (selectedCategory) {
      loadContents(selectedCategory.id);
    }
  }, [selectedCategory, loadContents]);

  useEffect(() => {
    if (isAdmin || isTeacher) {
      loadChangeRequests();
    }
  }, [isAdmin, isTeacher, loadChangeRequests]);

  /* ── Search ──────────────────────────────────────────────────────── */

  useEffect(() => {
    if (!searchQuery.trim() || !schoolId) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await apiGet<SubjectContentItem[]>(`/api/subject-contents?schoolId=${schoolId}&isActive=true`);
        const q = searchQuery.toLowerCase();
        const filtered = data.filter(
          (c) => c.title.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q)
        );
        setSearchResults(filtered.slice(0, 20));
      } catch {
        setSearchResults([]);
      }
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, schoolId]);

  /* ── Computed data ───────────────────────────────────────────────── */

  const topLevelContents = useMemo(() => {
    return contents.filter((c) => !c.parentId).sort((a, b) => a.sortOrder - b.sortOrder);
  }, [contents]);

  const childContents = useMemo(() => {
    if (!selectedSubject) return [];
    return contents
      .filter((c) => c.parentId === selectedSubject.id)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [contents, selectedSubject]);

  /* ── Handlers ────────────────────────────────────────────────────── */

  const handleCategoryClick = (category: SubjectCategory) => {
    setSelectedCategory(category);
    setSelectedSubject(null);
    setSelectedTopic(null);
    setIsPracticing(false);
  };

  const handleSubjectClick = (subject: SubjectContentItem) => {
    setSelectedSubject(subject);
    setSelectedTopic(null);
    setIsPracticing(false);
  };

  const handleTopicClick = (topic: SubjectContentItem) => {
    setSelectedTopic(topic);
    setIsPracticing(false);
    setPracticeQuestions([]);
    setAnswerHistory([]);
  };

  const handleBack = () => {
    if (isPracticing) {
      setIsPracticing(false);
      return;
    }
    if (selectedTopic) {
      setSelectedTopic(null);
      return;
    }
    if (selectedSubject) {
      setSelectedSubject(null);
      return;
    }
    if (selectedCategory) {
      setSelectedCategory(null);
      setContents([]);
      return;
    }
  };

  const handleStartPractice = async () => {
    if (!selectedTopic) return;
    setIsGenerating(true);

    try {
      // First try to load existing questions
      const data = await apiGet<{ questions: PracticeQuestion[]; questionCount: number }>(
        `/api/subject-contents/exercises?contentId=${selectedTopic.id}`
      );

      if (data.questions && data.questions.length > 0) {
        setPracticeQuestions(data.questions);
        setIsPracticing(true);
        setCurrentQuestion(0);
        setPracticeScore(0);
        setSelectedAnswer(null);
        setShowResult(false);
        setPracticeComplete(false);
        setAnswerHistory([]);
        setShowConfetti(false);
      } else {
        // No existing questions, generate new ones
        await handleGenerateQuestions();
      }
    } catch {
      // Fallback: try to generate
      await handleGenerateQuestions();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateQuestions = async () => {
    if (!selectedTopic) return;
    setIsGenerating(true);

    try {
      const data = await apiPost<{
        questions: PracticeQuestion[];
        requestsToday: number;
        maxRequests: number;
      }>('/api/subject-contents/exercises', {
        contentId: selectedTopic.id,
        topic: selectedTopic.title,
        count: 5,
        difficulty: selectedTopic.difficulty || 'medium',
      });

      if (data.questions && data.questions.length > 0) {
        setPracticeQuestions(data.questions);
        setIsPracticing(true);
        setCurrentQuestion(0);
        setPracticeScore(0);
        setSelectedAnswer(null);
        setShowResult(false);
        setPracticeComplete(false);
        setAnswerHistory([]);
        setShowConfetti(false);
        toast.success(t('practice.xp_earned', { xp: '10' }));
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      if (error.message?.includes('429') || error.message?.includes('limit')) {
        toast.error(t('practice.rate_limit_reached'));
      } else {
        toast.error(t('practice.generation_error'));
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnswer = (answerIndex: number) => {
    if (showResult || !practiceQuestions[currentQuestion]) return;
    setSelectedAnswer(answerIndex);
    setShowResult(true);

    const isCorrect = answerIndex === practiceQuestions[currentQuestion].correctAnswer;
    if (isCorrect) {
      setPracticeScore((s) => s + 1);
    }
    setAnswerHistory((prev) => [
      ...prev,
      { questionIndex: currentQuestion, selectedAnswer: answerIndex, isCorrect },
    ]);
  };

  const handleNextQuestion = () => {
    if (currentQuestion + 1 >= practiceQuestions.length) {
      setPracticeComplete(true);
      const pct = Math.round(((practiceScore + (selectedAnswer === practiceQuestions[currentQuestion]?.correctAnswer ? 0 : 0)) / practiceQuestions.length) * 100);
      if (pct >= 80) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 4000);
      }
    } else {
      setCurrentQuestion((q) => q + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    }
  };

  const handleRetryIncorrect = () => {
    const incorrectQuestions = answerHistory
      .filter((h) => !h.isCorrect)
      .map((h) => practiceQuestions[h.questionIndex]);

    if (incorrectQuestions.length === 0) {
      handleStartPractice();
      return;
    }

    setPracticeQuestions(incorrectQuestions);
    setIsPracticing(true);
    setCurrentQuestion(0);
    setPracticeScore(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setPracticeComplete(false);
    setAnswerHistory([]);
    setShowConfetti(false);
  };

  const handleSeedData = async () => {
    try {
      const result = await apiPost<{ success: boolean; message: string }>('/api/subject-seed');
      if (result.success) {
        toast.success(result.message);
        await loadCategories();
        if (selectedCategory) {
          await loadContents(selectedCategory.id);
        }
      }
    } catch (err) {
      toast.error('Failed to seed data');
    }
  };

  const handleSaveCategory = async () => {
    try {
      if (editingCategory) {
        await apiPut(`/api/subject-categories/${editingCategory.id}`, categoryForm);
        toast.success(t('action.save'));
      } else {
        await apiPost('/api/subject-categories', { ...categoryForm, schoolId });
        toast.success(t('action.create'));
      }
      setShowCategoryDialog(false);
      setEditingCategory(null);
      setCategoryForm({ name: '', slug: '', description: '', icon: 'GraduationCap', sortOrder: 0 });
      await loadCategories();
    } catch (err) {
      toast.error('Failed to save category');
    }
  };

  const handleSaveContent = async () => {
    if (!selectedCategory) return;
    try {
      if (editingContent) {
        await apiPut(`/api/subject-contents/${editingContent.id}`, contentForm);
        toast.success(t('action.save'));
      } else {
        await apiPost('/api/subject-contents', {
          ...contentForm,
          schoolId,
          categoryId: selectedCategory.id,
          parentId: selectedSubject?.id || null,
        });
        toast.success(t('action.create'));
      }
      setShowContentDialog(false);
      setEditingContent(null);
      setContentForm({ title: '', slug: '', description: '', icon: 'BookOpen', contentType: 'topic', difficulty: 'medium', isActive: true, isPublic: true });
      await loadContents(selectedCategory.id);
    } catch (err) {
      toast.error('Failed to save content');
    }
  };

  const handleToggleActive = async (item: SubjectContentItem, type: 'content' | 'category') => {
    try {
      const endpoint = type === 'content' ? '/api/subject-contents' : '/api/subject-categories';
      await apiPut(`${endpoint}/${item.id}`, { isActive: !item.isActive });
      toast.success(item.isActive ? t('subjects.deactivate') : t('subjects.activate'));
      if (type === 'content' && selectedCategory) {
        await loadContents(selectedCategory.id);
      } else {
        await loadCategories();
      }
    } catch (err) {
      toast.error('Failed to toggle status');
    }
  };

  const handleDeleteContent = async (id: string) => {
    try {
      await apiDelete(`/api/subject-contents/${id}`);
      toast.success(t('action.delete'));
      if (selectedCategory) {
        await loadContents(selectedCategory.id);
      }
    } catch (err) {
      toast.error('Failed to delete content');
    }
  };

  const handleSubmitChangeRequest = async () => {
    if (!changeRequestTarget) return;
    try {
      await apiPost('/api/content-change-requests', {
        ...changeRequestForm,
        schoolId,
        contentId: changeRequestTarget.id,
      });
      toast.success(t('subjects.request_change'));
      setShowChangeRequestDialog(false);
      setChangeRequestTarget(null);
      setChangeRequestForm({ requestType: 'edit', title: '', description: '', proposedChanges: '' });
      await loadChangeRequests();
    } catch (err) {
      toast.error('Failed to submit change request');
    }
  };

  const handleReviewChangeRequest = async (id: string, status: 'approved' | 'rejected', reviewNote?: string) => {
    try {
      await apiPut(`/api/content-change-requests/${id}`, { status, reviewNote });
      toast.success(status === 'approved' ? t('subjects.approve') : t('subjects.reject'));
      await loadChangeRequests();
    } catch (err) {
      toast.error('Failed to review request');
    }
  };

  const handleSaveAISettings = async () => {
    if (!aiSettings) return;
    try {
      await apiPut('/api/ai-settings', { ...aiSettings, schoolId });
      toast.success(t('action.save'));
      await loadAISettings();
    } catch (err) {
      toast.error('Failed to save AI settings');
    }
  };

  /* ── Render: Loading ─────────────────────────────────────────────── */

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 animate-pulse" />
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="rounded-xl border bg-card overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 animate-pulse" />
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="h-5 w-14 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                  <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Render: Category Grid (Landing) ─────────────────────────────── */

  const renderCategoryGrid = () => (
    <div className="space-y-6">
      {/* Gradient Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-6 md:p-8"
      >
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvc3ZnPg==')] opacity-50" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              {t('subjects.browse')}
            </h1>
            <p className="text-emerald-100 mt-2 text-sm md:text-base">
              {t('subjects.select_category')}
            </p>
          </div>
        <div className="relative z-10 flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
            <Input
              placeholder={t('subjects.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64 bg-white/20 border-white/30 text-white placeholder:text-white/60 focus:bg-white/30 focus:border-white/50"
            />
          </div>
          {isAdmin && (
            <Button onClick={handleSeedData} variant="outline" size="sm" className="gap-1 bg-white/20 border-white/30 text-white hover:bg-white/30 hover:text-white">
              <Sparkles className="h-4 w-4" />
              {t('subjects.seed_data')}
            </Button>
          )}
          {isAdmin && (
            <Button onClick={() => setShowCrawlDialog(true)} variant="outline" size="sm" className="gap-1 bg-white/20 border-white/30 text-white hover:bg-white/30 hover:text-white">
              <Globe className="h-4 w-4" />
              {t('subjects.crawl')}
            </Button>
          )}
        </div>
      </div>
      </motion.div>

      {/* Search results */}
      {searchQuery.trim() && (
        <Card className="border-emerald-200 dark:border-emerald-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{t('subjects.search_results')} ({searchResults.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isSearching ? (
              <div className="flex items-center gap-2 py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-gray-500">Searching...</span>
              </div>
            ) : searchResults.length === 0 ? (
              <p className="text-gray-500 py-4">{t('subjects.no_results')}</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {searchResults.map((item) => {
                  const Icon = getIcon(item.icon);
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (item.categoryId) {
                          const cat = categories.find((c) => c.id === item.categoryId);
                          if (cat) setSelectedCategory(cat);
                        }
                        if (!item.parentId) {
                          setSelectedSubject(item);
                        } else {
                          setSelectedTopic(item);
                        }
                        setSearchQuery('');
                      }}
                      className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                    >
                      <Icon className="h-5 w-5 text-emerald-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.title}</p>
                        {item.category && (
                          <p className="text-xs text-gray-500">{item.category.name}</p>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-xs shrink-0">{item.contentType}</Badge>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!searchQuery.trim() && (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.05 } },
          }}
        >
          {categories.map((category, idx) => {
            const gradient = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
            const contentCount = category._count?.contents || 0;
            return (
              <motion.div
                key={category.id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card
                  className={`cursor-pointer overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow ${
                    !category.isActive ? 'opacity-50' : ''
                  }`}
                  onClick={() => category.isActive && handleCategoryClick(category)}
                >
                  <div className={`h-2 bg-gradient-to-r ${gradient}`} />
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${gradient} text-white`}>
                          <GraduationCap className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            {category.name}
                          </h3>
                          {category.description && (
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                              {category.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400 mt-1" />
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {contentCount} {t('subjects.topics')}
                      </Badge>
                      {!category.isActive && (
                        <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-500">
                          {t('subjects.content_inactive')}
                        </Badge>
                      )}
                    </div>
                    {isAdmin && (
                      <div className="mt-2 flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            setEditingCategory(category);
                            setCategoryForm({
                              name: category.name,
                              slug: category.slug,
                              description: category.description || '',
                              icon: category.icon || 'GraduationCap',
                              sortOrder: category.sortOrder,
                            });
                            setShowCategoryDialog(true);
                          }}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleToggleActive(category, 'category')}
                        >
                          {category.isActive ? (
                            <ToggleRight className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <ToggleLeft className="h-3.5 w-3.5 text-gray-400" />
                          )}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}

          {/* Add category card (admin only) */}
          {isAdmin && (
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
              whileHover={{ scale: 1.02 }}
            >
              <Card
                className="cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-emerald-400 transition-colors h-full"
                onClick={() => {
                  setEditingCategory(null);
                  setCategoryForm({ name: '', slug: '', description: '', icon: 'GraduationCap', sortOrder: 0 });
                  setShowCategoryDialog(true);
                }}
              >
                <CardContent className="p-5 flex flex-col items-center justify-center h-full min-h-[140px]">
                  <Plus className="h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">{t('subjects.create_category')}</p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );

  /* ── Render: Subject Grid ────────────────────────────────────────── */

  const renderSubjectGrid = () => {
    if (!selectedCategory) return null;
    return (
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <motion.button
            onClick={handleBack}
            className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
            whileHover={{ x: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <ArrowLeft className="h-4 w-4" />
            {t('subjects.back_to_categories')}
          </motion.button>
          <ChevronRight className="h-4 w-4 text-gray-400" />
          <span className="font-medium text-gray-900 dark:text-gray-100">{selectedCategory.name}</span>
        </div>

        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {selectedCategory.name}
        </h2>

        {topLevelContents.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                <div className="h-20 w-20 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="h-10 w-10 text-emerald-300 dark:text-emerald-600" />
                </div>
              </motion.div>
              <p className="text-gray-500 text-lg font-medium">{t('subjects.no_content')}</p>
              <p className="text-gray-400 text-sm mt-1">{t('subjects.select_category')}</p>
              {isAdmin && (
                <Button className="mt-4" onClick={() => {
                  setEditingContent(null);
                  setContentForm({ title: '', slug: '', description: '', icon: 'BookOpen', contentType: 'topic', difficulty: 'medium', isActive: true, isPublic: true });
                  setShowContentDialog(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('subjects.create_content')}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.04 } },
            }}
          >
            {topLevelContents.map((subject) => {
              const Icon = getIcon(subject.icon);
              const childCount = subject._count?.children || 0;
              return (
                <motion.div
                  key={subject.id}
                  variants={{
                    hidden: { opacity: 0, scale: 0.95 },
                    visible: { opacity: 1, scale: 1 },
                  }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card
                    className={`cursor-pointer overflow-hidden hover:shadow-lg transition-shadow ${
                      !subject.isActive ? 'opacity-50' : ''
                    }`}
                    onClick={() => subject.isActive && handleSubjectClick(subject)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {subject.title}
                          </h3>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs">
                          {childCount} {t('subjects.topics')}
                        </Badge>
                        <DifficultyBadge difficulty={subject.difficulty} />
                        {subject.questionCount > 0 && (
                          <Badge variant="outline" className="text-xs border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400">
                            <FileText className="h-3 w-3 mr-1" />
                            {subject.questionCount}
                          </Badge>
                        )}
                      </div>
                      {/* Animated progress bar */}
                      {childCount > 0 && (
                        <div className="mt-3">
                          <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, childCount * 20)}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                            />
                          </div>
                        </div>
                      )}
                      {isAdmin && (
                        <div className="mt-3 flex gap-1 border-t pt-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => {
                              setEditingContent(subject);
                              setContentForm({
                                title: subject.title,
                                slug: subject.slug,
                                description: subject.description || '',
                                icon: subject.icon || 'BookOpen',
                                contentType: subject.contentType,
                                difficulty: subject.difficulty,
                                isActive: subject.isActive,
                                isPublic: subject.isPublic,
                              });
                              setShowContentDialog(true);
                            }}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => handleToggleActive(subject, 'content')}
                          >
                            {subject.isActive ? (
                              <ToggleRight className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <ToggleLeft className="h-3.5 w-3.5 text-gray-400" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-rose-500"
                            onClick={() => handleDeleteContent(subject.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}

            {/* Add content card (admin/teacher) */}
            {(isAdmin || isTeacher) && (
              <motion.div
                variants={{
                  hidden: { opacity: 0, scale: 0.95 },
                  visible: { opacity: 1, scale: 1 },
                }}
                whileHover={{ scale: 1.02 }}
              >
                <Card
                  className="cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-emerald-400 transition-colors h-full"
                  onClick={() => {
                    setEditingContent(null);
                    setContentForm({ title: '', slug: '', description: '', icon: 'BookOpen', contentType: 'topic', difficulty: 'medium', isActive: true, isPublic: true });
                    setShowContentDialog(true);
                  }}
                >
                  <CardContent className="p-5 flex flex-col items-center justify-center h-full min-h-[140px]">
                    <Plus className="h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">{t('subjects.create_content')}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    );
  };

  /* ── Render: Topic List ──────────────────────────────────────────── */

  const renderTopicList = () => {
    if (!selectedSubject) return null;
    return (
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <motion.button
            onClick={handleBack}
            className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
            whileHover={{ x: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <ArrowLeft className="h-4 w-4" />
            {t('subjects.back_to_subject')}
          </motion.button>
          <ChevronRight className="h-4 w-4 text-gray-400" />
          <span className="font-medium text-gray-900 dark:text-gray-100">{selectedSubject.title}</span>
        </div>

        {/* Subject header */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200/50 dark:border-emerald-800/30">
          <div className="p-3 rounded-xl bg-white dark:bg-gray-800 shadow-sm text-emerald-600">
            {React.createElement(getIcon(selectedSubject.icon), { className: 'h-6 w-6' })}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{selectedSubject.title}</h2>
            {selectedSubject.description && (
              <p className="text-sm text-gray-500">{selectedSubject.description}</p>
            )}
          </div>
        </div>

        {/* Topics list */}
        {childContents.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">{t('subjects.no_content')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {childContents.map((topic) => {
              const Icon = getIcon(topic.icon);
              return (
                <motion.div
                  key={topic.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileHover={{ x: 4 }}
                  className="flex items-center gap-3"
                >
                  <Card
                    className={`flex-1 cursor-pointer hover:shadow-md transition-shadow ${
                      !topic.isActive ? 'opacity-50' : ''
                    }`}
                    onClick={() => topic.isActive && handleTopicClick(topic)}
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <Icon className="h-5 w-5 text-emerald-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100">{topic.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {topic.questionCount} {t('subjects.question_count')}
                          </Badge>
                          <DifficultyBadge difficulty={topic.difficulty} />
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400 shrink-0" />
                    </CardContent>
                  </Card>
                  {isAdmin && (
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => handleToggleActive(topic, 'content')}
                      >
                        {topic.isActive ? (
                          <ToggleRight className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <ToggleLeft className="h-3.5 w-3.5 text-gray-400" />
                        )}
                      </Button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  /* ── Render: Topic Detail / Practice ─────────────────────────────── */

  const renderTopicDetail = () => {
    if (!selectedTopic) return null;

    if (isPracticing) {
      return renderPractice();
    }

    if (isGenerating) {
      return (
        <div className="max-w-md mx-auto space-y-6">
          <Card className="border-0 shadow-xl overflow-hidden">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                className="inline-block"
              >
                <Sparkles className="h-12 w-12 text-white" />
              </motion.div>
              <h2 className="text-xl font-bold text-white mt-4">
                {t('practice.generating')}
              </h2>
              <p className="text-emerald-100 mt-2 text-sm">
                {t('practice.generate_questions')}
              </p>
            </div>
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                <span className="text-sm text-gray-500">{t('practice.generating')}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <motion.button
            onClick={handleBack}
            className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
            whileHover={{ x: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <ArrowLeft className="h-4 w-4" />
            {t('subjects.back_to_subject')}
          </motion.button>
          <ChevronRight className="h-4 w-4 text-gray-400" />
          <span className="text-gray-500">{selectedSubject?.title}</span>
          <ChevronRight className="h-4 w-4 text-gray-400" />
          <span className="font-medium text-gray-900 dark:text-gray-100">{selectedTopic.title}</span>
        </div>

        {/* Topic header with gradient banner */}
        <Card className="border-0 overflow-hidden shadow-lg">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">{selectedTopic.title}</h2>
                {selectedTopic.description && (
                  <p className="text-emerald-100 mt-1">{selectedTopic.description}</p>
                )}
                <div className="flex items-center gap-2 mt-3">
                  <DifficultyBadge difficulty={selectedTopic.difficulty} />
                  {selectedTopic.questionCount > 0 && (
                    <Badge className="text-xs bg-white/20 text-white border-0 hover:bg-white/30">
                      {selectedTopic.questionCount} {t('subjects.question_count')}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={handleStartPractice} className="gap-1 bg-white text-emerald-700 hover:bg-emerald-50 shadow-md">
                  <Play className="h-4 w-4" />
                  {t('practice.start')}
                </Button>
                <Button onClick={handleGenerateQuestions} variant="outline" className="gap-1 bg-white/20 border-white/30 text-white hover:bg-white/30 hover:text-white">
                  <Sparkles className="h-4 w-4" />
                  {t('practice.generate_questions')}
                </Button>
                {isTeacher && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 bg-white/20 border-white/30 text-white hover:bg-white/30 hover:text-white"
                    onClick={() => {
                      setChangeRequestTarget(selectedTopic);
                      setChangeRequestForm({ requestType: 'edit', title: '', description: '', proposedChanges: '' });
                      setShowChangeRequestDialog(true);
                    }}
                  >
                    <MessageSquare className="h-4 w-4" />
                    {t('subjects.request_change')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Subtopics if any */}
        {selectedTopic.children && selectedTopic.children.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              {t('subjects.subtopics')}
            </h3>
            <div className="space-y-2">
              {selectedTopic.children.map((child) => (
                <Card key={child.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-3">
                    <BookOpen className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-medium">{child.title}</span>
                    <Badge variant="secondary" className="text-xs ml-auto">
                      {child.questionCount} {t('subjects.question_count')}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  /* ── Confetti Particle ───────────────────────────────────────────── */

  function ConfettiParticle({ delay, color }: { delay: number; color: string }) {
    return (
      <motion.div
        className="absolute w-3 h-3 rounded-sm"
        style={{ backgroundColor: color, left: `${Math.random() * 100}%`, top: '-10px' }}
        initial={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
        animate={{
          opacity: [1, 1, 0],
          y: [0, window?.innerHeight || 600],
          rotate: [0, Math.random() * 720 - 360],
          scale: [1, 0.8, 0.3],
          x: [0, (Math.random() - 0.5) * 200],
        }}
        transition={{ duration: 2.5, delay, ease: 'easeOut' }}
      />
    );
  }

  /* ── Render: Practice Mode ───────────────────────────────────────── */

  const renderPractice = () => {
    if (!selectedTopic) return null;
    const totalQ = practiceQuestions.length;

    if (totalQ === 0) {
      return (
        <div className="max-w-md mx-auto space-y-6">
          <Card className="border-0 shadow-xl overflow-hidden">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-center">
              <FileText className="h-16 w-16 text-white/80 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">
                {t('practice.no_questions')}
              </h2>
              <p className="text-emerald-100 text-sm">
                {t('practice.no_questions_desc')}
              </p>
            </div>
            <CardContent className="p-6 text-center space-y-3">
              <Button onClick={handleGenerateQuestions} className="w-full gap-1 bg-emerald-600 hover:bg-emerald-700">
                <Sparkles className="h-4 w-4" />
                {t('practice.generate_questions')}
              </Button>
              <Button onClick={handleBack} variant="outline" className="w-full gap-1">
                <ArrowLeft className="h-4 w-4" />
                {t('subjects.back_to_subject')}
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (practiceComplete) {
      const pct = Math.round((practiceScore / totalQ) * 100);
      const incorrectCount = totalQ - practiceScore;
      const scoreMessage = pct === 100
        ? t('practice.perfect_score')
        : pct >= 80
        ? t('practice.great_score')
        : pct >= 50
        ? t('practice.good_score')
        : t('practice.needs_practice');

      return (
        <div className="max-w-lg mx-auto space-y-6">
          {/* Confetti overlay */}
          <AnimatePresence>
            {showConfetti && (
              <motion.div
                className="fixed inset-0 pointer-events-none z-50 overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {Array.from({ length: 40 }).map((_, i) => (
                  <ConfettiParticle
                    key={i}
                    delay={Math.random() * 0.8}
                    color={['#10b981', '#fbbf24', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899'][i % 6]}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <Card className="border-0 shadow-xl overflow-hidden">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-center relative">
              {pct >= 80 && (
                <motion.div
                  className="absolute top-2 right-4"
                  animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <PartyPopper className="h-8 w-8 text-yellow-300" />
                </motion.div>
              )}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', duration: 0.8, stiffness: 200 }}
              >
                {pct >= 80 ? (
                  <Trophy className="h-20 w-20 text-yellow-300 mx-auto mb-4 drop-shadow-lg" />
                ) : (
                  <Award className="h-20 w-20 text-white mx-auto mb-4 drop-shadow-lg" />
                )}
              </motion.div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {t('practice.results')}
              </h2>
              <p className="text-emerald-100 text-lg">
                {practiceScore}/{totalQ} ({pct}%)
              </p>
              <motion.p
                className="text-white font-semibold mt-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                {scoreMessage}
              </motion.p>
            </div>
            <CardContent className="p-6">
              {/* Circular progress */}
              <div className="relative w-32 h-32 mx-auto mb-6">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" className="text-gray-200 dark:text-gray-700" strokeWidth="8" />
                  <motion.circle
                    cx="50" cy="50" r="40" fill="none"
                    stroke={pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 40 * (1 - pct / 100) }}
                    transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.span
                    className="text-3xl font-bold"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.5 }}
                  >
                    {pct}%
                  </motion.span>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="text-center p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                  <p className="text-2xl font-bold text-emerald-600">{practiceScore}</p>
                  <p className="text-xs text-gray-500">{t('practice.correct_answers')}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-rose-50 dark:bg-rose-900/20">
                  <p className="text-2xl font-bold text-rose-600">{incorrectCount}</p>
                  <p className="text-xs text-gray-500">{t('practice.incorrect_answers')}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                  <p className="text-2xl font-bold text-amber-600">{pct}%</p>
                  <p className="text-xs text-gray-500">{t('practice.percentage')}</p>
                </div>
              </div>

              {/* Detailed breakdown */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Info className="h-4 w-4 text-emerald-600" />
                  {t('practice.detailed_breakdown')}
                </h3>
                <ScrollArea className="max-h-64">
                  <div className="space-y-2">
                    {answerHistory.map((entry, idx) => {
                      const q = practiceQuestions[entry.questionIndex];
                      if (!q) return null;
                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg border text-sm ${
                            entry.isCorrect
                              ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-900/10'
                              : 'border-rose-200 bg-rose-50/50 dark:border-rose-800 dark:bg-rose-900/10'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {entry.isCorrect ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                            ) : (
                              <XCircle className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                {q.question}
                              </p>
                              {!entry.isCorrect && (
                                <div className="mt-1 text-xs space-y-0.5">
                                  <p className="text-rose-600 dark:text-rose-400">
                                    {t('practice.your_answer')}: {q.options[entry.selectedAnswer]}
                                  </p>
                                  <p className="text-emerald-600 dark:text-emerald-400">
                                    {t('practice.correct_answer')}: {q.options[q.correctAnswer]}
                                  </p>
                                </div>
                              )}
                              {q.explanation && (
                                <p className="text-xs text-gray-500 mt-1">{q.explanation}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-2">
                <Button onClick={handleStartPractice} className="gap-1 bg-emerald-600 hover:bg-emerald-700">
                  <RefreshCw className="h-4 w-4" />
                  {t('practice.retry')}
                </Button>
                {incorrectCount > 0 && (
                  <Button onClick={handleRetryIncorrect} variant="outline" className="gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/20">
                    <RotateCcw className="h-4 w-4" />
                    {t('practice.retry_incorrect')} ({incorrectCount})
                  </Button>
                )}
                <Button onClick={handleBack} variant="ghost" className="gap-1">
                  <ArrowLeft className="h-4 w-4" />
                  {t('subjects.back_to_subject')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    const currentQ = practiceQuestions[currentQuestion];
    if (!currentQ) return null;

    const optionLabels = ['A', 'B', 'C', 'D'];

    return (
      <div className="max-w-md mx-auto space-y-6">
        {/* Progress */}
        <div className="flex items-center gap-3">
          <motion.button onClick={handleBack} className="text-emerald-600 hover:text-emerald-700" whileHover={{ x: -2 }} whileTap={{ scale: 0.95 }}>
            <ArrowLeft className="h-5 w-5" />
          </motion.button>
          <div className="flex-1">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-500">
                {t('subjects.question_of', { current: String(currentQuestion + 1), total: String(totalQ) })}
              </span>
              <span className="font-medium text-emerald-600">{practiceScore}/{currentQuestion}</span>
            </div>
            <div className="relative h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${((currentQuestion + 1) / totalQ) * 100}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
            {/* Question navigation dots */}
            <div className="flex items-center gap-1 mt-2 justify-center">
              {practiceQuestions.map((_, i) => {
                const historyEntry = answerHistory.find((h) => h.questionIndex === i);
                return (
                  <motion.div
                    key={i}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === currentQuestion
                        ? 'w-6 bg-emerald-500'
                        : historyEntry
                        ? historyEntry.isCorrect
                          ? 'w-2 bg-emerald-400'
                          : 'w-2 bg-rose-400'
                        : 'w-2 bg-gray-300 dark:bg-gray-600'
                    }`}
                    layout
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Question card */}
        <Card className="border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {t('practice.question')} {currentQuestion + 1}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {currentQ.question}
            </p>

            <div className="space-y-3">
              {currentQ.options.map((option, idx) => {
                const isSelected = selectedAnswer === idx;
                const isCorrect = showResult && idx === currentQ.correctAnswer;
                const isWrong = showResult && isSelected && idx !== currentQ.correctAnswer;
                return (
                  <motion.button
                    key={idx}
                    onClick={() => !showResult && handleAnswer(idx)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      isCorrect
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                        : isWrong
                        ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20'
                        : isSelected
                        ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/10'
                        : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300'
                    }`}
                    whileHover={!showResult ? { scale: 1.01 } : {}}
                    whileTap={!showResult ? { scale: 0.99 } : {}}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        isCorrect
                          ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                          : isWrong
                          ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'
                          : 'bg-gray-100 dark:bg-gray-800'
                      }`}>
                        {optionLabels[idx]}
                      </span>
                      <span className="text-sm flex-1">{option}</span>
                      {isCorrect && <Check className="h-4 w-4 text-emerald-500 ml-auto shrink-0" />}
                      {isWrong && <X className="h-4 w-4 text-rose-500 ml-auto shrink-0" />}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {showResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 space-y-3"
              >
                <div className={`p-3 rounded-lg text-sm ${
                  selectedAnswer === currentQ.correctAnswer
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                    : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                }`}>
                  <p className="font-medium">
                    {selectedAnswer === currentQ.correctAnswer
                      ? t('practice.correct')
                      : t('practice.incorrect')}
                  </p>
                  {currentQ.explanation && (
                    <p className="mt-1 text-xs opacity-80">{currentQ.explanation}</p>
                  )}
                </div>
                <Button
                  onClick={handleNextQuestion}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  {currentQuestion + 1 >= totalQ
                    ? t('practice.finish')
                    : t('practice.next_question')}
                </Button>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  /* ── Render: Admin Tabs ──────────────────────────────────────────── */

  const renderAdminTabs = () => {
    if (!isAdmin && !isTeacher) return null;

    const pendingRequests = changeRequests.filter((r) => r.status === 'pending');

    return (
      <div className="mt-8">
        <Tabs defaultValue="categories" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="categories" className="gap-1">
              <BookOpen className="h-4 w-4" />
              {t('subjects.manage_categories')}
            </TabsTrigger>
            <TabsTrigger value="content" className="gap-1">
              <FileText className="h-4 w-4" />
              {t('subjects.manage_content')}
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-1">
              <MessageSquare className="h-4 w-4" />
              {t('subjects.review_requests')}
              {pendingRequests.length > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs h-5 min-w-5">
                  {pendingRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="ai" className="gap-1">
                <Brain className="h-4 w-4" />
                {t('subjects.ai_config')}
              </TabsTrigger>
            )}
          </TabsList>

          {/* Categories Management */}
          <TabsContent value="categories">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{t('subjects.categories')}</CardTitle>
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingCategory(null);
                      setCategoryForm({ name: '', slug: '', description: '', icon: 'GraduationCap', sortOrder: 0 });
                      setShowCategoryDialog(true);
                    }}
                    className="gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    {t('subjects.create_category')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center gap-3 p-3 rounded-lg border">
                      <GraduationCap className="h-5 w-5 text-emerald-600" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{cat.name}</p>
                        <p className="text-xs text-gray-500">/{cat.slug}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {cat._count?.contents || 0} {t('subjects.topics')}
                      </Badge>
                      <Badge variant={cat.isActive ? 'default' : 'secondary'} className="text-xs">
                        {cat.isActive ? t('subjects.content_active') : t('subjects.content_inactive')}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          setEditingCategory(cat);
                          setCategoryForm({
                            name: cat.name,
                            slug: cat.slug,
                            description: cat.description || '',
                            icon: cat.icon || 'GraduationCap',
                            sortOrder: cat.sortOrder,
                          });
                          setShowCategoryDialog(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleToggleActive(cat, 'category')}
                      >
                        {cat.isActive ? (
                          <ToggleRight className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <ToggleLeft className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content Management */}
          <TabsContent value="content">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{t('subjects.content')}</CardTitle>
                  <div className="flex gap-2">
                    {isAdmin && (
                      <Button variant="outline" size="sm" onClick={handleSeedData} className="gap-1">
                        <Sparkles className="h-4 w-4" />
                        {t('subjects.seed_data')}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingContent(null);
                        setContentForm({ title: '', slug: '', description: '', icon: 'BookOpen', contentType: 'topic', difficulty: 'medium', isActive: true, isPublic: true });
                        setShowContentDialog(true);
                      }}
                      className="gap-1"
                    >
                      <Plus className="h-4 w-4" />
                      {t('subjects.create_content')}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {contents.map((item) => {
                    const Icon = getIcon(item.icon);
                    return (
                      <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border">
                        <Icon className="h-5 w-5 text-emerald-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">{item.contentType}</Badge>
                            <DifficultyBadge difficulty={item.difficulty} />
                            <Badge variant={item.isActive ? 'default' : 'secondary'} className="text-xs">
                              {item.isActive ? t('subjects.content_active') : t('subjects.content_inactive')}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {isAdmin && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => {
                                  setEditingContent(item);
                                  setContentForm({
                                    title: item.title,
                                    slug: item.slug,
                                    description: item.description || '',
                                    icon: item.icon || 'BookOpen',
                                    contentType: item.contentType,
                                    difficulty: item.difficulty,
                                    isActive: item.isActive,
                                    isPublic: item.isPublic,
                                  });
                                  setShowContentDialog(true);
                                }}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => handleToggleActive(item, 'content')}
                              >
                                {item.isActive ? (
                                  <ToggleRight className="h-3.5 w-3.5 text-emerald-500" />
                                ) : (
                                  <ToggleLeft className="h-3.5 w-3.5 text-gray-400" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-rose-500"
                                onClick={() => handleDeleteContent(item.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Change Requests */}
          <TabsContent value="requests">
            <Card>
              <CardHeader>
                <CardTitle>{t('subjects.change_requests')}</CardTitle>
                <CardDescription>
                  {isAdmin
                    ? t('subjects.review_requests')
                    : t('subjects.request_change')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {changeRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">{t('subjects.no_content')}</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {changeRequests.map((req) => (
                      <div key={req.id} className="p-4 rounded-lg border space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm">{req.title}</h4>
                            <p className="text-xs text-gray-500 mt-0.5">{req.description}</p>
                            {req.content && (
                              <p className="text-xs text-gray-400 mt-1">
                                {t('subjects.content_type')}: {req.content.title}
                              </p>
                            )}
                          </div>
                          <StatusBadge status={req.status} />
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Badge variant="secondary" className="text-xs">{req.requestType}</Badge>
                          {req.requester && (
                            <span>{req.requester.firstName} {req.requester.lastName}</span>
                          )}
                          <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                        </div>
                        {req.status === 'pending' && isAdmin && (
                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              onClick={() => handleReviewChangeRequest(req.id, 'approved')}
                              className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                            >
                              <Check className="h-3.5 w-3.5" />
                              {t('subjects.approve')}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReviewChangeRequest(req.id, 'rejected')}
                              className="gap-1"
                            >
                              <X className="h-3.5 w-3.5" />
                              {t('subjects.reject')}
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Settings (admin only) */}
          {isAdmin && (
            <TabsContent value="ai">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-emerald-600" />
                    {t('subjects.ai_config')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {aiSettings ? (
                    <div className="space-y-6">
                      {/* Pollination */}
                      <div className="space-y-3 p-4 rounded-lg border">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-emerald-500" />
                          {t('subjects.pollination')}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="flex items-center justify-between">
                            <Label>{t('subjects.enabled')}</Label>
                            <Switch
                              checked={aiSettings.pollinationEnabled}
                              onCheckedChange={(v) => setAiSettings({ ...aiSettings, pollinationEnabled: v })}
                            />
                          </div>
                          <div>
                            <Label>{t('subjects.model')}</Label>
                            <Input
                              value={aiSettings.pollinationModel}
                              onChange={(e) => setAiSettings({ ...aiSettings, pollinationModel: e.target.value })}
                              className="mt-1"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <Label>{t('subjects.api_key')}</Label>
                            <Input
                              type="password"
                              value={aiSettings.pollinationApiKey || ''}
                              onChange={(e) => setAiSettings({ ...aiSettings, pollinationApiKey: e.target.value })}
                              placeholder="sk-..."
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>

                      {/* OpenAI */}
                      <div className="space-y-3 p-4 rounded-lg border">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <Zap className="h-4 w-4 text-amber-500" />
                          {t('subjects.openai')}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="flex items-center justify-between">
                            <Label>{t('subjects.enabled')}</Label>
                            <Switch
                              checked={aiSettings.openaiEnabled}
                              onCheckedChange={(v) => setAiSettings({ ...aiSettings, openaiEnabled: v })}
                            />
                          </div>
                          <div>
                            <Label>{t('subjects.model')}</Label>
                            <Select
                              value={aiSettings.openaiModel}
                              onValueChange={(v) => setAiSettings({ ...aiSettings, openaiModel: v })}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                                <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                                <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="sm:col-span-2">
                            <Label>{t('subjects.api_key')}</Label>
                            <Input
                              type="password"
                              value={aiSettings.openaiApiKey || ''}
                              onChange={(e) => setAiSettings({ ...aiSettings, openaiApiKey: e.target.value })}
                              placeholder="sk-..."
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Anthropic */}
                      <div className="space-y-3 p-4 rounded-lg border">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <Brain className="h-4 w-4 text-violet-500" />
                          {t('subjects.anthropic')}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="flex items-center justify-between">
                            <Label>{t('subjects.enabled')}</Label>
                            <Switch
                              checked={aiSettings.anthropicEnabled}
                              onCheckedChange={(v) => setAiSettings({ ...aiSettings, anthropicEnabled: v })}
                            />
                          </div>
                          <div>
                            <Label>{t('subjects.model')}</Label>
                            <Select
                              value={aiSettings.anthropicModel}
                              onValueChange={(v) => setAiSettings({ ...aiSettings, anthropicModel: v })}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</SelectItem>
                                <SelectItem value="claude-3-opus-20240229">Claude 3 Opus</SelectItem>
                                <SelectItem value="claude-3-haiku-20240307">Claude 3 Haiku</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="sm:col-span-2">
                            <Label>{t('subjects.api_key')}</Label>
                            <Input
                              type="password"
                              value={aiSettings.anthropicApiKey || ''}
                              onChange={(e) => setAiSettings({ ...aiSettings, anthropicApiKey: e.target.value })}
                              placeholder="sk-ant-..."
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>

                      {/* AI Features */}
                      <div className="space-y-3 p-4 rounded-lg border">
                        <h4 className="font-semibold text-sm">{t('subjects.ai_helper')}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="flex items-center justify-between">
                            <Label>{t('subjects.ai_helper')}</Label>
                            <Switch
                              checked={aiSettings.aiChatEnabled}
                              onCheckedChange={(v) => setAiSettings({ ...aiSettings, aiChatEnabled: v })}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label>{t('subjects.image_generation')}</Label>
                            <Switch
                              checked={aiSettings.aiImageGenEnabled}
                              onCheckedChange={(v) => setAiSettings({ ...aiSettings, aiImageGenEnabled: v })}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label>{t('subjects.video_generation')}</Label>
                            <Switch
                              checked={aiSettings.aiVideoGenEnabled}
                              onCheckedChange={(v) => setAiSettings({ ...aiSettings, aiVideoGenEnabled: v })}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label>{t('subjects.auto_tests')}</Label>
                            <Switch
                              checked={aiSettings.aiAutoTestEnabled}
                              onCheckedChange={(v) => setAiSettings({ ...aiSettings, aiAutoTestEnabled: v })}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label>{t('subjects.topic_generation')}</Label>
                            <Switch
                              checked={aiSettings.aiTopicGenEnabled}
                              onCheckedChange={(v) => setAiSettings({ ...aiSettings, aiTopicGenEnabled: v })}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label>{t('subjects.grading_audit')}</Label>
                            <Switch
                              checked={aiSettings.aiGradingAuditEnabled}
                              onCheckedChange={(v) => setAiSettings({ ...aiSettings, aiGradingAuditEnabled: v })}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label>{t('subjects.virtual_character')}</Label>
                            <Switch
                              checked={aiSettings.virtualCharacterEnabled}
                              onCheckedChange={(v) => setAiSettings({ ...aiSettings, virtualCharacterEnabled: v })}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Restrictions */}
                      <div className="space-y-3 p-4 rounded-lg border">
                        <h4 className="font-semibold text-sm">{t('subjects.daily_limit')}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label>{t('subjects.daily_limit')}</Label>
                            <Input
                              type="number"
                              value={aiSettings.aiMaxRequestsPerDay}
                              onChange={(e) => setAiSettings({ ...aiSettings, aiMaxRequestsPerDay: parseInt(e.target.value) || 50 })}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label>{t('subjects.helper_mode')}</Label>
                            <Select
                              value={aiSettings.aiHelperMode}
                              onValueChange={(v) => setAiSettings({ ...aiSettings, aiHelperMode: v })}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="guided">{t('subjects.guided')}</SelectItem>
                                <SelectItem value="full">{t('subjects.full')}</SelectItem>
                                <SelectItem value="restricted">{t('subjects.restricted')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="sm:col-span-2">
                            <Label>{t('subjects.system_prompt')}</Label>
                            <Textarea
                              value={aiSettings.aiSystemPrompt || ''}
                              onChange={(e) => setAiSettings({ ...aiSettings, aiSystemPrompt: e.target.value })}
                              rows={3}
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>

                      <Button onClick={handleSaveAISettings} className="w-full bg-emerald-600 hover:bg-emerald-700">
                        {t('action.save')}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    );
  };

  /* ── Main Render ─────────────────────────────────────────────────── */

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <AnimatePresence mode="wait">
        {!selectedCategory && !searchQuery.trim() && (
          <motion.div
            key="categories"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {renderCategoryGrid()}
          </motion.div>
        )}

        {searchQuery.trim() && (
          <motion.div
            key="search"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {renderCategoryGrid()}
          </motion.div>
        )}

        {selectedCategory && !selectedSubject && !searchQuery.trim() && (
          <motion.div
            key="subjects"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {renderSubjectGrid()}
          </motion.div>
        )}

        {selectedSubject && !selectedTopic && (
          <motion.div
            key="topics"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {renderTopicList()}
          </motion.div>
        )}

        {selectedTopic && (
          <motion.div
            key="topic-detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {renderTopicDetail()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin/Teacher tabs */}
      {(isAdmin || isTeacher) && !selectedTopic && !selectedSubject && renderAdminTabs()}

      {/* Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? t('subjects.edit_category') : t('subjects.create_category')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('label.name')}</Label>
              <Input
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-') })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Slug</Label>
              <Input
                value={categoryForm.slug}
                onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>{t('label.description')}</Label>
              <Textarea
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                className="mt-1"
                rows={2}
              />
            </div>
            <div>
              <Label>Icon</Label>
              <Select
                value={categoryForm.icon}
                onValueChange={(v) => setCategoryForm({ ...categoryForm, icon: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(ICON_MAP).map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>
              {t('action.cancel')}
            </Button>
            <Button onClick={handleSaveCategory} className="bg-emerald-600 hover:bg-emerald-700">
              {t('action.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Content Dialog */}
      <Dialog open={showContentDialog} onOpenChange={setShowContentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingContent ? t('subjects.edit_content') : t('subjects.create_content')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('label.name')}</Label>
              <Input
                value={contentForm.title}
                onChange={(e) => setContentForm({ ...contentForm, title: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-') })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Slug</Label>
              <Input
                value={contentForm.slug}
                onChange={(e) => setContentForm({ ...contentForm, slug: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>{t('label.description')}</Label>
              <Textarea
                value={contentForm.description}
                onChange={(e) => setContentForm({ ...contentForm, description: e.target.value })}
                className="mt-1"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('subjects.content_type')}</Label>
                <Select
                  value={contentForm.contentType}
                  onValueChange={(v) => setContentForm({ ...contentForm, contentType: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="topic">Topic</SelectItem>
                    <SelectItem value="exercise">Exercise</SelectItem>
                    <SelectItem value="lesson">Lesson</SelectItem>
                    <SelectItem value="quiz">Quiz</SelectItem>
                    <SelectItem value="vocabulary">Vocabulary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('subjects.difficulty')}</Label>
                <Select
                  value={contentForm.difficulty}
                  onValueChange={(v) => setContentForm({ ...contentForm, difficulty: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">{t('subjects.easy')}</SelectItem>
                    <SelectItem value="medium">{t('subjects.medium')}</SelectItem>
                    <SelectItem value="hard">{t('subjects.hard')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Icon</Label>
              <Select
                value={contentForm.icon}
                onValueChange={(v) => setContentForm({ ...contentForm, icon: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(ICON_MAP).map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={contentForm.isActive}
                  onCheckedChange={(v) => setContentForm({ ...contentForm, isActive: v })}
                />
                <Label>{t('subjects.content_active')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={contentForm.isPublic}
                  onCheckedChange={(v) => setContentForm({ ...contentForm, isPublic: v })}
                />
                <Label>Public</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowContentDialog(false)}>
              {t('action.cancel')}
            </Button>
            <Button onClick={handleSaveContent} className="bg-emerald-600 hover:bg-emerald-700">
              {t('action.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Request Dialog */}
      <Dialog open={showChangeRequestDialog} onOpenChange={setShowChangeRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('subjects.request_change')}</DialogTitle>
            <DialogDescription>
              {changeRequestTarget?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('subjects.request_type')}</Label>
              <Select
                value={changeRequestForm.requestType}
                onValueChange={(v) => setChangeRequestForm({ ...changeRequestForm, requestType: v as 'edit' | 'add' | 'delete' })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="edit">Edit</SelectItem>
                  <SelectItem value="add">Add</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('label.name')}</Label>
              <Input
                value={changeRequestForm.title}
                onChange={(e) => setChangeRequestForm({ ...changeRequestForm, title: e.target.value })}
                placeholder="Title of the change request"
                className="mt-1"
              />
            </div>
            <div>
              <Label>{t('label.description')}</Label>
              <Textarea
                value={changeRequestForm.description}
                onChange={(e) => setChangeRequestForm({ ...changeRequestForm, description: e.target.value })}
                placeholder="Describe the requested change..."
                className="mt-1"
                rows={3}
              />
            </div>
            <div>
              <Label>{t('subjects.proposed_changes')}</Label>
              <Textarea
                value={changeRequestForm.proposedChanges}
                onChange={(e) => setChangeRequestForm({ ...changeRequestForm, proposedChanges: e.target.value })}
                placeholder="JSON or description of proposed changes"
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangeRequestDialog(false)}>
              {t('action.cancel')}
            </Button>
            <Button onClick={handleSubmitChangeRequest} className="bg-emerald-600 hover:bg-emerald-700">
              <Send className="h-4 w-4 mr-2" />
              {t('subjects.request_change')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Crawl Dialog */}
      <Dialog open={showCrawlDialog} onOpenChange={setShowCrawlDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-emerald-500" />
              {t('subjects.crawl')}
            </DialogTitle>
            <DialogDescription>{t('subjects.crawl_desc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('subjects.crawl_url')}</Label>
              <Input
                value={crawlUrl}
                onChange={(e) => setCrawlUrl(e.target.value)}
                placeholder={t('subjects.crawl_url_placeholder')}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('subjects.crawl_admin_only')}
              </p>
            </div>
            {isCrawling && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                <span className="text-sm text-emerald-700 dark:text-emerald-300">{t('subjects.crawling')}</span>
              </div>
            )}
            {crawlResult && (
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{t('subjects.crawl_complete')}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-gray-600 dark:text-gray-400">{t('subjects.crawl_topics_found')}: <span className="font-semibold text-gray-900 dark:text-gray-100">{crawlResult.topicsFound}</span></div>
                  <div className="text-gray-600 dark:text-gray-400">{t('subjects.crawl_contents_created')}: <span className="font-semibold text-gray-900 dark:text-gray-100">{crawlResult.contentsCreated}</span></div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCrawlDialog(false); setCrawlResult(null); }}>
              {t('action.close')}
            </Button>
            <Button
              onClick={async () => {
                if (!crawlUrl || !schoolId) return;
                setIsCrawling(true);
                setCrawlResult(null);
                try {
                  const res = await apiPost<{
                    success: boolean;
                    topicsFound: number;
                    contentsCreated: number;
                  }>('/api/subject-contents/crawl', {
                    url: crawlUrl,
                    schoolId,
                    categoryId: selectedCategory?.id,
                  });
                  if (res.success) {
                    setCrawlResult({ topicsFound: res.topicsFound, contentsCreated: res.contentsCreated });
                    toast.success(t('subjects.crawl_success'));
                    loadCategories();
                  }
                } catch {
                  toast.error(t('subjects.crawl_error'));
                } finally {
                  setIsCrawling(false);
                }
              }}
              disabled={isCrawling || !crawlUrl.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isCrawling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Globe className="h-4 w-4 mr-2" />}
              {t('subjects.crawl')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
