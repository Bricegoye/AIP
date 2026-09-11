import type {
  AnalyticsToolDetection,
  CertaintyLevel,
} from "../types";

import type {
  DynamicTechnologyEvidence,
  DynamicTechnologyKey,
} from "../browser/dynamic-evidence-engine";

import { detectGTM } from "./gtm-detector";
import { detectGA4 } from "./ga4-detector";
import { detectFloodlight } from "./floodlight-detector";
import { detectDataLayer } from "./datalayer-detector";
import { detectOneTrust } from "./onetrust-detector";
import { detectDidomi } from "./didomi-detector";
import { detectAxeptio } from "./axeptio-detector";
import { detectCookiebot } from "./cookiebot-detector";
import {
  detectGoogleConsentMode,
} from "./google-consent-mode-detector";
import { detectTCFAPI } from "./tcf-api-detector";

type DetectorFactory = (
  html: string
) => AnalyticsToolDetection;

const detectorFactories: Record<
  DynamicTechnologyKey,
  DetectorFactory
> = {
  gtm: detectGTM,
  ga4: detectGA4,
  floodlight: detectFloodlight,
  datalayer: detectDataLayer,
  onetrust: detectOneTrust,
  didomi: detectDidomi,
  axeptio: detectAxeptio,
  cookiebot: detectCookiebot,

  "google-consent-mode":
    detectGoogleConsentMode,

  "tcf-api":
    detectTCFAPI,
};

const EXPLICIT_CONSENT_KEYS =
  new Set<string>([
    "onetrust",
    "didomi",
    "axeptio",
    "cookiebot",
    "google-consent-mode",
    "tcf-api",
  ]);

const certaintyRank: Record<
  CertaintyLevel,
  number
> = {
  Faible: 1,
  Moyen: 2,
  Élevé: 3,
};

const INTERNAL_GTM_EVENTS =
  new Set([
    "gtm.js",
    "gtm.dom",
    "gtm.load",
    "gtm.click",
    "gtm.linkclick",
    "gtm.scrolldepth",
    "gtm.historychange",
  ]);

const ECOMMERCE_EVENTS =
  new Set([
    "view_item",
    "view_item_list",
    "select_item",
    "add_to_cart",
    "remove_from_cart",
    "view_cart",
    "begin_checkout",
    "add_shipping_info",
    "add_payment_info",
    "purchase",
    "refund",
  ]);

function unique(
  values: string[]
): string[] {
  return [
    ...new Set(
      values.filter(Boolean)
    ),
  ];
}

function getStringArray(
  value: unknown
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string =>
      typeof item === "string"
  );
}

function getNumber(
  value: unknown
): number | undefined {
  return typeof value === "number"
    ? value
    : undefined;
}

function strongestCertainty(
  first: CertaintyLevel,
  second: CertaintyLevel
): CertaintyLevel {
  return certaintyRank[first] >=
    certaintyRank[second]
    ? first
    : second;
}

function isInternalGTMEvent(
  event: string
): boolean {
  const normalizedEvent =
    event.toLowerCase();

  return (
    normalizedEvent.startsWith(
      "gtm."
    ) ||
    INTERNAL_GTM_EVENTS.has(
      normalizedEvent
    )
  );
}

function isConsentEvent(
  event: string
): boolean {
  return /consent|gdpr|cookie|optanon|didomi|onetrust/i.test(
    event
  );
}

function isEcommerceEvent(
  event: string
): boolean {
  return ECOMMERCE_EVENTS.has(
    event.toLowerCase()
  );
}

/**
 * Fusionne les informations statiques
 * du DataLayer avec les événements et
 * signaux observés par Playwright.
 */
function enrichDataLayerDetails(
  baseDetails:
    Record<string, unknown>,

  dynamicDetails:
    Record<string, unknown>
): Record<string, unknown> {
  const staticEvents =
    getStringArray(
      baseDetails.allEvents
    );

  const dynamicEvents =
    getStringArray(
      dynamicDetails.events
    );

  const allEvents = unique([
    ...staticEvents,
    ...dynamicEvents,
  ]);

  const internalEvents =
    allEvents.filter(
      isInternalGTMEvent
    );

  /*
   * Les événements de consentement
   * sont techniques et ne sont pas
   * considérés comme métier.
   */
  const businessEvents =
    allEvents.filter(
      (event) =>
        !isInternalGTMEvent(
          event
        ) &&
        !isConsentEvent(event)
    );

  const dynamicConsentSignals =
    getStringArray(
      dynamicDetails
        .consentSignals
    );

  const existingConsentEvidence =
    getStringArray(
      baseDetails
        .consentSignalEvidence
    );

  const consentSignalEvidence =
    unique([
      ...existingConsentEvidence,
      ...dynamicConsentSignals,
    ]);

  const consentSignals =
    baseDetails
      .consentSignals === true ||
    consentSignalEvidence.length >
      0 ||
    allEvents.some(
      isConsentEvent
    );

  const ecommerceDetected =
    baseDetails
      .ecommerceDetected ===
      true ||
    allEvents.some(
      isEcommerceEvent
    );

  const dynamicEntryCount =
    getNumber(
      dynamicDetails.entryCount
    ) ?? 0;

  return {
    ...baseDetails,

    /*
     * Les preuves dynamiques deviennent
     * également disponibles directement
     * dans les détails normalisés.
     */
    ...dynamicDetails,

    windowDataLayerDetected:
      baseDetails
        .windowDataLayerDetected ===
        true ||
      dynamicEntryCount > 0,

    allEvents,
    internalEvents,
    businessEvents,

    eventCount:
      allEvents.length,

    internalEventCount:
      internalEvents.length,

    businessEventCount:
      businessEvents.length,

    ecommerceDetected,
    consentSignals,
    consentSignalEvidence,
  };
}

function createDetails(
  baseDetails:
    Record<string, unknown>,

  dynamicTechnology:
    DynamicTechnologyEvidence,

  staticDetected: boolean
): Record<string, unknown> {
  const commonDetails:
    Record<string, unknown> = {
      ...baseDetails,

      /*
       * Les valeurs observées par Playwright
       * deviennent directement accessibles
       * au rapport et au scoring.
       */
      ...dynamicTechnology.details,

      detectionModes: {
        static:
          staticDetected,
        dynamic: true,
      },

      /*
       * La preuve brute est également
       * conservée pour l’analyse technique.
       */
      dynamicEvidence:
        dynamicTechnology.details,
    };

  if (
    dynamicTechnology.key !==
    "datalayer"
  ) {
    return commonDetails;
  }

  return enrichDataLayerDetails(
    commonDetails,
    dynamicTechnology.details
  );
}

function createDynamicTool(
  dynamicTechnology:
    DynamicTechnologyEvidence
): AnalyticsToolDetection {
  const detector =
    detectorFactories[
      dynamicTechnology.key
    ];

  const template =
    detector("");

  return {
    ...template,

    present: true,

    status:
      "Détecté directement",

    ids: [
      ...dynamicTechnology.ids,
    ],

    evidence: [
      ...dynamicTechnology
        .evidence,
    ],

    sources: [
      ...dynamicTechnology
        .sources,
    ],

    certainty:
      dynamicTechnology
        .certainty,

    details: createDetails(
      template.details ?? {},
      dynamicTechnology,
      false
    ),
  };
}

function mergeTool(
  staticTool:
    AnalyticsToolDetection,

  dynamicTechnology:
    DynamicTechnologyEvidence
): AnalyticsToolDetection {
  const staticDetected =
    staticTool.present;

  return {
    ...staticTool,

    present: true,

    status:
      "Détecté directement",

    ids: unique([
      ...staticTool.ids,
      ...dynamicTechnology.ids,
    ]),

    evidence: unique([
      ...staticTool.evidence,
      ...dynamicTechnology
        .evidence,
    ]),

    sources: unique([
      ...staticTool.sources,
      ...dynamicTechnology
        .sources,
    ]),

    certainty:
      strongestCertainty(
        staticTool.certainty,
        dynamicTechnology
          .certainty
      ),

    details: createDetails(
      staticTool.details ?? {},
      dynamicTechnology,
      staticDetected
    ),
  };
}

export function fuseDetections(
  staticTools:
    AnalyticsToolDetection[],

  dynamicTechnologies:
    DynamicTechnologyEvidence[]
): AnalyticsToolDetection[] {
  const fusedTools:
    AnalyticsToolDetection[] =
    staticTools.map(
      (
        tool
      ): AnalyticsToolDetection => ({
        ...tool,

        ids: [
          ...tool.ids,
        ],

        evidence: [
          ...tool.evidence,
        ],

        sources: [
          ...tool.sources,
        ],

        details: tool.details
          ? {
              ...tool.details,
            }
          : undefined,
      })
    );

  const toolIndexByKey =
    new Map<
      string,
      number
    >(
      fusedTools.map(
        (tool, index) => [
          tool.key,
          index,
        ]
      )
    );

  for (
    const dynamicTechnology of
    dynamicTechnologies
  ) {
    const existingIndex =
      toolIndexByKey.get(
        dynamicTechnology.key
      );

    if (
      existingIndex ===
      undefined
    ) {
      const dynamicTool =
        createDynamicTool(
          dynamicTechnology
        );

      fusedTools.push(
        dynamicTool
      );

      toolIndexByKey.set(
        dynamicTool.key,
        fusedTools.length - 1
      );

      continue;
    }

    fusedTools[
      existingIndex
    ] = mergeTool(
      fusedTools[
        existingIndex
      ],
      dynamicTechnology
    );
  }

  /*
   * Lorsqu’une CMP ou un mécanisme
   * précis est identifié, la détection
   * générique "consent" est retirée.
   */
  const hasExplicitConsent =
    fusedTools.some(
      (tool) =>
        tool.present &&
        EXPLICIT_CONSENT_KEYS.has(
          tool.key
        )
    );

  if (hasExplicitConsent) {
    return fusedTools.filter(
      (tool) =>
        tool.key !== "consent"
    );
  }

  return fusedTools;
}