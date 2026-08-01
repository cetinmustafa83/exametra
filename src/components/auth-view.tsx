'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Mail, Lock, User, ArrowRight, GraduationCap, Heart, Sparkles, Flower2, Eye, EyeOff, KeyRound, Info, Shield, Leaf, Users as UsersIcon, HelpCircle, LockKeyhole, GitBranch, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { login, register } from '@/lib/api';
import { toast } from 'sonner';

type LoginRole = 'teacher' | 'student' | 'parent';

const DEMO_ACCOUNTS = [
  { email: 'demo@competencetrack.org', password: 'Demo2025!', role: 'SCHOOL_ADMIN', labelKey: 'auth.demo_admin', icon: Shield, colorClass: 'from-emerald-400 to-emerald-600 hover:from-emerald-500 hover:to-emerald-700 shadow-emerald-300/40 dark:shadow-emerald-900/40' },
  { email: 'demo.vice@competencetrack.org', password: 'Demo2025!', role: 'VICE_PRINCIPAL', labelKey: 'auth.demo_vice_principal', icon: Shield, colorClass: 'from-emerald-400 to-emerald-600 hover:from-emerald-500 hover:to-emerald-700 shadow-emerald-300/40 dark:shadow-emerald-900/40' },
  { email: 'demo.teacher@competencetrack.org', password: 'Demo2025!', role: 'TEACHER', labelKey: 'auth.demo_teacher', icon: GraduationCap, colorClass: 'from-teal-400 to-teal-600 hover:from-teal-500 hover:to-teal-700 shadow-teal-300/40 dark:shadow-teal-900/40' },
  { email: 'demo.student@competencetrack.org', password: 'Demo2025!', role: 'STUDENT', labelKey: 'auth.demo_student', icon: User, colorClass: 'from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 shadow-amber-300/40 dark:shadow-amber-900/40' },
  { email: 'demo.parent@competencetrack.org', password: 'Demo2025!', role: 'PARENT', labelKey: 'auth.demo_parent', icon: Heart, colorClass: 'from-violet-400 to-violet-600 hover:from-violet-500 hover:to-violet-700 shadow-violet-300/40 dark:shadow-violet-900/40' },
];

/* ─── Staggered entrance helpers ────────────────────────────── */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

/* ─── Floating particles ────────────────────────────────────── */
function FloatingParticles() {
  const particles = useMemo(() => [
    { id: 'p1', x: 8, y: 12, size: 6, opacity: 0.25, color: 'emerald', delay: 0, duration: 14 },
    { id: 'p2', x: 85, y: 18, size: 4, opacity: 0.2, color: 'teal', delay: 2, duration: 18 },
    { id: 'p3', x: 22, y: 65, size: 5, opacity: 0.18, color: 'amber', delay: 4, duration: 16 },
    { id: 'p4', x: 70, y: 75, size: 3, opacity: 0.22, color: 'violet', delay: 1, duration: 20 },
    { id: 'p5', x: 45, y: 88, size: 4, opacity: 0.15, color: 'emerald', delay: 3, duration: 12 },
    { id: 'p6', x: 92, y: 45, size: 5, opacity: 0.2, color: 'teal', delay: 5, duration: 15 },
    { id: 'p7', x: 15, y: 40, size: 3, opacity: 0.18, color: 'amber', delay: 6, duration: 22 },
    { id: 'p8', x: 55, y: 10, size: 4, opacity: 0.15, color: 'violet', delay: 2.5, duration: 17 },
    { id: 'p9', x: 35, y: 50, size: 2, opacity: 0.12, color: 'emerald', delay: 7, duration: 19 },
    { id: 'p10', x: 78, y: 55, size: 3, opacity: 0.16, color: 'teal', delay: 1.5, duration: 13 },
    { id: 'p11', x: 60, y: 30, size: 2, opacity: 0.14, color: 'amber', delay: 4.5, duration: 21 },
    { id: 'p12', x: 5, y: 80, size: 4, opacity: 0.2, color: 'violet', delay: 3.5, duration: 16 },
  ], []);

  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-400 dark:bg-emerald-500',
    teal: 'bg-teal-400 dark:bg-teal-500',
    amber: 'bg-amber-400 dark:bg-amber-500',
    violet: 'bg-violet-400 dark:bg-violet-500',
  };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className={`absolute rounded-full ${colorMap[p.color]}`}
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
          }}
          animate={{
            y: [0, -20, 10, -15, 0],
            x: [0, 8, -6, 12, 0],
            opacity: [p.opacity, p.opacity * 0.6, p.opacity * 1.2, p.opacity * 0.8, p.opacity],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: p.delay,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Decorative geometric shapes ───────────────────────────── */
function FloatingShapes() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Large circles */}
      <div className="absolute top-[10%] left-[8%] w-40 h-40 rounded-full bg-emerald-200/20 dark:bg-emerald-800/8 animate-float-slow" />
      <div className="absolute top-[55%] right-[15%] w-28 h-28 rounded-full bg-teal-200/18 dark:bg-teal-800/8 animate-float" />
      <div className="absolute bottom-[15%] left-[20%] w-20 h-20 rounded-full bg-amber-200/15 dark:bg-amber-800/8 animate-float-reverse" />

      {/* Rotated squares / diamonds */}
      <motion.div
        className="absolute top-[25%] right-[35%] w-12 h-12 rounded-xl bg-emerald-300/12 dark:bg-emerald-700/8"
        animate={{ rotate: [0, 90, 180, 270, 360] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute top-[70%] left-[45%] w-8 h-8 rounded-lg bg-violet-300/12 dark:bg-violet-700/8"
        animate={{ rotate: [360, 270, 180, 90, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute top-[15%] left-[50%] w-10 h-10 rounded-lg bg-teal-300/10 dark:bg-teal-700/8"
        animate={{ rotate: [0, -90, -180, -270, -360] }}
        transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
      />

      {/* Hexagonal shapes (approximated with rounded corners) */}
      <motion.div
        className="absolute bottom-[30%] right-[25%] w-16 h-16 rounded-2xl bg-amber-200/10 dark:bg-amber-800/8 border border-amber-300/10 dark:border-amber-700/10"
        animate={{ rotate: [0, 45, 0], scale: [1, 1.05, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-[45%] left-[5%] w-14 h-14 rounded-2xl bg-emerald-200/10 dark:bg-emerald-800/8 border border-emerald-300/10 dark:border-emerald-700/10"
        animate={{ rotate: [0, -30, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Dot grid overlay */}
      <div className="absolute inset-0 bg-dots opacity-20 dark:opacity-8" />
    </div>
  );
}

/* ─── Left-side illustration panel ──────────────────────────── */
function LeftIllustration({ loginRole }: { loginRole: LoginRole }) {
  const features = [
    { icon: Sparkles, labelKey: 'auth.feature_competencies', color: 'emerald' },
    { icon: Heart, labelKey: 'auth.feature_student_centered', color: 'teal' },
    { icon: BookOpen, labelKey: 'auth.feature_open_source', color: 'amber' },
    { icon: GraduationCap, labelKey: 'auth.feature_reports', color: 'violet' },
    { icon: Flower2, labelKey: 'auth.feature_flower', color: 'rose' },
  ];

  const colorClasses: Record<string, { bg: string; text: string; ring: string }> = {
    emerald: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-200/50 dark:ring-emerald-800/30' },
    teal: { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-600 dark:text-teal-400', ring: 'ring-teal-200/50 dark:ring-teal-800/30' },
    amber: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-200/50 dark:ring-amber-800/30' },
    violet: { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-600 dark:text-violet-400', ring: 'ring-violet-200/50 dark:ring-violet-800/30' },
    rose: { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-600 dark:text-rose-400', ring: 'ring-rose-200/50 dark:ring-rose-800/30' },
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
      className="hidden lg:flex flex-col items-center justify-center w-1/2 max-w-lg mr-12"
    >
      <div className="relative">
        {/* Decorative orbiting circles */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="absolute -top-8 -left-8 w-20 h-20 rounded-full bg-emerald-200/40 dark:bg-emerald-800/20 ring-4 ring-emerald-100/50 dark:ring-emerald-900/20"
        />
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="absolute -bottom-10 -right-10 w-24 h-24 rounded-full bg-teal-200/40 dark:bg-teal-800/20 ring-4 ring-teal-100/50 dark:ring-teal-900/20"
        />
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="absolute top-10 -right-6 w-12 h-12 rounded-full bg-amber-200/40 dark:bg-amber-800/20 ring-2 ring-amber-100/50 dark:ring-amber-900/20"
        />
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="absolute -bottom-4 -left-6 w-10 h-10 rounded-full bg-violet-200/40 dark:bg-violet-800/20 ring-2 ring-violet-100/50 dark:ring-violet-900/20"
        />

        {/* Main icon with role-based animation */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex items-center justify-center w-32 h-32 rounded-3xl bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-600 text-white shadow-2xl shadow-emerald-300/50 dark:shadow-emerald-900/50 ring-1 ring-white/20"
        >
          <AnimatePresence mode="wait">
            {loginRole === 'teacher' && (
              <motion.div key="teacher" initial={{ rotate: -90, opacity: 0, scale: 0.5 }} animate={{ rotate: 0, opacity: 1, scale: 1 }} exit={{ rotate: 90, opacity: 0, scale: 0.5 }} transition={{ duration: 0.35, type: 'spring', stiffness: 200 }}>
                <GraduationCap className="w-16 h-16" />
              </motion.div>
            )}
            {loginRole === 'student' && (
              <motion.div key="student" initial={{ rotate: -90, opacity: 0, scale: 0.5 }} animate={{ rotate: 0, opacity: 1, scale: 1 }} exit={{ rotate: 90, opacity: 0, scale: 0.5 }} transition={{ duration: 0.35, type: 'spring', stiffness: 200 }}>
                <UsersIcon className="w-16 h-16" />
              </motion.div>
            )}
            {loginRole === 'parent' && (
              <motion.div key="parent" initial={{ rotate: -90, opacity: 0, scale: 0.5 }} animate={{ rotate: 0, opacity: 1, scale: 1 }} exit={{ rotate: 90, opacity: 0, scale: 0.5 }} transition={{ duration: 0.35, type: 'spring', stiffness: 200 }}>
                <Heart className="w-16 h-16" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Feature highlights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
        className="mt-12 space-y-4 text-center"
      >
        <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 tracking-tight">
          {t('auth.mission_title')}
        </h3>
        <div className="space-y-3">
          {features.map((f, i) => {
            const c = colorClasses[f.color];
            return (
              <motion.div
                key={f.labelKey}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.8 + i * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className={`flex items-center justify-center w-9 h-9 rounded-xl ${c.bg} ${c.text} ring-1 ${c.ring}`}>
                  <f.icon className="w-4.5 h-4.5" />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">{t(f.labelKey)}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Mockup dashboard preview */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.3 }}
          className="mt-8 p-5 rounded-2xl bg-white/60 dark:bg-gray-800/40 backdrop-blur-md border border-emerald-200/30 dark:border-emerald-900/20 shadow-xl shadow-emerald-100/20 dark:shadow-emerald-900/10"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <div className="ml-3 flex-1 h-2.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={`h-10 rounded-lg ${i % 3 === 0 ? 'bg-gradient-to-br from-emerald-100 to-emerald-200/50 dark:from-emerald-900/30 dark:to-emerald-800/20' : i % 3 === 1 ? 'bg-gradient-to-br from-teal-100 to-teal-200/50 dark:from-teal-900/30 dark:to-teal-800/20' : 'bg-gradient-to-br from-amber-100 to-amber-200/50 dark:from-amber-900/30 dark:to-amber-800/20'}`} />
            ))}
          </div>
          <div className="mt-3 space-y-2">
            <div className="h-2 w-full rounded-full bg-emerald-100 dark:bg-emerald-900/30" />
            <div className="h-2 w-3/4 rounded-full bg-teal-100 dark:bg-teal-900/30" />
            <div className="h-2 w-1/2 rounded-full bg-amber-100 dark:bg-amber-900/30" />
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Main Auth View ────────────────────────────────────────── */
export default function AuthView() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loginRole, setLoginRole] = useState<LoginRole>('teacher');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [schoolIdInput, setSchoolIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showForgotInfo, setShowForgotInfo] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);

  // Input validation state
  const emailValid = email.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const emailTouched = email.length > 0;
  const passwordValid = password.length >= 6;
  const passwordTouched = password.length > 0;
  const firstNameValid = firstName.length > 0;
  const lastNameValid = lastName.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        const user = await login(email, password);
        setCurrentUser(user);
        if (user.role === 'STUDENT') {
          toast.success(t('auth.student_welcome'));
        } else if (user.role === 'PARENT') {
          toast.success(t('auth.parent_welcome'));
        } else {
          toast.success(t('auth.welcome_back'));
        }
      } else {
        const user = await register({
          email,
          password,
          firstName,
          lastName,
        });
        setCurrentUser(user);
        toast.success(t('toast.created'));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('auth.error.generic');
      if (message.includes('credentials') || message.includes('Invalid')) {
        toast.error(t('auth.error.invalid_credentials'));
      } else if (message.includes('already') || message.includes('registered')) {
        toast.error(t('auth.error.email_exists'));
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setSchoolIdInput('');
  };

  const handleDemoLogin = async (demoEmail: string, demoPassword: string) => {
    setDemoLoading(true);
    setMode('login');
    setEmail(demoEmail);
    setPassword(demoPassword);

    try {
      const user = await login(demoEmail, demoPassword);
      setCurrentUser(user);
      if (user.role === 'STUDENT') {
        toast.success(t('auth.student_welcome'));
      } else if (user.role === 'PARENT') {
        toast.success(t('auth.parent_welcome'));
      } else {
        toast.success(t('auth.welcome_back'));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('auth.error.generic');
      if (message.includes('credentials') || message.includes('Invalid')) {
        toast.error(t('auth.error.invalid_credentials'));
      } else {
        toast.error(message);
      }
    } finally {
      setDemoLoading(false);
    }
  };

  // Role tab config with enhanced visual distinction
  const roleTabs: Array<{
    key: LoginRole;
    icon: React.ElementType;
    labelKey: string;
    color: string;
    iconColor: string;
    activeColor: string;
    activeBg: string;
    bgGradient: string;
    hoverBg: string;
    indicatorColor: string;
    glowColor: string;
  }> = [
    {
      key: 'teacher',
      icon: GraduationCap,
      labelKey: 'auth.login',
      color: 'text-emerald-600 dark:text-emerald-400',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      activeColor: 'text-white',
      activeBg: 'bg-gradient-to-r from-emerald-500 to-teal-500',
      bgGradient: 'from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/10 dark:to-teal-950/10',
      hoverBg: 'hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20',
      indicatorColor: 'bg-emerald-500',
      glowColor: 'shadow-emerald-200/50 dark:shadow-emerald-900/30',
    },
    {
      key: 'student',
      icon: UsersIcon,
      labelKey: 'auth.student_login',
      color: 'text-emerald-600 dark:text-emerald-400',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      activeColor: 'text-white',
      activeBg: 'bg-gradient-to-r from-amber-500 to-orange-500',
      bgGradient: 'from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10',
      hoverBg: 'hover:bg-amber-50/60 dark:hover:bg-amber-950/20',
      indicatorColor: 'bg-amber-500',
      glowColor: 'shadow-amber-200/50 dark:shadow-amber-900/30',
    },
    {
      key: 'parent',
      icon: Heart,
      labelKey: 'auth.parent_login',
      color: 'text-emerald-600 dark:text-emerald-400',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      activeColor: 'text-white',
      activeBg: 'bg-gradient-to-r from-violet-500 to-purple-500',
      bgGradient: 'from-violet-50/50 to-purple-50/50 dark:from-violet-950/10 dark:to-purple-950/10',
      hoverBg: 'hover:bg-violet-50/60 dark:hover:bg-violet-950/20',
      indicatorColor: 'bg-violet-500',
      glowColor: 'shadow-violet-200/50 dark:shadow-violet-900/30',
    },
  ];

  const activeRoleTab = roleTabs.find((r) => r.key === loginRole)!;

  return (
    <div className="min-h-screen flex items-center justify-center animated-gradient-bg p-4 md:p-8 relative overflow-hidden">
      {/* Animated gradient background overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/80 via-white/60 to-teal-50/80 dark:from-gray-950/90 dark:via-gray-900/90 dark:to-emerald-950/90 pointer-events-none" />

      {/* Floating geometric shapes */}
      <FloatingShapes />

      {/* Floating particles */}
      <FloatingParticles />

      {/* Left illustration side (hidden on small screens) */}
      <LeftIllustration loginRole={loginRole} />

      {/* Auth form */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md md:max-w-lg relative z-10"
      >
        {/* Branding (mobile only) */}
        <div className="text-center mb-8 lg:hidden">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1, type: 'spring', stiffness: 180 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white mb-4 shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/50 ring-1 ring-white/20"
          >
            <BookOpen className="w-8 h-8" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight"
          >
            {t('app.name')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mt-2 text-sm text-emerald-600/70 dark:text-emerald-400/50"
          >
            {t('app.subtitle')}
          </motion.p>
        </div>

        {/* Auth Card - Glassmorphism */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <Card className="shadow-2xl border-0 shadow-emerald-100/60 dark:shadow-emerald-900/30 rounded-2xl overflow-hidden bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl ring-1 ring-white/40 dark:ring-gray-800/40">
            {/* Role tabs with enhanced visual distinction */}
            <div className="flex border-b border-gray-100/80 dark:border-gray-800/80 bg-gray-50/50 dark:bg-gray-900/30">
              {roleTabs.map((tab, i) => (
                <motion.button
                  key={tab.key}
                  type="button"
                  onClick={() => { setLoginRole(tab.key); setShowForgotInfo(false); }}
                  className={`relative flex-1 min-h-[48px] flex items-center justify-center gap-2 px-3 py-3.5 text-sm font-semibold transition-all duration-300 ${
                    loginRole === tab.key
                      ? `${tab.activeBg} ${tab.activeColor} shadow-sm ${tab.glowColor}`
                      : `${tab.color} bg-transparent ${tab.hoverBg}`
                  }`}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 + i * 0.05 }}
                  whileHover={{ scale: loginRole === tab.key ? 1 : 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <tab.icon className={`h-4.5 w-4.5 ${loginRole === tab.key ? 'text-white' : tab.iconColor}`} />
                  <span>{t(tab.labelKey)}</span>
                  {/* Active indicator */}
                  {loginRole === tab.key && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-white/60"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </motion.button>
              ))}
            </div>

            <CardHeader className={`text-center pb-2 pt-6 bg-gradient-to-r ${activeRoleTab.bgGradient} transition-all duration-300`}>
              <AnimatePresence mode="wait">
                <motion.div key={loginRole} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.25 }}>
                  <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {loginRole === 'teacher' ? (mode === 'login' ? t('auth.login') : t('auth.register_title'))
                      : loginRole === 'student' ? t('auth.student_login')
                      : t('auth.parent_login')}
                  </CardTitle>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                    {loginRole === 'teacher' ? (mode === 'login' ? t('auth.login_subtitle') : t('auth.register_subtitle'))
                      : loginRole === 'student' ? t('auth.student_login_desc')
                      : t('auth.parent_login_desc')}
                  </p>
                </motion.div>
              </AnimatePresence>
            </CardHeader>

            <CardContent className="pt-6 pb-6">
              <motion.form
                onSubmit={handleSubmit}
                className="space-y-5"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                <AnimatePresence mode="wait">
                  {/* Name fields for register (teacher only) */}
                  {mode === 'register' && loginRole === 'teacher' && (
                    <motion.div key="name-fields" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="space-y-4">
                      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="firstName" className="text-sm font-medium">{t('auth.firstName')}</Label>
                          <div className="relative">
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-400" />
                            <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={`pl-10 pr-9 h-12 min-h-[44px] bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm transition-all duration-200 ${
                              firstName.length > 0 && firstNameValid ? 'input-valid border-emerald-400 dark:border-emerald-500'
                                : firstName.length > 0 && !firstNameValid ? 'input-invalid border-red-300 dark:border-red-700'
                                : 'border-emerald-200/50 dark:border-emerald-900/30 focus:border-emerald-400 focus:ring-emerald-400/20'
                            }`} placeholder={t('auth.firstName')} required />
                            {firstName.length > 0 && (
                              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                                {firstNameValid ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-red-400" />}
                              </motion.div>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName" className="text-sm font-medium">{t('auth.lastName')}</Label>
                          <div className="relative">
                            <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} className={`pr-9 h-12 min-h-[44px] bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm transition-all duration-200 ${
                              lastName.length > 0 && lastNameValid ? 'input-valid border-emerald-400 dark:border-emerald-500'
                                : lastName.length > 0 && !lastNameValid ? 'input-invalid border-red-300 dark:border-red-700'
                                : 'border-emerald-200/50 dark:border-emerald-900/30 focus:border-emerald-400 focus:ring-emerald-400/20'
                            }`} placeholder={t('auth.lastName')} required />
                            {lastName.length > 0 && (
                              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                                {lastNameValid ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-red-400" />}
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}

                  {/* Student-specific: School ID field */}
                  {loginRole === 'student' && (
                    <motion.div key="school-id" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="space-y-2">
                      <Label htmlFor="schoolId" className="text-sm font-medium">{t('auth.school_id')}</Label>
                      <div className="relative">
                        <Info className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                        <Input id="schoolId" value={schoolIdInput} onChange={(e) => setSchoolIdInput(e.target.value)} className="pl-10 h-12 min-h-[44px] border-emerald-200/50 dark:border-emerald-900/30 focus:border-emerald-400 focus:ring-emerald-400/20 text-base bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm" placeholder={t('auth.school_id')} />
                      </div>
                    </motion.div>
                  )}

                  {/* Parent-specific: name fields on login */}
                  {loginRole === 'parent' && mode === 'login' && (
                    <motion.div key="parent-name" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}>
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100/50 dark:border-emerald-900/20 backdrop-blur-sm">
                        <Heart className="h-4 w-4 text-emerald-500" />
                        <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">{t('auth.parent_login_desc')}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Email field (always shown) with validation feedback */}
                <motion.div variants={itemVariants} className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">{t('auth.email')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-400" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`pl-10 pr-10 h-12 min-h-[44px] text-base bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm transition-all duration-200 ${
                        emailTouched && emailValid ? 'input-valid border-emerald-400 dark:border-emerald-500 focus:border-emerald-500 focus:ring-emerald-400/20'
                          : emailTouched && !emailValid ? 'input-invalid border-red-300 dark:border-red-700 focus:border-red-400 focus:ring-red-400/20'
                          : 'border-emerald-200/50 dark:border-emerald-900/30 focus:border-emerald-400 focus:ring-emerald-400/20'
                      } ${
                        loginRole === 'student' ? 'focus:border-amber-400 focus:ring-amber-400/20'
                          : loginRole === 'parent' ? 'focus:border-violet-400 focus:ring-violet-400/20'
                          : ''
                      }`}
                      placeholder={loginRole === 'student' ? 'name@schule.de' : loginRole === 'parent' ? 'parent@email.de' : 'name@schule.de'}
                      required
                    />
                    {/* Validation icon */}
                    {emailTouched && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2"
                      >
                        {emailValid ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-400" />
                        )}
                      </motion.div>
                    )}
                  </div>
                </motion.div>

                {/* Password field with validation feedback */}
                <motion.div variants={itemVariants} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium">{t('auth.password')}</Label>
                    {mode === 'login' && (
                      <motion.button
                        type="button"
                        onClick={() => setShowForgotModal(true)}
                        className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {t('auth.forgot_password')}
                      </motion.button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-400" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`pl-9 pr-12 h-12 min-h-[44px] bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm transition-all duration-200 ${
                        passwordTouched && passwordValid ? 'input-valid border-emerald-400 dark:border-emerald-500 focus:border-emerald-500 focus:ring-emerald-400/20'
                          : passwordTouched && !passwordValid ? 'input-invalid border-red-300 dark:border-red-700 focus:border-red-400 focus:ring-red-400/20'
                          : 'border-emerald-200/50 dark:border-emerald-900/30 focus:border-emerald-400 focus:ring-emerald-400/20'
                      }`}
                      placeholder="••••••"
                      minLength={6}
                      required
                    />
                    {/* Validation icon */}
                    {passwordTouched && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        className="absolute right-10 top-1/2 -translate-y-1/2"
                      >
                        {passwordValid ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-400" />
                        )}
                      </motion.div>
                    )}
                    <motion.button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-300 transition-colors w-6 h-6 flex items-center justify-center"
                      tabIndex={-1}
                      aria-label={showPassword ? t('polish.hide_password') : t('polish.show_password')}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </motion.button>
                  </div>

                  {/* Password strength indicator (register mode) */}
                  {mode === 'register' && passwordTouched && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.2 }}>
                      <div className="flex gap-1 mt-1">
                        {[1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                              password.length >= level * 2
                                ? level <= 1 ? 'bg-red-400'
                                  : level <= 2 ? 'bg-amber-400'
                                  : level <= 3 ? 'bg-emerald-400'
                                  : 'bg-teal-400'
                                : 'bg-gray-200 dark:bg-gray-700'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-[10px] mt-1 text-gray-500 dark:text-gray-400">
                        {password.length < 4 ? t('auth.password_weak') || 'Weak' : password.length < 6 ? t('auth.password_fair') || 'Fair' : password.length < 8 ? t('auth.password_good') || 'Good' : t('auth.password_strong') || 'Strong'}
                      </p>
                    </motion.div>
                  )}

                  {/* Forgot Password info */}
                  <AnimatePresence>
                    {showForgotInfo && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="mt-2">
                        <div className="flex items-start gap-2 px-3 py-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200/30 dark:border-emerald-900/20 backdrop-blur-sm">
                          <HelpCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                          <p className="text-xs text-emerald-700 dark:text-emerald-300">
                            {loginRole === 'student'
                              ? (t('polish.demo_email') + ': demo.student@competencetrack.org / ' + t('polish.demo_password') + ': Demo2025!')
                              : loginRole === 'parent'
                              ? (t('polish.demo_email') + ': demo.parent@competencetrack.org / ' + t('polish.demo_password') + ': Demo2025!')
                              : (t('polish.demo_email') + ': demo@competencetrack.org / ' + t('polish.demo_password') + ': Demo2025!')
                            }
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Remember me (login mode only) */}
                {mode === 'login' && (
                  <motion.div variants={itemVariants} className="flex items-center gap-2">
                    <Checkbox id="remember" checked={rememberMe} onCheckedChange={(v) => setRememberMe(v === true)} className="border-emerald-300 dark:border-emerald-700 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500" />
                    <Label htmlFor="remember" className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer">{t('polish.remember_me')}</Label>
                  </motion.div>
                )}

                {/* Submit button with glow effect */}
                <motion.div variants={itemVariants}>
                  <Button
                    type="submit"
                    className={`group relative w-full h-12 min-h-[44px] text-white shadow-lg rounded-xl text-base font-semibold overflow-hidden transition-all duration-300 ${
                      loginRole === 'teacher' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-emerald-300/30 dark:shadow-emerald-900/30 hover:shadow-emerald-300/50 dark:hover:shadow-emerald-900/50'
                        : loginRole === 'student' ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-300/30 dark:shadow-amber-900/30 hover:shadow-amber-300/50 dark:hover:shadow-amber-900/50'
                        : 'bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 shadow-violet-300/30 dark:shadow-violet-900/30 hover:shadow-violet-300/50 dark:hover:shadow-violet-900/50'
                    }`}
                    disabled={loading || demoLoading}
                  >
                    {/* Glow effect layer */}
                    <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-white/10" />
                    <motion.div
                      className="absolute inset-0 rounded-xl"
                      animate={{
                        boxShadow: loginRole === 'teacher'
                          ? ['0 0 0px rgba(16,185,129,0)', '0 0 20px rgba(16,185,129,0.15)', '0 0 0px rgba(16,185,129,0)']
                          : loginRole === 'student'
                          ? ['0 0 0px rgba(245,158,11,0)', '0 0 20px rgba(245,158,11,0.15)', '0 0 0px rgba(245,158,11,0)']
                          : ['0 0 0px rgba(139,92,246,0)', '0 0 20px rgba(139,92,246,0.15)', '0 0 0px rgba(139,92,246,0)'],
                      }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {loading || demoLoading ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          {demoLoading ? t('auth.demo_logging_in') : t('empty.loading')}
                        </>
                      ) : (
                        <>
                          {mode === 'login' ? t('auth.login') : t('auth.register')}
                          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                        </>
                      )}
                    </span>
                  </Button>
                </motion.div>
              </motion.form>

              {/* Role-specific demo login buttons */}
              {mode === 'login' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                  className="mt-6"
                >
                  <div className="text-center mb-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <KeyRound className="h-3.5 w-3.5 text-emerald-500" />
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('auth.demo_section_title')}</p>
                      <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200/50 dark:border-emerald-900/30 text-[10px] px-1.5 py-0">{t('badge.demo')}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('auth.demo_section_subtitle')}</p>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {DEMO_ACCOUNTS.map((demo, i) => (
                      <motion.div
                        key={demo.email}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.35 + i * 0.06, duration: 0.3 }}
                      >
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleDemoLogin(demo.email, demo.password)}
                          disabled={loading || demoLoading}
                          className={`group h-12 w-full px-4 rounded-xl border-0 bg-gradient-to-r ${demo.colorClass} text-white font-semibold text-sm shadow-lg flex items-center justify-center gap-2 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all duration-200`}
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/90 text-emerald-600">
                            <demo.icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                          </span>
                          <span className="truncate">{t(demo.labelKey)}</span>
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Toggle register/login (only for teacher role) */}
              {loginRole === 'teacher' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="mt-6 text-center"
                >
                  <motion.button
                    type="button"
                    onClick={toggleMode}
                    className="text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {mode === 'login' ? t('auth.no_account') : t('auth.has_account')}
                  </motion.button>
                </motion.div>
              )}

              {/* Student info: accounts created by teachers */}
              {loginRole === 'student' && mode === 'login' && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mt-5 text-center space-y-2"
                >
                  <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/30 dark:border-amber-900/20 backdrop-blur-sm">
                    <Info className="h-4 w-4 text-amber-500" />
                    <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                      {t('auth.create_student_account')} — {t('auth.student_login_desc')}
                    </p>
                  </div>
                  {/* Jugendschutz notice for students */}
                  <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200/30 dark:border-emerald-900/20 backdrop-blur-sm">
                    <Shield className="h-4 w-4 text-emerald-500" />
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                      {t('dsgvo.jugendschutz_login_notice')}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Parent info */}
              {loginRole === 'parent' && mode === 'login' && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mt-5 text-center"
                >
                  <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-violet-50/50 dark:bg-violet-900/10 border border-violet-200/30 dark:border-violet-900/20 backdrop-blur-sm">
                    <Heart className="h-4 w-4 text-violet-500" />
                    <p className="text-xs text-violet-700 dark:text-violet-300 font-medium">
                      {t('parent.my_children')} — {t('auth.parent_login_desc')}
                    </p>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="mt-8 text-center flex items-center justify-center gap-1.5"
        >
          <Leaf className="h-3.5 w-3.5 text-emerald-500/40 dark:text-emerald-400/30" />
          <p className="text-xs text-emerald-600/40 dark:text-emerald-400/30">{t('app.tagline')}</p>
        </motion.div>
      </motion.div>

      {/* Forgot Password Modal */}
      <Dialog open={showForgotModal} onOpenChange={setShowForgotModal}>
        <DialogContent className="sm:max-w-md glass-card rounded-2xl border-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-sm">
                <LockKeyhole className="h-4 w-4" />
              </div>
              {t('auth.forgot_password')}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {t('auth.forgot_password_desc') || 'Enter your email address and we will send you a link to reset your password.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {forgotSent ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                className="flex flex-col items-center py-4"
              >
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-4">
                  <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">{t('auth.forgot_email_sent') || 'Reset link sent!'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">{t('auth.forgot_check_inbox') || 'Check your inbox for the password reset link.'}</p>
              </motion.div>
            ) : (
              <>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-400" />
                  <Input
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="pl-10 h-12 border-emerald-200/50 dark:border-emerald-900/30 focus:border-emerald-400 focus:ring-emerald-400/20 bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm"
                    placeholder="name@schule.de"
                    type="email"
                  />
                </div>
                {/* Demo credentials reminder */}
                <div className="flex items-start gap-2 px-3 py-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200/30 dark:border-emerald-900/20 backdrop-blur-sm">
                  <HelpCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    {t('polish.demo_email')}: demo@competencetrack.org / {t('polish.demo_password')}: Demo2025!
                  </p>
                </div>
              </>
            )}
          </div>
          <DialogFooter className="flex-row gap-2 sm:justify-end">
            {forgotSent ? (
              <Button
                onClick={() => { setShowForgotModal(false); setForgotSent(false); setForgotEmail(''); }}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white min-h-[44px] px-5 font-semibold"
              >
                {t('auth.back_to_login') || 'Back to login'}
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowForgotModal(false)}
                  className="min-h-[44px] px-4"
                >
                  {t('auth.cancel') || 'Cancel'}
                </Button>
                <Button
                  onClick={() => { setForgotSent(true); toast.success(t('auth.forgot_email_sent') || 'Reset link sent!'); }}
                  disabled={!forgotEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white min-h-[44px] px-5 font-semibold"
                >
                  {t('auth.send_reset_link') || 'Send reset link'}
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
