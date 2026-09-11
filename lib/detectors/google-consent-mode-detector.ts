import type {
  AnalyticsToolDetection,
} from "../types";

function unique(
  values: string[]
): string[] {
  return [
    ...new Set(
      values.filter(Boolean)
    ),
  ];
}

function extractParameterValues(
  html: string,
  parameter: string
): string[] {
  const pattern = new RegExp(
    `(?:[?&;]|\\\\u0026)${parameter}=([^&#"'\\\\s;]+)`,
    "gi"
  );

  return unique(
    [...html.matchAll(pattern)]
      .map((match) => match[1])
      .filter(Boolean)
  );
}

export function detectGoogleConsentMode(
  html: string
): AnalyticsToolDetection {
  const consentCommandDetected =
    /gtag\s*\(\s*["']consent["']\s*,\s*["'](?:default|update)["']/i.test(
      html
    );

  const consentDefaultDetected =
    /gtag\s*\(\s*["']consent["']\s*,\s*["']default["']/i.test(
      html
    );

  const consentUpdateDetected =
    /gtag\s*\(\s*["']consent["']\s*,\s*["']update["']/i.test(
      html
    );

  const gcsValues =
    extractParameterValues(
      html,
      "gcs"
    );

  const gcdValues =
    extractParameterValues(
      html,
      "gcd"
    );

  const pscdlValues =
    extractParameterValues(
      html,
      "pscdl"
    );

  const npaValues =
    extractParameterValues(
      html,
      "npa"
    );

  const networkSignals = unique([
    ...gcsValues.map(
      (value) => `gcs=${value}`
    ),

    ...gcdValues.map(
      (value) => `gcd=${value}`
    ),

    ...pscdlValues.map(
      (value) => `pscdl=${value}`
    ),

    ...npaValues.map(
      (value) => `npa=${value}`
    ),
  ]);

  const present =
    consentCommandDetected ||
    gcsValues.length > 0 ||
    gcdValues.length > 0;

  return {
    name: "Google Consent Mode",
    key: "google-consent-mode",
    vendor: "Google",
    category: "Consent",

    documentationUrl:
      "https://developers.google.com/tag-platform/security/guides/consent",

    description:
      "Google Consent Mode transmet aux services Google l’état du consentement accordé ou refusé par l’utilisateur.",

    present,

    status: present
      ? "Détecté directement"
      : "Non détecté",

    ids: [],

    evidence: [
      ...(consentCommandDetected
        ? ["Commande gtag consent détectée"]
        : []),

      ...(consentDefaultDetected
        ? ["Consent Mode default détecté"]
        : []),

      ...(consentUpdateDetected
        ? ["Consent Mode update détecté"]
        : []),

      ...networkSignals,
    ],

    sources: present
      ? [
          "HTML statique",
          "Script inline",
          "Requête réseau",
        ]
      : [],

    certainty:
      consentCommandDetected ||
      (
        gcsValues.length > 0 &&
        gcdValues.length > 0
      )
        ? "Élevé"
        : present
          ? "Moyen"
          : "Faible",

    details: {
      consentCommandDetected,
      consentDefaultDetected,
      consentUpdateDetected,
      gcsValues,
      gcdValues,
      pscdlValues,
      npaValues,
      networkSignals,
    },
  };
}