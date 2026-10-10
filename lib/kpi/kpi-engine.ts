
import type {
  KPIAnalysis,
  KPICategory,
  KPIPriority,
  KPIRecommendation,
  KPITrackingStatus,
  SiteType,
} from "./kpi-types";

import type { AnalyticsToolDetection } from "../types";

type KPIInput = {
  url: string;
  tools: AnalyticsToolDetection[];
};

type KPITemplate = {
  id: string;
  name: string;
  description: string;
  category: KPICategory;
  priority: KPIPriority;
  measurement: string;
  suggestedEvents: string[];
};

type SiteClassification = {
  siteType: SiteType;
  confidence: "low" | "medium" | "high";
};

const BASE_KPIS: KPITemplate[] = [
  {
    id: "sessions",
    name: "Sessions",
    description: "Mesurer le volume des visites sur le site.",
    category: "acquisition",
    priority: "high",
    measurement: "Nombre total de sessions sur une période.",
    suggestedEvents: ["session_start"],
  },
  {
    id: "engagement-rate",
    name: "Engagement rate",
    description: "Mesurer la proportion de sessions engagées.",
    category: "engagement",
    priority: "high",
    measurement: "Sessions engagées / sessions × 100.",
    suggestedEvents: ["user_engagement"],
  },
  {
    id: "cta-clicks",
    name: "CTA clicks",
    description: "Mesurer les interactions avec les appels à l'action.",
    category: "engagement",
    priority: "medium",
    measurement: "Nombre de clics sur les CTA principaux.",
    suggestedEvents: ["select_content"],
  },
];

const SITE_KPIS: Record<SiteType, KPITemplate[]> = {
  ecommerce: [
    {
      id: "purchase-conversion",
      name: "Purchase conversion rate",
      description: "Mesurer la conversion des sessions en achats.",
      category: "conversion",
      priority: "high",
      measurement: "Sessions avec achat / sessions × 100.",
      suggestedEvents: ["purchase"],
    },
    {
      id: "revenue",
      name: "Revenue",
      description: "Mesurer le chiffre d'affaires généré.",
      category: "revenue",
      priority: "high",
      measurement: "Somme des montants des transactions.",
      suggestedEvents: ["purchase"],
    },
    {
      id: "add-to-cart",
      name: "Add-to-cart rate",
      description: "Mesurer l'ajout de produits au panier.",
      category: "conversion",
      priority: "medium",
      measurement:
        "Sessions avec ajout au panier / sessions × 100.",
      suggestedEvents: ["add_to_cart"],
    },
  ],

  lead_generation: [
    {
      id: "lead-conversion",
      name: "Lead conversion rate",
      description: "Mesurer les sessions générant un prospect.",
      category: "conversion",
      priority: "high",
      measurement: "Sessions avec lead / sessions × 100.",
      suggestedEvents: ["generate_lead"],
    },
    {
      id: "form-submissions",
      name: "Form submissions",
      description: "Mesurer les formulaires envoyés avec succès.",
      category: "conversion",
      priority: "high",
      measurement: "Nombre de soumissions réussies.",
      suggestedEvents: ["form_submit"],
    },
  ],

  content: [
    {
      id: "content-views",
      name: "Content views",
      description: "Mesurer la consommation des contenus.",
      category: "engagement",
      priority: "high",
      measurement: "Nombre de vues des pages de contenu.",
      suggestedEvents: ["page_view"],
    },
    {
      id: "content-engagement",
      name: "Content engagement",
      description: "Mesurer l'engagement sur les contenus.",
      category: "engagement",
      priority: "medium",
      measurement:
        "Sessions engagées sur les pages de contenu / sessions sur ces pages × 100.",
      suggestedEvents: ["user_engagement"],
    },
  ],

  corporate: [
    {
      id: "contact-interactions",
      name: "Contact interactions",
      description:
        "Mesurer les interactions vers les points de contact.",
      category: "conversion",
      priority: "high",
      measurement:
        "Nombre de clics vers les formulaires ou contacts.",
      suggestedEvents: ["select_content"],
    },
  ],

  unknown: [],
};

/**
 * Référentiel V3 limité aux domaines déjà connus et testés.
 * Une correspondance exacte ou sur un sous-domaine est exigée.
 * Ce référentiel n'est pas un classificateur universel.
 */
const KNOWN_DOMAINS: Array<{
  domain: string;
  type: SiteType;
}> = [
  { domain: "backmarket.fr", type: "ecommerce" },
  { domain: "backmarket.com", type: "ecommerce" },
  { domain: "lemonde.fr", type: "content" },
  { domain: "peugeot.fr", type: "lead_generation" },
];

const PATH_PATTERNS: Array<{
  type: SiteType;
  regex: RegExp;
}> = [
  {
    type: "ecommerce",
    regex:
      /\/(shop|store|cart|checkout|products?|panier|boutique)(\/|$)/,
  },
  {
    type: "content",
    regex:
      /\/(blog|articles?|news|actualites|magazine)(\/|$)/,
  },
  {
    type: "lead_generation",
    regex:
      /\/(contact|demo|quote|devis|request-demo)(\/|$)/,
  },
];

function matchesDomain(
  hostname: string,
  domain: string
): boolean {
  return (
    hostname === domain ||
    hostname.endsWith(`.${domain}`)
  );
}

function detectSiteType(url: string): SiteClassification {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    return {
      siteType: "unknown",
      confidence: "low",
    };
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  const pathname = parsedUrl.pathname.toLowerCase();

  // 1. Parcours explicite : signal contextuel.
  // Une page contact ou article ne définit pas toujours
  // le modèle économique de l'ensemble du site.
  for (const pattern of PATH_PATTERNS) {
    if (pattern.regex.test(pathname)) {
      return {
        siteType: pattern.type,
        confidence: "medium",
      };
    }
  }

  // 2. Domaines métier connus et validés.
  for (const known of KNOWN_DOMAINS) {
    if (matchesDomain(hostname, known.domain)) {
      return {
        siteType: known.type,
        confidence: "high",
      };
    }
  }

  // 3. Aucun indice suffisant : ne pas inventer.
  return {
    siteType: "unknown",
    confidence: "low",
  };
}

/**
 * Statut indicatif de l'infrastructure observée.
 * Il ne confirme PAS la présence ni le déclenchement
 * des événements GA4 recommandés.
 */
function getTrackingStatus(
  tools: AnalyticsToolDetection[]
): KPITrackingStatus {
  const analyticsDetected = tools.some(
    (tool) =>
      tool.present &&
      tool.category === "Analytics" &&
      tool.certainty !== "Faible"
  );

  const dataLayerDetected = tools.some(
    (tool) =>
      tool.present &&
      tool.category === "DataLayer" &&
      tool.certainty !== "Faible"
  );

  if (analyticsDetected && dataLayerDetected) {
    return "partially_observed";
  }

  if (analyticsDetected || dataLayerDetected) {
    return "requires_validation";
  }

  return "tracking_missing";
}

export class KPIEngine {
  analyze(input: KPIInput): KPIAnalysis {
    const { siteType, confidence } =
      detectSiteType(input.url);

    const templates: KPITemplate[] = [
      ...BASE_KPIS,
      ...SITE_KPIS[siteType],
    ];

    const trackingStatus = getTrackingStatus(input.tools);

    const recommendations: KPIRecommendation[] =
      templates.map((template) => ({
        ...template,
        suggestedEvents: [...template.suggestedEvents],
        trackingStatus,
      }));

    return {
      siteType,
      siteTypeConfidence: confidence,
      recommendations,
    };
  }
}
