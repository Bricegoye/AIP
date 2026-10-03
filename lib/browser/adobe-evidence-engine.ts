import type {
  CertaintyLevel,
} from "../types";

import type {
  BrowserAnalysisResult,
  NetworkObservation,
} from "./browser-engine";

import type {
  DynamicTechnologyEvidence,
} from "./dynamic-evidence-engine";

/*
 * ============================================================
 * AIP V3.3 — Adobe Dynamic Evidence Engine
 * ============================================================
 *
 * Objectifs :
 *
 * 1. Observer Adobe Experience Platform Launch au runtime.
 * 2. Observer Adobe Analytics via les requêtes réseau.
 * 3. Extraire les Report Suite IDs lorsque cela est possible.
 * 4. Retourner les preuves réellement observées.
 *
 * Principe :
 *
 * Une simple chaîne Adobe trouvée dans le HTML ne suffit pas
 * à prouver qu'Adobe Analytics collecte réellement.
 *
 * Launch et Analytics sont donc traités séparément.
 * ============================================================
 */


/*
 * ============================================================
 * Patterns
 * ============================================================
 */

/*
 * Adobe Experience Platform Launch / Adobe DTM
 *
 * Exemples :
 *
 * https://assets.adobedtm.com/launch-XXXX.min.js
 * https://assets.adobedtm.com/...
 */
const ADOBE_LAUNCH_PATTERN =
  /assets\.adobedtm\.com/i;


/*
 * Adobe Analytics
 *
 * Les hits Adobe Analytics utilisent généralement
 * un chemin de collecte contenant :
 *
 * /b/ss/<REPORT_SUITE>/
 *
 * Exemple :
 *
 * https://example.sc.omtrdc.net/b/ss/myreportsuite/1/JS-...
 */
const ADOBE_ANALYTICS_NETWORK_PATTERN =
  /\/b\/ss\/[^/?#]+/i;


/*
 * Tracking servers Adobe fréquemment rencontrés.
 *
 * Le chemin /b/ss/ reste la preuve principale.
 */
const ADOBE_TRACKING_SERVER_PATTERN =
  /(?:omtrdc\.net|2o7\.net)/i;


/*
 * ============================================================
 * Helpers
 * ============================================================
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


function getSources(flags: {
  runtime?: boolean;
  script?: boolean;
  network?: boolean;
}): string[] {
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
  observations: NetworkObservation[],
  predicate: (
    observation: NetworkObservation
  ) => boolean
): NetworkObservation[] {
  return observations.filter(
    predicate
  );
}


function getNetworkDetails(
  observations: NetworkObservation[]
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
          observation.httpStatus >= 400
      ).length,
  };
}


/*
 * ============================================================
 * Report Suite extraction
 * ============================================================
 */

function extractReportSuiteFromUrl(
  value: string
): string[] {
  const match = value.match(
    /\/b\/ss\/([^/?#]+)/i
  );

  if (!match?.[1]) {
    return [];
  }

  try {
    const decoded =
      decodeURIComponent(
        match[1]
      );

    /*
     * Plusieurs Report Suites peuvent parfois
     * être envoyées dans le même hit.
     *
     * On conserve donc chaque valeur séparément.
     */
    return decoded
      .split(",")
      .map((item) =>
        item.trim()
      )
      .filter(Boolean);
  } catch {
    return match[1]
      .split(",")
      .map((item) =>
        item.trim()
      )
      .filter(Boolean);
  }
}


function extractReportSuites(
  observations: NetworkObservation[]
): string[] {
  return unique(
    observations.flatMap(
      (observation) =>
        extractReportSuiteFromUrl(
          observation.url
        )
    )
  );
}


/*
 * ============================================================
 * Adobe Launch
 * ============================================================
 */

function detectAdobeLaunch(
  result: BrowserAnalysisResult
): DynamicTechnologyEvidence | null {
  const launchScripts =
    result.scripts.filter(
      (url) =>
        ADOBE_LAUNCH_PATTERN.test(
          url
        )
    );

  const launchNetwork =
    filterNetworkObservations(
      result.networkObservations,
      (observation) =>
        ADOBE_LAUNCH_PATTERN.test(
          observation.url
        )
    );

  const runtimeDetected =
    result.runtimeGlobals
      .adobeSatellite;

  const sources =
    getSources({
      runtime:
        runtimeDetected,

      script:
        launchScripts.length > 0,

      network:
        launchNetwork.length > 0,
    });

  /*
   * Pour Launch, _satellite ou le chargement
   * d'assets.adobedtm.com constitue une preuve
   * suffisamment explicite.
   */
  if (sources.length === 0) {
    return null;
  }

  const evidence: string[] = [];

  if (runtimeDetected) {
    evidence.push(
      "La variable runtime _satellite est présente."
    );
  }

  if (launchScripts.length > 0) {
    evidence.push(
      `${launchScripts.length} script(s) Adobe Launch observé(s) dans le DOM rendu.`
    );
  }

  if (launchNetwork.length > 0) {
    evidence.push(
      `${launchNetwork.length} requête(s) vers Adobe Launch observée(s).`
    );
  }

  return {
    key: "adobe-launch",

    present: true,

    /*
     * Pour l'instant nous ne transformons pas
     * le nom de bibliothèque Launch en ID métier.
     *
     * La liste exacte des scripts reste disponible
     * dans details.
     */
    ids: [],

    evidence:
      unique(evidence),

    sources:
      unique(sources),

    certainty:
      getCertainty(
        sources
      ),

    details: {
      runtimeSatellite:
        runtimeDetected,

      scripts:
        unique(
          launchScripts
        ),

      networkUrls:
        unique(
          launchNetwork.map(
            (observation) =>
              observation.url
          )
        ),

      network:
        getNetworkDetails(
          launchNetwork
        ),

      /*
       * Information importante :
       *
       * Launch détecté ne signifie pas automatiquement
       * Adobe Analytics détecté.
       */
      analyticsConfirmed:
        false,
    },
  };
}


/*
 * ============================================================
 * Adobe Analytics
 * ============================================================
 */

function detectAdobeAnalytics(
  result: BrowserAnalysisResult
): DynamicTechnologyEvidence | null {
  /*
   * On cherche prioritairement les véritables hits
   * Adobe Analytics /b/ss/.
   */
  const analyticsNetwork =
    filterNetworkObservations(
      result.networkObservations,
      (observation) =>
        ADOBE_ANALYTICS_NETWORK_PATTERN.test(
          observation.url
        )
    );

  /*
   * Les domaines Adobe sont conservés comme
   * contexte supplémentaire.
   *
   * Ils ne suffisent PAS seuls à déclarer
   * Adobe Analytics présent.
   */
  const adobeTrackingNetwork =
    filterNetworkObservations(
      result.networkObservations,
      (observation) =>
        ADOBE_TRACKING_SERVER_PATTERN.test(
          observation.url
        )
    );

  /*
   * Preuve forte :
   *
   * une requête /b/ss/ a réellement été observée.
   */
  if (analyticsNetwork.length === 0) {
    return null;
  }

  const reportSuites =
    extractReportSuites(
      analyticsNetwork
    );

  const sources =
    getSources({
      network: true,

      /*
       * _satellite renforce le contexte Adobe,
       * mais ne prouve pas à lui seul Analytics.
       */
      runtime:
        result.runtimeGlobals
          .adobeSatellite,
    });

  const evidence: string[] = [
    `${analyticsNetwork.length} requête(s) Adobe Analytics /b/ss/ observée(s).`,
  ];

  if (reportSuites.length > 0) {
    evidence.push(
      `Report Suite(s) observée(s) : ${reportSuites.join(
        ", "
      )}.`
    );
  }

  if (
    result.runtimeGlobals
      .adobeSatellite
  ) {
    evidence.push(
      "Le runtime Adobe _satellite est également présent."
    );
  }

  return {
    key: "adobe-analytics",

    present: true,

    /*
     * Pour Adobe Analytics, les Report Suites
     * constituent les identifiants métier les
     * plus utiles à afficher.
     */
    ids:
      reportSuites,

    evidence:
      unique(evidence),

    sources:
      unique(sources),

    certainty:
      getCertainty(
        sources
      ),

    details: {
      reportSuites,

      networkUrls:
        unique(
          analyticsNetwork.map(
            (observation) =>
              observation.url
          )
        ),

      network:
        getNetworkDetails(
          analyticsNetwork
        ),

      adobeTrackingNetworkUrls:
        unique(
          adobeTrackingNetwork.map(
            (observation) =>
              observation.url
          )
        ),

      runtimeSatellite:
        result.runtimeGlobals
          .adobeSatellite,

      collectionConfirmed:
        true,
    },
  };
}


/*
 * ============================================================
 * Public API
 * ============================================================
 */

export function detectDynamicAdobeTechnologies(
  result: BrowserAnalysisResult
): DynamicTechnologyEvidence[] {
  const technologies:
    DynamicTechnologyEvidence[] =
    [];

  const adobeLaunch =
    detectAdobeLaunch(
      result
    );

  const adobeAnalytics =
    detectAdobeAnalytics(
      result
    );

  if (adobeLaunch) {
    /*
     * Si Analytics est également observé,
     * on enrichit Launch sans confondre
     * les deux technologies.
     */
    if (adobeAnalytics) {
      adobeLaunch.details = {
        ...adobeLaunch.details,

        analyticsConfirmed:
          true,
      };
    }

    technologies.push(
      adobeLaunch
    );
  }

  if (adobeAnalytics) {
    technologies.push(
      adobeAnalytics
    );
  }

  return technologies;
}