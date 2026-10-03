import type {
  CertaintyLevel,
} from "../types";

import type {
  BrowserAnalysisResult,
  NetworkObservation,
} from "./browser-engine";

import {
  detectDynamicConsentTechnologies,
} from "./cmp-evidence-engine";

import {
  detectDynamicChatbotTechnologies,
} from "./chatbot-evidence-engine";

import {
  detectDynamicAdobeTechnologies,
} from "./adobe-evidence-engine";

export type DynamicTechnologyKey =
  | "gtm"
  | "ga4"
  | "floodlight"
  | "datalayer"
  | "onetrust"
  | "didomi"
  | "axeptio"
  | "cookiebot"
  | "google-consent-mode"
  | "tcf-api"
  | "adobe-launch"
  | "adobe-analytics"
  | "salesforce-embedded-messaging"
  | "genesys"
  | "intercom"
  | "zendesk"
  | "ekonsilio"
  | "generic-chatbot";

export interface DynamicTechnologyEvidence {
  key: DynamicTechnologyKey;
  present: true;
  ids: string[];
  evidence: string[];
  sources: string[];
  certainty: CertaintyLevel;
  details: Record<string, unknown>;
}

export interface DynamicEvidenceResult {
  technologies: DynamicTechnologyEvidence[];
  dataLayerEvents: string[];
  consentSignals: string[];
}

interface SourceFlags {
  runtime?: boolean;
  script?: boolean;
  network?: boolean;
  dataLayer?: boolean;
}

const GTM_ID_PATTERN =
  /\bGTM-[A-Z0-9]+\b/g;

const GA4_ID_PATTERN =
  /\bG-[A-Z0-9]{5,}\b/gi;

const FLOODLIGHT_ID_PATTERN =
  /\bDC-\d+\b/gi;

/*
 * Versions sans le flag global.
 * Elles évitent les résultats irréguliers
 * lorsque RegExp.test() est appelé plusieurs fois.
 */
const GA4_ID_TEST_PATTERN =
  /\bG-[A-Z0-9]{5,}\b/i;

const FLOODLIGHT_ID_TEST_PATTERN =
  /\bDC-\d+\b/i;

const GTM_URL_PATTERN =
  /googletagmanager\.com\/gtm\.js/i;

const GA4_URL_PATTERN =
  /google-analytics\.com\/g\/collect|googletagmanager\.com\/gtag\/(?:js|destination).*?(?:id|tid)=G-/i;

const FLOODLIGHT_URL_PATTERN =
  /doubleclick|googlesyndication\.com|\/ddm\/activity|(?:id|tid)=DC-/i;

function unique(
  values: string[]
): string[] {
  return [
    ...new Set(
      values.filter(Boolean)
    ),
  ];
}

function extractIds(
  values: string[],
  pattern: RegExp
): string[] {
  return unique(
    values.flatMap(
      (value) =>
        value.match(pattern) ?? []
    )
  );
}

function extractFloodlightIds(
  values: string[]
): string[] {
  const directIds = extractIds(
    values,
    FLOODLIGHT_ID_PATTERN
  );

  const sourceIds =
    values.flatMap((value) => {
      if (
        !FLOODLIGHT_URL_PATTERN.test(
          value
        )
      ) {
        return [];
      }

      const match = value.match(
        /(?:\/|[?;&])src=(\d+)/i
      );

      return match?.[1]
        ? [`DC-${match[1]}`]
        : [];
    });

  return unique([
    ...directIds,
    ...sourceIds,
  ]);
}

function getDataLayerEvents(
  entries: unknown[]
): string[] {
  const events =
    entries.flatMap((entry) => {
      if (
        typeof entry !== "object" ||
        entry === null ||
        !("event" in entry)
      ) {
        return [];
      }

      const event = (
        entry as Record<
          string,
          unknown
        >
      ).event;

      return typeof event === "string"
        ? [event]
        : [];
    });

  return unique(events);
}

function isPlainObject(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function collectVariablePaths(
  value: unknown,
  prefix = "",
  depth = 0
): string[] {
  if (depth > 6) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectVariablePaths(
        item,
        prefix ? `${prefix}[${index}]` : `[${index}]`,
        depth + 1
      )
    );
  }

  if (!isPlainObject(value)) {
    return prefix ? [prefix] : [];
  }

  return Object.entries(value).flatMap(([key, nestedValue]) => {
    const path = prefix ? `${prefix}.${key}` : key;

    if (isPlainObject(nestedValue) || Array.isArray(nestedValue)) {
      const nestedPaths = collectVariablePaths(
        nestedValue,
        path,
        depth + 1
      );

      return nestedPaths.length > 0
        ? [path, ...nestedPaths]
        : [path];
    }

    return [path];
  });
}

function getDataLayerVariables(
  entries: unknown[]
): string[] {
  return unique(
    entries.flatMap((entry) =>
      collectVariablePaths(entry)
    )
  ).sort();
}

interface DataLayerVariableValue {
  path: string;
  values: unknown[];
  occurrences: number;
}

function isTechnicalArrayVariablePath(
  path: string
): boolean {
  return /^\d+(?:\.|$|\[)/.test(path);
}

function collectLeafVariableValues(
  value: unknown,
  prefix = "",
  depth = 0
): Array<{ path: string; value: unknown }> {
  if (depth > 6) return [];

  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectLeafVariableValues(
        item,
        prefix ? `${prefix}[${index}]` : `[${index}]`,
        depth + 1
      )
    );
  }

  if (isPlainObject(value)) {
    return Object.entries(value).flatMap(([key, nestedValue]) => {
      const path = prefix ? `${prefix}.${key}` : key;

      if (isPlainObject(nestedValue) || Array.isArray(nestedValue)) {
        return collectLeafVariableValues(nestedValue, path, depth + 1);
      }

      return [{ path, value: nestedValue }];
    });
  }

  return prefix ? [{ path: prefix, value }] : [];
}

function getComparableValue(
  value: unknown
): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function getDataLayerVariableValues(
  entries: unknown[]
): DataLayerVariableValue[] {
  const variableMap = new Map<
    string,
    {
      values: unknown[];
      serializedValues: Set<string>;
      occurrences: number;
    }
  >();

  for (const entry of entries) {
    const variables = collectLeafVariableValues(entry);

    for (const variable of variables) {
      if (isTechnicalArrayVariablePath(variable.path)) {
        continue;
      }

      const sanitizedValue = sanitizeDataLayerValue(variable.value);
      const comparableValue = getComparableValue(sanitizedValue);
      const existing = variableMap.get(variable.path);

      if (!existing) {
        variableMap.set(variable.path, {
          values: [sanitizedValue],
          serializedValues: new Set([comparableValue]),
          occurrences: 1,
        });
        continue;
      }

      existing.occurrences += 1;

      if (!existing.serializedValues.has(comparableValue)) {
        if (existing.values.length < 20) {
          existing.values.push(sanitizedValue);
        }
        existing.serializedValues.add(comparableValue);
      }
    }
  }

  return [...variableMap.entries()]
    .map(([path, data]) => ({
      path,
      values: data.values,
      occurrences: data.occurrences,
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

function sanitizeDataLayerValue(
  value: unknown,
  depth = 0
): unknown {
  if (depth > 8) {
    return "[Max depth reached]";
  }

  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      sanitizeDataLayerValue(item, depth + 1)
    );
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        sanitizeDataLayerValue(nestedValue, depth + 1),
      ])
    );
  }

  if (typeof value === "undefined") return "[undefined]";
  if (typeof value === "function") return "[function]";
  if (typeof value === "symbol") return value.toString();
  if (typeof value === "bigint") return value.toString();

  try {
    return String(value);
  } catch {
    return "[unserializable]";
  }
}

function getDataLayerRawEntries(
  entries: unknown[]
): unknown[] {
  return entries.map((entry) =>
    sanitizeDataLayerValue(entry)
  );
}

function getConsentSignals(
  result: BrowserAnalysisResult,
  dataLayerEvents: string[]
): string[] {
  const consentParameters = [
    "gcs",
    "gcd",
    "pscdl",
    "npa",
  ];

  const signals: string[] = [];

  /*
   * Signaux réseau Google Consent Mode.
   */
  for (
    const observation of
    result.networkObservations
  ) {
    try {
      const url = new URL(
        observation.url
      );

      for (
        const parameter of
        consentParameters
      ) {
        for (
          const value of
          url.searchParams.getAll(
            parameter
          )
        ) {
          signals.push(
            `${parameter}=${value}`
          );
        }
      }
    } catch {
      /*
       * Certaines URLs de tracking
       * utilisent des paramètres intégrés
       * au chemin.
       */
      for (
        const parameter of
        consentParameters
      ) {
        const match =
          observation.url.match(
            new RegExp(
              `(?:[?;&]|/)${parameter}=([^;&]+)`,
              "i"
            )
          );

        if (match?.[1]) {
          signals.push(
            `${parameter}=${decodeURIComponent(
              match[1]
            )}`
          );
        }
      }
    }
  }

  /*
   * Événement GDPR générique éventuellement
   * exposé dans le DataLayer.
   */
  if (
    dataLayerEvents.some(
      (event) =>
        event.toLowerCase() ===
        "gdprconsent"
    )
  ) {
    signals.push(
      "dataLayer event: gdprconsent"
    );
  }

  /*
   * AIP V3 — commandes Google Consent Mode
   * capturées par BrowserEngine avant l'exécution
   * des scripts du site.
   *
   * Exemples :
   *
   * consent-command:default
   * consent-default:analytics_storage=denied
   * consent-default:ad_storage=denied
   *
   * consent-command:update
   * consent-update:analytics_storage=granted
   */
  for (
    const command of
    result.consentCommands
  ) {
    signals.push(
      `consent-command:${command.action}`
    );

    for (
      const [key, value] of
      Object.entries(
        command.parameters
      )
    ) {
      signals.push(
        `consent-${command.action}:${key}=${String(
          value
        )}`
      );
    }
  }

  return unique(signals);
}

function getSources(
  flags: SourceFlags
): string[] {
  const sources: string[] = [];

  if (flags.runtime) {
    sources.push(
      "Runtime JavaScript"
    );
  }

  if (flags.script) {
    sources.push(
      "Rendered scripts"
    );
  }

  if (flags.network) {
    sources.push(
      "Network requests"
    );
  }

  if (flags.dataLayer) {
    sources.push("DataLayer");
  }

  return sources;
}

function getCertainty(
  sources: string[]
): CertaintyLevel {
  if (sources.length >= 2) {
    return "Élevé";
  }

  if (sources.length === 1) {
    return "Moyen";
  }

  return "Faible";
}

function filterNetworkObservations(
  observations:
    NetworkObservation[],
  pattern: RegExp
): NetworkObservation[] {
  return observations.filter(
    (observation) =>
      pattern.test(
        observation.url
      )
  );
}

function getNetworkDetails(
  observations:
    NetworkObservation[]
): Record<string, number> {
  return {
    observed:
      observations.length,

    completed:
      observations.filter(
        (observation) =>
          observation.state ===
          "completed"
      ).length,

    failed:
      observations.filter(
        (observation) =>
          observation.state ===
          "failed"
      ).length,

    pending:
      observations.filter(
        (observation) =>
          observation.state ===
          "pending"
      ).length,

    responseReceived:
      observations.filter(
        (observation) =>
          observation.httpStatus !==
          null
      ).length,

    httpErrors:
      observations.filter(
        (observation) =>
          observation.httpStatus !==
            null &&
          observation.httpStatus >=
            400
      ).length,
  };
}

function getNetworkEvidence(
  technology: string,
  observations:
    NetworkObservation[]
): string[] {
  if (
    observations.length === 0
  ) {
    return [];
  }

  const details =
    getNetworkDetails(
      observations
    );

  return [
    `${technology}: ${details.observed} requête(s) observée(s), ${details.completed} terminée(s), ${details.failed} échouée(s) et ${details.responseReceived} avec une réponse HTTP.`,
  ];
}

export class DynamicEvidenceEngine {
  analyze(
    result: BrowserAnalysisResult
  ): DynamicEvidenceResult {
    const technologies:
      DynamicTechnologyEvidence[] =
      [];

    const allUrls = unique([
      ...result.scripts,

      ...result.networkObservations.map(
        (observation) =>
          observation.url
      ),
    ]);

    const dataLayerEvents =
      getDataLayerEvents(
        result.dataLayer
      );

    const dataLayerVariables =
      getDataLayerVariables(
        result.dataLayer
      );

    const dataLayerRawEntries =
      getDataLayerRawEntries(
        result.dataLayer
      );

    const dataLayerVariableValues =
      getDataLayerVariableValues(
        result.dataLayer
      );

    /*
     * AIP V3 :
     * consentSignals contient désormais à la fois
     * les preuves réseau ET les commandes Consent
     * capturées au runtime par BrowserEngine.
     */
    const consentSignals =
      getConsentSignals(
        result,
        dataLayerEvents
      );

    /*
     * Google Tag Manager
     */
    const gtmIds =
      extractIds(
        allUrls,
        GTM_ID_PATTERN
      );

    const gtmScripts =
      result.scripts.filter(
        (url) =>
          GTM_URL_PATTERN.test(url)
      );

    const gtmNetwork =
      filterNetworkObservations(
        result.networkObservations,
        GTM_URL_PATTERN
      );

    const gtmSources =
      getSources({
        runtime:
          result.runtimeGlobals
            .googleTagManager,

        script:
          gtmScripts.length > 0,

        network:
          gtmNetwork.length > 0,

        dataLayer:
          dataLayerEvents.some(
            (event) =>
              event.startsWith(
                "gtm."
              )
          ),
      });

    if (
      gtmIds.length > 0 ||
      gtmSources.length > 0
    ) {
      const evidence = [
        ...(result.runtimeGlobals
          .googleTagManager
          ? [
              "La variable runtime google_tag_manager est présente.",
            ]
          : []),

        ...(gtmScripts.length >
        0
          ? [
              `${gtmScripts.length} script(s) GTM chargé(s) dans le DOM rendu.`,
            ]
          : []),

        ...getNetworkEvidence(
          "Google Tag Manager",
          gtmNetwork
        ),

        ...(dataLayerEvents.some(
          (event) =>
            event.startsWith(
              "gtm."
            )
        )
          ? [
              "Des événements de cycle de vie GTM sont présents dans le DataLayer.",
            ]
          : []),
      ];

      technologies.push({
        key: "gtm",
        present: true,
        ids: gtmIds,
        evidence,
        sources: gtmSources,
        certainty:
          getCertainty(
            gtmSources
          ),

        details: {
          scripts:
            gtmScripts.length,

          network:
            getNetworkDetails(
              gtmNetwork
            ),

          dataLayerEvents:
            dataLayerEvents.filter(
              (event) =>
                event.startsWith(
                  "gtm."
                )
            ),
        },
      });
    }

    /*
     * Google Analytics 4
     */
    const ga4Ids =
      extractIds(
        allUrls,
        GA4_ID_PATTERN
      );

    const ga4Scripts =
      result.scripts.filter(
        (url) =>
          GA4_ID_TEST_PATTERN.test(
            url
          ) &&
          /googletagmanager\.com\/gtag/i.test(
            url
          )
      );

    const ga4Network =
      filterNetworkObservations(
        result.networkObservations,
        GA4_URL_PATTERN
      );

    const ga4Sources =
      getSources({
        runtime:
          result.runtimeGlobals.gtag,

        script:
          ga4Scripts.length > 0,

        network:
          ga4Network.length > 0,
      });

    if (
      ga4Ids.length > 0 ||
      ga4Network.length > 0
    ) {
      const evidence = [
        ...(result.runtimeGlobals.gtag
          ? [
              "La fonction runtime gtag est présente.",
            ]
          : []),

        ...(ga4Scripts.length >
        0
          ? [
              `${ga4Scripts.length} script(s) GA4 chargé(s).`,
            ]
          : []),

        ...getNetworkEvidence(
          "Google Analytics 4",
          ga4Network
        ),
      ];

      technologies.push({
        key: "ga4",
        present: true,
        ids: ga4Ids,
        evidence,
        sources: ga4Sources,
        certainty:
          getCertainty(
            ga4Sources
          ),

        details: {
          scripts:
            ga4Scripts.length,

          network:
            getNetworkDetails(
              ga4Network
            ),
        },
      });
    }

    /*
     * Floodlight
     */
    const floodlightIds =
      extractFloodlightIds(
        allUrls
      );

    const floodlightScripts =
      result.scripts.filter(
        (url) =>
          FLOODLIGHT_ID_TEST_PATTERN.test(
            url
          )
      );

    const floodlightNetwork =
      filterNetworkObservations(
        result.networkObservations,
        FLOODLIGHT_URL_PATTERN
      );

    const floodlightSources =
      getSources({
        script:
          floodlightScripts.length >
          0,

        network:
          floodlightNetwork.length >
          0,
      });

    if (
      floodlightIds.length > 0 ||
      floodlightNetwork.length > 0
    ) {
      const evidence = [
        ...(floodlightScripts
          .length > 0
          ? [
              `${floodlightScripts.length} script(s) Floodlight chargé(s).`,
            ]
          : []),

        ...getNetworkEvidence(
          "Floodlight",
          floodlightNetwork
        ),
      ];

      technologies.push({
        key: "floodlight",
        present: true,
        ids: floodlightIds,
        evidence,
        sources:
          floodlightSources,
        certainty:
          getCertainty(
            floodlightSources
          ),

        details: {
          scripts:
            floodlightScripts.length,

          network:
            getNetworkDetails(
              floodlightNetwork
            ),
        },
      });
    }

    /*
     * Google DataLayer
     */
    const dataLayerSources =
      getSources({
        runtime:
          result.runtimeGlobals
            .dataLayer,

        dataLayer:
          result.dataLayer.length >
          0,
      });

    if (
      result.runtimeGlobals
        .dataLayer ||
      result.dataLayer.length > 0
    ) {
      const evidence = [
        ...(result.runtimeGlobals
          .dataLayer
          ? [
              "La variable runtime dataLayer est présente.",
            ]
          : []),

        ...(result.dataLayer
          .length > 0
          ? [
              `${result.dataLayer.length} entrée(s) capturée(s) dans le DataLayer.`,
            ]
          : []),

        ...(dataLayerEvents.length >
        0
          ? [
              `Événements observés : ${dataLayerEvents.join(
                ", "
              )}.`,
            ]
          : []),

        ...(consentSignals.length >
        0
          ? [
              `Signaux de consentement observés : ${consentSignals.join(
                ", "
              )}.`,
            ]
          : []),
      ];

      technologies.push({
        key: "datalayer",
        present: true,
        ids: [],
        evidence,
        sources:
          dataLayerSources,
        certainty:
          getCertainty(
            dataLayerSources
          ),

        details: {
          entryCount:
            result.dataLayer.length,

          events:
            dataLayerEvents,

          eventCount:
            dataLayerEvents.length,

          variables:
            dataLayerVariables,

          variableCount:
            dataLayerVariables.length,

          variableValues:
            dataLayerVariableValues,

          variableValueCount:
            dataLayerVariableValues.length,

          rawEntries:
            dataLayerRawEntries,

          rawEntryCount:
            dataLayerRawEntries.length,

          consentSignals,

          /*
           * Les commandes originales restent également
           * accessibles dans les détails pour faciliter
           * le diagnostic des audits.
           */
          consentCommands:
            result.consentCommands,

          consentCommandCount:
            result.consentCommands.length,
        },
      });
    }

    /*
     * CMP et mécanismes de consentement :
     * OneTrust, Didomi, Axeptio,
     * Cookiebot, Google Consent Mode
     * et IAB TCF.
     */
    const consentTechnologies =
      detectDynamicConsentTechnologies(
        result,
        consentSignals
      );

    technologies.push(
      ...consentTechnologies
    );

    /*
     * AIP V3.3 — Adobe dynamique
     *
     * Adobe Launch et Adobe Analytics sont traités
     * séparément afin de distinguer la présence
     * du tag manager Adobe d'une collecte Analytics
     * réellement observée.
     */
    const adobeTechnologies =
      detectDynamicAdobeTechnologies(
        result
      );

    technologies.push(
      ...adobeTechnologies
    );

    /*
     * AIP V3.3 — Chatbot Detector
     *
     * Détection dynamique :
     * - Salesforce Embedded Messaging
     * - Genesys
     * - Intercom
     * - Zendesk
     * - eKonsilio
     * - chatbot générique
     *
     * Ces technologies sont informatives
     * et n'ont aucun impact sur le score AIP.
     */
    const chatbotTechnologies =
      detectDynamicChatbotTechnologies(
        result
      );

    technologies.push(
      ...chatbotTechnologies
    );

    return {
      technologies,
      dataLayerEvents,
      consentSignals,
    };
  }
}