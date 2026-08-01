"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ComplianceWizard } from "@/components/compliance-wizard";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function CompliancePage() {
  const router = useRouter();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, fetch the current user's schoolId from session/auth
    // For now, we'll get it from the URL or localStorage
    const fetchSchoolId = async () => {
      try {
        const response = await fetch("/api/v1/user/current");
        if (!response.ok) throw new Error("Failed to fetch user");
        const user = await response.json();
        if (user.schoolId) {
          setSchoolId(user.schoolId);
        }
      } catch (error) {
        console.error("[v0] Error fetching school ID:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSchoolId();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (!schoolId) {
    return (
      <div className="max-w-md mx-auto">
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-600">Unable to load compliance setup. Please ensure you are logged in.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      {isCompleted ? (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="pt-6">
            <p className="text-emerald-800 mb-4">
              ✓ Compliance onboarding completed successfully! Your school is now ready to use SchulOS.
            </p>
            <button
              onClick={() => router.push("/admin/compliance-overview")}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              Go to Compliance Dashboard →
            </button>
          </CardContent>
        </Card>
      ) : (
        <ComplianceWizard
          schoolId={schoolId}
          onComplete={(data) => {
            console.log("[v0] Wizard completed:", data);
            setIsCompleted(true);
          }}
        />
      )}
    </div>
  );
}
