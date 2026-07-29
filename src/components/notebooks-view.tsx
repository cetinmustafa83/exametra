'use client';

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Book, Archive, Grid3X3, AlignLeft, File,
  Palette, Leaf, Plus, Star, Trash2, ChevronLeft,
  MoreHorizontal, Music, PenTool, Search, X,
  Share2, Eye, EyeOff, Edit3, Hash, Bookmark,
  PenLine, Layers, BookMarked, Globe, Sparkles,
  Bold, Italic as ItalicIcon, Underline as UnderlineIcon,
  List, ListOrdered, AlignLeftIcon, AlignCenterIcon, AlignRightIcon,
  Heading1, Heading2, Heading3, CheckCircle2,
  User as UserIcon, GraduationCap, FileDown,
  Copy, FlaskConical, Languages, Calculator, Paintbrush, Megaphone,
  Strikethrough, Type, Highlighter, GripVertical,
  Clock, History, ZoomIn, ZoomOut, Image as ImageIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { toast } from 'sonner';
import DrawingCanvas from '@/components/drawing-canvas';

// ─── Types ───────────────────────────────────────────────────────────

interface NotebookPage {
  id: string;
  notebookId: string;
  pageNumber: number;
  title: string | null;
  contentType: string;
  textContent: string | null;
  drawingData: string | null;
  background: string;
  isBookmark: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Notebook {
  id: string;
  schoolId: string;
  ownerId: string;
  ownerType: string;
  subjectId: string | null;
  classGroupId: string | null;
  title: string;
  description: string | null;
  notebookType: string;
  color: string;
  icon: string | null;
  isArchived: boolean;
  isPublic: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  pages?: NotebookPage[];
  _count?: { pages: number };
  subject?: { id: string; name: string } | null;
  classGroup?: { id: string; name: string } | null;
  owner?: { id: string; firstName: string; lastName: string; role: string } | null;
}

interface Subject {
  id: string;
  name: string;
  schoolId: string;
}

interface ClassGroup {
  id: string;
  name: string;
  schoolId: string;
  gradeLevel: number;
}

interface PageVersion {
  id: string;
  pageId: string;
  version: number;
  textContent: string | null;
  drawingData: string | null;
  editedBy: string | null;
  editSummary: string | null;
  createdAt: string;
}

// ─── Constants ───────────────────────────────────────────────────────

const NOTEBOOK_TYPES: Array<{ key: string; icon: React.ElementType; labelKey: string; descKey: string }> = [
  { key: 'lined', icon: AlignLeft, labelKey: 'notebooks.type_lined', descKey: 'notebooks.type_lined_desc' },
  { key: 'grid', icon: Grid3X3, labelKey: 'notebooks.type_grid', descKey: 'notebooks.type_grid_desc' },
  { key: 'blank', icon: File, labelKey: 'notebooks.type_blank', descKey: 'notebooks.type_blank_desc' },
  { key: 'dotted', icon: MoreHorizontal, labelKey: 'notebooks.type_dotted', descKey: 'notebooks.type_dotted_desc' },
  { key: 'music', icon: Music, labelKey: 'notebooks.type_music', descKey: 'notebooks.type_music_desc' },
  { key: 'calligraphy', icon: PenTool, labelKey: 'notebooks.type_calligraphy', descKey: 'notebooks.type_calligraphy_desc' },
];

const COVER_COLORS = [
  { key: 'emerald', hex: '#10b981', labelKey: 'notebooks.color_emerald' },
  { key: 'blue', hex: '#3b82f6', labelKey: 'notebooks.color_blue' },
  { key: 'red', hex: '#ef4444', labelKey: 'notebooks.color_red' },
  { key: 'yellow', hex: '#f59e0b', labelKey: 'notebooks.color_yellow' },
  { key: 'purple', hex: '#8b5cf6', labelKey: 'notebooks.color_purple' },
  { key: 'orange', hex: '#f97316', labelKey: 'notebooks.color_orange' },
  { key: 'teal', hex: '#14b8a6', labelKey: 'notebooks.color_teal' },
  { key: 'pink', hex: '#ec4899', labelKey: 'notebooks.color_pink' },
];

const ICON_OPTIONS = [
  'BookOpen', 'Book', 'PenLine', 'Music', 'PenTool', 'Palette',
  'Leaf', 'Star', 'Globe', 'Sparkles', 'Hash', 'Layers',
];

const ICON_MAP: Record<string, React.ElementType> = {
  BookOpen, Book, PenLine, Music, PenTool, Palette,
  Leaf, Star, Globe, Sparkles, Hash, Layers,
};

// ─── Template Definitions ────────────────────────────────────────────

interface NotebookTemplate {
  key: string;
  titleKey: string;
  descKey: string;
  notebookType: string;
  color: string;
  icon: string;
  iconComponent: React.ElementType;
  pages: Array<{ title: string | null; content: string }>;
}

const NOTEBOOK_TEMPLATES: NotebookTemplate[] = [
  {
    key: 'math',
    titleKey: 'notebooks.template_math',
    descKey: 'notebooks.template_math_desc',
    notebookType: 'grid',
    color: '#3b82f6',
    icon: 'Hash',
    iconComponent: Calculator,
    pages: [
      { title: 'Aufgaben', content: '# Aufgaben\n\n1. \n2. \n3. \n' },
      { title: 'Rechnungen', content: '# Rechnungen\n\n' },
      { title: 'Formeln', content: '# Formeln\n\n' },
      { title: 'Geometrie', content: '# Geometrie\n\n' },
      { title: 'Ergebnisse', content: '# Ergebnisse\n\n' },
    ],
  },
  {
    key: 'german',
    titleKey: 'notebooks.template_german',
    descKey: 'notebooks.template_german_desc',
    notebookType: 'lined',
    color: '#ef4444',
    icon: 'BookOpen',
    iconComponent: BookOpen,
    pages: [
      { title: 'Aufsaetze', content: '# Aufsaetze\n\n' },
      { title: 'Lesetagebuch', content: '# Lesetagebuch\n\n' },
      { title: 'Grammatik', content: '# Grammatik\n\n' },
      { title: 'Rechtschreibung', content: '# Rechtschreibung\n\n' },
      { title: 'Kreatives Schreiben', content: '# Kreatives Schreiben\n\n' },
    ],
  },
  {
    key: 'english',
    titleKey: 'notebooks.template_english',
    descKey: 'notebooks.template_english_desc',
    notebookType: 'lined',
    color: '#f59e0b',
    icon: 'Globe',
    iconComponent: Languages,
    pages: [
      { title: 'Vocabulary', content: '# Vocabulary\n\n| English | Deutsch |\n|---------|--------|\n| | |\n| | |\n' },
      { title: 'Grammar', content: '# Grammar\n\n' },
      { title: 'Reading', content: '# Reading\n\n' },
      { title: 'Writing', content: '# Writing\n\n' },
      { title: 'Exercises', content: '# Exercises\n\n' },
    ],
  },
  {
    key: 'art',
    titleKey: 'notebooks.template_art',
    descKey: 'notebooks.template_art_desc',
    notebookType: 'blank',
    color: '#8b5cf6',
    icon: 'Palette',
    iconComponent: Paintbrush,
    pages: [
      { title: 'Skizzen', content: '' },
      { title: 'Farbstudien', content: '' },
      { title: 'Komposition', content: '' },
      { title: 'Perspektive', content: '' },
      { title: 'Portfolio', content: '' },
    ],
  },
  {
    key: 'music',
    titleKey: 'notebooks.template_music',
    descKey: 'notebooks.template_music_desc',
    notebookType: 'music',
    color: '#10b981',
    icon: 'Music',
    iconComponent: Music,
    pages: [
      { title: 'Noten', content: '' },
      { title: 'Rhythmus', content: '' },
      { title: 'Melodie', content: '' },
      { title: 'Harmonie', content: '' },
      { title: 'Komposition', content: '' },
    ],
  },
  {
    key: 'science',
    titleKey: 'notebooks.template_science',
    descKey: 'notebooks.template_science_desc',
    notebookType: 'grid',
    color: '#14b8a6',
    icon: 'Book',
    iconComponent: FlaskConical,
    pages: [
      { title: 'Versuche', content: '# Versuche\n\n**Fragestellung:**\n\n**Vermutung:**\n\n**Durchfuehrung:**\n\n**Beobachtung:**\n\n**Ergebnis:**\n' },
      { title: 'Beobachtungen', content: '# Beobachtungen\n\n' },
      { title: 'Ergebnisse', content: '# Ergebnisse\n\n' },
      { title: 'Versuchsprotokoll', content: '# Versuchsprotokoll\n\nDatum:\n\nMaterial:\n\n' },
      { title: 'Fragen', content: '# Fragen\n\n' },
    ],
  },
];

// ─── CSS Background Patterns ─────────────────────────────────────────

function getPageBackgroundCSS(type: string): React.CSSProperties {
  switch (type) {
    case 'lined':
      return {
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 31px, #d1d5db 31px, #d1d5db 32px)`,
        backgroundSize: '100% 32px',
        backgroundPosition: '0 16px',
      };
    case 'grid':
      return {
        backgroundImage: `
          repeating-linear-gradient(0deg, transparent, transparent 31px, #d1d5db 31px, #d1d5db 32px),
          repeating-linear-gradient(90deg, transparent, transparent 31px, #d1d5db 31px, #d1d5db 32px)
        `,
        backgroundSize: '32px 32px',
      };
    case 'dotted':
      return {
        backgroundImage: `radial-gradient(circle, #9ca3af 1px, transparent 1px)`,
        backgroundSize: '24px 24px',
      };
    case 'music':
      return {
        backgroundImage: `
          repeating-linear-gradient(0deg, transparent, transparent 7px, #d1d5db 7px, #d1d5db 8px),
          repeating-linear-gradient(0deg, transparent, transparent 15px, #9ca3af 15px, #9ca3af 16px),
          repeating-linear-gradient(0deg, transparent, transparent 23px, #9ca3af 23px, #9ca3af 24px),
          repeating-linear-gradient(0deg, transparent, transparent 31px, #9ca3af 31px, #9ca3af 32px),
          repeating-linear-gradient(0deg, transparent, transparent 39px, #d1d5db 39px, #d1d5db 40px)
        `,
        backgroundSize: '100% 40px',
      };
    case 'calligraphy':
      return {
        backgroundImage: `
          repeating-linear-gradient(90deg, transparent, transparent 59px, #e5e7eb 59px, #e5e7eb 60px),
          repeating-linear-gradient(0deg, transparent, transparent 31px, #d1d5db 31px, #d1d5db 32px)
        `,
        backgroundSize: '60px 32px',
        backgroundPosition: '0 16px',
      };
    case 'blank':
      return {};
    default:
      return {};
  }
}

// ─── WYSIWYG Rich Text Toolbar ───────────────────────────────────────

const TEXT_COLORS = [
  { key: 'black', color: '#1f2937', labelKey: 'notebooks.toolbar_color_black' },
  { key: 'red', color: '#dc2626', labelKey: 'notebooks.toolbar_color_red' },
  { key: 'blue', color: '#2563eb', labelKey: 'notebooks.toolbar_color_blue' },
  { key: 'green', color: '#16a34a', labelKey: 'notebooks.toolbar_color_green' },
  { key: 'orange', color: '#ea580c', labelKey: 'notebooks.toolbar_color_orange' },
];

const HIGHLIGHT_COLORS = [
  { key: 'yellow', color: '#fef08a', labelKey: 'notebooks.toolbar_highlight_yellow' },
  { key: 'green', color: '#bbf7d0', labelKey: 'notebooks.toolbar_highlight_green' },
  { key: 'blue', color: '#bfdbfe', labelKey: 'notebooks.toolbar_highlight_blue' },
  { key: 'pink', color: '#fbcfe8', labelKey: 'notebooks.toolbar_highlight_pink' },
  { key: 'none', color: 'transparent', labelKey: 'notebooks.toolbar_highlight_none' },
];

function WysiwygToolbar({ editorRef, onFormatChange }: { editorRef: React.RefObject<HTMLDivElement | null>; onFormatChange: () => void }) {
  const [activeStates, setActiveStates] = useState<Record<string, boolean>>({});

  const updateActiveStates = useCallback(() => {
    setActiveStates({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikethrough: document.queryCommandState('strikeThrough'),
      justifyLeft: document.queryCommandState('justifyLeft'),
      justifyCenter: document.queryCommandState('justifyCenter'),
      justifyRight: document.queryCommandState('justifyRight'),
    });
  }, []);

  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    updateActiveStates();
    onFormatChange();
  }, [editorRef, updateActiveStates, onFormatChange]);

  const applyHeading = useCallback((level: number) => {
    document.execCommand('formatBlock', false, `h${level}`);
    editorRef.current?.focus();
    updateActiveStates();
    onFormatChange();
  }, [editorRef, updateActiveStates, onFormatChange]);

  const applyTextColor = useCallback((color: string) => {
    document.execCommand('foreColor', false, color);
    editorRef.current?.focus();
    updateActiveStates();
    onFormatChange();
  }, [editorRef, updateActiveStates, onFormatChange]);

  const applyHighlight = useCallback((color: string) => {
    if (color === 'transparent') {
      document.execCommand('removeFormat', false);
    } else {
      document.execCommand('hiliteColor', false, color);
    }
    editorRef.current?.focus();
    updateActiveStates();
    onFormatChange();
  }, [editorRef, updateActiveStates, onFormatChange]);

  const fmtBtnClass = (active: boolean) =>
    `min-h-[36px] min-w-[36px] h-9 w-9 p-0 shrink-0 ${active ? 'bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-gray-100' : ''}`;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 overflow-x-auto">
        {/* Format group */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => execCommand('bold')} className={fmtBtnClass(activeStates.bold)}>
              <Bold className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">{t('notebooks.toolbar_bold')}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => execCommand('italic')} className={fmtBtnClass(activeStates.italic)}>
              <ItalicIcon className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">{t('notebooks.toolbar_italic')}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => execCommand('underline')} className={fmtBtnClass(activeStates.underline)}>
              <UnderlineIcon className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">{t('notebooks.toolbar_underline')}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => execCommand('strikeThrough')} className={fmtBtnClass(activeStates.strikethrough)}>
              <Strikethrough className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">{t('notebooks.toolbar_strikethrough')}</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Heading group */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => applyHeading(1)} className="min-h-[36px] min-w-[36px] h-9 w-9 p-0 shrink-0">
              <Heading1 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">{t('notebooks.toolbar_heading1')}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => applyHeading(2)} className="min-h-[36px] min-w-[36px] h-9 w-9 p-0 shrink-0">
              <Heading2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">{t('notebooks.toolbar_heading2')}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => applyHeading(3)} className="min-h-[36px] min-w-[36px] h-9 w-9 p-0 shrink-0">
              <Heading3 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">{t('notebooks.toolbar_heading3')}</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* List group */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => execCommand('insertUnorderedList')} className="min-h-[36px] min-w-[36px] h-9 w-9 p-0 shrink-0">
              <List className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">{t('notebooks.toolbar_bullet_list')}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => execCommand('insertOrderedList')} className="min-h-[36px] min-w-[36px] h-9 w-9 p-0 shrink-0">
              <ListOrdered className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">{t('notebooks.toolbar_numbered_list')}</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Alignment group */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => execCommand('justifyLeft')} className={fmtBtnClass(activeStates.justifyLeft)}>
              <AlignLeftIcon className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">{t('notebooks.toolbar_align_left')}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => execCommand('justifyCenter')} className={fmtBtnClass(activeStates.justifyCenter)}>
              <AlignCenterIcon className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">{t('notebooks.toolbar_align_center')}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => execCommand('justifyRight')} className={fmtBtnClass(activeStates.justifyRight)}>
              <AlignRightIcon className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">{t('notebooks.toolbar_align_right')}</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Text color */}
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="min-h-[36px] min-w-[36px] h-9 w-9 p-0 shrink-0">
                  <Type className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">{t('notebooks.toolbar_text_color')}</TooltipContent>
          </Tooltip>
          <PopoverContent className="w-auto p-2" align="start">
            <div className="flex items-center gap-1.5">
              {TEXT_COLORS.map((tc) => (
                <button
                  key={tc.key}
                  onClick={() => applyTextColor(tc.color)}
                  className="w-7 h-7 rounded-full border-2 border-gray-200 dark:border-gray-600 hover:scale-110 transition-transform"
                  style={{ backgroundColor: tc.color }}
                  title={t(tc.labelKey)}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Highlight color */}
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="min-h-[36px] min-w-[36px] h-9 w-9 p-0 shrink-0">
                  <Highlighter className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">{t('notebooks.toolbar_highlight')}</TooltipContent>
          </Tooltip>
          <PopoverContent className="w-auto p-2" align="start">
            <div className="flex items-center gap-1.5">
              {HIGHLIGHT_COLORS.map((hc) => (
                <button
                  key={hc.key}
                  onClick={() => applyHighlight(hc.color)}
                  className={`w-7 h-7 rounded-full border-2 hover:scale-110 transition-transform ${
                    hc.key === 'none'
                      ? 'border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-800 flex items-center justify-center'
                      : 'border-gray-200 dark:border-gray-600'
                  }`}
                  style={hc.key !== 'none' ? { backgroundColor: hc.color } : {}}
                  title={t(hc.labelKey)}
                >
                  {hc.key === 'none' && <X className="w-3.5 h-3.5 text-gray-400" />}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </TooltipProvider>
  );
}

// ─── Notebook Card Component ─────────────────────────────────────────

function NotebookCard({
  notebook,
  subjectName,
  onOpen,
  onArchive,
  onDelete,
  onShare,
  onDuplicate,
  isShared = false,
}: {
  notebook: Notebook;
  subjectName: string | null;
  onOpen: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onShare?: () => void;
  onDuplicate?: () => void;
  isShared?: boolean;
}) {
  const pageCount = notebook._count?.pages ?? notebook.pages?.length ?? 0;
  const IconComponent = notebook.icon ? ICON_MAP[notebook.icon] ?? BookOpen : BookOpen;
  const typeInfo = NOTEBOOK_TYPES.find(nt => nt.key === notebook.notebookType) ?? NOTEBOOK_TYPES[0];
  const TypeIcon = typeInfo.icon;
  const ownerName = notebook.owner
    ? `${notebook.owner.firstName} ${notebook.owner.lastName}`
    : null;

  return (
    <motion.div
      whileHover={{ rotateY: -3, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300 }}
      style={{ perspective: 800 }}
    >
      <Card
        className="relative overflow-hidden cursor-pointer group transition-shadow duration-300 hover:shadow-lg border-0"
        style={{ boxShadow: `4px 4px 12px rgba(0,0,0,0.15), 1px 1px 3px rgba(0,0,0,0.1)` }}
        onClick={onOpen}
      >
        {/* Cover section */}
        <div
          className="relative h-28 flex items-center justify-center overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${notebook.color}, ${notebook.color}cc)`,
          }}
        >
          {/* Book spine effect */}
          <div
            className="absolute left-0 top-0 bottom-0 w-3 opacity-80"
            style={{ background: `linear-gradient(90deg, ${notebook.color}99, ${notebook.color}66)` }}
          />
          <IconComponent className="w-12 h-12 text-white/90 drop-shadow-md" />
          {/* Public badge */}
          {notebook.isPublic && !isShared && (
            <Badge className="absolute top-2 right-2 bg-white/90 text-gray-700 text-xs border-0 shadow-sm">
              <Globe className="w-3 h-3 mr-1" />
              {t('notebooks.shared')}
            </Badge>
          )}
          {/* Shared badge */}
          {isShared && (
            <Badge className="absolute top-2 right-2 bg-amber-50 text-amber-700 text-xs border-0 shadow-sm">
              <Share2 className="w-3 h-3 mr-1" />
              {t('notebooks.shared_notebook')}
            </Badge>
          )}
          {/* Archive overlay */}
          {notebook.isArchived && (
            <div className="absolute inset-0 bg-gray-500/40 flex items-center justify-center">
              <Badge className="bg-gray-600 text-white border-0">
                <Archive className="w-3 h-3 mr-1" />
                {t('notebooks.archived')}
              </Badge>
            </div>
          )}
        </div>

        <CardContent className="p-4 space-y-2">
          <div className="font-semibold text-base truncate text-gray-900 dark:text-gray-100">
            {notebook.title}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Type badge */}
            <Badge variant="outline" className="text-xs gap-1">
              <TypeIcon className="w-3 h-3" />
              {t(typeInfo.labelKey)}
            </Badge>
            {/* Subject badge */}
            {subjectName && (
              <Badge variant="secondary" className="text-xs">
                {subjectName}
              </Badge>
            )}
          </div>

          {/* Owner name for shared notebooks */}
          {isShared && ownerName && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <UserIcon className="w-3 h-3" />
              <span>{ownerName}</span>
            </div>
          )}

          {/* Page count */}
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <BookMarked className="w-3.5 h-3.5" />
              {t('notebooks.page_count', { count: pageCount })}
            </span>
          </div>

          {/* Eco message */}
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 pt-1">
            <Leaf className="w-3.5 h-3.5" />
            <span>{t('notebooks.eco_tip')}</span>
          </div>

          {/* Action buttons — only show for own notebooks, not shared */}
          {!isShared && (
            <div className="flex items-center gap-1 pt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-wrap">
              {onShare && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={(e) => { e.stopPropagation(); onShare(); }}
                >
                  {notebook.isPublic ? <EyeOff className="w-3.5 h-3.5 mr-1" /> : <Share2 className="w-3.5 h-3.5 mr-1" />}
                  {notebook.isPublic ? t('notebooks.unshare_confirm') : t('notebooks.share')}
                </Button>
              )}
              {onDuplicate && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
                >
                  <Copy className="w-3.5 h-3.5 mr-1" />
                  {t('notebooks.duplicate')}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={(e) => { e.stopPropagation(); onArchive(); }}
              >
                <Archive className="w-3.5 h-3.5 mr-1" />
                {notebook.isArchived ? t('notebooks.unarchive') : t('notebooks.archive')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-red-500 hover:text-red-600"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                {t('notebooks.delete')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Create Notebook Dialog ──────────────────────────────────────────

function CreateNotebookDialog({
  open,
  onClose,
  subjects,
  classes,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  subjects: Subject[];
  classes: ClassGroup[];
  onCreate: (data: Partial<Notebook>) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notebookType, setNotebookType] = useState('lined');
  const [subjectId, setSubjectId] = useState('');
  const [classGroupId, setClassGroupId] = useState('');
  const [color, setColor] = useState('#10b981');
  const [icon, setIcon] = useState('BookOpen');
  const [isPublic, setIsPublic] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error(t('notebooks.title_required'));
      return;
    }
    setCreating(true);
    try {
      await onCreate({
        title: title.trim(),
        description: description.trim() || null,
        notebookType,
        subjectId: subjectId || null,
        classGroupId: classGroupId || null,
        color,
        icon,
        isPublic,
      });
      setTitle('');
      setDescription('');
      setNotebookType('lined');
      setSubjectId('');
      setClassGroupId('');
      setColor('#10b981');
      setIcon('BookOpen');
      setIsPublic(false);
      onClose();
    } catch {
      toast.error(t('notebooks.error_create'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-500" />
            {t('notebooks.create_title')}
          </DialogTitle>
          <DialogDescription>{t('notebooks.create_desc')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Title */}
          <div className="space-y-2">
            <Label>{t('notebooks.field_title')}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('notebooks.field_title_placeholder')}
              className="min-h-[44px]"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>{t('notebooks.field_description')}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('notebooks.field_description_placeholder')}
              rows={3}
            />
          </div>

          {/* Notebook Type - Visual Selector */}
          <div className="space-y-2">
            <Label>{t('notebooks.field_type')}</Label>
            <div className="grid grid-cols-3 gap-2">
              {NOTEBOOK_TYPES.map((nt) => {
                const NtIcon = nt.icon;
                const isSelected = notebookType === nt.key;
                return (
                  <button
                    key={nt.key}
                    onClick={() => setNotebookType(nt.key)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all min-h-[64px] ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                    }`}
                  >
                    <NtIcon className="w-5 h-5" />
                    <span className="text-xs font-medium">{t(nt.labelKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subject + Class */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('notebooks.field_subject')}</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue placeholder={t('notebooks.no_subject')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('notebooks.no_subject')}</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('notebooks.field_class')}</Label>
              <Select value={classGroupId} onValueChange={setClassGroupId}>
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue placeholder={t('notebooks.no_class')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('notebooks.no_class')}</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cover Color */}
          <div className="space-y-2">
            <Label>{t('notebooks.field_color')}</Label>
            <div className="flex items-center gap-2 flex-wrap">
              {COVER_COLORS.map((cc) => (
                <button
                  key={cc.key}
                  onClick={() => setColor(cc.hex)}
                  className={`w-8 h-8 rounded-full transition-all border-2 ${
                    color === cc.hex ? 'border-gray-900 dark:border-white scale-110 shadow-md' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: cc.hex }}
                  title={t(cc.labelKey)}
                />
              ))}
            </div>
          </div>

          {/* Icon Selector */}
          <div className="space-y-2">
            <Label>{t('notebooks.field_icon')}</Label>
            <div className="flex items-center gap-2 flex-wrap">
              {ICON_OPTIONS.map((iconName) => {
                const IconComp = ICON_MAP[iconName];
                const isSelected = icon === iconName;
                return (
                  <button
                    key={iconName}
                    onClick={() => setIcon(iconName)}
                    className={`w-10 h-10 flex items-center justify-center rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <IconComp className={`w-4 h-4 ${isSelected ? 'text-emerald-600 dark:text-emerald-300' : 'text-gray-500 dark:text-gray-400'}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Public toggle */}
          <div className="flex items-center gap-3">
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            <div>
              <Label className="flex items-center gap-1">
                <Share2 className="w-4 h-4" />
                {t('notebooks.field_public')}
              </Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('notebooks.field_public_hint')}</p>
            </div>
          </div>
        </div>

        {/* Eco message */}
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-700 dark:text-emerald-300 text-sm">
          <Leaf className="w-4 h-4" />
          <span>{t('notebooks.eco_message')}</span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="min-h-[44px]">
            {t('action.cancel')}
          </Button>
          <Button onClick={handleCreate} disabled={creating || !title.trim()} className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700">
            {creating ? (
              <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            {t('action.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page Background Pattern Preview ─────────────────────────────────

function PageBackgroundPreview({ type }: { type: string }) {
  return (
    <div
      className="w-full h-16 rounded-lg border border-gray-200 dark:border-gray-700"
      style={{ ...getPageBackgroundCSS(type), backgroundColor: '#fff' }}
    />
  );
}

// ─── Page Thumbnail Component ────────────────────────────────────────

function PageThumbnail({ page, notebookType }: { page: NotebookPage; notebookType: string }) {
  const bgType = page.background || notebookType;
  const previewText = page.textContent?.substring(0, 80) ?? '';
  const hasTitle = !!page.title;

  return (
    <div
      className="w-full h-24 rounded-md overflow-hidden border border-gray-200 dark:border-gray-600 relative group-hover:shadow-md transition-shadow duration-200"
      style={{ ...getPageBackgroundCSS(bgType), backgroundColor: '#fff' }}
    >
      <div className="p-1.5 text-xs text-gray-400 dark:text-gray-500 truncate leading-tight">
        {hasTitle ? (
          <span className="font-semibold text-gray-600 dark:text-gray-400">{page.title}</span>
        ) : previewText ? (
          previewText
        ) : (
          <span className="text-gray-300 dark:text-gray-600 italic">Leere Seite</span>
        )}
      </div>
      {/* Bookmark indicator */}
      {page.isBookmark && (
        <div className="absolute top-0 right-0">
          <Bookmark className="w-3 h-3 text-amber-500 fill-amber-500" />
        </div>
      )}
      {/* Drawing indicator */}
      {page.drawingData && (
        <div className="absolute bottom-0 right-0">
          <ImageIcon className="w-3 h-3 text-emerald-500" />
        </div>
      )}
    </div>
  );
}

// ─── Notebook Detail View ────────────────────────────────────────────

function NotebookDetailView({
  notebook,
  subjectName,
  onBack,
  onUpdatePage,
  onAddPage,
  onDeletePage,
  onToggleBookmark,
  onTogglePublic,
  onReorderPages,
}: {
  notebook: Notebook;
  subjectName: string | null;
  onBack: () => void;
  onUpdatePage: (pageId: string, data: Partial<NotebookPage>) => Promise<void>;
  onAddPage: () => void;
  onDeletePage: (pageId: string) => void;
  onToggleBookmark: (pageId: string) => void;
  onTogglePublic: () => void;
  onReorderPages: (pageOrders: Array<{ id: string; pageNumber: number }>) => Promise<void>;
}) {
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [pageContent, setPageContent] = useState('');
  const [pageTitle, setPageTitle] = useState('');
  const [drawingMode, setDrawingMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Version history state
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [pageVersions, setPageVersions] = useState<PageVersion[]>([]);
  const [previewVersion, setPreviewVersion] = useState<PageVersion | null>(null);
  const [restoringVersion, setRestoringVersion] = useState(false);
  const [restoreConfirmVersion, setRestoreConfirmVersion] = useState<PageVersion | null>(null);

  // Drag-and-drop state
  const [draggedPageId, setDraggedPageId] = useState<string | null>(null);
  const [dragOverPageId, setDragOverPageId] = useState<string | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedContentRef = useRef<string>('');
  const lastSavedTitleRef = useRef<string>('');
  const isInternalChange = useRef(false);

  const pages = notebook.pages ?? [];
  const currentPage = pages.find(p => p.id === currentPageId) ?? pages[0] ?? null;

  // Set content into editor ref without triggering auto-save
  const setEditorContent = useCallback((html: string) => {
    isInternalChange.current = true;
    if (editorRef.current) {
      editorRef.current.innerHTML = html;
    }
    setPageContent(html);
    // Reset flag after React processes the state update
    setTimeout(() => { isInternalChange.current = false; }, 50);
  }, []);

  useEffect(() => {
    if (currentPage) {
      setCurrentPageId(currentPage.id);
      setEditorContent(currentPage.textContent ?? '');
      setPageTitle(currentPage.title ?? '');
      lastSavedContentRef.current = currentPage.textContent ?? '';
      lastSavedTitleRef.current = currentPage.title ?? '';
    } else if (pages.length > 0) {
      setCurrentPageId(pages[0].id);
      setEditorContent(pages[0].textContent ?? '');
      setPageTitle(pages[0].title ?? '');
      lastSavedContentRef.current = pages[0].textContent ?? '';
      lastSavedTitleRef.current = pages[0].title ?? '';
    }
  }, [notebook.id, setEditorContent]);

  useEffect(() => {
    if (currentPage) {
      setEditorContent(currentPage.textContent ?? '');
      setPageTitle(currentPage.title ?? '');
      lastSavedContentRef.current = currentPage.textContent ?? '';
      lastSavedTitleRef.current = currentPage.title ?? '';
      setAutoSaveStatus('idle');
    }
  }, [currentPageId, setEditorContent]);

  // Handle content change from contentEditable div
  const handleEditorInput = useCallback(() => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      setPageContent(html);
    }
  }, []);

  // Handle format change from toolbar (for active state refresh)
  const handleFormatChange = useCallback(() => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      setPageContent(html);
    }
  }, []);

  // Auto-save with 3 second debounce
  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(async () => {
      if (!currentPage) return;
      const contentChanged = pageContent !== lastSavedContentRef.current;
      const titleChanged = pageTitle !== lastSavedTitleRef.current;
      if (!contentChanged && !titleChanged) return;

      setAutoSaveStatus('saving');
      try {
        await onUpdatePage(currentPage.id, {
          textContent: pageContent,
          title: pageTitle.trim() || null,
        });
        lastSavedContentRef.current = pageContent;
        lastSavedTitleRef.current = pageTitle;
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      } catch {
        setAutoSaveStatus('idle');
      }
    }, 3000);
  }, [currentPage, pageContent, pageTitle, onUpdatePage]);

  // Trigger auto-save on content or title change
  useEffect(() => {
    if (isInternalChange.current) return;
    triggerAutoSave();
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [pageContent, pageTitle, triggerAutoSave]);

  const handleSavePage = async () => {
    if (!currentPage) return;
    // Sync content from editor
    if (editorRef.current) {
      setPageContent(editorRef.current.innerHTML);
    }
    // Cancel pending auto-save
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    setSaving(true);
    try {
      const contentToSave = editorRef.current?.innerHTML ?? pageContent;
      await onUpdatePage(currentPage.id, {
        textContent: contentToSave,
        title: pageTitle.trim() || null,
      });
      lastSavedContentRef.current = contentToSave;
      lastSavedTitleRef.current = pageTitle;
      toast.success(t('notebooks.page_saved'));
      setAutoSaveStatus('idle');
      // Create version on manual save
      try {
        await apiPost(`/api/notebooks/${notebook.id}/pages/${currentPage.id}/versions`, {
          editSummary: null,
        });
      } catch {
        // version creation is non-critical
      }
    } catch {
      toast.error(t('notebooks.error_save'));
    } finally {
      setSaving(false);
    }
  };

  // Load version history
  const loadVersionHistory = useCallback(async () => {
    if (!currentPage) return;
    try {
      const versions = await apiGet<PageVersion[]>(`/api/notebooks/${notebook.id}/pages/${currentPage.id}/versions`);
      setPageVersions(versions);
    } catch {
      setPageVersions([]);
    }
  }, [notebook.id, currentPage]);

  // Open version history dialog
  const handleOpenVersionHistory = useCallback(async () => {
    setVersionHistoryOpen(true);
    setPreviewVersion(null);
    await loadVersionHistory();
  }, [loadVersionHistory]);

  // Restore a version
  const handleRestoreVersion = useCallback(async (version: PageVersion) => {
    setRestoringVersion(true);
    try {
      const result = await apiPut<{ page: NotebookPage; restoredVersion: PageVersion }>(`/api/notebooks/${notebook.id}/pages/${currentPage!.id}/versions`, {
        versionId: version.id,
      });
      // Update local state with restored page content
      await onUpdatePage(currentPage!.id, {
        textContent: result.page.textContent,
        drawingData: result.page.drawingData,
      });
      setEditorContent(result.page.textContent ?? '');
      setPageContent(result.page.textContent ?? '');
      lastSavedContentRef.current = result.page.textContent ?? '';
      toast.success(t('notebooks.version_restored'));
      setRestoreConfirmVersion(null);
      await loadVersionHistory();
    } catch {
      toast.error(t('notebooks.error_save'));
    } finally {
      setRestoringVersion(false);
    }
  }, [notebook.id, currentPage, onUpdatePage, setEditorContent, loadVersionHistory]);

  // Handle drawing save from DrawingCanvas
  const handleDrawingSave = useCallback(async (drawingData: string, imageData: string) => {
    if (!currentPage) return;
    try {
      await onUpdatePage(currentPage.id, {
        drawingData,
        contentType: currentPage.textContent ? 'mixed' : 'drawing',
      });
      toast.success(t('notebooks.drawing_saved'));
      // Create version on drawing save
      try {
        await apiPost(`/api/notebooks/${notebook.id}/pages/${currentPage.id}/versions`, {
          editSummary: 'Drawing saved',
        });
      } catch {
        // non-critical
      }
    } catch {
      toast.error(t('notebooks.error_save'));
    }
  }, [currentPage, notebook.id, onUpdatePage]);

  // Drag-and-drop handlers for page reorder
  const handleDragStart = useCallback((e: React.DragEvent, pageId: string) => {
    setDraggedPageId(pageId);
    e.dataTransfer.effectAllowed = 'move';
    // Set a transparent drag image
    const ghost = document.createElement('div');
    ghost.style.opacity = '0';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    setTimeout(() => document.body.removeChild(ghost), 0);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, pageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedPageId && pageId !== draggedPageId) {
      setDragOverPageId(pageId);
    }
  }, [draggedPageId]);

  const handleDragLeave = useCallback(() => {
    setDragOverPageId(null);
  }, []);

  const handleDrop = useCallback(async (targetPageId: string) => {
    if (!draggedPageId || draggedPageId === targetPageId) {
      setDraggedPageId(null);
      setDragOverPageId(null);
      return;
    }

    const draggedIdx = pages.findIndex(p => p.id === draggedPageId);
    const targetIdx = pages.findIndex(p => p.id === targetPageId);
    if (draggedIdx === -1 || targetIdx === -1) {
      setDraggedPageId(null);
      setDragOverPageId(null);
      return;
    }

    // Reorder pages locally
    const newPages = [...pages];
    const [removed] = newPages.splice(draggedIdx, 1);
    newPages.splice(targetIdx, 0, removed);

    // Build new pageOrders array
    const pageOrders = newPages.map((p, i) => ({ id: p.id, pageNumber: i + 1 }));

    setDraggedPageId(null);
    setDragOverPageId(null);

    try {
      await onReorderPages(pageOrders);
    } catch {
      toast.error(t('notebooks.reorder_error'));
    }
  }, [draggedPageId, pages, onReorderPages]);

  const handleDragEnd = useCallback(() => {
    setDraggedPageId(null);
    setDragOverPageId(null);
  }, []);

  // Touch-based drag handlers for tablets
  const touchDragRef = useRef<{ pageId: string; startY: number; clone: HTMLElement | null } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent, pageId: string) => {
    const touch = e.touches[0];
    touchDragRef.current = { pageId, startY: touch.clientY, clone: null };
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchDragRef.current) return;
    const touch = e.touches[0];
    const deltaY = Math.abs(touch.clientY - touchDragRef.current.startY);
    if (deltaY > 10 && !touchDragRef.current.clone) {
      setDraggedPageId(touchDragRef.current.pageId);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (dragOverPageId && touchDragRef.current && dragOverPageId !== touchDragRef.current.pageId) {
      handleDrop(dragOverPageId);
    }
    touchDragRef.current = null;
    setDraggedPageId(null);
    setDragOverPageId(null);
  }, [dragOverPageId, handleDrop]);

  const IconComponent = notebook.icon ? ICON_MAP[notebook.icon] ?? BookOpen : BookOpen;

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
      className="flex flex-col h-full animate-slide-in"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <Button variant="ghost" size="sm" onClick={onBack} className="min-h-[44px] min-w-[44px]">
          <ChevronLeft className="w-5 h-5" />
        </Button>

        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: notebook.color }}
        >
          <IconComponent className="w-5 h-5 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-lg truncate text-gray-900 dark:text-gray-100">
            {notebook.title}
          </h2>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            {subjectName && <Badge variant="secondary" className="text-xs">{subjectName}</Badge>}
            <Badge variant="outline" className="text-xs">
              {t(NOTEBOOK_TYPES.find(nt => nt.key === notebook.notebookType)?.labelKey ?? 'notebooks.type_lined')}
            </Badge>
            {notebook.isPublic ? (
              <Badge className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-0">
                <Globe className="w-3 h-3 mr-1" />
                {t('notebooks.shared')}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">{t('notebooks.private')}</Badge>
            )}
          </div>
        </div>

        {/* Auto-save indicator */}
        {autoSaveStatus !== 'idle' && (
          <div className="flex items-center gap-1.5 text-sm shrink-0">
            {autoSaveStatus === 'saving' && (
              <div className="w-3 h-3 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            )}
            {autoSaveStatus === 'saved' && (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            )}
            <span className={`text-xs ${autoSaveStatus === 'saved' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
              {autoSaveStatus === 'saving' ? t('notebooks.auto_saving') : t('notebooks.auto_saved')}
            </span>
          </div>
        )}

        {/* Drawing mode toggle */}
        <Button
          variant={drawingMode ? 'default' : 'outline'}
          size="sm"
          onClick={() => setDrawingMode(!drawingMode)}
          className={`min-h-[44px] shrink-0 transition-all ${drawingMode ? 'bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20' : ''}`}
        >
          <PenLine className="w-4 h-4 mr-1" />
          {drawingMode ? t('notebooks.drawing_mode_exit') : t('notebooks.drawing_mode_toggle')}
        </Button>

        {/* Version history button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleOpenVersionHistory}
          className="min-h-[44px] shrink-0"
        >
          <Clock className="w-4 h-4" />
        </Button>

        {/* Public toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onTogglePublic}
          className="min-h-[44px] shrink-0"
        >
          {notebook.isPublic ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </Button>
      </div>

      {/* Content: sidebar + main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar: page navigation */}
        <div className="w-64 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex flex-col">
          <div className="p-3">
            <Button
              onClick={onAddPage}
              className="w-full min-h-[44px] bg-emerald-600 hover:bg-emerald-700"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              {t('notebooks.add_page')}
            </Button>
          </div>

          <ScrollArea className="flex-1 max-h-[calc(100vh-280px)]">
            <div className="p-2 space-y-2">
              {pages.map((page, idx) => {
                const isDragged = draggedPageId === page.id;
                const isDragOver = dragOverPageId === page.id;
                return (
                  <motion.div
                    key={page.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{
                      opacity: isDragged ? 0.5 : 1,
                      x: 0,
                      scale: isDragged ? 0.95 : 1,
                    }}
                    transition={{ delay: idx * 0.03 }}
                    layout
                    className={`rounded-lg transition-all ${
                      currentPageId === page.id
                        ? 'ring-2 ring-emerald-500'
                        : ''
                    } ${isDragOver ? 'ring-2 ring-blue-400 shadow-lg' : ''} ${
                      isDragged ? 'shadow-md' : ''
                    }`}
                    draggable
                    onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent<HTMLDivElement>, page.id)}
                    onDragOver={(e) => handleDragOver(e as unknown as React.DragEvent<HTMLDivElement>, page.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={() => handleDrop(page.id)}
                    onDragEnd={handleDragEnd}
                    onTouchStart={(e) => handleTouchStart(e, page.id)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  >
                    {/* Drag handle */}
                    <div className="flex items-center">
                      <div className="pl-1.5 py-1 cursor-grab active:cursor-grabbing touch-none">
                        <GripVertical className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      </div>
                      <div className="flex-1">
                        {/* Page thumbnail */}
                        <PageThumbnail page={page} notebookType={notebook.notebookType} />
                      </div>
                    </div>

                    {/* Page info below thumbnail */}
                    <button
                      onClick={() => { setCurrentPageId(page.id); setDrawingMode(false); }}
                      className={`w-full text-left p-2 rounded-b-lg text-sm transition-all min-h-[44px] flex items-center gap-2 ${
                        currentPageId === page.id
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className="text-xs font-mono text-gray-400 dark:text-gray-500 shrink-0">
                        {page.pageNumber}
                      </span>
                      <span className="truncate flex-1">
                        {page.title ?? `${t('notebooks.page')} ${page.pageNumber}`}
                      </span>
                      {page.isBookmark && (
                        <Bookmark className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                      )}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Page count footer */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <BookMarked className="w-3.5 h-3.5" />
                {pages.length} {t('notebooks.pages')}
              </span>
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <Leaf className="w-3 h-3" />
                {t('notebooks.eco_message')}
              </span>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 overflow-hidden">
          {currentPage ? (
            <>
              {/* Page title bar */}
              <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                <Input
                  value={pageTitle}
                  onChange={(e) => setPageTitle(e.target.value)}
                  placeholder={t('notebooks.page_title_placeholder')}
                  className="font-semibold text-lg border-0 bg-transparent shadow-none focus-visible:ring-0 h-10"
                />

                {/* Version history button in page title bar */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenVersionHistory}
                  className="min-h-[44px] shrink-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                >
                  <History className="w-4 h-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleBookmark(currentPage.id)}
                  className={`min-h-[44px] shrink-0 ${currentPage.isBookmark ? 'text-amber-500' : 'text-gray-400'}`}
                >
                  <Star className={`w-4 h-4 ${currentPage.isBookmark ? 'fill-amber-500' : ''}`} />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeletePage(currentPage.id)}
                  className="min-h-[44px] shrink-0 text-red-500 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {drawingMode ? (
                /* Drawing mode - render DrawingCanvas */
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                  className="flex-1 flex flex-col overflow-hidden animate-slide-in"
                >
                  <DrawingCanvas
                    backgroundType={currentPage.background === 'music' || currentPage.background === 'calligraphy' ? 'blank' : (currentPage.background as 'blank' | 'lined' | 'grid' | 'dotted') ?? (notebook.notebookType as 'blank' | 'lined' | 'grid' | 'dotted')}
                    initialDrawingData={currentPage.drawingData ?? undefined}
                    onSave={handleDrawingSave}
                    onExit={() => setDrawingMode(false)}
                    title={currentPage.title ?? `${t('notebooks.page')} ${currentPage.pageNumber}`}
                  />
                </motion.div>
              ) : (
                /* Text editing area with WYSIWYG toolbar and page background */
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* WYSIWYG toolbar */}
                  <WysiwygToolbar editorRef={editorRef} onFormatChange={handleFormatChange} />

                  {/* Page content area */}
                  <div className="flex-1 overflow-hidden p-4">
                    <div
                      className="w-full h-full max-w-3xl mx-auto rounded-xl overflow-hidden"
                      style={{ backgroundColor: '#fff' }}
                    >
                      <ScrollArea className="h-full">
                        <div
                          className="min-h-full p-6"
                          style={getPageBackgroundCSS(currentPage.background ?? notebook.notebookType)}
                        >
                          <div
                            ref={editorRef}
                            contentEditable
                            suppressContentEditableWarning
                            onInput={handleEditorInput}
                            data-placeholder={t('notebooks.page_content') + '...'}
                            className="w-full min-h-[500px] bg-transparent outline-none text-base text-gray-800 dark:text-gray-200 focus:ring-0 prose prose-sm max-w-none [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-gray-300 [&:empty]:dark:before:text-gray-600 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-2 [&_h1]:mt-4 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-1.5 [&_h2]:mt-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-1 [&_h3]:mt-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-2 [&_li]:mb-0.5"
                            style={{ lineHeight: notebook.notebookType === 'lined' || notebook.notebookType === 'calligraphy' ? '32px' : '1.5' }}
                          />
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                </div>
              )}

              {/* Save bar */}
              <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <span>{t('notebooks.page')} {currentPage.pageNumber} / {pages.length}</span>
                  {/* Drawing indicator when not in drawing mode */}
                  {currentPage.drawingData && !drawingMode && (
                    <Badge variant="outline" className="text-xs gap-1 border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400">
                      <ImageIcon className="w-3 h-3" />
                      {t('notebooks.view_drawing')}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* View drawing button if page has drawing data */}
                  {currentPage.drawingData && !drawingMode && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDrawingMode(true)}
                      className="min-h-[44px]"
                    >
                      <ImageIcon className="w-4 h-4 mr-1" />
                      {t('notebooks.edit_drawing')}
                    </Button>
                  )}
                  <Button
                    onClick={handleSavePage}
                    disabled={saving}
                    size="sm"
                    className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700"
                  >
                    {saving ? (
                      <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                    ) : (
                      <Edit3 className="w-4 h-4 mr-1" />
                    )}
                    {t('notebooks.save_page')}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            /* Empty state - no pages */
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
              <BookMarked className="w-16 h-16 text-gray-300 dark:text-gray-600" />
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                {t('notebooks.no_notebooks_desc')}
              </p>
              <Button onClick={onAddPage} className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-1" />
                {t('notebooks.add_page')}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Version History Dialog */}
      <VersionHistoryDialog
        open={versionHistoryOpen}
        onClose={() => setVersionHistoryOpen(false)}
        versions={pageVersions}
        previewVersion={previewVersion}
        onPreviewVersion={setPreviewVersion}
        onRestoreVersion={handleRestoreVersion}
        restoringVersion={restoringVersion}
        restoreConfirmVersion={restoreConfirmVersion}
        onSetRestoreConfirm={setRestoreConfirmVersion}
        currentPageContent={currentPage?.textContent ?? null}
      />
    </motion.div>
  );
}

// ─── Main View ───────────────────────────────────────────────────────

export default function NotebooksView() {
  const currentUser = useAppStore((s) => s.currentUser);
  const schoolId = currentUser?.schoolId ?? '';

  // Data state
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [createOpen, setCreateOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNotebook, setSelectedNotebook] = useState<Notebook | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'shared' | 'templates'>('all');
  const [sharedNotebooksFromApi, setSharedNotebooksFromApi] = useState<Notebook[]>([]);
  const [shareConfirmNotebook, setShareConfirmNotebook] = useState<Notebook | null>(null);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [nbData, subData, clsData] = await Promise.all([
        apiGet<Notebook[]>(`/api/notebooks?schoolId=${schoolId}`),
        apiGet<Subject[]>(`/api/subjects?schoolId=${schoolId}`),
        apiGet<ClassGroup[]>(`/api/classes?schoolId=${schoolId}`),
      ]);
      setNotebooks(nbData);
      setSubjects(subData);
      setClasses(clsData);
    } catch {
      toast.error(t('notebooks.error_load'));
      setNotebooks([]);
      setSubjects([]);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  // Load shared notebooks from other teachers
  const loadSharedNotebooks = useCallback(async () => {
    if (!schoolId) return;
    try {
      const data = await apiGet<Notebook[]>(`/api/notebooks/shared?schoolId=${schoolId}`);
      setSharedNotebooksFromApi(data);
    } catch {
      setSharedNotebooksFromApi([]);
    }
  }, [schoolId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadSharedNotebooks();
  }, [loadSharedNotebooks]);

  // Computed data
  const activeNotebooks = useMemo(
    () => notebooks.filter(n => !n.isArchived),
    [notebooks]
  );

  const archivedNotebooks = useMemo(
    () => notebooks.filter(n => n.isArchived),
    [notebooks]
  );

  const filteredNotebooks = useMemo(() => {
    let list = showArchived ? archivedNotebooks : activeNotebooks;
    if (subjectFilter !== 'all') {
      list = list.filter(n => n.subjectId === subjectFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(n =>
        n.title.toLowerCase().includes(q) ||
        (n.description?.toLowerCase().includes(q) ?? false)
      );
    }
    return list.sort((a, b) => a.sortOrder - b.sortOrder);
  }, [activeNotebooks, archivedNotebooks, showArchived, subjectFilter, searchQuery]);

  // Subject counts for filter bar
  const subjectCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const list = showArchived ? archivedNotebooks : activeNotebooks;
    list.forEach(n => {
      const sid = n.subjectId ?? 'none';
      counts[sid] = (counts[sid] ?? 0) + 1;
    });
    return counts;
  }, [activeNotebooks, archivedNotebooks, showArchived]);

  const subjectNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    subjects.forEach(s => { map[s.id] = s.name; });
    return map;
  }, [subjects]);

  const totalPaperSaved = useMemo(
    () => notebooks.reduce((sum, n) => sum + (n._count?.pages ?? n.pages?.length ?? 0) * 50, 0),
    [notebooks]
  );

  // Handlers
  // BUG FIX: Call loadData() instead of just appending to local state
  const handleCreate = useCallback(async (data: Partial<Notebook>) => {
    await apiPost<Notebook>('/api/notebooks', {
      ...data,
      schoolId,
      ownerId: currentUser?.id ?? '',
      ownerType: currentUser?.role === 'STUDENT' ? 'STUDENT' : 'TEACHER',
      subjectId: data.subjectId === 'none' ? null : data.subjectId,
      classGroupId: data.classGroupId === 'none' ? null : data.classGroupId,
    });
    await loadData();
    toast.success(t('notebooks.created'));
  }, [schoolId, currentUser, loadData]);

  const handleArchive = useCallback(async (notebook: Notebook) => {
    const updated = await apiPut<Notebook>(`/api/notebooks/${notebook.id}`, {
      isArchived: !notebook.isArchived,
    });
    setNotebooks(prev => prev.map(n => n.id === updated.id ? updated : n));
    toast.success(notebook.isArchived ? t('notebooks.unarchived_toast') : t('notebooks.archived_toast'));
  }, []);

  const handleDelete = useCallback(async (notebook: Notebook) => {
    await apiDelete(`/api/notebooks/${notebook.id}`);
    setNotebooks(prev => prev.filter(n => n.id !== notebook.id));
    toast.success(t('notebooks.deleted_toast'));
  }, []);

  const handleOpenNotebook = useCallback(async (notebook: Notebook) => {
    try {
      const pages = await apiGet<NotebookPage[]>(`/api/notebooks/${notebook.id}/pages`);
      const fullNotebook = { ...notebook, pages };
      setSelectedNotebook(fullNotebook);
    } catch {
      setSelectedNotebook({ ...notebook, pages: [] });
    }
  }, []);

  const handleUpdatePage = useCallback(async (pageId: string, data: Partial<NotebookPage>) => {
    if (!selectedNotebook) return;
    const updated = await apiPut<NotebookPage>(`/api/notebooks/${selectedNotebook.id}/pages/${pageId}`, data);
    setSelectedNotebook(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        pages: prev.pages?.map(p => p.id === updated.id ? updated : p) ?? [],
      };
    });
  }, [selectedNotebook]);

  const handleAddPage = useCallback(async () => {
    if (!selectedNotebook) return;
    const pagesCount = selectedNotebook.pages?.length ?? 0;
    const newPage = await apiPost<NotebookPage>(`/api/notebooks/${selectedNotebook.id}/pages`, {
      pageNumber: pagesCount + 1,
      background: selectedNotebook.notebookType,
    });
    setSelectedNotebook(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        pages: [...(prev.pages ?? []), newPage],
      };
    });
    toast.success(t('notebooks.page_added'));
  }, [selectedNotebook]);

  const handleDeletePage = useCallback(async (pageId: string) => {
    if (!selectedNotebook) return;
    await apiDelete(`/api/notebooks/${selectedNotebook.id}/pages/${pageId}`);
    setSelectedNotebook(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        pages: prev.pages?.filter(p => p.id !== pageId) ?? [],
      };
    });
    toast.success(t('notebooks.page_deleted'));
  }, [selectedNotebook]);

  const handleToggleBookmark = useCallback(async (pageId: string) => {
    if (!selectedNotebook) return;
    const page = selectedNotebook.pages?.find(p => p.id === pageId);
    if (!page) return;
    const updated = await apiPut<NotebookPage>(`/api/notebooks/${selectedNotebook.id}/pages/${pageId}`, {
      isBookmark: !page.isBookmark,
    });
    setSelectedNotebook(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        pages: prev.pages?.map(p => p.id === updated.id ? updated : p) ?? [],
      };
    });
  }, [selectedNotebook]);

  const handleTogglePublic = useCallback(async () => {
    if (!selectedNotebook) return;
    const updated = await apiPut<Notebook>(`/api/notebooks/${selectedNotebook.id}`, {
      isPublic: !selectedNotebook.isPublic,
    });
    setSelectedNotebook(updated);
    setNotebooks(prev => prev.map(n => n.id === updated.id ? updated : n));
  }, [selectedNotebook]);

  const handleReorderPages = useCallback(async (pageOrders: Array<{ id: string; pageNumber: number }>) => {
    if (!selectedNotebook) return;
    const updatedPages = await apiPut<NotebookPage[]>(`/api/notebooks/${selectedNotebook.id}/pages/reorder`, {
      pageOrders,
    });
    setSelectedNotebook(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        pages: updatedPages,
      };
    });
    toast.success(t('notebooks.reorder_success'));
  }, [selectedNotebook]);

  const handleShare = useCallback(async (notebook: Notebook) => {
    setShareConfirmNotebook(notebook);
  }, []);

  const handleConfirmShare = useCallback(async () => {
    if (!shareConfirmNotebook) return;
    try {
      const updated = await apiPut<Notebook>(`/api/notebooks/${shareConfirmNotebook.id}`, {
        isPublic: !shareConfirmNotebook.isPublic,
      });
      setNotebooks(prev => prev.map(n => n.id === updated.id ? updated : n));
      toast.success(updated.isPublic ? t('notebooks.shared') : t('notebooks.private'));
    } catch {
      toast.error(t('notebooks.error_save'));
    } finally {
      setShareConfirmNotebook(null);
    }
  }, [shareConfirmNotebook]);

  const handleDuplicate = useCallback(async (notebook: Notebook) => {
    try {
      await apiPost<Notebook>(`/api/notebooks/${notebook.id}/duplicate`);
      await loadData();
      toast.success(t('notebooks.duplicated'));
    } catch {
      toast.error(t('notebooks.duplicate_error'));
    }
  }, [loadData]);

  const handleCreateFromTemplate = useCallback(async (template: NotebookTemplate) => {
    try {
      const newNotebook = await apiPost<Notebook>('/api/notebooks', {
        schoolId,
        ownerId: currentUser?.id ?? '',
        ownerType: 'TEACHER',
        title: t(template.titleKey),
        description: t(template.descKey),
        notebookType: template.notebookType,
        color: template.color,
        icon: template.icon,
        isPublic: false,
        subjectId: null,
        classGroupId: null,
      });
      // Create pages from the template
      for (let i = 0; i < template.pages.length; i++) {
        const page = template.pages[i];
        await apiPost<NotebookPage>(`/api/notebooks/${newNotebook.id}/pages`, {
          pageNumber: i + 1,
          title: page.title,
          textContent: page.content,
          background: template.notebookType,
        });
      }
      await loadData();
      toast.success(t('notebooks.created'));
    } catch {
      toast.error(t('notebooks.error_create'));
    }
  }, [schoolId, currentUser, loadData]);

  // Role detection
  const isStudent = currentUser?.role === 'STUDENT';

  // Separate own notebooks and shared notebooks (for students)
  const ownNotebooks = useMemo(
    () => notebooks.filter(n => n.ownerId === currentUser?.id),
    [notebooks, currentUser?.id]
  );

  const sharedNotebooks = useMemo(
    () => notebooks.filter(n => n.ownerId !== currentUser?.id && n.isPublic),
    [notebooks, currentUser?.id]
  );

  const ownActiveNotebooks = useMemo(
    () => ownNotebooks.filter(n => !n.isArchived),
    [ownNotebooks]
  );

  const ownArchivedNotebooks = useMemo(
    () => ownNotebooks.filter(n => n.isArchived),
    [ownNotebooks]
  );

  // Keyboard shortcuts listener
  useEffect(() => {
    function onShortcut(e: Event) {
      const detail = (e as CustomEvent).detail;
      switch (detail) {
        case 'new-notebook':
          setCreateOpen(true);
          break;
        case 'new-page':
          if (selectedNotebook) {
            handleAddPage();
          }
          break;
        case 'drawing':
          if (selectedNotebook) {
            // The NotebookDetailView handles drawing mode internally
            toast.info(t('shortcuts.drawing'));
          } else {
            // Navigate to drawing view
            const setCurrentView = useAppStore.getState().setCurrentView;
            setCurrentView('drawing');
          }
          break;
        case 'export-pdf':
          if (selectedNotebook) {
            toast.info(t('shortcuts.export_pdf'));
          }
          break;
        case 'archive-toggle':
          setShowArchived(prev => !prev);
          break;
        case 'close-notebook':
          if (selectedNotebook) {
            setSelectedNotebook(null);
          }
          break;
      }
    }
    window.addEventListener('ct-shortcut', onShortcut);
    return () => window.removeEventListener('ct-shortcut', onShortcut);
  }, [selectedNotebook, handleAddPage]);

  if (selectedNotebook) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <NotebookDetailView
          notebook={selectedNotebook}
          subjectName={selectedNotebook.subjectId ? subjectNameMap[selectedNotebook.subjectId] ?? null : null}
          onBack={() => setSelectedNotebook(null)}
          onUpdatePage={handleUpdatePage}
          onAddPage={handleAddPage}
          onDeletePage={handleDeletePage}
          onToggleBookmark={handleToggleBookmark}
          onTogglePublic={handleTogglePublic}
          onReorderPages={handleReorderPages}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4"
      >
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-emerald-500" />
              {t('notebooks.title')}
              {/* Role indicator */}
              {isStudent ? (
                <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-0 text-xs ml-1">
                  <GraduationCap className="w-3 h-3 mr-1" />
                  {t('role.student')}
                </Badge>
              ) : (
                <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-0 text-xs ml-1">
                  <UserIcon className="w-3 h-3 mr-1" />
                  {t('role.teacher')}
                </Badge>
              )}
            </h1>
            <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 mt-1">
              <Leaf className="w-4 h-4" />
              <span>{t('notebooks.subtitle')}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3">
            <Card className="px-3 py-2 border-0 shadow-sm bg-emerald-50 dark:bg-emerald-900/20">
              <div className="text-xs text-emerald-600 dark:text-emerald-400">{t('notebooks.total_notebooks')}</div>
              <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{activeNotebooks.length}</div>
            </Card>
            <Card className="px-3 py-2 border-0 shadow-sm bg-emerald-50 dark:bg-emerald-900/20">
              <div className="text-xs text-emerald-600 dark:text-emerald-400">{t('notebooks.paper_saved')}</div>
              <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                {totalPaperSaved} {t('notebooks.pages_unit')}
              </div>
            </Card>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('notebooks.search_placeholder')}
              className="pl-9 min-h-[44px] w-full sm:w-64"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          {/* Create button */}
          <Button
            onClick={() => setCreateOpen(true)}
            className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700 shrink-0"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('notebooks.create')}
          </Button>
        </div>
      </motion.div>

      {/* Tab Bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.05 }}
        className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-2"
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setActiveTab('all'); setSubjectFilter('all'); }}
            className={`px-4 py-2 rounded-full text-sm font-medium min-h-[44px] transition-all ${
              activeTab === 'all'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <BookOpen className="w-4 h-4 inline mr-1.5" />
            {t('notebooks.tab_all')}
            <span className="ml-1 text-xs opacity-75">{activeNotebooks.length}</span>
          </button>
          {!isStudent && (
            <button
              onClick={() => { setActiveTab('shared'); setSubjectFilter('all'); }}
              className={`px-4 py-2 rounded-full text-sm font-medium min-h-[44px] transition-all ${
                activeTab === 'shared'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <Globe className="w-4 h-4 inline mr-1.5" />
              {t('notebooks.tab_shared')}
              <span className="ml-1 text-xs opacity-75">{sharedNotebooksFromApi.length}</span>
            </button>
          )}
          <button
            onClick={() => { setActiveTab('templates'); setSubjectFilter('all'); }}
            className={`px-4 py-2 rounded-full text-sm font-medium min-h-[44px] transition-all ${
              activeTab === 'templates'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <Sparkles className="w-4 h-4 inline mr-1.5" />
            {t('notebooks.tab_templates')}
          </button>
        </div>
      </motion.div>

      {/* Subject Filter Bar — only show in "all" tab */}
      {activeTab === 'all' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-2"
        >
          <div className="flex items-center gap-2 flex-wrap">
            {/* All filter */}
            <button
              onClick={() => setSubjectFilter('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium min-h-[36px] transition-all ${
                subjectFilter === 'all'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {t('notebooks.filter_all')}
              <span className="ml-1 text-xs opacity-75">
                {(showArchived ? archivedNotebooks : activeNotebooks).length}
              </span>
            </button>

            {/* Subject filters */}
            {subjects.map((s) => {
              const count = subjectCounts[s.id] ?? 0;
              if (count === 0) return null;
              return (
                <button
                  key={s.id}
                  onClick={() => setSubjectFilter(s.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium min-h-[36px] transition-all ${
                    subjectFilter === s.id
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {s.name}
                  <span className="ml-1 text-xs opacity-75">{count}</span>
                </button>
              );
            })}

            {/* No subject filter */}
            {subjectCounts['none'] > 0 && (
              <button
                onClick={() => setSubjectFilter('none')}
                className={`px-4 py-2 rounded-full text-sm font-medium min-h-[36px] transition-all ${
                  subjectFilter === 'none'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {t('notebooks.no_subject')}
                <span className="ml-1 text-xs opacity-75">{subjectCounts['none']}</span>
              </button>
            )}

            {/* Archive toggle */}
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowArchived(!showArchived)}
                className={`min-h-[36px] ${showArchived ? 'text-emerald-600' : 'text-gray-500'}`}
              >
                <Archive className="w-4 h-4 mr-1" />
                {showArchived ? t('notebooks.hide_archived') : t('notebooks.show_archived')}
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Content Area */}
      <div className="flex-1 p-4 sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              <span className="text-gray-500">{t('notebooks.loading')}</span>
            </div>
          </div>
        ) : activeTab === 'templates' ? (
          /* Templates Tab */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-500" />
                {t('notebooks.templates')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('notebooks.template_desc')}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {NOTEBOOK_TEMPLATES.map((template, idx) => {
                const TemplateIcon = template.iconComponent;
                return (
                  <motion.div
                    key={template.key}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card className="relative overflow-hidden cursor-pointer group transition-shadow duration-300 hover:shadow-lg border-0" style={{ boxShadow: `4px 4px 12px rgba(0,0,0,0.15), 1px 1px 3px rgba(0,0,0,0.1)` }}>
                      <div
                        className="relative h-28 flex items-center justify-center overflow-hidden"
                        style={{ background: `linear-gradient(135deg, ${template.color}, ${template.color}cc)` }}
                      >
                        <div
                          className="absolute left-0 top-0 bottom-0 w-3 opacity-80"
                          style={{ background: `linear-gradient(90deg, ${template.color}99, ${template.color}66)` }}
                        />
                        <TemplateIcon className="w-12 h-12 text-white/90 drop-shadow-md" />
                        <Badge className="absolute top-2 right-2 bg-white/90 text-gray-700 text-xs border-0 shadow-sm">
                          {template.pages.length} {t('notebooks.pages')}
                        </Badge>
                      </div>
                      <CardContent className="p-4 space-y-3">
                        <div className="font-semibold text-base text-gray-900 dark:text-gray-100">
                          {t(template.titleKey)}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t(template.descKey)}</p>
                        <Button
                          onClick={() => handleCreateFromTemplate(template)}
                          className="w-full min-h-[44px] bg-emerald-600 hover:bg-emerald-700"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          {t('notebooks.create_from_template')}
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ) : activeTab === 'shared' ? (
          /* Shared Notebooks Tab */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Globe className="w-5 h-5 text-emerald-500" />
                {t('notebooks.shared_notebooks')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('notebooks.shared_empty_desc')}</p>
            </div>
            {sharedNotebooksFromApi.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-20 gap-4"
              >
                <Globe className="w-16 h-16 text-gray-300 dark:text-gray-600" />
                <p className="text-gray-500 dark:text-gray-400 text-lg">{t('notebooks.shared_empty')}</p>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                <AnimatePresence mode="popLayout">
                  {sharedNotebooksFromApi.map((notebook, idx) => (
                    <motion.div
                      key={notebook.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <NotebookCard
                        notebook={notebook}
                        subjectName={notebook.subject?.name ?? null}
                        onOpen={() => handleOpenNotebook(notebook)}
                        onArchive={() => handleArchive(notebook)}
                        onDelete={() => handleDelete(notebook)}
                        isShared
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        ) : isStudent && sharedNotebooks.length > 0 ? (
          /* Student view: show "My Notebooks" and "Shared with me" sections */
          <div className="space-y-8">
            {/* My Notebooks section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {t('notebooks.my_notebooks')}
                </h2>
                <Badge variant="secondary" className="text-xs">{ownActiveNotebooks.length}</Badge>
              </div>
              {ownActiveNotebooks.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-12 gap-4"
                >
                  <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                  <p className="text-gray-500 dark:text-gray-400">{t('notebooks.no_notebooks')}</p>
                  <Button
                    onClick={() => setCreateOpen(true)}
                    className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('notebooks.no_notebooks_create')}
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
                >
                  <AnimatePresence mode="popLayout">
                    {ownActiveNotebooks.map((notebook, idx) => (
                      <motion.div
                        key={notebook.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <NotebookCard
                          notebook={notebook}
                          subjectName={notebook.subjectId ? subjectNameMap[notebook.subjectId] ?? null : null}
                          onOpen={() => handleOpenNotebook(notebook)}
                          onArchive={() => handleArchive(notebook)}
                          onDelete={() => handleDelete(notebook)}
                          onShare={() => handleShare(notebook)}
                          onDuplicate={() => handleDuplicate(notebook)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </div>

            {/* Shared with me section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Share2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {t('notebooks.shared_with_me')}
                </h2>
                <Badge variant="secondary" className="text-xs">{sharedNotebooks.length}</Badge>
              </div>
              {sharedNotebooks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <Share2 className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                  <p className="text-gray-400 dark:text-gray-500 text-sm">{t('notebooks.no_notebooks')}</p>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
                >
                  <AnimatePresence mode="popLayout">
                    {sharedNotebooks.map((notebook, idx) => (
                      <motion.div
                        key={notebook.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <NotebookCard
                          notebook={notebook}
                          subjectName={notebook.subjectId ? subjectNameMap[notebook.subjectId] ?? null : null}
                          onOpen={() => handleOpenNotebook(notebook)}
                          onArchive={() => handleArchive(notebook)}
                          onDelete={() => handleDelete(notebook)}
                          isShared
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </div>
          </div>
        ) : filteredNotebooks.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 gap-4"
          >
            <BookOpen className="w-16 h-16 text-gray-300 dark:text-gray-600" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              {showArchived ? t('notebooks.no_archived') : t('notebooks.no_notebooks')}
            </p>
            {!showArchived && (
              <Button
                onClick={() => setCreateOpen(true)}
                className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('notebooks.no_notebooks_create')}
              </Button>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
          >
            <AnimatePresence mode="popLayout">
              {filteredNotebooks.map((notebook, idx) => (
                <motion.div
                  key={notebook.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <NotebookCard
                    notebook={notebook}
                    subjectName={notebook.subjectId ? subjectNameMap[notebook.subjectId] ?? null : null}
                    onOpen={() => handleOpenNotebook(notebook)}
                    onArchive={() => handleArchive(notebook)}
                    onDelete={() => handleDelete(notebook)}
                    onShare={() => handleShare(notebook)}
                    onDuplicate={() => handleDuplicate(notebook)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Eco footer bar */}
      <div className="bg-emerald-50 dark:bg-emerald-900/20 border-t border-emerald-200 dark:border-emerald-800 px-4 sm:px-6 py-3">
        <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-300 text-sm">
          <Leaf className="w-5 h-5" />
          <span>
            {t('notebooks.eco_total', {
              count: notebooks.length,
              pages: totalPaperSaved,
            })}
          </span>
          <Separator orientation="vertical" className="h-4 bg-emerald-300 dark:bg-emerald-700" />
          <span className="text-xs">{t('notebooks.eco_message')}</span>
        </div>
      </div>

      {/* Share Confirmation Dialog */}
      <AlertDialog open={!!shareConfirmNotebook} onOpenChange={(open) => { if (!open) setShareConfirmNotebook(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {shareConfirmNotebook?.isPublic ? <EyeOff className="w-5 h-5" /> : <Share2 className="w-5 h-5 text-emerald-500" />}
              {shareConfirmNotebook?.isPublic ? t('notebooks.unshare_confirm') : t('notebooks.share_confirm')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {shareConfirmNotebook?.isPublic ? t('notebooks.unshare_confirm_desc') : t('notebooks.share_confirm_desc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-[44px]">{t('action.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmShare} className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700">
              {t('action.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Dialog */}
      <CreateNotebookDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        subjects={subjects}
        classes={classes}
        onCreate={handleCreate}
      />
    </div>
  );
}

// ─── Version History Dialog ──────────────────────────────────────────

function VersionHistoryDialog({
  open,
  onClose,
  versions,
  previewVersion,
  onPreviewVersion,
  onRestoreVersion,
  restoringVersion,
  restoreConfirmVersion,
  onSetRestoreConfirm,
  currentPageContent,
}: {
  open: boolean;
  onClose: () => void;
  versions: PageVersion[];
  previewVersion: PageVersion | null;
  onPreviewVersion: (version: PageVersion) => void;
  onRestoreVersion: (version: PageVersion) => void;
  restoringVersion: boolean;
  restoreConfirmVersion: PageVersion | null;
  onSetRestoreConfirm: (version: PageVersion | null) => void;
  currentPageContent: string | null;
}) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getPreviewText = (content: string | null) => {
    if (!content) return '';
    // Strip HTML tags to get plain text preview
    const plain = content.replace(/<[^>]*>/g, '').trim();
    return plain.substring(0, 120) + (plain.length > 120 ? '...' : '');
  };

  const isLatestVersion = versions.length > 0 && previewVersion?.id === versions[0]?.id;

  return (
    <>
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-500" />
            {t('notebooks.version_history_title')}
          </DialogTitle>
          <DialogDescription>
            {t('notebooks.version_history')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 overflow-y-auto max-h-[60vh]">
          {versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Clock className="w-10 h-10 text-gray-300 dark:text-gray-600" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {t('notebooks.version_no_history')}
              </p>
            </div>
          ) : (
            <div className="version-timeline">
              {versions.map((version, idx) => {
                const isCurrent = idx === 0;
                const isPreviewed = previewVersion?.id === version.id;
                return (
                  <div key={version.id} className="flex items-start gap-3 group">
                    {/* Timeline dot */}
                    <div className="flex flex-col items-center shrink-0 pt-1">
                      <div className={`w-3 h-3 rounded-full border-2 transition-all ${
                        isCurrent
                          ? 'bg-emerald-500 border-emerald-500 animate-pulse-dot'
                          : isPreviewed
                            ? 'bg-emerald-400 border-emerald-400'
                            : 'bg-gray-300 dark:bg-gray-600 border-gray-400 dark:border-gray-500'
                      }`} />
                      {idx < versions.length - 1 && (
                        <div className="w-0.5 h-full min-h-[40px] bg-gray-200 dark:bg-gray-700 mt-1" />
                      )}
                    </div>

                    {/* Version content */}
                    <div
                      className={`flex-1 rounded-lg p-3 transition-all cursor-pointer ${
                        isPreviewed
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-700'
                          : 'bg-gray-50 dark:bg-gray-800/50 border border-transparent hover:border-gray-200 dark:hover:border-gray-600'
                      }`}
                      onClick={() => onPreviewVersion(version)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-gray-700 dark:text-gray-300">
                            {t('notebooks.version_number')} {version.version}
                          </span>
                          {isCurrent && (
                            <Badge className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-0">
                              {t('notebooks.version_current')}
                            </Badge>
                          )}
                          {version.editSummary && (
                            <Badge variant="outline" className="text-xs">
                              {version.editSummary}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {formatDate(version.createdAt)}
                        </span>
                      </div>

                      {/* Content preview */}
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                        {getPreviewText(version.textContent)}
                      </div>

                      {/* Drawing indicator */}
                      {version.drawingData && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                          <ImageIcon className="w-3 h-3" />
                          {t('notebooks.drawing_page_label')}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Preview panel */}
          {previewVersion && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-900">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  {t('notebooks.version_preview')} - {t('notebooks.version_number')} {previewVersion.version}
                  {versions[0]?.id === previewVersion.id && (
                    <Badge className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-0">
                      {t('notebooks.version_current')}
                    </Badge>
                  )}
                </h4>
                {!isLatestVersion && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSetRestoreConfirm(previewVersion)}
                    disabled={restoringVersion}
                    className="min-h-[36px]"
                  >
                    <History className="w-3.5 h-3.5 mr-1" />
                    {t('notebooks.version_restore')}
                  </Button>
                )}
              </div>
              <ScrollArea className="max-h-[200px]">
                <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {previewVersion.textContent ? getPreviewText(previewVersion.textContent) : t('notebooks.export_empty_page')}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="min-h-[44px]">
            {t('action.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Restore confirmation */}
    <AlertDialog open={!!restoreConfirmVersion} onOpenChange={(v) => { if (!v) onSetRestoreConfirm(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-500" />
            {t('notebooks.version_restore_confirm')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('notebooks.version_restore_desc')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-[44px]">{t('action.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => { if (restoreConfirmVersion) onRestoreVersion(restoreConfirmVersion); }}
            disabled={restoringVersion}
            className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700"
          >
            {restoringVersion ? (
              <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
            ) : null}
            {t('notebooks.version_restore')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
