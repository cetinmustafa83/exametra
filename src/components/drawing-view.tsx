'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Pencil,
  Trash2,
  Share2,
  Leaf,
  Palette,
  Search,
  Filter,
  Image as ImageIcon,
  Eye,
  EyeOff,
  Loader2,
  BookOpen,
  Save,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import DrawingCanvas, { type Stroke } from '@/components/drawing-canvas';

/* ── Types ─────────────────────────────────────────────────────────── */

interface DrawingRecord {
  id: string;
  title: string;
  description?: string;
  drawingData: string;
  imageData?: string;
  subjectId?: string;
  classGroupId?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SubjectOption {
  id: string;
  name: string;
}

/* ── Animation variants ────────────────────────────────────────────── */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

/* ── Main Component ────────────────────────────────────────────────── */

export default function DrawingView() {
  const { currentUser } = useAppStore();

  // View state
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [editingDrawing, setEditingDrawing] = useState<DrawingRecord | null>(null);

  // Data state
  const [drawings, setDrawings] = useState<DrawingRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<DrawingRecord | null>(null);

  /* ── Fetch drawings ─────────────────────────────────────────────── */

  const fetchDrawings = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiGet<DrawingRecord[]>('/api/drawings');
      setDrawings(Array.isArray(data) ? data : []);
    } catch {
      setDrawings([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSubjects = useCallback(async () => {
    try {
      const data = await apiGet<SubjectOption[]>('/api/subjects');
      setSubjects(Array.isArray(data) ? data : []);
    } catch {
      setSubjects([]);
    }
  }, []);

  useEffect(() => {
    fetchDrawings();
    fetchSubjects();
  }, [fetchDrawings, fetchSubjects]);

  /* ── Filtered drawings ──────────────────────────────────────────── */

  const filteredDrawings = drawings.filter((d) => {
    if (filterSubject !== 'all' && d.subjectId !== filterSubject) return false;
    if (searchQuery && !d.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  /* ── Save handler ───────────────────────────────────────────────── */

  const handleSaveDrawing = useCallback(
    async (drawingData: string, imageData: string) => {
      try {
        if (editingDrawing) {
          // Update existing
          await apiPut(`/api/drawings/${editingDrawing.id}`, {
            title: editingDrawing.title,
            drawingData,
            imageData,
          });
        } else {
          // Create new
          await apiPost('/api/drawings', {
            title: t('drawing.untitled'),
            drawingData,
            imageData,
            schoolId: currentUser?.schoolId,
            subjectId: filterSubject !== 'all' ? filterSubject : undefined,
          });
        }
        setIsCanvasOpen(false);
        setEditingDrawing(null);
        fetchDrawings();
      } catch {
        // Error handling
      }
    },
    [editingDrawing, currentUser, filterSubject, fetchDrawings]
  );

  /* ── Delete handler ─────────────────────────────────────────────── */

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await apiDelete(`/api/drawings/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchDrawings();
    } catch {
      // Error handling
    }
  }, [deleteTarget, fetchDrawings]);

  /* ── Toggle public ──────────────────────────────────────────────── */

  const handleTogglePublic = useCallback(
    async (drawing: DrawingRecord) => {
      try {
        await apiPut(`/api/drawings/${drawing.id}`, {
          isPublic: !drawing.isPublic,
        });
        fetchDrawings();
      } catch {
        // Error handling
      }
    },
    [fetchDrawings]
  );

  /* ── Open canvas for new drawing ────────────────────────────────── */

  const handleNewDrawing = useCallback(() => {
    setEditingDrawing(null);
    setIsCanvasOpen(true);
  }, []);

  /* ── Open canvas for editing ────────────────────────────────────── */

  const handleEditDrawing = useCallback((drawing: DrawingRecord) => {
    setEditingDrawing(drawing);
    setIsCanvasOpen(true);
  }, []);

  /* ── Exit canvas ────────────────────────────────────────────────── */

  const handleExitCanvas = useCallback(() => {
    setIsCanvasOpen(false);
    setEditingDrawing(null);
  }, []);

  /* ── Canvas mode ────────────────────────────────────────────────── */

  if (isCanvasOpen) {
    return (
      <div className="h-screen w-full">
        <DrawingCanvas
          initialDrawingData={editingDrawing?.drawingData}
          onSave={handleSaveDrawing}
          onExit={handleExitCanvas}
          title={editingDrawing?.title}
          subjectId={editingDrawing?.subjectId}
          classGroupId={editingDrawing?.classGroupId}
        />
      </div>
    );
  }

  /* ── Gallery mode ───────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <motion.div
        className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* ── Header ──────────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
                <Palette className="h-7 w-7 text-emerald-600" />
                {t('drawing.title')}
              </h1>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                <Leaf className="h-4 w-4 text-emerald-500" />
                {t('drawing.subtitle')}
              </p>
            </div>
            <Button
              onClick={handleNewDrawing}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('drawing.new')}
            </Button>
          </div>
        </motion.div>

        {/* ── Eco tip banner ──────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="mb-6">
          <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 dark:border-emerald-800 dark:from-emerald-950/30 dark:to-green-950/30">
            <CardContent className="flex items-center gap-3 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                <Leaf className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                {t('drawing.eco_tip')}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Filters ─────────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('action.search')}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t('drawing.filter_subject')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('drawing.all_subjects')}</SelectItem>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* ── Drawing Grid ────────────────────────────────────────── */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-video w-full" />
                <CardContent className="p-4">
                  <Skeleton className="mb-2 h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredDrawings.length === 0 ? (
          <motion.div variants={itemVariants}>
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-4 py-12">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                  <ImageIcon className="h-8 w-8 text-gray-400" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {t('drawing.no_drawings')}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {t('drawing.no_drawings_desc')}
                  </p>
                </div>
                <Button
                  onClick={handleNewDrawing}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t('drawing.new')}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            variants={containerVariants}
          >
            <AnimatePresence>
              {filteredDrawings.map((drawing) => (
                <motion.div
                  key={drawing.id}
                  variants={itemVariants}
                  layout
                  exit={{ opacity: 0, scale: 0.95 }}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="group overflow-hidden transition-shadow hover:shadow-lg">
                    {/* Thumbnail */}
                    <div className="relative aspect-video bg-white">
                      {drawing.imageData ? (
                        <img
                          src={drawing.imageData}
                          alt={drawing.title}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gray-50">
                          <Palette className="h-10 w-10 text-gray-300" />
                        </div>
                      )}
                      {/* Public badge */}
                      {drawing.isPublic && (
                        <Badge className="absolute right-2 top-2 bg-emerald-100 text-emerald-700">
                          <Share2 className="mr-1 h-3 w-3" />
                          {t('drawing.public')}
                        </Badge>
                      )}
                      {/* Hover overlay */}
                      <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                onClick={() => handleEditDrawing(drawing)}
                                className="bg-white text-gray-900 hover:bg-gray-100"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('drawing.edit')}</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                onClick={() => handleTogglePublic(drawing)}
                                className="bg-white text-gray-900 hover:bg-gray-100"
                              >
                                {drawing.isPublic ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {drawing.isPublic ? t('drawing.private') : t('drawing.public_desc')}
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setDeleteTarget(drawing)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('drawing.delete')}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                    {/* Info */}
                    <CardContent className="p-3">
                      <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {drawing.title || t('drawing.untitled')}
                      </h3>
                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>{new Date(drawing.updatedAt).toLocaleDateString()}</span>
                        {drawing.isPublic && (
                          <Badge variant="outline" className="text-[10px]">
                            {t('drawing.public')}
                          </Badge>
                        )}
                      </div>
                      {drawing.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                          {drawing.description}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── Footer eco message ──────────────────────────────────── */}
        <motion.div variants={itemVariants} className="mt-8">
          <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20">
            <CardContent className="flex items-center gap-3 py-3">
              <Leaf className="h-5 w-5 text-emerald-600" />
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                {t('drawing.eco_message')}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* ── Delete Confirmation Dialog ─────────────────────────────── */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('drawing.delete_confirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('drawing.delete_desc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('action.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {t('drawing.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
