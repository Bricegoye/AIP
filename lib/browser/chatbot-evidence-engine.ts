import type {
  BrowserAnalysisResult,
} from "./browser-engine";

import type {
  DynamicTechnologyEvidence,
} from "./dynamic-evidence-engine";

import type {
  ChatbotIntegrationMode,
} from "../types";

/**
 * AIP V3.3
 * Dynamic Chatbot Evidence Engine
 *
 * Objectif :
 * détecter les principales solutions de chatbot / live chat
 * à partir du DOM rendu, des scripts et des requêtes réseau.
 *
 * IMPORTANT :
 * les chatbots sont informatifs et ne doivent pas
 * influencer le score AIP.
 */

function unique(
  values: string[]
): string[] {
  return [
    ...new Set(
      values.filter(Boolean)
    ),
  ];
}

function matchingUrls(
  values: string[],
  pattern: RegExp
): string[] {
  return unique(
    values.filter((value) =>
      pattern.test(value)
    )
  );
}

function getSources(flags: {
  html?: boolean;
  script?: boolean;
  network?: boolean;
  runtime?: boolean;
}): string[] {
  const sources: string[] = [];

  if (flags.runtime) {
    sources.push("Runtime JavaScript");
  }

  if (flags.html) {
    sources.push("DOM rendu");
  }

  if (flags.script) {
    sources.push("Rendered scripts");
  }

  if (flags.network) {
    sources.push("Network requests");
  }

  return sources;
}

function getCertainty(
  sources: string[],
  hasIdentifier = false
): "Élevé" | "Moyen" | "Faible" {
  if (
    hasIdentifier ||
    sources.length >= 2
  ) {
    return "Élevé";
  }

  if (sources.length === 1) {
    return "Moyen";
  }

  return "Faible";
}

/**
 * Une signature DOM seule est un indice faible :
 * elle peut provenir d'un code global, d'un composant dormant
 * ou d'une configuration non active sur la page.
 *
 * Pour un fournisseur connu, AIP exige donc une preuve active :
 * script fournisseur ou trafic réseau fournisseur.
 */
function hasActiveProviderEvidence(
  scriptDetected: boolean,
  networkDetected: boolean
): boolean {
  return scriptDetected || networkDetected;
}

/**
 * Le fallback générique est volontairement plus strict :
 * comme le fournisseur est inconnu, au moins deux familles
 * de preuves indépendantes sont nécessaires.
 */
function hasStrongGenericEvidence(flags: {
  html: boolean;
  script: boolean;
  network: boolean;
}): boolean {
  const sourceCount = [
    flags.html,
    flags.script,
    flags.network,
  ].filter(Boolean).length;

  return sourceCount >= 2;
}

function getIntegrationMode(
  htmlDetected: boolean,
  scriptDetected: boolean,
  networkDetected: boolean
): ChatbotIntegrationMode {
  /*
   * Un script fournisseur clairement chargé
   * constitue une intégration tierce observable.
   *
   * La présence simultanée d'une signature DOM
   * ne suffit pas à conclure que l'intégration
   * est hardcodée : le DOM peut être généré
   * dynamiquement par le script.
   */
  if (scriptDetected) {
    return "third-party-script";
  }

  /*
   * Une preuve réseau sans script fournisseur visible
   * peut provenir d'un chargement indirect, notamment
   * via un tag manager.
   *
   * AIP ne prétend pas ici prouver que GTM
   * est effectivement responsable du chargement.
   */
  if (networkDetected) {
    return "possibly-via-gtm";
  }

  /*
   * Ce cas ne doit normalement plus produire
   * une technologie "présente" : DOM seul = indice.
   * La valeur est conservée uniquement comme repli
   * de typage pour les appels existants.
   */
  if (htmlDetected) {
    return "third-party-script";
  }

  return "third-party-script";
}

function extractFirstMatch(
  values: string[],
  patterns: RegExp[]
): string | undefined {
  for (const value of values) {
    for (const pattern of patterns) {
      const match = value.match(pattern);

      if (match?.[1]) {
        return match[1];
      }
    }
  }

  return undefined;
}

export function detectDynamicChatbotTechnologies(
  result: BrowserAnalysisResult
): DynamicTechnologyEvidence[] {
  const technologies:
    DynamicTechnologyEvidence[] = [];

  const allNetworkUrls =
    result.networkObservations.map(
      (observation) =>
        observation.url
    );

  const allValues = [
    result.html,
    ...result.scripts,
    ...allNetworkUrls,
  ];

  /*
   * ============================================================
   * Salesforce Embedded Messaging
   * ============================================================
   */

  const salesforceScriptUrls =
    matchingUrls(
      result.scripts,
      /embeddedservice|embeddedmessaging|salesforce\.com|force\.com|salesforceliveagent/i
    );

  const salesforceNetworkUrls =
    matchingUrls(
      allNetworkUrls,
      /embeddedservice|embeddedmessaging|salesforce\.com|force\.com|salesforceliveagent|service\.force/i
    );

  const salesforceHtmlDetected =
    /embeddedservice|embeddedmessaging|salesforceliveagent|embedded_svc|salesforce embedded/i.test(
      result.html
    );

  const salesforceOrgId =
    extractFirstMatch(
      allValues,
      [
        /\b(00D[A-Za-z0-9]{12,15})\b/,
        /orgId["'\s:=]+["']?(00D[A-Za-z0-9]{12,15})/i,
      ]
    );

  const salesforceDeploymentId =
    extractFirstMatch(
      allValues,
      [
        /deploymentId["'\s:=]+["']?([A-Za-z0-9_-]+)/i,
        /deployment[_-]?id["'\s:=]+["']?([A-Za-z0-9_-]+)/i,
      ]
    );

  const salesforceIds =
    unique([
      salesforceOrgId ?? "",
      salesforceDeploymentId ?? "",
    ]);

  const salesforceSources =
    getSources({
      html: salesforceHtmlDetected,
      script:
        salesforceScriptUrls.length > 0,
      network:
        salesforceNetworkUrls.length > 0,
    });

  const salesforceActiveEvidence =
    hasActiveProviderEvidence(
      salesforceScriptUrls.length > 0,
      salesforceNetworkUrls.length > 0
    );

  if (salesforceActiveEvidence) {
    const integrationMode =
      getIntegrationMode(
        salesforceHtmlDetected,
        salesforceScriptUrls.length > 0,
        salesforceNetworkUrls.length > 0
      );

    technologies.push({
      key: "salesforce-embedded-messaging",
      present: true,
      ids: salesforceIds,

      evidence: [
        ...(salesforceHtmlDetected
          ? [
              "Des signatures Salesforce Embedded Messaging sont présentes dans le DOM rendu.",
            ]
          : []),

        ...(salesforceScriptUrls.length > 0
          ? [
              `${salesforceScriptUrls.length} script(s) Salesforce Embedded Messaging chargé(s).`,
            ]
          : []),

        ...(salesforceNetworkUrls.length > 0
          ? [
              `${salesforceNetworkUrls.length} requête(s) réseau Salesforce Embedded Messaging observée(s).`,
            ]
          : []),

        ...(salesforceOrgId
          ? [
              `Salesforce Org ID détecté : ${salesforceOrgId}.`,
            ]
          : []),

        ...(salesforceDeploymentId
          ? [
              `Salesforce Deployment ID détecté : ${salesforceDeploymentId}.`,
            ]
          : []),
      ],

      sources: salesforceSources,

      certainty: getCertainty(
        salesforceSources,
        salesforceIds.length > 0
      ),

      details: {
        provider: "Salesforce",
        product:
          "Salesforce Embedded Messaging",
        integrationMode,
        orgId: salesforceOrgId,
        deploymentId:
          salesforceDeploymentId,
        htmlDetected:
          salesforceHtmlDetected,
        scriptUrls:
          salesforceScriptUrls,
        networkUrls:
          salesforceNetworkUrls,
        scoreImpact: false,
      },
    });
  }

  /*
   * ============================================================
   * Genesys Cloud
   * ============================================================
   */

  const genesysScriptUrls =
    matchingUrls(
      result.scripts,
      /genesys|mypurecloud|genesyscloud|genesys\.cloud/i
    );

  const genesysNetworkUrls =
    matchingUrls(
      allNetworkUrls,
      /genesys|mypurecloud|genesyscloud|genesys\.cloud/i
    );

  const genesysHtmlDetected =
    /genesys|mypurecloud|genesyscloud|genesys\.cloud/i.test(
      result.html
    );

  const genesysDeploymentId =
    extractFirstMatch(
      allValues,
      [
        /deploymentId["'\s:=]+["']?([A-Za-z0-9_-]{8,})/i,
        /deployment[_-]?id["'\s:=]+["']?([A-Za-z0-9_-]{8,})/i,
      ]
    );

  const genesysIds =
    unique([
      genesysDeploymentId ?? "",
    ]);

  const genesysSources =
    getSources({
      html: genesysHtmlDetected,
      script:
        genesysScriptUrls.length > 0,
      network:
        genesysNetworkUrls.length > 0,
    });

  const genesysActiveEvidence =
    hasActiveProviderEvidence(
      genesysScriptUrls.length > 0,
      genesysNetworkUrls.length > 0
    );

  if (genesysActiveEvidence) {
    const integrationMode =
      getIntegrationMode(
        genesysHtmlDetected,
        genesysScriptUrls.length > 0,
        genesysNetworkUrls.length > 0
      );

    technologies.push({
      key: "genesys",
      present: true,
      ids: genesysIds,

      evidence: [
        ...(genesysHtmlDetected
          ? [
              "Des signatures Genesys sont présentes dans le DOM rendu.",
            ]
          : []),

        ...(genesysScriptUrls.length > 0
          ? [
              `${genesysScriptUrls.length} script(s) Genesys chargé(s).`,
            ]
          : []),

        ...(genesysNetworkUrls.length > 0
          ? [
              `${genesysNetworkUrls.length} requête(s) réseau Genesys observée(s).`,
            ]
          : []),

        ...(genesysDeploymentId
          ? [
              `Genesys Deployment ID détecté : ${genesysDeploymentId}.`,
            ]
          : []),
      ],

      sources: genesysSources,

      certainty: getCertainty(
        genesysSources,
        genesysIds.length > 0
      ),

      details: {
        provider: "Genesys",
        product: "Genesys Cloud",
        integrationMode,
        deploymentId:
          genesysDeploymentId,
        htmlDetected:
          genesysHtmlDetected,
        scriptUrls:
          genesysScriptUrls,
        networkUrls:
          genesysNetworkUrls,
        scoreImpact: false,
      },
    });
  }

  /*
   * ============================================================
   * Intercom
   * ============================================================
   */

  const intercomScriptUrls =
    matchingUrls(
      result.scripts,
      /intercomcdn|intercom\.io|widget\.intercom|intercomassets/i
    );

  const intercomNetworkUrls =
    matchingUrls(
      allNetworkUrls,
      /intercomcdn|intercom\.io|widget\.intercom|intercomassets/i
    );

  const intercomHtmlDetected =
    /window\.Intercom|intercomSettings|intercomcdn|widget\.intercom/i.test(
      result.html
    );

  const intercomAppId =
    extractFirstMatch(
      allValues,
      [
        /app_id["'\s:=]+["']?([A-Za-z0-9_-]+)/i,
        /appId["'\s:=]+["']?([A-Za-z0-9_-]+)/i,
      ]
    );

  const intercomIds =
    unique([
      intercomAppId ?? "",
    ]);

  const intercomSources =
    getSources({
      html: intercomHtmlDetected,
      script:
        intercomScriptUrls.length > 0,
      network:
        intercomNetworkUrls.length > 0,
    });

  const intercomActiveEvidence =
    hasActiveProviderEvidence(
      intercomScriptUrls.length > 0,
      intercomNetworkUrls.length > 0
    );

  if (intercomActiveEvidence) {
    const integrationMode =
      getIntegrationMode(
        intercomHtmlDetected,
        intercomScriptUrls.length > 0,
        intercomNetworkUrls.length > 0
      );

    technologies.push({
      key: "intercom",
      present: true,
      ids: intercomIds,

      evidence: [
        ...(intercomHtmlDetected
          ? [
              "Des signatures Intercom sont présentes dans le DOM rendu.",
            ]
          : []),

        ...(intercomScriptUrls.length > 0
          ? [
              `${intercomScriptUrls.length} script(s) Intercom chargé(s).`,
            ]
          : []),

        ...(intercomNetworkUrls.length > 0
          ? [
              `${intercomNetworkUrls.length} requête(s) réseau Intercom observée(s).`,
            ]
          : []),

        ...(intercomAppId
          ? [
              `Intercom App ID détecté : ${intercomAppId}.`,
            ]
          : []),
      ],

      sources: intercomSources,

      certainty: getCertainty(
        intercomSources,
        intercomIds.length > 0
      ),

      details: {
        provider: "Intercom",
        product: "Intercom Messenger",
        integrationMode,
        appId: intercomAppId,
        htmlDetected:
          intercomHtmlDetected,
        scriptUrls:
          intercomScriptUrls,
        networkUrls:
          intercomNetworkUrls,
        scoreImpact: false,
      },
    });
  }

  /*
   * ============================================================
   * Zendesk
   * ============================================================
   */

  const zendeskScriptUrls =
    matchingUrls(
      result.scripts,
      /zendesk|zdassets|zopim|ze-snippet/i
    );

  const zendeskNetworkUrls =
    matchingUrls(
      allNetworkUrls,
      /zendesk|zdassets|zopim|ze-snippet/i
    );

  const zendeskHtmlDetected =
    /window\.zE|zESettings|zendesk|zopim|ze-snippet/i.test(
      result.html
    );

  const zendeskKey =
    extractFirstMatch(
      allValues,
      [
        /ze-snippet[^"'<>]*key=([A-Za-z0-9_-]+)/i,
        /key=([A-Za-z0-9_-]+).*zendesk/i,
      ]
    );

  const zendeskIds =
    unique([
      zendeskKey ?? "",
    ]);

  const zendeskSources =
    getSources({
      html: zendeskHtmlDetected,
      script:
        zendeskScriptUrls.length > 0,
      network:
        zendeskNetworkUrls.length > 0,
    });

  const zendeskActiveEvidence =
    hasActiveProviderEvidence(
      zendeskScriptUrls.length > 0,
      zendeskNetworkUrls.length > 0
    );

  if (zendeskActiveEvidence) {
    const integrationMode =
      getIntegrationMode(
        zendeskHtmlDetected,
        zendeskScriptUrls.length > 0,
        zendeskNetworkUrls.length > 0
      );

    technologies.push({
      key: "zendesk",
      present: true,
      ids: zendeskIds,

      evidence: [
        ...(zendeskHtmlDetected
          ? [
              "Des signatures Zendesk sont présentes dans le DOM rendu.",
            ]
          : []),

        ...(zendeskScriptUrls.length > 0
          ? [
              `${zendeskScriptUrls.length} script(s) Zendesk chargé(s).`,
            ]
          : []),

        ...(zendeskNetworkUrls.length > 0
          ? [
              `${zendeskNetworkUrls.length} requête(s) réseau Zendesk observée(s).`,
            ]
          : []),

        ...(zendeskKey
          ? [
              `Identifiant Zendesk détecté : ${zendeskKey}.`,
            ]
          : []),
      ],

      sources: zendeskSources,

      certainty: getCertainty(
        zendeskSources,
        zendeskIds.length > 0
      ),

      details: {
        provider: "Zendesk",
        product:
          "Zendesk Messaging / Web Widget",
        integrationMode,
        widgetKey: zendeskKey,
        htmlDetected:
          zendeskHtmlDetected,
        scriptUrls:
          zendeskScriptUrls,
        networkUrls:
          zendeskNetworkUrls,
        scoreImpact: false,
      },
    });
  }

  /*
   * ============================================================
   * eKonsilio
   * ============================================================
   */

  const eKonsilioScriptUrls =
    matchingUrls(
      result.scripts,
      /ekonsilio|e-konsilio/i
    );

  const eKonsilioNetworkUrls =
    matchingUrls(
      allNetworkUrls,
      /ekonsilio|e-konsilio/i
    );

  const eKonsilioHtmlDetected =
    /ekonsilio|e-konsilio/i.test(
      result.html
    );

  const eKonsilioSources =
    getSources({
      html: eKonsilioHtmlDetected,
      script:
        eKonsilioScriptUrls.length > 0,
      network:
        eKonsilioNetworkUrls.length > 0,
    });

  const eKonsilioActiveEvidence =
    hasActiveProviderEvidence(
      eKonsilioScriptUrls.length > 0,
      eKonsilioNetworkUrls.length > 0
    );

  if (eKonsilioActiveEvidence) {
    const integrationMode =
      getIntegrationMode(
        eKonsilioHtmlDetected,
        eKonsilioScriptUrls.length > 0,
        eKonsilioNetworkUrls.length > 0
      );

    technologies.push({
      key: "ekonsilio",
      present: true,
      ids: [],

      evidence: [
        ...(eKonsilioHtmlDetected
          ? [
              "Des signatures eKonsilio sont présentes dans le DOM rendu.",
            ]
          : []),

        ...(eKonsilioScriptUrls.length > 0
          ? [
              `${eKonsilioScriptUrls.length} script(s) eKonsilio chargé(s).`,
            ]
          : []),

        ...(eKonsilioNetworkUrls.length > 0
          ? [
              `${eKonsilioNetworkUrls.length} requête(s) réseau eKonsilio observée(s).`,
            ]
          : []),
      ],

      sources: eKonsilioSources,

      certainty:
        getCertainty(
          eKonsilioSources
        ),

      details: {
        provider: "eKonsilio",
        product: "eKonsilio",
        integrationMode,
        htmlDetected:
          eKonsilioHtmlDetected,
        scriptUrls:
          eKonsilioScriptUrls,
        networkUrls:
          eKonsilioNetworkUrls,
        scoreImpact: false,
      },
    });
  }

  /*
   * ============================================================
   * Generic chatbot / live chat
   * ============================================================
   *
   * Ce détecteur est volontairement prudent.
   *
   * Il n'est exécuté que si aucun fournisseur connu
   * n'a déjà été détecté.
   */

  if (technologies.length === 0) {
    const genericScriptUrls =
      matchingUrls(
        result.scripts,
        /chatbot|livechat|live-chat|webchat|chat-widget|chatwidget/i
      );

    const genericNetworkUrls =
      matchingUrls(
        allNetworkUrls,
        /chatbot|livechat|live-chat|webchat|chat-widget|chatwidget/i
      );

    const genericHtmlDetected =
      /chatbot|livechat|live-chat|webchat|chat-widget|chatwidget/i.test(
        result.html
      );

    const genericSources =
      getSources({
        html: genericHtmlDetected,
        script:
          genericScriptUrls.length > 0,
        network:
          genericNetworkUrls.length > 0,
      });

    const genericStrongEvidence =
      hasStrongGenericEvidence({
        html: genericHtmlDetected,
        script:
          genericScriptUrls.length > 0,
        network:
          genericNetworkUrls.length > 0,
      });

    if (genericStrongEvidence) {
      const integrationMode =
        getIntegrationMode(
          genericHtmlDetected,
          genericScriptUrls.length > 0,
          genericNetworkUrls.length > 0
        );

      technologies.push({
        key: "generic-chatbot",
        present: true,
        ids: [],

        evidence: [
          ...(genericHtmlDetected
            ? [
                "Des signatures génériques de chatbot ou live chat sont présentes dans le DOM rendu.",
              ]
            : []),

          ...(genericScriptUrls.length > 0
            ? [
                `${genericScriptUrls.length} script(s) pouvant correspondre à un chatbot ont été observés.`,
              ]
            : []),

          ...(genericNetworkUrls.length > 0
            ? [
                `${genericNetworkUrls.length} requête(s) réseau pouvant correspondre à un chatbot ont été observées.`,
              ]
            : []),
        ],

        sources: genericSources,

        /*
         * Une détection générique reste volontairement
         * moins affirmative qu'une signature fournisseur.
         */
        certainty:
          genericSources.length >= 2
            ? "Moyen"
            : "Faible",

        details: {
          provider: "Unknown",
          product: "Generic chatbot",
          integrationMode,
          htmlDetected:
            genericHtmlDetected,
          scriptUrls:
            genericScriptUrls,
          networkUrls:
            genericNetworkUrls,
          scoreImpact: false,
        },
      });
    }
  }

  return technologies;
}