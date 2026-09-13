import type { AnalyticsToolDetection } from "../types";

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function detectVariables(html: string, variables: string[]): string[] {
  return variables.filter((variable) =>
    new RegExp(`["']?${variable}["']?\\s*:`, "i").test(html)
  );
}

const TECHNICAL_PLATFORM_EVENTS = new Set([
  "dyuaevent",
]);

function isTechnicalEvent(event: string): boolean {
  const normalizedEvent = event.toLowerCase();

  return (
    normalizedEvent.startsWith("gtm.") ||
    TECHNICAL_PLATFORM_EVENTS.has(normalizedEvent)
  );
}

function isConsentEvent(event: string): boolean {
  return /consent|gdpr|cookie|optanon|didomi|onetrust/i.test(event);
}

const NAVIGATION_VARIABLES = [
  "page_name",
  "page_type",
  "page_category",
  "page_location",
  "page_referrer",
  "page_title",
];

const USER_VARIABLES = [
  "user_id",
  "user_status",
  "login_status",
  "customer_type",
];

const COMMERCE_VARIABLES = [
  "currency",
  "value",
  "transaction_id",
  "coupon",
  "payment_type",
];

const ECOMMERCE_VARIABLES = [
  "ecommerce",
  "items",
  "item_id",
  "item_name",
  "item_category",
  "quantity",
  "price",
];

const FORM_VARIABLES = [
  "form_name",
  "form_step",
  "form_type",
  "lead_type",
];

const SEARCH_VARIABLES = [
  "search_term",
  "search_results",
];

export function detectDataLayer(html: string): AnalyticsToolDetection {
  const windowDataLayerDetected =
    /window\.dataLayer|dataLayer\s*=|dataLayer\s*\|\|\s*\[\]/i.test(html);

  const pushDetected = /dataLayer\.push\s*\(/i.test(html);

  const eventMatches = [
    ...html.matchAll(/event\s*:\s*["']([^"']+)["']/gi),
    ...html.matchAll(/["']event["']\s*:\s*["']([^"']+)["']/gi),
  ];

  const allEvents = unique(eventMatches.map((match) => match[1]));

  const internalEvents = allEvents.filter(isTechnicalEvent);

  const businessEvents = allEvents.filter(
    (event) => !isTechnicalEvent(event) && !isConsentEvent(event)
  );

  const navigationVariables = detectVariables(html, NAVIGATION_VARIABLES);
  const userVariables = detectVariables(html, USER_VARIABLES);
  const commerceVariables = detectVariables(html, COMMERCE_VARIABLES);
  const ecommerceVariables = detectVariables(html, ECOMMERCE_VARIABLES);
  const formVariables = detectVariables(html, FORM_VARIABLES);
  const searchVariables = detectVariables(html, SEARCH_VARIABLES);

  const standardVariables = unique([
    ...navigationVariables,
    ...userVariables,
    ...commerceVariables,
    ...ecommerceVariables,
    ...formVariables,
    ...searchVariables,
  ]);

  const ecommerceDetected =
    /ecommerce\s*:|["']ecommerce["']\s*:|items\s*:|["']items["']\s*:/i.test(
      html
    );

  const consentSignals =
    /gtag\(["']consent|consent\.default|gdprconsent|Cookiebot|didomi|onetrust|optanon/i.test(
      html
    );

  const present = windowDataLayerDetected || pushDetected;

  return {
    name: "Google DataLayer",
    key: "datalayer",
    vendor: "Google",
    category: "DataLayer",
    documentationUrl:
      "https://developers.google.com/tag-platform/tag-manager/datalayer",
    description:
      "Le DataLayer est une couche de données utilisée pour transmettre des informations métier à Google Tag Manager et aux solutions Analytics.",
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
      windowDataLayerDetected,
      pushDetected,
      allEvents,
      internalEvents,
      businessEvents,
      eventCount: allEvents.length,
      internalEventCount: internalEvents.length,
      businessEventCount: businessEvents.length,
      standardVariables,
      standardVariableCount: standardVariables.length,
      variableCategories: {
        navigation: navigationVariables,
        user: userVariables,
        commerce: commerceVariables,
        ecommerce: ecommerceVariables,
        form: formVariables,
        search: searchVariables,
      },
      ecommerceDetected,
      consentSignals,
    },
  };
}
