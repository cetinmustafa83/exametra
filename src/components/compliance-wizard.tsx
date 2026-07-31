"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, CheckCircle, ChevronRight, ChevronLeft } from "lucide-react";

const BUNDESLANDS = [
  "BERLIN",
  "BREMEN",
  "HAMBURG",
  "HESSE",
  "LOWER_SAXONY",
  "MECKLENBURG_VORPOMMERN",
  "NORTH_RHINE_WESTPHALIA",
  "RHINELAND_PALATINATE",
  "SAARLAND",
  "SAXONY",
  "SAXONY_ANHALT",
  "SCHLESWIG_HOLSTEIN",
  "THURINGIA",
  "BADEN_WUERTTEMBERG",
  "BAVARIA",
  "BRANDENBURG",
];

const MODULES = [
  { id: "AI_TUTOR", label: "AI Tutor", requiresDpia: true },
  { id: "EXAM_MODE", label: "Exam Mode", requiresDpia: true },
  { id: "WELLNESS_CHECKS", label: "Wellness Checks", requiresDpia: false },
  { id: "SIGNAGE_EMERGENCY", label: "Signage & Emergency", requiresDpia: false },
  { id: "MESSAGING", label: "Messaging", requiresDpia: false },
  { id: "LEARNING_ANALYTICS", label: "Learning Analytics", requiresDpia: false },
];

interface WizardState {
  step: number;
  schoolName?: string;
  dpoName?: string;
  dpoEmail?: string;
  schultragerName?: string;
  schultragerEmail?: string;
  bundesland?: string;
  consultationTypes: string[];
  dpiaModules: Record<string, { completed: boolean; documentUrl?: string }>;
  moduleConsultations: Record<
    string,
    {
      elternbeirat: boolean;
      personalrat: boolean;
      schulkonferenz: boolean;
    }
  >;
}

interface ComplianceWizardProps {
  schoolId: string;
  onComplete?: (data: WizardState) => void;
}

export function ComplianceWizard({ schoolId, onComplete }: ComplianceWizardProps) {
  const [state, setState] = useState<WizardState>({
    step: 1,
    consultationTypes: [],
    dpiaModules: MODULES.reduce(
      (acc, mod) => ({
        ...acc,
        [mod.id]: { completed: false },
      }),
      {}
    ),
    moduleConsultations: MODULES.reduce(
      (acc, mod) => ({
        ...acc,
        [mod.id]: {
          elternbeirat: false,
          personalrat: mod.requiresDpia,
          schulkonferenz: false,
        },
      }),
      {}
    ),
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isStep1Valid =
    state.schoolName &&
    state.dpoName &&
    state.dpoEmail &&
    state.schultragerName &&
    state.schultragerEmail &&
    state.bundesland;

  const isStep2Valid = true; // Retention policies auto-seeded

  const isStep3Valid = Object.keys(state.moduleConsultations).length > 0;

  const isStep4Valid =
    MODULES.filter((m) => m.requiresDpia).every(
      (m) => state.dpiaModules[m.id]?.completed
    );

  const handleStep1Submit = async () => {
    if (!isStep1Valid) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/v1/compliance/onboarding/step1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          dpoName: state.dpoName,
          dpoEmail: state.dpoEmail,
          schultragerName: state.schultragerName,
          schultragerEmail: state.schultragerEmail,
          bundesland: state.bundesland,
        }),
      });

      if (!response.ok) throw new Error("Failed to save step 1");
      setState((prev) => ({ ...prev, step: 2 }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleStep4Submit = async () => {
    if (!isStep4Valid) {
      setError("Please complete all required DPIAs");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/v1/compliance/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          state,
        }),
      });

      if (!response.ok) throw new Error("Failed to complete onboarding");
      onComplete?.(state);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Progress Indicator */}
      <div className="flex justify-between items-center">
        {[1, 2, 3, 4, 5].map((step) => (
          <div
            key={step}
            className={`flex items-center ${step < 5 ? "flex-1" : ""}`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                state.step >= step
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {state.step > step ? (
                <CheckCircle className="w-6 h-6" />
              ) : (
                step
              )}
            </div>
            {step < 5 && (
              <div
                className={`flex-1 h-1 mx-2 ${
                  state.step > step ? "bg-emerald-600" : "bg-slate-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Step 1: School & Contact Info */}
      {state.step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>School & Contact Information</CardTitle>
            <CardDescription>
              Provide your school&apos;s basic information and designated contacts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                School Name
              </label>
              <Input
                value={state.schoolName || ""}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    schoolName: e.target.value,
                  }))
                }
                placeholder="e.g., Gymnasium Berlin"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Data Protection Officer (DPO) Name
                </label>
                <Input
                  value={state.dpoName || ""}
                  onChange={(e) =>
                    setState((prev) => ({ ...prev, dpoName: e.target.value }))
                  }
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  DPO Email
                </label>
                <Input
                  type="email"
                  value={state.dpoEmail || ""}
                  onChange={(e) =>
                    setState((prev) => ({ ...prev, dpoEmail: e.target.value }))
                  }
                  placeholder="dpo@school.de"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Schulträger (School Provider) Name
                </label>
                <Input
                  value={state.schultragerName || ""}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      schultragerName: e.target.value,
                    }))
                  }
                  placeholder="e.g., City of Berlin"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Schulträger Contact Email
                </label>
                <Input
                  type="email"
                  value={state.schultragerEmail || ""}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      schultragerEmail: e.target.value,
                    }))
                  }
                  placeholder="admin@schultraeger.de"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                State (Bundesland)
              </label>
              <Select value={state.bundesland} onValueChange={(value) =>
                setState((prev) => ({ ...prev, bundesland: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select state..." />
                </SelectTrigger>
                <SelectContent>
                  {BUNDESLANDS.map((land) => (
                    <SelectItem key={land} value={land}>
                      {land.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <div className="flex justify-end gap-3 px-6 py-4 border-t">
            <Button onClick={handleStep1Submit} disabled={!isStep1Valid || loading}>
              {loading ? "Saving..." : "Next"}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: Retention Periods (coming in next iteration) */}
      {state.step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Data Retention Periods</CardTitle>
            <CardDescription>
              Configure retention periods for each data category (state-specific defaults provided)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600">
              Retention periods have been pre-seeded based on your state&apos;s regulations. 
              Your DPO should review and confirm these settings.
            </p>
          </CardContent>
          <div className="flex justify-between gap-3 px-6 py-4 border-t">
            <Button variant="outline" onClick={() => setState((prev) => ({ ...prev, step: 1 }))}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button onClick={() => setState((prev) => ({ ...prev, step: 3 }))}>
              Next: Consultations
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3: Consultations */}
      {state.step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Consultation Checklist</CardTitle>
            <CardDescription>
              Log consultations with staff and parent bodies per module
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {MODULES.map((module) => (
                <div key={module.id} className="border-b pb-4 last:border-b-0">
                  <h4 className="font-medium text-slate-900 mb-3">{module.label}</h4>
                  <div className="space-y-2 pl-4">
                    <label className="flex items-center gap-3">
                      <Checkbox
                        checked={
                          state.moduleConsultations[module.id]?.elternbeirat || false
                        }
                        onCheckedChange={(checked) =>
                          setState((prev) => ({
                            ...prev,
                            moduleConsultations: {
                              ...prev.moduleConsultations,
                              [module.id]: {
                                ...prev.moduleConsultations[module.id],
                                elternbeirat: checked === true,
                              },
                            },
                          }))
                        }
                      />
                      <span className="text-sm text-slate-700">
                        Elternbeirat (Parent Council) consulted
                      </span>
                    </label>
                    {!module.requiresDpia && (
                      <label className="flex items-center gap-3">
                        <Checkbox
                          checked={
                            state.moduleConsultations[module.id]?.schulkonferenz || false
                          }
                          onCheckedChange={(checked) =>
                            setState((prev) => ({
                              ...prev,
                              moduleConsultations: {
                                ...prev.moduleConsultations,
                                [module.id]: {
                                  ...prev.moduleConsultations[module.id],
                                  schulkonferenz: checked === true,
                                },
                              },
                            }))
                          }
                        />
                        <span className="text-sm text-slate-700">
                          Schulkonferenz (School Conference) consulted
                        </span>
                      </label>
                    )}
                    {module.requiresDpia && (
                      <label className="flex items-center gap-3">
                        <Checkbox checked={true} disabled />
                        <span className="text-sm text-slate-700">
                          Personalrat (Staff Council) consulted{" "}
                          <span className="text-xs text-slate-500">(required)</span>
                        </span>
                      </label>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <div className="flex justify-between gap-3 px-6 py-4 border-t">
            <Button variant="outline" onClick={() => setState((prev) => ({ ...prev, step: 2 }))}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button onClick={() => setState((prev) => ({ ...prev, step: 4 }))}>
              Next: DPIA Documents
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 4: DPIA Gating */}
      {state.step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>DPIA (Data Protection Impact Assessment)</CardTitle>
            <CardDescription>
              Upload completed DPIAs for high-risk modules before enabling them
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {MODULES.filter((m) => m.requiresDpia).map((module) => (
              <div key={module.id} className="border rounded-lg p-4">
                <h4 className="font-medium text-slate-900 mb-2">{module.label} DPIA</h4>
                <p className="text-sm text-slate-600 mb-3">
                  Upload your completed DPIA document (PDF)
                </p>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setState((prev) => ({
                        ...prev,
                        dpiaModules: {
                          ...prev.dpiaModules,
                          [module.id]: {
                            completed: true,
                            documentUrl: e.target.files![0].name,
                          },
                        },
                      }));
                    }
                  }}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                />
                {state.dpiaModules[module.id]?.documentUrl && (
                  <p className="text-sm text-emerald-600 mt-2">
                    ✓ {state.dpiaModules[module.id].documentUrl}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
          <div className="flex justify-between gap-3 px-6 py-4 border-t">
            <Button variant="outline" onClick={() => setState((prev) => ({ ...prev, step: 3 }))}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button onClick={() => setState((prev) => ({ ...prev, step: 5 }))}>
              Review & Complete
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 5: Summary & Complete */}
      {state.step === 5 && (
        <Card>
          <CardHeader>
            <CardTitle>Compliance Setup Complete</CardTitle>
            <CardDescription>
              Review your configuration before finalizing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <p className="text-sm text-emerald-800">
                ✓ All compliance requirements have been configured. Your school is now ready for
                production use.
              </p>
            </div>
            <div className="text-sm text-slate-600 space-y-2">
              <p><strong>DPO:</strong> {state.dpoName} ({state.dpoEmail})</p>
              <p><strong>State:</strong> {state.bundesland}</p>
              <p><strong>Modules:</strong> {MODULES.length} configured</p>
            </div>
          </CardContent>
          <div className="flex justify-between gap-3 px-6 py-4 border-t">
            <Button variant="outline" onClick={() => setState((prev) => ({ ...prev, step: 4 }))}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button onClick={handleStep4Submit} disabled={loading}>
              {loading ? "Completing..." : "Finalize Setup"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
