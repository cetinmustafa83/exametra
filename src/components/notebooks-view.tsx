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
  Users as UsersIcon, Radio, MousePointer2, Columns2,
  ChevronRight, XCircle, Trophy, Zap, Flame, Dumbbell, Heart, RotateCcw, ArrowRight, Play,
  StickyNote, LayoutTemplate, Network, GitCompare, CalendarDays,
  FolderOpen, Search as SearchIcon, ClipboardCopy, Tag,
  Minus, CircleDot, Sparkles as SparklesIcon,
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
import { apiGet, apiPost, apiPut, apiDelete, fetchSubjectTopics, fetchSubjectTopic, fetchSubjectLessons, fetchSubjectLesson, fetchLessonQuestions, submitStudentAnswer } from '@/lib/api';
import type { SubjectTopicData, SubjectLessonData, LessonQuestionData, StudentAnswerData } from '@/lib/api';
import { toast } from 'sonner';
import DrawingCanvas from '@/components/drawing-canvas';
import { useNotebookCollaboration, type CursorData, type EditData } from '@/lib/websocket';

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

// ─── Sticky Note Type ────────────────────────────────────────────────

interface StickyNoteData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  text: string;
  pageId: string;
}

// ─── Section Type ────────────────────────────────────────────────────

interface SectionData {
  id: string;
  name: string;
  color: string;
  pageIds: string[];
}

// ─── Sticker Data Type ────────────────────────────────────────────────

interface StickerData {
  id: string;
  type: string;
  x: number;
  y: number;
  size: number;
  color: string;
  pageId: string;
}

// ─── Washi Tape Data Type ────────────────────────────────────────────

interface WashiTapeData {
  id: string;
  x: number;
  y: number;
  width: number;
  color: string;
  pattern: string;
  pageId: string;
}

// ─── Page Template Definitions ───────────────────────────────────────

const PAGE_TEMPLATES: Array<{
  key: string;
  titleKey: string;
  descKey: string;
  icon: React.ElementType;
  background: string;
  getContent: () => string;
}> = [
  {
    key: 'blank',
    titleKey: 'notebooks.page_template_blank',
    descKey: 'notebooks.type_blank_desc',
    icon: File,
    background: 'blank',
    getContent: () => '',
  },
  {
    key: 'cornell',
    titleKey: 'notebooks.page_template_cornell',
    descKey: 'notebooks.page_template_cornell_desc',
    icon: LayoutTemplate,
    background: 'lined',
    getContent: () => `<div style="display:grid;grid-template-columns:1fr 2fr;grid-template-rows:auto 1fr;gap:8px;min-height:500px;border:1px solid #e5e7eb;border-radius:8px;padding:8px;"><div style="border-right:1px solid #e5e7eb;padding-right:8px;font-size:12px;color:#9ca3af;"><b>Stichworte</b><br><br><br></div><div style="padding-left:8px;"><b>Notizen</b><br><br><br></div><div style="grid-column:1/-1;border-top:1px solid #e5e7eb;padding-top:8px;"><b>Zusammenfassung</b><br><br></div></div>`,
  },
  {
    key: 'mindmap',
    titleKey: 'notebooks.page_template_mindmap',
    descKey: 'notebooks.page_template_mindmap_desc',
    icon: Network,
    background: 'blank',
    getContent: () => `<div style="display:flex;align-items:center;justify-content:center;min-height:500px;"><div style="position:relative;width:100%;height:100%;"><div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:120px;height:120px;border-radius:50%;border:3px solid #10b981;display:flex;align-items:center;justify-content:center;font-weight:bold;color:#10b981;">Zentrales Thema</div><div style="position:absolute;top:20%;left:15%;width:80px;height:80px;border-radius:50%;border:2px solid #3b82f6;display:flex;align-items:center;justify-content:center;font-size:12px;color:#3b82f6;">Idee 1</div><div style="position:absolute;top:20%;right:15%;width:80px;height:80px;border-radius:50%;border:2px solid #ef4444;display:flex;align-items:center;justify-content:center;font-size:12px;color:#ef4444;">Idee 2</div><div style="position:absolute;bottom:20%;left:15%;width:80px;height:80px;border-radius:50%;border:2px solid #f59e0b;display:flex;align-items:center;justify-content:center;font-size:12px;color:#f59e0b;">Idee 3</div><div style="position:absolute;bottom:20%;right:15%;width:80px;height:80px;border-radius:50%;border:2px solid #8b5cf6;display:flex;align-items:center;justify-content:center;font-size:12px;color:#8b5cf6;">Idee 4</div></div></div>`,
  },
  {
    key: 'venn',
    titleKey: 'notebooks.page_template_venn',
    descKey: 'notebooks.page_template_venn_desc',
    icon: GitCompare,
    background: 'blank',
    getContent: () => `<div style="display:flex;align-items:center;justify-content:center;min-height:500px;position:relative;"><div style="position:absolute;width:260px;height:260px;border-radius:50%;border:3px solid #3b82f6;background:rgba(59,130,246,0.08);display:flex;align-items:center;justify-content:center;left:calc(50% - 180px);"><span style="font-size:12px;color:#3b82f6;font-weight:bold;">Menge A</span></div><div style="position:absolute;width:260px;height:260px;border-radius:50%;border:3px solid #ef4444;background:rgba(239,68,68,0.08);display:flex;align-items:center;justify-content:center;left:calc(50% - 80px);"><span style="font-size:12px;color:#ef4444;font-weight:bold;">Menge B</span></div><div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:11px;color:#6b7280;font-weight:bold;">Gemeinsam</div></div>`,
  },
  {
    key: 'tchart',
    titleKey: 'notebooks.page_template_tchart',
    descKey: 'notebooks.page_template_tchart_desc',
    icon: Columns2,
    background: 'lined',
    getContent: () => `<div style="display:grid;grid-template-columns:1fr 1fr;min-height:500px;border:1px solid #e5e7eb;border-radius:8px;"><div style="border-right:2px solid #10b981;padding:12px;"><b>Seite A</b><br><br><br></div><div style="padding:12px;"><b>Seite B</b><br><br><br></div></div>`,
  },
  {
    key: 'weekly',
    titleKey: 'notebooks.page_template_weekly',
    descKey: 'notebooks.page_template_weekly_desc',
    icon: CalendarDays,
    background: 'grid',
    getContent: () => `<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:4px;min-height:500px;"><div style="border:1px solid #e5e7eb;border-radius:4px;padding:8px;background:#f0fdf4;"><b>Montag</b><br><br></div><div style="border:1px solid #e5e7eb;border-radius:4px;padding:8px;background:#eff6ff;"><b>Dienstag</b><br><br></div><div style="border:1px solid #e5e7eb;border-radius:4px;padding:8px;background:#fef3c7;"><b>Mittwoch</b><br><br></div><div style="border:1px solid #e5e7eb;border-radius:4px;padding:8px;background:#fce7f3;"><b>Donnerstag</b><br><br></div><div style="border:1px solid #e5e7eb;border-radius:4px;padding:8px;background:#f3e8ff;"><b>Freitag</b><br><br></div></div>`,
  },
];

const STICKY_NOTE_COLORS = [
  { key: 'yellow', color: '#fef08a', border: '#fbbf24' },
  { key: 'green', color: '#bbf7d0', border: '#34d399' },
  { key: 'blue', color: '#bfdbfe', border: '#60a5fa' },
  { key: 'pink', color: '#fbcfe8', border: '#f472b6' },
  { key: 'orange', color: '#fed7aa', border: '#fb923c' },
  { key: 'purple', color: '#ddd6fe', border: '#a78bfa' },
];

// ─── Sticker Definitions ─────────────────────────────────────────────

const STICKER_TYPES: Array<{
  key: string;
  labelKey: string;
  icon: React.ElementType;
  color: string;
}> = [
  { key: 'star', labelKey: 'notebooks.sticker_star', icon: Star, color: '#f59e0b' },
  { key: 'thumbs_up', labelKey: 'notebooks.sticker_thumbs_up', icon: Zap, color: '#10b981' },
  { key: 'checkmark', labelKey: 'notebooks.sticker_checkmark', icon: CheckCircle2, color: '#16a34a' },
  { key: 'heart', labelKey: 'notebooks.sticker_heart', icon: Heart, color: '#ef4444' },
  { key: 'trophy', labelKey: 'notebooks.sticker_trophy', icon: Trophy, color: '#f59e0b' },
  { key: 'lightning', labelKey: 'notebooks.sticker_lightning', icon: Zap, color: '#8b5cf6' },
  { key: 'flame', labelKey: 'notebooks.sticker_flame', icon: Flame, color: '#ef4444' },
  { key: 'medal', labelKey: 'notebooks.sticker_medal', icon: Trophy, color: '#ea580c' },
  { key: 'crown', labelKey: 'notebooks.sticker_crown', icon: Star, color: '#f59e0b' },
  { key: 'sun', labelKey: 'notebooks.sticker_sun', icon: Sparkles, color: '#f59e0b' },
  { key: 'rainbow', labelKey: 'notebooks.sticker_rainbow', icon: SparklesIcon, color: '#8b5cf6' },
  { key: 'flower', labelKey: 'notebooks.sticker_flower', icon: Leaf, color: '#10b981' },
];

// ─── Washi Tape Definitions ──────────────────────────────────────────

const WASHI_TAPE_COLORS = [
  { key: 'pink', color: '#fbcfe8', pattern: 'stripes' },
  { key: 'green', color: '#bbf7d0', pattern: 'dots' },
  { key: 'blue', color: '#bfdbfe', pattern: 'stripes' },
  { key: 'yellow', color: '#fef08a', pattern: 'cross' },
  { key: 'purple', color: '#ddd6fe', pattern: 'dots' },
  { key: 'orange', color: '#fed7aa', pattern: 'stripes' },
  { key: 'teal', color: '#99f6e4', pattern: 'cross' },
  { key: 'red', color: '#fecaca', pattern: 'dots' },
];

const SECTION_COLORS = [
  '#10b981', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
];

// ─── Constants ───────────────────────────────────────────────────────

const NOTEBOOK_TYPES: Array<{ key: string; icon: React.ElementType; labelKey: string; descKey: string; isCurriculum?: boolean }> = [
  { key: 'lined', icon: AlignLeft, labelKey: 'notebooks.type_lined', descKey: 'notebooks.type_lined_desc' },
  { key: 'grid', icon: Grid3X3, labelKey: 'notebooks.type_grid', descKey: 'notebooks.type_grid_desc' },
  { key: 'blank', icon: File, labelKey: 'notebooks.type_blank', descKey: 'notebooks.type_blank_desc' },
  { key: 'dotted', icon: MoreHorizontal, labelKey: 'notebooks.type_dotted', descKey: 'notebooks.type_dotted_desc' },
  { key: 'music', icon: Music, labelKey: 'notebooks.type_music', descKey: 'notebooks.type_music_desc' },
  { key: 'calligraphy', icon: PenTool, labelKey: 'notebooks.type_calligraphy', descKey: 'notebooks.type_calligraphy_desc' },
  // German curriculum notebook types
  { key: 'deutschheft', icon: BookOpen, labelKey: 'notebooks.type_deutschheft', descKey: 'notebooks.type_deutschheft_desc', isCurriculum: true },
  { key: 'matheheft', icon: Calculator, labelKey: 'notebooks.type_matheheft', descKey: 'notebooks.type_matheheft_desc', isCurriculum: true },
  { key: 'sachbuch', icon: FlaskConical, labelKey: 'notebooks.type_sachbuch', descKey: 'notebooks.type_sachbuch_desc', isCurriculum: true },
  { key: 'musikheft', icon: Music, labelKey: 'notebooks.type_musikheft', descKey: 'notebooks.type_musikheft_desc', isCurriculum: true },
  { key: 'kunstheft', icon: Paintbrush, labelKey: 'notebooks.type_kunstheft', descKey: 'notebooks.type_kunstheft_desc', isCurriculum: true },
  { key: 'englischheft', icon: Languages, labelKey: 'notebooks.type_englischheft', descKey: 'notebooks.type_englischheft_desc', isCurriculum: true },
  { key: 'geschichtsheft', icon: BookMarked, labelKey: 'notebooks.type_geschichtsheft', descKey: 'notebooks.type_geschichtsheft_desc', isCurriculum: true },
  { key: 'religionsheft', icon: Heart, labelKey: 'notebooks.type_religionsheft', descKey: 'notebooks.type_religionsheft_desc', isCurriculum: true },
  { key: 'sachkundeheft', icon: Book, labelKey: 'notebooks.type_sachkundeheft', descKey: 'notebooks.type_sachkundeheft_desc', isCurriculum: true },
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
      { title: 'Formeln', content: '# Formeln\n\n| Name | Formel |\n|------|--------|\n| Flaeche Rechteck | A = a · b |\n| Umfang Rechteck | U = 2·(a+b) |\n| Flaeche Dreieck | A = ½ · g · h |\n' },
      { title: 'Geometrie', content: '# Geometrie\n\n' },
      { title: 'Ergebnisse', content: '# Ergebnisse\n\n' },
      { title: 'Kontrolle', content: '# Kontrolle\n\n| Aufgabe | Ergebnis | Richtig? |\n|---------|----------|----------|\n| 1 | | |\n| 2 | | |\n| 3 | | |\n' },
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
      { title: 'Aufsaetze', content: '# Aufsaetze\n\n**Einleitung:**\n\n**Hauptteil:**\n\n**Schluss:**\n\n' },
      { title: 'Lesetagebuch', content: '# Lesetagebuch\n\n| Datum | Buch | Seiten | Meine Meinung |\n|-------|------|--------|---------------|\n| | | | |\n' },
      { title: 'Grammatik', content: '# Grammatik\n\n**Wortart:** \n\n**Regel:** \n\n**Beispiele:**\n1. \n2. \n3. \n' },
      { title: 'Rechtschreibung', content: '# Rechtschreibung\n\n| Falsch | Richtig | Regel |\n|--------|---------|-------|\n| | | |\n' },
      { title: 'Kreatives Schreiben', content: '# Kreatives Schreiben\n\n**Freies Schreiben:**\n\n' },
      { title: 'Textanalyse', content: '# Textanalyse\n\n**Titel:** \n\n**Autor:** \n\n**Textsorte:** \n\n**Zusammenfassung:**\n\n**Sprachliche Mittel:**\n\n' },
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
  {
    key: 'grundschule',
    titleKey: 'notebooks.template_grundschule',
    descKey: 'notebooks.template_grundschule_desc',
    notebookType: 'lined',
    color: '#f97316',
    icon: 'Book',
    iconComponent: Book,
    pages: [
      { title: 'Wortschatz', content: '# Wortschatz\n\n| Wort | Artikel | Plural |\n|------|---------|--------|\n| | | |\n' },
      { title: 'Schreiben lernen', content: '# Schreiben lernen\n\n' },
      { title: 'Rechnen', content: '# Rechnen\n\n1. \n2. \n3. \n\n**Malfolgen:**\n\n| 1er | 2er | 5er | 10er |\n|-----|-----|-----|------|\n| 1 | 2 | 5 | 10 |\n| 2 | 4 | 10 | 20 |\n| 3 | 6 | 15 | 30 |\n' },
      { title: 'Lesen', content: '# Lesen\n\n**Gelesenes Buch:**\n\n**Meine Meinung:**\n\n' },
      { title: 'Sachkunde', content: '# Sachkunde\n\n**Thema:**\n\n**Was ich weiss:**\n\n**Was ich gelernt habe:**\n\n' },
    ],
  },
  {
    key: 'history',
    titleKey: 'notebooks.template_history',
    descKey: 'notebooks.template_history_desc',
    notebookType: 'lined',
    color: '#92400e',
    icon: 'BookMarked',
    iconComponent: BookMarked,
    pages: [
      { title: 'Zeitstrahl', content: '# Zeitstrahl\n\n| Jahr | Ereignis |\n|------|----------|\n| | |\n' },
      { title: 'Quellenanalyse', content: '# Quellenanalyse\n\n**Quellenart:**\n\n**Entstehungszeit:**\n\n**Verfasser:**\n\n**Aussage:**\n\n**Historischer Kontext:**\n\n' },
      { title: 'Begriffe', content: '# Begriffe\n\n| Begriff | Definition |\n|---------|------------|\n| | |\n' },
      { title: 'Ursachen und Wirkungen', content: '# Ursachen und Wirkungen\n\n**Ursachen:**\n1. \n2. \n\n**Wirkungen:**\n1. \n2. \n' },
    ],
  },
  {
    key: 'religion',
    titleKey: 'notebooks.template_religion',
    descKey: 'notebooks.template_religion_desc',
    notebookType: 'lined',
    color: '#f97316',
    icon: 'Heart',
    iconComponent: Heart,
    pages: [
      { title: 'Bibelstellen', content: '# Bibelstellen\n\n| Stelle | Text | Bedeutung |\n|--------|------|----------|\n| | | |\n' },
      { title: 'Gedanken', content: '# Gedanken\n\n' },
      { title: 'Ethik', content: '# Ethik\n\n**Situation:**\n\n**Verschiedene Sichtweisen:**\n\n**Meine Meinung:**\n\n' },
      { title: 'Weltreligionen', content: '# Weltreligionen\n\n| Religion | Gruender | Heilige Schrift |\n|----------|----------|----------------|\n| Christentum | Jesus | Bibel |\n| Islam | Mohammed | Koran |\n| Judentum | Moses | Tora |\n| Buddhismus | Buddha | Tripitaka |\n| Hinduismus | - | Veden |\n' },
    ],
  },
  // ─── German Curriculum Notebook Types ──────────────────────────────────
  {
    key: 'deutschheft',
    titleKey: 'notebooks.type_deutschheft',
    descKey: 'notebooks.type_deutschheft_desc',
    notebookType: 'deutschheft',
    color: '#dc2626',
    icon: 'BookOpen',
    iconComponent: BookOpen,
    pages: [
      { title: 'Aufsaetze', content: '# Aufsaetze\n\n**Einleitung:**\n\n**Hauptteil:**\n\n**Schluss:**\n\n' },
      { title: 'Lesetagebuch', content: '# Lesetagebuch\n\n| Datum | Buch | Seiten | Meine Meinung |\n|-------|------|--------|---------------|\n| | | | |\n' },
      { title: 'Grammatik', content: '# Grammatik\n\n**Wortart:** \n\n**Regel:** \n\n**Beispiele:**\n1. \n2. \n3. \n' },
      { title: 'Rechtschreibung', content: '# Rechtschreibung\n\n| Falsch | Richtig | Regel |\n|--------|---------|-------|\n| | | |\n' },
      { title: 'Kreatives Schreiben', content: '# Kreatives Schreiben\n\n**Freies Schreiben:**\n\n' },
      { title: 'Textanalyse', content: '# Textanalyse\n\n**Titel:** \n\n**Autor:** \n\n**Textsorte:** \n\n**Zusammenfassung:**\n\n**Sprachliche Mittel:**\n\n' },
    ],
  },
  {
    key: 'matheheft',
    titleKey: 'notebooks.type_matheheft',
    descKey: 'notebooks.type_matheheft_desc',
    notebookType: 'matheheft',
    color: '#3b82f6',
    icon: 'Hash',
    iconComponent: Calculator,
    pages: [
      { title: 'Aufgaben', content: '# Aufgaben\n\n1. \n2. \n3. \n' },
      { title: 'Rechnungen', content: '# Rechnungen\n\n' },
      { title: 'Formeln', content: '# Formeln\n\n| Name | Formel |\n|------|--------|\n| Flaeche Rechteck | A = a · b |\n| Umfang Rechteck | U = 2·(a+b) |\n| Flaeche Dreieck | A = ½ · g · h |\n' },
      { title: 'Geometrie', content: '# Geometrie\n\n' },
      { title: 'Ergebnisse', content: '# Ergebnisse\n\n' },
      { title: 'Kontrolle', content: '# Kontrolle\n\n| Aufgabe | Ergebnis | Richtig? |\n|---------|----------|----------|\n| 1 | | |\n| 2 | | |\n| 3 | | |\n' },
    ],
  },
  {
    key: 'sachbuch',
    titleKey: 'notebooks.type_sachbuch',
    descKey: 'notebooks.type_sachbuch_desc',
    notebookType: 'sachbuch',
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
  {
    key: 'musikheft',
    titleKey: 'notebooks.type_musikheft',
    descKey: 'notebooks.type_musikheft_desc',
    notebookType: 'musikheft',
    color: '#10b981',
    icon: 'Music',
    iconComponent: Music,
    pages: [
      { title: 'Noten', content: '' },
      { title: 'Rhythmus', content: '# Rhythmus\n\n' },
      { title: 'Melodie', content: '# Melodie\n\n' },
      { title: 'Harmonie', content: '# Harmonie\n\n' },
      { title: 'Komposition', content: '# Komposition\n\n' },
    ],
  },
  {
    key: 'kunstheft',
    titleKey: 'notebooks.type_kunstheft',
    descKey: 'notebooks.type_kunstheft_desc',
    notebookType: 'kunstheft',
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
    key: 'englischheft',
    titleKey: 'notebooks.type_englischheft',
    descKey: 'notebooks.type_englischheft_desc',
    notebookType: 'englischheft',
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
    key: 'geschichtsheft',
    titleKey: 'notebooks.type_geschichtsheft',
    descKey: 'notebooks.type_geschichtsheft_desc',
    notebookType: 'geschichtsheft',
    color: '#92400e',
    icon: 'BookMarked',
    iconComponent: BookMarked,
    pages: [
      { title: 'Zeitstrahl', content: '# Zeitstrahl\n\n| Jahr | Ereignis |\n|------|----------|\n| | |\n' },
      { title: 'Quellenanalyse', content: '# Quellenanalyse\n\n**Quellenart:**\n\n**Entstehungszeit:**\n\n**Verfasser:**\n\n**Aussage:**\n\n**Historischer Kontext:**\n\n' },
      { title: 'Begriffe', content: '# Begriffe\n\n| Begriff | Definition |\n|---------|------------|\n| | |\n' },
      { title: 'Ursachen und Wirkungen', content: '# Ursachen und Wirkungen\n\n**Ursachen:**\n1. \n2. \n\n**Wirkungen:**\n1. \n2. \n' },
    ],
  },
  {
    key: 'religionsheft',
    titleKey: 'notebooks.type_religionsheft',
    descKey: 'notebooks.type_religionsheft_desc',
    notebookType: 'religionsheft',
    color: '#f97316',
    icon: 'Heart',
    iconComponent: Heart,
    pages: [
      { title: 'Bibelstellen', content: '# Bibelstellen\n\n| Stelle | Text | Bedeutung |\n|--------|------|----------|\n| | | |\n' },
      { title: 'Gedanken', content: '# Gedanken\n\n' },
      { title: 'Ethik', content: '# Ethik\n\n**Situation:**\n\n**Verschiedene Sichtweisen:**\n\n**Meine Meinung:**\n\n' },
      { title: 'Weltreligionen', content: '# Weltreligionen\n\n| Religion | Gruender | Heilige Schrift |\n|----------|----------|----------------|\n| Christentum | Jesus | Bibel |\n| Islam | Mohammed | Koran |\n| Judentum | Moses | Tora |\n| Buddhismus | Buddha | Tripitaka |\n| Hinduismus | - | Veden |\n' },
    ],
  },
  {
    key: 'sachkundeheft',
    titleKey: 'notebooks.type_sachkundeheft',
    descKey: 'notebooks.type_sachkundeheft_desc',
    notebookType: 'sachkundeheft',
    color: '#0d9488',
    icon: 'Book',
    iconComponent: Book,
    pages: [
      { title: 'Thema', content: '# Sachkunde\n\n**Thema:**\n\n**Was ich weiss:**\n\n**Was ich gelernt habe:**\n\n' },
      { title: 'Beobachtungen', content: '# Beobachtungen\n\n| Datum | Was ich beobachtet habe |\n|-------|------------------------|\n| | |\n' },
      { title: 'Zeichnung', content: '' },
      { title: 'Zusammenfassung', content: '# Zusammenfassung\n\n' },
    ],
  },
];

// ─── CSS Background Patterns ─────────────────────────────────────────

function getPageBackgroundCSS(type: string): React.CSSProperties {
  switch (type) {
    case 'lined':
      return {
        backgroundImage: `
          repeating-linear-gradient(0deg, transparent, transparent 31px, #d1d5db 31px, #d1d5db 32px),
          linear-gradient(90deg, transparent 60px, #ef4444 60px, #ef4444 62px, transparent 62px)
        `,
        backgroundSize: '100% 32px, 100% 100%',
        backgroundPosition: '0 16px, 0 0',
      };
    case 'deutschheft': // German/Language notebook - lined paper with red margin line (Schulheft style)
    case 'englischheft': // English notebook - lined paper with margin
    case 'religionsheft': // Religion/Ethics notebook - lined paper with margin
    case 'geschichtsheft': // History notebook - lined with margin
    case 'sachkundeheft': // General studies - lined with margin
      return {
        backgroundImage: `
          repeating-linear-gradient(0deg, transparent, transparent 31px, #d1d5db 31px, #d1d5db 32px),
          linear-gradient(90deg, transparent 60px, #ef4444 60px, #ef4444 62px, transparent 62px)
        `,
        backgroundSize: '100% 32px, 100% 100%',
        backgroundPosition: '0 16px, 0 0',
      };
    case 'deutschheft_margin': // Deutschheft with margin line (legacy)
      return {
        backgroundImage: `
          repeating-linear-gradient(0deg, transparent, transparent 31px, #d1d5db 31px, #d1d5db 32px),
          linear-gradient(90deg, transparent 60px, #ef4444 60px, #ef4444 62px, transparent 62px)
        `,
        backgroundSize: '100% 32px, 100% 100%',
        backgroundPosition: '0 16px, 0 0',
      };
    case 'grid':
    case 'matheheft': // Math notebook - grid/dotted paper
    case 'sachbuch': // Science notebook - grid paper
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
    case 'musikheft': // Music notebook - music staff lines
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
    case 'kunstheft': // Art notebook - blank paper
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
      <div className="glass-toolbar flex items-center gap-1 px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 overflow-x-auto">
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
          className="notebook-cover relative h-28 flex items-center justify-center overflow-hidden"
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

          {/* Curriculum badge for German curriculum types */}
          {typeInfo.isCurriculum && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 pt-0.5">
              <Bookmark className="w-3 h-3" />
              <span>{t('notebooks.curriculum_badge')}</span>
            </div>
          )}

          {/* Eco-friendly badge */}
          <div className="flex items-center gap-1.5 pt-0.5">
            <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-0 text-[10px] px-1.5 py-0">
              <Leaf className="w-2.5 h-2.5 mr-0.5" />
              {t('notebooks.eco_badge')}
            </Badge>
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
            {/* Base types */}
            <div className="grid grid-cols-3 gap-2">
              {NOTEBOOK_TYPES.filter(nt => !nt.isCurriculum).map((nt) => {
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
            {/* German curriculum types */}
            <div className="mt-3">
              <Label className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mb-2">
                <Bookmark className="w-3 h-3" />
                {t('notebooks.curriculum_badge')}
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {NOTEBOOK_TYPES.filter(nt => nt.isCurriculum).map((nt) => {
                  const NtIcon = nt.icon;
                  const isSelected = notebookType === nt.key;
                  return (
                    <button
                      key={nt.key}
                      onClick={() => setNotebookType(nt.key)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all min-h-[64px] ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-amber-300'
                      }`}
                    >
                      <NtIcon className="w-5 h-5" />
                      <span className="text-xs font-medium">{t(nt.labelKey)}</span>
                    </button>
                  );
                })}
              </div>
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
      {/* Page number badge */}
      <div className="absolute bottom-0.5 left-1 text-[9px] font-mono text-gray-400 dark:text-gray-500">
        {page.pageNumber}
      </div>
      {/* Bookmark indicator with corner fold */}
      {page.isBookmark && (
        <div className="absolute top-0 right-0">
          <div className="relative">
            <Bookmark className="w-3 h-3 text-amber-500 fill-amber-500" />
            {/* Corner fold (dog-ear) effect */}
            <div
              className="absolute -top-0 -right-0 w-4 h-4"
              style={{
                background: 'linear-gradient(135deg, transparent 50%, #fbbf24 50%)',
                clipPath: 'polygon(100% 0, 0 0, 100% 100%)',
              }}
            />
          </div>
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
  onDuplicatePage,
}: {
  notebook: Notebook;
  subjectName: string | null;
  onBack: () => void;
  onUpdatePage: (pageId: string, data: Partial<NotebookPage>) => Promise<void>;
  onAddPage: (templateKey?: string, background?: string, content?: string) => Promise<void>;
  onDeletePage: (pageId: string) => void;
  onToggleBookmark: (pageId: string) => void;
  onTogglePublic: () => void;
  onReorderPages: (pageOrders: Array<{ id: string; pageNumber: number }>) => Promise<void>;
  onDuplicatePage: (pageId: string) => Promise<void>;
}) {
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [pageContent, setPageContent] = useState('');
  const [pageTitle, setPageTitle] = useState('');
  const [viewMode, setViewMode] = useState<'text' | 'split' | 'drawing'>('text');
  const [splitRatio, setSplitRatio] = useState(50); // percentage for text side
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

  // Collaboration state
  const [collabActivityOpen, setCollabActivityOpen] = useState(false);

  // Sticky notes state
  const [stickyNotes, setStickyNotes] = useState<StickyNoteData[]>([]);
  const [showStickyNoteDialog, setShowStickyNoteDialog] = useState(false);
  const [newStickyNoteColor, setNewStickyNoteColor] = useState('#fef08a');
  const [editingStickyNote, setEditingStickyNote] = useState<StickyNoteData | null>(null);

  // Stickers state
  const [stickers, setStickers] = useState<StickerData[]>([]);
  const [showStickerPanel, setShowStickerPanel] = useState(false);

  // Washi tape state
  const [washiTapes, setWashiTapes] = useState<WashiTapeData[]>([]);
  const [showWashiTapePanel, setShowWashiTapePanel] = useState(false);

  // Search within notebook state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ pageId: string; pageTitle: string; snippet: string; pageNumber: number }>>([]);

  // Page template chooser state
  const [templateChooserOpen, setTemplateChooserOpen] = useState(false);

  // Sections state
  const [sections, setSections] = useState<SectionData[]>([]);
  const [showSectionDialog, setShowSectionDialog] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionColor, setNewSectionColor] = useState('#10b981');
  const [showTableOfContents, setShowTableOfContents] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedContentRef = useRef<string>('');
  const lastSavedTitleRef = useRef<string>('');
  const isInternalChange = useRef(false);

  const pages = notebook.pages ?? [];
  const currentPage = pages.find(p => p.id === currentPageId) ?? pages[0] ?? null;

  // ─── Collaboration Hook ─────────────────────────────────────────────
  const {
    onlineUsers,
    cursors,
    activities,
    lastEdit,
    editingUsers,
    broadcastCursor,
    broadcastEdit,
    broadcastActivity,
    addEditListener,
  } = useNotebookCollaboration(notebook.id);

  // Handle incoming edits from other users (last-write-wins with visual indicator)
  const collabEditTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [collabEditIndicator, setCollabEditIndicator] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = addEditListener((edit: EditData) => {
      // If editing the same page, apply the incoming edit
      if (currentPage && edit.pageId === currentPage.id && editorRef.current) {
        isInternalChange.current = true;
        editorRef.current.innerHTML = edit.content;
        setPageContent(edit.content);
        lastSavedContentRef.current = edit.content;
        setTimeout(() => { isInternalChange.current = false; }, 100);
      }

      // Show editing indicator
      setCollabEditIndicator(t('collab.editing_by', { name: edit.userName }));
      if (collabEditTimeoutRef.current) clearTimeout(collabEditTimeoutRef.current);
      collabEditTimeoutRef.current = setTimeout(() => setCollabEditIndicator(null), 3000);
    });
    return unsubscribe;
  }, [addEditListener, currentPage]);

  // Broadcast cursor position on mouse move
  const cursorThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleEditorMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!currentPage) return;
    if (cursorThrottleRef.current) return;
    cursorThrottleRef.current = setTimeout(() => {
      cursorThrottleRef.current = null;
    }, 200);

    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    broadcastCursor(currentPage.id, x, y);
  }, [currentPage, broadcastCursor]);

  // Broadcast edit on content change (debounced)
  const broadcastEditTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Broadcast page change activity
  useEffect(() => {
    if (currentPage) {
      broadcastActivity(currentPage.id, currentPage.title ?? `${t('notebooks.page')} ${currentPage.pageNumber}`);
    }
  }, [currentPageId, currentPage, broadcastActivity]);

  // ─── End Collaboration ──────────────────────────────────────────────

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
      // Broadcast edit to collaborators (debounced)
      if (broadcastEditTimerRef.current) clearTimeout(broadcastEditTimerRef.current);
      broadcastEditTimerRef.current = setTimeout(() => {
        if (currentPage) {
          broadcastEdit(currentPage.id, html);
        }
      }, 500);
    }
  }, [currentPage, broadcastEdit]);

  // Handle format change from toolbar (for active state refresh)
  const handleFormatChange = useCallback(() => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      setPageContent(html);
      // Broadcast edit to collaborators (debounced)
      if (broadcastEditTimerRef.current) clearTimeout(broadcastEditTimerRef.current);
      broadcastEditTimerRef.current = setTimeout(() => {
        if (currentPage) {
          broadcastEdit(currentPage.id, html);
        }
      }, 500);
    }
  }, [currentPage, broadcastEdit]);

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

  // ─── Sticky Note Handlers ──────────────────────────────────────────

  const addStickyNote = useCallback(() => {
    if (!currentPage) return;
    const note: StickyNoteData = {
      id: `sticky_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      x: 10 + Math.random() * 30,
      y: 10 + Math.random() * 30,
      width: 180,
      height: 120,
      color: newStickyNoteColor,
      text: '',
      pageId: currentPage.id,
    };
    setStickyNotes(prev => [...prev, note]);
    setShowStickyNoteDialog(false);
  }, [currentPage, newStickyNoteColor]);

  const updateStickyNote = useCallback((id: string, updates: Partial<StickyNoteData>) => {
    setStickyNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
  }, []);

  const deleteStickyNote = useCallback((id: string) => {
    setStickyNotes(prev => prev.filter(n => n.id !== id));
  }, []);

  const currentPageStickyNotes = useMemo(
    () => stickyNotes.filter(n => n.pageId === currentPageId),
    [stickyNotes, currentPageId]
  );

  // ─── Sticker Handlers ──────────────────────────────────────────────

  const addSticker = useCallback((stickerType: typeof STICKER_TYPES[0]) => {
    if (!currentPage) return;
    const sticker: StickerData = {
      id: `sticker_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: stickerType.key,
      x: 70 + Math.random() * 20,
      y: 5 + Math.random() * 40,
      size: 48,
      color: stickerType.color,
      pageId: currentPage.id,
    };
    setStickers(prev => [...prev, sticker]);
    setShowStickerPanel(false);
  }, [currentPage]);

  const deleteSticker = useCallback((id: string) => {
    setStickers(prev => prev.filter(s => s.id !== id));
  }, []);

  const currentPageStickers = useMemo(
    () => stickers.filter(s => s.pageId === currentPageId),
    [stickers, currentPageId]
  );

  // ─── Washi Tape Handlers ───────────────────────────────────────────

  const addWashiTape = useCallback((tapeDef: typeof WASHI_TAPE_COLORS[0]) => {
    if (!currentPage) return;
    const tape: WashiTapeData = {
      id: `washi_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      x: 10 + Math.random() * 30,
      y: 5 + Math.random() * 60,
      width: 120 + Math.random() * 80,
      color: tapeDef.color,
      pattern: tapeDef.pattern,
      pageId: currentPage.id,
    };
    setWashiTapes(prev => [...prev, tape]);
    setShowWashiTapePanel(false);
  }, [currentPage]);

  const deleteWashiTape = useCallback((id: string) => {
    setWashiTapes(prev => prev.filter(t => t.id !== id));
  }, []);

  const currentPageWashiTapes = useMemo(
    () => washiTapes.filter(t => t.pageId === currentPageId),
    [washiTapes, currentPageId]
  );

  // ─── Search Within Notebook ────────────────────────────────────────

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const q = query.toLowerCase();
    const results: Array<{ pageId: string; pageTitle: string; snippet: string; pageNumber: number }> = [];
    for (const page of pages) {
      const plainText = (page.textContent ?? '').replace(/<[^>]*>/g, '');
      const title = page.title ?? `${t('notebooks.page')} ${page.pageNumber}`;
      const combined = (title + ' ' + plainText).toLowerCase();
      if (combined.includes(q)) {
        const idx = combined.indexOf(q);
        const start = Math.max(0, idx - 30);
        const end = Math.min(plainText.length, idx + query.length + 30);
        const snippet = (start > 0 ? '...' : '') + plainText.substring(start, end) + (end < plainText.length ? '...' : '');
        results.push({ pageId: page.id, pageTitle: title, snippet, pageNumber: page.pageNumber });
      }
    }
    setSearchResults(results);
  }, [pages]);

  // ─── Section Handlers ──────────────────────────────────────────────

  const addSection = useCallback(() => {
    if (!newSectionName.trim()) return;
    const section: SectionData = {
      id: `section_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: newSectionName.trim(),
      color: newSectionColor,
      pageIds: [],
    };
    setSections(prev => [...prev, section]);
    setNewSectionName('');
    setShowSectionDialog(false);
  }, [newSectionName, newSectionColor]);

  const deleteSection = useCallback((sectionId: string) => {
    setSections(prev => prev.filter(s => s.id !== sectionId));
  }, []);

  const getSectionForPage = useCallback((pageId: string): SectionData | null => {
    return sections.find(s => s.pageIds.includes(pageId)) ?? null;
  }, [sections]);

  // ─── Page Template Handler ─────────────────────────────────────────

  const handleAddFromTemplate = useCallback(async (templateKey: string) => {
    const template = PAGE_TEMPLATES.find(t => t.key === templateKey);
    if (!template) return;
    setTemplateChooserOpen(false);
    await onAddPage(templateKey, template.background, template.getContent());
  }, [onAddPage]);

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

        {/* Collaboration: Online Users Indicator */}
        {onlineUsers.length > 0 && (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/50 dark:border-emerald-800/30 shrink-0">
                  <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                  <div className="flex -space-x-1.5">
                    {onlineUsers.slice(0, 4).map((u) => (
                      <div
                        key={u.userId}
                        className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center text-[8px] font-bold text-white"
                        style={{ backgroundColor: u.color }}
                        title={u.userName}
                      >
                        {u.userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                    ))}
                  </div>
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    {onlineUsers.length}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {t('collab.online_users', { count: onlineUsers.length })}: {onlineUsers.map(u => u.userName).join(', ')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Collaboration: Activity Feed Toggle */}
        {onlineUsers.length > 0 && (
          <Popover open={collabActivityOpen} onOpenChange={setCollabActivityOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="min-h-[44px] shrink-0 relative">
                <UsersIcon className="w-4 h-4" />
                {activities.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-400 text-white text-[8px] font-bold flex items-center justify-center">
                    {activities.length > 9 ? '9+' : activities.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-0 rounded-xl border-emerald-200/60 dark:border-emerald-900/40">
              <div className="px-3 py-2 border-b border-emerald-100/50 dark:border-emerald-900/30 bg-gradient-to-r from-emerald-50/50 to-teal-50/30 dark:from-emerald-950/20 dark:to-teal-950/10">
                <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                  <UsersIcon className="w-3.5 h-3.5" />
                  {t('collab.activity_title')}
                </h3>
              </div>
              <ScrollArea className="max-h-60">
                {activities.length === 0 ? (
                  <div className="px-3 py-4 text-center text-xs text-gray-500 dark:text-gray-400">
                    {t('collab.no_activity')}
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {activities.map((a, i) => (
                      <div key={`${a.userId}-${a.timestamp}-${i}`} className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-gray-600 dark:text-gray-400">
                        <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-[8px] font-bold text-emerald-700 dark:text-emerald-300 shrink-0">
                          {a.userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <span className="truncate">
                          <strong>{a.userName}</strong> {t('collab.started_editing')} {a.pageTitle}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>
        )}

        {/* View mode toggle — Text / Split / Drawing */}
        <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shrink-0">
          <Button
            variant={viewMode === 'text' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('text')}
            className={`min-h-[40px] rounded-none border-0 px-3 ${viewMode === 'text' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
            title={t('notebooks.view_text_only')}
          >
            <Edit3 className="w-4 h-4" />
          </Button>
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />
          <Button
            variant={viewMode === 'split' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('split')}
            className={`min-h-[40px] rounded-none border-0 px-3 ${viewMode === 'split' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
            title={t('notebooks.view_split')}
          >
            <Columns2 className="w-4 h-4" />
          </Button>
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />
          <Button
            variant={viewMode === 'drawing' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('drawing')}
            className={`min-h-[40px] rounded-none border-0 px-3 ${viewMode === 'drawing' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
            title={t('notebooks.view_drawing_only')}
          >
            <PenLine className="w-4 h-4" />
          </Button>
        </div>

        {/* Version history button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleOpenVersionHistory}
          className="min-h-[44px] shrink-0"
        >
          <Clock className="w-4 h-4" />
        </Button>

        {/* Search within notebook */}
        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="min-h-[44px] shrink-0">
                    <SearchIcon className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">{t('notebooks.search_pages')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <PopoverContent align="end" className="w-80 p-0 rounded-xl">
            <div className="p-3">
              <Input
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={t('notebooks.search_pages_placeholder')}
                className="min-h-[44px]"
                autoFocus
              />
            </div>
            {searchQuery.trim() && (
              <div className="border-t border-gray-100 dark:border-gray-800">
                <ScrollArea className="max-h-60">
                  {searchResults.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      {t('notebooks.search_no_results')}
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      <div className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                        {searchResults.length} {t('notebooks.search_results')}
                      </div>
                      {searchResults.map((result) => (
                        <button
                          key={result.pageId}
                          onClick={() => { setCurrentPageId(result.pageId); setSearchOpen(false); }}
                          className="w-full text-left p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors min-h-[44px]"
                        >
                          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                            {result.pageTitle}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                            {result.snippet}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Sticky note button */}
        <Popover open={showStickyNoteDialog} onOpenChange={setShowStickyNoteDialog}>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="min-h-[44px] shrink-0">
                    <StickyNote className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">{t('notebooks.sticky_note_add')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <PopoverContent align="end" className="w-auto p-3 rounded-xl">
            <p className="text-sm font-medium mb-2">{t('notebooks.sticky_note_color')}</p>
            <div className="flex items-center gap-2 mb-3">
              {STICKY_NOTE_COLORS.map((sc) => (
                <button
                  key={sc.key}
                  onClick={() => setNewStickyNoteColor(sc.color)}
                  className={`w-8 h-8 rounded-md border-2 transition-all hover:scale-110 ${
                    newStickyNoteColor === sc.color ? 'border-gray-900 dark:border-white scale-110 shadow-md' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: sc.color }}
                />
              ))}
            </div>
            <Button onClick={addStickyNote} className="w-full min-h-[44px] bg-emerald-600 hover:bg-emerald-700" size="sm">
              <Plus className="w-4 h-4 mr-1" />
              {t('notebooks.sticky_note_add')}
            </Button>
          </PopoverContent>
        </Popover>

        {/* Sticker panel */}
        <Popover open={showStickerPanel} onOpenChange={setShowStickerPanel}>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="min-h-[44px] shrink-0">
                    <Star className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">{t('notebooks.stickers')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <PopoverContent align="end" className="w-72 p-0 rounded-xl">
            <div className="p-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <Star className="w-4 h-4 text-amber-500" />
                {t('notebooks.stickers')}
              </h3>
            </div>
            <div className="p-3">
              <div className="grid grid-cols-4 gap-2">
                {STICKER_TYPES.map((stickerType) => {
                  const StickerIcon = stickerType.icon;
                  return (
                    <button
                      key={stickerType.key}
                      onClick={() => addSticker(stickerType)}
                      className="flex flex-col items-center gap-1 p-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all min-h-[64px]"
                    >
                      <StickerIcon className="w-6 h-6" style={{ color: stickerType.color }} />
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate w-full text-center">{t(stickerType.labelKey)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Washi tape panel */}
        <Popover open={showWashiTapePanel} onOpenChange={setShowWashiTapePanel}>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="min-h-[44px] shrink-0">
                    <Minus className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">{t('notebooks.washi_tape')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <PopoverContent align="end" className="w-72 p-0 rounded-xl">
            <div className="p-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <Minus className="w-4 h-4 text-pink-500" />
                {t('notebooks.washi_tape')}
              </h3>
            </div>
            <div className="p-3">
              <div className="grid grid-cols-4 gap-2">
                {WASHI_TAPE_COLORS.map((tapeDef) => (
                  <button
                    key={tapeDef.key}
                    onClick={() => addWashiTape(tapeDef)}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-all min-h-[48px]"
                  >
                    <div
                      className="w-full h-4 rounded-sm"
                      style={{
                        backgroundColor: tapeDef.color,
                        backgroundImage: tapeDef.pattern === 'stripes'
                          ? 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)'
                          : tapeDef.pattern === 'dots'
                          ? 'radial-gradient(circle, rgba(0,0,0,0.1) 1px, transparent 1px)'
                          : 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px), repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
                        backgroundSize: tapeDef.pattern === 'dots' ? '6px 6px' : undefined,
                      }}
                    />
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 capitalize">{tapeDef.key}</span>
                  </button>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Sections button */}
        <Popover open={showSectionDialog} onOpenChange={setShowSectionDialog}>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="min-h-[44px] shrink-0">
                    <FolderOpen className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">{t('notebooks.sections')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <PopoverContent align="end" className="w-72 p-0 rounded-xl">
            <div className="p-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-semibold">{t('notebooks.sections')}</h3>
            </div>
            <div className="p-3 space-y-3">
              <Input
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder={t('notebooks.section_name_placeholder')}
                className="min-h-[44px]"
              />
              <div className="flex items-center gap-2 flex-wrap">
                {SECTION_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewSectionColor(color)}
                    className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${
                      newSectionColor === color ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <Button
                onClick={addSection}
                disabled={!newSectionName.trim()}
                className="w-full min-h-[44px] bg-emerald-600 hover:bg-emerald-700"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                {t('notebooks.section_add')}
              </Button>
            </div>
            {sections.length > 0 && (
              <div className="border-t border-gray-100 dark:border-gray-800 p-2 space-y-1">
                {sections.map((section) => (
                  <div key={section.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: section.color }} />
                    <span className="flex-1 truncate text-gray-700 dark:text-gray-300">{section.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteSection(section.id)}
                      className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Table of Contents button */}
        <Popover open={showTableOfContents} onOpenChange={setShowTableOfContents}>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="min-h-[44px] shrink-0">
                    <BookMarked className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">{t('notebooks.table_of_contents')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <PopoverContent align="end" className="w-72 p-0 rounded-xl">
            <div className="p-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-semibold">{t('notebooks.table_of_contents')}</h3>
            </div>
            <ScrollArea className="max-h-60">
              {pages.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  {t('notebooks.no_sections')}
                </div>
              ) : (
                <div className="p-2 space-y-0.5">
                  {pages.map((page) => {
                    const section = getSectionForPage(page.id);
                    return (
                      <div key={page.id}>
                        {section && page.id === section.pageIds[0] && (
                          <div className="flex items-center gap-2 px-2 py-1 mt-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: section.color }} />
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{section.name}</span>
                          </div>
                        )}
                        <button
                          onClick={() => { setCurrentPageId(page.id); setShowTableOfContents(false); }}
                          className="w-full text-left px-3 py-1.5 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-2 min-h-[36px]"
                        >
                          <span className="text-xs text-gray-400 font-mono w-5 shrink-0">{page.pageNumber}</span>
                          <span className="truncate text-gray-700 dark:text-gray-300">{page.title ?? `${t('notebooks.page')} ${page.pageNumber}`}</span>
                          {page.isBookmark && <Bookmark className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>

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
          <div className="p-3 space-y-2">
            <Button
              onClick={() => onAddPage()}
              className="w-full min-h-[44px] bg-emerald-600 hover:bg-emerald-700"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              {t('notebooks.add_page')}
            </Button>
            <Button
              onClick={() => setTemplateChooserOpen(true)}
              variant="outline"
              className="w-full min-h-[44px]"
              size="sm"
            >
              <LayoutTemplate className="w-4 h-4 mr-1" />
              {t('notebooks.page_template')}
            </Button>
          </div>

          <ScrollArea className="flex-1 max-h-[calc(100vh-280px)]">
            <div className="p-2 space-y-2">
              {pages.map((page, idx) => {
                const isDragged = draggedPageId === page.id;
                const isDragOver = dragOverPageId === page.id;
                const section = getSectionForPage(page.id);
                const isFirstInSection = section && section.pageIds[0] === page.id;
                return (
                  <React.Fragment key={page.id}>
                    {/* Section divider */}
                    {section && isFirstInSection && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
                      >
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: section.color }} />
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 truncate flex-1">{section.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteSection(section.id)}
                          className="h-6 w-6 p-0 text-gray-400 hover:text-red-500 shrink-0"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </motion.div>
                    )}
                    <motion.div
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
                        onClick={() => { setCurrentPageId(page.id); }}
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
                        {/* Duplicate page button */}
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={(e) => { e.stopPropagation(); onDuplicatePage(page.id); }}
                                className="h-6 w-6 flex items-center justify-center rounded text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 shrink-0 transition-colors"
                              >
                                <ClipboardCopy className="w-3 h-3" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="text-xs">{t('notebooks.duplicate_page')}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </button>
                    </motion.div>
                  </React.Fragment>
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

                {/* Collaboration: Editing indicator */}
                {collabEditIndicator && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-800/30 shrink-0"
                  >
                    <MousePointer2 className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs text-amber-700 dark:text-amber-300 font-medium">{collabEditIndicator}</span>
                  </motion.div>
                )}

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

              {viewMode === 'drawing' ? (
                /* Full drawing mode - render DrawingCanvas */
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
                    onExit={() => setViewMode('text')}
                    title={currentPage.title ?? `${t('notebooks.page')} ${currentPage.pageNumber}`}
                  />
                </motion.div>
              ) : viewMode === 'split' ? (
                /* Split view - text editor on left, drawing canvas on right */
                <div className="flex-1 flex overflow-hidden">
                  {/* Left: Text editor */}
                  <div className="flex flex-col overflow-hidden" style={{ width: `${splitRatio}%` }}>
                    <WysiwygToolbar editorRef={editorRef} onFormatChange={handleFormatChange} />
                    <div className="flex-1 overflow-hidden p-3 relative">
                      <div
                        className="w-full h-full rounded-xl overflow-hidden relative"
                        style={{ backgroundColor: '#fff' }}
                      >
                        <ScrollArea className="h-full">
                          <div
                            className="min-h-full p-6 relative"
                            style={getPageBackgroundCSS(currentPage.background ?? notebook.notebookType)}
                            onMouseMove={handleEditorMouseMove}
                          >
                            {/* German-style margin line overlay for lined pages */}
                            {(['lined', 'deutschheft', 'englischheft', 'religionsheft', 'geschichtsheft', 'sachkundeheft', 'calligraphy'].includes(currentPage.background ?? notebook.notebookType)) && (
                              <div
                                className="absolute top-0 left-[60px] w-[2px] h-full pointer-events-none z-10"
                                style={{ backgroundColor: 'rgba(239, 68, 68, 0.35)' }}
                              />
                            )}
                            <div
                              ref={editorRef}
                              contentEditable
                              suppressContentEditableWarning
                              onInput={handleEditorInput}
                              data-placeholder={t('notebooks.page_content') + '...'}
                              className="w-full min-h-[500px] bg-transparent outline-none text-base text-gray-800 dark:text-gray-200 focus:ring-0 prose prose-sm max-w-none [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-gray-300 [&:empty]:dark:before:text-gray-600 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-2 [&_h1]:mt-4 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-1.5 [&_h2]:mt-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-1 [&_h3]:mt-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-2 [&_li]:mb-0.5"
                              style={{ lineHeight: notebook.notebookType === 'lined' || notebook.notebookType === 'calligraphy' ? '32px' : '1.5' }}
                            />
                            {/* Page number footer */}
                            <div className="flex items-center justify-center pt-8 pb-2">
                              <span className="text-xs font-mono text-gray-400 dark:text-gray-500">
                                — {currentPage.pageNumber} —
                              </span>
                            </div>
                          </div>
                        </ScrollArea>
                        {/* Corner fold (dog-ear) for bookmarked pages */}
                        {currentPage.isBookmark && (
                          <div className="absolute top-0 right-0 w-6 h-6 pointer-events-none z-10">
                            <div
                              className="w-full h-full"
                              style={{
                                background: 'linear-gradient(135deg, #fff 50%, #fbbf24 50%)',
                                boxShadow: '-1px 1px 2px rgba(0,0,0,0.1)',
                              }}
                            />
                          </div>
                        )}
                      </div>
                      {cursors.filter(c => c.pageId === currentPage?.id).map((cursor) => (
                        <motion.div
                          key={cursor.userId}
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute pointer-events-none z-20"
                          style={{
                            left: `${cursor.x}%`,
                            top: `${cursor.y}%`,
                            transform: 'translate(-4px, -4px)',
                          }}
                        >
                          <MousePointer2 className="w-4 h-4" style={{ color: cursor.color, fill: cursor.color }} />
                          <div className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white whitespace-nowrap mt-0.5" style={{ backgroundColor: cursor.color }}>
                            {cursor.userName}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Resizable divider */}
                  <div
                    className="w-2 cursor-col-resize bg-gray-200 dark:bg-gray-700 hover:bg-emerald-400 dark:hover:bg-emerald-600 transition-colors flex items-center justify-center shrink-0"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const startX = e.clientX;
                      const startRatio = splitRatio;
                      const container = e.currentTarget.parentElement;
                      if (!container) return;
                      const containerWidth = container.getBoundingClientRect().width;

                      const handleMouseMove = (moveEvent: MouseEvent) => {
                        const delta = moveEvent.clientX - startX;
                        const newRatio = Math.min(80, Math.max(20, startRatio + (delta / containerWidth) * 100));
                        setSplitRatio(newRatio);
                      };
                      const handleMouseUp = () => {
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };
                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
                    }}
                  >
                    <div className="w-0.5 h-8 bg-gray-400 dark:bg-gray-500 rounded-full" />
                  </div>

                  {/* Right: Drawing canvas */}
                  <div className="flex flex-col overflow-hidden" style={{ width: `${100 - splitRatio}%` }}>
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                      <PenLine className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('notebooks.handwriting_panel')}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">{t('notebooks.finger_stylus_hint')}</span>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <DrawingCanvas
                        backgroundType={currentPage.background === 'music' || currentPage.background === 'calligraphy' ? 'blank' : (currentPage.background as 'blank' | 'lined' | 'grid' | 'dotted') ?? (notebook.notebookType as 'blank' | 'lined' | 'grid' | 'dotted')}
                        initialDrawingData={currentPage.drawingData ?? undefined}
                        onSave={handleDrawingSave}
                        title={currentPage.title ?? `${t('notebooks.page')} ${currentPage.pageNumber}`}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Text-only mode with WYSIWYG toolbar and page background */
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* WYSIWYG toolbar */}
                  <WysiwygToolbar editorRef={editorRef} onFormatChange={handleFormatChange} />

                  {/* Page content area */}
                  <div className="flex-1 overflow-hidden p-4 relative">
                    <div
                      className="w-full h-full max-w-3xl mx-auto rounded-xl overflow-hidden relative"
                      style={{ backgroundColor: '#fff' }}
                    >
                      <ScrollArea className="h-full">
                        <div
                          className="min-h-full p-6 relative"
                          style={getPageBackgroundCSS(currentPage.background ?? notebook.notebookType)}
                          onMouseMove={handleEditorMouseMove}
                        >
                          {/* German-style margin line overlay for lined pages */}
                          {(['lined', 'deutschheft', 'englischheft', 'religionsheft', 'geschichtsheft', 'sachkundeheft', 'calligraphy'].includes(currentPage.background ?? notebook.notebookType)) && (
                            <div
                              className="absolute top-0 left-[60px] w-[2px] h-full pointer-events-none z-10"
                              style={{ backgroundColor: 'rgba(239, 68, 68, 0.35)' }}
                            />
                          )}
                          <div
                            ref={editorRef}
                            contentEditable
                            suppressContentEditableWarning
                            onInput={handleEditorInput}
                            data-placeholder={t('notebooks.page_content') + '...'}
                            className="w-full min-h-[500px] bg-transparent outline-none text-base text-gray-800 dark:text-gray-200 focus:ring-0 prose prose-sm max-w-none [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-gray-300 [&:empty]:dark:before:text-gray-600 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-2 [&_h1]:mt-4 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-1.5 [&_h2]:mt-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-1 [&_h3]:mt-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-2 [&_li]:mb-0.5"
                            style={{ lineHeight: notebook.notebookType === 'lined' || notebook.notebookType === 'calligraphy' ? '32px' : '1.5' }}
                          />
                          {/* Page number footer */}
                          <div className="flex items-center justify-center pt-8 pb-2">
                            <span className="text-xs font-mono text-gray-400 dark:text-gray-500">
                              — {currentPage.pageNumber} —
                            </span>
                          </div>
                        </div>
                      </ScrollArea>

                      {/* Corner fold (dog-ear) for bookmarked pages */}
                      {currentPage.isBookmark && (
                        <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none z-10">
                          <div
                            className="w-full h-full"
                            style={{
                              background: 'linear-gradient(135deg, #fff 50%, #fbbf24 50%)',
                              boxShadow: '-2px 2px 4px rgba(0,0,0,0.1)',
                            }}
                          />
                        </div>
                      )}

                      {/* Washi Tape Overlays */}
                      {currentPageWashiTapes.map((tape) => (
                        <motion.div
                          key={tape.id}
                          initial={{ opacity: 0, scaleX: 0.5 }}
                          animate={{ opacity: 1, scaleX: 1 }}
                          className="absolute z-20 group"
                          style={{
                            left: `${tape.x}%`,
                            top: `${tape.y}%`,
                            width: `${tape.width}px`,
                            height: '20px',
                            transform: `rotate(${(Math.random() - 0.5) * 6}deg)`,
                          }}
                        >
                          <div
                            className="w-full h-full rounded-sm cursor-move"
                            style={{
                              backgroundColor: tape.color,
                              backgroundImage: tape.pattern === 'stripes'
                                ? 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)'
                                : tape.pattern === 'dots'
                                ? 'radial-gradient(circle, rgba(0,0,0,0.1) 1px, transparent 1px)'
                                : 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px), repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
                              backgroundSize: tape.pattern === 'dots' ? '6px 6px' : undefined,
                              opacity: 0.85,
                            }}
                          />
                          <button
                            onClick={() => deleteWashiTape(tape.id)}
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                          >
                            <X className="w-2.5 h-2.5 text-gray-500" />
                          </button>
                        </motion.div>
                      ))}

                      {/* Sticker Overlays */}
                      {currentPageStickers.map((sticker) => {
                        const stickerType = STICKER_TYPES.find(s => s.key === sticker.type);
                        if (!stickerType) return null;
                        const StickerIcon = stickerType.icon;
                        return (
                          <motion.div
                            key={sticker.id}
                            initial={{ opacity: 0, scale: 0.3, rotate: -20 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            className="absolute z-20 group cursor-move"
                            style={{
                              left: `${sticker.x}%`,
                              top: `${sticker.y}%`,
                            }}
                          >
                            <div
                              className="rounded-full p-2 shadow-md"
                              style={{
                                backgroundColor: `${sticker.color}22`,
                                border: `2px solid ${sticker.color}44`,
                              }}
                            >
                              <StickerIcon className="w-8 h-8" style={{ color: sticker.color }} />
                            </div>
                            <button
                              onClick={() => deleteSticker(sticker.id)}
                              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                            >
                              <X className="w-2.5 h-2.5 text-gray-500" />
                            </button>
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* Collaboration: Cursor overlays */}
                    {cursors.filter(c => c.pageId === currentPage?.id).map((cursor) => (
                      <motion.div
                        key={cursor.userId}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute pointer-events-none z-20"
                        style={{
                          left: `${cursor.x}%`,
                          top: `${cursor.y}%`,
                          transform: 'translate(-4px, -4px)',
                        }}
                      >
                        <MousePointer2
                          className="w-4 h-4"
                          style={{ color: cursor.color, fill: cursor.color }}
                        />
                        <div
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white whitespace-nowrap mt-0.5"
                          style={{ backgroundColor: cursor.color }}
                        >
                          {cursor.userName}
                        </div>
                      </motion.div>
                    ))}

                    {/* Sticky Notes Overlay */}
                    {currentPageStickyNotes.map((note) => (
                      <motion.div
                        key={note.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute z-30 shadow-lg rounded-md overflow-hidden group"
                        style={{
                          left: `${note.x}%`,
                          top: `${note.y}%`,
                          width: `${note.width}px`,
                          minHeight: `${note.height}px`,
                          backgroundColor: note.color,
                        }}
                      >
                        <div className="flex items-center justify-between px-2 py-1 bg-black/5">
                          <span className="text-xs font-medium text-gray-600">{t('notebooks.sticky_note')}</span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setEditingStickyNote(note)}
                              className="h-5 w-5 flex items-center justify-center rounded hover:bg-black/10 text-gray-600"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => deleteStickyNote(note.id)}
                              className="h-5 w-5 flex items-center justify-center rounded hover:bg-black/10 text-gray-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <Textarea
                          value={note.text}
                          onChange={(e) => updateStickyNote(note.id, { text: e.target.value })}
                          className="border-0 bg-transparent shadow-none resize-none text-sm min-h-[80px] p-2 focus-visible:ring-0"
                          placeholder={t('notebooks.sticky_note_edit') + '...'}
                        />
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Save bar */}
              <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <span>{t('notebooks.page')} {currentPage.pageNumber} / {pages.length}</span>
                  {/* Drawing indicator when not in drawing mode */}
                  {currentPage.drawingData && viewMode === 'text' && (
                    <Badge variant="outline" className="text-xs gap-1 border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400">
                      <ImageIcon className="w-3 h-3" />
                      {t('notebooks.view_drawing')}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* View drawing button if page has drawing data */}
                  {currentPage.drawingData && viewMode === 'text' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewMode('split')}
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
              <Button onClick={() => onAddPage()} className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-1" />
                {t('notebooks.add_page')}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Page Template Chooser Dialog */}
      <Dialog open={templateChooserOpen} onOpenChange={setTemplateChooserOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutTemplate className="w-5 h-5 text-emerald-500" />
              {t('notebooks.page_template_choose')}
            </DialogTitle>
            <DialogDescription>{t('notebooks.page_template')}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            {PAGE_TEMPLATES.map((template) => {
              const TemplateIcon = template.icon;
              return (
                <button
                  key={template.key}
                  onClick={() => handleAddFromTemplate(template.key)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all min-h-[100px] hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                >
                  <TemplateIcon className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t(template.titleKey)}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 text-center">{t(template.descKey)}</span>
                </button>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateChooserOpen(false)} className="min-h-[44px]">
              {t('action.cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

// ─── Learn Tab — German Curriculum Learning Content ───────────────────

const CURRICULUM_SUBJECTS = [
  { key: 'math', labelKey: 'notebooks.subject_math', icon: Calculator, color: '#3b82f6', subjectName: 'Mathematik' },
  { key: 'german', labelKey: 'notebooks.subject_german', icon: BookOpen, color: '#ef4444', subjectName: 'Deutsch' },
  { key: 'science', labelKey: 'notebooks.subject_science', icon: FlaskConical, color: '#14b8a6', subjectName: 'Sachkunde' },
  { key: 'english', labelKey: 'notebooks.subject_english', icon: Languages, color: '#f59e0b', subjectName: 'Englisch' },
  { key: 'music', labelKey: 'notebooks.subject_music', icon: Music, color: '#10b981', subjectName: 'Musik' },
  { key: 'art', labelKey: 'notebooks.subject_art', icon: Paintbrush, color: '#8b5cf6', subjectName: 'Kunst' },
  { key: 'religion', labelKey: 'notebooks.subject_religion', icon: Heart, color: '#f97316', subjectName: 'Religion/Ethik' },
  { key: 'pe', labelKey: 'notebooks.subject_pe', icon: Dumbbell, color: '#ec4899', subjectName: 'Sport' },
];

type LearnView = 'subjects' | 'topics' | 'lessons' | 'lesson-detail' | 'quiz';

interface QuizState {
  currentQuestionIndex: number;
  selectedAnswer: string | null;
  isAnswered: boolean;
  isCorrect: boolean | null;
  score: number;
  answers: Array<{ questionId: string; answer: string; isCorrect: boolean | null; timeTakenMs: number }>;
  startTime: number;
  quizComplete: boolean;
}

function LearnTab({ schoolId, userId, subjects }: { schoolId: string; userId: string; subjects: Subject[] }) {
  const [learnView, setLearnView] = useState<LearnView>('subjects');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [lessonTab, setLessonTab] = useState<'explanation' | 'exercise' | 'quiz' | 'flashcard'>('explanation');

  // Data state
  const [topics, setTopics] = useState<SubjectTopicData[]>([]);
  const [topicDetail, setTopicDetail] = useState<SubjectTopicData | null>(null);
  const [lessons, setLessons] = useState<SubjectLessonData[]>([]);
  const [lessonDetail, setLessonDetail] = useState<SubjectLessonData | null>(null);
  const [questions, setQuestions] = useState<LessonQuestionData[]>([]);
  const [studentAnswers, setStudentAnswers] = useState<StudentAnswerData[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Quiz state
  const [quizState, setQuizState] = useState<QuizState>({
    currentQuestionIndex: 0,
    selectedAnswer: null,
    isAnswered: false,
    isCorrect: null,
    score: 0,
    answers: [],
    startTime: Date.now(),
    quizComplete: false,
  });

  // Flashcard state
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);

  // Find matching subject from curriculum subjects
  const selectedCurriculumSubject = CURRICULUM_SUBJECTS.find(
    cs => subjects.some(s => s.id === selectedSubjectId && s.name.toLowerCase().includes(cs.subjectName.toLowerCase()))
  );

  // Load topics for a subject
  const loadTopics = useCallback(async (subjectId: string) => {
    setLoadingData(true);
    try {
      const data = await fetchSubjectTopics({ schoolId, subjectId });
      setTopics(data);
    } catch {
      setTopics([]);
    } finally {
      setLoadingData(false);
    }
  }, [schoolId]);

  // Load topic detail
  const loadTopicDetail = useCallback(async (topicId: string) => {
    setLoadingData(true);
    try {
      const data = await fetchSubjectTopic(topicId);
      setTopicDetail(data);
    } catch {
      setTopicDetail(null);
    } finally {
      setLoadingData(false);
    }
  }, []);

  // Load lessons for a topic
  const loadLessons = useCallback(async (topicId: string) => {
    setLoadingData(true);
    try {
      const data = await fetchSubjectLessons(topicId);
      setLessons(data);
    } catch {
      setLessons([]);
    } finally {
      setLoadingData(false);
    }
  }, []);

  // Load lesson detail
  const loadLessonDetail = useCallback(async (lessonId: string) => {
    setLoadingData(true);
    try {
      const data = await fetchSubjectLesson(lessonId);
      setLessonDetail(data);
      if (data.questions) {
        setQuestions(data.questions);
      }
    } catch {
      setLessonDetail(null);
      setQuestions([]);
    } finally {
      setLoadingData(false);
    }
  }, []);

  // Load questions for a lesson
  const loadQuestions = useCallback(async (lessonId: string) => {
    try {
      const data = await fetchLessonQuestions(lessonId);
      setQuestions(data);
    } catch {
      setQuestions([]);
    }
  }, []);

  // Handle subject selection
  const handleSelectSubject = useCallback((subjectId: string) => {
    setSelectedSubjectId(subjectId);
    setLearnView('topics');
    loadTopics(subjectId);
  }, [loadTopics]);

  // Handle topic selection
  const handleSelectTopic = useCallback((topicId: string) => {
    setSelectedTopicId(topicId);
    setLearnView('lessons');
    loadLessons(topicId);
    loadTopicDetail(topicId);
  }, [loadLessons, loadTopicDetail]);

  // Handle lesson selection
  const handleSelectLesson = useCallback((lessonId: string, lessonType: string) => {
    setSelectedLessonId(lessonId);
    setLessonTab(lessonType as 'explanation' | 'exercise' | 'quiz' | 'flashcard');
    setLearnView('lesson-detail');
    loadLessonDetail(lessonId);
  }, [loadLessonDetail]);

  // Start quiz
  const handleStartQuiz = useCallback(() => {
    if (!selectedLessonId) return;
    loadQuestions(selectedLessonId);
    setLearnView('quiz');
    setQuizState({
      currentQuestionIndex: 0,
      selectedAnswer: null,
      isAnswered: false,
      isCorrect: null,
      score: 0,
      answers: [],
      startTime: Date.now(),
      quizComplete: false,
    });
  }, [selectedLessonId, loadQuestions]);

  // Handle quiz answer
  const handleQuizAnswer = useCallback(async (answer: string) => {
    if (!questions.length || quizState.isAnswered) return;
    const currentQuestion = questions[quizState.currentQuestionIndex];
    const isCorrect = answer === currentQuestion.correctAnswer;
    const timeTakenMs = Date.now() - quizState.startTime;

    setQuizState(prev => ({
      ...prev,
      selectedAnswer: answer,
      isAnswered: true,
      isCorrect,
      score: isCorrect ? prev.score + currentQuestion.points : prev.score,
      answers: [...prev.answers, { questionId: currentQuestion.id, answer, isCorrect, timeTakenMs }],
    }));

    // Submit answer to backend
    try {
      await submitStudentAnswer({
        questionId: currentQuestion.id,
        answer,
        timeTakenMs,
      });
    } catch {
      // non-critical
    }
  }, [questions, quizState]);

  // Next question
  const handleNextQuestion = useCallback(() => {
    if (quizState.currentQuestionIndex >= questions.length - 1) {
      setQuizState(prev => ({ ...prev, quizComplete: true }));
    } else {
      setQuizState(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1,
        selectedAnswer: null,
        isAnswered: false,
        isCorrect: null,
        startTime: Date.now(),
      }));
    }
  }, [questions, quizState]);

  // Retry quiz
  const handleRetryQuiz = useCallback(() => {
    setQuizState({
      currentQuestionIndex: 0,
      selectedAnswer: null,
      isAnswered: false,
      isCorrect: null,
      score: 0,
      answers: [],
      startTime: Date.now(),
      quizComplete: false,
    });
  }, []);

  // Navigate back
  const handleLearnBack = useCallback(() => {
    switch (learnView) {
      case 'topics':
        setLearnView('subjects');
        setSelectedSubjectId(null);
        break;
      case 'lessons':
        setLearnView('topics');
        setSelectedTopicId(null);
        break;
      case 'lesson-detail':
        setLearnView('lessons');
        setSelectedLessonId(null);
        break;
      case 'quiz':
        setLearnView('lesson-detail');
        break;
    }
  }, [learnView]);

  // Calculate progress for a topic
  const getTopicProgress = useCallback((topic: SubjectTopicData): number => {
    const lessonCount = topic._count?.lessons ?? 0;
    if (lessonCount === 0) return 0;
    return Math.min(100, Math.round((studentAnswers.filter(a => a.isCorrect).length / lessonCount) * 100));
  }, [studentAnswers]);

  // Get difficulty color
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800';
      case 'medium': return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
      case 'hard': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
    }
  };

  // Get lesson type icon
  const getLessonTypeIcon = (type: string) => {
    switch (type) {
      case 'explanation': return BookOpen;
      case 'exercise': return PenTool;
      case 'quiz': return Trophy;
      case 'flashcard': return Layers;
      case 'video_link': return Play;
      default: return BookOpen;
    }
  };

  // ─── Subject Browser View ─────────────────────────────────────────
  if (learnView === 'subjects') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        {/* Environmental Banner */}
        <div className="mb-6 rounded-xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
          <div className="px-6 py-5 text-white">
            <div className="flex items-center gap-3 mb-2">
              <Leaf className="w-8 h-8" />
              <h2 className="text-xl font-bold">{t('notebooks.papier_sparen')}</h2>
            </div>
            <p className="text-white/90 text-sm">{t('notebooks.digital_instead_paper')}</p>
            <p className="text-white/80 text-xs mt-2">{t('notebooks.environment_tip')}</p>
          </div>
        </div>

        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-emerald-500" />
            {t('notebooks.learn')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('notebooks.curriculum')}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {CURRICULUM_SUBJECTS.map((subject, idx) => {
            const SubjectIcon = subject.icon;
            // Find matching subject from school subjects
            const matchingSubject = subjects.find(s =>
              s.name.toLowerCase().includes(subject.subjectName.toLowerCase()) ||
              subject.key === 'math' && s.name.toLowerCase().includes('mathematik') ||
              subject.key === 'german' && s.name.toLowerCase().includes('deutsch') ||
              subject.key === 'science' && (s.name.toLowerCase().includes('sachkunde') || s.name.toLowerCase().includes('heimat')) ||
              subject.key === 'english' && s.name.toLowerCase().includes('englisch') ||
              subject.key === 'music' && s.name.toLowerCase().includes('musik') ||
              subject.key === 'art' && s.name.toLowerCase().includes('kunst') ||
              subject.key === 'religion' && (s.name.toLowerCase().includes('religion') || s.name.toLowerCase().includes('ethik')) ||
              subject.key === 'pe' && (s.name.toLowerCase().includes('sport') || s.name.toLowerCase().includes('bewegung'))
            );
            const topicCount = matchingSubject ? topics.filter(tp => tp.subjectId === matchingSubject.id).length : 0;

            return (
              <motion.div
                key={subject.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card
                  className="relative overflow-hidden cursor-pointer group transition-all duration-300 hover:shadow-lg border-0 min-h-[160px]"
                  style={{ boxShadow: `3px 3px 10px rgba(0,0,0,0.12)` }}
                  onClick={() => matchingSubject ? handleSelectSubject(matchingSubject.id) : toast.info(t('notebooks.subject_topic'))}
                >
                  <div
                    className="h-24 flex items-center justify-center relative"
                    style={{ background: `linear-gradient(135deg, ${subject.color}, ${subject.color}cc)` }}
                  >
                    <SubjectIcon className="w-10 h-10 text-white/90 drop-shadow-md" />
                    <div className="absolute left-0 top-0 bottom-0 w-2.5 opacity-80" style={{ background: `linear-gradient(90deg, ${subject.color}99, ${subject.color}66)` }} />
                  </div>
                  <CardContent className="p-4 space-y-2">
                    <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                      {t(subject.labelKey)}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs gap-1">
                        <BookOpen className="w-3 h-3" />
                        {topicCount} {t('notebooks.topics')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                      <Leaf className="w-3 h-3" />
                      <span>{t('notebooks.environment_tip').substring(0, 40)}...</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    );
  }

  // ─── Topic List View ──────────────────────────────────────────────
  if (learnView === 'topics') {
    const subjectName = subjects.find(s => s.id === selectedSubjectId)?.name ?? '';
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={handleLearnBack} className="min-h-[44px] min-w-[44px]">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              {selectedCurriculumSubject && (() => { const I = selectedCurriculumSubject.icon; return <I className="w-5 h-5" style={{ color: selectedCurriculumSubject.color }} />; })()}
              {subjectName}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('notebooks.topics')}</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
            <Leaf className="w-3.5 h-3.5" />
            <span>{t('notebooks.digital_instead_paper')}</span>
          </div>
        </div>

        {loadingData ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              <span className="text-gray-500">{t('notebooks.loading')}</span>
            </div>
          </div>
        ) : topics.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <GraduationCap className="w-16 h-16 text-gray-300 dark:text-gray-600" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">{t('notebooks.no_notebooks')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {topics.map((topic, idx) => {
              const progress = getTopicProgress(topic);
              const lessonCount = topic._count?.lessons ?? 0;
              return (
                <motion.div
                  key={topic.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card
                    className="cursor-pointer group transition-all duration-300 hover:shadow-md border border-gray-200 dark:border-gray-700"
                    onClick={() => handleSelectTopic(topic.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: topic.color || '#10b981' }}
                        >
                          {topic.icon ? (() => { const Ic = ICON_MAP[topic.icon] ?? BookOpen; return <Ic className="w-6 h-6 text-white" />; })() : <BookOpen className="w-6 h-6 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 dark:text-gray-100">{topic.title}</div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {topic.gradeLevel && (
                              <Badge variant="outline" className="text-xs gap-1">
                                <GraduationCap className="w-3 h-3" />
                                {t('notebooks.grade_level')} {topic.gradeLevel}
                              </Badge>
                            )}
                            {topic.curriculumCode && (
                              <Badge variant="secondary" className="text-xs font-mono">
                                {topic.curriculumCode}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs gap-1">
                              <BookOpen className="w-3 h-3" />
                              {lessonCount} {t('notebooks.lessons')}
                            </Badge>
                          </div>
                          {/* Progress bar */}
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{progress}%</span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-emerald-500 transition-colors shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    );
  }

  // ─── Lesson List View ─────────────────────────────────────────────
  if (learnView === 'lessons') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={handleLearnBack} className="min-h-[44px] min-w-[44px]">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-500" />
              {topicDetail?.title ?? t('notebooks.topics')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('notebooks.lessons')}</p>
          </div>
          {topicDetail?.curriculumCode && (
            <Badge variant="secondary" className="text-xs font-mono">{topicDetail.curriculumCode}</Badge>
          )}
        </div>

        {loadingData ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              <span className="text-gray-500">{t('notebooks.loading')}</span>
            </div>
          </div>
        ) : lessons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <BookOpen className="w-16 h-16 text-gray-300 dark:text-gray-600" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">{t('notebooks.no_notebooks')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {lessons.map((lesson, idx) => {
              const LessonIcon = getLessonTypeIcon(lesson.lessonType);
              const questionCount = lesson._count?.questions ?? 0;
              const difficultyClass = getDifficultyColor(lesson.difficulty);
              return (
                <motion.div
                  key={lesson.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card
                    className="cursor-pointer group transition-all duration-300 hover:shadow-md border border-gray-200 dark:border-gray-700"
                    onClick={() => handleSelectLesson(lesson.id, lesson.lessonType)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                          <LessonIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 dark:text-gray-100">{lesson.title}</div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge className={`text-xs border ${difficultyClass}`}>
                              {t(`notebooks.${lesson.difficulty}`)}
                            </Badge>
                            {lesson.lessonType && (
                              <Badge variant="outline" className="text-xs gap-1">
                                <LessonIcon className="w-3 h-3" />
                                {t(`notebooks.${lesson.lessonType === 'exercise' ? 'exercises' : lesson.lessonType === 'flashcard' ? 'flashcards' : lesson.lessonType}`)}
                              </Badge>
                            )}
                            {questionCount > 0 && (
                              <Badge variant="outline" className="text-xs gap-1">
                                {t('notebooks.question')} {questionCount}
                              </Badge>
                            )}
                            {lesson.estimatedMinutes && (
                              <Badge variant="outline" className="text-xs gap-1">
                                <Clock className="w-3 h-3" />
                                {lesson.estimatedMinutes} min
                              </Badge>
                            )}
                          </div>
                          {lesson.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{lesson.description}</p>
                          )}
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-emerald-500 transition-colors shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    );
  }

  // ─── Lesson Detail View ───────────────────────────────────────────
  if (learnView === 'lesson-detail' && lessonDetail) {
    const lessonTypeTabs = [
      { key: 'explanation' as const, icon: BookOpen, labelKey: 'notebooks.exercises' },
      { key: 'exercise' as const, icon: PenTool, labelKey: 'notebooks.exercises' },
      { key: 'quiz' as const, icon: Trophy, labelKey: 'notebooks.quiz' },
      { key: 'flashcard' as const, icon: Layers, labelKey: 'notebooks.flashcards' },
    ];

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="sm" onClick={handleLearnBack} className="min-h-[44px] min-w-[44px]">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">{lessonDetail.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={`text-xs border ${getDifficultyColor(lessonDetail.difficulty)}`}>
                {t(`notebooks.${lessonDetail.difficulty}`)}
              </Badge>
              {lessonDetail.estimatedMinutes && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Clock className="w-3 h-3" />
                  {lessonDetail.estimatedMinutes} min
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Lesson tab navigation */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
          {lessonTypeTabs.map(tab => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setLessonTab(tab.key)}
                className={`px-4 py-2 rounded-full text-sm font-medium min-h-[44px] transition-all whitespace-nowrap ${
                  lessonTab === tab.key
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <TabIcon className="w-4 h-4 inline mr-1.5" />
                {t(tab.labelKey)}
              </button>
            );
          })}
        </div>

        {/* Lesson content */}
        <Card className="border border-gray-200 dark:border-gray-700">
          <CardContent className="p-6">
            {lessonTab === 'explanation' && (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div
                  className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: lessonDetail.content || `<p>${t('notebooks.no_notebooks_desc')}</p>` }}
                />
              </div>
            )}

            {lessonTab === 'exercise' && (
              <div className="space-y-4">
                {questions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-3">
                    <PenTool className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">{t('notebooks.no_notebooks')}</p>
                  </div>
                ) : (
                  questions.filter(q => q.questionType === 'fill_blank' || q.questionType === 'short_answer').map((q, idx) => (
                    <ExerciseQuestion key={q.id} question={q} index={idx} />
                  ))
                )}
                {questions.filter(q => q.questionType === 'fill_blank' || q.questionType === 'short_answer').length === 0 && questions.length > 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400 text-sm">{t('notebooks.no_notebooks')}</p>
                  </div>
                )}
              </div>
            )}

            {lessonTab === 'quiz' && (
              <div className="flex flex-col items-center justify-center py-8 gap-4">
                <Trophy className="w-16 h-16 text-emerald-500" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('notebooks.quiz')}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {questions.length} {t('notebooks.question')}
                </p>
                <Button
                  onClick={handleStartQuiz}
                  disabled={questions.length === 0}
                  className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  {t('notebooks.quiz')}
                </Button>
                {questions.length === 0 && (
                  <p className="text-xs text-gray-400">{t('notebooks.no_notebooks')}</p>
                )}
              </div>
            )}

            {lessonTab === 'flashcard' && (
              <div className="flex flex-col items-center justify-center py-8 gap-4">
                {questions.length === 0 ? (
                  <>
                    <Layers className="w-16 h-16 text-gray-300 dark:text-gray-600" />
                    <p className="text-gray-500 dark:text-gray-400">{t('notebooks.no_notebooks')}</p>
                  </>
                ) : (
                  <>
                    <div
                      className="w-full max-w-md min-h-[240px] rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 cursor-pointer flex items-center justify-center transition-all duration-300 hover:shadow-lg"
                      style={{ perspective: '1000px' }}
                      onClick={() => setFlashcardFlipped(!flashcardFlipped)}
                    >
                      <AnimatePresence mode="wait">
                        {!flashcardFlipped ? (
                          <motion.div
                            key="front"
                            initial={{ rotateY: 90, opacity: 0 }}
                            animate={{ rotateY: 0, opacity: 1 }}
                            exit={{ rotateY: -90, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="text-center"
                          >
                            <BookOpen className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
                            <p className="text-gray-900 dark:text-gray-100 font-semibold text-lg">
                              {questions[flashcardIndex]?.question}
                            </p>
                            <p className="text-xs text-gray-400 mt-2">{t('notebooks.answer')}</p>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="back"
                            initial={{ rotateY: 90, opacity: 0 }}
                            animate={{ rotateY: 0, opacity: 1 }}
                            exit={{ rotateY: -90, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="text-center"
                          >
                            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
                            <p className="text-emerald-600 dark:text-emerald-400 font-semibold text-lg">
                              {questions[flashcardIndex]?.correctAnswer}
                            </p>
                            {questions[flashcardIndex]?.explanation && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                {questions[flashcardIndex].explanation}
                              </p>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setFlashcardFlipped(false); setFlashcardIndex(Math.max(0, flashcardIndex - 1)); }}
                        disabled={flashcardIndex === 0}
                        className="min-h-[44px]"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        {t('action.back')}
                      </Button>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {flashcardIndex + 1} / {questions.length}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setFlashcardFlipped(false); setFlashcardIndex(Math.min(questions.length - 1, flashcardIndex + 1)); }}
                        disabled={flashcardIndex >= questions.length - 1}
                        className="min-h-[44px]"
                      >
                        {t('action.next')}
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Environmental tip */}
        <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-700 dark:text-emerald-300 text-sm">
          <Leaf className="w-4 h-4 shrink-0" />
          <span>{t('notebooks.environment_tip')}</span>
        </div>
      </motion.div>
    );
  }

  // ─── Quiz View ────────────────────────────────────────────────────
  if (learnView === 'quiz') {
    const currentQuestion = questions[quizState.currentQuestionIndex];
    const totalQuestions = questions.length;
    const progressPercent = totalQuestions > 0 ? ((quizState.currentQuestionIndex + (quizState.quizComplete ? 1 : 0)) / totalQuestions) * 100 : 0;

    // Quiz complete screen
    if (quizState.quizComplete) {
      const maxScore = questions.reduce((sum, q) => sum + q.points, 0);
      const percentage = maxScore > 0 ? Math.round((quizState.score / maxScore) * 100) : 0;
      const isGood = percentage >= 70;

      return (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="sm" onClick={handleLearnBack} className="min-h-[44px] min-w-[44px]">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('notebooks.quiz')}</h2>
          </div>

          <Card className="border border-gray-200 dark:border-gray-700">
            <CardContent className="p-6 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
              >
                {isGood ? (
                  <Trophy className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                ) : (
                  <Flame className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                )}
              </motion.div>

              <h3 className={`text-2xl font-bold ${isGood ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {isGood ? t('notebooks.well_done') : t('notebooks.keep_practicing')}
              </h3>

              <div className="mt-6 grid grid-cols-2 gap-4 max-w-sm mx-auto">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4">
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{quizState.score}</div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-400">{t('notebooks.score')}</div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4">
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{percentage}%</div>
                  <div className="text-xs text-amber-600 dark:text-amber-400">{t('notebooks.mastery')}</div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-center gap-4">
                <Button
                  onClick={handleRetryQuiz}
                  className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  {t('notebooks.try_again')}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleLearnBack}
                  className="min-h-[44px]"
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  {t('action.back')}
                </Button>
              </div>

              {/* Environmental message */}
              <div className="mt-6 flex items-center gap-2 justify-center text-emerald-600 dark:text-emerald-400 text-sm">
                <Leaf className="w-4 h-4" />
                <span>{t('notebooks.environment_tip')}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      );
    }

    // Active quiz question
    if (!currentQuestion) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Trophy className="w-16 h-16 text-gray-300 dark:text-gray-600" />
          <p className="text-gray-500 dark:text-gray-400">{t('notebooks.no_notebooks')}</p>
          <Button onClick={handleLearnBack} className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700">
            {t('action.back')}
          </Button>
        </div>
      );
    }

    // Parse options from JSON string
    let options: string[] = [];
    try {
      const parsed = currentQuestion.options ? JSON.parse(currentQuestion.options) : [];
      options = Array.isArray(parsed) ? parsed : [];
    } catch {
      options = currentQuestion.options ? currentQuestion.options.split(',').map(o => o.trim()) : [];
    }

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="sm" onClick={handleLearnBack} className="min-h-[44px] min-w-[44px]">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('notebooks.quiz')}</h2>
          <div className="flex-1" />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t('notebooks.question')} {quizState.currentQuestionIndex + 1}/{totalQuestions}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-6">
          <motion.div
            className="h-full bg-emerald-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        <Card className="border border-gray-200 dark:border-gray-700">
          <CardContent className="p-6">
            {/* Question */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {currentQuestion.question}
              </h3>
              {currentQuestion.questionType === 'true_false' && (
                <Badge variant="outline" className="mt-2 text-xs">Wahr / Falsch</Badge>
              )}
            </div>

            {/* Answer options */}
            <div className="space-y-3">
              {options.map((option, idx) => {
                const isSelected = quizState.selectedAnswer === option;
                const isCorrectOption = quizState.isAnswered && option === currentQuestion.correctAnswer;
                const isWrongSelection = quizState.isAnswered && isSelected && option !== currentQuestion.correctAnswer;

                let optionClass = 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-emerald-300 dark:hover:border-emerald-600 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10';
                if (isCorrectOption) {
                  optionClass = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 ring-2 ring-emerald-500/30';
                } else if (isWrongSelection) {
                  optionClass = 'border-red-500 bg-red-50 dark:bg-red-900/20 ring-2 ring-red-500/30';
                } else if (isSelected && !quizState.isAnswered) {
                  optionClass = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 ring-2 ring-emerald-500/30';
                }

                return (
                  <motion.button
                    key={idx}
                    onClick={() => !quizState.isAnswered && handleQuizAnswer(option)}
                    disabled={quizState.isAnswered}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all min-h-[48px] ${optionClass} ${quizState.isAnswered ? 'cursor-default' : 'cursor-pointer'}`}
                    whileTap={!quizState.isAnswered ? { scale: 0.98 } : {}}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                        isCorrectOption
                          ? 'bg-emerald-500 text-white'
                          : isWrongSelection
                            ? 'bg-red-500 text-white'
                            : isSelected
                              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                      }`}>
                        {isCorrectOption ? <CheckCircle2 className="w-5 h-5" /> : isWrongSelection ? <XCircle className="w-5 h-5" /> : String.fromCharCode(65 + idx)}
                      </div>
                      <span className={`font-medium ${
                        isCorrectOption ? 'text-emerald-700 dark:text-emerald-300' : isWrongSelection ? 'text-red-700 dark:text-red-300' : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {option}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Feedback after answering */}
            <AnimatePresence>
              {quizState.isAnswered && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-6"
                >
                  <div className={`p-4 rounded-xl ${
                    quizState.isCorrect
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {quizState.isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                      )}
                      <span className={`font-semibold ${quizState.isCorrect ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
                        {quizState.isCorrect ? t('notebooks.correct') : t('notebooks.incorrect')}
                      </span>
                    </div>
                    {currentQuestion.explanation && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">{currentQuestion.explanation}</p>
                    )}
                    {!quizState.isCorrect && (
                      <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                        {t('notebooks.correct')}: {currentQuestion.correctAnswer}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex justify-end">
                    <Button
                      onClick={handleNextQuestion}
                      className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700"
                    >
                      {quizState.currentQuestionIndex >= totalQuestions - 1 ? t('notebooks.score') : t('notebooks.next_question')}
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Environmental tip */}
        <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-700 dark:text-emerald-300 text-sm">
          <Leaf className="w-4 h-4 shrink-0" />
          <span>{t('notebooks.environment_tip')}</span>
        </div>
      </motion.div>
    );
  }

  // Fallback
  return null;
}

// ─── Exercise Question Component ─────────────────────────────────────

function ExerciseQuestion({ question, index }: { question: LessonQuestionData; index: number }) {
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const handleSubmit = async () => {
    if (!answer.trim()) return;
    const correct = answer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
    setIsCorrect(correct);
    setSubmitted(true);

    try {
      await submitStudentAnswer({
        questionId: question.id,
        answer: answer.trim(),
        timeTakenMs: null,
      });
    } catch {
      // non-critical
    }
  };

  const handleRetry = () => {
    setAnswer('');
    setSubmitted(false);
    setIsCorrect(null);
  };

  return (
    <Card className="border border-gray-200 dark:border-gray-700">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-sm font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
            {index + 1}
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900 dark:text-gray-100 mb-3">{question.question}</p>
            {question.questionType === 'fill_blank' ? (
              <div className="flex items-center gap-2">
                <Input
                  value={answer}
                  onChange={(e) => { setAnswer(e.target.value); if (submitted) { setSubmitted(false); setIsCorrect(null); } }}
                  placeholder={t('notebooks.answer') + '...'}
                  disabled={submitted}
                  className="min-h-[44px] flex-1"
                />
                {!submitted ? (
                  <Button onClick={handleSubmit} disabled={!answer.trim()} className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700 shrink-0">
                    {t('action.confirm')}
                  </Button>
                ) : (
                  <Button onClick={handleRetry} variant="outline" className="min-h-[44px] shrink-0">
                    <RotateCcw className="w-4 h-4 mr-1" />
                    {t('notebooks.try_again')}
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Textarea
                  value={answer}
                  onChange={(e) => { setAnswer(e.target.value); if (submitted) { setSubmitted(false); setIsCorrect(null); } }}
                  placeholder={t('notebooks.answer') + '...'}
                  disabled={submitted}
                  className="min-h-[80px]"
                />
                {!submitted ? (
                  <Button onClick={handleSubmit} disabled={!answer.trim()} className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700">
                    {t('action.confirm')}
                  </Button>
                ) : (
                  <Button onClick={handleRetry} variant="outline" className="min-h-[44px]">
                    <RotateCcw className="w-4 h-4 mr-1" />
                    {t('notebooks.try_again')}
                  </Button>
                )}
              </div>
            )}
            {submitted && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-3 p-3 rounded-lg ${
                  isCorrect
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isCorrect ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  )}
                  <span className={`text-sm font-medium ${isCorrect ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
                    {isCorrect ? t('notebooks.correct') : t('notebooks.incorrect')}
                  </span>
                </div>
                {!isCorrect && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {t('notebooks.correct')}: {question.correctAnswer}
                  </p>
                )}
                {question.explanation && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{question.explanation}</p>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
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
  const [activeTab, setActiveTab] = useState<'all' | 'shared' | 'templates' | 'learn'>('all');
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

  // Tree calculation: ~8000 sheets of paper per tree, so 50 pages per notebook
  const treesSaved = useMemo(
    () => Math.max(0, totalPaperSaved / 8000),
    [totalPaperSaved]
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

  const handleAddPage = useCallback(async (templateKey?: string, background?: string, content?: string) => {
    if (!selectedNotebook) return;
    const pagesCount = selectedNotebook.pages?.length ?? 0;
    // Auto-add date stamp to new pages
    const now = new Date();
    const dateStr = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()}`;
    const dateStamp = `<div style="font-size:12px;color:#9ca3af;margin-bottom:8px;">${t('notebooks.date_stamp')}: ${dateStr}</div>`;
    const finalContent = content ? dateStamp + content : dateStamp;
    const newPage = await apiPost<NotebookPage>(`/api/notebooks/${selectedNotebook.id}/pages`, {
      pageNumber: pagesCount + 1,
      background: background ?? selectedNotebook.notebookType,
      title: templateKey && templateKey !== 'blank' ? t(`notebooks.page_template_${templateKey}`) : null,
      textContent: finalContent,
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

  const handleDuplicatePage = useCallback(async (pageId: string) => {
    if (!selectedNotebook) return;
    const page = selectedNotebook.pages?.find(p => p.id === pageId);
    if (!page) return;
    const pagesCount = selectedNotebook.pages?.length ?? 0;
    try {
      const newPage = await apiPost<NotebookPage>(`/api/notebooks/${selectedNotebook.id}/pages`, {
        pageNumber: pagesCount + 1,
        background: page.background,
        title: (page.title ?? '') + ' ' + t('notebooks.copy_suffix'),
        textContent: page.textContent,
        drawingData: page.drawingData,
      });
      setSelectedNotebook(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          pages: [...(prev.pages ?? []), newPage],
        };
      });
      toast.success(t('notebooks.duplicate_page_success'));
    } catch {
      toast.error(t('notebooks.duplicate_page_error'));
    }
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
        ownerType: currentUser?.role === 'STUDENT' ? 'STUDENT' : 'TEACHER',
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
          onDuplicatePage={handleDuplicatePage}
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
          <div className="flex items-center gap-3 flex-wrap">
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
            {treesSaved > 0 && (
              <Card className="px-3 py-2 border-0 shadow-sm bg-amber-50 dark:bg-amber-900/20">
                <div className="text-xs text-amber-600 dark:text-amber-400">{t('notebooks.trees_saved')}</div>
                <div className="text-lg font-bold text-amber-700 dark:text-amber-300">
                  {treesSaved < 1 ? treesSaved.toFixed(2) : treesSaved.toFixed(1)} {t('notebooks.trees_unit')}
                </div>
              </Card>
            )}
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
          <button
            onClick={() => { setActiveTab('learn'); setSubjectFilter('all'); }}
            className={`px-4 py-2 rounded-full text-sm font-medium min-h-[44px] transition-all ${
              activeTab === 'learn'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <GraduationCap className="w-4 h-4 inline mr-1.5" />
            {t('notebooks.learn')}
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
        ) : activeTab === 'learn' ? (
          /* Learn Tab */
          <LearnTab schoolId={schoolId} userId={currentUser?.id ?? ''} subjects={subjects} />
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

      {/* Floating Action Button for new notebook */}
      {!selectedNotebook && !showArchived && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="fab"
          onClick={() => setCreateOpen(true)}
          title={t('notebooks.create')}
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      )}

      {/* Eco footer bar */}
      <div className="bg-emerald-50 dark:bg-emerald-900/20 border-t border-emerald-200 dark:border-emerald-800 px-4 sm:px-6 py-3">
        <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-300 text-sm flex-wrap">
          <Leaf className="w-5 h-5" />
          <span>
            {t('notebooks.eco_total', {
              count: notebooks.length,
              pages: totalPaperSaved,
            })}
          </span>
          {treesSaved > 0 && (
            <>
              <Separator orientation="vertical" className="h-4 bg-emerald-300 dark:bg-emerald-700" />
              <span className="text-xs flex items-center gap-1">
                {t('notebooks.trees_saved_message', { count: treesSaved < 1 ? treesSaved.toFixed(2) : treesSaved.toFixed(1) })}
              </span>
            </>
          )}
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
