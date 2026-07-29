'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Mail, Lock, User, ArrowRight, GraduationCap, Heart, Sparkles, Flower2, Eye, EyeOff, KeyRound, Info, Shield, Leaf } from 'lucide-react';
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

const DEMO_ACCOUNTS = [
  { email: 'demo@competencetrack.org', password: 'Demo2025!', role: 'SCHOOL_ADMIN', labelKey: 'auth.demo_admin', icon: Shield, colorClass: 'from-emerald-400 to-emerald-600 hover:from-emerald-500 hover:to-emerald-700 shadow-emerald-300/40 dark:shadow-emerald-900/40' },
  { email: 'demo.teacher@competencetrack.org', password: 'Demo2025!', role: 'TEACHER', labelKey: 'auth.demo_teacher', icon: GraduationCap, colorClass: 'from-teal-400 to-teal-600 hover:from-teal-500 hover:to-teal-700 shadow-teal-300/40 dark:shadow-teal-900/40' },
  { email: 'demo.student@competencetrack.org', password: 'Demo2025!', role: 'STUDENT', labelKey: 'auth.demo_student', icon: User, colorClass: 'from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 shadow-amber-300/40 dark:shadow-amber-900/40' },
  { email: 'demo.parent@competencetrack.org', password: 'Demo2025!', role: 'PARENT', labelKey: 'auth.demo_parent', icon: Heart, colorClass: 'from-violet-400 to-violet-600 hover:from-violet-500 hover:to-violet-700 shadow-violet-300/40 dark:shadow-violet-900/40' },
];

export default function AuthView() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        const user = await login(email, password);
        setCurrentUser(user);
        toast.success(t('auth.welcome_back'));
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
  };

  const handleDemoLogin = async (demoEmail: string, demoPassword: string) => {
    setDemoLoading(true);
    setMode('login');
    setEmail(demoEmail);
    setPassword(demoPassword);

    try {
      const user = await login(demoEmail, demoPassword);
      setCurrentUser(user);
      toast.success(t('auth.welcome_back'));
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-950 dark:via-gray-900 dark:to-emerald-950 p-4 md:p-8 relative overflow-hidden">
      {/* Animated floating geometric shapes background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large emerald circle */}
        <div className="absolute top-[15%] left-[10%] w-32 h-32 rounded-full bg-emerald-200/30 dark:bg-emerald-800/10 animate-float-slow" />
        {/* Medium teal square */}
        <div className="absolute top-[60%] right-[20%] w-20 h-20 rounded-xl bg-teal-200/25 dark:bg-teal-800/10 animate-float" />
        {/* Small amber circle */}
        <div className="absolute bottom-[25%] left-[25%] w-14 h-14 rounded-full bg-amber-200/20 dark:bg-amber-800/10 animate-float-reverse" />
        {/* Tiny emerald dot */}
        <div className="absolute top-[40%] right-[40%] w-8 h-8 rounded-full bg-emerald-300/15 dark:bg-emerald-700/10 animate-float" />
        {/* Medium violet square */}
        <div className="absolute top-[80%] left-[60%] w-16 h-16 rounded-lg bg-violet-200/20 dark:bg-violet-800/10 animate-float-reverse" />
        {/* Small teal circle */}
        <div className="absolute top-[30%] right-[70%] w-12 h-12 rounded-full bg-teal-200/20 dark:bg-teal-800/10 animate-float-slow" />
        {/* Dot grid overlay */}
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
          {/* Decorative circles */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="absolute -top-6 -left-6 w-20 h-20 rounded-full bg-emerald-200/50 dark:bg-emerald-800/30"
          />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full bg-teal-200/50 dark:bg-teal-800/30"
          />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="absolute top-12 -right-4 w-12 h-12 rounded-full bg-amber-200/50 dark:bg-amber-800/30"
          />
          {/* Main icon */}
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex items-center justify-center w-28 h-28 rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-2xl shadow-emerald-300/40 dark:shadow-emerald-900/40"
          >
            <GraduationCap className="w-14 h-14" />
          </motion.div>
        </div>
        {/* Feature highlights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-10 space-y-4 text-center"
        >
          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">{t('auth.mission_title')}</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('auth.feature_competencies')}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
                <Heart className="w-4 h-4" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('auth.feature_student_centered')}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                <BookOpen className="w-4 h-4" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('auth.feature_open_source')}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                <GraduationCap className="w-4 h-4" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('auth.feature_reports')}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
                <Flower2 className="w-4 h-4" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('auth.feature_flower')}</p>
            </div>
          </div>

          {/* Mockup dashboard preview */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="mt-6 p-4 rounded-2xl bg-white/70 dark:bg-gray-800/50 backdrop-blur-sm border border-emerald-200/40 dark:border-emerald-900/30 shadow-lg shadow-emerald-100/30 dark:shadow-emerald-900/10"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <div className="ml-2 flex-1 h-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30" />
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`h-8 rounded-md ${
                    i % 3 === 0 ? 'bg-gradient-to-br from-emerald-100 to-emerald-200/50 dark:from-emerald-900/30 dark:to-emerald-800/20'
                    : i % 3 === 1 ? 'bg-gradient-to-br from-teal-100 to-teal-200/50 dark:from-teal-900/30 dark:to-teal-800/20'
                    : 'bg-gradient-to-br from-amber-100 to-amber-200/50 dark:from-amber-900/30 dark:to-amber-800/20'
                  }`}
                />
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md md:max-w-lg"
      >
        {/* Branding */}
        <div className="text-center mb-8 lg:hidden">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white mb-4 shadow-lg shadow-emerald-200 dark:shadow-emerald-900"
          >
            <BookOpen className="w-8 h-8" />
          </motion.div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {t('app.name')}
          </h1>
          <p className="mt-2 text-sm text-emerald-600/70 dark:text-emerald-400/50">
            {t('app.subtitle')}
          </p>
        </div>

        {/* Auth Card */}
        <Card className="shadow-xl border-0 shadow-emerald-100/50 dark:shadow-emerald-900/20 rounded-2xl overflow-hidden bg-white dark:bg-gray-950">
          <CardHeader className="text-center pb-2 pt-8 bg-gradient-to-r from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/10 dark:to-teal-950/10">
            <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {mode === 'login' ? t('auth.login') : t('auth.register_title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 pb-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <AnimatePresence mode="wait">
                {mode === 'register' && (
                  <motion.div
                    key="name-fields"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="firstName" className="text-sm font-medium">{t('auth.firstName')}</Label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-400" />
                          <Input
                            id="firstName"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="pl-10 h-12 min-h-[44px] border-emerald-200/50 dark:border-emerald-900/30 focus:border-emerald-400 focus:ring-emerald-400/20 text-base"
                            placeholder={t('auth.firstName')}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName" className="text-sm font-medium">{t('auth.lastName')}</Label>
                        <Input
                          id="lastName"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="h-12 min-h-[44px] border-emerald-200/50 dark:border-emerald-900/30 focus:border-emerald-400 focus:ring-emerald-400/20 text-base"
                          placeholder={t('auth.lastName')}
                          required
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">{t('auth.email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 min-h-[44px] border-emerald-200/50 dark:border-emerald-900/30 focus:border-emerald-400 focus:ring-emerald-400/20 text-base"
                    placeholder="name@schule.de"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">{t('auth.password')}</Label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => toast.info('Demo: ' + t('polish.demo_email') + ' / ' + t('polish.demo_password'))}
                      className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium transition-colors"
                    >
                      {t('polish.forgot_password')}
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
              </div>

              {/* Remember me (login mode only) */}
              {mode === 'login' && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(v) => setRememberMe(v === true)}
                    className="border-emerald-300 dark:border-emerald-700 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                  />
                  <Label htmlFor="remember" className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                    {t('polish.remember_me')}
                  </Label>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 min-h-[44px] bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-300/30 dark:shadow-emerald-900/30 rounded-xl text-base"
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
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mt-5"
              >
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

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={toggleMode}
                className="text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium transition-colors"
              >
                {mode === 'login' ? t('auth.no_account') : t('auth.has_account')}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center flex items-center justify-center gap-1.5">
          <Leaf className="h-3.5 w-3.5 text-emerald-500/40 dark:text-emerald-400/30" />
          <p className="text-xs text-emerald-600/40 dark:text-emerald-400/30">
            {t('app.tagline')}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
