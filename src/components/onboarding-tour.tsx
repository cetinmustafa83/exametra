'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, BookOpen, BarChart3, Pencil, Flower2, FileText, PartyPopper,
  Users, ClipboardCheck, GraduationCap, Palette, Leaf,
  TreePine, CalendarDays, MessageSquare, Target,
  Zap, Award, Shield, Notebook, Grid3X3, Calculator,
  CalendarCheck, BookCheck, Briefcase, Clock, Library,
  Settings as SettingsIcon, Ruler, MessageSquareText, Heart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { t } from '@/lib/i18n';

const ONBOARDING_KEY = 'ct_onboarding_completed';
const DONT_SHOW_KEY = 'ct_onboarding_dont_show';

interface OnboardingStep {
  iconComponent: React.ElementType;
  titleKey: string;
  descKey: string;
  accent: string;
}

const steps: OnboardingStep[] = [
  {
    iconComponent: BookOpen,
    titleKey: 'onboarding.step_1_title',
    descKey: 'onboarding.step_1_desc',
    accent: 'from-emerald-400 to-teal-500',
  },
  {
    iconComponent: BarChart3,
    titleKey: 'onboarding.step_2_title',
    descKey: 'onboarding.step_2_desc',
    accent: 'from-teal-400 to-emerald-500',
  },
  {
    iconComponent: Users,
    titleKey: 'onboarding.step_3_title',
    descKey: 'onboarding.step_3_desc',
    accent: 'from-emerald-400 to-cyan-500',
  },
  {
    iconComponent: Grid3X3,
    titleKey: 'onboarding.step_4_title',
    descKey: 'onboarding.step_4_desc',
    accent: 'from-cyan-400 to-emerald-500',
  },
  {
    iconComponent: Pencil,
    titleKey: 'onboarding.step_5_title',
    descKey: 'onboarding.step_5_desc',
    accent: 'from-amber-400 to-emerald-500',
  },
  {
    iconComponent: Flower2,
    titleKey: 'onboarding.step_6_title',
    descKey: 'onboarding.step_6_desc',
    accent: 'from-rose-400 to-emerald-500',
  },
  {
    iconComponent: Grid3X3,
    titleKey: 'onboarding.step_7_title',
    descKey: 'onboarding.step_7_desc',
    accent: 'from-teal-400 to-cyan-500',
  },
  {
    iconComponent: ClipboardCheck,
    titleKey: 'onboarding.step_8_title',
    descKey: 'onboarding.step_8_desc',
    accent: 'from-amber-400 to-rose-500',
  },
  {
    iconComponent: Calculator,
    titleKey: 'onboarding.step_9_title',
    descKey: 'onboarding.step_9_desc',
    accent: 'from-violet-400 to-emerald-500',
  },
  {
    iconComponent: CalendarCheck,
    titleKey: 'onboarding.step_10_title',
    descKey: 'onboarding.step_10_desc',
    accent: 'from-emerald-400 to-teal-500',
  },
  {
    iconComponent: CalendarDays,
    titleKey: 'onboarding.step_11_title',
    descKey: 'onboarding.step_11_desc',
    accent: 'from-amber-400 to-teal-500',
  },
  {
    iconComponent: CalendarDays,
    titleKey: 'onboarding.step_12_title',
    descKey: 'onboarding.step_12_desc',
    accent: 'from-teal-400 to-amber-500',
  },
  {
    iconComponent: Shield,
    titleKey: 'onboarding.step_13_title',
    descKey: 'onboarding.step_13_desc',
    accent: 'from-rose-400 to-amber-500',
  },
  {
    iconComponent: MessageSquare,
    titleKey: 'onboarding.step_14_title',
    descKey: 'onboarding.step_14_desc',
    accent: 'from-cyan-400 to-emerald-500',
  },
  {
    iconComponent: Ruler,
    titleKey: 'onboarding.step_15_title',
    descKey: 'onboarding.step_15_desc',
    accent: 'from-amber-400 to-teal-500',
  },
  {
    iconComponent: MessageSquareText,
    titleKey: 'onboarding.step_16_title',
    descKey: 'onboarding.step_16_desc',
    accent: 'from-teal-400 to-emerald-500',
  },
  {
    iconComponent: Notebook,
    titleKey: 'onboarding.step_17_title',
    descKey: 'onboarding.step_17_desc',
    accent: 'from-emerald-400 to-teal-500',
  },
  {
    iconComponent: Palette,
    titleKey: 'onboarding.step_18_title',
    descKey: 'onboarding.step_18_desc',
    accent: 'from-rose-400 to-violet-500',
  },
  {
    iconComponent: Briefcase,
    titleKey: 'onboarding.step_19_title',
    descKey: 'onboarding.step_19_desc',
    accent: 'from-violet-400 to-emerald-500',
  },
  {
    iconComponent: BookCheck,
    titleKey: 'onboarding.step_20_title',
    descKey: 'onboarding.step_20_desc',
    accent: 'from-amber-400 to-emerald-500',
  },
  {
    iconComponent: Clock,
    titleKey: 'onboarding.step_21_title',
    descKey: 'onboarding.step_21_desc',
    accent: 'from-teal-400 to-cyan-500',
  },
  {
    iconComponent: Library,
    titleKey: 'onboarding.step_22_title',
    descKey: 'onboarding.step_22_desc',
    accent: 'from-emerald-400 to-amber-500',
  },
  {
    iconComponent: BarChart3,
    titleKey: 'onboarding.step_23_title',
    descKey: 'onboarding.step_23_desc',
    accent: 'from-teal-400 to-violet-500',
  },
  {
    iconComponent: SettingsIcon,
    titleKey: 'onboarding.step_24_title',
    descKey: 'onboarding.step_24_desc',
    accent: 'from-emerald-400 to-teal-500',
  },
];

interface OnboardingTourProps {
  open: boolean;
  onClose: () => void;
}

export default function OnboardingTour({ open, onClose }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    if (open) {
      setCurrentStep(0);
      setShowCelebration(false);
    }
  }, [open]);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      // Complete onboarding
      try {
        localStorage.setItem(ONBOARDING_KEY, 'true');
        if (dontShowAgain) {
          localStorage.setItem(DONT_SHOW_KEY, 'true');
        }
      } catch {
        // ignore
      }
      setShowCelebration(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  }, [currentStep, onClose, dontShowAgain]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    try {
      localStorage.setItem(ONBOARDING_KEY, 'true');
      if (dontShowAgain) {
        localStorage.setItem(DONT_SHOW_KEY, 'true');
      }
    } catch {
      // ignore
    }
    onClose();
  }, [onClose, dontShowAgain]);

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleSkip(); }}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden rounded-2xl border-emerald-200/60 dark:border-emerald-900/40 bg-white dark:bg-gray-950 shadow-2xl">
        {/* Hidden title for accessibility */}
        <DialogHeader className="sr-only">
          <VisuallyHidden>
            <DialogTitle>SchulOS Onboarding Tour</DialogTitle>
          </VisuallyHidden>
        </DialogHeader>
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute right-3 top-3 z-10 rounded-full p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100 dark:bg-gray-800">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-400 to-teal-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
          />
        </div>

        {/* Step content with animation */}
        <div className="relative overflow-hidden" style={{ minHeight: '300px' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="flex flex-col items-center text-center px-8 pt-8 pb-6"
            >
              {/* Icon illustration with animated highlight ring */}
              <div className="relative">
                <motion.div
                  className="absolute inset-0 rounded-3xl bg-gradient-to-br opacity-30 tour-highlight-ring"
                  style={{ background: `linear-gradient(135deg, var(--tw-gradient-from), var(--tw-gradient-to))` }}
                />
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15, duration: 0.4, type: 'spring', stiffness: 200 }}
                  className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${step.accent} flex items-center justify-center shadow-lg mb-5`}
                >
                  <step.iconComponent className="w-9 h-9 text-white" />
                </motion.div>
              </div>

              {/* Step number badge */}
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.2 }}
                className="mb-3"
              >
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  {t('onboarding.step', { current: String(currentStep + 1), total: String(steps.length) })}
                </span>
              </motion.div>

              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2"
              >
                {t(step.titleKey)}
              </motion.h2>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
                className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed max-w-sm"
              >
                {t(step.descKey)}
              </motion.p>
            </motion.div>
          </AnimatePresence>

          {/* Celebration overlay */}
          <AnimatePresence>
            {showCelebration && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm px-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                >
                  <PartyPopper className="w-16 h-16 text-emerald-500" />
                </motion.div>
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-4"
                >
                  {t('onboarding.celebration')}
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-sm text-gray-500 dark:text-gray-400 mt-2"
                >
                  {t('onboarding.complete')}
                </motion.p>
                {/* Confetti-like particles */}
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 rounded-full"
                    style={{
                      background: ['#10b981', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'][i],
                      left: `${30 + Math.random() * 40}%`,
                      top: `${30 + Math.random() * 40}%`,
                    }}
                    initial={{ scale: 0, opacity: 1 }}
                    animate={{
                      scale: [0, 1.5, 0],
                      opacity: [1, 0.8, 0],
                      y: [0, -30 - Math.random() * 40],
                      x: [(Math.random() - 0.5) * 60],
                    }}
                    transition={{ duration: 1.2, delay: i * 0.08, ease: 'easeOut' }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Step indicator dots (scrollable for 24 steps) */}
        <div className="flex items-center justify-center gap-1 pb-3 px-4 overflow-x-auto max-w-full">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              className={`rounded-full transition-all duration-300 shrink-0 ${
                i === currentStep
                  ? 'w-5 h-1.5 bg-gradient-to-r from-emerald-400 to-teal-500'
                  : i < currentStep
                  ? 'w-1.5 h-1.5 bg-emerald-400/60 dark:bg-emerald-500/40'
                  : 'w-1.5 h-1.5 bg-gray-200 dark:bg-gray-700'
              }`}
              title={t(steps[i].titleKey)}
            />
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-emerald-100/50 dark:border-emerald-900/30 bg-emerald-50/30 dark:bg-emerald-950/10">
          <div className="flex-1 flex items-center gap-3">
            {!isFirstStep && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 min-h-[44px]"
              >
                {t('onboarding.previous')}
              </Button>
            )}
            {/* Don't show again checkbox */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <Checkbox
                checked={dontShowAgain}
                onCheckedChange={(checked) => setDontShowAgain(checked === true)}
                className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
              />
              <span className="text-[10px] text-gray-400 dark:text-gray-500 hidden sm:inline">{t('onboarding.dont_show_again')}</span>
            </label>
          </div>
          <div className="flex items-center gap-2">
            {!isLastStep && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 min-h-[44px]"
              >
                {t('onboarding.skip')}
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleNext}
              className={`bg-gradient-to-r ${step.accent} text-white hover:opacity-90 shadow-md shadow-emerald-200/50 dark:shadow-emerald-900/30 px-6 min-h-[44px]`}
            >
              {isLastStep ? t('onboarding.start') : t('onboarding.next')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function isOnboardingCompleted(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === 'true';
  } catch {
    return false;
  }
}

export function isDontShowAgain(): boolean {
  try {
    return localStorage.getItem(DONT_SHOW_KEY) === 'true';
  } catch {
    return false;
  }
}
