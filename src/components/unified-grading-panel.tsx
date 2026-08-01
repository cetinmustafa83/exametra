'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  Plus,
  Edit,
  Trash2,
  Filter,
  Download,
  Upload,
  TrendingUp,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Smartphone,
  Monitor,
  Table as TableIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { DataTable } from './data-table';
import { FormBuilder } from './form-builder';
import { GradingEngine } from '@/lib/grading-engine';
import { useApi } from '@/lib/hooks/useApi';
import { cn } from '@/lib/utils';

interface Grade {
  id: string;
  studentId: string;
  studentName: string;
  subject: string;
  assessment: string;
  score: number;
  maxScore: number;
  weight?: number;
  comment?: string;
  gradedAt?: string;
  status: 'pending' | 'graded' | 'released';
}

interface UnifiedGradingPanelProps {
  classId?: string;
  studentId?: string;
  mode?: 'teacher' | 'student' | 'admin' | 'parent';
  variant?: 'desktop' | 'tablet' | 'list';
  onGradeSubmit?: (grades: Grade[]) => Promise<void>;
  className?: string;
}

/**
 * Unified Grading Panel
 * Consolidates: grading-view.tsx, tablet-grading-view.tsx, grade-analytics-view.tsx
 * Single component supports all viewing modes and devices
 */
export function UnifiedGradingPanel({
  classId,
  studentId,
  mode = 'teacher',
  variant = 'desktop',
  onGradeSubmit,
  className,
}: UnifiedGradingPanelProps) {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [filteredGrades, setFilteredGrades] = useState<Grade[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);
  const [isEditingGrade, setIsEditingGrade] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'graded' | 'released'>('all');
  const [viewType, setViewType] = useState<'grid' | 'list' | 'analytics'>(
    variant === 'list' ? 'list' : 'grid'
  );

  // Fetch grades from API
  const { data: backendGrades, isLoading, mutate } = useApi(
    '/api/v1/grades',
    {
      method: 'GET',
      params: {
        ...(classId && { classId }),
        ...(studentId && { studentId }),
      },
      revalidateOnFocus: true,
    }
  );

  // Update local grades when backend data changes
  React.useEffect(() => {
    if (backendGrades) {
      setGrades(backendGrades);
      applyFilters(backendGrades);
    }
  }, [backendGrades]);

  // Apply filters
  const applyFilters = useCallback((gradesToFilter: Grade[]) => {
    let filtered = gradesToFilter;

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (g) =>
          g.studentName.toLowerCase().includes(searchLower) ||
          g.subject.toLowerCase().includes(searchLower) ||
          g.assessment.toLowerCase().includes(searchLower)
      );
    }

    // Subject filter
    if (filterSubject !== 'all') {
      filtered = filtered.filter((g) => g.subject === filterSubject);
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter((g) => g.status === filterStatus);
    }

    setFilteredGrades(filtered);
  }, [searchTerm, filterSubject, filterStatus]);

  // Update filters when any filter changes
  React.useEffect(() => {
    applyFilters(grades);
  }, [searchTerm, filterSubject, filterStatus, applyFilters]);

  // Calculate statistics
  const stats = useMemo(() => {
    const completed = grades.filter((g) => g.status !== 'pending').length;
    const average = grades.length > 0
      ? (grades.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) / grades.length).toFixed(1)
      : 0;

    return {
      total: grades.length,
      completed,
      pending: grades.length - completed,
      average,
    };
  }, [grades]);

  // Handle grade submission
  const handleSubmitGrades = useCallback(async () => {
    try {
      const gradesToSubmit = grades.filter((g) => g.status === 'graded');
      if (gradesToSubmit.length === 0) {
        toast.error('No grades to submit');
        return;
      }

      if (onGradeSubmit) {
        await onGradeSubmit(gradesToSubmit);
      } else {
        // Use API
        await fetch('/api/v1/grades/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(gradesToSubmit),
        });
      }

      setGrades((prev) =>
        prev.map((g) => (g.status === 'graded' ? { ...g, status: 'released' } : g))
      );
      toast.success(`${gradesToSubmit.length} grades submitted successfully`);
      mutate();
    } catch (error) {
      toast.error('Failed to submit grades');
      console.error(error);
    }
  }, [grades, onGradeSubmit, mutate]);

  // Handle grade update
  const handleUpdateGrade = useCallback((updatedGrade: Grade) => {
    setGrades((prev) =>
      prev.map((g) => (g.id === updatedGrade.id ? updatedGrade : g))
    );
    setSelectedGrade(null);
    setIsEditingGrade(false);
    toast.success('Grade updated');
  }, []);

  // Handle grade deletion
  const handleDeleteGrade = useCallback(async (gradeId: string) => {
    try {
      await fetch(`/api/v1/grades/${gradeId}`, { method: 'DELETE' });
      setGrades((prev) => prev.filter((g) => g.id !== gradeId));
      setSelectedGrade(null);
      toast.success('Grade deleted');
      mutate();
    } catch (error) {
      toast.error('Failed to delete grade');
      console.error(error);
    }
  }, [mutate]);

  // Subject list for filtering
  const subjects = useMemo(() => {
    const subjectSet = new Set(grades.map((g) => g.subject));
    return Array.from(subjectSet).sort();
  }, [grades]);

  // Render desktop grid view
  const renderDesktopView = () => (
    <div className="space-y-4">
      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Grades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Average</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.average}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Grades table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Grades</span>
            <Button onClick={handleSubmitGrades} disabled={stats.pending === stats.total}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Submit Grades
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="text-left py-2 px-3">Student</th>
                  <th className="text-left py-2 px-3">Subject</th>
                  <th className="text-left py-2 px-3">Assessment</th>
                  <th className="text-center py-2 px-3">Score</th>
                  <th className="text-center py-2 px-3">Percentage</th>
                  <th className="text-center py-2 px-3">Status</th>
                  <th className="text-right py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredGrades.map((grade) => (
                  <tr key={grade.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="py-2 px-3">{grade.studentName}</td>
                    <td className="py-2 px-3">{grade.subject}</td>
                    <td className="py-2 px-3">{grade.assessment}</td>
                    <td className="py-2 px-3 text-center font-semibold">
                      {grade.score}/{grade.maxScore}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {((grade.score / grade.maxScore) * 100).toFixed(1)}%
                    </td>
                    <td className="py-2 px-3 text-center">
                      <Badge
                        variant={
                          grade.status === 'pending'
                            ? 'outline'
                            : grade.status === 'graded'
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {grade.status}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedGrade(grade);
                          setIsEditingGrade(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Render tablet view (card grid)
  const renderTabletView = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 auto-rows-max">
        {filteredGrades.map((grade) => (
          <motion.div
            key={grade.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => {
              setSelectedGrade(grade);
              setIsEditingGrade(true);
            }}
          >
            <div className="space-y-2">
              <h3 className="font-semibold">{grade.studentName}</h3>
              <p className="text-sm text-muted-foreground">{grade.subject}</p>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold">{grade.score}/{grade.maxScore}</span>
                <Badge>{grade.status}</Badge>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  // Render list view
  const renderListView = () => (
    <div className="space-y-2">
      {filteredGrades.map((grade) => (
        <motion.div
          key={grade.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-3 border rounded-lg flex items-center justify-between hover:bg-muted/50 cursor-pointer transition-colors"
          onClick={() => {
            setSelectedGrade(grade);
            setIsEditingGrade(true);
          }}
        >
          <div className="flex-1">
            <h4 className="font-medium">{grade.studentName}</h4>
            <p className="text-xs text-muted-foreground">
              {grade.subject} - {grade.assessment}
            </p>
          </div>
          <div className="text-right space-y-1">
            <div className="font-semibold">{grade.score}/{grade.maxScore}</div>
            <Badge variant="outline">{grade.status}</Badge>
          </div>
        </motion.div>
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with filters */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-2xl font-bold">Grading Panel</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button size="sm" variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input
            placeholder="Search grades..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger>
              <SelectValue placeholder="All subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All subjects</SelectItem>
              {subjects.map((subject) => (
                <SelectItem key={subject} value={subject}>
                  {subject}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="graded">Graded</SelectItem>
              <SelectItem value="released">Released</SelectItem>
            </SelectContent>
          </Select>

          {/* View type switcher */}
          <div className="flex gap-1 border rounded-lg p-1 bg-muted">
            <Button
              size="sm"
              variant={viewType === 'grid' ? 'default' : 'ghost'}
              onClick={() => setViewType('grid')}
              className="flex-1"
            >
              <TableIcon className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={viewType === 'list' ? 'default' : 'ghost'}
              onClick={() => setViewType('list')}
              className="flex-1"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Views */}
      <AnimatePresence mode="wait">
        {viewType === 'grid' && renderDesktopView()}
        {viewType === 'list' && renderListView()}
      </AnimatePresence>

      {/* Edit grade dialog */}
      {isEditingGrade && selectedGrade && (
        <GradeEditDialog
          grade={selectedGrade}
          onClose={() => setIsEditingGrade(false)}
          onUpdate={handleUpdateGrade}
          onDelete={handleDeleteGrade}
        />
      )}
    </div>
  );
}

// Grade Edit Dialog
function GradeEditDialog({
  grade,
  onClose,
  onUpdate,
  onDelete,
}: {
  grade: Grade;
  onClose: () => void;
  onUpdate: (grade: Grade) => void;
  onDelete: (id: string) => void;
}) {
  const [formData, setFormData] = useState(grade);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Grade: {grade.studentName}</DialogTitle>
          <DialogDescription>{grade.subject} - {grade.assessment}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Score</Label>
              <Input
                type="number"
                value={formData.score}
                onChange={(e) => setFormData({ ...formData, score: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <Label>Max Score</Label>
              <Input
                type="number"
                value={formData.maxScore}
                onChange={(e) => setFormData({ ...formData, maxScore: parseFloat(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <Label>Percentage: {((formData.score / formData.maxScore) * 100).toFixed(1)}%</Label>
          </div>

          <div>
            <Label>Comment</Label>
            <Input
              value={formData.comment || ''}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              placeholder="Add a comment..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="outline"
            className="text-red-500"
            onClick={() => {
              onDelete(grade.id);
              onClose();
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
          <Button
            onClick={() => {
              onUpdate(formData);
              onClose();
            }}
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default UnifiedGradingPanel;
