'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, BookOpen, BarChart3, Pencil, Flower2, FileText, PartyPopper,
  Users, ClipboardCheck, GraduationCap, Palette, Leaf,
  TreePine, CalendarDays, MessageSquare, BarChart, Target,
  Zap, Award, Shield, Notebook,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { t } from '@/lib/i18n';

const ONBOARDING_KEY = 'ct_onboarding_completed';

interface OnboardingStep {
  iconComponent: React.ElementType;
  titleKey: string;
  descKey: string;
  accent: string;
}

const steps: OnboardingStep[] = [
  {
    iconComponent: BookOpen,
    titleKey: 'onboarding.welcome_title',
    descKey: 'onboarding.welcome_desc',
    accent: 'from-emerald-400 to-teal-500',
  },
  {
    iconComponent: BarChart3,
    titleKey: 'onboarding.dashboard_title',
    descKey: 'onboarding.dashboard_desc',
    accent: 'from-teal-400 to-emerald-500',
  },
  {
    iconComponent: Users,
    titleKey: 'onboarding.classes_title',
    descKey: 'onboarding.classes_desc',
    accent: 'from-emerald-400 to-cyan-500',
  },
  {
    iconComponent: Pencil,
    titleKey: 'onboarding.progress_title',
    descKey: 'onboarding.progress_desc',
    accent: 'from-amber-400 to-emerald-500',
  },
  {
    iconComponent: Flower2,
    titleKey: 'onboarding.flower_title',
    descKey: 'onboarding.flower_desc',
    accent: 'from-rose-400 to-emerald-500',
  },
  {
    iconComponent: ClipboardCheck,
    titleKey: 'onboarding.assessments_title',
    descKey: 'onboarding.assessments_desc',
    accent: 'from-amber-400 to-rose-500',
  },
  {
    iconComponent: GraduationCap,
    titleKey: 'onboarding.grading_title',
    descKey: 'onboarding.grading_desc',
    accent: 'from-violet-400 to-emerald-500',
  },
  {
    iconComponent: FileText,
    titleKey: 'onboarding.reports_title',
    descKey: 'onboarding.reports_desc',
    accent: 'from-violet-400 to-emerald-500',
  },
  {
    iconComponent: Notebook,
    titleKey: 'onboarding.notebooks_title',
    descKey: 'onboarding.notebooks_desc',
    accent: 'from-teal-400 to-emerald-500',
  },
  {
    iconComponent: Palette,
    titleKey: 'onboarding.drawing_title',
    descKey: 'onboarding.drawing_desc',
    accent: 'from-rose-400 to-violet-500',
  },
  {
    iconComponent: CalendarDays,
    titleKey: 'onboarding.calendar_title',
    descKey: 'onboarding.calendar_desc',
    accent: 'from-amber-400 to-teal-500',
  },
  {
    iconComponent: MessageSquare,
    titleKey: 'onboarding.parents_title',
    descKey: 'onboarding.parents_desc',
    accent: 'from-cyan-400 to-emerald-500',
  },
  {
    iconComponent: Leaf,
    titleKey: 'onboarding.environmental_title',
    descKey: 'onboarding.environmental_desc',
    accent: 'from-emerald-400 to-green-500',
  },
  {
    iconComponent: PartyPopper,
    titleKey: 'onboarding.done_title',
    descKey: 'onboarding.done_desc',
    accent: 'from-emerald-400 to-teal-500',
  },
];

interface OnboardingTourProps {
  open: boolean;
  onClose: () => void;
}

export default function OnboardingTour({ open, onClose }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      // Complete onboarding
      try {
        localStorage.setItem(ONBOARDING_KEY, 'true');
      } catch {
        // ignore
      }
      onClose();
    }
  }, [currentStep, onClose]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    try {
      localStorage.setItem(ONBOARDING_KEY, 'true');
    } catch {
      // ignore
    }
    onClose();
  }, [onClose]);

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleSkip(); }}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden rounded-2xl border-emerald-200/60 dark:border-emerald-900/40 bg-white dark:bg-gray-950 shadow-2xl">
        {/* Hidden title for accessibility */}
        <DialogHeader className="sr-only">
          <VisuallyHidden>
            <DialogTitle>CompetenceTrack Onboarding Tour</DialogTitle>
          </VisuallyHidden>
        </DialogHeader>
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute right-3 top-3 z-10 rounded-full p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Step content with animation */}
        <div className="relative overflow-hidden" style={{ minHeight: '320px' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="flex flex-col items-center text-center px-8 pt-10 pb-6"
            >
              {/* Icon illustration */}
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.4, type: 'spring', stiffness: 200 }}
                className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${step.accent} flex items-center justify-center shadow-lg mb-6`}
              >
                <step.iconComponent className="w-10 h-10 text-white" />
              </motion.div>

              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3"
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
        </div>

        {/* Step indicator dots */}
        <div className="flex items-center justify-center gap-1.5 pb-4 flex-wrap px-4">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              className={`rounded-full transition-all duration-300 ${
                i === currentStep
                  ? 'w-6 h-2 bg-gradient-to-r from-emerald-400 to-teal-500'
                  : i < currentStep
                  ? 'w-2 h-2 bg-emerald-400/60 dark:bg-emerald-500/40'
                  : 'w-2 h-2 bg-gray-200 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>

        {/* Step counter */}
        <div className="text-center pb-2">
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
            {t('onboarding.step', { current: String(currentStep + 1), total: String(steps.length) })}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-emerald-100/50 dark:border-emerald-900/30 bg-emerald-50/30 dark:bg-emerald-950/10">
          <div className="flex-1">
            {!isFirstStep && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/20"
              >
                {t('onboarding.back')}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isLastStep && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {t('onboarding.skip')}
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleNext}
              className={`bg-gradient-to-r ${step.accent} text-white hover:opacity-90 shadow-md shadow-emerald-200/50 dark:shadow-emerald-900/30 px-6`}
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
