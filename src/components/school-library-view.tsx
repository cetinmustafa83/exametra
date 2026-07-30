'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Search, Plus, Grid3X3, List, Filter, Calendar,
  ArrowRightLeft, Clock, AlertTriangle, BookmarkPlus, BarChart3,
  ChevronRight, X, RefreshCw, BookMarked, UserCheck, CheckCircle2,
  ArrowLeft, Printer, Eye, Trash2, RotateCcw, Library,
  TrendingUp, PieChart as PieChartIcon, BookX, Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from 'recharts';

// ── Types ────────────────────────────────────────────────────────
interface LibraryBook {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  publisher: string | null;
  publishYear: number | null;
  category: string;
  readingLevel: string | null;
  language: string;
  description: string | null;
  coverGradient: string | null;
  totalCopies: number;
  availableCopies: number;
  location: string | null;
  tags: string | null;
  activeCheckouts?: number;
  waitingReservations?: number;
  isAvailable?: boolean;
  checkouts?: BookCheckout[];
  reservations?: BookReservation[];
}

interface BookCheckout {
  id: string;
  bookId: string;
  studentId: string;
  checkedOutBy: string;
  checkoutDate: string;
  dueDate: string;
  returnDate: string | null;
  condition: string;
  returnCondition: string | null;
  renewalCount: number;
  status: string;
  fineAmount: number;
  finePaid: boolean;
  notes: string | null;
  isOverdue?: boolean;
  daysOverdue?: number;
  book?: { id: string; title: string; author: string; category: string };
  student?: { id: string; firstName: string; lastName: string };
  checkedOutByUser?: { id: string; firstName: string; lastName: string };
}

interface BookReservation {
  id: string;
  bookId: string;
  studentId: string;
  userId: string;
  queuePosition: number;
  status: string;
  notifiedAt: string | null;
  fulfilledAt: string | null;
  createdAt: string;
  book?: { id: string; title: string; author: string; availableCopies: number; totalCopies: number };
  student?: { id: string; firstName: string; lastName: string };
  user?: { id: string; firstName: string; lastName: string };
}

interface LibraryStats {
  totalBooks: number;
  totalCopies: number;
  availableCopies: number;
  checkedOut: number;
  overdue: number;
  totalCheckouts: number;
  totalReservations: number;
  waitingReservations: number;
  overdueRate: number;
  popularBooks: Array<{ id: string; title: string; author: string; category: string; checkoutCount: number }>;
  categoryDistribution: Array<{ category: string; count: number }>;
  checkoutTrends: Array<{ date: string; count: number }>;
  overdueList: Array<BookCheckout & { daysOverdue: number }>;
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
}

// ── Category gradient colors ─────────────────────────────────────
const CATEGORY_GRADIENTS: Record<string, { from: string; to: string }> = {
  'Fiction': { from: '#10b981', to: '#059669' },
  'Non-Fiction': { from: '#f59e0b', to: '#d97706' },
  'Science': { from: '#3b82f6', to: '#2563eb' },
  'History': { from: '#ef4444', to: '#dc2626' },
  'Mathematics': { from: '#8b5cf6', to: '#7c3aed' },
  'Art': { from: '#ec4899', to: '#db2777' },
  'Music': { from: '#f97316', to: '#ea580c' },
  'Language': { from: '#14b8a6', to: '#0d9488' },
  'Technology': { from: '#6366f1', to: '#4f46e5' },
  'Sports': { from: '#22c55e', to: '#16a34a' },
  'Geography': { from: '#06b6d4', to: '#0891b2' },
  'Philosophy': { from: '#a855f7', to: '#9333ea' },
  'Biography': { from: '#e11d48', to: '#be123c' },
  'Poetry': { from: '#d946ef', to: '#c026d3' },
};

const DEFAULT_GRADIENT = { from: '#6b7280', to: '#4b5563' };

const PIE_COLORS = [
  '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6',
  '#ec4899', '#f97316', '#14b8a6', '#6366f1', '#22c55e',
  '#06b6d4', '#a855f7', '#e11d48', '#d946ef',
];

// ── Book Cover Placeholder ───────────────────────────────────────
function BookCover({ book, size = 'md' }: { book: LibraryBook; size?: 'sm' | 'md' | 'lg' }) {
  let gradient = DEFAULT_GRADIENT;
  try {
    if (book.coverGradient) {
      gradient = JSON.parse(book.coverGradient);
    } else {
      gradient = CATEGORY_GRADIENTS[book.category] || DEFAULT_GRADIENT;
    }
  } catch {
    gradient = CATEGORY_GRADIENTS[book.category] || DEFAULT_GRADIENT;
  }

  const sizeClasses = {
    sm: 'w-12 h-16 text-xs',
    md: 'w-20 h-28 text-sm',
    lg: 'w-28 h-40 text-base',
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-lg flex flex-col items-center justify-center gap-1 shadow-md relative overflow-hidden`}
      style={{
        background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
      }}
    >
      <div className="absolute inset-0 opacity-20" style={{ background: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 1h2v2H1V1zm4 0h2v2H5V1zm4 0h2v2H9V1z\' fill=\'%23fff\' fill-opacity=\'0.3\'/%3E%3C/svg%3E")' }} />
      <BookOpen className="h-4 w-4 text-white/80" />
      <span className="text-white/90 font-semibold text-center px-1 leading-tight line-clamp-2">
        {book.title.length > 20 ? book.title.slice(0, 18) + '...' : book.title}
      </span>
    </div>
  );
}

// ── Availability Badge ───────────────────────────────────────────
function AvailabilityBadge({ book }: { book: LibraryBook }) {
  if (book.availableCopies > 0) {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 gap-1">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        {t('library.available')}
      </Badge>
    );
  }
  if ((book.activeCheckouts ?? 0) > 0 && book.availableCopies === 0) {
    return (
      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-0 gap-1">
        <Clock className="h-3 w-3" />
        {t('library.checked_out')}
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-0 gap-1">
      <AlertTriangle className="h-3 w-3" />
      {t('library.unavailable')}
    </Badge>
  );
}

// ── Category Badge ───────────────────────────────────────────────
function CategoryBadge({ category }: { category: string }) {
  const gradient = CATEGORY_GRADIENTS[category] || DEFAULT_GRADIENT;
  return (
    <Badge
      className="border-0 text-white text-xs font-medium"
      style={{ background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})` }}
    >
      {category}
    </Badge>
  );
}

// ── Main Component ───────────────────────────────────────────────
export default function SchoolLibraryView() {
  const currentUser = useAppStore((s) => s.currentUser);
  const schoolId = currentUser?.schoolId;
  const role = currentUser?.role || '';

  const isAdmin = role === 'SCHOOL_ADMIN' || role === 'VICE_PRINCIPAL' || role === 'SUPER_ADMIN';
  const isTeacher = role === 'TEACHER';
  const isStudent = role === 'STUDENT';
  const isParent = role === 'PARENT';

  // ── State ──────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('catalog');
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [checkouts, setCheckouts] = useState<BookCheckout[]>([]);
  const [reservations, setReservations] = useState<BookReservation[]>([]);
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Search & filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [readingLevelFilter, setReadingLevelFilter] = useState('all');

  // Dialogs
  const [bookDetailOpen, setBookDetailOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<LibraryBook | null>(null);
  const [addBookOpen, setAddBookOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [selectedCheckout, setSelectedCheckout] = useState<BookCheckout | null>(null);

  // Checkout form
  const [checkoutBookId, setCheckoutBookId] = useState('');
  const [checkoutStudentId, setCheckoutStudentId] = useState('');
  const [checkoutDueDate, setCheckoutDueDate] = useState('');
  const [checkoutCondition, setCheckoutCondition] = useState('good');
  const [checkoutNotes, setCheckoutNotes] = useState('');

  // Return form
  const [returnCondition, setReturnCondition] = useState('good');
  const [returnFine, setReturnFine] = useState(0);

  // Add book form
  const [newBook, setNewBook] = useState({
    title: '', author: '', isbn: '', publisher: '', publishYear: '',
    category: 'Fiction', readingLevel: 'middle', language: 'de',
    description: '', totalCopies: '1', location: '',
  });

  // ── Data fetching ──────────────────────────────────────────────
  const fetchBooks = useCallback(async () => {
    if (!schoolId) return;
    try {
      const params = new URLSearchParams({ schoolId });
      if (searchQuery) params.set('search', searchQuery);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (availabilityFilter !== 'all') params.set('availability', availabilityFilter);
      if (readingLevelFilter !== 'all') params.set('readingLevel', readingLevelFilter);
      const data = await apiGet<{ books: LibraryBook[]; total: number }>(`/api/library/books?${params}`);
      setBooks(data.books);
    } catch (error) {
      console.error('Failed to fetch books:', error);
    }
  }, [schoolId, searchQuery, categoryFilter, availabilityFilter, readingLevelFilter]);

  const fetchCheckouts = useCallback(async () => {
    if (!schoolId) return;
    try {
      const params = new URLSearchParams({ schoolId });
      const data = await apiGet<{ checkouts: BookCheckout[]; total: number }>(`/api/library/checkouts?${params}`);
      setCheckouts(data.checkouts);
    } catch (error) {
      console.error('Failed to fetch checkouts:', error);
    }
  }, [schoolId]);

  const fetchReservations = useCallback(async () => {
    if (!schoolId) return;
    try {
      const params = new URLSearchParams({ schoolId });
      const data = await apiGet<{ reservations: BookReservation[] }>(`/api/library/reservations?${params}`);
      setReservations(data.reservations);
    } catch (error) {
      console.error('Failed to fetch reservations:', error);
    }
  }, [schoolId]);

  const fetchStats = useCallback(async () => {
    if (!schoolId) return;
    try {
      const data = await apiGet<LibraryStats>(`/api/library/stats?schoolId=${schoolId}`);
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, [schoolId]);

  const fetchStudents = useCallback(async () => {
    if (!schoolId) return;
    try {
      const data = await apiGet<Student[]>(`/api/students?schoolId=${schoolId}&limit=500`);
      setStudents(data);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  }, [schoolId]);

  // ── Initial load ───────────────────────────────────────────────
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchBooks(), fetchCheckouts(), fetchReservations(), fetchStats(), fetchStudents()]);
      setLoading(false);
    };
    if (schoolId) loadAll();
  }, [schoolId, fetchBooks, fetchCheckouts, fetchReservations, fetchStats, fetchStudents]);

  // Refetch books when filters change
  useEffect(() => {
    if (schoolId) fetchBooks();
  }, [searchQuery, categoryFilter, availabilityFilter, readingLevelFilter, schoolId, fetchBooks]);

  // ── Actions ────────────────────────────────────────────────────
  const handleAddBook = async () => {
    try {
      await apiPost('/api/library/books', {
        ...newBook,
        schoolId,
        publishYear: newBook.publishYear ? parseInt(newBook.publishYear) : null,
        totalCopies: parseInt(newBook.totalCopies) || 1,
      });
      toast.success(t('library.book_added'));
      setAddBookOpen(false);
      setNewBook({ title: '', author: '', isbn: '', publisher: '', publishYear: '', category: 'Fiction', readingLevel: 'middle', language: 'de', description: '', totalCopies: '1', location: '' });
      fetchBooks();
      fetchStats();
    } catch (error) {
      toast.error((error as Error).message || t('library.error_adding_book'));
    }
  };

  const handleCheckout = async () => {
    try {
      await apiPost('/api/library/checkouts', {
        bookId: checkoutBookId,
        studentId: checkoutStudentId,
        schoolId,
        dueDate: checkoutDueDate || undefined,
        condition: checkoutCondition,
        notes: checkoutNotes || undefined,
      });
      toast.success(t('library.checkout_success'));
      setCheckoutOpen(false);
      setCheckoutBookId('');
      setCheckoutStudentId('');
      setCheckoutDueDate('');
      setCheckoutCondition('good');
      setCheckoutNotes('');
      fetchBooks();
      fetchCheckouts();
      fetchStats();
    } catch (error) {
      toast.error((error as Error).message || t('library.error_checkout'));
    }
  };

  const handleReturn = async () => {
    if (!selectedCheckout) return;
    try {
      await apiPut(`/api/library/checkouts/${selectedCheckout.id}`, {
        action: 'return',
        returnCondition,
        fineAmount: returnFine,
      });
      toast.success(t('library.return_success'));
      setReturnOpen(false);
      setSelectedCheckout(null);
      setReturnCondition('good');
      setReturnFine(0);
      fetchBooks();
      fetchCheckouts();
      fetchReservations();
      fetchStats();
    } catch (error) {
      toast.error((error as Error).message || t('library.error_return'));
    }
  };

  const handleRenew = async (checkoutId: string) => {
    try {
      await apiPut(`/api/library/checkouts/${checkoutId}`, { action: 'renew' });
      toast.success(t('library.renewal_success'));
      fetchCheckouts();
      fetchStats();
    } catch (error) {
      toast.error((error as Error).message || t('library.error_renewal'));
    }
  };

  const handleReserve = async (bookId: string) => {
    if (!schoolId) return;
    try {
      // For student, use their own student ID
      let studentId = '';
      if (isStudent) {
        const student = students.find((s) => true); // Students can only reserve for themselves
        if (students.length > 0) studentId = students[0].id;
      } else if (isParent) {
        // For parent, use first linked student
        if (students.length > 0) studentId = students[0].id;
      }

      if (!studentId) {
        toast.error(t('library.no_student_selected'));
        return;
      }

      await apiPost('/api/library/reservations', { bookId, studentId, schoolId });
      toast.success(t('library.reservation_success'));
      fetchReservations();
      fetchBooks();
    } catch (error) {
      toast.error((error as Error).message || t('library.error_reservation'));
    }
  };

  const handleCancelReservation = async (reservationId: string) => {
    try {
      await apiDelete(`/api/library/reservations/${reservationId}`);
      toast.success(t('library.reservation_cancelled'));
      fetchReservations();
      fetchBooks();
    } catch (error) {
      toast.error((error as Error).message || t('library.error_cancel_reservation'));
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    if (!confirm(t('library.confirm_delete_book'))) return;
    try {
      await apiDelete(`/api/library/books/${bookId}`);
      toast.success(t('library.book_deleted'));
      fetchBooks();
      fetchStats();
    } catch (error) {
      toast.error((error as Error).message || t('library.error_delete_book'));
    }
  };

  const openBookDetail = async (bookId: string) => {
    try {
      const book = await apiGet<LibraryBook>(`/api/library/books/${bookId}`);
      setSelectedBook(book);
      setBookDetailOpen(true);
    } catch (error) {
      console.error('Failed to fetch book details:', error);
    }
  };

  const openCheckoutDialog = (bookId: string) => {
    setCheckoutBookId(bookId);
    const defaultDue = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    setCheckoutDueDate(defaultDue.toISOString().split('T')[0]);
    setCheckoutOpen(true);
  };

  const openReturnDialog = (checkout: BookCheckout) => {
    setSelectedCheckout(checkout);
    setReturnCondition(checkout.condition);
    setReturnFine(0);
    setReturnOpen(true);
  };

  // ── Computed values ────────────────────────────────────────────
  const categories = useMemo(() => {
    const cats = new Set(books.map((b) => b.category));
    return Array.from(cats).sort();
  }, [books]);

  const activeCheckouts = useMemo(
    () => checkouts.filter((c) => c.status === 'active' || c.status === 'overdue'),
    [checkouts]
  );

  const overdueCheckouts = useMemo(
    () => checkouts.filter((c) => c.status === 'overdue' || (c.status === 'active' && new Date(c.dueDate) < new Date())),
    [checkouts]
  );

  const returnedCheckouts = useMemo(
    () => checkouts.filter((c) => c.status === 'returned'),
    [checkouts]
  );

  const waitingReservations = useMemo(
    () => reservations.filter((r) => r.status === 'waiting' || r.status === 'notified'),
    [reservations]
  );

  // ── Print receipt ──────────────────────────────────────────────
  const printReceipt = (checkout: BookCheckout) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>${t('library.checkout_receipt')}</title></head>
      <body style="font-family: monospace; max-width: 400px; margin: 20px auto; padding: 20px;">
        <h2 style="text-align:center;">${t('library.checkout_receipt')}</h2>
        <hr/>
        <p><strong>${t('library.book_title')}:</strong> ${checkout.book?.title}</p>
        <p><strong>${t('library.author')}:</strong> ${checkout.book?.author}</p>
        <p><strong>${t('library.student')}:</strong> ${checkout.student?.firstName} ${checkout.student?.lastName}</p>
        <p><strong>${t('library.checkout_date')}:</strong> ${new Date(checkout.checkoutDate).toLocaleDateString()}</p>
        <p><strong>${t('library.due_date')}:</strong> ${new Date(checkout.dueDate).toLocaleDateString()}</p>
        <p><strong>${t('library.condition')}:</strong> ${checkout.condition}</p>
        <hr/>
        <p style="text-align:center; font-size: 12px;">CompetenceTrack - ${t('library.title')}</p>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // ── Render ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-500 border-t-transparent" />
          <span className="text-muted-foreground">{t('library.loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      {/* Gradient Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-6 text-white shadow-lg shadow-emerald-500/20 dark:shadow-emerald-900/30"
      >
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQiIGhlaWdodD0iOCIgeD0iMjAiIHk9IjIwIiByeD0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA2KSIvPjwvc3ZnPg==')] opacity-50" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Library className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t('library.title')}</h1>
              <p className="text-emerald-100 text-sm">{t('library.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(isAdmin || isTeacher) && (
              <Button onClick={() => setAddBookOpen(true)} className="gap-2 bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm">
                <Plus className="h-4 w-4" />
                {t('library.add_book')}
              </Button>
            )}
            <Button variant="outline" onClick={() => { fetchBooks(); fetchCheckouts(); fetchReservations(); fetchStats(); }} className="gap-2 bg-white/10 hover:bg-white/20 text-white border-white/20">
              <RefreshCw className="h-4 w-4" />
              {t('action.refresh')}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3"
        >
          {[
            { label: t('library.total_books'), value: stats.totalBooks, icon: BookOpen, color: 'from-emerald-500 to-teal-600' },
            { label: t('library.total_copies'), value: stats.totalCopies, icon: BookMarked, color: 'from-teal-500 to-cyan-600' },
            { label: t('library.available_copies'), value: stats.availableCopies, icon: CheckCircle2, color: 'from-green-500 to-emerald-600' },
            { label: t('library.checked_out'), value: stats.checkedOut, icon: ArrowRightLeft, color: 'from-amber-500 to-orange-600' },
            { label: t('library.overdue'), value: stats.overdue, icon: AlertTriangle, color: 'from-red-500 to-rose-600' },
            { label: t('library.overdue_rate'), value: `${stats.overdueRate}%`, icon: TrendingUp, color: 'from-rose-500 to-pink-600' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + i * 0.05 }}
            >
              <Card className="relative overflow-hidden hover:shadow-md transition-shadow">
                <div className={`h-1 bg-gradient-to-r ${stat.color}`} />
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    </div>
                    <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                      <stat.icon className="h-4 w-4 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="catalog" className="gap-1.5 text-xs sm:text-sm">
            <BookOpen className="h-3.5 w-3.5" /> {t('library.catalog')}
          </TabsTrigger>
          <TabsTrigger value="checkouts" className="gap-1.5 text-xs sm:text-sm">
            <ArrowRightLeft className="h-3.5 w-3.5" /> {t('library.checkouts')}
            {activeCheckouts.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{activeCheckouts.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="overdue" className="gap-1.5 text-xs sm:text-sm">
            <AlertTriangle className="h-3.5 w-3.5" /> {t('library.overdue_tab')}
            {overdueCheckouts.length > 0 && (
              <Badge className="ml-1 h-5 px-1.5 text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-0">
                {overdueCheckouts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="reservations" className="gap-1.5 text-xs sm:text-sm">
            <BookmarkPlus className="h-3.5 w-3.5" /> {t('library.reservations')}
            {waitingReservations.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{waitingReservations.length}</Badge>
            )}
          </TabsTrigger>
          {(isAdmin || isTeacher) && (
            <TabsTrigger value="statistics" className="gap-1.5 text-xs sm:text-sm">
              <BarChart3 className="h-3.5 w-3.5" /> {t('library.statistics')}
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── Catalog Tab ────────────────────────────────────────── */}
        <TabsContent value="catalog" className="mt-4 space-y-4">
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('library.search_placeholder')}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-3.5 w-3.5 mr-1" />
                  <SelectValue placeholder={t('library.category')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('library.all_categories')}</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={t('library.availability')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('library.all')}</SelectItem>
                  <SelectItem value="available">{t('library.available')}</SelectItem>
                  <SelectItem value="checked_out">{t('library.checked_out')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={readingLevelFilter} onValueChange={setReadingLevelFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={t('library.reading_level')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('library.all_levels')}</SelectItem>
                  <SelectItem value="elementary">{t('library.level_elementary')}</SelectItem>
                  <SelectItem value="middle">{t('library.level_middle')}</SelectItem>
                  <SelectItem value="high">{t('library.level_high')}</SelectItem>
                  <SelectItem value="advanced">{t('library.level_advanced')}</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Book Grid/List */}
          {books.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <BookX className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg">{t('library.no_books')}</p>
              {(isAdmin || isTeacher) && (
                <Button onClick={() => setAddBookOpen(true)} className="mt-4 gap-2">
                  <Plus className="h-4 w-4" /> {t('library.add_first_book')}
                </Button>
              )}
            </motion.div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <AnimatePresence mode="popLayout">
                {books.map((book, i) => (
                  <motion.div
                    key={book.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <Card className="group book-card-hover hover:shadow-lg transition-all cursor-pointer overflow-hidden border-emerald-100/60 dark:border-emerald-900/30 hover:border-emerald-300/60 dark:hover:border-emerald-700/60" onClick={() => openBookDetail(book.id)}>
                      <CardContent className="p-4">
                        <div className="flex gap-3">
                          <BookCover book={book} size="md" />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-emerald-600 transition-colors">
                              {book.title}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">{book.author}</p>
                            <div className="mt-2 flex flex-wrap gap-1">
                              <CategoryBadge category={book.category} />
                              <AvailabilityBadge book={book} />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1.5">
                              {book.availableCopies}/{book.totalCopies} {t('library.copies_available')}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1.5 mt-3 pt-3 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-xs h-8 gap-1"
                            onClick={(e) => { e.stopPropagation(); openBookDetail(book.id); }}
                          >
                            <Eye className="h-3 w-3" /> {t('action.view')}
                          </Button>
                          {(isAdmin || isTeacher) && book.availableCopies > 0 && (
                            <Button
                              size="sm"
                              className="flex-1 text-xs h-8 gap-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0"
                              onClick={(e) => { e.stopPropagation(); openCheckoutDialog(book.id); }}
                            >
                              <ArrowRightLeft className="h-3 w-3" /> {t('library.checkout')}
                            </Button>
                          )}
                          {(isStudent || isParent) && book.availableCopies === 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 text-xs h-8 gap-1"
                              onClick={(e) => { e.stopPropagation(); handleReserve(book.id); }}
                            >
                              <BookmarkPlus className="h-3 w-3" /> {t('library.reserve')}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {books.map((book, i) => (
                    <motion.div
                      key={book.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => openBookDetail(book.id)}
                    >
                      <BookCover book={book} size="sm" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">{book.title}</h3>
                        <p className="text-xs text-muted-foreground">{book.author} {book.isbn && `| ISBN: ${book.isbn}`}</p>
                      </div>
                      <div className="hidden sm:flex items-center gap-2">
                        <CategoryBadge category={book.category} />
                        <AvailabilityBadge book={book} />
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {book.availableCopies}/{book.totalCopies}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Checkouts Tab ──────────────────────────────────────── */}
        <TabsContent value="checkouts" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t('library.active_checkouts')}</h2>
            {(isAdmin || isTeacher) && (
              <Button onClick={() => { setCheckoutBookId(''); setCheckoutOpen(true); }} className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0">
                <ArrowRightLeft className="h-4 w-4" /> {t('library.new_checkout')}
              </Button>
            )}
          </div>

          {activeCheckouts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">{t('library.no_active_checkouts')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activeCheckouts.map((checkout, i) => (
                <motion.div
                  key={checkout.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className={`overflow-hidden ${checkout.status === 'overdue' ? 'border-red-300 dark:border-red-800' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm">{checkout.book?.title}</h3>
                            {checkout.status === 'overdue' && (
                              <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-0 text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {t('library.overdue')}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {checkout.book?.author} | {t('library.student')}: {checkout.student?.firstName} {checkout.student?.lastName}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {t('library.due_date')}: {new Date(checkout.dueDate).toLocaleDateString()}
                            </span>
                            {checkout.renewalCount > 0 && (
                              <span className="flex items-center gap-1">
                                <RotateCcw className="h-3 w-3" />
                                {checkout.renewalCount}x {t('library.renewed')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {(isAdmin || isTeacher) && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs gap-1"
                                onClick={() => handleRenew(checkout.id)}
                              >
                                <RotateCcw className="h-3 w-3" /> {t('library.renew')}
                              </Button>
                              <Button
                                size="sm"
                                className="text-xs gap-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0"
                                onClick={() => openReturnDialog(checkout)}
                              >
                                <ArrowLeft className="h-3 w-3" /> {t('library.return')}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs"
                                onClick={() => printReceipt(checkout)}
                              >
                                <Printer className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {/* Return History */}
          {returnedCheckouts.length > 0 && (
            <div className="mt-6">
              <h3 className="text-md font-semibold mb-3">{t('library.return_history')}</h3>
              <Card>
                <CardContent className="p-0">
                  <div className="max-h-64 overflow-y-auto divide-y">
                    {returnedCheckouts.map((checkout) => (
                      <div key={checkout.id} className="flex items-center gap-3 p-3 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium">{checkout.book?.title}</span>
                          <span className="text-muted-foreground ml-2">- {checkout.student?.firstName} {checkout.student?.lastName}</span>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {checkout.returnDate ? new Date(checkout.returnDate).toLocaleDateString() : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ── Overdue Tab ────────────────────────────────────────── */}
        <TabsContent value="overdue" className="mt-4 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            {t('library.overdue_books')}
          </h2>

          {overdueCheckouts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500 mb-3" />
                <p className="text-muted-foreground">{t('library.no_overdue')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {overdueCheckouts.map((checkout, i) => {
                const daysOverdue = Math.floor(
                  (Date.now() - new Date(checkout.dueDate).getTime()) / (1000 * 60 * 60 * 24)
                );
                const fineAmount = daysOverdue * 0.5; // Configurable: 0.50 per day

                return (
                  <motion.div
                    key={checkout.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 overflow-hidden overdue-gradient-border">
                      <div className="h-1 bg-gradient-to-r from-red-500 via-orange-500 to-rose-600" />
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-sm">{checkout.book?.title}</h3>
                              <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-0 text-xs">
                                {daysOverdue} {t('library.days_overdue')}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {checkout.book?.author} | {t('library.student')}: {checkout.student?.firstName} {checkout.student?.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {t('library.due_date')}: {new Date(checkout.dueDate).toLocaleDateString()}
                              {t('library.fine_estimate')}: {fineAmount.toFixed(2)} EUR
                            </p>
                          </div>
                          {(isAdmin || isTeacher) && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="text-xs gap-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0"
                                onClick={() => openReturnDialog(checkout)}
                              >
                                <ArrowLeft className="h-3 w-3" /> {t('library.return')}
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Reservations Tab ───────────────────────────────────── */}
        <TabsContent value="reservations" className="mt-4 space-y-4">
          <h2 className="text-lg font-semibold">{t('library.reservations')}</h2>

          {waitingReservations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BookmarkPlus className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">{t('library.no_reservations')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {waitingReservations.map((reservation, i) => (
                <motion.div
                  key={reservation.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm">{reservation.book?.title}</h3>
                            {reservation.status === 'notified' ? (
                              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-xs">
                                {t('library.available_now')}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                {t('library.queue_position')}: #{reservation.queuePosition}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {reservation.book?.author} | {t('library.student')}: {reservation.student?.firstName} {reservation.student?.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {t('library.reserved_on')}: {new Date(reservation.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {(isAdmin || isTeacher) && reservation.status === 'notified' && (
                            <Button
                              size="sm"
                              className="text-xs gap-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0"
                              onClick={() => {
                                setCheckoutBookId(reservation.bookId);
                                setCheckoutStudentId(reservation.studentId);
                                setCheckoutOpen(true);
                              }}
                            >
                              <ArrowRightLeft className="h-3 w-3" /> {t('library.checkout')}
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs gap-1 text-red-600"
                            onClick={() => handleCancelReservation(reservation.id)}
                          >
                            <X className="h-3 w-3" /> {t('library.cancel')}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Statistics Tab ─────────────────────────────────────── */}
        {(isAdmin || isTeacher) && stats && (
          <TabsContent value="statistics" className="mt-4 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Popular Books */}
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    {t('library.popular_books')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {stats.popularBooks.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={stats.popularBooks.slice(0, 8)} layout="vertical">
                        <XAxis type="number" />
                        <YAxis dataKey="title" type="category" width={120} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="checkoutCount" fill="url(#barGradient)" radius={[0, 4, 4, 0]} />
                        <defs>
                          <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#14b8a6" />
                          </linearGradient>
                        </defs>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                      {t('library.no_data')}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Category Distribution */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <PieChartIcon className="h-4 w-4 text-emerald-500" />
                    {t('library.category_distribution')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {stats.categoryDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={stats.categoryDistribution}
                          dataKey="count"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ category, percent }) => `${category} (${(percent * 100).toFixed(0)}%)`}
                          labelLine={false}
                        >
                          {stats.categoryDistribution.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                      {t('library.no_data')}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Checkout Trends */}
              <Card className="lg:col-span-2 glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-emerald-500" />
                    {t('library.checkout_trends')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {stats.checkoutTrends.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={stats.checkoutTrends}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Line type="monotone" dataKey="count" stroke="url(#lineGradient)" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
                        <defs>
                          <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#14b8a6" />
                          </linearGradient>
                        </defs>
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                      {t('library.no_data')}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* ── Book Detail Dialog ──────────────────────────────────── */}
      <Dialog open={bookDetailOpen} onOpenChange={setBookDetailOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedBook?.title}</DialogTitle>
            <DialogDescription>{selectedBook?.author}</DialogDescription>
          </DialogHeader>
          {selectedBook && (
            <div className="space-y-4">
              <div className="flex gap-4">
                <BookCover book={selectedBook} size="lg" />
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    <CategoryBadge category={selectedBook.category} />
                    <AvailabilityBadge book={selectedBook} />
                    {selectedBook.readingLevel && (
                      <Badge variant="outline" className="text-xs">{selectedBook.readingLevel}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {selectedBook.availableCopies}/{selectedBook.totalCopies} {t('library.copies_available')}
                  </p>
                  {selectedBook.isbn && <p className="text-xs text-muted-foreground">ISBN: {selectedBook.isbn}</p>}
                  {selectedBook.publisher && <p className="text-xs text-muted-foreground">{selectedBook.publisher} {selectedBook.publishYear ? `(${selectedBook.publishYear})` : ''}</p>}
                  {selectedBook.location && <p className="text-xs text-muted-foreground">{t('library.location')}: {selectedBook.location}</p>}
                </div>
              </div>
              {selectedBook.description && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">{t('library.description')}</h4>
                  <p className="text-sm text-muted-foreground">{selectedBook.description}</p>
                </div>
              )}
              {/* Active checkouts */}
              {selectedBook.checkouts && selectedBook.checkouts.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">{t('library.currently_checked_out')}</h4>
                  <div className="space-y-1">
                    {selectedBook.checkouts.map((co) => (
                      <div key={co.id} className="flex items-center gap-2 text-xs">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span>{co.student?.firstName} {co.student?.lastName}</span>
                        <span className="text-muted-foreground">{t('library.due_date')}: {new Date(co.dueDate).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Reservations */}
              {selectedBook.reservations && selectedBook.reservations.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">{t('library.reservation_queue')}</h4>
                  <div className="space-y-1">
                    {selectedBook.reservations.map((res) => (
                      <div key={res.id} className="flex items-center gap-2 text-xs">
                        <BookmarkPlus className="h-3 w-3 text-muted-foreground" />
                        <span>#{res.queuePosition} - {res.student?.firstName} {res.student?.lastName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <Separator />
              <div className="flex gap-2">
                {(isAdmin || isTeacher) && selectedBook.availableCopies > 0 && (
                  <Button
                    className="flex-1 gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0"
                    onClick={() => {
                      openCheckoutDialog(selectedBook.id);
                      setBookDetailOpen(false);
                    }}
                  >
                    <ArrowRightLeft className="h-4 w-4" /> {t('library.checkout')}
                  </Button>
                )}
                {(isStudent || isParent) && selectedBook.availableCopies === 0 && (
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => {
                      handleReserve(selectedBook.id);
                      setBookDetailOpen(false);
                    }}
                  >
                    <BookmarkPlus className="h-4 w-4" /> {t('library.reserve')}
                  </Button>
                )}
                {isAdmin && (
                  <Button
                    variant="outline"
                    className="gap-2 text-red-600"
                    onClick={() => {
                      handleDeleteBook(selectedBook.id);
                      setBookDetailOpen(false);
                    }}
                  >
                    <Trash2 className="h-4 w-4" /> {t('action.delete')}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Add Book Dialog ─────────────────────────────────────── */}
      <Dialog open={addBookOpen} onOpenChange={setAddBookOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('library.add_book')}</DialogTitle>
            <DialogDescription>{t('library.add_book_desc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>{t('library.book_title')}</Label>
                <Input value={newBook.title} onChange={(e) => setNewBook({ ...newBook, title: e.target.value })} placeholder={t('library.book_title')} />
              </div>
              <div className="col-span-2">
                <Label>{t('library.author')}</Label>
                <Input value={newBook.author} onChange={(e) => setNewBook({ ...newBook, author: e.target.value })} placeholder={t('library.author')} />
              </div>
              <div>
                <Label>ISBN</Label>
                <Input value={newBook.isbn} onChange={(e) => setNewBook({ ...newBook, isbn: e.target.value })} placeholder="ISBN" />
              </div>
              <div>
                <Label>{t('library.publisher')}</Label>
                <Input value={newBook.publisher} onChange={(e) => setNewBook({ ...newBook, publisher: e.target.value })} />
              </div>
              <div>
                <Label>{t('library.publish_year')}</Label>
                <Input type="number" value={newBook.publishYear} onChange={(e) => setNewBook({ ...newBook, publishYear: e.target.value })} />
              </div>
              <div>
                <Label>{t('library.category')}</Label>
                <Select value={newBook.category} onValueChange={(v) => setNewBook({ ...newBook, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(CATEGORY_GRADIENTS).map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('library.reading_level')}</Label>
                <Select value={newBook.readingLevel} onValueChange={(v) => setNewBook({ ...newBook, readingLevel: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="elementary">{t('library.level_elementary')}</SelectItem>
                    <SelectItem value="middle">{t('library.level_middle')}</SelectItem>
                    <SelectItem value="high">{t('library.level_high')}</SelectItem>
                    <SelectItem value="advanced">{t('library.level_advanced')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('library.total_copies')}</Label>
                <Input type="number" value={newBook.totalCopies} onChange={(e) => setNewBook({ ...newBook, totalCopies: e.target.value })} />
              </div>
              <div>
                <Label>{t('library.location')}</Label>
                <Input value={newBook.location} onChange={(e) => setNewBook({ ...newBook, location: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>{t('library.description')}</Label>
                <Textarea value={newBook.description} onChange={(e) => setNewBook({ ...newBook, description: e.target.value })} rows={3} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setAddBookOpen(false)}>{t('action.cancel')}</Button>
              <Button
                onClick={handleAddBook}
                disabled={!newBook.title || !newBook.author}
                className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0"
              >
                <Plus className="h-4 w-4" /> {t('library.add_book')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Checkout Dialog ──────────────────────────────────────── */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('library.checkout_book')}</DialogTitle>
            <DialogDescription>{t('library.checkout_desc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('library.select_book')}</Label>
              <Select value={checkoutBookId} onValueChange={setCheckoutBookId}>
                <SelectTrigger><SelectValue placeholder={t('library.select_book')} /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {books.filter((b) => b.availableCopies > 0).map((book) => (
                    <SelectItem key={book.id} value={book.id}>
                      {book.title} - {book.author}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('library.select_student')}</Label>
              <Select value={checkoutStudentId} onValueChange={setCheckoutStudentId}>
                <SelectTrigger><SelectValue placeholder={t('library.select_student')} /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.firstName} {student.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('library.due_date')}</Label>
              <Input type="date" value={checkoutDueDate} onChange={(e) => setCheckoutDueDate(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">{t('library.default_14_days')}</p>
            </div>
            <div>
              <Label>{t('library.condition')}</Label>
              <Select value={checkoutCondition} onValueChange={setCheckoutCondition}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">{t('library.condition_excellent')}</SelectItem>
                  <SelectItem value="good">{t('library.condition_good')}</SelectItem>
                  <SelectItem value="fair">{t('library.condition_fair')}</SelectItem>
                  <SelectItem value="poor">{t('library.condition_poor')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('library.notes')}</Label>
              <Input value={checkoutNotes} onChange={(e) => setCheckoutNotes(e.target.value)} placeholder={t('library.notes_placeholder')} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setCheckoutOpen(false)}>{t('action.cancel')}</Button>
              <Button
                onClick={handleCheckout}
                disabled={!checkoutBookId || !checkoutStudentId}
                className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0"
              >
                <ArrowRightLeft className="h-4 w-4" /> {t('library.checkout')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Return Dialog ───────────────────────────────────────── */}
      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('library.return_book')}</DialogTitle>
            <DialogDescription>
              {selectedCheckout?.book?.title} - {selectedCheckout?.student?.firstName} {selectedCheckout?.student?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('library.return_condition')}</Label>
              <Select value={returnCondition} onValueChange={setReturnCondition}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">{t('library.condition_excellent')}</SelectItem>
                  <SelectItem value="good">{t('library.condition_good')}</SelectItem>
                  <SelectItem value="fair">{t('library.condition_fair')}</SelectItem>
                  <SelectItem value="poor">{t('library.condition_poor')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('library.fine_amount')} (EUR)</Label>
              <Input
                type="number"
                step="0.5"
                value={returnFine}
                onChange={(e) => setReturnFine(parseFloat(e.target.value) || 0)}
              />
              {selectedCheckout?.status === 'overdue' && (
                <p className="text-xs text-red-500 mt-1">{t('library.overdue_fine_note')}</p>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setReturnOpen(false)}>{t('action.cancel')}</Button>
              <Button
                onClick={handleReturn}
                className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0"
              >
                <ArrowLeft className="h-4 w-4" /> {t('library.return')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
