import type {
  AnalyticsToolDetection,
  CertaintyLevel,
  ToolCategory,
} from "../types";

import type {
  ScoreCategory,
} from "./scoring-types";

export interface ScoringRule {
  id: string;
  category: ScoreCategory;
  points: number;
  description: string;

  toolKeys?: string[];
  toolCategories?: ToolCategory[];
  minimumCertainty?: CertaintyLevel;

  match: (
    tools: AnalyticsToolDetection[]
  ) => boolean;
}

/**
 * Convertit le niveau de certitude
 * en valeur numérique.
 */
function certaintyValue(
  certainty: CertaintyLevel
): number {
  switch (certainty) {
    case "Élevé":
      return 3;

    case "Moyen":
      return 2;

    case "Faible":
      return 1;
  }
}

/**
 * Vérifie si au moins un outil détecté
 * correspond aux critères demandés.
 */
function hasDetectedTool(
  tools: AnalyticsToolDetection[],
  options: {
    keys?: string[];
    categories?: ToolCategory[];
    minimumCertainty?: CertaintyLevel;
  }
): boolean {
  const minimumCertainty =
    options.minimumCertainty ??
    "Faible";

  return tools.some((tool) => {
    const matchesKey =
      !options.keys ||
      options.keys.length === 0 ||
      options.keys.includes(
        tool.key
      );

    const matchesCategory =
      !options.categories ||
      options.categories.length ===
        0 ||
      options.categories.includes(
        tool.category
      );

    const matchesCertainty =
      certaintyValue(
        tool.certainty
      ) >=
      certaintyValue(
        minimumCertainty
      );

    return (
      tool.present &&
      matchesKey &&
      matchesCategory &&
      matchesCertainty
    );
  });
}

/**
 * Récupère les informations détaillées
 * du DataLayer.
 */
function getDataLayerDetails(
  tools: AnalyticsToolDetection[]
):
  | Record<string, unknown>
  | undefined {
  return tools.find(
    (tool) =>
      tool.key === "datalayer" &&
      tool.present
  )?.details;
}

/**
 * Règles de scoring AIP V3.1.
 *
 * Analytics       : 20
 * Tag Management  : 20
 * Consent         : 20
 * Marketing       : 20
 * Data Quality    : 20
 *
 * Total           : 100
 */
export const scoringRules:
  ScoringRule[] = [
  /**
   * ANALYTICS — 20 points
   */
  {
    id:
      "analytics-tool-detected",

    category: "analytics",

    points: 20,

    description:
      "Au moins un outil Analytics fiable est détecté.",

    toolCategories: [
      "Analytics",
    ],

    minimumCertainty:
      "Moyen",

    match: (tools) =>
      hasDetectedTool(
        tools,
        {
          categories: [
            "Analytics",
          ],

          minimumCertainty:
            "Moyen",
        }
      ),
  },

  /**
   * TAG MANAGEMENT — 20 points
   */
  {
    id:
      "tag-management-detected",

    category:
      "tagManagement",

    points: 20,

    description:
      "Au moins un outil de Tag Management fiable est détecté.",

    toolCategories: [
      "Tag Management",
    ],

    minimumCertainty:
      "Moyen",

    match: (tools) =>
      hasDetectedTool(
        tools,
        {
          categories: [
            "Tag Management",
          ],

          minimumCertainty:
            "Moyen",
        }
      ),
  },

  /**
   * CONSENT — 20 points
   *
   * CMP identifiée           : 10
   * Google Consent Mode      : 6
   * IAB TCF API              : 4
   */

  /**
   * 1 — CMP identifiée
   */
  {
    id:
      "identified-cmp-detected",

    category: "consent",

    points: 10,

    description:
      "Une Consent Management Platform identifiable est détectée.",

    toolKeys: [
      "onetrust",
      "didomi",
      "axeptio",
      "cookiebot",
    ],

    minimumCertainty:
      "Moyen",

    match: (tools) =>
      hasDetectedTool(
        tools,
        {
          keys: [
            "onetrust",
            "didomi",
            "axeptio",
            "cookiebot",
          ],

          minimumCertainty:
            "Moyen",
        }
      ),
  },

  /**
   * 2 — Google Consent Mode
   */
  {
    id:
      "google-consent-mode-detected",

    category: "consent",

    points: 6,

    description:
      "Google Consent Mode est observé dans les scripts ou les requêtes réseau.",

    toolKeys: [
      "google-consent-mode",
    ],

    minimumCertainty:
      "Moyen",

    match: (tools) =>
      hasDetectedTool(
        tools,
        {
          keys: [
            "google-consent-mode",
          ],

          minimumCertainty:
            "Moyen",
        }
      ),
  },

  /**
   * 3 — IAB TCF API
   */
  {
    id:
      "tcf-api-detected",

    category: "consent",

    points: 4,

    description:
      "L’API IAB Transparency and Consent Framework est détectée.",

    toolKeys: [
      "tcf-api",
    ],

    minimumCertainty:
      "Moyen",

    match: (tools) =>
      hasDetectedTool(
        tools,
        {
          keys: [
            "tcf-api",
          ],

          minimumCertainty:
            "Moyen",
        }
      ),
  },

  /**
   * MARKETING — 20 points
   */
  {
    id:
      "advertising-tool-detected",

    category: "marketing",

    points: 20,

    description:
      "Au moins un outil publicitaire fiable est détecté.",

    toolCategories: [
      "Advertising",
    ],

    minimumCertainty:
      "Moyen",

    match: (tools) =>
      hasDetectedTool(
        tools,
        {
          categories: [
            "Advertising",
          ],

          minimumCertainty:
            "Moyen",
        }
      ),
  },

  /**
   * DATA QUALITY — 20 points
   *
   * DataLayer détecté              : 5
   * Événements détectés            : 3
   * Événements métier              : 5
   * Variables standardisées        : 4
   * E-commerce ou consentement     : 3
   */

  /**
   * 1 — Présence du DataLayer
   */
  {
    id:
      "data-layer-detected",

    category:
      "dataQuality",

    points: 5,

    description:
      "Un DataLayer fiable est détecté.",

    toolCategories: [
      "DataLayer",
    ],

    minimumCertainty:
      "Moyen",

    match: (tools) =>
      hasDetectedTool(
        tools,
        {
          categories: [
            "DataLayer",
          ],

          minimumCertainty:
            "Moyen",
        }
      ),
  },

  /**
   * 2 — Présence d’événements
   */
  {
    id:
      "data-layer-events-detected",

    category:
      "dataQuality",

    points: 3,

    description:
      "Le DataLayer contient des événements.",

    match: (tools) => {
      const details =
        getDataLayerDetails(
          tools
        );

      return (
        typeof details
          ?.eventCount ===
          "number" &&
        details.eventCount > 0
      );
    },
  },

  /**
   * 3 — Événements métier
   */
  {
    id:
      "data-layer-business-events-detected",

    category:
      "dataQuality",

    points: 5,

    description:
      "Le DataLayer contient des événements métier.",

    match: (tools) => {
      const details =
        getDataLayerDetails(
          tools
        );

      return (
        typeof details
          ?.businessEventCount ===
          "number" &&
        details
          .businessEventCount >
          0
      );
    },
  },

  /**
   * 4 — Variables standardisées
   */
  {
    id:
      "data-layer-standard-variables-detected",

    category:
      "dataQuality",

    points: 4,

    description:
      "Le DataLayer contient des variables standardisées.",

    match: (tools) => {
      const details =
        getDataLayerDetails(
          tools
        );

      return (
        typeof details
          ?.standardVariableCount ===
          "number" &&
        details
          .standardVariableCount >
          0
      );
    },
  },

  /**
   * 5 — Signaux avancés
   */
  {
    id:
      "data-layer-advanced-signals-detected",

    category:
      "dataQuality",

    points: 3,

    description:
      "Le DataLayer contient des signaux e-commerce ou de consentement.",

    match: (tools) => {
      const details =
        getDataLayerDetails(
          tools
        );

      return (
        details
          ?.ecommerceDetected ===
          true ||
        details
          ?.consentSignals ===
          true
      );
    },
  },
];