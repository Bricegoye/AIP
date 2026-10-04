import type {
  AnalyticsToolDetection,
} from "../types";

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export function detectTealium(
  html: string
): AnalyticsToolDetection {
  const evidence: string[] = [];
  const ids: string[] = [];

  /*
   * Signatures principales Tealium iQ / utag.
   *
   * Exemples rencontrés :
   * - tags.tiqcdn.com/utag/...
   * - utag.js
   * - utag.sync.js
   * - utag.440.js
   * - window.utag
   * - utag_data
   */

  const tiqcdnDetected =
    /(?:https?:)?\/\/tags\.tiqcdn\.com\/utag\//i.test(
      html
    );

  const utagJsDetected =
    /(?:\/|["'])utag(?:\.sync|\.\d+)?\.js(?:[?"'#&\s<]|$)/i.test(
      html
    );

  const utagRuntimeReferenceDetected =
    /\b(?:window\.)?utag\b/i.test(html);

  const utagDataDetected =
    /\butag_data\b/i.test(html);

  const tealiumReferenceDetected =
    /\btealium\b/i.test(html);

  if (tiqcdnDetected) {
    evidence.push(
      "Des scripts Tealium provenant de tags.tiqcdn.com/utag sont détectés."
    );
  }

  if (utagJsDetected) {
    evidence.push(
      "Des scripts utag.js / utag.sync.js / utag.*.js sont détectés."
    );
  }

  if (utagRuntimeReferenceDetected) {
    evidence.push(
      "Une référence à l’objet utag de Tealium est détectée."
    );
  }

  if (utagDataDetected) {
    evidence.push(
      "La variable utag_data de Tealium est détectée."
    );
  }

  if (tealiumReferenceDetected) {
    evidence.push(
      "Une signature Tealium est présente dans le document."
    );
  }

  /*
   * Extraction des chemins Tealium :
   *
   * tags.tiqcdn.com/utag/{account}/{profile}/{environment}/utag.js
   */

  const tealiumPaths = [
    ...html.matchAll(
      /tags\.tiqcdn\.com\/utag\/([^/"'<>\s]+)\/([^/"'<>\s]+)\/([^/"'<>\s]+)\/utag(?:\.sync|\.\d+)?\.js/gi
    ),
  ];

  for (const match of tealiumPaths) {
    const account = match[1];
    const profile = match[2];
    const environment = match[3];

    if (
      account &&
      profile &&
      environment
    ) {
      ids.push(
        `${account}/${profile}/${environment}`
      );
    }
  }

  const present =
    tiqcdnDetected ||
    utagJsDetected ||
    utagRuntimeReferenceDetected ||
    utagDataDetected;

  const strongSignals = [
    tiqcdnDetected,
    utagJsDetected,
    utagRuntimeReferenceDetected,
    utagDataDetected,
  ].filter(Boolean).length;

  return {
    name: "Tealium iQ",
    key: "tealium",
    vendor: "Tealium",
    category: "Tag Management",

    documentationUrl:
      "https://docs.tealium.com/platforms/javascript/install/",

    description:
      "Tealium iQ est un système de gestion de balises permettant de centraliser le déploiement et la gouvernance des technologies analytics, marketing et publicitaires.",

    present,

    status: present
      ? "Détecté directement"
      : "Non détecté",

    ids: unique(ids),

    evidence: unique(evidence),

    sources: present
      ? [
          "HTML statique",
          "Script externe",
        ]
      : [],

    certainty:
      strongSignals >= 2
        ? "Élevé"
        : strongSignals === 1
          ? "Moyen"
          : "Faible",

    details: {
      tiqcdnDetected,
      utagJsDetected,
      utagRuntimeReferenceDetected,
      utagDataDetected,
      tealiumReferenceDetected,
      tealiumPaths: unique(ids),
    },
  };
}