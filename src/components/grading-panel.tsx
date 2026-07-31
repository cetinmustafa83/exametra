'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from '@/components/data-table';
import { ConfirmDialog } from '@/components/confirm-dialog';
import {
  processGrade,
  calculateWeightedGrade,
  getStatistics,
  type GradingConfig,
  type GradeOutput,
} from '@/lib/grading-engine';
import { useApiGet, useApiMutation } from '@/lib/hooks/useApi';

export interface GradingPanelProps {
  assessmentId: string;
  studentId?: string; // if provided, show single student; otherwise show class
  config: GradingConfig;
  onGradeSaved?: (grade: any) => void;
}

export function GradingPanel({
  assessmentId,
  studentId,
  config,
  onGradeSaved,
}: GradingPanelProps) {
  const [selectedStudent, setSelectedStudent] = useState<string | null>(studentId || null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingGrade, setPendingGrade] = useState<any>(null);

  // Fetch assessment and results
  const { data: assessment } = useApiGet(
    `/api/v1/assessments/${assessmentId}`
  );

  const { data: results, mutate: refetchResults } = useApiGet(
    studentId
      ? `/api/v1/assessments/${assessmentId}/results?studentId=${studentId}`
      : `/api/v1/assessments/${assessmentId}/results`
  );

  const { mutate: saveGrade, isLoading: isSaving } = useApiMutation(
    `/api/v1/assessments/${assessmentId}/grades`,
    {
      method: 'POST',
      onSuccess: () => {
        setShowConfirm(false);
        setPendingGrade(null);
        refetchResults();
        onGradeSaved?.(pendingGrade);
      },
    }
  );

  const handleGradeChange = (grade: number | string, studentId: string) => {
    setPendingGrade({ studentId, score: grade });
    setShowConfirm(true);
  };

  const handleConfirmGrade = async () => {
    await saveGrade(pendingGrade);
  };

  // Statistics
  const stats = results?.length
    ? getStatistics(
        results.map((r: any) => r.score),
        config
      )
    : null;

  return (
    <div className="space-y-6">
      {/* Assessment Header */}
      {assessment && (
        <Card>
          <CardHeader>
            <CardTitle>{assessment.title}</CardTitle>
            <CardDescription>
              {assessment.type} · Max Score: {assessment.maxScore}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="list">Students</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          {studentId && <TabsTrigger value="detail">Details</TabsTrigger>}
        </TabsList>

        {/* Student List */}
        <TabsContent value="list" className="space-y-4">
          {results && (
            <DataTable
              columns={[
                {
                  key: 'student' as any,
                  label: 'Student',
                  render: (_, row) => `${row.student?.firstName} ${row.student?.lastName}`,
                },
                {
                  key: 'score' as any,
                  label: 'Score',
                  sortable: true,
                  render: (_, row) => (
                    <Input
                      type="number"
                      value={row.score || ''}
                      onChange={(e) => handleGradeChange(e.target.value, row.studentId)}
                      className="w-20"
                    />
                  ),
                },
                {
                  key: 'feedback' as any,
                  label: 'Feedback',
                  render: (_, row) => {
                    const processed = processGrade(
                      {
                        score: row.score,
                        studentId: row.studentId,
                        assessmentId: row.assessmentId,
                        timestamp: new Date(),
                      },
                      config
                    );
                    return (
                      <span className={processed.isPassing ? 'text-green-600' : 'text-red-600'}>
                        {processed.isPassing ? 'Pass' : 'Fail'}
                      </span>
                    );
                  },
                },
              ]}
              data={results}
              isLoading={!results}
            />
          )}
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics" className="space-y-4">
          {stats && (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Average</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.average.toFixed(1)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Median</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.median.toFixed(1)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Passing</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.passingPercentage.toFixed(0)}%
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Std Dev</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.stdDev.toFixed(1)}</div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Single Student Details */}
        {studentId && results && (
          <TabsContent value="detail" className="space-y-4">
            {results[0] && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {results[0].student?.firstName} {results[0].student?.lastName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Current Score</Label>
                    <Input
                      type="number"
                      value={results[0].score || ''}
                      onChange={(e) => handleGradeChange(e.target.value, results[0].studentId)}
                    />
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Input
                      value={results[0].notes || ''}
                      placeholder="Add notes..."
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={showConfirm}
        title="Confirm Grade"
        description={`Are you sure you want to save this grade for student ${selectedStudent}?`}
        onConfirm={handleConfirmGrade}
        onCancel={() => setShowConfirm(false)}
        isLoading={isSaving}
        confirmText="Save Grade"
      />
    </div>
  );
}
