import type { AnalyticsToolDetection } from "../types";

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export const DATA_LAYER_VARIABLE_GROUPS = {
  navigation: [
    "page_name", "pageName", "page_type", "pageType", "page_category", "pageCategory",
    "page_location", "pageLocation", "page_referrer", "pageReferrer", "page_title", "pageTitle",
    "virtualPageURL", "page_url", "pageUrl", "brand", "language", "country", "deviceType",
    "siteOwner", "siteTarget", "siteFamily", "siteTypeLevel1", "siteTypeLevel2",
    "pageTarget", "pageVariant", "rumTarget",
  ],
  user: [
    "user_id", "userId", "user_status", "userStatus", "login_status", "loginStatus",
    "customer_type", "customerType",
  ],
  commerce: [
    "currency", "value", "transaction_id", "transactionId", "coupon", "payment_type", "paymentType",
    "vehicleCategory", "vehicleModelBodystyle", "vehicleModelBodystyleLabel", "vehicleEngineType",
  ],
  ecommerce: [
    "ecommerce", "items", "item_id", "itemId", "item_name", "itemName",
    "item_category", "itemCategory", "quantity", "price",
  ],
  form: [
    "form_name", "formName", "formsName", "form_step", "formStep", "form_type", "formType",
    "lead_type", "leadType", "mainStepName", "mainStepIndicator",
  ],
  search: ["search_term", "searchTerm", "search_results", "searchResults"],
} as const;

export type DataLayerVariableCategory = keyof typeof DATA_LAYER_VARIABLE_GROUPS;
export type DataLayerVariableCategories = Record<DataLayerVariableCategory, string[]>;

function normalizeVariableName(value: string): string {
  return value.replace(/[_-]/g, "").toLowerCase();
}

/** Classify observed key paths, preserving their original spelling. */
export function classifyDataLayerVariables(paths: string[]): {
  standardVariables: string[];
  standardVariableCount: number;
  variableCategories: DataLayerVariableCategories;
} {
  const variableCategories: DataLayerVariableCategories = {
    navigation: [], user: [], commerce: [], ecommerce: [], form: [], search: [],
  };

  for (const path of unique(paths)) {
    // Exclude gtag command arguments and GTM's internal bookkeeping.
    if (/^\d+(?:[.\[]|$)/.test(path) || /^gtm(?:\.|$)/i.test(path)) continue;
    const segments = path.replace(/\[\d+\]/g, "").split(".");
    const name = normalizeVariableName(segments[segments.length - 1] ?? "");
    for (const category of Object.keys(variableCategories) as DataLayerVariableCategory[]) {
      if (DATA_LAYER_VARIABLE_GROUPS[category].some((candidate) => normalizeVariableName(candidate) === name)) {
        variableCategories[category].push(path);
      }
    }
  }

  const standardVariables = unique(Object.values(variableCategories).flat());
  return { standardVariables, standardVariableCount: standardVariables.length, variableCategories };
}

function detectVariables(html: string): string[] {
  return unique(Object.values(DATA_LAYER_VARIABLE_GROUPS).flat()).filter((variable) => {
    const escaped = variable.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Match a complete property name rather than a suffix such as preview_value.
    return new RegExp(`(?:["']${escaped}["']|\\b${escaped})\\s*:`, "i").test(html);
  });
}

const TECHNICAL_PLATFORM_EVENTS = new Set(["dyuaevent"]);

function isTechnicalEvent(event: string): boolean {
  const normalized = event.toLowerCase();
  return normalized.startsWith("gtm.") || TECHNICAL_PLATFORM_EVENTS.has(normalized);
}

function isConsentEvent(event: string): boolean {
  return /consent|gdpr|cookie|optanon|didomi|onetrust/i.test(event);
}

export function detectDataLayer(html: string): AnalyticsToolDetection {
  const windowDataLayerDetected = /window\.dataLayer|dataLayer\s*=|dataLayer\s*\|\|\s*\[\]/i.test(html);
  const pushDetected = /dataLayer\.push\s*\(/i.test(html);
  const eventMatches = [
    ...html.matchAll(/\bevent\s*:\s*["']([^"']+)["']/gi),
    ...html.matchAll(/["']event["']\s*:\s*["']([^"']+)["']/gi),
  ];
  const allEvents = unique(eventMatches.map((match) => match[1]));
  const internalEvents = allEvents.filter(isTechnicalEvent);
  const businessEvents = allEvents.filter((event) => !isTechnicalEvent(event) && !isConsentEvent(event));
  const classification = classifyDataLayerVariables(detectVariables(html));
  const ecommerceDetected = /\becommerce\s*:|["']ecommerce["']\s*:|\bitems\s*:|["']items["']\s*:/i.test(html);
  const consentSignals = /gtag\(\s*["']consent|consent\.default|gdprconsent|Cookiebot|didomi|onetrust|optanon/i.test(html);
  const present = windowDataLayerDetected || pushDetected;

  return {
    name: "Google DataLayer",
    key: "datalayer",
    vendor: "Google",
    category: "DataLayer",
    documentationUrl: "https://developers.google.com/tag-platform/tag-manager/datalayer",
    description: "Le DataLayer est une couche de données utilisée pour transmettre des informations métier à Google Tag Manager et aux solutions Analytics.",
    present,
    status: present ? "Détecté directement" : "Non détecté",
    ids: [],
    evidence: [
      ...(windowDataLayerDetected ? ["window.dataLayer"] : []),
      ...(pushDetected ? ["dataLayer.push()"] : []),
    ],
    sources: present ? ["HTML statique", "Script inline"] : [],
    certainty: present ? "Élevé" : "Faible",
    details: {
      windowDataLayerDetected, pushDetected, allEvents, internalEvents, businessEvents,
      eventCount: allEvents.length,
      internalEventCount: internalEvents.length,
      businessEventCount: businessEvents.length,
      ...classification,
      ecommerceDetected,
      consentSignals,
    },
  };
}
