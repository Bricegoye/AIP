import type {
  AnalyticsToolDetection,
} from "../types";

export function detectCookiebot(
  html: string
): AnalyticsToolDetection {
  const domainDetected =
    /consent\.cookiebot\.com|consentcdn\.cookiebot\.com|cookiebot\.com/i.test(
      html
    );

  const scriptDetected =
    /Cookiebot\.js|CookiebotDialog|consent\.cookiebot\.com\/uc\.js/i.test(
      html
    );

  const objectDetected =
    /window\.Cookiebot|\bCookiebot\b/i.test(
      html
    );

  const consentObjectDetected =
    /CookieConsent|Cookiebot\.consent/i.test(
      html
    );

  const cbid =
    html.match(
      /data-cbid=["']([A-Za-z0-9_-]+)["']/i
    )?.[1];

  const present =
    domainDetected ||
    scriptDetected ||
    objectDetected ||
    consentObjectDetected;

  return {
    name: "Cookiebot",
    key: "cookiebot",
    vendor: "Usercentrics",
    category: "Consent",

    documentationUrl:
      "https://www.cookiebot.com/en/developer/",

    description:
      "Cookiebot est une Consent Management Platform de Usercentrics utilisée pour gérer les préférences de consentement et le déclenchement des cookies.",

    present,

    status: present
      ? "Détecté directement"
      : "Non détecté",

    ids: cbid ? [cbid] : [],

    evidence: [
      ...(domainDetected
        ? ["Domaine Cookiebot"]
        : []),

      ...(scriptDetected
        ? ["Script Cookiebot"]
        : []),

      ...(objectDetected
        ? ["Objet global Cookiebot"]
        : []),

      ...(consentObjectDetected
        ? ["Objet de consentement Cookiebot"]
        : []),

      ...(cbid
        ? [`Cookiebot CBID : ${cbid}`]
        : []),
    ],

    sources: present
      ? [
          "HTML statique",
          "Script externe",
          "Script inline",
        ]
      : [],

    certainty:
      domainDetected ||
      scriptDetected ||
      Boolean(cbid)
        ? "Élevé"
        : present
          ? "Moyen"
          : "Faible",

    details: {
      cbid,
      domainDetected,
      scriptDetected,
      objectDetected,
      consentObjectDetected,
    },
  };
}