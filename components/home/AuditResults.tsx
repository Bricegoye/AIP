"use client";

import type { AuditSuccessResult } from "@/lib/types/audit-result";

import { useLanguage } from "@/lib/i18n/language-context";

import ScoreGauge from "./ScoreGauge";
import DataLayerInspector from "./DataLayerInspector";
import TechnicalEvidenceInspector from "./TechnicalEvidenceInspector";
import ConsentInspector from "./ConsentInspector";
import KPIRecommendations from "./KPIRecommendations";

interface AuditResultsProps {
  result: AuditSuccessResult;
}

export default function AuditResults({
  result,
}: AuditResultsProps) {
  const { t, language } = useLanguage();

  const detectedTools = result.detection.tools.filter(
    (tool) => tool.present
  );

  const categoryLabels: Record<string, string> = {
    analytics: t.results.categories.analytics,
    tagManagement: t.results.categories.tagManagement,
    consent: t.results.categories.consent,
    marketing: t.results.categories.marketing,
    dataQuality: t.results.categories.dataQuality,
  };

  return (
    <div className="mx-auto mt-16 max-w-4xl">
      <div className="rounded-3xl border border-slate-200 bg-white p-12 shadow-xl">

        {/* Audit Header */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">

            {/* Website */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-sky-600">
                  {t.results.report}
                </span>

                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  {t.results.completed}
                </span>
              </div>

              <h2 className="mt-3 break-all text-xl font-bold text-slate-900 sm:text-2xl">
                {result.url}
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                {t.results.implementationAnalysis}
              </p>
            </div>

            {/* Global Score */}
            <div className="shrink-0">
              <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-center shadow-sm">

                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {t.results.healthScore}
                </p>

                <div className="mt-1 flex items-baseline justify-center gap-1">
                  <span className="text-3xl font-bold text-slate-900">
                    {result.scoring.globalScore}
                  </span>

                  <span className="text-sm font-medium text-slate-400">
                    /100
                  </span>
                </div>

                <div className="mt-2">
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-700">
                    {t.results.grade} {result.scoring.grade}
                  </span>
                </div>

              </div>
            </div>

          </div>
        </div>

        {/* Score Gauge */}
        <div className="mt-12">
          <ScoreGauge
            score={result.scoring.globalScore}
          />
        </div>

        {/* Detected Technologies */}
        <div className="mt-12 border-t border-slate-200 pt-10">

          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-bold text-slate-900">
              {t.results.detectedTechnologies}
            </h3>

            <span className="rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-700">
              {detectedTools.length}{" "}
              {t.results.detected.toLowerCase()}
            </span>
          </div>

          <div className="mt-6 space-y-3">

            {detectedTools.map((tool) => {
              const isDataLayer =
                tool.key === "datalayer";

              const isConsent =
                tool.category === "Consent";

              return (
                <div
                  key={tool.key}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4"
                >

                  {/* Technology Header */}
                  <div className="flex items-start justify-between gap-4">

                    <div>
                      <p className="font-semibold text-slate-900">
                        {tool.name}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {tool.category}
                      </p>
                    </div>

                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {t.results.detected}
                    </span>

                  </div>

                  {/* Technology IDs */}
                  {tool.ids &&
                    tool.ids.length > 0 && (
                      <div className="mt-4 border-t border-slate-200 pt-4">

                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                          {t.results.detectedId}
                        </p>

                        <div className="flex flex-wrap gap-2">

                          {tool.ids.map(
                            (id) => (
                              <span
                                key={id}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs font-medium text-slate-700"
                              >
                                {id}
                              </span>
                            )
                          )}

                        </div>

                      </div>
                    )}

                  {/* DataLayer Inspector */}
                  {isDataLayer && (
                    <DataLayerInspector
                      details={
                        tool.details
                      }
                    />
                  )}

                  {/* Consent Inspector */}
                  {isConsent && (
                    <ConsentInspector
                      toolKey={
                        tool.key
                      }
                      toolName={
                        tool.name
                      }
                      evidence={
                        tool.evidence
                      }
                      sources={
                        tool.sources
                      }
                      details={
                        tool.details
                      }
                      certainty={
                        tool.certainty
                      }
                    />
                  )}

                  {/* Technical Evidence Inspector */}
                  {!isDataLayer &&
                    !isConsent && (
                      <TechnicalEvidenceInspector
                        evidence={
                          tool.evidence
                        }
                        sources={
                          tool.sources
                        }
                        details={
                          tool.details
                        }
                        certainty={
                          tool.certainty
                        }
                      />
                    )}

                </div>
              );
            })}

          </div>
        </div>

        {/* Category Scores */}
        <div className="mt-12 border-t border-slate-200 pt-10">

          <div className="flex items-center justify-between gap-4">

            <h3 className="text-lg font-bold text-slate-900">
              {t.results.categoryScores}
            </h3>

            <span className="text-sm text-slate-500">
              {t.results.maturityBreakdown}
            </span>

          </div>

          <div className="mt-8 space-y-6">

            {result.scoring.categories.map(
              (category) => {
                const percentage =
                  category.maxScore > 0
                    ? Math.round(
                        (category.score /
                          category.maxScore) *
                          100
                      )
                    : 0;

                return (
                  <div
                    key={
                      category.category
                    }
                  >

                    <div className="mb-2 flex items-center justify-between">

                      <p className="font-semibold text-slate-800">
                        {categoryLabels[
                          category.category
                        ] ??
                          category.category}
                      </p>

                      <div className="flex items-center gap-3">

                        <span className="text-sm text-slate-500">
                          {percentage}%
                        </span>

                        <span className="min-w-[65px] text-right text-sm font-semibold text-slate-900">
                          {category.score} /{" "}
                          {
                            category.maxScore
                          }
                        </span>

                      </div>

                    </div>

                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-sky-500 transition-all duration-700"
                        style={{
                          width: `${percentage}%`,
                        }}
                      />
                    </div>

                  </div>
                );
              }
            )}

          </div>
        </div>
        {/* KPI Engine V1 */}
{result.kpis && (
  <KPIRecommendations kpis={result.kpis} />
)}

        {/* Executive Summary */}
        <div className="mt-12 border-t border-slate-200 pt-10">

          <div>

            <span className="text-xs font-semibold uppercase tracking-wider text-violet-600">
              {t.results.aiAnalysis}
            </span>

            <h3 className="mt-2 text-lg font-bold text-slate-900">
              {t.results.executiveSummary}
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              {
                t.results
                  .executiveSummaryDescription
              }
            </p>

          </div>

          <div className="mt-6 rounded-2xl border border-violet-100 bg-violet-50/50 p-6">

            <p className="text-base leading-8 text-slate-700">
              {
                result.report
                  .executiveSummary
              }
            </p>

          </div>

        </div>

        {/* Strengths & Weaknesses */}
        <div className="mt-12 border-t border-slate-200 pt-10">

          <div>

            <h3 className="text-lg font-bold text-slate-900">
              {t.results.auditFindings}
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              {
                t.results
                  .findingsDescription
              }
            </p>

          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">

            {/* Strengths */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6">

              <div className="flex items-center gap-3">

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  ✓
                </div>

                <div>

                  <p className="font-bold text-slate-900">
                    {t.results.strengths}
                  </p>

                  <p className="text-sm text-slate-500">
                    {
                      t.results
                        .strengthsDescription
                    }
                  </p>

                </div>

              </div>

              <div className="mt-6 space-y-4">

                {result.report.strengths.map(
                  (
                    strength,
                    index
                  ) => (
                    <div
                      key={index}
                      className="flex items-start gap-3"
                    >

                      <span className="mt-1 text-emerald-600">
                        ✓
                      </span>

                      <p className="text-sm leading-6 text-slate-700">
                        {strength}
                      </p>

                    </div>
                  )
                )}

              </div>

            </div>

            {/* Weaknesses */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6">

              <div className="flex items-center gap-3">

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  !
                </div>

                <div>

                  <p className="font-bold text-slate-900">
                    {t.results.weaknesses}
                  </p>

                  <p className="text-sm text-slate-500">
                    {
                      t.results
                        .weaknessesDescription
                    }
                  </p>

                </div>

              </div>

              <div className="mt-6 space-y-4">

                {result.report.weaknesses.map(
                  (
                    weakness,
                    index
                  ) => (
                    <div
                      key={index}
                      className="flex items-start gap-3"
                    >

                      <span className="mt-1 text-amber-600">
                        !
                      </span>

                      <p className="text-sm leading-6 text-slate-700">
                        {weakness}
                      </p>

                    </div>
                  )
                )}

              </div>

            </div>

          </div>

        </div>

        {/* Priority Actions */}
        <div className="mt-12 border-t border-slate-200 pt-10">

          <div>

            <span className="text-xs font-semibold uppercase tracking-wider text-violet-600">
              {t.results.actionPlan}
            </span>

            <h3 className="mt-2 text-lg font-bold text-slate-900">
              {t.results.priorityActions}
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              {
                t.results
                  .priorityDescription
              }
            </p>

          </div>

          <div className="mt-6 space-y-4">

            {result.report.priorityActions.map(
              (
                action,
                index
              ) => (
                <div
                  key={index}
                  className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-sky-200 hover:shadow-sm"
                >

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-700">
                    {index + 1}
                  </div>

                  <div>

                    <p className="text-sm font-semibold text-slate-900">
                      {t.results.priority}{" "}
                      {index + 1}
                    </p>

                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {action}
                    </p>

                  </div>

                </div>
              )
            )}

          </div>

        </div>

        {/* AI Recommendations */}
        <div className="mt-12 border-t border-slate-200 pt-10">

          <div>

            <span className="text-xs font-semibold uppercase tracking-wider text-violet-600">
              {t.results.aiInsights}
            </span>

            <h3 className="mt-2 text-lg font-bold text-slate-900">
              {t.results.recommendations}
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              {
                t.results
                  .recommendationsDescription
              }
            </p>

          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">

            {result.report.recommendations.map(
              (
                recommendation,
                index
              ) => (
                <div
                  key={index}
                  className="rounded-2xl border border-violet-100 bg-violet-50/40 p-5 transition hover:border-violet-200 hover:shadow-sm"
                >

                  <div className="flex items-start gap-4">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-lg">
                      ✦
                    </div>

                    <div>

                      <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
                        {
                          t.results
                            .recommendation
                        }{" "}
                        {index + 1}
                      </p>

                      <p className="mt-2 text-sm leading-6 text-slate-700">
                        {recommendation}
                      </p>

                    </div>

                  </div>

                </div>
              )
            )}

          </div>

        </div>

        {/* Technical Analysis */}
        <div className="mt-12 border-t border-slate-200 pt-10">

          <div>

            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t.results.technicalDetails}
            </span>

            <h3 className="mt-2 text-lg font-bold text-slate-900">
              {t.results.technicalAnalysis}
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              {
                t.results
                  .technicalDescription
              }
            </p>

          </div>

          <details className="group mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">

            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5">

              <div>

                <p className="font-semibold text-slate-900">
                  {
                    t.results
                      .viewTechnicalAnalysis
                  }
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {
                    t.results
                      .expandTechnicalAnalysis
                  }
                </p>

              </div>

              <span className="text-xl text-slate-400 transition-transform group-open:rotate-180">
                ↓
              </span>

            </summary>

            <div className="border-t border-slate-200 bg-white px-6 py-6">

              <p className="whitespace-pre-line text-sm leading-7 text-slate-700">
                {
                  result.report
                    .technicalAnalysis
                }
              </p>

            </div>

          </details>

        </div>

        {/* Audit Metadata */}
        <div className="mt-12 border-t border-slate-200 pt-8">

          <div className="flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">

              <span>
                {t.results.auditCompleted}
              </span>

              <span className="hidden sm:inline">
                •
              </span>

              <span>
                {(
                  result.executionTime /
                  1000
                ).toFixed(1)}
                s
              </span>

              <span className="hidden sm:inline">
                •
              </span>

              <span>
                {new Date(
                  result.generatedAt
                ).toLocaleString(
                  language === "fr"
                    ? "fr-FR"
                    : "en-US",
                  {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }
                )}
              </span>

            </div>

            <div>
              <span className="font-medium text-slate-600">
                {t.results.poweredBy}
              </span>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}