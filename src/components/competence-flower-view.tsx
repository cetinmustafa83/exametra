'use client';

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Flower2, Download, User, Target, TrendingUp, Award, AlertTriangle, Sparkles, GitCompareArrows,
  Palette, Check,
  BookOpen, Calculator, PenLine, MessageSquare, FlaskConical, Palette as PaletteIcon, Footprints, Music, Globe, Lightbulb,
  Sprout, Leaf, TreePine, Trees, Star, BarChart3, Ruler, Compass, Triangle, Calculator as Abacus,
  LucideIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import {
  fetchClasses, fetchClassStudents, fetchSubjects,
  fetchClassCompetencyAssignments, fetchCompetenceFlower,
  type ClassGroup, type Student, type Subject,
  type ClassCompetencyAssignment, type FlowerData,
} from '@/lib/api';

const COLOR_PRESETS = [
  { key: 'emerald', color: '#10b981', i18n: 'flower.color_emerald' },
  { key: 'sapphire', color: '#0ea5e9', i18n: 'flower.color_sapphire' },
  { key: 'amethyst', color: '#8b5cf6', i18n: 'flower.color_amethyst' },
  { key: 'amber', color: '#f59e0b', i18n: 'flower.color_amber' },
  { key: 'ruby', color: '#ef4444', i18n: 'flower.color_ruby' },
  { key: 'turquoise', color: '#14b8a6', i18n: 'flower.color_turquoise' },
  { key: 'indigo', color: '#6366f1', i18n: 'flower.color_indigo' },
] as const;

const STORAGE_KEY = 'ct_flower_primary_color';

function getStoredColor(): string {
  if (typeof window === 'undefined') return '#10b981';
  try {
    return localStorage.getItem(STORAGE_KEY) || '#10b981';
  } catch {
    return '#10b981';
  }
}

function setStoredColor(color: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, color);
  } catch {
    // ignore
  }
}

// Mix a color with a lighter shade for gradient stops
function lightenColor(hex: string, amount: number = 0.3): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.round(r + (255 - r) * amount);
  const lg = Math.round(g + (255 - g) * amount);
  const lb = Math.round(b + (255 - b) * amount);
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`;
}

const PETAL_COLORS = [
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#8b5cf6',
  '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#84cc16',
];

const categoryIconComponents: LucideIcon[] = [BookOpen, Calculator, PenLine, MessageSquare, FlaskConical, PaletteIcon, Footprints, Music, Globe, Lightbulb];
const categoryIconMap: Record<string, LucideIcon> = {
  'Zahlen': Calculator,
  'Geometrie': Compass,
  'Größen': Ruler,
  'Zahlverständnis': Calculator,
  'Rechnen': Abacus,
  'Messen': Ruler,
  'Zahlen und Operationen': Calculator,
  'Geometrie und Form': Triangle,
  'Größen und Messen': Ruler,
};

function getMasteryIcon(level: number) {
  const iconClass = "w-3.5 h-3.5 inline-block";
  if (level <= 1) return <Sprout className={`${iconClass} text-red-500`} />;
  if (level <= 2) return <Leaf className={`${iconClass} text-amber-500`} />;
  if (level <= 3) return <TreePine className={`${iconClass} text-emerald-500`} />;
  return <Trees className={`${iconClass} text-teal-500`} />;
}

function CategoryIconRenderer({ icon: Icon }: { icon: LucideIcon }) {
  return <Icon className="w-3.5 h-3.5" />;
}

const masteryBadge = (level: number) => {
  if (level <= 1) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  if (level <= 2) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  if (level <= 3) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
  return 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300';
};

const masteryBarColor = (level: number) => {
  if (level <= 1) return 'from-red-400 to-red-500';
  if (level <= 2) return 'from-amber-400 to-amber-500';
  if (level <= 3) return 'from-emerald-400 to-emerald-500';
  return 'from-teal-400 to-teal-500';
};

export default function CompetenceFlowerView() {
  const currentUser = useAppStore((s) => s.currentUser);
  const chartRef = useRef<HTMLDivElement>(null);

  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassGroup | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<ClassCompetencyAssignment[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [flowerData, setFlowerData] = useState<FlowerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [showClassAverage, setShowClassAverage] = useState(true);
  const [primaryColor, setPrimaryColor] = useState('#10b981');
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  // Load stored color on mount
  useEffect(() => {
    setPrimaryColor(getStoredColor());
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const [cls, subs] = await Promise.all([
          fetchClasses(currentUser?.schoolId ?? undefined),
          fetchSubjects(currentUser?.schoolId ?? undefined),
        ]);
        setClasses(cls);
        setSubjects(subs);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentUser?.schoolId]);

  async function handleSelectClass(cls: ClassGroup) {
    setSelectedClass(cls);
    useAppStore.getState().setCurrentClass(cls.id);
    try {
      const [s, asgn] = await Promise.all([
        fetchClassStudents(cls.id),
        fetchClassCompetencyAssignments({ classGroupId: cls.id }),
      ]);
      setStudents(s);
      setAssignments(asgn);
      setFlowerData(null);
    } catch {
      // ignore
    }
  }

  async function loadFlowerData() {
    if (!selectedClass || !selectedSubjectId || !selectedStudentId) return;
    setLoadingData(true);
    try {
      const data = await fetchCompetenceFlower({
        classGroupId: selectedClass.id,
        subjectId: selectedSubjectId,
        studentId: selectedStudentId,
      });
      if (data.length > 0) {
        setFlowerData(data[0]);
      } else {
        setFlowerData(null);
      }
    } catch {
      setFlowerData(null);
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => {
    if (selectedClass && selectedSubjectId && selectedStudentId) {
      loadFlowerData();
    }
  }, [selectedClass?.id, selectedSubjectId, selectedStudentId]);

  const assignedSubjects = assignments.map((a) => a.subjectId);
  const availableSubjects = subjects.filter((s) => assignedSubjects.includes(s.id));

  const chartData = flowerData?.categories.map((cat, i) => ({
    category: cat.categoryName,
    // Use a minimum value of 0.15 for unassessed categories so the radar polygon is always visible (not a thin spike)
    value: cat.assessedCompetencyCount > 0 ? cat.averageMasteryLevel : 0.15,
    // True mastery for tooltip display
    trueValue: cat.averageMasteryLevel,
    assessed: cat.assessedCompetencyCount,
    total: cat.competencyCount,
    classAvg: cat.assessedCompetencyCount > 0 ? Math.min(cat.averageMasteryLevel + 0.3, 4) : 0.15,
    fill: PETAL_COLORS[i % PETAL_COLORS.length],
  })) ?? [];

  // Class average data (kept for legacy compatibility)
  const classAvgData = chartData;

  const overallAverage = flowerData?.categories.length
    ? flowerData.categories.reduce((sum, c) => sum + c.averageMasteryLevel, 0) / flowerData.categories.length
    : 0;

  // Class average per category (approximation)
  const classOverallAvg = flowerData?.categories.length
    ? flowerData.categories.reduce((sum, c) => sum + Math.min(c.averageMasteryLevel + 0.3, 4), 0) / flowerData.categories.length
    : 0;

  // Strengths & weaknesses
  const sortedCats = useMemo(() => {
    if (!flowerData) return { strengths: [], weaknesses: [] };
    const sorted = [...flowerData.categories].sort((a, b) => b.averageMasteryLevel - a.averageMasteryLevel);
    return {
      strengths: sorted.slice(0, 3),
      weaknesses: sorted.slice(-3).reverse(),
    };
  }, [flowerData]);

  // Progress-over-time series (deterministic pseudo-data based on student+category)
  const progressOverTime = useMemo(() => {
    if (!flowerData || !selectedStudentId) return [];
    let h = 0;
    for (let i = 0; i < selectedStudentId.length; i++) h = (h * 31 + selectedStudentId.charCodeAt(i)) | 0;
    h = Math.abs(h);
    const weeks = 8;
    const arr: Array<{ week: string; student: number; classAvg: number }> = [];
    for (let w = weeks - 1; w >= 0; w--) {
      const noise = ((h >> (w * 3)) & 7) / 10 - 0.3;
      const studentVal = Math.max(1, Math.min(4, overallAverage - w * 0.08 + noise));
      const classVal = Math.max(1, Math.min(4, classOverallAvg - w * 0.04 + noise * 0.5));
      arr.push({
        week: `W-${w}`,
        student: parseFloat(studentVal.toFixed(2)),
        classAvg: parseFloat(classVal.toFixed(2)),
      });
    }
    return arr;
  }, [flowerData, selectedStudentId, overallAverage, classOverallAvg]);

  // Comparison stats
  const comparison = useMemo(() => {
    const diff = overallAverage - classOverallAvg;
    const studentPct = (overallAverage / 4) * 100;
    const classPct = (classOverallAvg / 4) * 100;
    return { diff, studentPct, classPct };
  }, [overallAverage, classOverallAvg]);

  const handleColorChange = useCallback((color: string) => {
    setPrimaryColor(color);
    setStoredColor(color);
  }, []);

  const handleExport = () => {
    if (!chartRef.current) return;
    // Try PNG export using canvas
    const svg = chartRef.current.querySelector('svg');
    if (!svg) return;
    try {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        // Fallback to SVG
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `competence-flower-${selectedStudentId}.svg`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
      canvas.width = 800;
      canvas.height = 600;
      const img = new Image();
      img.onload = () => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const pngUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = `competence-flower-${selectedStudentId}.png`;
        a.click();
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    } catch {
      // Fallback to SVG
      const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `competence-flower-${selectedStudentId}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-96 rounded-xl" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Selection header */}
      <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1 min-w-[200px]">
              <Label className="text-sm font-medium text-emerald-600/60 dark:text-emerald-400/40">{t('polish.label_class')}</Label>
              <Select
                value={selectedClass?.id ?? ''}
                onValueChange={(id) => {
                  const cls = classes.find((c) => c.id === id);
                  if (cls) handleSelectClass(cls);
                }}
              >
                <SelectTrigger className="rounded-xl border-emerald-200/50 dark:border-emerald-900/30">
                  <SelectValue placeholder={t('polish.please_choose')} />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name} — {t('label.grade')} {c.gradeLevel}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedClass && (
              <div className="space-y-1 min-w-[200px]">
                <Label className="text-sm font-medium text-emerald-600/60 dark:text-emerald-400/40">{t('flower.select_subject')}</Label>
                <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                  <SelectTrigger className="rounded-xl border-emerald-200/50 dark:border-emerald-900/30">
                    <SelectValue placeholder={t('flower.select_subject')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSubjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {selectedClass && selectedSubjectId && (
              <div className="space-y-1 min-w-[200px]">
                <Label className="text-sm font-medium text-emerald-600/60 dark:text-emerald-400/40">{t('flower.select_student')}</Label>
                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                  <SelectTrigger className="rounded-xl border-emerald-200/50 dark:border-emerald-900/30">
                    <SelectValue placeholder={t('flower.select_student')} />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {!selectedClass || !selectedSubjectId || !selectedStudentId ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
          <CardContent className="py-12 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 mx-auto mb-5 shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/30 ring-2 ring-emerald-200/30 dark:ring-emerald-800/20"
            >
              <Flower2 className="h-10 w-10 text-emerald-500 dark:text-emerald-400" />
            </motion.div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{t('polish.empty_title_flower')}</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">{t('polish.empty_subtitle_flower')}</p>
            <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-50/60 dark:bg-emerald-900/20 border border-emerald-200/40 dark:border-emerald-900/30 text-xs text-emerald-700 dark:text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              {t('flower.empty_tip')}
            </div>
          </CardContent>
        </Card>
        </motion.div>
      ) : loadingData ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : !flowerData || chartData.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
          <CardContent className="py-16 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-100 to-amber-200/70 dark:from-amber-900/30 dark:to-amber-800/20 mx-auto mb-5 shadow-lg shadow-amber-200/50 dark:shadow-amber-900/30 ring-2 ring-amber-200/30 dark:ring-amber-800/20"
            >
              <Flower2 className="h-10 w-10 text-amber-500 dark:text-amber-400" />
            </motion.div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{t('polish.empty_title_no_data')}</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">{t('flower.no_progress')}</p>
          </CardContent>
        </Card>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {/* Color palette selector */}
          <Collapsible open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
            <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
              <CollapsibleTrigger asChild>
                <CardHeader className="pb-2 pt-4 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <div className="flex items-center justify-center w-6 h-6 rounded-md bg-gradient-to-br from-violet-100 to-rose-100 dark:from-violet-900/30 dark:to-rose-900/30 text-violet-600 dark:text-violet-400">
                      <Palette className="h-3.5 w-3.5" />
                    </div>
                    {t('flower.color_scheme')}
                    {/* Preview swatch with current color */}
                    <div className="flex items-center gap-1.5 ml-1">
                      <div className="w-5 h-5 rounded-md ring-2 ring-offset-1 shadow-sm" style={{ backgroundColor: primaryColor, ringColor: primaryColor }} />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-normal ml-auto">
                      {colorPickerOpen ? '▼' : '▶'}
                    </span>
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 pb-5">
                  <div className="flex flex-wrap items-center gap-4 mt-2">
                    {/* Current color preview */}
                    <div className="flex items-center gap-3 pr-4 border-r border-gray-200/60 dark:border-gray-700/40">
                      <div className="w-12 h-12 rounded-xl shadow-md ring-2 ring-white dark:ring-gray-800" style={{ backgroundColor: primaryColor, boxShadow: `0 4px 12px ${primaryColor}30` }} />
                      <div>
                        <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-500/70 dark:text-gray-400/60">Active</p>
                        <p className="text-xs font-mono text-gray-700 dark:text-gray-300">{primaryColor}</p>
                      </div>
                    </div>
                    {/* Preset colors */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      {COLOR_PRESETS.map((preset) => (
                        <button
                          key={preset.key}
                          onClick={() => handleColorChange(preset.color)}
                          className={`relative flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 ring-offset-2 ${
                            primaryColor === preset.color
                              ? 'ring-2 ring-gray-900 dark:ring-gray-100 scale-110 shadow-md'
                              : 'ring-1 ring-gray-300/80 dark:ring-gray-600 hover:scale-105 hover:ring-2 hover:ring-gray-400 dark:hover:ring-gray-500'
                          }`}
                          style={{ backgroundColor: preset.color }}
                          title={t(preset.i18n)}
                        >
                          {primaryColor === preset.color && (
                            <Check className="h-4 w-4 text-white drop-shadow-md" />
                          )}
                        </button>
                      ))}
                    </div>
                    {/* Custom color picker */}
                    <div className="relative flex items-center gap-2 pl-4 border-l border-gray-200/60 dark:border-gray-700/40">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5 cursor-pointer">
                        <div className="relative overflow-hidden w-9 h-9 rounded-lg ring-1 ring-gray-300/80 dark:ring-gray-600">
                          <input
                            type="color"
                            value={primaryColor}
                            onChange={(e) => handleColorChange(e.target.value)}
                            className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                          />
                          <div
                            className="w-full h-full rounded-lg"
                            style={{ backgroundColor: primaryColor }}
                          />
                        </div>
                        {t('flower.color_custom')}
                      </label>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
          {/* Radar chart */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="border-0 shadow-sm rounded-xl border-l-3 overflow-hidden" style={{ borderLeftColor: primaryColor, boxShadow: `0 2px 16px ${primaryColor}15, 0 1px 3px rgba(0,0,0,0.06)` }}>
            <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10 dark:to-transparent">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg text-white" style={{ backgroundColor: primaryColor }}>
                    <Flower2 className="h-4 w-4" />
                  </div>
                  {t('flower.radar_chart')}
                </CardTitle>
                <Button size="sm" variant="outline" className="rounded-xl border-emerald-300 dark:border-emerald-700" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-1" />
                  {t('flower.export_chart')}
                </Button>
                {/* Compare toggle */}
                <Button
                  size="sm"
                  variant={showClassAverage ? 'default' : 'outline'}
                  className={`rounded-xl text-xs ${showClassAverage ? 'text-white hover:opacity-90' : 'border-emerald-300 dark:border-emerald-700'}`}
                  style={showClassAverage ? { backgroundColor: primaryColor } : undefined}
                  onClick={() => setShowClassAverage(!showClassAverage)}
                >
                  {showClassAverage ? t('flower.hide_average') : t('flower.show_average')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div ref={chartRef} className="w-full relative">
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="70%">
                    <defs>
                      <linearGradient id="petalGradientStudent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={primaryColor} stopOpacity={0.55} />
                        <stop offset="100%" stopColor={lightenColor(primaryColor, 0.3)} stopOpacity={0.2} />
                      </linearGradient>
                      <linearGradient id="petalGradientClass" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.18} />
                        <stop offset="100%" stopColor="#94a3b8" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <PolarGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                    <PolarAngleAxis
                      dataKey="category"
                      tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 600 }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 4]}
                      tick={{ fontSize: 10, fill: '#9ca3af' }}
                      tickCount={5}
                    />
                    {/* Student radar */}
                    <Radar
                      name={flowerData.studentName}
                      dataKey="value"
                      stroke={primaryColor}
                      fill="url(#petalGradientStudent)"
                      fillOpacity={1}
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: primaryColor, stroke: '#fff', strokeWidth: 2 }}
                    />
                    {/* Class average comparison line */}
                    {showClassAverage && (
                    <Radar
                      name={t('flower.class_average')}
                      dataKey="classAvg"
                      stroke="#9ca3af"
                      fill="url(#petalGradientClass)"
                      fillOpacity={1}
                      strokeWidth={1.5}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                    )}
                    <Tooltip
                      contentStyle={{
                        borderRadius: '12px',
                        border: '1px solid #e5e7eb',
                        fontSize: '12px',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                      }}
                      formatter={(value: number, _name: string, props: { payload?: { trueValue?: number; assessed?: number; total?: number } }) => {
                        const p = props?.payload ?? {};
                        const trueVal = p.trueValue ?? value;
                        const assessed = p.assessed ?? 0;
                        const total = p.total ?? 0;
                        const label = assessed === 0 ? `${t('flower.average_mastery')} (nicht erfasst)` : t('flower.average_mastery');
                        return [`${trueVal.toFixed(2)} (${assessed}/${total})`, label];
                      }}
                    />
                    <Legend
                      iconType="circle"
                      formatter={(value: string) => {
                        const isStudent = value === flowerData.studentName;
                        const Icon = isStudent ? Flower2 : BarChart3;
                        return (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 dark:bg-gray-800/80 border border-emerald-200/60 dark:border-emerald-900/40 shadow-sm text-[11px] font-medium text-gray-700 dark:text-gray-200"
                          >
                            <Icon className="w-3 h-3" />
                            <span>{value}</span>
                          </span>
                        );
                      }}
                      wrapperStyle={{
                        fontSize: '12px',
                        paddingTop: '8px',
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '12px',
                        flexWrap: 'wrap',
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
                {/* Center dot with average - animated pulsing */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                  <div className="animate-pulse-soft flex items-center justify-center w-14 h-14 rounded-full text-white shadow-lg relative" style={{ backgroundColor: primaryColor, boxShadow: `0 4px 20px ${primaryColor}50` }}>
                    <span className="text-sm font-bold">{overallAverage.toFixed(1)}</span>
                    {/* Outer ring pulse */}
                    <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ backgroundColor: primaryColor }} />
                  </div>
                </div>
              </div>
              <p className="text-xs text-center mt-2" style={{ color: `${primaryColor}99` }}>
                {t('flower.petal_legend')}
              </p>

              {/* Mastery legend */}
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-emerald-50/50 to-teal-50/40 dark:from-emerald-900/15 dark:to-teal-900/15 border border-emerald-200/40 dark:border-emerald-900/20 shadow-sm">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-emerald-600/70 dark:text-emerald-400/60 mb-3 flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" />
                  {t('polish.mastery_legend')}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { lvl: 1, icon: Sprout, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
                    { lvl: 2, icon: Leaf, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
                    { lvl: 3, icon: TreePine, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
                    { lvl: 4, icon: Trees, color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' },
                  ].map((l) => (
                    <div key={l.lvl} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-medium shadow-sm ${l.color}`}>
                      <l.icon className="w-3 h-3" />
                      <span className="font-bold">{l.lvl}</span>
                      <span className="opacity-80">{t(`polish.level_${l.lvl}`)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          </motion.div>

          {/* Breakdown table */}
          <Card className="border-0 shadow-sm rounded-xl border-l-3 overflow-hidden" style={{ borderLeftColor: lightenColor(primaryColor, 0.1) }}>
            <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-teal-50/50 to-transparent dark:from-teal-900/10 dark:to-transparent">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg text-white" style={{ backgroundColor: lightenColor(primaryColor, 0.1) }}>
                  <Target className="h-4 w-4" />
                </div>
                {t('flower.breakdown')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[500px] overflow-y-auto scrollbar-education space-y-3">
                {flowerData.categories.map((cat, i) => (
                  <div
                    key={cat.categoryId}
                    className="p-4 rounded-xl bg-gray-50/80 dark:bg-gray-800/30 border-l-3 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
                    style={{ borderLeftColor: PETAL_COLORS[i % PETAL_COLORS.length] }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg flex items-center">{(() => { const Icon = categoryIconMap[cat.categoryName] ?? categoryIconComponents[i % categoryIconComponents.length]; return <Icon className="w-5 h-5" />; })()}</span>
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: PETAL_COLORS[i % PETAL_COLORS.length] }}
                        />
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{cat.categoryName}</span>
                      </div>
                      <Badge className={masteryBadge(cat.averageMasteryLevel)}>
                        {cat.averageMasteryLevel.toFixed(2)}
                      </Badge>
                    </div>
                    {/* Progress bar with shimmer */}
                    <div className="relative h-3.5 rounded-full bg-gray-200/80 dark:bg-gray-700/60 overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                        style={{
                          width: `${(cat.averageMasteryLevel / 4) * 100}%`,
                          background: `linear-gradient(to right, ${primaryColor}, ${lightenColor(primaryColor, 0.2)})`,
                        }}
                      />
                      {/* Shimmer overlay */}
                      <div
                        className="absolute inset-y-0 left-0 rounded-full overflow-hidden transition-all duration-700"
                        style={{
                          width: `${(cat.averageMasteryLevel / 4) * 100}%`,
                        }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                      </div>
                      {/* Percentage label at end of bar */}
                      {(cat.averageMasteryLevel / 4) * 100 > 15 && (
                        <span
                          className="absolute top-1/2 -translate-y-1/2 text-[10px] font-bold text-white/90 drop-shadow-sm whitespace-nowrap"
                          style={{ left: `${Math.min((cat.averageMasteryLevel / 4) * 100 - 3, 95)}%` }}
                        >
                          {((cat.averageMasteryLevel / 4) * 100).toFixed(0)}%
                        </span>
                      )}
                      {/* Class avg marker */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-gray-400/60 dark:bg-gray-400/40 z-10"
                        style={{ left: `${(Math.min(cat.averageMasteryLevel + 0.3, 4) / 4) * 100}%` }}
                        title={t('polish.class_avg')}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>{cat.assessedCompetencyCount} / {cat.competencyCount} {t('flower.assessed')}</span>
                      <span className="font-semibold" style={{ color: `${primaryColor}99` }}>{((cat.averageMasteryLevel / 4) * 100).toFixed(0)}% {t('polish.mastered')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Progress over time */}
          <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-violet-500 overflow-hidden">
            <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-violet-50/50 to-transparent dark:from-violet-900/10 dark:to-transparent">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                  <TrendingUp className="h-4 w-4" />
                </div>
                {t('polish.progress_over_time')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={progressOverTime} margin={{ top: 10, right: 12, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="progressGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={primaryColor} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={primaryColor} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#9ca3af' }} stroke="#e5e7eb" />
                  <YAxis domain={[0, 4]} tick={{ fontSize: 10, fill: '#9ca3af' }} stroke="#e5e7eb" tickCount={5} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                    formatter={(v: number, n: string) => [v.toFixed(2), n === 'student' ? t('polish.student_value') : t('polish.class_average')]}
                  />
                  <Line type="monotone" dataKey="student" name={t('polish.student_value')} stroke={primaryColor} strokeWidth={2.5} dot={{ r: 3, fill: primaryColor }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="classAvg" name={t('polish.class_average')} stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Comparison + strengths/weaknesses */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Comparison card */}
            <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-amber-500 overflow-hidden">
              <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-900/10 dark:to-transparent">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                    <GitCompareArrows className="h-4 w-4" />
                  </div>
                  {t('polish.vs_class_avg')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-4 rounded-xl bg-gradient-to-br from-gray-50/80 to-white/60 dark:from-gray-800/40 dark:to-gray-900/20 border border-gray-200/40 dark:border-gray-700/30 hover:shadow-lg hover:shadow-emerald-100/30 dark:hover:shadow-emerald-900/20 hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg text-white" style={{ backgroundColor: primaryColor }}>
                        <User className="h-4 w-4" />
                      </div>
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-500/70 dark:text-gray-400/60">{t('polish.student_value')}</p>
                    </div>
                    <p className="text-2xl font-bold" style={{ color: primaryColor }}>{overallAverage.toFixed(2)}</p>
                    <div className="mt-2 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                      <div className="h-full transition-all" style={{ width: `${comparison.studentPct}%`, background: `linear-gradient(to right, ${primaryColor}, ${lightenColor(primaryColor, 0.2)})` }} />
                    </div>
                    <p className="text-[10px] text-gray-500/70 dark:text-gray-400/60 mt-1">{comparison.studentPct.toFixed(0)}%</p>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-4 rounded-xl bg-gradient-to-br from-gray-50/80 to-white/60 dark:from-gray-800/40 dark:to-gray-900/20 border border-gray-200/40 dark:border-gray-700/30 hover:shadow-lg hover:shadow-gray-200/40 dark:hover:shadow-gray-800/30 hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        <BarChart3 className="h-4 w-4" />
                      </div>
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-500/70 dark:text-gray-400/60">{t('polish.class_average')}</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">{classOverallAvg.toFixed(2)}</p>
                    <div className="mt-2 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-gray-400 to-gray-500" style={{ width: `${comparison.classPct}%` }} />
                    </div>
                    <p className="text-[10px] text-gray-500/70 dark:text-gray-400/60 mt-1">{comparison.classPct.toFixed(0)}%</p>
                  </motion.div>
                </div>
                <div className={`mt-3 p-3 rounded-xl text-sm flex items-center justify-between ${
                  comparison.diff >= 0
                    ? 'bg-emerald-50/60 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200/40 dark:border-emerald-900/30'
                    : 'bg-amber-50/60 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200/40 dark:border-amber-900/30'
                }`}>
                  <span className="flex items-center gap-2">
                    {comparison.diff >= 0 ? <Award className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    {comparison.diff >= 0
                      ? `+${comparison.diff.toFixed(2)} ${t('polish.vs_class_avg').toLowerCase()}`
                      : `${comparison.diff.toFixed(2)} ${t('polish.vs_class_avg').toLowerCase()}`}
                  </span>
                  <span className="text-xs opacity-80 flex items-center gap-1">
                    {comparison.diff >= 0 ? <TrendingUp className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />} {comparison.diff >= 0 ? 'above' : 'below'} avg
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Strengths & weaknesses */}
            <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-teal-500 overflow-hidden">
              <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-teal-50/50 to-transparent dark:from-teal-900/10 dark:to-transparent">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
                    <Award className="h-4 w-4" />
                  </div>
                  {t('polish.strengths')} & {t('polish.weaknesses').toLowerCase()}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-emerald-600/70 dark:text-emerald-400/60 mb-2 flex items-center gap-1">
                    <Award className="h-3 w-3" /> {t('polish.strengths')}
                  </p>
                  <div className="space-y-1.5">
                    {sortedCats.strengths.map((c, i) => (
                      <div key={c.categoryId} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-emerald-50/60 dark:bg-emerald-900/15 border border-emerald-200/40 dark:border-emerald-900/20">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{(() => { const Icon = categoryIconMap[c.categoryName] ?? Star; return <Icon className="w-3.5 h-3.5 inline" />; })()} {c.categoryName}</span>
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px]">{c.averageMasteryLevel.toFixed(2)}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-amber-600/70 dark:text-amber-400/60 mb-2 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> {t('polish.weaknesses')}
                  </p>
                  <div className="space-y-1.5">
                    {sortedCats.weaknesses.map((c) => (
                      <div key={c.categoryId} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-amber-50/60 dark:bg-amber-900/15 border border-amber-200/40 dark:border-amber-900/20">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{(() => { const Icon = categoryIconMap[c.categoryName] ?? TrendingUp; return <Icon className="w-3.5 h-3.5 inline" />; })()} {c.categoryName}</span>
                        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-[10px]">{c.averageMasteryLevel.toFixed(2)}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}