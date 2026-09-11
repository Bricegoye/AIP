import type {
  AnalyticsToolDetection,
} from "../types";

export function detectTCFAPI(
  html: string
): AnalyticsToolDetection {
  const tcfApiDetected =
    /window\.__tcfapi|\b__tcfapi\s*\(/i.test(
      html
    );

  const tcfLocatorDetected =
    /__tcfapiLocator/i.test(
      html
    );

  const tcDataDetected =
    /getTCData|addEventListener[^]*?__tcfapi/i.test(
      html
    );

  const euConsentCookieDetected =
    /euconsent-v2/i.test(
      html
    );

  const present =
    tcfApiDetected ||
    tcfLocatorDetected ||
    tcDataDetected ||
    euConsentCookieDetected;

  return {
    name: "IAB Transparency & Consent Framework",
    key: "tcf-api",
    vendor: "IAB Europe",
    category: "Consent",

    documentationUrl:
      "https://iabeurope.eu/transparency-consent-framework/",

    description:
      "L’API TCF permet aux CMP et aux fournisseurs publicitaires de partager l’état du consentement selon le standard IAB Europe.",

    present,

    status: present
      ? "Détecté directement"
      : "Non détecté",

    ids: [],

    evidence: [
      ...(tcfApiDetected
        ? ["API runtime __tcfapi"]
        : []),

      ...(tcfLocatorDetected
        ? ["Frame __tcfapiLocator"]
        : []),

      ...(tcDataDetected
        ? ["Commandes TCF détectées"]
        : []),

      ...(euConsentCookieDetected
        ? ["Cookie euconsent-v2"]
        : []),
    ],

    sources: present
      ? [
          "HTML statique",
          "Script inline",
          "Cookie",
        ]
      : [],

    certainty:
      tcfApiDetected ||
      tcfLocatorDetected
        ? "Élevé"
        : present
          ? "Moyen"
          : "Faible",

    details: {
      tcfApiDetected,
      tcfLocatorDetected,
      tcDataDetected,
      euConsentCookieDetected,
    },
  };
}