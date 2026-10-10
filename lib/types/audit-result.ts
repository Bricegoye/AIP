
import type { KPIAnalysis } from "@/lib/kpi/kpi-types";

export interface AuditTool {
  name: string;
  key: string;
  vendor: string;
  category: string;
  documentationUrl?: string;
  description: string;
  present: boolean;
  status: string;
  ids: string[];
  evidence: string[];
  sources: string[];
  certainty: string;
  details?: Record<string, unknown>;
}

export interface AuditInsight {
  key: string;
  severity:
    | "success"
    | "info"
    | "warning"
    | "critical";
  title: string;
  description: string;
  relatedTools: string[];
}

export interface AuditCategoryScore {
  category:
    | "analytics"
    | "tagManagement"
    | "consent"
    | "marketing"
    | "dataQuality";

  score: number;
  maxScore: number;
}

export interface AuditScoring {
  globalScore: number;
  maxScore: number;
  grade: string;
  categories: AuditCategoryScore[];
}

export interface AuditReport {
  executiveSummary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  priorityActions: string[];
  technicalAnalysis: string;
}

export interface AuditDetection {
  url: string;
  fetchedAt: string;
  htmlSize: number;
  tools: AuditTool[];
  insights: AuditInsight[];
}

export interface AuditSuccessResult {
  success: true;
  url: string;
  generatedAt: string;
  executionTime: number;

  detection: AuditDetection;
  scoring: AuditScoring;

  /**
   * KPI Engine V1
   * Recommandations d'indicateurs
   * sans valeurs de performance inventées.
   */
  kpis: KPIAnalysis;

  report: AuditReport;

  /**
   * Statut de génération du rapport IA.
   */
  reportStatus?: "success" | "fallback";
  reportError?: string | null;
}

export interface AuditErrorResult {
  success: false;
  url?: string;
  executionTime?: number;
  error: string;
}

export type AuditResult =
  | AuditSuccessResult
  | AuditErrorResult;
