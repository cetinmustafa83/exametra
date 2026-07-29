'use client';

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Pen, Highlighter, Eraser, Type, Stamp, X,
  AlertTriangle, Undo2, Redo2, ZoomIn, ZoomOut, ChevronLeft,
  ChevronRight, Save, RotateCcw, Sparkles, CheckCircle2, XCircle,
  Loader2, Search, Users,
  Minus, Plus,
  Hand, Eye, Clock, Shield,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { apiGet, apiPost, apiDelete, fetchClasses, fetchClassStudents, fetchAssessments, type ClassGroup, type Student, type Assessment } from '@/lib/api';
import { toast } from 'sonner';

/* ── Types ─────────────────────────────────────────────────────────── */

type ToolType = 'pen' | 'highlighter' | 'eraser' | 'text' | 'stamp' | 'move' | 'hand';
type StampType = '✓' | '✗' | '?' | '!';
type FilterType = 'all' | 'submitted' | 'graded' | 'pending';

interface AnnotationPoint {
  x: number;
  y: number;
  pressure?: number;
}

interface AnnotationStroke {
  id: string;
  tool: ToolType;
  color: string;
  width: number;
  points: AnnotationPoint[];
  stamp?: StampType;
  text?: string;
  page: number;
}

interface GradingAnnotationDB {
  id: string;
  schoolId: string;
  assessmentId: string;
  studentId: string;
  resultId: string | null;
  teacherId: string;
  type: string;
  content: string | null;
  positionX: number;
  positionY: number;
  width: number | null;
  height: number | null;
  color: string;
  strokeWidth: number;
  page: number;
  pathData: string | null;
  createdAt: string;
  updatedAt: string;
  teacher: { id: string; firstName: string; lastName: string };
}

interface AIReviewResult {
  id: string;
  status: string;
  reviewResult: string;
  discrepanciesFound: number;
  createdAt: string;
  teacher: { id: string; firstName: string; lastName: string };
  comments: Array<{
    id: string;
    comment: string;
    suggestedGrade: string | null;
    reason: string | null;
    user: { id: string; firstName: string; lastName: string };
  }>;
}

interface StudentSubmission {
  student: Student;
  status: 'submitted' | 'graded' | 'pending';
  score: number | null;
  grade: string | null;
  note: string | null;
}

/* ── Helpers ───────────────────────────────────────────────────────── */

const gradeColor = (value: number) => {
  if (value <= 1.5) return { bg: 'bg-emerald-500', text: 'text-white', ring: 'ring-emerald-300', label: '1' };
  if (value <= 2.5) return { bg: 'bg-teal-500', text: 'text-white', ring: 'ring-teal-300', label: '2' };
  if (value <= 3.5) return { bg: 'bg-amber-500', text: 'text-white', ring: 'ring-amber-300', label: '3' };
  if (value <= 4.5) return { bg: 'bg-orange-500', text: 'text-white', ring: 'ring-orange-300', label: '4' };
  if (value <= 5.5) return { bg: 'bg-rose-500', text: 'text-white', ring: 'ring-rose-300', label: '5' };
  return { bg: 'bg-red-600', text: 'text-white', ring: 'ring-red-300', label: '6' };
};

const statusColors = {
  submitted: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' },
  graded: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  pending: { bg: 'bg-gray-100 dark:bg-gray-900/30', text: 'text-gray-700 dark:text-gray-300', dot: 'bg-gray-500' },
};

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#000000', '#ffffff'];

/* ── Main Component ────────────────────────────────────────────────── */

export default function TabletGradingView() {
  const currentUser = useAppStore((s) => s.currentUser);
  const currentClassId = useAppStore((s) => s.currentClassId);

  // Data state
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Canvas state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<ToolType>('pen');
  const [color, setColor] = useState('#ef4444');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<AnnotationStroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<AnnotationStroke | null>(null);
  const [undoStack, setUndoStack] = useState<AnnotationStroke[][]>([]);
  const [redoStack, setRedoStack] = useState<AnnotationStroke[][]>([]);
  const [selectedStamp, setSelectedStamp] = useState<StampType>('✓');

  // Grading state
  const [score, setScore] = useState<string>('');
  const [maxScore, setMaxScore] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [teacherNotes, setTeacherNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // AI Audit state
  const [aiReviewing, setAiReviewing] = useState(false);
  const [aiReviewResult, setAiReviewResult] = useState<AIReviewResult | null>(null);
  const [aiReviewHistory, setAiReviewHistory] = useState<AIReviewResult[]>([]);
  const [showAiPanel, setShowAiPanel] = useState(false);

  // Filter state
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Text annotation state
  const [showTextInput, setShowTextInput] = useState(false);
  const [textAnnotation, setTextAnnotation] = useState('');
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });

  // Load classes
  useEffect(() => {
    async function loadClasses() {
      try {
        const data = await fetchClasses();
        setClasses(data);
        if (currentClassId) setSelectedClassId(currentClassId);
        else if (data.length > 0) setSelectedClassId(data[0].id);
      } catch {
        toast.error(t('action.error') || 'Error loading data');
      }
    }
    loadClasses();
  }, [currentClassId]);

  // Load assessments when class changes
  useEffect(() => {
    if (!selectedClassId || !currentUser?.schoolId) return;
    async function loadAssessments() {
      try {
        const data = await fetchAssessments({ classGroupId: selectedClassId });
        setAssessments(data);
        if (data.length > 0) setSelectedAssessmentId(data[0].id);
        else setSelectedAssessmentId('');
      } catch {
        // ignore
      }
    }
    loadAssessments();
  }, [selectedClassId, currentUser?.schoolId]);

  // Load students when class changes
  useEffect(() => {
    if (!selectedClassId) return;
    async function loadStudents() {
      try {
        const data = await fetchClassStudents(selectedClassId);
        setStudents(data);
        if (data.length > 0) setSelectedStudentId(data[0].id);
        else setSelectedStudentId(null);
        setLoading(false);
      } catch {
        setLoading(false);
      }
    }
    loadStudents();
  }, [selectedClassId]);

  // Load submissions when assessment changes
  useEffect(() => {
    if (!selectedAssessmentId || students.length === 0) {
      setSubmissions([]);
      return;
    }
    async function loadSubmissions() {
      try {
        const results = await apiGet<Array<{ studentId: string; score: number | null; note: string | null; grade: string | null }>>(
          `/api/assessments/${selectedAssessmentId}/results`
        );
        const subs: StudentSubmission[] = students.map((s) => {
          const result = results.find((r) => r.studentId === s.id);
          return {
            student: s,
            status: result?.score != null ? 'graded' : 'pending',
            score: result?.score ?? null,
            grade: result?.grade ?? null,
            note: result?.note ?? null,
          };
        });
        setSubmissions(subs);
        setTotalPages(Math.max(1, Math.ceil(subs.length / 1)));
      } catch {
        setSubmissions(students.map((s) => ({ student: s, status: 'pending' as const, score: null, grade: null, note: null })));
      }
    }
    loadSubmissions();
  }, [selectedAssessmentId, students]);

  // Load annotations when student changes
  useEffect(() => {
    if (!selectedAssessmentId || !selectedStudentId) {
      setStrokes([]);
      return;
    }
    async function loadAnnotations() {
      try {
        const data = await apiGet<GradingAnnotationDB[]>(
          `/api/grading-annotations?assessmentId=${selectedAssessmentId}&studentId=${selectedStudentId}`
        );
        const loaded: AnnotationStroke[] = data.map((a) => ({
          id: a.id,
          tool: a.type === 'highlight' ? 'highlighter' : a.type === 'stamp' ? 'stamp' : (a.type as ToolType),
          color: a.color,
          width: a.strokeWidth,
          points: a.pathData ? JSON.parse(a.pathData) : [{ x: a.positionX, y: a.positionY }],
          stamp: a.type === 'stamp' ? (a.content as StampType) : undefined,
          text: a.type === 'text' ? a.content ?? '' : undefined,
          page: a.page,
        }));
        setStrokes(loaded);
        setUndoStack([]);
        setRedoStack([]);
      } catch {
        setStrokes([]);
      }
    }
    loadAnnotations();
  }, [selectedAssessmentId, selectedStudentId]);

  // Load current student's grading data
  useEffect(() => {
    const sub = submissions.find((s) => s.student.id === selectedStudentId);
    if (sub) {
      setScore(sub.score != null ? String(sub.score) : '');
      setTeacherNotes(sub.note ?? '');
      setSelectedGrade(null);
    }
  }, [selectedStudentId, submissions]);

  // Load AI review history
  useEffect(() => {
    if (!selectedAssessmentId || !currentUser?.schoolId) return;
    async function loadReviews() {
      try {
        const data = await apiGet<AIReviewResult[]>(
          `/api/grading-reviews?schoolId=${currentUser.schoolId}&assessmentId=${selectedAssessmentId}`
        );
        setAiReviewHistory(data);
      } catch {
        // ignore
      }
    }
    loadReviews();
  }, [selectedAssessmentId, currentUser?.schoolId]);

  // Filtered submissions
  const filteredSubmissions = useMemo(() => {
    let filtered = submissions;
    if (filter !== 'all') {
      filtered = filtered.filter((s) => s.status === filter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.student.firstName.toLowerCase().includes(q) ||
          s.student.lastName.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [submissions, filter, searchQuery]);

  // Current submission
  const currentSubmission = useMemo(
    () => submissions.find((s) => s.student.id === selectedStudentId),
    [submissions, selectedStudentId]
  );

  /* ── Canvas Drawing ───────────────────────────────────────────────── */

  const getCanvasCoords = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - panOffset.x) / zoom,
      y: (e.clientY - rect.top - panOffset.y) / zoom,
    };
  }, [zoom, panOffset]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool === 'hand' || tool === 'move') return;
    const coords = getCanvasCoords(e);
    const pressure = e.pressure || 0.5;

    if (tool === 'text') {
      setTextPosition(coords);
      setShowTextInput(true);
      return;
    }

    if (tool === 'stamp') {
      const newStroke: AnnotationStroke = {
        id: `stroke-${Date.now()}`,
        tool: 'stamp',
        color,
        width: strokeWidth,
        points: [coords],
        stamp: selectedStamp,
        page: currentPage,
      };
      setUndoStack((prev) => [...prev, strokes]);
      setRedoStack([]);
      setStrokes((prev) => [...prev, newStroke]);
      return;
    }

    setIsDrawing(true);
    const newStroke: AnnotationStroke = {
      id: `stroke-${Date.now()}`,
      tool,
      color: tool === 'eraser' ? '#ffffff' : color,
      width: tool === 'highlighter' ? strokeWidth * 4 : tool === 'eraser' ? strokeWidth * 3 : strokeWidth * (pressure * 2),
      points: [{ ...coords, pressure }],
      page: currentPage,
    };
    setCurrentStroke(newStroke);
  }, [tool, color, strokeWidth, selectedStamp, currentPage, getCanvasCoords, strokes]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentStroke) return;
    const coords = getCanvasCoords(e);
    const pressure = e.pressure || 0.5;
    setCurrentStroke((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        points: [...prev.points, { ...coords, pressure }],
        width: tool === 'pen' ? strokeWidth * (pressure * 2) : prev.width,
      };
    });
  }, [isDrawing, currentStroke, getCanvasCoords, tool, strokeWidth]);

  const handlePointerUp = useCallback(() => {
    if (!isDrawing || !currentStroke) return;
    setUndoStack((prev) => [...prev, strokes]);
    setRedoStack([]);
    setStrokes((prev) => [...prev, currentStroke]);
    setCurrentStroke(null);
    setIsDrawing(false);
  }, [isDrawing, currentStroke, strokes]);

  // Redraw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Draw grid pattern (like exam paper)
    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoom, zoom);

    // Light grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < 800; x += 25) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1200);
      ctx.stroke();
    }
    for (let y = 0; y < 1200; y += 25) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(800, y);
      ctx.stroke();
    }

    // Margin line
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, 0);
    ctx.lineTo(60, 1200);
    ctx.stroke();

    // Page number
    ctx.fillStyle = '#9ca3af';
    ctx.font = '12px sans-serif';
    ctx.fillText(`Seite ${currentPage}`, 350, 1180);

    // Draw all strokes for current page
    const pageStrokes = [...strokes, currentStroke].filter(
      (s) => s && s.page === currentPage
    );

    for (const stroke of pageStrokes) {
      if (!stroke) continue;

      if (stroke.tool === 'stamp' && stroke.stamp) {
        ctx.save();
        ctx.font = `${Math.max(24, stroke.width * 8)}px sans-serif`;
        ctx.fillStyle = stroke.color;
        const pt = stroke.points[0];
        if (pt) {
          ctx.fillText(stroke.stamp, pt.x, pt.y);
        }
        ctx.restore();
        continue;
      }

      if (stroke.tool === 'text' && stroke.text) {
        ctx.save();
        ctx.font = `${Math.max(14, stroke.width * 4)}px sans-serif`;
        ctx.fillStyle = stroke.color;
        const pt = stroke.points[0];
        if (pt) {
          ctx.fillText(stroke.text, pt.x, pt.y);
        }
        ctx.restore();
        continue;
      }

      if (stroke.points.length < 2) continue;

      ctx.save();
      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.tool === 'highlighter') {
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
      } else if (stroke.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = stroke.width;
      } else {
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
      }

      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        const prev = stroke.points[i - 1];
        const curr = stroke.points[i];
        const midX = (prev.x + curr.x) / 2;
        const midY = (prev.y + curr.y) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
      }
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }, [strokes, currentStroke, zoom, panOffset, currentPage]);

  // Undo/Redo
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack((r) => [...r, strokes]);
    setStrokes(prev);
    setUndoStack((u) => u.slice(0, -1));
  }, [undoStack, strokes]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((u) => [...u, strokes]);
    setStrokes(next);
    setRedoStack((r) => r.slice(0, -1));
  }, [redoStack, strokes]);

  // Clear all
  const handleClear = useCallback(() => {
    setUndoStack((prev) => [...prev, strokes]);
    setRedoStack([]);
    setStrokes([]);
    setPanOffset({ x: 0, y: 0 });
  }, [strokes]);

  // Save annotations
  const handleSave = useCallback(async () => {
    if (!selectedAssessmentId || !selectedStudentId || !currentUser?.schoolId) return;
    setSaving(true);
    try {
      // Delete existing annotations for this student/assessment
      const existing = await apiGet<GradingAnnotationDB[]>(
        `/api/grading-annotations?assessmentId=${selectedAssessmentId}&studentId=${selectedStudentId}`
      );
      for (const ann of existing) {
        await apiDelete(`/api/grading-annotations/${ann.id}`);
      }
      // Create new annotations
      for (const stroke of strokes) {
        await apiPost('/api/grading-annotations', {
          schoolId: currentUser.schoolId,
          assessmentId: selectedAssessmentId,
          studentId: selectedStudentId,
          type: stroke.tool === 'highlighter' ? 'highlight' : stroke.tool === 'stamp' ? 'stamp' : stroke.tool === 'text' ? 'text' : 'drawing',
          content: stroke.stamp ?? stroke.text ?? null,
          positionX: stroke.points[0]?.x ?? 0,
          positionY: stroke.points[0]?.y ?? 0,
          width: stroke.width,
          color: stroke.color,
          strokeWidth: stroke.width,
          page: stroke.page,
          pathData: JSON.stringify(stroke.points),
        });
      }
      toast.success(t('tablet_grading.saved') || 'Annotations saved');
    } catch {
      toast.error(t('tablet_grading.save_error') || 'Error saving annotations');
    } finally {
      setSaving(false);
    }
  }, [selectedAssessmentId, selectedStudentId, currentUser?.schoolId, strokes]);

  // Save grade
  const handleSaveGrade = useCallback(async () => {
    if (!selectedAssessmentId || !selectedStudentId) return;
    setSaving(true);
    try {
      await apiPost('/api/grading/annotate', {
        assessmentId: selectedAssessmentId,
        studentId: selectedStudentId,
        annotationData: JSON.stringify(strokes),
        annotationImage: '',
      });
      // Update submissions
      setSubmissions((prev) =>
        prev.map((s) =>
          s.student.id === selectedStudentId
            ? { ...s, status: 'graded' as const, score: score ? parseFloat(score) : null, note: teacherNotes }
            : s
        )
      );
      toast.success(t('tablet_grading.grade_saved') || 'Grade saved');
    } catch {
      toast.error(t('tablet_grading.grade_error') || 'Error saving grade');
    } finally {
      setSaving(false);
    }
  }, [selectedAssessmentId, selectedStudentId, strokes, score, teacherNotes]);

  // AI Grading Audit
  const handleAiAudit = useCallback(async () => {
    if (!selectedAssessmentId || !selectedStudentId || !currentUser?.schoolId) return;
    setAiReviewing(true);
    try {
      const result = await apiPost<AIReviewResult>('/api/ai-grading-audit', {
        schoolId: currentUser.schoolId,
        assessmentId: selectedAssessmentId,
        studentId: selectedStudentId,
      });
      setAiReviewResult(result);
      setAiReviewHistory((prev) => [result, ...prev]);
      setShowAiPanel(true);
      toast.success(t('tablet_grading.ai_review_complete') || 'AI review complete');
    } catch {
      toast.error(t('tablet_grading.ai_review_error') || 'Error performing AI review');
    } finally {
      setAiReviewing(false);
    }
  }, [selectedAssessmentId, selectedStudentId, currentUser?.schoolId]);

  // Parse AI review result
  const parsedAiResult = useMemo(() => {
    if (!aiReviewResult?.reviewResult) return null;
    try {
      return typeof aiReviewResult.reviewResult === 'string'
        ? JSON.parse(aiReviewResult.reviewResult)
        : aiReviewResult.reviewResult;
    } catch {
      return { overallAssessment: aiReviewResult.reviewResult };
    }
  }, [aiReviewResult]);

  // Navigate between students
  const navigateStudent = useCallback((direction: 'prev' | 'next') => {
    const idx = filteredSubmissions.findIndex((s) => s.student.id === selectedStudentId);
    if (direction === 'prev' && idx > 0) {
      setSelectedStudentId(filteredSubmissions[idx - 1].student.id);
    } else if (direction === 'next' && idx < filteredSubmissions.length - 1) {
      setSelectedStudentId(filteredSubmissions[idx + 1].student.id);
    }
  }, [filteredSubmissions, selectedStudentId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') { e.preventDefault(); handleUndo(); }
        if (e.key === 'y') { e.preventDefault(); handleRedo(); }
        if (e.key === 's') { e.preventDefault(); handleSave(); }
      }
      if (e.key === 'ArrowLeft') navigateStudent('prev');
      if (e.key === 'ArrowRight') navigateStudent('next');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleUndo, handleRedo, handleSave, navigateStudent]);

  const isStudent = currentUser?.role === 'STUDENT';
  const isAdmin = currentUser?.role === 'SCHOOL_ADMIN' || currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'VICE_PRINCIPAL';

  /* ── Render ───────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[600px]">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
          <span className="text-gray-500">{t('tablet_grading.loading') || 'Loading grading view...'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-3.5rem)]">
      {/* Top Bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2">
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue placeholder={t('tablet_grading.select_class') || 'Select class'} />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedAssessmentId} onValueChange={setSelectedAssessmentId}>
            <SelectTrigger className="w-[200px] h-8 text-xs">
              <SelectValue placeholder={t('tablet_grading.select_assessment') || 'Select assessment'} />
            </SelectTrigger>
            <SelectContent>
              {assessments.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Separator orientation="vertical" className="h-6" />
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateStudent('prev')} disabled={!selectedStudentId}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground min-w-[80px] text-center">
            {currentSubmission ? `${currentSubmission.student.firstName} ${currentSubmission.student.lastName}` : '—'}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateStudent('next')} disabled={!selectedStudentId}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={handleAiAudit}
            disabled={aiReviewing || !selectedStudentId}
          >
            {aiReviewing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            {t('tablet_grading.ai_audit') || 'AI Audit'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setShowAiPanel(!showAiPanel)}
          >
            <Eye className="h-3 w-3" />
            {t('tablet_grading.ai_results') || 'AI Results'}
            {aiReviewHistory.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{aiReviewHistory.length}</Badge>
            )}
          </Button>
          <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            {t('action.save') || 'Save'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Student List */}
        <div className="w-64 border-r bg-background flex flex-col shrink-0">
          <div className="p-3 space-y-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={t('tablet_grading.search_student') || 'Search student...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-7 text-xs pl-7"
              />
            </div>
            <div className="flex gap-1">
              {(['all', 'submitted', 'graded', 'pending'] as FilterType[]).map((f) => (
                <Button
                  key={f}
                  variant={filter === f ? 'default' : 'ghost'}
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={() => setFilter(f)}
                >
                  {f === 'all' ? t('tablet_grading.all') || 'All' :
                   f === 'submitted' ? t('tablet_grading.submitted') || 'Submitted' :
                   f === 'graded' ? t('tablet_grading.graded') || 'Graded' :
                   t('tablet_grading.pending') || 'Pending'}
                </Button>
              ))}
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {filteredSubmissions.map((sub, idx) => {
                const isActive = sub.student.id === selectedStudentId;
                const sc = statusColors[sub.status];
                return (
                  <motion.button
                    key={sub.student.id}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-all ${
                      isActive ? 'bg-emerald-100 dark:bg-emerald-900/30 ring-1 ring-emerald-300 shadow-sm' : 'hover:bg-muted hover:shadow-sm'
                    }`}
                    onClick={() => setSelectedStudentId(sub.student.id)}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.02 }}
                  >
                    <motion.div
                      className={`w-2 h-2 rounded-full shrink-0 ${sc.dot}`}
                      animate={sub.status === 'graded' ? { scale: [1, 1.3, 1] } : {}}
                      transition={{ duration: 0.5, repeat: sub.status === 'graded' ? 0 : 0 }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">
                        {sub.student.lastName}, {sub.student.firstName}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {sub.status === 'graded' ? `✓ ${sub.score ?? '—'}` : sub.status === 'submitted' ? '📝' : '—'}
                      </div>
                    </div>
                    {sub.score != null && (
                      <Badge className={`h-5 px-1.5 text-[10px] ${gradeColor(sub.score).bg} ${gradeColor(sub.score).text}`}>
                        {sub.score}
                      </Badge>
                    )}
                  </motion.button>
                );
              })}
              {filteredSubmissions.length === 0 && (
                <div className="text-center text-xs text-muted-foreground py-8">
                  {t('tablet_grading.no_students') || 'No students found'}
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="p-2 border-t text-[10px] text-muted-foreground text-center">
            {filteredSubmissions.length}/{submissions.length} {t('tablet_grading.students') || 'students'}
          </div>
        </div>

        {/* Center: Canvas Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tool Palette with gradient background */}
          <div className="flex items-center gap-1 px-3 py-1.5 border-b bg-gradient-to-r from-emerald-50/50 via-white to-teal-50/50 dark:from-emerald-950/20 dark:via-gray-900 dark:to-teal-950/20">
            <TooltipProvider>
              {([
                { id: 'pen' as ToolType, icon: Pen, label: 'Pen' },
                { id: 'highlighter' as ToolType, icon: Highlighter, label: 'Highlighter' },
                { id: 'eraser' as ToolType, icon: Eraser, label: 'Eraser' },
                { id: 'text' as ToolType, icon: Type, label: 'Text' },
                { id: 'stamp' as ToolType, icon: Stamp, label: 'Stamp' },
                { id: 'hand' as ToolType, icon: Hand, label: 'Pan' },
              ]).map(({ id, icon: Icon, label }) => (
                <Tooltip key={id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={tool === id ? 'default' : 'ghost'}
                      size="icon"
                      className={`h-7 w-7 transition-all ${tool === id ? 'ring-2 ring-emerald-400 shadow-md bg-gradient-to-br from-emerald-500 to-teal-500 text-white' : ''}`}
                      onClick={() => setTool(id)}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {label}
                  </TooltipContent>
                </Tooltip>
              ))}

              {/* Stamp selector */}
              {tool === 'stamp' && (
                <div className="flex items-center gap-0.5 ml-1">
                  {(['✓', '✗', '?', '!'] as StampType[]).map((s) => (
                    <Button
                      key={s}
                      variant={selectedStamp === s ? 'default' : 'ghost'}
                      size="icon"
                      className="h-7 w-7 text-sm font-bold"
                      onClick={() => setSelectedStamp(s)}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              )}

              <Separator orientation="vertical" className="h-5 mx-1" />

              {/* Color picker */}
              <div className="flex items-center gap-0.5">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    className={`w-5 h-5 rounded-full border-2 transition-all ${
                      color === c ? 'ring-2 ring-offset-1 ring-emerald-400 scale-110' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>

              <Separator orientation="vertical" className="h-5 mx-1" />

              {/* Stroke width */}
              <div className="flex items-center gap-1">
                <Minus className="h-3 w-3 text-muted-foreground" />
                <input
                  type="range"
                  min="1"
                  max="12"
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                  className="w-16 h-1 accent-emerald-500"
                />
                <Plus className="h-3 w-3 text-muted-foreground" />
              </div>

              <Separator orientation="vertical" className="h-5 mx-1" />

              {/* Undo/Redo */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleUndo} disabled={undoStack.length === 0}>
                    <Undo2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Undo (Ctrl+Z)</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRedo} disabled={redoStack.length === 0}>
                    <Redo2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Redo (Ctrl+Y)</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleClear}>
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Clear</TooltipContent>
              </Tooltip>

              <div className="flex-1" />

              {/* Zoom */}
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}>
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs text-muted-foreground w-10 text-center">{Math.round(zoom * 100)}%</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom((z) => Math.min(3, z + 0.1))}>
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
              </div>

              <Separator orientation="vertical" className="h-5 mx-1" />

              {/* Page navigation */}
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs text-muted-foreground">{currentPage}/{totalPages}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </TooltipProvider>
          </div>

          {/* Canvas */}
          <div className="flex-1 relative overflow-hidden bg-gray-100 dark:bg-gray-900">
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full touch-none"
              style={{ cursor: tool === 'hand' ? 'grab' : tool === 'eraser' ? 'crosshair' : 'crosshair' }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            />

            {/* Text input overlay */}
            <AnimatePresence>
              {showTextInput && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute bg-white dark:bg-gray-800 border rounded-lg shadow-lg p-2 z-10"
                  style={{ left: textPosition.x * zoom + panOffset.x, top: textPosition.y * zoom + panOffset.y }}
                >
                  <Input
                    autoFocus
                    className="h-7 text-xs w-40"
                    placeholder={t('tablet_grading.enter_text') || 'Enter text...'}
                    value={textAnnotation}
                    onChange={(e) => setTextAnnotation(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && textAnnotation.trim()) {
                        const newStroke: AnnotationStroke = {
                          id: `stroke-${Date.now()}`,
                          tool: 'text',
                          color,
                          width: strokeWidth,
                          points: [textPosition],
                          text: textAnnotation,
                          page: currentPage,
                        };
                        setUndoStack((prev) => [...prev, strokes]);
                        setRedoStack([]);
                        setStrokes((prev) => [...prev, newStroke]);
                        setShowTextInput(false);
                        setTextAnnotation('');
                      }
                      if (e.key === 'Escape') {
                        setShowTextInput(false);
                        setTextAnnotation('');
                      }
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* No student selected */}
            {!selectedStudentId && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-3">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">{t('tablet_grading.select_student_hint') || 'Select a student to begin grading'}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Grading Panel */}
        <div className="w-72 border-l bg-background flex flex-col shrink-0">
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {/* Student Info */}
              {currentSubmission && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">
                    {currentSubmission.student.firstName} {currentSubmission.student.lastName}
                  </h3>
                  <div className="flex items-center gap-2">
                    <Badge className={`${statusColors[currentSubmission.status].bg} ${statusColors[currentSubmission.status].text}`}>
                      {currentSubmission.status === 'graded' ? (t('tablet_grading.graded') || 'Graded') :
                       currentSubmission.status === 'submitted' ? (t('tablet_grading.submitted') || 'Submitted') :
                       (t('tablet_grading.pending') || 'Pending')}
                    </Badge>
                  </div>
                </div>
              )}

              <Separator />

              {/* Quick Grade Buttons (German Scale) with animated counter */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">{t('tablet_grading.quick_grade') || 'Quick Grade (German Scale)'}</Label>
                <div className="grid grid-cols-6 gap-1">
                  {[1, 2, 3, 4, 5, 6].map((g) => {
                    const gc = gradeColor(g);
                    return (
                      <motion.button
                        key={g}
                        className={`h-9 rounded-md text-sm font-bold ${gc.bg} ${gc.text} transition-all ${
                          selectedGrade === g ? 'ring-2 ring-offset-1 ring-emerald-400 scale-105 shadow-lg' : 'hover:scale-105'
                        }`}
                        onClick={() => setSelectedGrade(g)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {g}
                      </motion.button>
                    );
                  })}
                </div>
                <div className="grid grid-cols-3 gap-1 text-[10px] text-muted-foreground">
                  <span>{t('grading.sehr_gut') || 'Sehr gut'}</span>
                  <span>{t('grading.gut') || 'Gut'}</span>
                  <span>{t('grading.befriedigend') || 'Befriedigend'}</span>
                  <span>{t('grading.ausreichend') || 'Ausreichend'}</span>
                  <span>{t('grading.mangelhaft') || 'Mangelhaft'}</span>
                  <span>{t('grading.ungenuegend') || 'Ungenügend'}</span>
                </div>
              </div>

              <Separator />

              {/* Score Entry */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">{t('tablet_grading.score') || 'Score'}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    className="h-8 text-sm w-20"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    placeholder="0"
                    disabled={isStudent}
                  />
                  <span className="text-xs text-muted-foreground">/</span>
                  <Input
                    type="number"
                    className="h-8 text-sm w-20"
                    value={maxScore}
                    onChange={(e) => setMaxScore(e.target.value)}
                    placeholder="100"
                    disabled={isStudent}
                  />
                </div>
              </div>

              <Separator />

              {/* Teacher Notes */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">{t('tablet_grading.teacher_notes') || 'Teacher Notes'}</Label>
                <Textarea
                  className="min-h-[120px] text-xs resize-none"
                  value={teacherNotes}
                  onChange={(e) => setTeacherNotes(e.target.value)}
                  placeholder={t('tablet_grading.notes_placeholder') || 'Write notes about this student\'s work...'}
                  disabled={isStudent}
                />
              </div>

              <Separator />

              {/* AI Suggestion Badge */}
              {aiReviewResult && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <Label className="text-xs font-medium">{t('tablet_grading.ai_suggestion') || 'AI Suggestion'}</Label>
                  </div>
                  <Card className="border-2 border-dashed border-amber-300 dark:border-amber-700 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 relative overflow-hidden">
                    {/* Glow effect */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-amber-200/0 via-amber-200/30 to-amber-200/0 dark:from-amber-400/0 dark:via-amber-400/10 dark:to-amber-400/0 pointer-events-none"
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ duration: 4, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
                    />
                    <CardContent className="p-3 space-y-2">
                      {parsedAiResult?.suggestedGrade && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{t('tablet_grading.suggested_grade') || 'Suggested grade'}:</span>
                          <Badge className={`${gradeColor(parseFloat(parsedAiResult.suggestedGrade)).bg} ${gradeColor(parseFloat(parsedAiResult.suggestedGrade)).text}`}>
                            {parsedAiResult.suggestedGrade}
                          </Badge>
                        </div>
                      )}
                      {parsedAiResult?.reason && (
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {parsedAiResult.reason}
                        </p>
                      )}
                      {parsedAiResult?.currentGrade && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{t('tablet_grading.current_grade') || 'Current grade'}:</span>
                          <span className="text-xs font-medium">{parsedAiResult.currentGrade}</span>
                        </div>
                      )}
                      <div className="flex gap-1 pt-1">
                        <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1" onClick={() => {
                          if (parsedAiResult?.suggestedGrade) {
                            setSelectedGrade(parseFloat(parsedAiResult.suggestedGrade));
                            toast.success(t('tablet_grading.suggestion_accepted') || 'Suggestion accepted');
                          }
                        }}>
                          <CheckCircle2 className="h-3 w-3" />
                          {t('tablet_grading.accept') || 'Accept'}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1" onClick={() => {
                          setAiReviewResult(null);
                          toast.info(t('tablet_grading.suggestion_rejected') || 'Suggestion dismissed');
                        }}>
                          <XCircle className="h-3 w-3" />
                          {t('tablet_grading.reject') || 'Reject'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              <Separator />

              {/* Save Grade Button */}
              {!isStudent && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Button className="w-full gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md" onClick={handleSaveGrade} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {t('tablet_grading.save_grade') || 'Save Grade'}
                  </Button>
                </motion.div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* AI Grading Audit Panel (Slide-over) */}
      <AnimatePresence>
        {showAiPanel && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-96 bg-background border-l shadow-2xl z-50 flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <h2 className="text-sm font-semibold">{t('tablet_grading.ai_audit_title') || 'AI Grading Audit'}</h2>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowAiPanel(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {/* Trigger new audit */}
                <Button
                  className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                  onClick={handleAiAudit}
                  disabled={aiReviewing || !selectedStudentId}
                >
                  {aiReviewing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('tablet_grading.analyzing') || 'Analyzing...'}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      {t('tablet_grading.trigger_audit') || 'Trigger AI Audit'}
                    </>
                  )}
                </Button>

                {/* Current Review */}
                {aiReviewResult && (
                  <Card className="border-2 border-amber-200 dark:border-amber-800 overflow-hidden">
                    <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-2">
                      <h3 className="text-xs font-semibold text-white">{t('tablet_grading.latest_review') || 'Latest Review'}</h3>
                    </div>
                    <CardContent className="p-3 space-y-3">
                      {parsedAiResult?.overallAssessment && (
                        <p className="text-xs leading-relaxed">{parsedAiResult.overallAssessment}</p>
                      )}

                      {parsedAiResult?.suggestedGrade && (
                        <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                          <div>
                            <span className="text-[10px] text-muted-foreground">{t('tablet_grading.suggested_grade') || 'Suggested Grade'}</span>
                            <div className="flex items-center gap-2">
                              <Badge className={`${gradeColor(parseFloat(parsedAiResult.suggestedGrade)).bg} ${gradeColor(parseFloat(parsedAiResult.suggestedGrade)).text}`}>
                                {parsedAiResult.suggestedGrade}
                              </Badge>
                              {parsedAiResult.currentGrade && (
                                <>
                                  <span className="text-[10px] text-muted-foreground">vs.</span>
                                  <Badge variant="outline" className="text-xs">
                                    {parsedAiResult.currentGrade}
                                  </Badge>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {parsedAiResult.suggestedGrade && parsedAiResult.currentGrade && (
                              <Badge variant="outline" className={`text-[10px] ${
                                parseFloat(parsedAiResult.suggestedGrade) !== parseFloat(parsedAiResult.currentGrade)
                                  ? 'border-amber-300 text-amber-600'
                                  : 'border-emerald-300 text-emerald-600'
                              }`}>
                                {parseFloat(parsedAiResult.suggestedGrade) !== parseFloat(parsedAiResult.currentGrade)
                                  ? t('tablet_grading.discrepancy') || 'Discrepancy'
                                  : t('tablet_grading.consistent') || 'Consistent'}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {parsedAiResult?.reason && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-medium text-muted-foreground">{t('tablet_grading.reasoning') || 'Reasoning'}</span>
                          <p className="text-xs leading-relaxed bg-muted/30 p-2 rounded-md">{parsedAiResult.reason}</p>
                        </div>
                      )}

                      {parsedAiResult?.discrepancies && Array.isArray(parsedAiResult.discrepancies) && parsedAiResult.discrepancies.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-medium text-muted-foreground">{t('tablet_grading.discrepancies_found') || 'Discrepancies Found'}</span>
                          <ul className="space-y-1">
                            {parsedAiResult.discrepancies.map((d: string, i: number) => (
                              <li key={i} className="flex items-start gap-1.5 text-xs">
                                <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                                <span>{d}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(aiReviewResult.createdAt).toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Review History */}
                {aiReviewHistory.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold">{t('tablet_grading.review_history') || 'Review History'}</h3>
                    {aiReviewHistory.map((review) => {
                      let parsed: Record<string, unknown> | null = null;
                      try {
                        parsed = typeof review.reviewResult === 'string' ? JSON.parse(review.reviewResult) : review.reviewResult;
                      } catch {
                        parsed = null;
                      }
                      return (
                        <Card key={review.id} className="overflow-hidden">
                          <CardContent className="p-2.5 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="text-[10px]">
                                {review.status === 'completed' ? '✓' : '⏳'}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(review.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            {parsed?.suggestedGrade && (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground">{t('tablet_grading.suggested') || 'Suggested'}:</span>
                                <Badge className={`h-4 text-[10px] ${gradeColor(parseFloat(parsed.suggestedGrade as string)).bg} ${gradeColor(parseFloat(parsed.suggestedGrade as string)).text}`}>
                                  {parsed.suggestedGrade as string}
                                </Badge>
                              </div>
                            )}
                            {parsed?.reason && (
                              <p className="text-[10px] text-muted-foreground line-clamp-2">
                                {parsed.reason as string}
                              </p>
                            )}
                            {review.discrepanciesFound > 0 && (
                              <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-600">
                                {review.discrepanciesFound} {t('tablet_grading.discrepancies') || 'discrepancies'}
                              </Badge>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {aiReviewHistory.length === 0 && !aiReviewResult && (
                  <div className="text-center py-8 space-y-3">
                    <Sparkles className="h-10 w-10 text-muted-foreground mx-auto" />
                    <p className="text-xs text-muted-foreground">{t('tablet_grading.no_reviews') || 'No AI reviews yet. Trigger an audit to get started.'}</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Student View: Read-only banner */}
      {isStudent && (
        <div className="absolute top-0 left-0 right-0 bg-blue-500 text-white text-center py-1 text-xs z-50">
          {t('tablet_grading.student_view') || 'Student View — Read Only'}
        </div>
      )}

      {/* Admin View badge */}
      {isAdmin && (
        <div className="absolute bottom-4 left-72 z-30">
          <Badge className="bg-purple-500 text-white gap-1">
            <Shield className="h-3 w-3" />
            {t('tablet_grading.admin_view') || 'Admin View'}
          </Badge>
        </div>
      )}
    </div>
  );
}
