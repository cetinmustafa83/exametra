"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertCircle, FileText, Users, Clock } from "lucide-react";

interface ComplianceData {
  status: any;
  policiesConfigured: number;
  policiesReviewed: number;
  dpiaRecords: any[];
  consultations: any[];
}

export default function ComplianceDashboard() {
  const [data, setData] = useState<ComplianceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/v1/compliance/status");
        if (!response.ok) throw new Error("Failed to fetch compliance status");
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error("[v0] Error fetching compliance data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-600">Loading compliance status...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">Failed to load compliance dashboard</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Compliance Monitoring Dashboard</h1>
        <p className="text-slate-600 mt-2">
          Track your school&apos;s data protection compliance status and document management
        </p>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              {data.status?.onboardingCompleted ? (
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              ) : (
                <AlertCircle className="w-8 h-8 text-yellow-600" />
              )}
              <div>
                <p className="text-sm text-slate-600">Onboarding Status</p>
                <p className="font-semibold text-slate-900">
                  {data.status?.onboardingCompleted ? "Complete" : "Pending"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-slate-600">Data Retention Policies</p>
                <p className="font-semibold text-slate-900">
                  {data.policiesConfigured} / {data.policiesReviewed} reviewed
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-slate-600">DPIA Records</p>
                <p className="font-semibold text-slate-900">{data.dpiaRecords.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-sm text-slate-600">Consultations</p>
                <p className="font-semibold text-slate-900">{data.consultations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Retention Policies */}
      <Card>
        <CardHeader>
          <CardTitle>Active Data Retention Policies</CardTitle>
          <CardDescription>
            Configured retention periods for each data category
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-600">
            <p>{data.policiesConfigured} policies configured</p>
            <p className="mt-2">Policies are centrally defined and reviewed by your DPO.</p>
          </div>
        </CardContent>
      </Card>

      {/* DPIA Records */}
      {data.dpiaRecords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>DPIA Records</CardTitle>
            <CardDescription>
              Data Protection Impact Assessments for high-risk modules
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.dpiaRecords.map((dpia: any) => (
                <div
                  key={dpia.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <span className="text-sm font-medium text-slate-900">
                    {dpia.moduleScope}
                  </span>
                  <span className="text-xs text-slate-500">
                    {dpia.approvedAt ? "✓ Approved" : "Pending review"}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Consultation Log */}
      {data.consultations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Consultation Log</CardTitle>
            <CardDescription>
              Staff and parent body consultations per module
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.consultations.slice(0, 5).map((consult: any) => (
                <div
                  key={consult.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {consult.consultationType}
                    </p>
                    {consult.moduleScope && (
                      <p className="text-xs text-slate-500">{consult.moduleScope}</p>
                    )}
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(consult.acknowledgedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
