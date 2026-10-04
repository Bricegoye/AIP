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

  /*
   * Signal secondaire uniquement.
   *
   * "CookieConsent" est trop générique pour
   * confirmer Cookiebot à lui seul.
   *
   * Il peut être présent sur des sites utilisant
   * une autre CMP, comme OneTrust.
   */
  const consentObjectDetected =
    /CookieConsent|Cookiebot\.consent/i.test(
      html
    );

  const cbid =
    html.match(
      /data-cbid=["']([A-Za-z0-9_-]+)["']/i
    )?.[1];

  /*
   * Cookiebot est considéré présent uniquement
   * lorsqu'au moins une preuve spécifique à
   * Cookiebot est disponible.
   *
   * consentObjectDetected reste conservé dans
   * details/evidence mais ne déclenche plus
   * la détection à lui seul.
   */
  const present =
    domainDetected ||
    scriptDetected ||
    objectDetected ||
    Boolean(cbid);

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
        ? ["Signal de consentement compatible Cookiebot"]
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
        : objectDetected
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