'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Mail, Lock, User, ArrowRight, GraduationCap, Heart, Sparkles, Flower2, Eye, EyeOff, KeyRound, Info, Shield, Leaf, Users as UsersIcon, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { login, register } from '@/lib/api';
import { toast } from 'sonner';

type LoginRole = 'teacher' | 'student' | 'parent';

const DEMO_ACCOUNTS = [
  { email: 'demo@competencetrack.org', password: 'Demo2025!', role: 'SCHOOL_ADMIN', labelKey: 'auth.demo_admin', icon: Shield, colorClass: 'from-emerald-400 to-emerald-600 hover:from-emerald-500 hover:to-emerald-700 shadow-emerald-300/40 dark:shadow-emerald-900/40' },
  { email: 'demo.teacher@competencetrack.org', password: 'Demo2025!', role: 'TEACHER', labelKey: 'auth.demo_teacher', icon: GraduationCap, colorClass: 'from-teal-400 to-teal-600 hover:from-teal-500 hover:to-teal-700 shadow-teal-300/40 dark:shadow-teal-900/40' },
  { email: 'demo.student@competencetrack.org', password: 'Demo2025!', role: 'STUDENT', labelKey: 'auth.demo_student', icon: User, colorClass: 'from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 shadow-amber-300/40 dark:shadow-amber-900/40' },
  { email: 'demo.parent@competencetrack.org', password: 'Demo2025!', role: 'PARENT', labelKey: 'auth.demo_parent', icon: Heart, colorClass: 'from-violet-400 to-violet-600 hover:from-violet-500 hover:to-violet-700 shadow-violet-300/40 dark:shadow-violet-900/40' },
];

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
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);

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

  // Role tab config
  const roleTabs: Array<{ key: LoginRole; icon: React.ElementType; labelKey: string; color: string; activeColor: string; bgGradient: string }> = [
    { key: 'teacher', icon: GraduationCap, labelKey: 'auth.login', color: 'text-emerald-600 dark:text-emerald-400', activeColor: 'bg-emerald-500 text-white', bgGradient: 'from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/10 dark:to-teal-950/10' },
    { key: 'student', icon: UsersIcon, labelKey: 'auth.student_login', color: 'text-amber-600 dark:text-amber-400', activeColor: 'bg-amber-500 text-white', bgGradient: 'from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10' },
    { key: 'parent', icon: Heart, labelKey: 'auth.parent_login', color: 'text-violet-600 dark:text-violet-400', activeColor: 'bg-violet-500 text-white', bgGradient: 'from-violet-50/50 to-purple-50/50 dark:from-violet-950/10 dark:to-purple-950/10' },
  ];

  const activeRoleTab = roleTabs.find((r) => r.key === loginRole)!;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-950 dark:via-gray-900 dark:to-emerald-950 p-4 md:p-8 relative overflow-hidden">
      {/* Animated floating geometric shapes background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[15%] left-[10%] w-32 h-32 rounded-full bg-emerald-200/30 dark:bg-emerald-800/10 animate-float-slow" />
        <div className="absolute top-[60%] right-[20%] w-20 h-20 rounded-xl bg-teal-200/25 dark:bg-teal-800/10 animate-float" />
        <div className="absolute bottom-[25%] left-[25%] w-14 h-14 rounded-full bg-amber-200/20 dark:bg-amber-800/10 animate-float-reverse" />
        <div className="absolute top-[40%] right-[40%] w-8 h-8 rounded-full bg-emerald-300/15 dark:bg-emerald-700/10 animate-float" />
        <div className="absolute top-[80%] left-[60%] w-16 h-16 rounded-lg bg-violet-200/20 dark:bg-violet-800/10 animate-float-reverse" />
        <div className="absolute top-[30%] right-[70%] w-12 h-12 rounded-full bg-teal-200/20 dark:bg-teal-800/10 animate-float-slow" />
        <div className="absolute inset-0 bg-dots opacity-30 dark:opacity-10" />
      </div>

      {/* Left illustration side (hidden on small screens) */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="hidden lg:flex flex-col items-center justify-center w-1/2 max-w-md mr-8"
      >
        <div className="relative">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.5, delay: 0.3 }} className="absolute -top-6 -left-6 w-20 h-20 rounded-full bg-emerald-200/50 dark:bg-emerald-800/30" />
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.5, delay: 0.4 }} className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full bg-teal-200/50 dark:bg-teal-800/30" />
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.5, delay: 0.5 }} className="absolute top-12 -right-4 w-12 h-12 rounded-full bg-amber-200/50 dark:bg-amber-800/30" />
          {/* Main icon changes based on login role */}
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex items-center justify-center w-28 h-28 rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-2xl shadow-emerald-300/40 dark:shadow-emerald-900/40"
          >
            <AnimatePresence mode="wait">
              {loginRole === 'teacher' && <motion.div key="teacher" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.3 }}><GraduationCap className="w-14 h-14" /></motion.div>}
              {loginRole === 'student' && <motion.div key="student" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.3 }}><UsersIcon className="w-14 h-14" /></motion.div>}
              {loginRole === 'parent' && <motion.div key="parent" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.3 }}><Heart className="w-14 h-14" /></motion.div>}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Feature highlights */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }} className="mt-10 space-y-4 text-center">
          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">{t('auth.mission_title')}</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"><Sparkles className="w-4 h-4" /></div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('auth.feature_competencies')}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400"><Heart className="w-4 h-4" /></div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('auth.feature_student_centered')}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"><BookOpen className="w-4 h-4" /></div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('auth.feature_open_source')}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400"><GraduationCap className="w-4 h-4" /></div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('auth.feature_reports')}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400"><Flower2 className="w-4 h-4" /></div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('auth.feature_flower')}</p>
            </div>
          </div>

          {/* Mockup dashboard preview */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.8 }} className="mt-6 p-4 rounded-2xl bg-white/70 dark:bg-gray-800/50 backdrop-blur-sm border border-emerald-200/40 dark:border-emerald-900/30 shadow-lg shadow-emerald-100/30 dark:shadow-emerald-900/10">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <div className="ml-2 flex-1 h-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30" />
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className={`h-8 rounded-md ${i % 3 === 0 ? 'bg-gradient-to-br from-emerald-100 to-emerald-200/50 dark:from-emerald-900/30 dark:to-emerald-800/20' : i % 3 === 1 ? 'bg-gradient-to-br from-teal-100 to-teal-200/50 dark:from-teal-900/30 dark:to-teal-800/20' : 'bg-gradient-to-br from-amber-100 to-amber-200/50 dark:from-amber-900/30 dark:to-amber-800/20'}`} />
              ))}
            </div>
            <div className="mt-3 space-y-1.5">
              <div className="h-1.5 w-full rounded-full bg-emerald-100 dark:bg-emerald-900/30" />
              <div className="h-1.5 w-3/4 rounded-full bg-teal-100 dark:bg-teal-900/30" />
              <div className="h-1.5 w-1/2 rounded-full bg-amber-100 dark:bg-amber-900/30" />
            </div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Auth form */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md md:max-w-lg">
        {/* Branding */}
        <div className="text-center mb-8 lg:hidden">
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ duration: 0.5, delay: 0.1 }} className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white mb-4 shadow-lg shadow-emerald-200 dark:shadow-emerald-900">
            <BookOpen className="w-8 h-8" />
          </motion.div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('app.name')}</h1>
          <p className="mt-2 text-sm text-emerald-600/70 dark:text-emerald-400/50">{t('app.subtitle')}</p>
        </div>

        {/* Auth Card */}
        <Card className="shadow-xl border-0 shadow-emerald-100/50 dark:shadow-emerald-900/20 rounded-2xl overflow-hidden bg-white dark:bg-gray-950">
          {/* Role tabs */}
          <div className="flex border-b border-gray-100 dark:border-gray-800">
            {roleTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => { setLoginRole(tab.key); setShowForgotInfo(false); }}
                className={`flex-1 min-h-[44px] flex items-center justify-center gap-2 px-3 py-3 text-sm font-semibold transition-all duration-200 ${
                  loginRole === tab.key
                    ? `${tab.activeColor} shadow-sm`
                    : `${tab.color} bg-transparent hover:bg-gray-50 dark:hover:bg-gray-900/30`
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{t(tab.labelKey)}</span>
              </button>
            ))}
          </div>

          <CardHeader className={`text-center pb-2 pt-6 bg-gradient-to-r ${activeRoleTab.bgGradient}`}>
            <AnimatePresence mode="wait">
              <motion.div key={loginRole} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.2 }}>
                <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {loginRole === 'teacher' ? (mode === 'login' ? t('auth.login') : t('auth.register_title'))
                    : loginRole === 'student' ? t('auth.student_login')
                    : t('auth.parent_login')}
                </CardTitle>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {loginRole === 'teacher' ? (mode === 'login' ? t('auth.login_subtitle') : t('auth.register_subtitle'))
                    : loginRole === 'student' ? t('auth.student_login_desc')
                    : t('auth.parent_login_desc')}
                </p>
              </motion.div>
            </AnimatePresence>
          </CardHeader>

          <CardContent className="pt-6 pb-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <AnimatePresence mode="wait">
                {/* Name fields for register (teacher only) */}
                {mode === 'register' && loginRole === 'teacher' && (
                  <motion.div key="name-fields" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="firstName" className="text-sm font-medium">{t('auth.firstName')}</Label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-400" />
                          <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="pl-10 h-12 min-h-[44px] border-emerald-200/50 dark:border-emerald-900/30 focus:border-emerald-400 focus:ring-emerald-400/20 text-base" placeholder={t('auth.firstName')} required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName" className="text-sm font-medium">{t('auth.lastName')}</Label>
                        <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} className="h-12 min-h-[44px] border-emerald-200/50 dark:border-emerald-900/30 focus:border-emerald-400 focus:ring-emerald-400/20 text-base" placeholder={t('auth.lastName')} required />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Student-specific: School ID field */}
                {loginRole === 'student' && (
                  <motion.div key="school-id" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="space-y-2">
                    <Label htmlFor="schoolId" className="text-sm font-medium">{t('auth.school_id')}</Label>
                    <div className="relative">
                      <Info className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-amber-400" />
                      <Input id="schoolId" value={schoolIdInput} onChange={(e) => setSchoolIdInput(e.target.value)} className="pl-10 h-12 min-h-[44px] border-amber-200/50 dark:border-amber-900/30 focus:border-amber-400 focus:ring-amber-400/20 text-base" placeholder={t('auth.school_id')} />
                    </div>
                  </motion.div>
                )}

                {/* Parent-specific: name fields on login */}
                {loginRole === 'parent' && mode === 'login' && (
                  <motion.div key="parent-name" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-50/50 dark:bg-violet-900/10 border border-violet-100/50 dark:border-violet-900/20 mb-4">
                      <Heart className="h-4 w-4 text-violet-500" />
                      <p className="text-xs text-violet-700 dark:text-violet-300 font-medium">{t('auth.parent_login_desc')}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email field (always shown) */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">{t('auth.email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`pl-10 h-12 min-h-[44px] border-emerald-200/50 dark:border-emerald-900/30 focus:border-emerald-400 focus:ring-emerald-400/20 text-base ${
                      loginRole === 'student' ? 'focus:border-amber-400 focus:ring-amber-400/20'
                        : loginRole === 'parent' ? 'focus:border-violet-400 focus:ring-violet-400/20'
                        : ''
                    }`}
                    placeholder={loginRole === 'student' ? 'name@schule.de' : loginRole === 'parent' ? 'parent@email.de' : 'name@schule.de'}
                    required
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">{t('auth.password')}</Label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setShowForgotInfo(!showForgotInfo)}
                      className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium transition-colors"
                    >
                      {t('auth.forgot_password')}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-10 border-emerald-200/50 dark:border-emerald-900/30 focus:border-emerald-400 focus:ring-emerald-400/20"
                    placeholder="••••••"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-300 transition-colors w-10 h-10 flex items-center justify-center"
                    tabIndex={-1}
                    aria-label={showPassword ? t('polish.hide_password') : t('polish.show_password')}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                {/* Forgot Password info */}
                <AnimatePresence>
                  {showForgotInfo && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="mt-2">
                      <div className="flex items-start gap-2 px-3 py-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200/30 dark:border-emerald-900/20">
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
              </div>

              {/* Remember me (login mode only) */}
              {mode === 'login' && (
                <div className="flex items-center gap-2">
                  <Checkbox id="remember" checked={rememberMe} onCheckedChange={(v) => setRememberMe(v === true)} className="border-emerald-300 dark:border-emerald-700 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500" />
                  <Label htmlFor="remember" className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer">{t('polish.remember_me')}</Label>
                </div>
              )}

              {/* Submit button */}
              <Button
                type="submit"
                className={`w-full h-12 min-h-[44px] text-white shadow-lg rounded-xl text-base ${
                  loginRole === 'teacher' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-emerald-300/30 dark:shadow-emerald-900/30'
                    : loginRole === 'student' ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-300/30 dark:shadow-amber-900/30'
                    : 'bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 shadow-violet-300/30 dark:shadow-violet-900/30'
                }`}
                disabled={loading || demoLoading}
              >
                {loading || demoLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {demoLoading ? t('auth.demo_logging_in') : t('empty.loading')}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    {mode === 'login' ? t('auth.login') : t('auth.register')}
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>

            {/* Role-specific demo login buttons */}
            {mode === 'login' && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-5">
                <div className="text-center mb-3">
                  <div className="flex items-center justify-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-amber-500" />
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('auth.demo_section_title')}</p>
                    <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200/50 dark:border-amber-900/30 text-[10px] px-1.5 py-0">{t('badge.demo')}</Badge>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('auth.demo_section_subtitle')}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {DEMO_ACCOUNTS.map((demo) => (
                    <Button
                      key={demo.email}
                      type="button"
                      variant="outline"
                      onClick={() => handleDemoLogin(demo.email, demo.password)}
                      disabled={loading || demoLoading}
                      className={`h-auto min-h-[44px] py-3 px-3 rounded-xl border-0 bg-gradient-to-br ${demo.colorClass} text-white font-semibold text-xs shadow-lg flex flex-col items-center gap-1.5 hover:shadow-xl transition-all`}
                    >
                      <demo.icon className="h-5 w-5" />
                      <span>{t(demo.labelKey)}</span>
                    </Button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Toggle register/login (only for teacher role) */}
            {loginRole === 'teacher' && (
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={toggleMode}
                  className="text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium transition-colors"
                >
                  {mode === 'login' ? t('auth.no_account') : t('auth.has_account')}
                </button>
              </div>
            )}

            {/* Student info: accounts created by teachers */}
            {loginRole === 'student' && mode === 'login' && (
              <div className="mt-5 text-center">
                <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/30 dark:border-amber-900/20">
                  <Info className="h-4 w-4 text-amber-500" />
                  <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                    {t('auth.create_student_account')} — {t('auth.student_login_desc')}
                  </p>
                </div>
                {/* Jugendschutz notice for students */}
                <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200/30 dark:border-emerald-900/20 mt-2">
                  <Shield className="h-4 w-4 text-emerald-500" />
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                    {t('dsgvo.jugendschutz_login_notice')}
                  </p>
                </div>
              </div>
            )}

            {/* Parent info */}
            {loginRole === 'parent' && mode === 'login' && (
              <div className="mt-5 text-center">
                <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-violet-50/50 dark:bg-violet-900/10 border border-violet-200/30 dark:border-violet-900/20">
                  <Heart className="h-4 w-4 text-violet-500" />
                  <p className="text-xs text-violet-700 dark:text-violet-300 font-medium">
                    {t('parent.my_children')} — {t('auth.parent_login_desc')}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center flex items-center justify-center gap-1.5">
          <Leaf className="h-3.5 w-3.5 text-emerald-500/40 dark:text-emerald-400/30" />
          <p className="text-xs text-emerald-600/40 dark:text-emerald-400/30">{t('app.tagline')}</p>
        </div>
      </motion.div>
    </div>
  );
}
