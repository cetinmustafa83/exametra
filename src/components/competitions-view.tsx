'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Medal,
  Award,
  Gift,
  Clock,
  Users,
  Target,
  Crown,
  Star,
  Flame,
  Zap,
  TrendingUp,
  BookOpen,
  Plus,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  Calendar,
  Eye,
  Trash2,
  Edit3,
  AlertTriangle,
  Info,
  ExternalLink,
  BarChart3,
  Sparkles,
  Shield,
  Timer,
  UserPlus,
  XCircle,
  Play,
  Pause,
  CheckCircle2,
  CircleDot,
  Lock,
  Globe,
  Ticket,
  Film,
  Music,
  Theater,
  ShoppingBag,
  Tag,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAppStore, type CurrentUser } from '@/lib/store';
import { t } from '@/lib/i18n';
import {
  fetchCompetitions,
  fetchCompetition,
  createCompetition,
  updateCompetition,
  deleteCompetition,
  registerCompetitionParticipant,
  fetchCompetitionLeaderboard,
  fetchCompetitionRewards,
  createCompetitionReward,
  fetchRewardClaims,
  claimReward,
  type CompetitionData,
  type CompetitionLeaderboardEntry,
  type CompetitionRewardData,
  type RewardClaimData,
} from '@/lib/api';
import { toast } from 'sonner';

/* ── Helpers ─────────────────────────────────────────────────────── */

const COMPETITION_TYPES = ['class', 'inter_class', 'inter_school'] as const;
const CATEGORIES = ['academic', 'sports', 'creativity', 'citizenship', 'digital', 'reading', 'stem', 'other'] as const;
const STATUSES = ['draft', 'registration', 'active', 'completed', 'cancelled'] as const;
const SCORING_TYPES = ['points', 'rank', 'time', 'badge_count'] as const;
const REWARD_TYPES = ['digital_code', 'badge', 'certificate', 'experience', 'physical'] as const;
const REWARD_PROVIDERS = ['netflix', 'amazon', 'cinema', 'theater', 'concert', 'custom'] as const;

function getTypeLabel(type: string): string {
  switch (type) {
    case 'class': return t('competition.type.class');
    case 'inter_class': return t('competition.type.inter_class');
    case 'inter_school': return t('competition.type.inter_school');
    default: return type;
  }
}

function getCategoryLabel(category: string): string {
  switch (category) {
    case 'academic': return t('competition.category.academic');
    case 'sports': return t('competition.category.sports');
    case 'creativity': return t('competition.category.creativity');
    case 'citizenship': return t('competition.category.citizenship');
    case 'digital': return t('competition.category.digital');
    case 'reading': return t('competition.category.reading');
    case 'stem': return t('competition.category.stem');
    case 'other': return t('competition.category.other');
    default: return category;
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'draft': return t('competition.status.draft');
    case 'registration': return t('competition.status.registration');
    case 'active': return t('competition.status.active');
    case 'completed': return t('competition.status.completed');
    case 'cancelled': return t('competition.status.cancelled');
    default: return status;
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'draft': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    case 'registration': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300';
    case 'active': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300';
    case 'completed': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300';
    case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300';
    default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  }
}

function getStatusBorderColor(status: string): string {
  switch (status) {
    case 'draft': return 'border-l-gray-400';
    case 'registration': return 'border-l-blue-400';
    case 'active': return 'border-l-emerald-500';
    case 'completed': return 'border-l-amber-400';
    case 'cancelled': return 'border-l-red-400';
    default: return 'border-l-gray-400';
  }
}

function TypeIcon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case 'class': return <Users className={className} />;
    case 'inter_class': return <Shield className={className} />;
    case 'inter_school': return <Globe className={className} />;
    default: return <Trophy className={className} />;
  }
}

function CategoryIcon({ category, className }: { category: string; className?: string }) {
  switch (category) {
    case 'academic': return <BookOpen className={className} />;
    case 'sports': return <Flame className={className} />;
    case 'creativity': return <Sparkles className={className} />;
    case 'citizenship': return <Shield className={className} />;
    case 'digital': return <Zap className={className} />;
    case 'reading': return <BookOpen className={className} />;
    case 'stem': return <Target className={className} />;
    case 'other': return <Star className={className} />;
    default: return <Trophy className={className} />;
  }
}

function ProviderIconComp({ provider, className }: { provider: string | null; className?: string }) {
  switch (provider) {
    case 'netflix': return <Film className={className} />;
    case 'amazon': return <ShoppingBag className={className} />;
    case 'cinema': return <Film className={className} />;
    case 'theater': return <Theater className={className} />;
    case 'concert': return <Music className={className} />;
    case 'custom': return <Tag className={className} />;
    default: return <Gift className={className} />;
  }
}

function getRewardTypeLabel(type: string): string {
  switch (type) {
    case 'digital_code': return t('competition.reward.type.digital_code');
    case 'badge': return t('competition.reward.type.badge');
    case 'certificate': return t('competition.reward.type.certificate');
    case 'experience': return t('competition.reward.type.experience');
    case 'physical': return t('competition.reward.type.physical');
    default: return type;
  }
}

function getRewardProviderLabel(provider: string | null): string {
  switch (provider) {
    case 'netflix': return t('competition.reward.provider.netflix');
    case 'amazon': return t('competition.reward.provider.amazon');
    case 'cinema': return t('competition.reward.provider.cinema');
    case 'theater': return t('competition.reward.provider.theater');
    case 'concert': return t('competition.reward.provider.concert');
    case 'custom': return t('competition.reward.provider.custom');
    default: return '';
  }
}

function getScoringLabel(type: string): string {
  switch (type) {
    case 'points': return t('competition.scoring.points');
    case 'rank': return t('competition.scoring.rank');
    case 'time': return t('competition.scoring.time');
    case 'badge_count': return t('competition.scoring.badge_count');
    default: return type;
  }
}

function getTimeProgress(startDate: string, endDate: string): number {
  const now = Date.now();
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  if (now < start) return 0;
  if (now > end) return 100;
  const total = end - start;
  if (total <= 0) return 100;
  return Math.round(((now - start) / total) * 100);
}

function getTimeRemaining(endDate: string): string {
  const now = Date.now();
  const end = new Date(endDate).getTime();
  const diff = end - now;
  if (diff <= 0) return t('competition.status.completed');
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/* ── Sub-components ──────────────────────────────────────────────── */

function CompetitionCard({
  competition,
  onView,
  onRegister,
}: {
  competition: CompetitionData;
  onView: (c: CompetitionData) => void;
  onRegister: (c: CompetitionData) => void;
}) {
  const progress = getTimeProgress(competition.startDate, competition.endDate);
  const isActive = competition.status === 'active';
  const isRegistration = competition.status === 'registration';
  const isCompleted = competition.status === 'completed';
  const participantCount = competition._count?.participants ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.2 }}
      whileHover={{ y: -2 }}
      className="h-full"
    >
      <Card
        className={`border-l-4 ${getStatusBorderColor(competition.status)} h-full flex flex-col cursor-pointer transition-shadow hover:shadow-md`}
        onClick={() => onView(competition)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/30 shrink-0">
                <TypeIcon type={competition.competitionType} className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-base leading-tight truncate">{competition.title}</CardTitle>
                <CardDescription className="text-xs mt-0.5 flex items-center gap-1">
                  <CategoryIcon category={competition.category} className="h-3 w-3" />
                  {getCategoryLabel(competition.category)}
                </CardDescription>
              </div>
            </div>
            <Badge className={`${getStatusColor(competition.status)} text-xs shrink-0`}>
              {getStatusLabel(competition.status)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-1 pb-3 space-y-3">
          {competition.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{competition.description}</p>
          )}

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {participantCount}
              {competition.maxParticipants ? ` / ${competition.maxParticipants}` : ''}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(competition.startDate)}
            </span>
            <span className="flex items-center gap-1">
              <Trophy className="h-3.5 w-3.5" />
              {getTypeLabel(competition.competitionType)}
            </span>
          </div>

          {(isActive || isRegistration) && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {getTimeRemaining(competition.endDate)}
                </span>
                <span className="text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          )}
        </CardContent>
        <CardFooter className="pt-0 pb-4 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 min-h-[44px]"
            onClick={(e) => { e.stopPropagation(); onView(competition); }}
          >
            <Eye className="h-4 w-4 mr-1" />
            {t('competition.details')}
          </Button>
          {isRegistration && (
            <Button
              size="sm"
              className="flex-1 min-h-[44px] bg-emerald-600 hover:bg-emerald-700"
              onClick={(e) => { e.stopPropagation(); onRegister(competition); }}
            >
              <UserPlus className="h-4 w-4 mr-1" />
              {t('competition.register')}
            </Button>
          )}
          {isActive && (
            <Button
              size="sm"
              variant="secondary"
              className="flex-1 min-h-[44px]"
              onClick={(e) => { e.stopPropagation(); onView(competition); }}
            >
              <BarChart3 className="h-4 w-4 mr-1" />
              {t('competition.leaderboard')}
            </Button>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
}

function LeaderboardTable({ entries }: { entries: CompetitionLeaderboardEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Trophy className="h-12 w-12 mb-3 opacity-30" />
        <p className="text-sm">{t('competition.no_competitions')}</p>
      </div>
    );
  }

  return (
    <div className="max-h-96 overflow-y-auto custom-scrollbar">
      <table className="w-full">
        <thead className="sticky top-0 bg-background">
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="pb-2 pl-3 w-16">{t('competition.scoring.rank')}</th>
            <th className="pb-2">{t('competition.participants')}</th>
            <th className="pb-2 pr-3 text-right">{t('competition.scoring.points')}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, idx) => {
            const rank = entry.rank ?? idx + 1;
            return (
              <motion.tr
                key={entry.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="border-b last:border-0 hover:bg-muted/50 transition-colors"
              >
                <td className="py-2.5 pl-3">
                  <div className="flex items-center gap-1.5">
                    {rank === 1 ? (
                      <Crown className="h-5 w-5 text-amber-500" />
                    ) : rank === 2 ? (
                      <Medal className="h-5 w-5 text-gray-400" />
                    ) : rank === 3 ? (
                      <Medal className="h-5 w-5 text-amber-700" />
                    ) : (
                      <span className="text-sm font-medium text-muted-foreground w-5 text-center">{rank}</span>
                    )}
                  </div>
                </td>
                <td className="py-2.5">
                  <span className="text-sm font-medium">{entry.participantName}</span>
                </td>
                <td className="py-2.5 pr-3 text-right">
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{entry.score}</span>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RewardCard({
  reward,
  onClaim,
  canClaim,
  isClaiming,
}: {
  reward: CompetitionRewardData;
  onClaim: (r: CompetitionRewardData) => void;
  canClaim: boolean;
  isClaiming: boolean;
}) {
  const available = reward.quantity - reward.claimedCount;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="h-full">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/30 shrink-0">
              <ProviderIconComp provider={reward.rewardProvider} className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold truncate">{reward.name}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {getRewardTypeLabel(reward.rewardType)}
                {reward.rewardProvider && ` - ${getRewardProviderLabel(reward.rewardProvider)}`}
              </p>
              {reward.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{reward.description}</p>
              )}
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Gift className="h-3 w-3" />
                  {available} {t('competition.reward.available')}
                </span>
                {reward.rankRequirement && (
                  <span className="flex items-center gap-1">
                    <Crown className="h-3 w-3" />
                    #{reward.rankRequirement}
                  </span>
                )}
                {reward.pointsRequired && (
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    {reward.pointsRequired} pts
                  </span>
                )}
              </div>
            </div>
          </div>
          {canClaim && available > 0 && (
            <Button
              size="sm"
              className="w-full mt-3 min-h-[44px] bg-emerald-600 hover:bg-emerald-700"
              onClick={() => onClaim(reward)}
              disabled={isClaiming}
            >
              {isClaiming ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Gift className="h-4 w-4 mr-1" />
                  {t('competition.reward.claim')}
                </>
              )}
            </Button>
          )}
          {available <= 0 && (
            <p className="text-xs text-center mt-2 text-muted-foreground">
              {t('competition.reward.not_available')}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ── Main Component ──────────────────────────────────────────────── */

export default function CompetitionsView() {
  const currentUser = useAppStore((s) => s.currentUser);
  const [activeTab, setActiveTab] = useState('overview');
  const [competitions, setCompetitions] = useState<CompetitionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Detail dialog
  const [selectedCompetition, setSelectedCompetition] = useState<CompetitionData | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTab, setDetailTab] = useState('overview');
  const [leaderboard, setLeaderboard] = useState<CompetitionLeaderboardEntry[]>([]);
  const [rewards, setRewards] = useState<CompetitionRewardData[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    competitionType: 'class',
    category: 'academic',
    startDate: '',
    endDate: '',
    registrationDeadline: '',
    maxParticipants: '',
    scoringType: 'points',
    rules: '',
    isPublic: false,
  });

  // Add reward dialog
  const [addRewardOpen, setAddRewardOpen] = useState(false);
  const [isAddingReward, setIsAddingReward] = useState(false);
  const [rewardForm, setRewardForm] = useState({
    name: '',
    description: '',
    rewardType: 'digital_code',
    rewardValue: '',
    rewardProvider: 'custom',
    rankRequirement: '',
    pointsRequired: '',
    quantity: '1',
  });

  // Reward claims
  const [myClaims, setMyClaims] = useState<RewardClaimData[]>([]);
  const [claimingRewardId, setClaimingRewardId] = useState<string | null>(null);

  // Register
  const [isRegistering, setIsRegistering] = useState(false);

  const isAdmin = currentUser?.role === 'SCHOOL_ADMIN' || currentUser?.role === 'SUPER_ADMIN';
  const isTeacher = currentUser?.role === 'TEACHER';
  const isStudent = currentUser?.role === 'STUDENT';
  const canCreate = isAdmin || isTeacher;
  const schoolId = currentUser?.schoolId;

  /* ── Fetch competitions ──────────────────────────────────────── */
  const loadCompetitions = useCallback(async () => {
    if (!schoolId) return;
    setIsLoading(true);
    try {
      const result = await fetchCompetitions(schoolId, undefined, undefined, undefined, 100);
      setCompetitions(result.competitions);
    } catch (err) {
      console.error('Failed to load competitions:', err);
      toast.error('Failed to load competitions');
    } finally {
      setIsLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    loadCompetitions();
  }, [loadCompetitions]);

  /* ── Fetch my claims ─────────────────────────────────────────── */
  const loadMyClaims = useCallback(async () => {
    if (!schoolId) return;
    try {
      const result = await fetchRewardClaims(schoolId, undefined, undefined);
      setMyClaims(result.claims.filter((c) => c.userId === currentUser?.id));
    } catch {
      // silently fail
    }
  }, [schoolId, currentUser?.id]);

  useEffect(() => {
    loadMyClaims();
  }, [loadMyClaims]);

  /* ── Filtered competitions ───────────────────────────────────── */
  const filteredCompetitions = useMemo(() => {
    let result = competitions;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          (c.description?.toLowerCase().includes(q) ?? false)
      );
    }
    if (filterType !== 'all') {
      result = result.filter((c) => c.competitionType === filterType);
    }
    if (filterStatus !== 'all') {
      result = result.filter((c) => c.status === filterStatus);
    }
    if (filterCategory !== 'all') {
      result = result.filter((c) => c.category === filterCategory);
    }
    return result;
  }, [competitions, searchQuery, filterType, filterStatus, filterCategory]);

  const activeCompetitions = useMemo(() => filteredCompetitions.filter((c) => c.status === 'active'), [filteredCompetitions]);
  const registrationCompetitions = useMemo(() => filteredCompetitions.filter((c) => c.status === 'registration'), [filteredCompetitions]);
  const completedCompetitions = useMemo(() => filteredCompetitions.filter((c) => c.status === 'completed'), [filteredCompetitions]);
  const draftCompetitions = useMemo(() => filteredCompetitions.filter((c) => c.status === 'draft'), [filteredCompetitions]);

  /* ── My competitions ─────────────────────────────────────────── */
  const myCompetitions = useMemo(() => {
    if (canCreate) {
      return filteredCompetitions.filter((c) => c.createdById === currentUser?.id);
    }
    // For students, show competitions they're registered in (we can't easily tell without a participants endpoint)
    // For now, show registration and active competitions
    return filteredCompetitions.filter((c) => c.status === 'registration' || c.status === 'active');
  }, [filteredCompetitions, canCreate, currentUser?.id]);

  /* ── View detail ─────────────────────────────────────────────── */
  const handleViewCompetition = useCallback(async (comp: CompetitionData) => {
    setSelectedCompetition(comp);
    setDetailOpen(true);
    setDetailTab('overview');
    setIsLoadingDetail(true);

    try {
      const [lbResult, rwResult] = await Promise.all([
        fetchCompetitionLeaderboard(comp.id).catch(() => ({ leaderboard: [] })),
        fetchCompetitionRewards(comp.id).catch(() => ({ rewards: [] })),
      ]);
      setLeaderboard(lbResult.leaderboard);
      setRewards(rwResult.rewards);
    } catch {
      // ignore
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  /* ── Register ────────────────────────────────────────────────── */
  const handleRegister = useCallback(async (comp: CompetitionData) => {
    if (!currentUser || !schoolId) return;
    setIsRegistering(true);
    try {
      await registerCompetitionParticipant(comp.id, {
        participantType: 'user',
        participantId: currentUser.id,
        userId: currentUser.id,
      });
      toast.success(t('competition.register'));
      loadCompetitions();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to register';
      toast.error(message);
    } finally {
      setIsRegistering(false);
    }
  }, [currentUser, schoolId, loadCompetitions]);

  /* ── Create competition ──────────────────────────────────────── */
  const handleCreate = useCallback(async () => {
    if (!schoolId) return;
    if (!createForm.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!createForm.startDate || !createForm.endDate) {
      toast.error('Start and end dates are required');
      return;
    }
    setIsCreating(true);
    try {
      await createCompetition({
        schoolId,
        title: createForm.title.trim(),
        description: createForm.description.trim() || null,
        competitionType: createForm.competitionType,
        category: createForm.category,
        startDate: new Date(createForm.startDate).toISOString(),
        endDate: new Date(createForm.endDate).toISOString(),
        registrationDeadline: createForm.registrationDeadline ? new Date(createForm.registrationDeadline).toISOString() : null,
        maxParticipants: createForm.maxParticipants ? parseInt(createForm.maxParticipants, 10) : null,
        scoringType: createForm.scoringType,
        rules: createForm.rules.trim() || null,
        isPublic: createForm.isPublic,
        status: 'registration',
      });
      toast.success(t('competition.create'));
      setCreateOpen(false);
      setCreateForm({
        title: '',
        description: '',
        competitionType: 'class',
        category: 'academic',
        startDate: '',
        endDate: '',
        registrationDeadline: '',
        maxParticipants: '',
        scoringType: 'points',
        rules: '',
        isPublic: false,
      });
      loadCompetitions();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create competition';
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  }, [schoolId, createForm, loadCompetitions]);

  /* ── Add reward ──────────────────────────────────────────────── */
  const handleAddReward = useCallback(async () => {
    if (!selectedCompetition) return;
    if (!rewardForm.name.trim()) {
      toast.error('Reward name is required');
      return;
    }
    setIsAddingReward(true);
    try {
      await createCompetitionReward(selectedCompetition.id, {
        name: rewardForm.name.trim(),
        description: rewardForm.description.trim() || null,
        rewardType: rewardForm.rewardType,
        rewardValue: rewardForm.rewardValue.trim() || null,
        rewardProvider: rewardForm.rewardProvider,
        rankRequirement: rewardForm.rankRequirement ? parseInt(rewardForm.rankRequirement, 10) : null,
        pointsRequired: rewardForm.pointsRequired ? parseInt(rewardForm.pointsRequired, 10) : null,
        quantity: parseInt(rewardForm.quantity, 10) || 1,
      });
      toast.success(t('competition.reward.create'));
      setAddRewardOpen(false);
      setRewardForm({
        name: '',
        description: '',
        rewardType: 'digital_code',
        rewardValue: '',
        rewardProvider: 'custom',
        rankRequirement: '',
        pointsRequired: '',
        quantity: '1',
      });
      // Refresh rewards
      const rwResult = await fetchCompetitionRewards(selectedCompetition.id);
      setRewards(rwResult.rewards);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add reward';
      toast.error(message);
    } finally {
      setIsAddingReward(false);
    }
  }, [selectedCompetition, rewardForm]);

  /* ── Claim reward ────────────────────────────────────────────── */
  const handleClaimReward = useCallback(async (reward: CompetitionRewardData) => {
    if (!selectedCompetition || !currentUser) return;
    setClaimingRewardId(reward.id);
    try {
      await claimReward({
        competitionId: selectedCompetition.id,
        rewardId: reward.id,
      });
      toast.success(t('competition.reward.claim'));
      // Refresh rewards
      const rwResult = await fetchCompetitionRewards(selectedCompetition.id);
      setRewards(rwResult.rewards);
      loadMyClaims();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to claim reward';
      toast.error(message);
    } finally {
      setClaimingRewardId(null);
    }
  }, [selectedCompetition, currentUser, loadMyClaims]);

  /* ── Delete competition ──────────────────────────────────────── */
  const handleDelete = useCallback(async (compId: string) => {
    if (!confirm(t('competition.delete') + '?')) return;
    try {
      await deleteCompetition(compId);
      toast.success(t('competition.delete'));
      setDetailOpen(false);
      setSelectedCompetition(null);
      loadCompetitions();
    } catch {
      toast.error('Failed to delete competition');
    }
  }, [loadCompetitions]);

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
            <Trophy className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('competition.title')}</h1>
            <p className="text-sm text-muted-foreground">
              {filteredCompetitions.length} {t('competition.name').toLowerCase()}
            </p>
          </div>
        </div>
        {canCreate && (
          <Button
            className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('competition.create')}
          </Button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('competition.name') + '...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 min-h-[44px]"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-[160px] min-h-[44px]">
            <SelectValue placeholder={t('competition.type')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('competition.type')}</SelectItem>
            {COMPETITION_TYPES.map((type) => (
              <SelectItem key={type} value={type}>{getTypeLabel(type)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[160px] min-h-[44px]">
            <SelectValue placeholder={t('competition.status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('competition.status')}</SelectItem>
            {STATUSES.map((status) => (
              <SelectItem key={status} value={status}>{getStatusLabel(status)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-[160px] min-h-[44px]">
            <SelectValue placeholder={t('competition.category')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('competition.category')}</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>{getCategoryLabel(cat)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="overview" className="min-h-[44px]">{t('competition.details')}</TabsTrigger>
          <TabsTrigger value="my" className="min-h-[44px]">{t('competition.manage')}</TabsTrigger>
          <TabsTrigger value="leaderboard" className="min-h-[44px]">{t('competition.leaderboard')}</TabsTrigger>
          <TabsTrigger value="rewards" className="min-h-[44px]">{t('competition.rewards')}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}><CardContent className="p-4"><Skeleton className="h-32" /></CardContent></Card>
              ))}
            </div>
          ) : (
            <>
              {/* Registration Open */}
              {registrationCompetitions.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <UserPlus className="h-5 w-5 text-blue-500" />
                    <h2 className="text-lg font-semibold">{t('competition.status.registration')}</h2>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                      {registrationCompetitions.length}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence>
                      {registrationCompetitions.map((comp) => (
                        <CompetitionCard
                          key={comp.id}
                          competition={comp}
                          onView={handleViewCompetition}
                          onRegister={handleRegister}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </section>
              )}

              {/* Active Competitions */}
              {activeCompetitions.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Flame className="h-5 w-5 text-emerald-500" />
                    <h2 className="text-lg font-semibold">{t('competition.status.active')}</h2>
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                      {activeCompetitions.length}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence>
                      {activeCompetitions.map((comp) => (
                        <CompetitionCard
                          key={comp.id}
                          competition={comp}
                          onView={handleViewCompetition}
                          onRegister={handleRegister}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </section>
              )}

              {/* Completed */}
              {completedCompetitions.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="h-5 w-5 text-amber-500" />
                    <h2 className="text-lg font-semibold">{t('competition.status.completed')}</h2>
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                      {completedCompetitions.length}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence>
                      {completedCompetitions.map((comp) => (
                        <CompetitionCard
                          key={comp.id}
                          competition={comp}
                          onView={handleViewCompetition}
                          onRegister={handleRegister}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </section>
              )}

              {/* Drafts (admin/teacher only) */}
              {canCreate && draftCompetitions.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Edit3 className="h-5 w-5 text-gray-500" />
                    <h2 className="text-lg font-semibold">{t('competition.status.draft')}</h2>
                    <Badge variant="secondary" className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      {draftCompetitions.length}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence>
                      {draftCompetitions.map((comp) => (
                        <CompetitionCard
                          key={comp.id}
                          competition={comp}
                          onView={handleViewCompetition}
                          onRegister={handleRegister}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </section>
              )}

              {/* Empty state */}
              {filteredCompetitions.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-16 text-muted-foreground"
                >
                  <Trophy className="h-16 w-16 mb-4 opacity-20" />
                  <p className="text-lg font-medium">{t('competition.no_competitions')}</p>
                  {canCreate && (
                    <Button
                      className="mt-4 min-h-[44px] bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => setCreateOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t('competition.create')}
                    </Button>
                  )}
                </motion.div>
              )}
            </>
          )}
        </TabsContent>

        {/* My Competitions Tab */}
        <TabsContent value="my" className="space-y-4 mt-4">
          {myCompetitions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 text-muted-foreground"
            >
              <Trophy className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">{t('competition.no_competitions')}</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {myCompetitions.map((comp) => (
                  <CompetitionCard
                    key={comp.id}
                    competition={comp}
                    onView={handleViewCompetition}
                    onRegister={handleRegister}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-emerald-600" />
                {t('competition.leaderboard')}
              </CardTitle>
              <CardDescription>
                Select a competition to view the leaderboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeCompetitions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mb-3 opacity-30" />
                  <p className="text-sm">{t('competition.no_competitions')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Select
                    onValueChange={async (val) => {
                      const comp = activeCompetitions.find((c) => c.id === val);
                      if (comp) {
                        try {
                          const result = await fetchCompetitionLeaderboard(val);
                          setLeaderboard(result.leaderboard);
                          setSelectedCompetition(comp);
                        } catch {
                          toast.error('Failed to load leaderboard');
                        }
                      }
                    }}
                  >
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue placeholder="Select a competition" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeCompetitions.map((comp) => (
                        <SelectItem key={comp.id} value={comp.id}>{comp.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {leaderboard.length > 0 && (
                    <LeaderboardTable entries={leaderboard} />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rewards Tab */}
        <TabsContent value="rewards" className="space-y-6 mt-4">
          {/* My Claims */}
          {myClaims.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Gift className="h-5 w-5 text-amber-500" />
                {t('competition.reward.my_claims')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myClaims.map((claim) => {
                  return (
                    <Card key={claim.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/30 shrink-0">
                            <ProviderIconComp provider={claim.reward?.rewardProvider ?? null} className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold truncate">{claim.reward?.name}</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {claim.competition?.title}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge className={`text-xs ${
                                claim.status === 'claimed'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                                  : claim.status === 'pending'
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                              }`}>
                                {claim.status === 'claimed' ? t('competition.reward.status.claimed') : claim.status === 'pending' ? t('competition.reward.status.pending') : claim.status}
                              </Badge>
                              {claim.code && (
                                <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                                  {claim.code}
                                </span>
                              )}
                            </div>
                            {claim.expiresAt && (
                              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {t('competition.reward.expires')}: {formatDate(claim.expiresAt)}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {/* Available rewards from competitions */}
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-500" />
              {t('competition.rewards')}
            </h2>
            {activeCompetitions.length === 0 && completedCompetitions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Gift className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">{t('competition.no_competitions')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {[...activeCompetitions, ...completedCompetitions].map((comp) => (
                  <CompetitionRewardsSection
                    key={comp.id}
                    competition={comp}
                    onClaim={handleClaimReward}
                    claimingRewardId={claimingRewardId}
                    isStudent={isStudent}
                  />
                ))}
              </div>
            )}
          </section>
        </TabsContent>
      </Tabs>

      {/* ── Competition Detail Dialog ──────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedCompetition && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/30 shrink-0">
                    <TypeIcon type={selectedCompetition.competitionType} className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-xl">{selectedCompetition.title}</DialogTitle>
                    <DialogDescription className="mt-1">
                      {getTypeLabel(selectedCompetition.competitionType)} &middot; {getCategoryLabel(selectedCompetition.category)}
                    </DialogDescription>
                  </div>
                  <Badge className={getStatusColor(selectedCompetition.status)}>
                    {getStatusLabel(selectedCompetition.status)}
                  </Badge>
                </div>
              </DialogHeader>

              <Tabs value={detailTab} onValueChange={setDetailTab} className="mt-4">
                <TabsList className="w-full">
                  <TabsTrigger value="overview" className="min-h-[40px] flex-1">{t('competition.details')}</TabsTrigger>
                  <TabsTrigger value="leaderboard" className="min-h-[40px] flex-1">{t('competition.leaderboard')}</TabsTrigger>
                  <TabsTrigger value="rewards" className="min-h-[40px] flex-1">{t('competition.rewards')}</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4 space-y-4">
                  {selectedCompetition.description && (
                    <div>
                      <h3 className="text-sm font-semibold mb-1">{t('competition.description')}</h3>
                      <p className="text-sm text-muted-foreground">{selectedCompetition.description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t('competition.start_date')}</Label>
                      <p className="text-sm font-medium">{formatDate(selectedCompetition.startDate)}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t('competition.end_date')}</Label>
                      <p className="text-sm font-medium">{formatDate(selectedCompetition.endDate)}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t('competition.scoring_type')}</Label>
                      <p className="text-sm font-medium">{getScoringLabel(selectedCompetition.scoringType)}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t('competition.max_participants')}</Label>
                      <p className="text-sm font-medium">{selectedCompetition.maxParticipants ?? 'Unlimited'}</p>
                    </div>
                    {selectedCompetition.registrationDeadline && (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{t('competition.registration_deadline')}</Label>
                        <p className="text-sm font-medium">{formatDate(selectedCompetition.registrationDeadline)}</p>
                      </div>
                    )}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t('competition.participants')}</Label>
                      <p className="text-sm font-medium">{selectedCompetition._count?.participants ?? 0}</p>
                    </div>
                  </div>

                  {selectedCompetition.rules && (
                    <div>
                      <h3 className="text-sm font-semibold mb-1">{t('competition.rules')}</h3>
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 rounded-lg p-3">
                        {selectedCompetition.rules}
                      </div>
                    </div>
                  )}

                  {(selectedCompetition.status === 'active' || selectedCompetition.status === 'registration') && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{t('competition.status.active')}</span>
                        <span className="text-muted-foreground">{getTimeRemaining(selectedCompetition.endDate)}</span>
                      </div>
                      <Progress value={getTimeProgress(selectedCompetition.startDate, selectedCompetition.endDate)} className="h-2" />
                    </div>
                  )}

                  {/* DSGVO / Jugendschutz notices */}
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>{t('competition.dsgvo_notice')}</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Shield className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>{t('competition.jugendschutz_notice')}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    {selectedCompetition.status === 'registration' && isStudent && (
                      <Button
                        className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => handleRegister(selectedCompetition)}
                        disabled={isRegistering}
                      >
                        {isRegistering ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-1" />
                            {t('competition.register')}
                          </>
                        )}
                      </Button>
                    )}
                    {canCreate && selectedCompetition.createdById === currentUser?.id && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="min-h-[44px]"
                        onClick={() => handleDelete(selectedCompetition.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        {t('competition.delete')}
                      </Button>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="leaderboard" className="mt-4">
                  {isLoadingDetail ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-10" />
                      ))}
                    </div>
                  ) : (
                    <LeaderboardTable entries={leaderboard} />
                  )}
                </TabsContent>

                <TabsContent value="rewards" className="mt-4 space-y-4">
                  {isLoadingDetail ? (
                    <div className="grid grid-cols-1 gap-3">
                      {[1, 2].map((i) => (
                        <Skeleton key={i} className="h-24" />
                      ))}
                    </div>
                  ) : rewards.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Gift className="h-10 w-10 mb-2 opacity-30" />
                      <p className="text-sm">{t('competition.no_competitions')}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {rewards.map((reward) => (
                        <RewardCard
                          key={reward.id}
                          reward={reward}
                          onClaim={handleClaimReward}
                          canClaim={isStudent && (selectedCompetition.status === 'active' || selectedCompetition.status === 'completed')}
                          isClaiming={claimingRewardId === reward.id}
                        />
                      ))}
                    </div>
                  )}
                  {canCreate && (
                    <Button
                      variant="outline"
                      className="w-full min-h-[44px]"
                      onClick={() => setAddRewardOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t('competition.reward.create')}
                    </Button>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Create Competition Dialog ──────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-emerald-600" />
              {t('competition.create')}
            </DialogTitle>
            <DialogDescription>
              Create a new competition for your school
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label>{t('competition.name')} *</Label>
              <Input
                value={createForm.title}
                onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Competition title"
                className="mt-1 min-h-[44px]"
              />
            </div>

            <div>
              <Label>{t('competition.description')}</Label>
              <Textarea
                value={createForm.description}
                onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Describe the competition..."
                className="mt-1 min-h-[80px]"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('competition.type')} *</Label>
                <Select
                  value={createForm.competitionType}
                  onValueChange={(v) => setCreateForm((f) => ({ ...f, competitionType: v }))}
                >
                  <SelectTrigger className="mt-1 min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPETITION_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{getTypeLabel(type)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('competition.category')} *</Label>
                <Select
                  value={createForm.category}
                  onValueChange={(v) => setCreateForm((f) => ({ ...f, category: v }))}
                >
                  <SelectTrigger className="mt-1 min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{getCategoryLabel(cat)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('competition.start_date')} *</Label>
                <Input
                  type="datetime-local"
                  value={createForm.startDate}
                  onChange={(e) => setCreateForm((f) => ({ ...f, startDate: e.target.value }))}
                  className="mt-1 min-h-[44px]"
                />
              </div>
              <div>
                <Label>{t('competition.end_date')} *</Label>
                <Input
                  type="datetime-local"
                  value={createForm.endDate}
                  onChange={(e) => setCreateForm((f) => ({ ...f, endDate: e.target.value }))}
                  className="mt-1 min-h-[44px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('competition.registration_deadline')}</Label>
                <Input
                  type="datetime-local"
                  value={createForm.registrationDeadline}
                  onChange={(e) => setCreateForm((f) => ({ ...f, registrationDeadline: e.target.value }))}
                  className="mt-1 min-h-[44px]"
                />
              </div>
              <div>
                <Label>{t('competition.max_participants')}</Label>
                <Input
                  type="number"
                  value={createForm.maxParticipants}
                  onChange={(e) => setCreateForm((f) => ({ ...f, maxParticipants: e.target.value }))}
                  placeholder="Unlimited"
                  className="mt-1 min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <Label>{t('competition.scoring_type')}</Label>
              <Select
                value={createForm.scoringType}
                onValueChange={(v) => setCreateForm((f) => ({ ...f, scoringType: v }))}
              >
                <SelectTrigger className="mt-1 min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCORING_TYPES.map((st) => (
                    <SelectItem key={st} value={st}>{getScoringLabel(st)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t('competition.rules')}</Label>
              <Textarea
                value={createForm.rules}
                onChange={(e) => setCreateForm((f) => ({ ...f, rules: e.target.value }))}
                placeholder="Competition rules and guidelines..."
                className="mt-1 min-h-[100px]"
                rows={4}
              />
            </div>

            {/* DSGVO / Jugendschutz notices */}
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{t('competition.dsgvo_notice')}</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{t('competition.jugendschutz_notice')}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              className="min-h-[44px]"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700"
              onClick={handleCreate}
              disabled={isCreating}
            >
              {isCreating ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  {t('competition.create')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Reward Dialog ──────────────────────────────────── */}
      <Dialog open={addRewardOpen} onOpenChange={setAddRewardOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-amber-500" />
              {t('competition.reward.create')}
            </DialogTitle>
            <DialogDescription>
              Add a reward for &ldquo;{selectedCompetition?.title}&rdquo;
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label>{t('competition.name')} *</Label>
              <Input
                value={rewardForm.name}
                onChange={(e) => setRewardForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Reward name"
                className="mt-1 min-h-[44px]"
              />
            </div>

            <div>
              <Label>{t('competition.description')}</Label>
              <Textarea
                value={rewardForm.description}
                onChange={(e) => setRewardForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Reward description..."
                className="mt-1 min-h-[80px]"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('competition.reward.type')}</Label>
                <Select
                  value={rewardForm.rewardType}
                  onValueChange={(v) => setRewardForm((f) => ({ ...f, rewardType: v }))}
                >
                  <SelectTrigger className="mt-1 min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REWARD_TYPES.map((rt) => (
                      <SelectItem key={rt} value={rt}>{getRewardTypeLabel(rt)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('competition.reward.provider')}</Label>
                <Select
                  value={rewardForm.rewardProvider}
                  onValueChange={(v) => setRewardForm((f) => ({ ...f, rewardProvider: v }))}
                >
                  <SelectTrigger className="mt-1 min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REWARD_PROVIDERS.map((rp) => (
                      <SelectItem key={rp} value={rp}>{getRewardProviderLabel(rp)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>{t('competition.reward.code')}</Label>
              <Input
                value={rewardForm.rewardValue}
                onChange={(e) => setRewardForm((f) => ({ ...f, rewardValue: e.target.value }))}
                placeholder="Promo code or value"
                className="mt-1 min-h-[44px]"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>{t('competition.reward.quantity')}</Label>
                <Input
                  type="number"
                  value={rewardForm.quantity}
                  onChange={(e) => setRewardForm((f) => ({ ...f, quantity: e.target.value }))}
                  className="mt-1 min-h-[44px]"
                />
              </div>
              <div>
                <Label>{t('competition.reward.rank_requirement')}</Label>
                <Input
                  type="number"
                  value={rewardForm.rankRequirement}
                  onChange={(e) => setRewardForm((f) => ({ ...f, rankRequirement: e.target.value }))}
                  placeholder="Any"
                  className="mt-1 min-h-[44px]"
                />
              </div>
              <div>
                <Label>{t('competition.reward.points_required')}</Label>
                <Input
                  type="number"
                  value={rewardForm.pointsRequired}
                  onChange={(e) => setRewardForm((f) => ({ ...f, pointsRequired: e.target.value }))}
                  placeholder="Any"
                  className="mt-1 min-h-[44px]"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              className="min-h-[44px]"
              onClick={() => setAddRewardOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="min-h-[44px] bg-amber-600 hover:bg-amber-700"
              onClick={handleAddReward}
              disabled={isAddingReward}
            >
              {isAddingReward ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  {t('competition.reward.create')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── CompetitionRewardsSection (for rewards tab) ────────────────── */

function CompetitionRewardsSection({
  competition,
  onClaim,
  claimingRewardId,
  isStudent,
}: {
  competition: CompetitionData;
  onClaim: (r: CompetitionRewardData) => void;
  claimingRewardId: string | null;
  isStudent: boolean;
}) {
  const [rewards, setRewards] = useState<CompetitionRewardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchCompetitionRewards(competition.id)
      .then((result) => {
        if (!cancelled) setRewards(result.rewards);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [competition.id]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-24" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (rewards.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <TypeIcon type={competition.competitionType} className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <CardTitle className="text-base">{competition.title}</CardTitle>
          <Badge className={getStatusColor(competition.status)}>{getStatusLabel(competition.status)}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rewards.map((reward) => (
            <RewardCard
              key={reward.id}
              reward={reward}
              onClaim={onClaim}
              canClaim={isStudent}
              isClaiming={claimingRewardId === reward.id}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
