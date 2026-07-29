'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Keyboard,
  Command,
  Search,
  Plus,
  ArrowUp,
  ArrowDown,
  Eye,
  LayoutDashboard,
  Users,
  PenLine,
  Flower2,
  ClipboardCheck,
  Calculator,
  FileText,
  X,
  BookOpen,
  Grid3X3,
  CalendarCheck,
  Calendar,
  TrendingUp,
  Mail,
  Shield,
  Target,
  Ruler,
  MessageSquareText,
  CalendarDays,
  Settings,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { t } from '@/lib/i18n';
import type { ViewName } from '@/lib/store';

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShortcutEntry {
  keys: string[];
  labelKey: string;
  icon?: React.ElementType;
}

interface ShortcutSection {
  titleKey: string;
  icon: React.ElementType;
  entries: ShortcutEntry[];
}

const viewShortcuts: { key: ViewName; num: number; icon: React.ElementType; labelKey: string }[] = [
  { key: 'dashboard', num: 1, icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { key: 'classes', num: 2, icon: Users, labelKey: 'nav.classes' },
  { key: 'progress', num: 3, icon: PenLine, labelKey: 'nav.progress' },
  { key: 'flower', num: 4, icon: Flower2, labelKey: 'nav.flower' },
  { key: 'assessments', num: 5, icon: ClipboardCheck, labelKey: 'nav.assessments' },
  { key: 'grading', num: 6, icon: Calculator, labelKey: 'nav.grading' },
  { key: 'reports', num: 7, icon: FileText, labelKey: 'nav.reports' },
  { key: 'competencies', num: 8, icon: BookOpen, labelKey: 'nav.competencies' },
  { key: 'settings', num: 9, icon: Settings, labelKey: 'nav.settings' },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-white dark:bg-gray-800 border border-emerald-200/60 dark:border-emerald-900/40 text-[11px] font-mono text-emerald-700 dark:text-emerald-300 shadow-sm min-w-[24px] justify-center">
      {children}
    </kbd>
  );
}

function CommandKey() {
  return (
    <span className="inline-flex items-center gap-0.5">
      <Command className="h-2.5 w-2.5" />
    </span>
  );
}

export default function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  const sections: ShortcutSection[] = [
    {
      titleKey: 'shortcuts.navigation',
      icon: Eye,
      entries: [
        { keys: ['Cmd/Ctrl', 'K'], labelKey: 'shortcuts.quick_search', icon: Search },
        { keys: ['Cmd/Ctrl', '1-9'], labelKey: 'shortcuts.switch_view', icon: LayoutDashboard },
        { keys: ['Cmd/Ctrl', 'N'], labelKey: 'shortcuts.new_entry', icon: Plus },
        { keys: ['Cmd/Ctrl', '/'], labelKey: 'shortcuts.show_shortcuts', icon: Keyboard },
        { keys: ['Esc'], labelKey: 'shortcuts.close_dialog', icon: X },
      ],
    },
    {
      titleKey: 'shortcuts.views',
      icon: Eye,
      entries: viewShortcuts.map((v) => ({
        keys: ['Cmd/Ctrl', String(v.num)],
        labelKey: v.labelKey,
        icon: v.icon,
      })),
    },
    {
      titleKey: 'shortcuts.command_palette',
      icon: Command,
      entries: [
        { keys: ['Arrow Up'], labelKey: 'shortcuts.navigation', icon: ArrowUp },
        { keys: ['Arrow Down'], labelKey: 'shortcuts.navigation', icon: ArrowDown },
        { keys: ['Enter'], labelKey: 'action.select', icon: Command },
        { keys: ['Esc'], labelKey: 'shortcuts.close_dialog', icon: X },
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden rounded-2xl border-emerald-200/60 dark:border-emerald-900/40 shadow-2xl shadow-emerald-900/10">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-md shadow-emerald-300/30">
              <Keyboard className="h-4 w-4" />
            </div>
            {t('shortcuts.title')}
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t('shortcuts.description')}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] mt-4">
          <div className="px-6 pb-6 space-y-6">
            {sections.map((section, sectionIdx) => (
              <div key={section.titleKey}>
                <div className="flex items-center gap-2 mb-3">
                  <section.icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-600/80 dark:text-emerald-400/70">
                    {t(section.titleKey)}
                  </h3>
                </div>
                <div className="space-y-1.5">
                  <AnimatePresence>
                    {section.entries.map((entry, idx) => (
                      <motion.div
                        key={entry.labelKey + entry.keys.join('')}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: (sectionIdx * 5 + idx) * 0.03, duration: 0.2 }}
                        className="flex items-center justify-between rounded-lg px-3 py-2 bg-emerald-50/40 dark:bg-emerald-900/10 border border-emerald-100/50 dark:border-emerald-900/20 hover:bg-emerald-50/70 dark:hover:bg-emerald-900/20 transition-colors"
                      >
                        <span className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                          {entry.icon && (
                            <entry.icon className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
                          )}
                          {t(entry.labelKey)}
                        </span>
                        <span className="flex items-center gap-1">
                          {entry.keys.map((key, keyIdx) => (
                            <React.Fragment key={keyIdx}>
                              {keyIdx > 0 && (
                                <span className="text-[10px] text-gray-400 dark:text-gray-500 mx-0.5">+</span>
                              )}
                              <Kbd>
                                {key === 'Cmd/Ctrl' ? <CommandKey /> : key}
                              </Kbd>
                            </React.Fragment>
                          ))}
                        </span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                {sectionIdx < sections.length - 1 && (
                  <Separator className="mt-4 bg-emerald-200/40 dark:bg-emerald-900/20" />
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
