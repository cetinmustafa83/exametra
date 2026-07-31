'use client';

import { useState, useEffect } from 'react';
import { useApi } from '@/lib/hooks/useApi';
import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { AlertCircle, Eye, Clock, Check, X } from 'lucide-react';
import { formatTimeRemaining } from '@/lib/exam-utils';

interface ExamSessionRow {
  id: string;
  studentName: string;
  assessmentTitle: string;
  status: string;
  timeRemaining: number;
  suspiciousEvents: number;
  riskScore: number;
}

export default function ExamProctoringPage() {
  const [sessions, setSessions] = useState<ExamSessionRow[]>([]);
  const { data: examSessions, isLoading } = useApi('/api/v1/exams/active-sessions');

  useEffect(() => {
    if (examSessions) {
      const processed = examSessions.map((session: any) => ({
        id: session.id,
        studentName: session.student?.firstName + ' ' + session.student?.lastName,
        assessmentTitle: session.assessment?.title,
        status: session.status,
        timeRemaining: Math.max(0, Math.ceil((new Date(session.endTime).getTime() - Date.now()) / 60000)),
        suspiciousEvents: session.events?.filter((e: any) => e.severity !== 'info').length || 0,
        riskScore: 0,
      }));
      setSessions(processed);
    }
  }, [examSessions]);

  const columns = [
    {
      key: 'studentName',
      label: 'Student',
      sortable: true,
      width: '25%',
    },
    {
      key: 'assessmentTitle',
      label: 'Assessment',
      sortable: true,
      width: '25%',
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => (
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          value === 'in_progress' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {value}
        </span>
      ),
      width: '15%',
    },
    {
      key: 'timeRemaining',
      label: 'Time',
      render: (value: number) => (
        <span className={value <= 5 ? 'font-bold text-red-600' : ''}>
          {formatTimeRemaining(value)}
        </span>
      ),
      width: '12%',
    },
    {
      key: 'suspiciousEvents',
      label: 'Alerts',
      render: (value: number) => (
        value > 0 ? (
          <div className="flex items-center gap-1 text-red-600">
            <AlertCircle className="w-4 h-4" />
            {value}
          </div>
        ) : (
          <Check className="w-4 h-4 text-green-600" />
        )
      ),
      width: '12%',
    },
    {
      key: 'id',
      label: 'Actions',
      render: (id: string) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.href = `/admin/exam-proctoring/${id}`}
        >
          <Eye className="w-4 h-4 mr-1" />
          Monitor
        </Button>
      ),
      width: '11%',
    },
  ];

  const activeCount = sessions.filter((s) => s.status === 'in_progress').length;
  const alertCount = sessions.reduce((sum, s) => sum + s.suspiciousEvents, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Exam Proctoring</h1>
          <p className="text-gray-600 mt-1">Monitor active exam sessions and suspicious activity</p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Active Sessions</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{activeCount}</p>
            </div>
            <Clock className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Alerts</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{alertCount}</p>
            </div>
            <AlertCircle className={`w-8 h-8 ${alertCount > 0 ? 'text-red-500' : 'text-green-500'}`} />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Sessions</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{sessions.length}</p>
            </div>
            <Eye className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <DataTable
          columns={columns}
          data={sessions}
          isLoading={isLoading}
          searchPlaceholder="Search sessions..."
          searchableColumns={['studentName', 'assessmentTitle']}
        />
      </div>
    </div>
  );
}
