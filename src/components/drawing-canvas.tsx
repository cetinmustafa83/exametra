'use client';

import React, { useCallback, useEffect, useRef, useState, useMemo, memo } from 'react';
import {
  Pencil,
  PenTool,
  Minus,
  Square,
  Circle,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Save,
  Download,
  Palette,
  Pipette,
  X,
  Leaf,
  Grid3X3,
  LineChart,
  CircleDot,
  Eye,
  EyeOff,
  ChevronDown,
  ZoomIn,
  ZoomOut,
  Activity,
  Highlighter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { t } from '@/lib/i18n';

/* ── Types ─────────────────────────────────────────────────────────── */

export interface StrokePoint {
  x: number;
  y: number;
  pressure?: number;
}

export interface Stroke {
  id: string;
  tool: 'pencil' | 'pen' | 'line' | 'rectangle' | 'circle' | 'eraser' | 'highlighter';
  color: string;
  width: number;
  points: StrokePoint[];
  startPoint?: { x: number; y: number };
  endPoint?: { x: number; y: number };
}

export interface DrawingCanvasProps {
  width?: number;
  height?: number;
  backgroundType?: 'blank' | 'lined' | 'grid' | 'dotted';
  initialDrawingData?: string;
  onSave?: (drawingData: string, imageData: string) => void;
  onExit?: () => void;
  subjectId?: string;
  classGroupId?: string;
  title?: string;
}

type ToolType = 'pencil' | 'pen' | 'line' | 'rectangle' | 'circle' | 'eraser' | 'highlighter';
type BackgroundType = 'blank' | 'lined' | 'grid' | 'dotted';
type GuideMode = 'off' | 'basic' | 'circles' | 'perspective';

/* ── Constants ─────────────────────────────────────────────────────── */

const PRESET_COLORS = [
  '#000000', '#FFFFFF', '#374151', '#6B7280',
  '#DC2626', '#EA580C', '#D97706', '#CA8A04',
  '#16A34A', '#059669', '#0891B2', '#2563EB',
  '#7C3AED', '#C026D3', '#E11D48', '#92400E',
];

const PEN_COLORS = [
  '#1a1a2e', '#16213e', '#0f3460', '#e94560',
  '#533483', '#2b2d42', '#8d99ae', '#ef233c',
];

const HIGHLIGHTER_COLORS = [
  '#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8',
  '#fed7aa', '#c4b5fd', '#99f6e4', '#fca5a5',
];

const AUTO_SAVE_INTERVAL = 30000;
const AUTO_SAVE_DEBOUNCE = 5000; // Debounced auto-save: 5s after last stroke
const LOCAL_STORAGE_KEY = 'ct_drawing_draft';
const POINT_SIMPLIFICATION_TOLERANCE = 2; // Distance threshold for point simplification
const DRAWING_RAF_THRESHOLD = 16; // ~60fps target

/* ── Utility ───────────────────────────────────────────────────────── */

function generateId(): string {
  return `stroke_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/* ── Point Simplification (Ramer-Douglas-Peucker) ──────────────────── */

function distToSegment(p: StrokePoint, a: StrokePoint, b: StrokePoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function simplifyPoints(points: StrokePoint[], tolerance: number): StrokePoint[] {
  if (points.length <= 2) return points;
  let maxDist = 0;
  let maxIdx = 0;
  const first = points[0];
  const last = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const d = distToSegment(points[i], first, last);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }
  if (maxDist > tolerance) {
    const left = simplifyPoints(points.slice(0, maxIdx + 1), tolerance);
    const right = simplifyPoints(points.slice(maxIdx), tolerance);
    return [...left.slice(0, -1), ...right];
  }
  return [first, last];
}

function getCanvasPoint(
  canvas: HTMLCanvasElement,
  e: React.MouseEvent | React.TouchEvent | PointerEvent
): StrokePoint {
  const rect = canvas.getBoundingClientRect();
  let clientX: number;
  let clientY: number;
  let pressure = 0.5;

  if ('touches' in e) {
    const touch = e.touches[0] || e.changedTouches[0];
    clientX = touch.clientX;
    clientY = touch.clientY;
    const touchPressure = (touch as unknown as { pressure?: number }).pressure;
    if (touchPressure && touchPressure > 0) {
      pressure = touchPressure;
    }
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
    if ('pressure' in e && e.pressure > 0) {
      pressure = e.pressure;
    }
  }

  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
    pressure,
  };
}

/* ── Background Renderer ───────────────────────────────────────────── */

function drawBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  bgType: BackgroundType
) {
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);

  if (bgType === 'lined') {
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;
    const spacing = 32;
    for (let y = spacing; y < h; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    // German-style red margin line (like Schulhefte)
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(64, 0);
    ctx.lineTo(64, h);
    ctx.stroke();
  } else if (bgType === 'grid') {
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 0.5;
    const spacing = 32;
    for (let x = spacing; x < w; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = spacing; y < h; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    // Major grid lines
    ctx.strokeStyle = '#D1D5DB';
    ctx.lineWidth = 1;
    for (let x = spacing * 4; x < w; x += spacing * 4) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = spacing * 4; y < h; y += spacing * 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  } else if (bgType === 'dotted') {
    ctx.fillStyle = '#D1D5DB';
    const spacing = 24;
    for (let x = spacing; x < w; x += spacing) {
      for (let y = spacing; y < h; y += spacing) {
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

/* ── Guide Renderer ────────────────────────────────────────────────── */

function drawGuideOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  guide: GuideMode
) {
  ctx.save();
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.15)';
  ctx.lineWidth = 1;
  ctx.setLineDash([8, 4]);

  if (guide === 'basic') {
    // Center cross
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
    // Triangle
    ctx.beginPath();
    ctx.moveTo(w / 2, h * 0.2);
    ctx.lineTo(w * 0.3, h * 0.7);
    ctx.lineTo(w * 0.7, h * 0.7);
    ctx.closePath();
    ctx.stroke();
    // Rectangle
    ctx.strokeRect(w * 0.15, h * 0.2, w * 0.3, h * 0.4);
    // Circle
    ctx.beginPath();
    ctx.arc(w * 0.7, h * 0.4, Math.min(w, h) * 0.18, 0, Math.PI * 2);
    ctx.stroke();
  } else if (guide === 'circles') {
    // Concentric circles
    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.min(w, h) * 0.4;
    for (let i = 1; i <= 5; i++) {
      ctx.beginPath();
      ctx.arc(cx, cy, maxR * (i / 5), 0, Math.PI * 2);
      ctx.stroke();
    }
    // Cross
    ctx.beginPath();
    ctx.moveTo(cx, cy - maxR);
    ctx.lineTo(cx, cy + maxR);
    ctx.moveTo(cx - maxR, cy);
    ctx.lineTo(cx + maxR, cy);
    ctx.stroke();
  } else if (guide === 'perspective') {
    // Vanishing point
    const vx = w / 2;
    const vy = h * 0.3;
    // Lines from vanishing point
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      ctx.beginPath();
      ctx.moveTo(vx, vy);
      ctx.lineTo(vx + Math.cos(angle) * w, vy + Math.sin(angle) * h);
      ctx.stroke();
    }
    // Horizontal lines
    for (let y = h * 0.4; y < h; y += h * 0.15) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/* ── Stroke Renderer ───────────────────────────────────────────────── */

function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  isPreview = false
) {
  if (stroke.points.length === 0) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (stroke.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.lineWidth = stroke.width * 2;
  } else if (stroke.tool === 'highlighter') {
    ctx.globalCompositeOperation = 'multiply';
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width * 4;
    ctx.globalAlpha = 0.35;
  } else {
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
  }

  if (isPreview) {
    ctx.globalAlpha = 0.7;
  }

  if (stroke.tool === 'pencil' || stroke.tool === 'pen' || stroke.tool === 'eraser' || stroke.tool === 'highlighter') {
    if (stroke.points.length === 1) {
      const p = stroke.points[0];
      const w = stroke.tool === 'eraser' ? stroke.width * 2 : stroke.width;
      const pressureMod = stroke.tool === 'pen' && p.pressure ? p.pressure : 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, w * pressureMod * 0.5, 0, Math.PI * 2);
      if (stroke.tool === 'eraser') {
        ctx.fillStyle = 'rgba(0,0,0,1)';
      } else {
        ctx.fillStyle = stroke.color;
      }
      ctx.fill();
    } else if (stroke.tool === 'pen') {
      // Calligraphy pen: smooth with pressure-based width variation
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

      for (let i = 1; i < stroke.points.length - 1; i++) {
        const prev = stroke.points[i - 1];
        const curr = stroke.points[i];
        const next = stroke.points[i + 1];
        const midX = (curr.x + next.x) / 2;
        const midY = (curr.y + next.y) / 2;

        // Pressure-based width variation
        const pressure = curr.pressure ?? 0.5;
        ctx.lineWidth = stroke.width * (0.5 + pressure);
        ctx.quadraticCurveTo(curr.x, curr.y, midX, midY);
      }

      const last = stroke.points[stroke.points.length - 1];
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
    } else {
      // Smooth freehand with quadratic curves
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

      if (stroke.points.length === 2) {
        ctx.lineTo(stroke.points[1].x, stroke.points[1].y);
      } else {
        for (let i = 1; i < stroke.points.length - 1; i++) {
          const curr = stroke.points[i];
          const next = stroke.points[i + 1];
          const midX = (curr.x + next.x) / 2;
          const midY = (curr.y + next.y) / 2;
          ctx.quadraticCurveTo(curr.x, curr.y, midX, midY);
        }
        const last = stroke.points[stroke.points.length - 1];
        ctx.lineTo(last.x, last.y);
      }
      ctx.stroke();
    }
  } else if (stroke.tool === 'line' && stroke.startPoint && stroke.endPoint) {
    ctx.beginPath();
    ctx.moveTo(stroke.startPoint.x, stroke.startPoint.y);
    ctx.lineTo(stroke.endPoint.x, stroke.endPoint.y);
    ctx.stroke();
  } else if (stroke.tool === 'rectangle' && stroke.startPoint && stroke.endPoint) {
    const x = Math.min(stroke.startPoint.x, stroke.endPoint.x);
    const y = Math.min(stroke.startPoint.y, stroke.endPoint.y);
    const w = Math.abs(stroke.endPoint.x - stroke.startPoint.x);
    const h = Math.abs(stroke.endPoint.y - stroke.startPoint.y);
    ctx.strokeRect(x, y, w, h);
  } else if (stroke.tool === 'circle' && stroke.startPoint && stroke.endPoint) {
    const cx = (stroke.startPoint.x + stroke.endPoint.x) / 2;
    const cy = (stroke.startPoint.y + stroke.endPoint.y) / 2;
    const rx = Math.abs(stroke.endPoint.x - stroke.startPoint.x) / 2;
    const ry = Math.abs(stroke.endPoint.y - stroke.startPoint.y) / 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

/* ── Main Component ────────────────────────────────────────────────── */

export default function DrawingCanvas({
  backgroundType = 'blank',
  initialDrawingData,
  onSave,
  onExit,
  title: propTitle,
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Background layer canvas for caching (avoids redrawing background every frame)
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  // RAF tracking
  const rafIdRef = useRef<number>(0);
  const lastDrawTimeRef = useRef<number>(0);
  // Debounced auto-save timer
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // FPS counter
  const fpsFrameCountRef = useRef<number>(0);
  const fpsLastTimeRef = useRef<number>(performance.now());
  const [fpsDisplay, setFpsDisplay] = useState<number>(0);
  const [showFps, setShowFps] = useState(false);

  // Drawing state
  const [strokes, setStrokes] = useState<Stroke[]>(() => {
    if (!initialDrawingData) return [];
    try {
      const parsed = JSON.parse(initialDrawingData) as Stroke[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Tool state
  const [activeTool, setActiveTool] = useState<ToolType>('pencil');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [bgType, setBgType] = useState<BackgroundType>(backgroundType);
  const [guideMode, setGuideMode] = useState<GuideMode>('off');

  // Set default color for highlighter
  const handleToolChange = useCallback((tool: ToolType) => {
    setActiveTool(tool);
    if (tool === 'highlighter' && strokeColor === '#000000') {
      setStrokeColor('#fef08a');
    } else if (tool !== 'highlighter' && strokeColor === '#fef08a') {
      setStrokeColor('#000000');
    }
  }, [strokeColor]);

  // UI state
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [drawingTitle, setDrawingTitle] = useState(propTitle || '');
  const [drawingDescription, setDrawingDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);

  // Canvas dimensions
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });

  // Zoom state
  const [zoomLevel, setZoomLevel] = useState(100);

  // Detect mobile for drawer vs dialog
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasSize({
          width: Math.floor(rect.width),
          height: Math.floor(rect.height),
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  /* ── Build background layer cache ──────────────────────────────── */

  const buildBgCache = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!bgCanvasRef.current) {
      bgCanvasRef.current = document.createElement('canvas');
    }
    bgCanvasRef.current.width = canvas.width;
    bgCanvasRef.current.height = canvas.height;
    const ctx = bgCanvasRef.current.getContext('2d');
    if (!ctx) return;
    drawBackground(ctx, canvas.width, canvas.height, bgType);
    if (guideMode !== 'off') {
      drawGuideOverlay(ctx, canvas.width, canvas.height, guideMode);
    }
  }, [bgType, guideMode]);

  useEffect(() => {
    buildBgCache();
  }, [buildBgCache]);

  /* ── Redraw canvas with RAF + layer caching ──────────────────── */

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use cached background layer
    if (bgCanvasRef.current) {
      ctx.drawImage(bgCanvasRef.current, 0, 0);
    } else {
      drawBackground(ctx, canvas.width, canvas.height, bgType);
      if (guideMode !== 'off') {
        drawGuideOverlay(ctx, canvas.width, canvas.height, guideMode);
      }
    }

    // Draw all committed strokes
    for (const stroke of strokes) {
      drawStroke(ctx, stroke);
    }

    // Draw current stroke preview
    if (currentStroke) {
      drawStroke(ctx, currentStroke, true);
    }
  }, [strokes, currentStroke, bgType, guideMode]);

  // RAF-based drawing for smooth animation
  const scheduleRedraw = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }
    rafIdRef.current = requestAnimationFrame(() => {
      redrawCanvas();
      rafIdRef.current = 0;
    });
  }, [redrawCanvas]);

  useEffect(() => {
    scheduleRedraw();
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [scheduleRedraw]);

  /* ── FPS Counter ──────────────────────────────────────────────── */

  useEffect(() => {
    if (!showFps) return;
    const interval = setInterval(() => {
      const now = performance.now();
      const elapsed = now - fpsLastTimeRef.current;
      if (elapsed > 0) {
        setFpsDisplay(Math.round((fpsFrameCountRef.current / elapsed) * 1000));
      }
      fpsFrameCountRef.current = 0;
      fpsLastTimeRef.current = now;
    }, 1000);
    return () => clearInterval(interval);
  }, [showFps]);

  // Count frames for FPS
  useEffect(() => {
    if (!showFps) return;
    const countFrame = () => {
      fpsFrameCountRef.current++;
      requestAnimationFrame(countFrame);
    };
    const id = requestAnimationFrame(countFrame);
    return () => cancelAnimationFrame(id);
  }, [showFps]);

  /* ── Auto-save (debounced) ──────────────────────────────────────── */

  const debouncedAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      if (strokes.length > 0) {
        try {
          localStorage.setItem(
            LOCAL_STORAGE_KEY,
            JSON.stringify({ strokes, bgType, title: drawingTitle, updatedAt: new Date().toISOString() })
          );
          setLastAutoSave(new Date());
        } catch {
          // ignore storage errors
        }
      }
    }, AUTO_SAVE_DEBOUNCE);
  }, [strokes, bgType, drawingTitle]);

  useEffect(() => {
    debouncedAutoSave();
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [debouncedAutoSave]);

  // Also keep periodic auto-save as backup
  useEffect(() => {
    const interval = setInterval(() => {
      if (strokes.length > 0) {
        try {
          localStorage.setItem(
            LOCAL_STORAGE_KEY,
            JSON.stringify({ strokes, bgType, title: drawingTitle, updatedAt: new Date().toISOString() })
          );
          setLastAutoSave(new Date());
        } catch {
          // ignore storage errors
        }
      }
    }, AUTO_SAVE_INTERVAL);
    return () => clearInterval(interval);
  }, [strokes, bgType, drawingTitle]);

  /* ── Drawing handlers ───────────────────────────────────────────── */

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;

      const point = getCanvasPoint(canvas, e.nativeEvent);
      setIsDrawing(true);

      const newStroke: Stroke = {
        id: generateId(),
        tool: activeTool,
        color: strokeColor,
        width: strokeWidth,
        points: [point],
        ...(activeTool === 'line' || activeTool === 'rectangle' || activeTool === 'circle'
          ? { startPoint: { x: point.x, y: point.y }, endPoint: { x: point.x, y: point.y } }
          : {}),
      };

      setCurrentStroke(newStroke);
      setRedoStack([]);
    },
    [activeTool, strokeColor, strokeWidth]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing || !currentStroke) return;
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;

      const point = getCanvasPoint(canvas, e.nativeEvent);

      if (currentStroke.tool === 'line' || currentStroke.tool === 'rectangle' || currentStroke.tool === 'circle') {
        setCurrentStroke((prev) =>
          prev ? { ...prev, endPoint: { x: point.x, y: point.y } } : null
        );
      } else {
        setCurrentStroke((prev) =>
          prev ? { ...prev, points: [...prev.points, point] } : null
        );
      }
    },
    [isDrawing, currentStroke]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing || !currentStroke) return;
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;

      const point = getCanvasPoint(canvas, e.nativeEvent);

      let finalStroke: Stroke;
      if (currentStroke.tool === 'line' || currentStroke.tool === 'rectangle' || currentStroke.tool === 'circle') {
        finalStroke = { ...currentStroke, endPoint: { x: point.x, y: point.y } };
      } else {
        // Simplify points for freehand strokes (performance optimization)
        const allPoints = [...currentStroke.points, point];
        const simplified = allPoints.length > 10
          ? simplifyPoints(allPoints, POINT_SIMPLIFICATION_TOLERANCE)
          : allPoints;
        finalStroke = { ...currentStroke, points: simplified };
      }

      setStrokes((prev) => [...prev, finalStroke]);
      setCurrentStroke(null);
      setIsDrawing(false);
    },
    [isDrawing, currentStroke]
  );

  /* ── Undo / Redo ────────────────────────────────────────────────── */

  const handleUndo = useCallback(() => {
    setStrokes((prev) => {
      if (prev.length === 0) return prev;
      const newStrokes = [...prev];
      const removed = newStrokes.pop()!;
      setRedoStack((r) => [...r, removed]);
      return newStrokes;
    });
  }, []);

  const handleRedo = useCallback(() => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const newRedo = [...prev];
      const restored = newRedo.pop()!;
      setStrokes((s) => [...s, restored]);
      return newRedo;
    });
  }, []);

  /* ── Keyboard shortcuts ─────────────────────────────────────────── */

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleUndo, handleRedo]);

  /* ── Clear canvas ───────────────────────────────────────────────── */

  const handleClear = useCallback(() => {
    setStrokes([]);
    setRedoStack([]);
    setCurrentStroke(null);
    setShowClearDialog(false);
  }, []);

  /* ── Export PNG ──────────────────────────────────────────────────── */

  const handleExportPNG = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a clean export canvas without guides
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    drawBackground(ctx, exportCanvas.width, exportCanvas.height, bgType);
    for (const stroke of strokes) {
      drawStroke(ctx, stroke);
    }

    const dataUrl = exportCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${drawingTitle || 'drawing'}.png`;
    link.href = dataUrl;
    link.click();
  }, [strokes, bgType, drawingTitle]);

  /* ── Save drawing ───────────────────────────────────────────────── */

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Create clean image data
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = canvas.width;
      exportCanvas.height = canvas.height;
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) return;

      drawBackground(ctx, exportCanvas.width, exportCanvas.height, bgType);
      for (const stroke of strokes) {
        drawStroke(ctx, stroke);
      }

      const imageData = exportCanvas.toDataURL('image/png');
      const drawingData = JSON.stringify(strokes);

      if (onSave) {
        onSave(drawingData, imageData);
      }

      setShowSaveDialog(false);
    } finally {
      setIsSaving(false);
    }
  }, [strokes, bgType, drawingTitle, onSave]);

  /* ── Get image data ─────────────────────────────────────────────── */

  const getImageData = useCallback((): string => {
    const canvas = canvasRef.current;
    if (!canvas) return '';
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return '';
    drawBackground(ctx, exportCanvas.width, exportCanvas.height, bgType);
    for (const stroke of strokes) {
      drawStroke(ctx, stroke);
    }
    return exportCanvas.toDataURL('image/png');
  }, [strokes, bgType]);

  // Expose getImageData for parent
  useEffect(() => {
    if (onSave) {
      // stored for external use
      void getImageData;
    }
  }, [getImageData, onSave]);

  /* ── Tool definitions ───────────────────────────────────────────── */

  const tools: Array<{ id: ToolType; icon: React.ReactNode; label: string }> = [
    { id: 'pencil', icon: <Pencil className="h-5 w-5" />, label: t('drawing.tool_pencil') },
    { id: 'pen', icon: <PenTool className="h-5 w-5" />, label: t('drawing.tool_pen') },
    { id: 'highlighter', icon: <Highlighter className="h-5 w-5" />, label: t('drawing.tool_highlighter') },
    { id: 'line', icon: <Minus className="h-5 w-5" />, label: t('drawing.tool_line') },
    { id: 'rectangle', icon: <Square className="h-5 w-5" />, label: t('drawing.tool_rectangle') },
    { id: 'circle', icon: <Circle className="h-5 w-5" />, label: t('drawing.tool_circle') },
    { id: 'eraser', icon: <Eraser className="h-5 w-5" />, label: t('drawing.tool_eraser') },
  ];

  const bgOptions: Array<{ id: BackgroundType; icon: React.ReactNode; label: string }> = [
    { id: 'blank', icon: <Square className="h-4 w-4" />, label: t('drawing.bg_blank') },
    { id: 'lined', icon: <LineChart className="h-4 w-4" />, label: t('drawing.bg_lined') },
    { id: 'grid', icon: <Grid3X3 className="h-4 w-4" />, label: t('drawing.bg_grid') },
    { id: 'dotted', icon: <CircleDot className="h-4 w-4" />, label: t('drawing.bg_dotted') },
  ];

  const guideOptions: Array<{ id: GuideMode; label: string }> = [
    { id: 'off', label: t('drawing.guide_off') },
    { id: 'basic', label: t('drawing.guide_basic') },
    { id: 'circles', label: t('drawing.guide_circles') },
    { id: 'perspective', label: t('drawing.guide_perspective') },
  ];

  /* ── Render ─────────────────────────────────────────────────────── */

  return (
    <div className="flex h-full flex-col bg-gray-50 dark:bg-gray-950">
      {/* ── Toolbar ────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-gray-900 px-2 sm:px-3 py-2 text-white shadow-lg safe-top">
        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
          {/* Exit button */}
          {onExit && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onExit}
                    className="h-10 w-10 min-touch text-gray-300 hover:bg-gray-800 hover:text-white"
                    aria-label={t('drawing.exit')}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('drawing.exit')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Divider */}
          <div className="mx-0.5 sm:mx-1 h-8 w-px bg-gray-700 hidden sm:block" />

          {/* Drawing tools */}
          <TooltipProvider>
            {tools.map((tool) => (
              <Tooltip key={tool.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToolChange(tool.id)}
                    className={`h-10 w-10 min-touch transition-all rounded-lg ${
                      activeTool === tool.id
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30 scale-105'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                    aria-label={tool.label}
                    aria-pressed={activeTool === tool.id}
                  >
                    {tool.icon}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{tool.label}</TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>

          {/* Divider */}
          <div className="mx-0.5 sm:mx-1 h-8 w-px bg-gray-700 hidden sm:block" />

          {/* Color picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 min-touch gap-1.5 px-2 text-gray-300 hover:bg-gray-800 hover:text-white"
                aria-label={t('drawing.color')}
              >
                <div
                  className="h-6 w-6 rounded-full border-2 border-gray-500"
                  style={{ backgroundColor: strokeColor }}
                />
                <Pipette className="h-4 w-4 hidden sm:block" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3 max-w-[calc(100vw-2rem)]" side="bottom">
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500">{t('drawing.color')}</p>
                <div className="grid grid-cols-8 gap-1.5">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setStrokeColor(color)}
                      className={`h-8 w-8 min-touch rounded-full border-2 transition-all hover:scale-110 ${
                        strokeColor === color
                          ? 'border-emerald-500 ring-2 ring-emerald-500/30 scale-110'
                          : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={`Color ${color}`}
                    />
                  ))}
                </div>
                <div className="mt-2 text-xs font-medium text-gray-500">
                  {t('drawing.tool_pen')} {t('drawing.color').toLowerCase()}
                </div>
                <div className="grid grid-cols-8 gap-1.5">
                  {PEN_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setStrokeColor(color)}
                      className={`h-8 w-8 min-touch rounded-full border-2 transition-all hover:scale-110 ${
                        strokeColor === color
                          ? 'border-emerald-500 ring-2 ring-emerald-500/30 scale-110'
                          : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={`Pen color ${color}`}
                    />
                  ))}
                </div>
                {activeTool === 'highlighter' && (
                  <>
                    <p className="mt-2 text-xs font-medium text-gray-500">
                      {t('drawing.tool_highlighter')}
                    </p>
                    <div className="grid grid-cols-8 gap-1.5">
                      {HIGHLIGHTER_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => setStrokeColor(color)}
                          className={`h-8 w-8 min-touch rounded-full border-2 transition-all hover:scale-110 ${
                            strokeColor === color
                              ? 'border-emerald-500 ring-2 ring-emerald-500/30 scale-110'
                              : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                          aria-label={`Highlighter color ${color}`}
                        />
                      ))}
                    </div>
                  </>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <Label className="text-xs text-gray-500">{t('drawing.color')}</Label>
                  <input
                    type="color"
                    value={strokeColor}
                    onChange={(e) => setStrokeColor(e.target.value)}
                    className="h-8 w-8 min-touch cursor-pointer rounded border"
                    aria-label="Custom color picker"
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Divider */}
          <div className="mx-0.5 sm:mx-1 h-8 w-px bg-gray-700 hidden sm:block" />

          {/* Stroke width */}
          <div className="flex items-center gap-1 sm:gap-2">
            <Palette className="h-4 w-4 text-gray-400 hidden sm:block" />
            <Slider
              value={[strokeWidth]}
              min={1}
              max={20}
              step={1}
              onValueChange={(v) => setStrokeWidth(v[0])}
              className="w-16 sm:w-24"
              aria-label={t('drawing.stroke_width')}
            />
            <span className="min-w-[2rem] text-center text-xs text-gray-400">{strokeWidth}px</span>
          </div>

          {/* Divider */}
          <div className="mx-0.5 sm:mx-1 h-8 w-px bg-gray-700 hidden sm:block" />

          {/* Background type */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 min-touch gap-1 text-gray-300 hover:bg-gray-800 hover:text-white"
                aria-label={t('drawing.bg_type')}
              >
                {bgOptions.find((b) => b.id === bgType)?.icon}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2 max-w-[calc(100vw-2rem)]" side="bottom">
              <div className="space-y-1">
                {bgOptions.map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => setBgType(bg.id)}
                    className={`flex w-full items-center gap-2 rounded-md px-3 py-2 min-h-[44px] text-sm transition-colors ${
                      bgType === bg.id
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'hover:bg-gray-100'
                    }`}
                    aria-pressed={bgType === bg.id}
                  >
                    {bg.icon}
                    {bg.label}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Guide mode */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 min-touch gap-1 text-gray-300 hover:bg-gray-800 hover:text-white"
                aria-label={t('drawing.guide_mode')}
              >
                {guideMode === 'off' ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4 text-emerald-400" />
                )}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2 max-w-[calc(100vw-2rem)]" side="bottom">
              <div className="space-y-1">
                {guideOptions.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setGuideMode(g.id)}
                    className={`flex w-full items-center gap-2 rounded-md px-3 py-2 min-h-[44px] text-sm transition-colors ${
                      guideMode === g.id
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'hover:bg-gray-100'
                    }`}
                    aria-pressed={guideMode === g.id}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Divider */}
          <div className="mx-0.5 sm:mx-1 h-8 w-px bg-gray-700 hidden sm:block" />

          {/* Undo / Redo */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleUndo}
                  disabled={strokes.length === 0}
                  className="h-10 w-10 min-touch text-gray-300 hover:bg-gray-800 hover:text-white disabled:opacity-30 transition-transform active:scale-90"
                  aria-label={t('drawing.undo')}
                >
                  <Undo2 className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('drawing.undo')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRedo}
                  disabled={redoStack.length === 0}
                  className="h-10 w-10 min-touch text-gray-300 hover:bg-gray-800 hover:text-white disabled:opacity-30 transition-transform active:scale-90"
                  aria-label={t('drawing.redo')}
                >
                  <Redo2 className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('drawing.redo')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Divider */}
          <div className="mx-0.5 sm:mx-1 h-8 w-px bg-gray-700 hidden sm:block" />

          {/* Zoom controls */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setZoomLevel(Math.max(25, zoomLevel - 25))}
                  disabled={zoomLevel <= 25}
                  className="h-10 w-10 min-touch text-gray-300 hover:bg-gray-800 hover:text-white disabled:opacity-30"
                  aria-label={t('drawing.zoom_out')}
                >
                  <ZoomOut className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('drawing.zoom_out')}</TooltipContent>
            </Tooltip>
            <span className="text-xs text-gray-400 min-w-[2rem] text-center">{zoomLevel}%</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setZoomLevel(Math.min(200, zoomLevel + 25))}
                  disabled={zoomLevel >= 200}
                  className="h-10 w-10 min-touch text-gray-300 hover:bg-gray-800 hover:text-white disabled:opacity-30"
                  aria-label={t('drawing.zoom_in')}
                >
                  <ZoomIn className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('drawing.zoom_in')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* FPS Toggle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFps(!showFps)}
                  className={`h-10 w-10 min-touch text-gray-300 hover:bg-gray-800 hover:text-white ${showFps ? 'text-emerald-400' : ''}`}
                  aria-label={t('performance.title')}
                >
                  <Activity className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('performance.fps')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Eco message */}
          <div className="hidden items-center gap-1.5 text-xs text-emerald-400 md:flex">
            <Leaf className="h-3.5 w-3.5" />
            <span>{t('drawing.eco_message')}</span>
          </div>

          {/* Clear / Save / Export */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowClearDialog(true)}
                  className="h-10 w-10 min-touch text-gray-300 hover:bg-red-900/50 hover:text-red-300"
                  aria-label={t('drawing.clear')}
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('drawing.clear')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExportPNG}
                  className="h-10 w-10 min-touch text-gray-300 hover:bg-gray-800 hover:text-white"
                  aria-label={t('drawing.export_png')}
                >
                  <Download className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('drawing.export_png')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSaveDialog(true)}
                  className="h-10 min-touch gap-1 bg-emerald-600 text-white hover:bg-emerald-700"
                  aria-label={t('drawing.save')}
                >
                  <Save className="h-5 w-5" />
                  <span className="hidden sm:inline">{t('drawing.save')}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('drawing.save')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Auto-save indicator */}
        {lastAutoSave && (
          <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
            <Leaf className="h-3 w-3" />
            {t('drawing.auto_save')}: {lastAutoSave.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* FPS Counter */}
      {showFps && (
        <div className="fps-counter">
          {fpsDisplay} FPS
        </div>
      )}

      {/* ── Canvas Area ────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-gray-100 p-2 sm:p-4"
      >
        <div
          className="relative mx-auto overflow-hidden rounded-lg shadow-lg canvas-toolbar canvas-gpu"
          style={{
            width: `${zoomLevel}%`,
            maxWidth: '100%',
            height: `${zoomLevel}%`,
            maxHeight: '100%',
            transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : undefined,
            transformOrigin: 'center center',
          }}
        >
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className="h-full w-full cursor-crosshair touch-none canvas-no-zoom canvas-no-select"
            style={{
              imageRendering: 'auto',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            role="img"
            aria-label={t('drawing.canvas_label') || 'Drawing canvas'}
          />
          {/* Tool indicator */}
          <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2">
            <Badge
              variant="secondary"
              className="bg-white/90 text-gray-700 shadow-sm backdrop-blur-sm"
            >
              {tools.find((t) => t.id === activeTool)?.label}
            </Badge>
            {guideMode !== 'off' && (
              <Badge
                variant="secondary"
                className="bg-emerald-100/90 text-emerald-700 shadow-sm backdrop-blur-sm"
              >
                {t('drawing.guide_mode')}: {guideOptions.find((g) => g.id === guideMode)?.label}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* ── Clear Dialog / Drawer ───────────────────────────────────── */}
      {isMobile ? (
        <Drawer open={showClearDialog} onOpenChange={setShowClearDialog}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{t('drawing.clear_confirm')}</DrawerTitle>
              <DrawerDescription>{t('drawing.delete_desc')}</DrawerDescription>
            </DrawerHeader>
            <DrawerFooter>
              <Button variant="outline" onClick={() => setShowClearDialog(false)}>
                {t('action.cancel')}
              </Button>
              <Button variant="destructive" onClick={handleClear}>
                {t('drawing.clear')}
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('drawing.clear_confirm')}</DialogTitle>
              <DialogDescription>
                {t('drawing.delete_desc')}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowClearDialog(false)}>
                {t('action.cancel')}
              </Button>
              <Button variant="destructive" onClick={handleClear}>
                {t('drawing.clear')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Save Dialog / Drawer ────────────────────────────────────── */}
      {isMobile ? (
        <Drawer open={showSaveDialog} onOpenChange={setShowSaveDialog}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{t('drawing.save')}</DrawerTitle>
              <DrawerDescription>{t('drawing.eco_tip')}</DrawerDescription>
            </DrawerHeader>
            <div className="px-4 space-y-4">
              <div>
                <Label htmlFor="drawing-title-mobile">{t('drawing.title_label')}</Label>
                <Input
                  id="drawing-title-mobile"
                  value={drawingTitle}
                  onChange={(e) => setDrawingTitle(e.target.value)}
                  placeholder={t('drawing.untitled')}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="drawing-desc-mobile">{t('drawing.description_label')}</Label>
                <Textarea
                  id="drawing-desc-mobile"
                  value={drawingDescription}
                  onChange={(e) => setDrawingDescription(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
            <DrawerFooter>
              <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                {t('action.cancel')}
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700">
                {isSaving ? t('drawing.saving') : t('drawing.save')}
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('drawing.save')}</DialogTitle>
              <DialogDescription>
                {t('drawing.eco_tip')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="drawing-title">{t('drawing.title_label')}</Label>
                <Input
                  id="drawing-title"
                  value={drawingTitle}
                  onChange={(e) => setDrawingTitle(e.target.value)}
                  placeholder={t('drawing.untitled')}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="drawing-desc">{t('drawing.description_label')}</Label>
                <Textarea
                  id="drawing-desc"
                  value={drawingDescription}
                  onChange={(e) => setDrawingDescription(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                {t('action.cancel')}
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700">
                {isSaving ? t('drawing.saving') : t('drawing.save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
