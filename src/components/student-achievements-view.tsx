'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Star,
  Award,
  Flame,
  Crown,
  Zap,
  Target,
  BookOpen,
  Users,
  Palette,
  Dumbbell,
  Monitor,
  Lock,
  Unlock,
  Share2,
  Calendar,
  TrendingUp,
  ChevronRight,
  Sparkles,
  Heart,
  Shield,
  Music,
  GraduationCap,
  Rocket,
  Brain,
  Coffee,
  Medal,
  Gem,
  Sun,
  Moon,
  Eye,
  EyeOff,
  ChevronDown,
  Info,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';

import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { apiGet, apiPost } from '@/lib/api';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────────────────────

interface BadgeData {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  category: string;
  requirementType: string;
  requirementValue: number | null;
  isAuto: boolean;
  earned: boolean;
  earnedAt: string | null;
}

interface CharacterData {
  id: string;
  userId: string;
  schoolId: string;
  characterId: string;
  name: string;
  color: string;
  level: number;
  xp: number;
  mood: string;
  accessories: string | null;
}

interface LeaderboardEntry {
  studentId: string;
  firstName: string;
  lastName: string;
  xp: number;
  level: number;
  badgeCount: number;
}

// ── Constants ──────────────────────────────────────────────────────────

const categoryConfig: Record<string, { label: string; icon: React.ElementType; color: string; gradient: string; bgLight: string; bgDark: string }> = {
  competency: { label: 'Academic', icon: GraduationCap, color: 'text-emerald-600 dark:text-emerald-400', gradient: 'from-emerald-400 to-teal-500', bgLight: 'bg-emerald-50', bgDark: 'dark:bg-emerald-900/20' },
  attendance: { label: 'Social', icon: Users, color: 'text-amber-600 dark:text-amber-400', gradient: 'from-amber-400 to-orange-500', bgLight: 'bg-amber-50', bgDark: 'dark:bg-amber-900/20' },
  behavior: { label: 'Creative', icon: Palette, color: 'text-violet-600 dark:text-violet-400', gradient: 'from-violet-400 to-purple-500', bgLight: 'bg-violet-50', bgDark: 'dark:bg-violet-900/20' },
  achievement: { label: 'Athletic', icon: Dumbbell, color: 'text-rose-600 dark:text-rose-400', gradient: 'from-rose-400 to-pink-500', bgLight: 'bg-rose-50', bgDark: 'dark:bg-rose-900/20' },
  milestone: { label: 'Digital', icon: Monitor, color: 'text-sky-600 dark:text-sky-400', gradient: 'from-sky-400 to-cyan-500', bgLight: 'bg-sky-50', bgDark: 'dark:bg-sky-900/20' },
};

const iconMap: Record<string, React.ElementType> = {
  star: Star,
  book: BookOpen,
  flame: Flame,
  crown: Crown,
  trophy: Trophy,
  award: Award,
  heart: Heart,
  shield: Shield,
  music: Music,
  brain: Brain,
  target: Target,
  zap: Zap,
  coffee: Coffee,
  medal: Medal,
  gem: Gem,
  rocket: Rocket,
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

// ── Circular Progress Component ────────────────────────────────────────

function CircularProgress({
  value,
  size = 80,
  strokeWidth = 6,
  colorClass = 'stroke-emerald-400',
  children,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  colorClass?: string;
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-gray-200 dark:text-gray-700" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth} strokeLinecap="round"
          className={colorClass} strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

// ── Confetti Effect ────────────────────────────────────────────────────

function ConfettiEffect({ active }: { active: boolean }) {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; color: string; size: number; delay: number; shape: 'circle' | 'square' | 'triangle' }>>([]);

  useEffect(() => {
    if (active) {
      const newParticles = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        color: ['bg-emerald-400', 'bg-amber-400', 'bg-rose-400', 'bg-violet-400', 'bg-sky-400', 'bg-teal-400', 'bg-pink-400'][i % 7],
        size: 4 + Math.random() * 8,
        delay: Math.random() * 0.5,
        shape: (['circle', 'square', 'triangle'] as const)[i % 3],
      }));
      setParticles(newParticles);
      const timer = setTimeout(() => setParticles([]), 3000);
      return () => clearTimeout(timer);
    }
  }, [active]);

  if (!active || particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className={`absolute ${p.color} ${p.shape === 'circle' ? 'rounded-full' : p.shape === 'square' ? 'rounded-sm' : ''}`}
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: '-5%',
            clipPath: p.shape === 'triangle' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : undefined,
          }}
          initial={{ opacity: 0, y: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 1, 0], y: [0, window.innerHeight * 1.1], scale: [0, 1, 1, 0.5], rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)] }}
          transition={{ duration: 2 + Math.random(), delay: p.delay, ease: 'easeIn' }}
        />
      ))}
    </div>
  );
}

// ── Badge Card Component ───────────────────────────────────────────────

function BadgeCard({ badge, onClick }: { badge: BadgeData; onClick: (badge: BadgeData) => void }) {
  const [showShine, setShowShine] = useState(false);
  const Icon = iconMap[badge.icon] || Award;
  const category = categoryConfig[badge.category] || categoryConfig.achievement;
  const isEarned = badge.earned;

  useEffect(() => {
    if (isEarned) {
      const timer = setTimeout(() => setShowShine(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isEarned]);

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ scale: 1.05, y: -3 }}
      whileTap={{ scale: 0.97 }}
      className="relative cursor-pointer"
      onClick={() => onClick(badge)}
    >
      <Card className={`border-0 shadow-sm rounded-xl overflow-hidden transition-all duration-300 ${
        isEarned
          ? 'ring-2 ring-emerald-200 dark:ring-emerald-800 bg-gradient-to-br from-white to-emerald-50/30 dark:from-gray-900 dark:to-emerald-900/10'
          : 'opacity-60 bg-gray-50/50 dark:bg-gray-900/50'
      }`}>
        <CardContent className="p-3 flex flex-col items-center text-center gap-1.5">
          <div className={`relative flex items-center justify-center w-14 h-14 rounded-2xl ${
            isEarned
              ? `bg-gradient-to-br ${category.gradient} text-white shadow-lg`
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
          }`}>
            <Icon className="h-7 w-7" />
            {isEarned && showShine && (
              <motion.div
                className="absolute inset-0 rounded-2xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.4, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                style={{ background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%)' }}
              />
            )}
            {isEarned && (
              <motion.div
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ type: 'spring', stiffness: 400, damping: 10, repeat: Infinity, repeatDelay: 5 }}
              >
                <Sparkles className="h-3 w-3" />
              </motion.div>
            )}
            {!isEarned && <Lock className="absolute -bottom-1 -right-1 h-4 w-4 text-gray-400 dark:text-gray-500" />}
          </div>
          <div>
            <p className={`text-xs font-semibold leading-tight ${isEarned ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
              {badge.name}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-2">
              {badge.description}
            </p>
          </div>
          {isEarned && badge.earnedAt && (
            <p className="text-[9px] text-gray-400 dark:text-gray-500">
              {new Date(badge.earnedAt).toLocaleDateString()}
            </p>
          )}
          {!isEarned && badge.requirementValue && (
            <p className="text-[9px] text-gray-400 dark:text-gray-500">
              {badge.requirementType === 'mastery_level' ? `Level ${badge.requirementValue}` : `${badge.requirementValue} pts`}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Badge Detail Modal ─────────────────────────────────────────────────

function BadgeDetailModal({ badge, open, onClose, onShare }: { badge: BadgeData | null; open: boolean; onClose: () => void; onShare: (badge: BadgeData) => void }) {
  if (!badge) return null;

  const Icon = iconMap[badge.icon] || Award;
  const category = categoryConfig[badge.category] || categoryConfig.achievement;
  const CatIcon = category.icon;
  const isEarned = badge.earned;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEarned ? <Unlock className="h-5 w-5 text-emerald-500" /> : <Lock className="h-5 w-5 text-gray-400" />}
            {isEarned ? t('achievements.badge_detail') : t('achievements.badge_locked')}
          </DialogTitle>
          <DialogDescription>{t('achievements.badge_detail_desc')}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className={`relative flex items-center justify-center w-24 h-24 rounded-3xl ${
              isEarned
                ? `bg-gradient-to-br ${category.gradient} text-white shadow-xl`
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
            }`}
          >
            <Icon className="h-12 w-12" />
            {isEarned && (
              <motion.div
                className="absolute inset-0 rounded-3xl"
                animate={{ opacity: [0, 0.3, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
                style={{ background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%)' }}
              />
            )}
          </motion.div>
          <div className="text-center">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{badge.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{badge.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${category.bgLight} ${category.bgDark}`}>
              <CatIcon className={`h-4 w-4 ${category.color}`} />
              <span className="text-xs font-medium">{category.label}</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {badge.isAuto ? t('achievements.auto_badge') : t('achievements.manual_badge')}
            </Badge>
          </div>
          {isEarned && badge.earnedAt && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Calendar className="h-4 w-4" />
              {t('achievements.earned_on')} {new Date(badge.earnedAt).toLocaleDateString()}
            </div>
          )}
          {!isEarned && badge.requirementValue && (
            <div className="w-full max-w-xs">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>{t('achievements.progress')}</span>
                <span>0 / {badge.requirementValue}</span>
              </div>
              <Progress value={0} className="h-2" />
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            {t('action.close')}
          </Button>
          {isEarned && (
            <Button onClick={() => onShare(badge)} className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
              <Share2 className="h-4 w-4 mr-2" />
              {t('achievements.share')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ─────────────────────────────────────────────────────

export default function StudentAchievementsView() {
  const { currentUser, locale } = useAppStore();
  const [badges, setBadges] = useState<BadgeData[]>([]);
  const [character, setCharacter] = useState<CharacterData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('badges');
  const [showConfetti, setShowConfetti] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<BadgeData | null>(null);
  const [showBadgeDetail, setShowBadgeDetail] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [leaderboardOptIn, setLeaderboardOptIn] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const fetchAchievements = useCallback(async () => {
    if (!currentUser?.schoolId) return;
    setIsLoading(true);
    try {
      const data = await apiGet<{
        badges: BadgeData[];
        earnedBadges: unknown[];
        character: CharacterData | null;
        leaderboard: LeaderboardEntry[];
        totalXP: number;
        level: number;
      }>(`/api/student-achievements?schoolId=${currentUser.schoolId}`);

      if (data) {
        setBadges(data.badges || []);
        setCharacter(data.character || null);
        setLeaderboard(data.leaderboard || []);
      }
    } catch {
      // Use demo data on error
      setBadges(demoBadges);
      setCharacter(demoCharacter);
      setLeaderboard(demoLeaderboard);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.schoolId]);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  // Computed values
  const earnedBadges = useMemo(() => badges.filter(b => b.earned), [badges]);
  const lockedBadges = useMemo(() => badges.filter(b => !b.earned), [badges]);
  const totalXP = character?.xp ?? 0;
  const level = character?.level ?? 1;
  const xpForNextLevel = level * 100;
  const xpInCurrentLevel = totalXP - (level - 1) * 100;
  const xpProgress = xpForNextLevel > 0 ? (xpInCurrentLevel / xpForNextLevel) * 100 : 0;

  const recentlyEarnedBadges = useMemo(() => {
    return earnedBadges
      .filter(b => b.earnedAt)
      .sort((a, b) => new Date(b.earnedAt!).getTime() - new Date(a.earnedAt!).getTime())
      .slice(0, 4);
  }, [earnedBadges]);

  const categoryStats = useMemo(() => {
    const stats: Record<string, { earned: number; total: number; progress: number }> = {};
    badges.forEach(b => {
      if (!stats[b.category]) stats[b.category] = { earned: 0, total: 0, progress: 0 };
      stats[b.category].total++;
      if (b.earned) stats[b.category].earned++;
    });
    Object.keys(stats).forEach(key => {
      stats[key].progress = stats[key].total > 0 ? (stats[key].earned / stats[key].total) * 100 : 0;
    });
    return stats;
  }, [badges]);

  const filteredBadges = useMemo(() => {
    if (filterCategory === 'all') return badges;
    return badges.filter(b => b.category === filterCategory);
  }, [badges, filterCategory]);

  const filteredEarned = useMemo(() => filteredBadges.filter(b => b.earned), [filteredBadges]);
  const filteredLocked = useMemo(() => filteredBadges.filter(b => !b.earned), [filteredBadges]);

  const handleBadgeClick = (badge: BadgeData) => {
    setSelectedBadge(badge);
    setShowBadgeDetail(true);
  };

  const handleShare = (badge: BadgeData) => {
    setSelectedBadge(badge);
    setShowBadgeDetail(false);
    setShowShareDialog(true);
  };

  const handleShareConfirm = () => {
    toast.success(t('achievements.share_success'));
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
    setShowShareDialog(false);
    setSelectedBadge(null);
  };

  const handleLeaderboardOptIn = (checked: boolean) => {
    setLeaderboardOptIn(checked);
    toast.success(checked ? t('achievements.leaderboard_joined') : t('achievements.leaderboard_left'));
  };

  // ── Demo Data ──────────────────────────────────────────────────────

  const demoBadges: BadgeData[] = [
    { id: '1', name: 'First Steps', description: 'Complete your first competency', icon: 'star', color: '#10b981', category: 'competency', requirementType: 'mastery_level', requirementValue: 1, isAuto: true, earned: true, earnedAt: new Date(Date.now() - 86400000 * 14).toISOString() },
    { id: '2', name: 'Bookworm', description: 'Complete 10 notebook pages', icon: 'book', color: '#f59e0b', category: 'competency', requirementType: 'progress_entries', requirementValue: 10, isAuto: true, earned: true, earnedAt: new Date(Date.now() - 86400000 * 7).toISOString() },
    { id: '3', name: 'Streak Master', description: '7-day learning streak', icon: 'flame', color: '#ef4444', category: 'attendance', requirementType: 'attendance_rate', requirementValue: 7, isAuto: true, earned: true, earnedAt: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: '4', name: 'Competency King', description: 'Reach level 3 in any subject', icon: 'crown', color: '#8b5cf6', category: 'achievement', requirementType: 'mastery_level', requirementValue: 3, isAuto: true, earned: false, earnedAt: null },
    { id: '5', name: 'Perfect Score', description: 'Score 100% on an assessment', icon: 'trophy', color: '#f59e0b', category: 'achievement', requirementType: 'custom', requirementValue: 100, isAuto: true, earned: false, earnedAt: null },
    { id: '6', name: 'Team Player', description: 'Help 5 classmates', icon: 'heart', color: '#ec4899', category: 'behavior', requirementType: 'custom', requirementValue: 5, isAuto: false, earned: true, earnedAt: new Date(Date.now() - 86400000 * 3).toISOString() },
    { id: '7', name: 'Creative Mind', description: 'Create 3 original projects', icon: 'palette', color: '#8b5cf6', category: 'behavior', requirementType: 'custom', requirementValue: 3, isAuto: false, earned: false, earnedAt: null },
    { id: '8', name: 'Digital Native', description: 'Complete 20 online exercises', icon: 'monitor', color: '#06b6d4', category: 'milestone', requirementType: 'progress_entries', requirementValue: 20, isAuto: true, earned: true, earnedAt: new Date(Date.now() - 86400000 * 5).toISOString() },
    { id: '9', name: 'Math Wizard', description: 'Master all math competencies', icon: 'brain', color: '#10b981', category: 'competency', requirementType: 'mastery_level', requirementValue: 4, isAuto: true, earned: false, earnedAt: null },
    { id: '10', name: 'Rising Star', description: 'Earn 10 badges', icon: 'star', color: '#f59e0b', category: 'milestone', requirementType: 'custom', requirementValue: 10, isAuto: true, earned: false, earnedAt: null },
    { id: '11', name: 'Quick Learner', description: 'Complete a study session', icon: 'rocket', color: '#6366f1', category: 'milestone', requirementType: 'custom', requirementValue: 1, isAuto: true, earned: true, earnedAt: new Date(Date.now() - 86400000).toISOString() },
    { id: '12', name: 'Focus Champion', description: 'Complete 5 Pomodoro sessions', icon: 'target', color: '#059669', category: 'achievement', requirementType: 'custom', requirementValue: 5, isAuto: true, earned: true, earnedAt: new Date(Date.now() - 86400000 * 4).toISOString() },
    { id: '13', name: 'Social Butterfly', description: 'Participate in 10 group activities', icon: 'users', color: '#f59e0b', category: 'attendance', requirementType: 'custom', requirementValue: 10, isAuto: true, earned: false, earnedAt: null },
    { id: '14', name: 'Fitness Pro', description: 'Complete 20 PE lessons', icon: 'dumbbell', color: '#ef4444', category: 'achievement', requirementType: 'custom', requirementValue: 20, isAuto: true, earned: false, earnedAt: null },
    { id: '15', name: 'Tech Guru', description: 'Submit 15 digital assignments', icon: 'monitor', color: '#06b6d4', category: 'milestone', requirementType: 'custom', requirementValue: 15, isAuto: true, earned: true, earnedAt: new Date(Date.now() - 86400000 * 6).toISOString() },
  ];

  const demoCharacter: CharacterData = {
    id: '1', userId: '1', schoolId: '1', characterId: 'owl', name: 'Hootie',
    color: '#10b981', level: 5, xp: 450, mood: 'happy', accessories: null,
  };

  const demoLeaderboard: LeaderboardEntry[] = [
    { studentId: '1', firstName: 'Max', lastName: 'M.', xp: 450, level: 5, badgeCount: 6 },
    { studentId: '2', firstName: 'Anna', lastName: 'S.', xp: 380, level: 4, badgeCount: 5 },
    { studentId: '3', firstName: 'Lukas', lastName: 'W.', xp: 320, level: 4, badgeCount: 4 },
    { studentId: '4', firstName: 'Sophie', lastName: 'K.', xp: 290, level: 3, badgeCount: 4 },
    { studentId: '5', firstName: 'Tim', lastName: 'B.', xp: 250, level: 3, badgeCount: 3 },
    { studentId: '6', firstName: 'Lena', lastName: 'F.', xp: 220, level: 3, badgeCount: 2 },
    { studentId: '7', firstName: 'Julian', lastName: 'R.', xp: 180, level: 2, badgeCount: 3 },
    { studentId: '8', firstName: 'Mia', lastName: 'H.', xp: 150, level: 2, badgeCount: 2 },
  ];

  // ── Render ─────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="h-8 w-48 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-36 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto"
    >
      <ConfettiEffect active={showConfetti} />

      {/* ── Header with gradient banner */}
      <motion.div variants={itemVariants} className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-500 p-6 shadow-lg">
        {/* Decorative background shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
          <div className="absolute bottom-0 left-1/3 w-16 h-16 rounded-full bg-white/5" />
        </div>
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Trophy className="h-7 w-7" />
              {t('achievements.title')}
            </h1>
            <p className="text-sm text-amber-100 mt-1">{t('achievements.subtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30">
              <Star className="h-5 w-5 text-white" />
              <div>
                <p className="text-xs text-white font-medium">{t('achievements.level')} {level}</p>
                <p className="text-[10px] text-white/70">{totalXP} XP</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── XP Progress Bar with shimmer effect */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-sm rounded-xl bg-gradient-to-r from-amber-50/50 via-emerald-50/50 to-teal-50/50 dark:from-amber-900/10 dark:via-emerald-900/10 dark:to-teal-900/10 overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-md">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{t('achievements.xp_progress')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{xpInCurrentLevel} / {xpForNextLevel} XP</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-gradient-to-r from-amber-400 to-amber-500 text-white border-0 text-xs">
                  {t('achievements.level')} {level}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {t('achievements.next_level')}: {level + 1}
                </Badge>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-full">
              <Progress value={xpProgress} className="h-3 bg-gray-200 dark:bg-gray-700" />
              <motion.div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-400 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${xpProgress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                style={{ maxWidth: '100%' }}
              />
              {/* Shimmer effect */}
              <motion.div
                className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full pointer-events-none"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 4, ease: 'easeInOut' }}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-[10px] text-gray-400 dark:text-gray-500">{xpForNextLevel - xpInCurrentLevel} XP {t('achievements.to_next_level')}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">{Math.round(xpProgress)}%</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Stats Cards ────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: t('achievements.badges_earned'), value: earnedBadges.length, icon: Award, color: 'from-emerald-400 to-teal-500' },
          { label: t('achievements.badges_locked'), value: lockedBadges.length, icon: Lock, color: 'from-gray-400 to-gray-500' },
          { label: t('achievements.total_xp'), value: totalXP, icon: Zap, color: 'from-amber-400 to-amber-500' },
          { label: t('achievements.current_level'), value: level, icon: Crown, color: 'from-violet-400 to-purple-500' },
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={idx}
              whileHover={{ scale: 1.02, y: -2 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} text-white shadow-md shrink-0`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{stat.value}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* ── Recently Earned Badges ─────────────────────────────────── */}
      {recentlyEarnedBadges.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm rounded-xl overflow-hidden bg-gradient-to-r from-emerald-50/30 via-white to-teal-50/30 dark:from-emerald-900/5 dark:via-gray-900 dark:to-teal-900/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-500" />
                {t('achievements.recently_earned')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {recentlyEarnedBadges.map((badge) => {
                  const Icon = iconMap[badge.icon] || Award;
                  const category = categoryConfig[badge.category] || categoryConfig.achievement;
                  return (
                    <motion.div
                      key={badge.id}
                      whileHover={{ scale: 1.05 }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shrink-0 cursor-pointer"
                      onClick={() => handleBadgeClick(badge)}
                    >
                      <div className={`flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br ${category.gradient} text-white shadow-sm`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">{badge.name}</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500">
                          {badge.earnedAt ? new Date(badge.earnedAt).toLocaleDateString() : ''}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Category Progress with Animated Circles ────────────────── */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Target className="h-5 w-5 text-emerald-500" />
              {t('achievements.category_progress')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {Object.entries(categoryStats).map(([category, stats]) => {
                const config = categoryConfig[category] || categoryConfig.achievement;
                const Icon = config.icon;
                return (
                  <motion.div
                    key={category}
                    whileHover={{ scale: 1.02 }}
                    className={`p-4 rounded-xl ${config.bgLight} ${config.bgDark} border border-gray-100 dark:border-gray-800 flex flex-col items-center gap-3 cursor-pointer`}
                    onClick={() => setFilterCategory(filterCategory === category ? 'all' : category)}
                  >
                    <CircularProgress
                      value={stats.progress}
                      size={64}
                      strokeWidth={5}
                      colorClass={`stroke-${category === 'competency' ? 'emerald' : category === 'attendance' ? 'amber' : category === 'behavior' ? 'violet' : category === 'achievement' ? 'rose' : 'sky'}-400`}
                    >
                      <Icon className={`h-5 w-5 ${config.color}`} />
                    </CircularProgress>
                    <div className="text-center">
                      <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">{config.label}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">{stats.earned}/{stats.total} {t('achievements.badges')}</p>
                    </div>
                    {filterCategory === category && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Main Content Tabs ──────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="badges" className="gap-1.5">
              <Award className="h-4 w-4" />
              {t('achievements.badges')}
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="gap-1.5">
              <Trophy className="h-4 w-4" />
              {t('achievements.leaderboard')}
            </TabsTrigger>
            <TabsTrigger value="challenges" className="gap-1.5">
              <Flame className="h-4 w-4" />
              {t('achievements.challenges')}
            </TabsTrigger>
          </TabsList>

          {/* ── Badges Tab ─────────────────────────────────────────── */}
          <TabsContent value="badges">
            <AnimatePresence mode="wait">
              <motion.div
                key={`badges-tab-${filterCategory}`}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className="space-y-6"
              >
                {/* Category Filter */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant={filterCategory === 'all' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs rounded-lg transition-all hover:shadow-md"
                    onClick={() => setFilterCategory('all')}
                  >
                    {t('achievements.all_categories')}
                  </Button>
                  {Object.entries(categoryConfig).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <motion.div
                        key={key}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          variant={filterCategory === key ? 'default' : 'outline'}
                          size="sm"
                          className={`h-7 text-xs rounded-lg gap-1 transition-all ${filterCategory === key ? 'shadow-md' : 'hover:shadow-sm'}`}
                          onClick={() => setFilterCategory(key)}
                        >
                          <Icon className="h-3 w-3" />
                          {config.label}
                        </Button>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Earned Badges */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <Unlock className="h-4 w-4 text-emerald-500" />
                    {t('achievements.earned_badges')} ({filteredEarned.length})
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                    {filteredEarned.map(badge => (
                      <div key={badge.id} className="relative group">
                        <BadgeCard badge={badge} onClick={handleBadgeClick} />
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleShare(badge); }}
                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full bg-white/80 dark:bg-gray-800/80 shadow-sm z-10"
                              >
                                <Share2 className="h-3 w-3 text-gray-500" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>{t('achievements.share')}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Locked Badges */}
                {filteredLocked.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                      <Lock className="h-4 w-4 text-gray-400" />
                      {t('achievements.locked_badges')} ({filteredLocked.length})
                    </h3>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                      {filteredLocked.map(badge => (
                        <BadgeCard key={badge.id} badge={badge} onClick={handleBadgeClick} />
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </TabsContent>

          {/* ── Leaderboard Tab ────────────────────────────────────── */}
          <TabsContent value="leaderboard">
            <AnimatePresence mode="wait">
              <motion.div
                key="leaderboard-tab"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className="space-y-4"
              >
                <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-amber-500" />
                        {t('achievements.class_leaderboard')}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-gray-500 dark:text-gray-400">{t('achievements.show_on_leaderboard')}</Label>
                        <Switch checked={leaderboardOptIn} onCheckedChange={handleLeaderboardOptIn} />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {leaderboardOptIn ? (
                      <ScrollArea className="max-h-96">
                        <div className="space-y-2">
                          {leaderboard.map((entry, idx) => {
                            const rank = idx + 1;
                            const isCurrentUser = entry.studentId === currentUser?.id;
                            const rankColors = [
                              'from-amber-400 to-amber-500',
                              'from-gray-300 to-gray-400',
                              'from-orange-400 to-orange-500',
                            ];
                            const rankIcons = [Crown, Medal, Award];

                            return (
                              <motion.div
                                key={entry.studentId}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                                  isCurrentUser
                                    ? 'bg-gradient-to-r from-emerald-50/50 to-teal-50/30 dark:from-emerald-900/10 dark:to-teal-900/5 ring-1 ring-emerald-200 dark:ring-emerald-800'
                                    : 'bg-gray-50/50 dark:bg-gray-800/30 hover:bg-gray-100/50 dark:hover:bg-gray-800/50'
                                }`}
                              >
                                <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${
                                  rank <= 3 ? `bg-gradient-to-br ${rankColors[rank - 1]} text-white shadow-sm` : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                                }`}>
                                  {rank <= 3 ? React.createElement(rankIcons[rank - 1], { className: 'h-4 w-4' }) : <span className="text-xs font-bold">{rank}</span>}
                                </div>
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-emerald-400 to-teal-500 text-white">
                                    {entry.firstName[0]}{entry.lastName[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-semibold ${isCurrentUser ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-900 dark:text-gray-100'}`}>
                                    {entry.firstName} {entry.lastName} {isCurrentUser && `(${t('achievements.you')})`}
                                  </p>
                                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                    {t('achievements.level')} {entry.level} · {entry.badgeCount} {t('achievements.badges')}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Zap className="h-4 w-4 text-amber-500" />
                                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{entry.xp}</span>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="flex flex-col items-center gap-3 py-8 text-gray-400 dark:text-gray-500">
                        <EyeOff className="h-10 w-10" />
                        <p className="text-sm">{t('achievements.leaderboard_opt_out')}</p>
                        <Button variant="outline" size="sm" onClick={() => handleLeaderboardOptIn(true)}>
                          <Eye className="h-4 w-4 mr-2" />
                          {t('achievements.join_leaderboard')}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>
          </TabsContent>

          {/* ── Challenges Tab ─────────────────────────────────────── */}
          <TabsContent value="challenges">
            <AnimatePresence mode="wait">
              <motion.div
                key="challenges-tab"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className="space-y-4"
              >
                {/* Daily Challenge */}
                <Card className="border-0 shadow-sm rounded-xl border-l-4 border-l-amber-500 overflow-hidden">
                  <CardHeader className="pb-3 bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-900/10 dark:to-transparent">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-sm">
                        <Sun className="h-4 w-4" />
                      </div>
                      {t('achievements.daily_challenge')}
                      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-[10px]">
                        +50 XP
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        { title: t('achievements.daily_challenge_1'), desc: t('achievements.daily_challenge_1_desc'), xp: 50, progress: 60, icon: Brain },
                        { title: t('achievements.daily_challenge_2'), desc: t('achievements.daily_challenge_2_desc'), xp: 30, progress: 0, icon: BookOpen },
                        { title: t('achievements.daily_challenge_3'), desc: t('achievements.daily_challenge_3_desc'), xp: 20, progress: 100, icon: Target },
                      ].map((challenge, idx) => {
                        const Icon = challenge.icon;
                        return (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800"
                          >
                            <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${
                              challenge.progress === 100
                                ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white'
                                : challenge.progress > 0
                                  ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white'
                                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                            } shadow-sm`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{challenge.title}</p>
                                <Badge className={`text-[10px] ${
                                  challenge.progress === 100
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                }`}>
                                  {challenge.progress === 100 ? t('achievements.completed') : `+${challenge.xp} XP`}
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{challenge.desc}</p>
                              {challenge.progress > 0 && challenge.progress < 100 && (
                                <div className="mt-2">
                                  <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                                    <span>{challenge.progress}%</span>
                                  </div>
                                  <Progress value={challenge.progress} className="h-1.5" />
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Weekly Challenge */}
                <Card className="border-0 shadow-sm rounded-xl border-l-4 border-l-violet-500 overflow-hidden">
                  <CardHeader className="pb-3 bg-gradient-to-r from-violet-50/50 to-transparent dark:from-violet-900/10 dark:to-transparent">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-400 to-violet-500 text-white shadow-sm">
                        <Moon className="h-4 w-4" />
                      </div>
                      {t('achievements.weekly_challenge')}
                      <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 text-[10px]">
                        +200 XP
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 rounded-xl bg-gradient-to-r from-violet-50/30 to-teal-50/20 dark:from-violet-900/10 dark:to-teal-900/5 border border-violet-100/30 dark:border-violet-900/10">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('achievements.weekly_challenge_title')}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t('achievements.weekly_challenge_desc')}</p>
                        </div>
                        <CircularProgress value={45} size={56} strokeWidth={4} colorClass="stroke-violet-400">
                          <span className="text-xs font-bold text-gray-900 dark:text-gray-100">45%</span>
                        </CircularProgress>
                      </div>
                      <Progress value={45} className="h-2" />
                      <div className="flex items-center gap-2 mt-2">
                        <Clock className="h-3 w-3 text-gray-400" />
                        <p className="text-[10px] text-gray-400 dark:text-gray-500">{t('achievements.time_remaining')}: 3 {t('achievements.days')}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Achievement Streaks */}
                <Card className="border-0 shadow-sm rounded-xl border-l-4 border-l-rose-500 overflow-hidden">
                  <CardHeader className="pb-3 bg-gradient-to-r from-rose-50/50 to-transparent dark:from-rose-900/10 dark:to-transparent">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-rose-400 to-rose-500 text-white shadow-sm">
                        <Flame className="h-4 w-4" />
                      </div>
                      {t('achievements.streaks')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: t('achievements.current_streak'), value: 5, unit: t('achievements.days'), color: 'from-rose-400 to-rose-500' },
                        { label: t('achievements.longest_streak'), value: 12, unit: t('achievements.days'), color: 'from-amber-400 to-amber-500' },
                        { label: t('achievements.total_badges'), value: earnedBadges.length, unit: t('achievements.badges'), color: 'from-emerald-400 to-teal-500' },
                      ].map((stat, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.1 }}
                          className="flex flex-col items-center p-3 rounded-xl bg-gray-50/50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800"
                        >
                          <div className={`flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} text-white shadow-sm mb-2`}>
                            <span className="text-lg font-bold">{stat.value}</span>
                          </div>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 text-center">{stat.label}</p>
                          <p className="text-[9px] text-gray-400 dark:text-gray-500">{stat.unit}</p>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* ── Badge Detail Modal ─────────────────────────────────────── */}
      <BadgeDetailModal
        badge={selectedBadge}
        open={showBadgeDetail}
        onClose={() => { setShowBadgeDetail(false); setSelectedBadge(null); }}
        onShare={handleShare}
      />

      {/* ── Share Dialog ───────────────────────────────────────────── */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-emerald-500" />
              {t('achievements.share_with_parents')}
            </DialogTitle>
            <DialogDescription>
              {t('achievements.share_description')}
            </DialogDescription>
          </DialogHeader>
          {selectedBadge && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-sm">
                {React.createElement(iconMap[selectedBadge.icon] || Award, { className: 'h-5 w-5' })}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{selectedBadge.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{selectedBadge.description}</p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowShareDialog(false)}>
              {t('action.cancel')}
            </Button>
            <Button onClick={handleShareConfirm} className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
              <Share2 className="h-4 w-4 mr-2" />
              {t('achievements.share')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

// ── Label component (reuse from shadcn) ────────────────────────────────
function Label({ className, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement> & { className?: string }) {
  return <label className={className} {...props}>{children}</label>;
}
