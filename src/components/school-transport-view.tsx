'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bus,
  Plus,
  Search,
  MapPin,
  Clock,
  Users,
  Edit,
  Trash2,
  Eye,
  ChevronLeft,
  Check,
  AlertTriangle,
  BarChart3,
  Route,
  Bike,
  Car,
  TrainFront,
  Footprints,
  ArrowRight,
  UserPlus,
  Phone,
  PhoneCall,
  UserCheck,
  Info,
  RefreshCw,
  Navigation,
  UsersRound,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';

/* ─── Types ──────────────────────────────────────────────────────── */

interface TransportStopData {
  id: string;
  routeId: string;
  stopName: string;
  stopOrder: number;
  pickupTime: string | null;
  dropoffTime: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface TransportRouteData {
  id: string;
  schoolId: string;
  routeNumber: string;
  routeName: string;
  transportType: string;
  driverName: string | null;
  driverPhone: string | null;
  capacity: number;
  isActive: boolean;
  notes: string | null;
  stops: TransportStopData[];
  _count: { assignments: number };
  assignments?: StudentTransportData[];
}

interface StudentInfo {
  id: string;
  firstName: string;
  lastName: string;
}

interface RouteInfo {
  id: string;
  routeNumber: string;
  routeName: string;
  transportType: string;
}

interface StudentTransportData {
  id: string;
  schoolId: string;
  studentId: string;
  transportType: string;
  routeNumber: string | null;
  stopName: string | null;
  pickupTime: string | null;
  dropoffTime: string | null;
  driverName: string | null;
  driverPhone: string | null;
  distanceKm: number | null;
  routeId: string | null;
  notes: string | null;
  student: StudentInfo;
  route: RouteInfo | null;
}

/* ─── Constants ──────────────────────────────────────────────────── */

const TRANSPORT_TYPES = ['bus', 'tram', 'train', 'walk', 'car', 'bike', 'other'] as const;

const TRANSPORT_COLORS: Record<string, string> = {
  bus: '#10b981',
  tram: '#14b8a6',
  train: '#0ea5e9',
  walk: '#f59e0b',
  car: '#6366f1',
  bike: '#22c55e',
  other: '#94a3b8',
};

const TRANSPORT_ICONS: Record<string, React.ReactNode> = {
  bus: <Bus className="h-4 w-4" />,
  tram: <TrainFront className="h-4 w-4" />,
  train: <TrainFront className="h-4 w-4" />,
  walk: <Footprints className="h-4 w-4" />,
  car: <Car className="h-4 w-4" />,
  bike: <Bike className="h-4 w-4" />,
  other: <Route className="h-4 w-4" />,
};

/* ─── Animation Variants ────────────────────────────────────────── */

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const cardHover = {
  whileHover: { y: -2, boxShadow: '0 8px 30px rgba(0,0,0,0.12)' },
  transition: { type: 'spring', stiffness: 300, damping: 20 },
};

/* ─── Animated Counter ───────────────────────────────────────────── */

function AnimatedCounter({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = React.useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      ref.current = Math.round(eased * target);
      setCount(ref.current);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, duration]);

  return <span>{count}</span>;
}

/* ─── Transport Type Badge ───────────────────────────────────────── */

function TransportTypeBadge({ type }: { type: string }) {
  const color = TRANSPORT_COLORS[type] || TRANSPORT_COLORS.other;
  const icon = TRANSPORT_ICONS[type] || TRANSPORT_ICONS.other;
  const labelKey = `transport.type_${type}`;

  return (
    <Badge
      variant="outline"
      className="gap-1.5 font-medium"
      style={{ borderColor: color, color }}
    >
      {icon}
      {t(labelKey)}
    </Badge>
  );
}

/* ─── Capacity Bar ───────────────────────────────────────────────── */

function CapacityBar({ current, max }: { current: number; max: number }) {
  const pct = max > 0 ? Math.round((current / max) * 100) : 0;
  const isOver = pct > 100;
  const isWarn = pct > 80 && !isOver;
  const barColor = isOver ? 'bg-red-500' : isWarn ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {current}/{max}
        </span>
        <span className={isOver ? 'text-red-500 font-semibold' : isWarn ? 'text-amber-500' : 'text-emerald-500'}>
          {pct}%
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(pct, 100)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

/* ─── Timeline Stop ──────────────────────────────────────────────── */

function TimelineStop({
  stop,
  isFirst,
  isLast,
}: {
  stop: TransportStopData;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <div className={`h-3 w-3 rounded-full ${isFirst ? 'bg-emerald-500' : isLast ? 'bg-red-500' : 'bg-teal-500'}`} />
        {!isLast && <div className="w-0.5 h-8 bg-border" />}
      </div>
      <div className="pb-4 min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-sm truncate">{stop.stopName}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
            {stop.pickupTime && (
              <span className="flex items-center gap-0.5">
                <ArrowRight className="h-3 w-3" />
                {stop.pickupTime}
              </span>
            )}
            {stop.dropoffTime && (
              <span className="flex items-center gap-0.5">
                <ChevronLeft className="h-3 w-3" />
                {stop.dropoffTime}
              </span>
            )}
          </div>
        </div>
        {stop.address && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{stop.address}</p>
        )}
      </div>
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────────── */

export default function SchoolTransportView() {
  const { currentUser, locale } = useAppStore();
  const schoolId = currentUser?.schoolId || '';
  const role = currentUser?.role || 'TEACHER';

  const isAdmin = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'VICE_PRINCIPAL'].includes(role);
  const isTeacher = role === 'TEACHER';
  const isStudent = role === 'STUDENT';
  const isParent = role === 'PARENT';

  // State
  const [routes, setRoutes] = useState<TransportRouteData[]>([]);
  const [transports, setTransports] = useState<StudentTransportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterActive, setFilterActive] = useState('all');

  // Dialog state
  const [showRouteDialog, setShowRouteDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);

  // Form state
  const [editingRoute, setEditingRoute] = useState<TransportRouteData | null>(null);
  const [editingTransport, setEditingTransport] = useState<StudentTransportData | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<TransportRouteData | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingType, setDeletingType] = useState<'route' | 'transport'>('route');

  // Route form
  const [formRouteNumber, setFormRouteNumber] = useState('');
  const [formRouteName, setFormRouteName] = useState('');
  const [formRouteTransportType, setFormRouteTransportType] = useState('bus');
  const [formDriverName, setFormDriverName] = useState('');
  const [formDriverPhone, setFormDriverPhone] = useState('');
  const [formCapacity, setFormCapacity] = useState(40);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formNotes, setFormNotes] = useState('');

  // Transport form
  const [formStudentId, setFormStudentId] = useState('');
  const [formTransportType, setFormTransportType] = useState('bus');
  const [formRouteId, setFormRouteId] = useState('');
  const [formPickupTime, setFormPickupTime] = useState('');
  const [formDropoffTime, setFormDropoffTime] = useState('');
  const [formTransportStopName, setFormTransportStopName] = useState('');
  const [formDistanceKm, setFormDistanceKm] = useState('');

  // Stop form
  const [formStopName, setFormStopName] = useState('');
  const [formStopOrder, setFormStopOrder] = useState('');
  const [formStopPickupTime, setFormStopPickupTime] = useState('');
  const [formStopDropoffTime, setFormStopDropoffTime] = useState('');
  const [formStopAddress, setFormStopAddress] = useState('');

  // Bulk assignment
  const [bulkStudentIds, setBulkStudentIds] = useState<string[]>([]);
  const [bulkTransportType, setBulkTransportType] = useState('bus');
  const [bulkRouteId, setBulkRouteId] = useState('');
  const [bulkPickupTime, setBulkPickupTime] = useState('');
  const [bulkDropoffTime, setBulkDropoffTime] = useState('');

  // Saving
  const [saving, setSaving] = useState(false);

  /* ─── Data Fetching ─────────────────────────────────────────────── */

  const fetchRoutes = useCallback(async () => {
    try {
      const res = await fetch(`/api/transport-routes?schoolId=${schoolId}`);
      if (res.ok) {
        const data = await res.json();
        setRoutes(data);
      }
    } catch (err) {
      console.error('Fetch routes error:', err);
    }
  }, [schoolId]);

  const fetchTransports = useCallback(async () => {
    try {
      const res = await fetch(`/api/student-transport?schoolId=${schoolId}`);
      if (res.ok) {
        const data = await res.json();
        setTransports(data);
      }
    } catch (err) {
      console.error('Fetch transports error:', err);
    }
  }, [schoolId]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchRoutes(), fetchTransports()]);
    setLoading(false);
  }, [fetchRoutes, fetchTransports]);

  useEffect(() => {
    if (schoolId) loadAll();
  }, [schoolId, loadAll]);

  /* ─── Computed Stats ────────────────────────────────────────────── */

  const stats = useMemo(() => {
    const typeCounts: Record<string, number> = {};
    TRANSPORT_TYPES.forEach((tp) => { typeCounts[tp] = 0; });
    transports.forEach((t) => {
      typeCounts[t.transportType] = (typeCounts[t.transportType] || 0) + 1;
    });

    const totalStudents = transports.length;
    const activeRoutes = routes.filter((r) => r.isActive).length;
    const totalCapacity = routes.filter((r) => r.isActive).reduce((s, r) => s + r.capacity, 0);
    const totalAssigned = transports.filter((t) => t.routeId).length;
    const avgDistance = transports.reduce((s, t) => s + (t.distanceKm || 0), 0) / (totalStudents || 1);
    const overCapacity = routes.filter((r) => r._count.assignments > r.capacity).length;

    return {
      totalStudents,
      activeRoutes,
      totalCapacity,
      totalAssigned,
      avgDistance: Math.round(avgDistance * 10) / 10,
      overCapacity,
      typeCounts,
    };
  }, [routes, transports]);

  const pieData = useMemo(() => {
    return TRANSPORT_TYPES
      .map((tp) => ({ name: t(`transport.type_${tp}`), value: stats.typeCounts[tp], color: TRANSPORT_COLORS[tp] }))
      .filter((d) => d.value > 0);
  }, [stats.typeCounts]);

  const routeCapacityData = useMemo(() => {
    return routes
      .filter((r) => r.isActive)
      .map((r) => ({
        name: r.routeNumber,
        routeName: r.routeName,
        assigned: r._count.assignments,
        capacity: r.capacity,
      }));
  }, [routes]);

  /* ─── Filtered Lists ────────────────────────────────────────────── */

  const filteredRoutes = useMemo(() => {
    let result = [...routes];
    if (filterActive !== 'all') {
      result = result.filter((r) => filterActive === 'active' ? r.isActive : !r.isActive);
    }
    if (filterType !== 'all') {
      result = result.filter((r) => r.transportType === filterType);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.routeNumber.toLowerCase().includes(q) ||
          r.routeName.toLowerCase().includes(q) ||
          (r.driverName || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [routes, filterActive, filterType, searchQuery]);

  const filteredTransports = useMemo(() => {
    let result = [...transports];
    if (filterType !== 'all') {
      result = result.filter((t) => t.transportType === filterType);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          `${t.student.firstName} ${t.student.lastName}`.toLowerCase().includes(q) ||
          (t.stopName || '').toLowerCase().includes(q) ||
          (t.route?.routeName || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [transports, filterType, searchQuery]);

  /* ─── Handlers ──────────────────────────────────────────────────── */

  const resetRouteForm = () => {
    setFormRouteNumber('');
    setFormRouteName('');
    setFormRouteTransportType('bus');
    setFormDriverName('');
    setFormDriverPhone('');
    setFormCapacity(40);
    setFormIsActive(true);
    setFormNotes('');
    setEditingRoute(null);
  };

  const resetTransportForm = () => {
    setFormStudentId('');
    setFormTransportType('bus');
    setFormRouteId('');
    setFormPickupTime('');
    setFormDropoffTime('');
    setFormTransportStopName('');
    setFormDistanceKm('');
    setEditingTransport(null);
  };

  const resetStopForm = () => {
    setFormStopName('');
    setFormStopOrder('');
    setFormStopPickupTime('');
    setFormStopDropoffTime('');
    setFormStopAddress('');
  };

  const openCreateRoute = () => {
    resetRouteForm();
    setShowRouteDialog(true);
  };

  const openEditRoute = (route: TransportRouteData) => {
    setEditingRoute(route);
    setFormRouteNumber(route.routeNumber);
    setFormRouteName(route.routeName);
    setFormRouteTransportType(route.transportType);
    setFormDriverName(route.driverName || '');
    setFormDriverPhone(route.driverPhone || '');
    setFormCapacity(route.capacity);
    setFormIsActive(route.isActive);
    setFormNotes(route.notes || '');
    setShowRouteDialog(true);
  };

  const openCreateTransport = () => {
    resetTransportForm();
    setShowAssignDialog(true);
  };

  const openEditTransport = (transport: StudentTransportData) => {
    setEditingTransport(transport);
    setFormStudentId(transport.studentId);
    setFormTransportType(transport.transportType);
    setFormRouteId(transport.routeId || '');
    setFormPickupTime(transport.pickupTime || '');
    setFormDropoffTime(transport.dropoffTime || '');
    setFormTransportStopName(transport.stopName || '');
    setFormDistanceKm(transport.distanceKm?.toString() || '');
    setShowAssignDialog(true);
  };

  const openAddStop = (route: TransportRouteData) => {
    setSelectedRoute(route);
    resetStopForm();
    setShowStopDialog(true);
  };

  const openRouteDetail = (route: TransportRouteData) => {
    setSelectedRoute(route);
    setShowDetailDialog(true);
  };

  const confirmDelete = (id: string, type: 'route' | 'transport') => {
    setDeletingId(id);
    setDeletingType(type);
    setShowDeleteDialog(true);
  };

  /* ─── Save Handlers ─────────────────────────────────────────────── */

  const handleSaveRoute = async () => {
    setSaving(true);
    try {
      const payload = {
        schoolId,
        routeNumber: formRouteNumber,
        routeName: formRouteName,
        transportType: formRouteTransportType,
        driverName: formDriverName,
        driverPhone: formDriverPhone,
        capacity: formCapacity,
        isActive: formIsActive,
        notes: formNotes,
      };

      if (editingRoute) {
        const res = await fetch(`/api/transport-routes/${editingRoute.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to update route');
      } else {
        const res = await fetch('/api/transport-routes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to create route');
      }

      setShowRouteDialog(false);
      resetRouteForm();
      await fetchRoutes();
    } catch (err) {
      console.error('Save route error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTransport = async () => {
    setSaving(true);
    try {
      const payload = {
        schoolId,
        studentId: formStudentId,
        transportType: formTransportType,
        routeId: formRouteId || null,
        pickupTime: formPickupTime || null,
        dropoffTime: formDropoffTime || null,
        stopName: formTransportStopName || null,
        distanceKm: formDistanceKm ? parseFloat(formDistanceKm) : null,
      };

      if (editingTransport) {
        const res = await fetch(`/api/student-transport/${editingTransport.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to update transport');
      } else {
        const res = await fetch('/api/student-transport', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to create transport');
      }

      setShowAssignDialog(false);
      resetTransportForm();
      await fetchTransports();
      await fetchRoutes();
    } catch (err) {
      console.error('Save transport error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStop = async () => {
    if (!selectedRoute) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/transport-routes/${selectedRoute.id}/stops`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stopName: formStopName,
          stopOrder: formStopOrder ? parseInt(formStopOrder) : undefined,
          pickupTime: formStopPickupTime || null,
          dropoffTime: formStopDropoffTime || null,
          address: formStopAddress || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to add stop');

      setShowStopDialog(false);
      resetStopForm();
      await fetchRoutes();
      if (selectedRoute.id === selectedRoute?.id) {
        const updated = await (await fetch(`/api/transport-routes?schoolId=${schoolId}`)).json();
        const found = updated.find((r: TransportRouteData) => r.id === selectedRoute.id);
        if (found) setSelectedRoute(found);
      }
    } catch (err) {
      console.error('Save stop error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setSaving(true);
    try {
      const endpoint = deletingType === 'route'
        ? `/api/transport-routes/${deletingId}`
        : `/api/student-transport/${deletingId}`;
      const res = await fetch(endpoint, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');

      setShowDeleteDialog(false);
      setDeletingId(null);
      if (deletingType === 'route') {
        await fetchRoutes();
      } else {
        await fetchTransports();
        await fetchRoutes();
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleBulkAssign = async () => {
    if (bulkStudentIds.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch('/api/student-transport/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId,
          studentIds: bulkStudentIds,
          transportType: bulkTransportType,
          routeId: bulkRouteId || null,
          pickupTime: bulkPickupTime || null,
          dropoffTime: bulkDropoffTime || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to bulk assign');

      setShowBulkDialog(false);
      setBulkStudentIds([]);
      await fetchTransports();
      await fetchRoutes();
    } catch (err) {
      console.error('Bulk assign error:', err);
    } finally {
      setSaving(false);
    }
  };

  /* ─── Render Helpers ────────────────────────────────────────────── */

  const renderStatCard = (
    title: string,
    value: number,
    icon: React.ReactNode,
    color: string,
    suffix?: string
  ) => (
    <motion.div {...fadeIn} {...cardHover}>
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{ background: `linear-gradient(135deg, ${color}, transparent)` }} />
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
              <p className="text-2xl font-bold mt-1" style={{ color }}>
                <AnimatedCounter target={value} />
                {suffix && <span className="text-sm font-normal ml-1">{suffix}</span>}
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
              <span style={{ color }}>{icon}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  /* ─── Overview Dashboard ────────────────────────────────────────── */

  const renderOverview = () => (
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {renderStatCard(t('transport.total_students'), stats.totalStudents, <Users className="h-5 w-5" />, '#10b981')}
        {renderStatCard(t('transport.active_routes'), stats.activeRoutes, <Route className="h-5 w-5" />, '#14b8a6')}
        {renderStatCard(t('transport.total_capacity'), stats.totalCapacity, <Bus className="h-5 w-5" />, '#0ea5e9')}
        {renderStatCard(t('transport.avg_distance'), stats.avgDistance, <Navigation className="h-5 w-5" />, '#f59e0b', 'km')}
      </div>

      {/* Warning Cards */}
      {stats.overCapacity > 0 && (
        <motion.div {...fadeIn}>
          <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
              <div>
                <p className="font-semibold text-red-700 dark:text-red-400">
                  {stats.overCapacity} {t('transport.over_capacity_warning')}
                </p>
                <p className="text-sm text-red-600 dark:text-red-500">{t('transport.over_capacity_desc')}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transport Type Distribution */}
        <motion.div {...fadeIn}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t('transport.type_distribution')}</CardTitle>
              <CardDescription>{t('transport.type_distribution_desc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">{t('transport.no_data')}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Route Capacity Chart */}
        <motion.div {...fadeIn}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t('transport.route_capacity')}</CardTitle>
              <CardDescription>{t('transport.route_capacity_desc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {routeCapacityData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={routeCapacityData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="bg-popover border rounded-lg p-2 shadow-lg text-sm">
                            <p className="font-medium">{data.routeName}</p>
                            <p className="text-emerald-600">{t('transport.assigned')}: {data.assigned}</p>
                            <p className="text-muted-foreground">{t('transport.capacity')}: {data.capacity}</p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="capacity" fill="#e2e8f0" name={t('transport.capacity')} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="assigned" fill="#10b981" name={t('transport.assigned')} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">{t('transport.no_routes_data')}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Transport Type Summary Cards */}
      <motion.div {...fadeIn}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('transport.type_summary')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {TRANSPORT_TYPES.map((tp) => (
                <div
                  key={tp}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg border hover:shadow-md transition-shadow cursor-pointer"
                  style={{ borderColor: `${TRANSPORT_COLORS[tp]}30` }}
                  onClick={() => { setFilterType(tp); setActiveTab('routes'); }}
                >
                  <span style={{ color: TRANSPORT_COLORS[tp] }}>{TRANSPORT_ICONS[tp]}</span>
                  <span className="text-xl font-bold" style={{ color: TRANSPORT_COLORS[tp] }}>
                    {stats.typeCounts[tp]}
                  </span>
                  <span className="text-xs text-muted-foreground text-center">{t(`transport.type_${tp}`)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions for Admin */}
      {isAdmin && (
        <motion.div {...fadeIn}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t('transport.quick_actions')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button onClick={openCreateRoute} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="h-4 w-4" /> {t('transport.add_route')}
                </Button>
                <Button onClick={openCreateTransport} variant="outline" className="gap-2">
                  <UserPlus className="h-4 w-4" /> {t('transport.assign_transport')}
                </Button>
                <Button onClick={() => setShowBulkDialog(true)} variant="outline" className="gap-2">
                  <UsersRound className="h-4 w-4" /> {t('transport.bulk_assign')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );

  /* ─── Bus Route Management ──────────────────────────────────────── */

  const renderRoutes = () => (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('transport.search_routes')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t('transport.filter_type')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('transport.all_types')}</SelectItem>
              {TRANSPORT_TYPES.map((tp) => (
                <SelectItem key={tp} value={tp}>{t(`transport.type_${tp}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterActive} onValueChange={setFilterActive}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t('transport.filter_status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('transport.all_status')}</SelectItem>
              <SelectItem value="active">{t('transport.active')}</SelectItem>
              <SelectItem value="inactive">{t('transport.inactive')}</SelectItem>
            </SelectContent>
          </Select>
          {isAdmin && (
            <Button onClick={openCreateRoute} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4" /> {t('transport.add_route')}
            </Button>
          )}
        </div>
      </div>

      {/* Route Cards */}
      <AnimatePresence mode="popLayout">
        {filteredRoutes.length > 0 ? (
          <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredRoutes.map((route) => (
              <motion.div key={route.id} variants={fadeIn} layout {...cardHover}>
                <Card className={`h-full flex flex-col ${!route.isActive ? 'opacity-60' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${TRANSPORT_COLORS[route.transportType] || TRANSPORT_COLORS.other}15` }}>
                          <span style={{ color: TRANSPORT_COLORS[route.transportType] || TRANSPORT_COLORS.other }}>
                            {TRANSPORT_ICONS[route.transportType] || TRANSPORT_ICONS.other}
                          </span>
                        </div>
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            {route.routeNumber}
                            {!route.isActive && (
                              <Badge variant="secondary" className="text-xs">{t('transport.inactive')}</Badge>
                            )}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground">{route.routeName}</p>
                        </div>
                      </div>
                      <TransportTypeBadge type={route.transportType} />
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col gap-3">
                    {/* Driver Info */}
                    {route.driverName && (
                      <div className="flex items-center gap-2 text-sm">
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                        <span>{route.driverName}</span>
                        {route.driverPhone && (
                          <a href={`tel:${route.driverPhone}`} className="text-emerald-600 hover:text-emerald-700 ml-auto">
                            <Phone className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    )}

                    {/* Capacity */}
                    <CapacityBar current={route._count.assignments} max={route.capacity} />

                    {/* Stops */}
                    {route.stops.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">{t('transport.stops_count', { count: route.stops.length })}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{route.stops.map((s) => s.stopName).join(' → ')}</span>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-auto pt-2 border-t">
                      <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => openRouteDetail(route)}>
                        <Eye className="h-3.5 w-3.5" /> {t('action.view')}
                      </Button>
                      {isAdmin && (
                        <>
                          <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => openEditRoute(route)}>
                            <Edit className="h-3.5 w-3.5" /> {t('action.edit')}
                          </Button>
                          <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => openAddStop(route)}>
                            <MapPin className="h-3.5 w-3.5" /> {t('transport.add_stop')}
                          </Button>
                          <Button variant="ghost" size="sm" className="gap-1 text-xs text-red-500 hover:text-red-600" onClick={() => confirmDelete(route.id, 'route')}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div {...fadeIn} className="text-center py-16">
            <Bus className="h-12 w-12 mx-auto text-muted-foreground opacity-40" />
            <p className="text-muted-foreground mt-3">{t('transport.no_routes')}</p>
            {isAdmin && (
              <Button onClick={openCreateRoute} className="mt-4 gap-2 bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4" /> {t('transport.create_first_route')}
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  /* ─── Student Transport Assignment ──────────────────────────────── */

  const renderAssignments = () => (
    <div className="space-y-4">
      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('transport.search_students')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t('transport.filter_type')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('transport.all_types')}</SelectItem>
              {TRANSPORT_TYPES.map((tp) => (
                <SelectItem key={tp} value={tp}>{t(`transport.type_${tp}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isAdmin && (
            <>
              <Button onClick={openCreateTransport} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                <UserPlus className="h-4 w-4" /> {t('transport.assign_transport')}
              </Button>
              <Button onClick={() => setShowBulkDialog(true)} variant="outline" className="gap-2">
                <UsersRound className="h-4 w-4" /> {t('transport.bulk_assign')}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Transport Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('transport.student')}</TableHead>
                  <TableHead>{t('transport.type')}</TableHead>
                  <TableHead>{t('transport.route')}</TableHead>
                  <TableHead>{t('transport.stop')}</TableHead>
                  <TableHead>{t('transport.pickup')}</TableHead>
                  <TableHead>{t('transport.dropoff')}</TableHead>
                  <TableHead>{t('transport.distance')}</TableHead>
                  {isAdmin && <TableHead className="text-right">{t('transport.actions')}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransports.length > 0 ? (
                  filteredTransports.map((tr) => (
                    <TableRow key={tr.id}>
                      <TableCell className="font-medium">
                        {tr.student.firstName} {tr.student.lastName}
                      </TableCell>
                      <TableCell>
                        <TransportTypeBadge type={tr.transportType} />
                      </TableCell>
                      <TableCell>
                        {tr.route ? (
                          <span className="text-sm">{tr.route.routeNumber} - {tr.route.routeName}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{tr.stopName || '—'}</TableCell>
                      <TableCell className="text-sm font-mono">{tr.pickupTime || '—'}</TableCell>
                      <TableCell className="text-sm font-mono">{tr.dropoffTime || '—'}</TableCell>
                      <TableCell className="text-sm">{tr.distanceKm ? `${tr.distanceKm} km` : '—'}</TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditTransport(tr)}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => confirmDelete(tr.id, 'transport')}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 8 : 7} className="text-center py-8 text-muted-foreground">
                      {t('transport.no_assignments')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  /* ─── Transport Schedule ────────────────────────────────────────── */

  const renderSchedule = () => {
    const activeRoutes = routes.filter((r) => r.isActive && r.stops.length > 0);

    return (
      <div className="space-y-4">
        {activeRoutes.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeRoutes.map((route) => (
              <motion.div key={route.id} {...fadeIn} {...cardHover}>
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${TRANSPORT_COLORS[route.transportType] || TRANSPORT_COLORS.other}15` }}>
                        <span style={{ color: TRANSPORT_COLORS[route.transportType] || TRANSPORT_COLORS.other }}>
                          {TRANSPORT_ICONS[route.transportType] || TRANSPORT_ICONS.other}
                        </span>
                      </div>
                      <div>
                        <CardTitle className="text-base">{route.routeNumber} — {route.routeName}</CardTitle>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          {route.driverName && (
                            <span className="flex items-center gap-1">
                              <UserCheck className="h-3 w-3" /> {route.driverName}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" /> {route._count.assignments}/{route.capacity}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-0">
                      {route.stops.map((stop, idx) => (
                        <TimelineStop
                          key={stop.id}
                          stop={stop}
                          isFirst={idx === 0}
                          isLast={idx === route.stops.length - 1}
                        />
                      ))}
                    </div>
                    {route.driverPhone && (
                      <div className="mt-3 pt-3 border-t flex items-center gap-2">
                        <PhoneCall className="h-4 w-4 text-emerald-600" />
                        <a href={`tel:${route.driverPhone}`} className="text-sm text-emerald-600 hover:text-emerald-700">
                          {route.driverPhone}
                        </a>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div {...fadeIn} className="text-center py-16">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground opacity-40" />
            <p className="text-muted-foreground mt-3">{t('transport.no_schedule')}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('transport.no_schedule_desc')}</p>
          </motion.div>
        )}
      </div>
    );
  };

  /* ─── Student / Parent View ─────────────────────────────────────── */

  const renderStudentView = () => {
    // For students, show only their own transport
    const myTransport = transports.filter((t) => t.studentId === currentUser?.id);
    // For parents, show their children's transport
    const childTransports = transports;

    const displayTransports = isStudent ? myTransport : childTransports;

    return (
      <div className="space-y-6">
        <motion.div {...fadeIn}>
          <Card className="overflow-hidden">
            <div className="h-28 bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center">
              <div className="text-center text-white">
                <Bus className="h-10 w-10 mx-auto mb-1" />
                <p className="text-lg font-semibold">{t('transport.my_transport')}</p>
              </div>
            </div>
            <CardContent className="p-6">
              {displayTransports.length > 0 ? (
                <div className="space-y-4">
                  {displayTransports.map((tr) => (
                    <div key={tr.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">
                          {isStudent ? t('transport.my_route') : `${tr.student.firstName} ${tr.student.lastName}`}
                        </h3>
                        <TransportTypeBadge type={tr.transportType} />
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {tr.route && (
                          <div className="flex items-center gap-2">
                            <Route className="h-4 w-4 text-muted-foreground" />
                            <span>{tr.route.routeNumber} - {tr.route.routeName}</span>
                          </div>
                        )}
                        {tr.stopName && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{tr.stopName}</span>
                          </div>
                        )}
                        {tr.pickupTime && (
                          <div className="flex items-center gap-2">
                            <ArrowRight className="h-4 w-4 text-emerald-500" />
                            <span>{t('transport.pickup')}: {tr.pickupTime}</span>
                          </div>
                        )}
                        {tr.dropoffTime && (
                          <div className="flex items-center gap-2">
                            <ChevronLeft className="h-4 w-4 text-teal-500" />
                            <span>{t('transport.dropoff')}: {tr.dropoffTime}</span>
                          </div>
                        )}
                        {tr.distanceKm && (
                          <div className="flex items-center gap-2">
                            <Navigation className="h-4 w-4 text-muted-foreground" />
                            <span>{tr.distanceKm} km</span>
                          </div>
                        )}
                      </div>
                      {tr.driverName && (
                        <div className="flex items-center gap-2 text-sm pt-2 border-t">
                          <UserCheck className="h-4 w-4 text-muted-foreground" />
                          <span>{tr.driverName}</span>
                          {tr.driverPhone && (
                            <a href={`tel:${tr.driverPhone}`} className="text-emerald-600 hover:text-emerald-700 ml-2">
                              <Phone className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Info className="h-8 w-8 mx-auto text-muted-foreground opacity-40" />
                  <p className="text-muted-foreground mt-2">{t('transport.no_personal_transport')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Schedule for student/parent */}
        {renderSchedule()}
      </div>
    );
  };

  /* ─── Main Render ───────────────────────────────────────────────── */

  const isStudentOrParent = isStudent || isParent;

  return (
    <div className="min-h-screen bg-background">
      {/* Gradient Header */}
      <div className="relative overflow-hidden">
        <div className="h-36 bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600 relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgMjAgMTAgTSAxMCAwIEwgMTAgMjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40" />
          <div className="relative z-10 h-full flex items-center px-6">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Bus className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{t('transport.title')}</h1>
                <p className="text-emerald-100 text-sm mt-0.5">{t('transport.subtitle')}</p>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-white/80 hover:text-white hover:bg-white/10" onClick={loadAll}>
                      <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('action.refresh')}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 -mt-4 pb-8">
        {isStudentOrParent ? (
          renderStudentView()
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="overview" className="gap-1.5">
                <BarChart3 className="h-4 w-4" /> {t('transport.tab_overview')}
              </TabsTrigger>
              <TabsTrigger value="routes" className="gap-1.5">
                <Route className="h-4 w-4" /> {t('transport.tab_routes')}
              </TabsTrigger>
              <TabsTrigger value="assignments" className="gap-1.5">
                <Users className="h-4 w-4" /> {t('transport.tab_assignments')}
              </TabsTrigger>
              <TabsTrigger value="schedule" className="gap-1.5">
                <Clock className="h-4 w-4" /> {t('transport.tab_schedule')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">{renderOverview()}</TabsContent>
            <TabsContent value="routes">{renderRoutes()}</TabsContent>
            <TabsContent value="assignments">{renderAssignments()}</TabsContent>
            <TabsContent value="schedule">{renderSchedule()}</TabsContent>
          </Tabs>
        )}
      </div>

      {/* ─── Route Dialog ──────────────────────────────────────────── */}
      <Dialog open={showRouteDialog} onOpenChange={setShowRouteDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRoute ? t('transport.edit_route') : t('transport.create_route')}</DialogTitle>
            <DialogDescription>
              {editingRoute ? t('transport.edit_route_desc') : t('transport.create_route_desc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('transport.route_number')}</Label>
                <Input value={formRouteNumber} onChange={(e) => setFormRouteNumber(e.target.value)} placeholder="B1" />
              </div>
              <div className="space-y-2">
                <Label>{t('transport.route_name')}</Label>
                <Input value={formRouteName} onChange={(e) => setFormRouteName(e.target.value)} placeholder={t('transport.route_name_placeholder')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('transport.transport_type')}</Label>
                <Select value={formRouteTransportType} onValueChange={setFormRouteTransportType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSPORT_TYPES.filter((tp) => ['bus', 'tram', 'train'].includes(tp)).map((tp) => (
                      <SelectItem key={tp} value={tp}>{t(`transport.type_${tp}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('transport.capacity')}</Label>
                <Input type="number" value={formCapacity} onChange={(e) => setFormCapacity(parseInt(e.target.value) || 40)} min={1} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('transport.driver_name')}</Label>
                <Input value={formDriverName} onChange={(e) => setFormDriverName(e.target.value)} placeholder={t('transport.driver_name_placeholder')} />
              </div>
              <div className="space-y-2">
                <Label>{t('transport.driver_phone')}</Label>
                <Input value={formDriverPhone} onChange={(e) => setFormDriverPhone(e.target.value)} placeholder="+49..." />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
              <Label>{t('transport.active')}</Label>
            </div>
            <div className="space-y-2">
              <Label>{t('transport.notes')}</Label>
              <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder={t('transport.notes_placeholder')} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRouteDialog(false)}>{t('action.cancel')}</Button>
            <Button onClick={handleSaveRoute} disabled={saving || !formRouteNumber || !formRouteName} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              {t('action.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Transport Assignment Dialog ────────────────────────────── */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTransport ? t('transport.edit_assignment') : t('transport.assign_transport')}</DialogTitle>
            <DialogDescription>
              {editingTransport ? t('transport.edit_assignment_desc') : t('transport.assign_transport_desc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('transport.student_id')}</Label>
              <Input
                value={formStudentId}
                onChange={(e) => setFormStudentId(e.target.value)}
                placeholder={t('transport.student_id_placeholder')}
                disabled={!!editingTransport}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('transport.transport_type')}</Label>
                <Select value={formTransportType} onValueChange={setFormTransportType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSPORT_TYPES.map((tp) => (
                      <SelectItem key={tp} value={tp}>{t(`transport.type_${tp}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('transport.assign_route')}</Label>
                <Select value={formRouteId} onValueChange={setFormRouteId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('transport.no_route')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('transport.no_route')}</SelectItem>
                    {routes.filter((r) => r.isActive).map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.routeNumber} - {r.routeName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('transport.stop_name')}</Label>
              <Input value={formTransportStopName} onChange={(e) => setFormTransportStopName(e.target.value)} placeholder={t('transport.stop_name_placeholder')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('transport.pickup_time')}</Label>
                <Input type="time" value={formPickupTime} onChange={(e) => setFormPickupTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('transport.dropoff_time')}</Label>
                <Input type="time" value={formDropoffTime} onChange={(e) => setFormDropoffTime(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('transport.distance_km')}</Label>
              <Input type="number" step="0.1" value={formDistanceKm} onChange={(e) => setFormDistanceKm(e.target.value)} placeholder="2.5" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>{t('action.cancel')}</Button>
            <Button onClick={handleSaveTransport} disabled={saving || !formStudentId} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              {t('action.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Add Stop Dialog ────────────────────────────────────────── */}
      <Dialog open={showStopDialog} onOpenChange={setShowStopDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('transport.add_stop_to', { route: selectedRoute?.routeNumber || '' })}</DialogTitle>
            <DialogDescription>{t('transport.add_stop_desc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('transport.stop_name')}</Label>
              <Input value={formStopName} onChange={(e) => setFormStopName(e.target.value)} placeholder={t('transport.stop_name_placeholder')} />
            </div>
            <div className="space-y-2">
              <Label>{t('transport.stop_order')}</Label>
              <Input type="number" value={formStopOrder} onChange={(e) => setFormStopOrder(e.target.value)} placeholder={t('transport.stop_order_auto')} min={1} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('transport.pickup_time')}</Label>
                <Input type="time" value={formStopPickupTime} onChange={(e) => setFormStopPickupTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('transport.dropoff_time')}</Label>
                <Input type="time" value={formStopDropoffTime} onChange={(e) => setFormStopDropoffTime(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('transport.address')}</Label>
              <Input value={formStopAddress} onChange={(e) => setFormStopAddress(e.target.value)} placeholder={t('transport.address_placeholder')} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStopDialog(false)}>{t('action.cancel')}</Button>
            <Button onClick={handleSaveStop} disabled={saving || !formStopName} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              {t('action.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Route Detail Dialog ────────────────────────────────────── */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedRoute && (
                <>
                  <span style={{ color: TRANSPORT_COLORS[selectedRoute.transportType] || TRANSPORT_COLORS.other }}>
                    {TRANSPORT_ICONS[selectedRoute.transportType] || TRANSPORT_ICONS.other}
                  </span>
                  {selectedRoute.routeNumber} — {selectedRoute.routeName}
                </>
              )}
            </DialogTitle>
            <DialogDescription>{t('transport.route_detail_desc')}</DialogDescription>
          </DialogHeader>
          {selectedRoute && (
            <div className="space-y-4">
              {/* Route Info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">{t('transport.transport_type')}</p>
                  <TransportTypeBadge type={selectedRoute.transportType} />
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">{t('transport.capacity')}</p>
                  <p className="font-semibold">{selectedRoute._count.assignments}/{selectedRoute.capacity}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">{t('transport.status')}</p>
                  <Badge variant={selectedRoute.isActive ? 'default' : 'secondary'} className={selectedRoute.isActive ? 'bg-emerald-500' : ''}>
                    {selectedRoute.isActive ? t('transport.active') : t('transport.inactive')}
                  </Badge>
                </div>
              </div>

              {/* Driver Info */}
              {selectedRoute.driverName && (
                <div className="p-3 rounded-lg border">
                  <p className="text-xs text-muted-foreground mb-1">{t('transport.driver_info')}</p>
                  <div className="flex items-center gap-3">
                    <UserCheck className="h-5 w-5 text-emerald-600" />
                    <div>
                      <p className="font-medium">{selectedRoute.driverName}</p>
                      {selectedRoute.driverPhone && (
                        <a href={`tel:${selectedRoute.driverPhone}`} className="text-sm text-emerald-600 hover:text-emerald-700">
                          {selectedRoute.driverPhone}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Capacity Bar */}
              <div>
                <p className="text-sm font-medium mb-2">{t('transport.utilization')}</p>
                <CapacityBar current={selectedRoute._count.assignments} max={selectedRoute.capacity} />
              </div>

              {/* Stops Timeline */}
              {selectedRoute.stops.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-3">{t('transport.stops_timeline')}</p>
                  <div className="space-y-0">
                    {selectedRoute.stops.map((stop, idx) => (
                      <TimelineStop
                        key={stop.id}
                        stop={stop}
                        isFirst={idx === 0}
                        isLast={idx === selectedRoute.stops.length - 1}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Assigned Students */}
              {selectedRoute.assignments && selectedRoute.assignments.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">{t('transport.assigned_students')}</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedRoute.assignments.map((a) => (
                      <div key={a.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
                        <span className="font-medium">{a.student.firstName} {a.student.lastName}</span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {a.pickupTime && <span>{a.pickupTime}</span>}
                          {a.stopName && <span>· {a.stopName}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedRoute.notes && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">{t('transport.notes')}</p>
                  <p className="text-sm">{selectedRoute.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation Dialog ─────────────────────────────── */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              {t('transport.confirm_delete')}
            </DialogTitle>
            <DialogDescription>{t('transport.confirm_delete_desc')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>{t('action.cancel')}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              {t('action.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Bulk Assignment Dialog ─────────────────────────────────── */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('transport.bulk_assign')}</DialogTitle>
            <DialogDescription>{t('transport.bulk_assign_desc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('transport.student_ids')}</Label>
              <Textarea
                value={bulkStudentIds.join('\n')}
                onChange={(e) => {
                  const ids = e.target.value.split('\n').map((s) => s.trim()).filter(Boolean);
                  setBulkStudentIds(ids);
                }}
                placeholder={t('transport.student_ids_placeholder')}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">{t('transport.student_ids_help')}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('transport.transport_type')}</Label>
                <Select value={bulkTransportType} onValueChange={setBulkTransportType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSPORT_TYPES.map((tp) => (
                      <SelectItem key={tp} value={tp}>{t(`transport.type_${tp}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('transport.assign_route')}</Label>
                <Select value={bulkRouteId} onValueChange={setBulkRouteId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('transport.no_route')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('transport.no_route')}</SelectItem>
                    {routes.filter((r) => r.isActive).map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.routeNumber} - {r.routeName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('transport.pickup_time')}</Label>
                <Input type="time" value={bulkPickupTime} onChange={(e) => setBulkPickupTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('transport.dropoff_time')}</Label>
                <Input type="time" value={bulkDropoffTime} onChange={(e) => setBulkDropoffTime(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>{t('action.cancel')}</Button>
            <Button onClick={handleBulkAssign} disabled={saving || bulkStudentIds.length === 0} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <UsersRound className="h-4 w-4 mr-2" />}
              {t('transport.assign')} ({bulkStudentIds.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
