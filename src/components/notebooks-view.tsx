'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Book, Archive, Grid3X3, AlignLeft, File,
  Palette, Leaf, Plus, Star, Trash2, ChevronLeft,
  MoreHorizontal, Music, PenTool, Search, X,
  Share2, Eye, EyeOff, Edit3, Hash, Bookmark,
  PenLine, Layers, BookMarked, Globe, Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { toast } from 'sonner';

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

// ─── Notebook Card Component ─────────────────────────────────────────

function NotebookCard({
  notebook,
  subjectName,
  onOpen,
  onArchive,
  onDelete,
}: {
  notebook: Notebook;
  subjectName: string | null;
  onOpen: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const pageCount = notebook.pages?.length ?? 0;
  const IconComponent = notebook.icon ? ICON_MAP[notebook.icon] ?? BookOpen : BookOpen;
  const typeInfo = NOTEBOOK_TYPES.find(nt => nt.key === notebook.notebookType) ?? NOTEBOOK_TYPES[0];
  const TypeIcon = typeInfo.icon;

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
          {notebook.isPublic && (
            <Badge className="absolute top-2 right-2 bg-white/90 text-gray-700 text-xs border-0 shadow-sm">
              <Share2 className="w-3 h-3 mr-1" />
              {t('notebooks.public')}
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

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
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
  onCreate: (data: Partial<Notebook>) => void;
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
}: {
  notebook: Notebook;
  subjectName: string | null;
  onBack: () => void;
  onUpdatePage: (pageId: string, data: Partial<NotebookPage>) => void;
  onAddPage: () => void;
  onDeletePage: (pageId: string) => void;
  onToggleBookmark: (pageId: string) => void;
  onTogglePublic: () => void;
}) {
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [pageContent, setPageContent] = useState('');
  const [pageTitle, setPageTitle] = useState('');
  const [drawingMode, setDrawingMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const pages = notebook.pages ?? [];
  const currentPage = pages.find(p => p.id === currentPageId) ?? pages[0] ?? null;

  useEffect(() => {
    if (currentPage) {
      setCurrentPageId(currentPage.id);
      setPageContent(currentPage.textContent ?? '');
      setPageTitle(currentPage.title ?? '');
    } else if (pages.length > 0) {
      setCurrentPageId(pages[0].id);
      setPageContent(pages[0].textContent ?? '');
      setPageTitle(pages[0].title ?? '');
    }
  }, [notebook.id]);

  useEffect(() => {
    if (currentPage) {
      setPageContent(currentPage.textContent ?? '');
      setPageTitle(currentPage.title ?? '');
    }
  }, [currentPageId]);

  const handleSavePage = async () => {
    if (!currentPage) return;
    setSaving(true);
    try {
      await onUpdatePage(currentPage.id, {
        textContent: pageContent,
        title: pageTitle.trim() || null,
      });
      toast.success(t('notebooks.page_saved'));
    } catch {
      toast.error(t('notebooks.error_save'));
    } finally {
      setSaving(false);
    }
  };

  const IconComponent = notebook.icon ? ICON_MAP[notebook.icon] ?? BookOpen : BookOpen;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-full"
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
                <Share2 className="w-3 h-3 mr-1" />
                {t('notebooks.public')}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">{t('notebooks.private')}</Badge>
            )}
          </div>
        </div>

        {/* Drawing mode toggle */}
        <Button
          variant={drawingMode ? 'default' : 'outline'}
          size="sm"
          onClick={() => setDrawingMode(!drawingMode)}
          className="min-h-[44px] shrink-0"
        >
          {drawingMode ? (
            <>
              <PenLine className="w-4 h-4 mr-1" />
              {t('notebooks.drawing_mode_exit')}
            </>
          ) : (
            <>
              <PenLine className="w-4 h-4 mr-1" />
              {t('notebooks.drawing_mode_toggle')}
            </>
          )}
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
        <div className="w-56 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex flex-col">
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

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {pages.map((page, idx) => (
                <motion.div
                  key={page.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                >
                  <button
                    onClick={() => { setCurrentPageId(page.id); setDrawingMode(false); }}
                    className={`w-full text-left p-2 rounded-lg text-sm transition-all min-h-[44px] flex items-center gap-2 ${
                      currentPageId === page.id
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Hash className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate flex-1">
                      {page.title ?? `${t('notebooks.page')} ${page.pageNumber}`}
                    </span>
                    {page.isBookmark && (
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                    )}
                  </button>
                </motion.div>
              ))}
            </div>
          </ScrollArea>

          {/* Eco message in sidebar */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
              <Leaf className="w-3.5 h-3.5" />
              <span>{t('notebooks.eco_message')}</span>
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
                /* Drawing placeholder */
                <div className="flex-1 flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full h-full max-w-3xl rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white flex flex-col items-center justify-center gap-4 p-8"
                    style={{ ...getPageBackgroundCSS(currentPage.background ?? notebook.notebookType), backgroundColor: '#fff' }}
                  >
                    <PenLine className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                    <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">
                      {t('notebooks.drawing_placeholder')}
                    </p>
                    <Button variant="outline" onClick={() => setDrawingMode(false)} className="min-h-[44px]">
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      {t('notebooks.drawing_mode_exit')}
                    </Button>
                  </motion.div>
                </div>
              ) : (
                /* Text editing area with page background */
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
                        <textarea
                          value={pageContent}
                          onChange={(e) => setPageContent(e.target.value)}
                          placeholder={t('notebooks.page_content') + '...'}
                          className="w-full min-h-[500px] bg-transparent border-0 outline-none resize-none text-base leading-8 text-gray-800 dark:text-gray-200 placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:ring-0"
                          style={{ lineHeight: notebook.notebookType === 'lined' || notebook.notebookType === 'calligraphy' ? '32px' : '1.5' }}
                        />
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              )}

              {/* Save bar */}
              <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {t('notebooks.page')} {currentPage.pageNumber} / {pages.length}
                </div>
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
      // Show empty state on error
      setNotebooks([]);
      setSubjects([]);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    () => notebooks.reduce((sum, n) => sum + (n.pages?.length ?? 0) * 50, 0),
    [notebooks]
  );

  // Handlers
  const handleCreate = useCallback(async (data: Partial<Notebook>) => {
    const result = await apiPost<Notebook>('/api/notebooks', {
      ...data,
      schoolId,
      ownerId: currentUser?.id ?? '',
      ownerType: 'TEACHER',
      subjectId: data.subjectId === 'none' ? null : data.subjectId,
      classGroupId: data.classGroupId === 'none' ? null : data.classGroupId,
    });
    setNotebooks(prev => [...prev, result]);
    toast.success(t('notebooks.created'));
  }, [schoolId, currentUser]);

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
    // Load pages for the notebook if not already loaded
    try {
      const pages = await apiGet<NotebookPage[]>(`/api/notebooks/${notebook.id}/pages`);
      const fullNotebook = { ...notebook, pages };
      setSelectedNotebook(fullNotebook);
    } catch {
      // Fallback: open notebook without pages
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

  // ─── Render ────────────────────────────────────────────────────

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

      {/* Subject Filter Bar */}
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

      {/* Notebook Grid */}
      <div className="flex-1 p-4 sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              <span className="text-gray-500">{t('notebooks.loading')}</span>
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
