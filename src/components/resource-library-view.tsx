'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Library,
  Plus,
  Search,
  FileText,
  ClipboardList,
  Presentation,
  Video,
  Link2,
  Image,
  Headphones,
  Download,
  Eye,
  Star,
  Trash2,
  Edit3,
  X,
  Globe,
  Lock,
  Filter,
  ChevronDown,
  Tag,
  BookOpen,
  RefreshCw,
  AlertCircle,
  FolderOpen,
  Grid3X3,
  List,
  Heart,
  BookMarked,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────
interface ResourceItem {
  id: string;
  schoolId: string;
  authorId: string;
  title: string;
  description: string | null;
  resourceType: string;
  url: string | null;
  content: string | null;
  subjectId: string | null;
  classGroupId: string | null;
  gradeLevel: number | null;
  tags: string | null; // JSON array
  isPublic: boolean;
  downloadCount: number;
  createdAt: string;
  author: { id: string; firstName: string; lastName: string };
  subject: { id: string; name: string } | null;
  classGroup: { id: string; name: string; gradeLevel: number } | null;
}

interface SubjectOption {
  id: string;
  name: string;
}

interface ClassOption {
  id: string;
  name: string;
  gradeLevel: number;
}

type ResourceType = 'document' | 'worksheet' | 'presentation' | 'video_link' | 'image' | 'link' | 'audio';

// Resource categories for tabs
type ResourceCategory = 'all' | 'worksheets' | 'presentations' | 'videos' | 'links' | 'favorites';

const RESOURCE_TYPES: ResourceType[] = ['document', 'worksheet', 'presentation', 'video_link', 'image', 'link', 'audio'];

const CATEGORY_CONFIG: Record<string, { types: ResourceType[]; icon: typeof FileText; color: string }> = {
  worksheets: { types: ['worksheet', 'document'], icon: ClipboardList, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  presentations: { types: ['presentation'], icon: Presentation, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
  videos: { types: ['video_link'], icon: Video, color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' },
  links: { types: ['link'], icon: Link2, color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' },
};

function getTypeIcon(type: string) {
  switch (type) {
    case 'document': return FileText;
    case 'worksheet': return ClipboardList;
    case 'presentation': return Presentation;
    case 'video_link': return Video;
    case 'image': return Image;
    case 'link': return Link2;
    case 'audio': return Headphones;
    default: return FileText;
  }
}

function getTypeColor(type: string): string {
  switch (type) {
    case 'document': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
    case 'worksheet': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
    case 'presentation': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300';
    case 'video_link': return 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300';
    case 'image': return 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300';
    case 'link': return 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300';
    case 'audio': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
    default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300';
  }
}

function getTypeLabel(type: string): string {
  const keyMap: Record<string, string> = {
    document: 'resources.document',
    worksheet: 'resources.worksheet',
    presentation: 'resources.presentation',
    video_link: 'resources.video',
    image: 'resources.image',
    link: 'resources.link',
    audio: 'resources.audio',
  };
  return t(keyMap[type] ?? 'resources.type');
}

// ── Thumbnail placeholder ─────────────────────────────────────────────
function ResourceThumbnail({ type, title }: { type: string; title: string }) {
  const color = getTypeColor(type);
  return (
    <div className={`w-full h-24 rounded-t-lg flex items-center justify-center ${color} relative overflow-hidden`}>
      {React.createElement(getTypeIcon(type), { className: 'h-8 w-8 opacity-60' })}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/20 to-transparent h-8" />
    </div>
  );
}

// ── Loading Skeleton ──────────────────────────────────────────────────
function ResourceGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <Card key={i} className="h-full">
          <Skeleton className="h-24 rounded-t-lg" />
          <CardHeader className="p-4 pb-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <Skeleton className="h-3 w-full mb-2" />
            <Skeleton className="h-3 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Resource Create/Edit Dialog ────────────────────────────────────────
function ResourceDialog({
  open,
  onClose,
  resource,
  subjects,
  classes,
  schoolId,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  resource: ResourceItem | null;
  subjects: SubjectOption[];
  classes: ClassOption[];
  schoolId: string;
  onSave: (data: Record<string, unknown>) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [resourceType, setResourceType] = useState<ResourceType>('document');
  const [url, setUrl] = useState('');
  const [content, setContent] = useState('');
  const [subjectId, setSubjectId] = useState<string>('none');
  const [classGroupId, setClassGroupId] = useState<string>('none');
  const [gradeLevel, setGradeLevel] = useState('');
  const [tags, setTags] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (resource) {
      setTitle(resource.title);
      setDescription(resource.description ?? '');
      setResourceType(resource.resourceType as ResourceType);
      setUrl(resource.url ?? '');
      setContent(resource.content ?? '');
      setSubjectId(resource.subjectId ?? 'none');
      setClassGroupId(resource.classGroupId ?? 'none');
      setGradeLevel(resource.gradeLevel?.toString() ?? '');
      try {
        const parsed = JSON.parse(resource.tags ?? '[]');
        setTags(Array.isArray(parsed) ? parsed.join(', ') : '');
      } catch { setTags(''); }
      setIsPublic(resource.isPublic);
    } else {
      setTitle('');
      setDescription('');
      setResourceType('document');
      setUrl('');
      setContent('');
      setSubjectId('none');
      setClassGroupId('none');
      setGradeLevel('');
      setTags('');
      setIsPublic(true);
    }
  }, [resource, open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const tagList = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const data: Record<string, unknown> = {
        schoolId,
        title,
        description: description || null,
        resourceType,
        url: url || null,
        content: content || null,
        subjectId: subjectId === 'none' ? null : subjectId,
        classGroupId: classGroupId === 'none' ? null : classGroupId,
        gradeLevel: gradeLevel ? parseInt(gradeLevel) : null,
        tags: JSON.stringify(tagList),
        isPublic,
      };
      if (resource) {
        data.id = resource.id;
      }
      onSave(data);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {resource ? t('resources.edit') : t('resources.create')}
          </DialogTitle>
          <DialogDescription>
            {t('resources.create_description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="res-title">{t('resources.title_field')}</Label>
            <Input id="res-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('resources.title_field')} className="min-h-[44px]" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="res-type">{t('resources.type')}</Label>
            <Select value={resourceType} onValueChange={(v) => setResourceType(v as ResourceType)}>
              <SelectTrigger id="res-type" className="min-h-[44px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESOURCE_TYPES.map((rt) => (
                  <SelectItem key={rt} value={rt}>{getTypeLabel(rt)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="res-desc">{t('resources.description_field')}</Label>
            <Textarea id="res-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('resources.description_field')} rows={3} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="res-url">{t('resources.url_field')}</Label>
            <Input id="res-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." className="min-h-[44px]" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="res-content">{t('resources.content_field')}</Label>
            <Textarea id="res-content" value={content} onChange={(e) => setContent(e.target.value)} placeholder={t('resources.content_field')} rows={4} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="res-subject">{t('resources.subject_field')}</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger id="res-subject" className="min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('resources.all_subjects')}</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="res-class">{t('resources.class_field')}</Label>
              <Select value={classGroupId} onValueChange={setClassGroupId}>
                <SelectTrigger id="res-class" className="min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('resources.all_types')}</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="res-grade">{t('resources.grade_field')}</Label>
            <Input id="res-grade" type="number" value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} placeholder="1-12" className="min-h-[44px]" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="res-tags">{t('resources.tags_field')}</Label>
            <Input id="res-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder={t('resources.tags_placeholder')} className="min-h-[44px]" />
          </div>

          <div className="flex items-center gap-3">
            <Label htmlFor="res-public" className="flex items-center gap-2 min-h-[44px]">
              {isPublic ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              {t('resources.toggle_public')}
            </Label>
            <Switch id="res-public" checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
        </div>

        <div className="flex items-center gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose} className="min-h-[44px]">
            {t('action.cancel')}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !title} className="min-h-[44px]">
            {saving ? '...' : t('action.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Preview Dialog ─────────────────────────────────────────────────────
function PreviewDialog({
  open,
  onClose,
  resource,
  isFav,
  onToggleFav,
}: {
  open: boolean;
  onClose: () => void;
  resource: ResourceItem | null;
  isFav: boolean;
  onToggleFav: () => void;
}) {
  if (!resource) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-2">
            <DialogTitle className="flex items-center gap-2">
              {React.createElement(getTypeIcon(resource.resourceType), { className: 'h-5 w-5' })}
              {resource.title}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 min-h-[44px] min-w-[44px]"
              onClick={onToggleFav}
            >
              <Star className={`h-5 w-5 ${isFav ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
            </Button>
          </div>
          <DialogDescription>
            {resource.author.firstName} {resource.author.lastName}
            {resource.subject && ` | ${resource.subject.name}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Thumbnail preview */}
          <ResourceThumbnail type={resource.resourceType} title={resource.title} />

          {resource.description && (
            <p className="text-sm text-muted-foreground">{resource.description}</p>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`text-xs ${getTypeColor(resource.resourceType)}`}>
              {getTypeLabel(resource.resourceType)}
            </Badge>
            {resource.subject && (
              <Badge variant="outline" className="text-xs">{resource.subject.name}</Badge>
            )}
            {resource.classGroup && (
              <Badge variant="outline" className="text-xs">{resource.classGroup.name}</Badge>
            )}
            {resource.isPublic ? (
              <Badge variant="outline" className="gap-1"><Globe className="h-3 w-3" /> {t('resources.public')}</Badge>
            ) : (
              <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" /> {t('resources.private')}</Badge>
            )}
          </div>

          {resource.content && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
              {resource.content}
            </div>
          )}

          {resource.url && (
            <div className="space-y-2">
              <Label>{t('resources.url_field')}</Label>
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline break-all"
              >
                {resource.url}
              </a>
            </div>
          )}

          {resource.tags && (() => {
            try {
              const parsed = JSON.parse(resource.tags);
              if (Array.isArray(parsed) && parsed.length > 0) {
                return (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Tag className="h-3 w-3 text-muted-foreground" />
                    {parsed.map((tag: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                );
              }
            } catch { /* ignore */ }
            return null;
          })()}

          <div className="text-xs text-muted-foreground flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Download className="h-3 w-3" /> {resource.downloadCount} {t('resources.downloads')}
            </span>
            <span>
              {resource.author.firstName} {resource.author.lastName}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main View ──────────────────────────────────────────────────────────
export default function ResourceLibraryView() {
  const currentUser = useAppStore((s) => s.currentUser);
  const locale = useAppStore((s) => s.locale);

  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editResource, setEditResource] = useState<ResourceItem | null>(null);
  const [previewResource, setPreviewResource] = useState<ResourceItem | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<ResourceCategory>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const schoolId = currentUser?.schoolId ?? '';

  // Load favorites from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('ct_resource_favorites');
      if (stored) setFavorites(new Set(JSON.parse(stored)));
    } catch { /* ignore */ }
  }, []);

  // Load subjects
  useEffect(() => {
    if (!schoolId) return;
    apiGet<SubjectOption[]>(`/api/subjects?schoolId=${schoolId}`)
      .then((data) => setSubjects(data))
      .catch(() => {});
  }, [schoolId]);

  // Load classes
  useEffect(() => {
    if (!schoolId) return;
    apiGet<ClassOption[]>(`/api/classes?schoolId=${schoolId}`)
      .then((data) => setClasses(data))
      .catch(() => {});
  }, [schoolId]);

  // Load resources
  const loadResources = useCallback(async () => {
    if (!schoolId) {
      setResources([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ schoolId });
      if (filterType && filterType !== 'all') params.set('resourceType', filterType);
      if (filterSubject && filterSubject !== 'all') params.set('subjectId', filterSubject);
      if (searchQuery) params.set('search', searchQuery);
      const data = await apiGet<ResourceItem[]>(`/api/resources?${params.toString()}`);
      setResources(data);
    } catch (err) {
      setResources([]);
      setError(err instanceof Error ? err.message : t('resources.load_error'));
    }
    setLoading(false);
  }, [schoolId, filterType, filterSubject, searchQuery]);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  // Handlers
  const handleSaveResource = async (data: Record<string, unknown>) => {
    try {
      if (data.id) {
        await apiPut(`/api/resources/${data.id}`, data);
      } else {
        await apiPost('/api/resources', data);
      }
      await loadResources();
      setDialogOpen(false);
      setEditResource(null);
    } catch (err) {
      console.error('Error saving resource:', err);
    }
  };

  const handleDeleteResource = async (id: string) => {
    try {
      await apiDelete(`/api/resources/${id}`);
      await loadResources();
    } catch (err) {
      console.error('Error deleting resource:', err);
    }
  };

  const handleDownload = async (resource: ResourceItem) => {
    try {
      await apiPut(`/api/resources/${resource.id}`, { incrementDownload: true });
      if (resource.url) {
        window.open(resource.url, '_blank');
      }
      await loadResources();
    } catch (err) {
      console.error('Error downloading resource:', err);
    }
  };

  const toggleFavorite = (id: string) => {
    const newFavs = new Set(favorites);
    if (newFavs.has(id)) {
      newFavs.delete(id);
    } else {
      newFavs.add(id);
    }
    setFavorites(newFavs);
    try {
      localStorage.setItem('ct_resource_favorites', JSON.stringify([...newFavs]));
    } catch { /* ignore */ }
  };

  const togglePublic = async (resource: ResourceItem) => {
    try {
      await apiPut(`/api/resources/${resource.id}`, { isPublic: !resource.isPublic });
      await loadResources();
    } catch (err) {
      console.error('Error toggling public:', err);
    }
  };

  // Filter by category
  const categoryFilteredResources = useMemo(() => {
    if (activeCategory === 'all') return resources;
    if (activeCategory === 'favorites') return resources.filter((r) => favorites.has(r.id));
    const config = CATEGORY_CONFIG[activeCategory];
    if (!config) return resources;
    return resources.filter((r) => config.types.includes(r.resourceType as ResourceType));
  }, [resources, activeCategory, favorites]);

  // Sort: favorites first, then by date
  const sortedResources = useMemo(() => {
    return [...categoryFilteredResources].sort((a, b) => {
      const aFav = favorites.has(a.id) ? 1 : 0;
      const bFav = favorites.has(b.id) ? 1 : 0;
      if (bFav !== aFav) return bFav - aFav;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [categoryFilteredResources, favorites]);

  // Category tab counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: resources.length,
      favorites: resources.filter((r) => favorites.has(r.id)).length,
    };
    for (const [key, config] of Object.entries(CATEGORY_CONFIG)) {
      counts[key] = resources.filter((r) => config.types.includes(r.resourceType as ResourceType)).length;
    }
    return counts;
  }, [resources, favorites]);

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Library className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          <h1 className="text-2xl font-bold">{t('resources.library')}</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center border rounded-md overflow-hidden">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              className="min-h-[44px] rounded-none"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              className="min-h-[44px] rounded-none"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          <Button
            className="min-h-[44px]"
            onClick={() => {
              setEditResource(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            {t('resources.create')}
          </Button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {([
          { key: 'all' as ResourceCategory, label: t('resources.category_all'), icon: FolderOpen },
          { key: 'worksheets' as ResourceCategory, label: t('resources.category_worksheets'), icon: ClipboardList },
          { key: 'presentations' as ResourceCategory, label: t('resources.category_presentations'), icon: Presentation },
          { key: 'videos' as ResourceCategory, label: t('resources.category_videos'), icon: Video },
          { key: 'links' as ResourceCategory, label: t('resources.category_links'), icon: Link2 },
          { key: 'favorites' as ResourceCategory, label: t('resources.category_favorites'), icon: Heart },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap min-h-[44px] ${
              activeCategory === key
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-muted-foreground'
            }`}
            onClick={() => setActiveCategory(key)}
          >
            <Icon className="h-4 w-4" />
            {label}
            <span className="text-xs opacity-60">({categoryCounts[key] ?? 0})</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 min-h-[44px]"
            placeholder={t('resources.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px] min-h-[44px]">
            <SelectValue placeholder={t('resources.filter_type')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('resources.all_types')}</SelectItem>
            {RESOURCE_TYPES.map((rt) => (
              <SelectItem key={rt} value={rt}>{getTypeLabel(rt)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterSubject} onValueChange={setFilterSubject}>
          <SelectTrigger className="w-[160px] min-h-[44px]">
            <SelectValue placeholder={t('resources.filter_subject')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('resources.all_subjects')}</SelectItem>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-rose-200 dark:border-rose-800">
          <CardContent className="py-6 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-rose-500" />
            <p className="text-rose-600 dark:text-rose-400 mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={loadResources} className="min-h-[44px]">
              <RefreshCw className="h-4 w-4 mr-1" />
              {t('action.refresh')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Resource Grid / List */}
      {!error && loading && (
        <ResourceGridSkeleton />
      )}
      {!error && !loading && sortedResources.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {activeCategory === 'favorites' ? (
              <>
                <Heart className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium mb-1">{t('resources.no_favorites')}</p>
                <p className="text-sm">{t('resources.no_favorites_hint')}</p>
              </>
            ) : (
              <>
                <Library className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium mb-1">{t('resources.no_resources')}</p>
                <p className="text-sm">{t('resources.no_resources_hint')}</p>
              </>
            )}
          </CardContent>
        </Card>
      )}
      {!error && !loading && sortedResources.length > 0 && viewMode === 'grid' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          <AnimatePresence>
            {sortedResources.map((resource) => {
              const TypeIcon = getTypeIcon(resource.resourceType);
              const isFav = favorites.has(resource.id);

              return (
                <motion.div
                  key={resource.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="h-full flex flex-col hover:shadow-md transition-shadow overflow-hidden">
                    {/* Thumbnail */}
                    <ResourceThumbnail type={resource.resourceType} title={resource.title} />

                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <CardTitle className="text-sm font-semibold truncate" title={resource.title}>
                            {resource.title}
                          </CardTitle>
                        </div>
                        <button
                          className="shrink-0 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(resource.id); }}
                          aria-label={t('resources.favorite')}
                        >
                          <Star className={`h-4 w-4 ${isFav ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
                        </button>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 pt-0 flex-1">
                      {resource.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {resource.description}
                        </p>
                      )}

                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`text-xs ${getTypeColor(resource.resourceType)}`}>
                          {getTypeLabel(resource.resourceType)}
                        </Badge>
                        {resource.subject && (
                          <Badge variant="outline" className="text-xs">{resource.subject.name}</Badge>
                        )}
                      </div>

                      {resource.tags && (() => {
                        try {
                          const parsed = JSON.parse(resource.tags);
                          if (Array.isArray(parsed) && parsed.length > 0) {
                            return (
                              <div className="flex items-center gap-1 mt-2 flex-wrap">
                                {parsed.slice(0, 3).map((tag: string, i: number) => (
                                  <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                                ))}
                                {parsed.length > 3 && (
                                  <span className="text-xs text-muted-foreground">+{parsed.length - 3}</span>
                                )}
                              </div>
                            );
                          }
                        } catch { /* ignore */ }
                        return null;
                      })()}
                    </CardContent>

                    <CardFooter className="p-4 pt-0 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Download className="h-3 w-3" />
                        {resource.downloadCount}
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 min-h-[44px] min-w-[44px]"
                          onClick={() => { setPreviewResource(resource); setPreviewOpen(true); }}
                          title={t('resources.preview')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        {resource.url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 min-h-[44px] min-w-[44px]"
                            onClick={() => handleDownload(resource)}
                            title={t('resources.download')}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 min-h-[44px] min-w-[44px]"
                          onClick={() => togglePublic(resource)}
                          title={t('resources.toggle_public')}
                        >
                          {resource.isPublic ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                        </Button>

                        {currentUser?.id === resource.authorId && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 min-h-[44px] min-w-[44px]"
                              onClick={() => { setEditResource(resource); setDialogOpen(true); }}
                              title={t('action.edit')}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 min-h-[44px] min-w-[44px] text-destructive"
                              onClick={() => handleDeleteResource(resource.id)}
                              title={t('action.delete')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </CardFooter>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
      {!error && !loading && sortedResources.length > 0 && viewMode === 'list' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="space-y-2"
        >
          <AnimatePresence>
            {sortedResources.map((resource) => {
              const TypeIcon = getTypeIcon(resource.resourceType);
              const isFav = favorites.has(resource.id);

              return (
                <motion.div
                  key={resource.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${getTypeColor(resource.resourceType)} shrink-0`}>
                          <TypeIcon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{resource.title}</span>
                            {resource.subject && (
                              <Badge variant="outline" className="text-xs shrink-0">{resource.subject.name}</Badge>
                            )}
                            {resource.isPublic ? (
                              <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
                            ) : (
                              <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                            )}
                          </div>
                          {resource.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{resource.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-0.5"><Download className="h-3 w-3" /> {resource.downloadCount}</span>
                            <span>{resource.author.firstName} {resource.author.lastName}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
                            onClick={() => toggleFavorite(resource.id)}
                            aria-label={t('resources.favorite')}
                          >
                            <Star className={`h-4 w-4 ${isFav ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
                          </button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 min-h-[44px] min-w-[44px]"
                            onClick={() => { setPreviewResource(resource); setPreviewOpen(true); }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {currentUser?.id === resource.authorId && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 min-h-[44px] min-w-[44px] text-destructive"
                              onClick={() => handleDeleteResource(resource.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Resource Create/Edit Dialog */}
      <ResourceDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditResource(null); }}
        resource={editResource}
        subjects={subjects}
        classes={classes}
        schoolId={schoolId}
        onSave={handleSaveResource}
      />

      {/* Preview Dialog */}
      <PreviewDialog
        open={previewOpen}
        onClose={() => { setPreviewOpen(false); setPreviewResource(null); }}
        resource={previewResource}
        isFav={previewResource ? favorites.has(previewResource.id) : false}
        onToggleFav={() => previewResource && toggleFavorite(previewResource.id)}
      />
    </div>
  );
}
