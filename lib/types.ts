export type CertaintyLevel = "Élevé" | "Moyen" | "Faible";

export type InsightSeverity =
  | "info"
  | "warning"
  | "success"
  | "critical";

export type AnalyticsInsight = {
  key: string;

  severity: InsightSeverity;

  title: string;

  description: string;

  relatedTools: string[];
};

export type DetectionStatus =
  | "Détecté directement"
  | "Possiblement chargé via GTM"
  | "Non détecté";

export type ToolCategory =
  | "Analytics"
  | "Tag Management"
  | "Consent"
  | "Advertising"
  | "UX Analytics"
  | "A/B Testing"
  | "DataLayer"
  | "Chatbot"
  | "Other";

/**
 * AIP V3.3 — Chatbot Detector
 *
 * Décrit la manière dont une solution chatbot
 * semble être intégrée sur le site audité.
 */
export type ChatbotIntegrationMode =
  | "hardcoded"
  | "third-party-script"
  | "possibly-via-gtm";

/**
 * Sources de preuves utilisées pour confirmer
 * la présence d'une solution chatbot.
 */
export type ChatbotEvidenceType =
  | "html"
  | "script"
  | "network"
  | "runtime";

/**
 * Informations spécifiques aux solutions chatbot.
 *
 * Ces informations pourront être stockées dans
 * `details` d'un AnalyticsToolDetection.
 */
export type ChatbotDetectionDetails = {
  /**
   * Fournisseur identifié.
   *
   * Exemples :
   * Salesforce
   * Genesys
   * Intercom
   * Zendesk
   * eKonsilio
   */
  provider: string;

  /**
   * Mode d'intégration probable du chatbot.
   */
  integrationMode?: ChatbotIntegrationMode;

  /**
   * Types de preuves ayant permis la détection.
   */
  evidenceTypes: ChatbotEvidenceType[];

  /**
   * Identifiants techniques éventuellement détectés.
   *
   * Exemple :
   * Salesforce Org ID
   * Intercom App ID
   * Genesys Deployment ID
   */
  identifiers?: string[];
};

export type AnalyticsToolDetection = {
  name: string;

  key: string;

  vendor: string;

  category: ToolCategory;

  documentationUrl: string;

  description: string;

  present: boolean;

  status: DetectionStatus;

  ids: string[];

  evidence: string[];

  sources: string[];

  certainty: CertaintyLevel;

  /**
   * Informations spécifiques à chaque technologie.
   *
   * Pour les chatbots, ce champ pourra contenir
   * un ChatbotDetectionDetails.
   */
  details?: Record<string, unknown>;
};

export type AnalyticsDetectionResult = {
  url: string;

  fetchedAt: string;

  htmlSize: number;

  tools: AnalyticsToolDetection[];

  insights?: AnalyticsInsight[];

  rawSignals: {
    scriptSrcs: string[];

    headSnippet: string;

    inlineScriptSnippet: string;
  };
};