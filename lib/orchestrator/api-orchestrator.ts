
import { DetectionEngine } from "@/lib/detectors/detection-engine";
import { KnowledgeEngine } from "@/lib/knowledge/knowledge-engine";
import { ScoringEngine } from "@/lib/scoring/scoring-engine";
import { KPIEngine } from "@/lib/kpi/kpi-engine";

import { AIReportEngine } from "@/lib/report/ai-report-engine";
import { OpenAIClient } from "@/lib/ai/openai-client";

import type {
  AIReport,
  ReportLanguage,
} from "@/lib/report/types";

export class APIOrchestrator {
  private readonly detectionEngine: DetectionEngine;
  private readonly knowledgeEngine: KnowledgeEngine;
  private readonly scoringEngine: ScoringEngine;
  private readonly kpiEngine: KPIEngine;
  private readonly reportEngine: AIReportEngine;

  constructor() {
    this.detectionEngine =
      new DetectionEngine();

    this.knowledgeEngine =
      new KnowledgeEngine();

    this.scoringEngine =
      new ScoringEngine();

    this.kpiEngine =
      new KPIEngine();

    const aiClient =
      new OpenAIClient();

    this.reportEngine =
      new AIReportEngine(aiClient);
  }

  /**
   * Rapport de secours utilisé uniquement lorsque
   * la génération du rapport IA échoue.
   *
   * L'objectif est de conserver l'audit technique
   * au lieu de faire échouer l'audit complet.
   */
  private createFallbackReport(
    language: ReportLanguage,
    errorMessage: string
  ): AIReport {
    if (language === "fr") {
      return {
        executiveSummary:
          "L’audit technique a été réalisé avec succès, mais le rapport IA n’a pas pu être généré complètement. Les résultats de détection, le scoring et les données techniques restent disponibles.",

        strengths: [
          "L’audit technique a été exécuté et les éléments détectés restent disponibles pour analyse.",
        ],

        weaknesses: [
          "Le rapport IA n’a pas pu être généré complètement pour cet audit.",
        ],

        recommendations: [
          "Examiner directement les technologies détectées, les preuves techniques, le DataLayer et les résultats du scoring.",
        ],

        priorityActions: [
          "Analyser les résultats techniques disponibles avant de relancer éventuellement la génération du rapport IA.",
        ],

        technicalAnalysis:
          `La collecte et l’analyse techniques ont été conservées. Seule la génération du rapport IA a rencontré une erreur. Détail technique : ${errorMessage}`,
      };
    }

    return {
      executiveSummary:
        "The technical audit completed successfully, but the AI report could not be fully generated. Detection results, scoring and technical data remain available.",

      strengths: [
        "The technical audit completed and the detected technical evidence remains available for analysis.",
      ],

      weaknesses: [
        "The AI report could not be fully generated for this audit.",
      ],

      recommendations: [
        "Review the detected technologies, technical evidence, DataLayer and scoring results directly.",
      ],

      priorityActions: [
        "Review the available technical audit results before optionally retrying AI report generation.",
      ],

      technicalAnalysis:
        `Technical collection and analysis were preserved. Only AI report generation failed. Technical detail: ${errorMessage}`,
    };
  }

  async analyze(
    url: string,
    language: ReportLanguage = "en"
  ) {
    const start = Date.now();

    try {
      /**
       * 1. Detection
       */
      const detection =
        await this.detectionEngine.analyze(url);

      /**
       * 2. Knowledge
       */
      const knowledge =
        this.knowledgeEngine.analyze(detection);

      /**
       * 3. Scoring
       */
      const scoring =
        this.scoringEngine.calculate(
          knowledge.tools ?? []
        );

      /**
       * 4. KPI Engine V1
       *
       * Génère des recommandations de KPIs.
       * Ne calcule aucune donnée de performance.
       */
      const kpis =
        this.kpiEngine.analyze({
          url,
          tools: knowledge.tools ?? [],
        });

      /**
       * 5. Rapport IA
       *
       * Étape non critique.
       */
      let report: AIReport;

      let reportStatus:
        | "success"
        | "fallback" =
        "success";

      let reportError:
        | string
        | null =
        null;

      try {
        report =
          await this.reportEngine.generate({
            detection: knowledge,
            knowledge:
              knowledge.insights ?? [],
            scoring,
            language,
          });
      } catch (reportGenerationError) {
        reportStatus = "fallback";

        reportError =
          reportGenerationError instanceof Error
            ? reportGenerationError.message
            : "Unknown AI report generation error";

        console.error(
          "[AIP Report]",
          reportGenerationError
        );

        report =
          this.createFallbackReport(
            language,
            reportError
          );
      }

      /**
       * 6. Résultat final
       */
      return {
        success: true,

        url,

        generatedAt:
          new Date().toISOString(),

        executionTime:
          Date.now() - start,

        detection: knowledge,

        scoring,

        /**
         * Nouveau : recommandations KPI.
         */
        kpis,

        report,

        reportStatus,

        reportError,
      };
    } catch (error) {
      console.error("[AIP]", error);

      return {
        success: false,

        url,

        executionTime:
          Date.now() - start,

        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      };
    }
  }
}
