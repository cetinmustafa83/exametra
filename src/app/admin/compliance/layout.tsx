"use client";

import React from "react";

export default function ComplianceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Compliance & Data Protection Setup
          </h1>
          <p className="text-lg text-slate-600">
            Configure your school&apos;s legal and data protection compliance
            framework
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
