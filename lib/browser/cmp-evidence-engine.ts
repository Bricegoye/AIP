import type {
  BrowserAnalysisResult,
} from "./browser-engine";

import type {
  DynamicTechnologyEvidence,
} from "./dynamic-evidence-engine";

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
  runtime?: boolean;
  html?: boolean;
  script?: boolean;
  network?: boolean;
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

export function detectDynamicConsentTechnologies(
  result: BrowserAnalysisResult,
  consentSignals: string[]
): DynamicTechnologyEvidence[] {
  const technologies:
    DynamicTechnologyEvidence[] = [];

  const allNetworkUrls =
    result.networkObservations.map(
      (observation) =>
        observation.url
    );

  /*
   * OneTrust
   */
  const oneTrustScriptUrls =
    matchingUrls(
      result.scripts,
      /onetrust|cookielaw\.org|otSDKStub/i
    );

  const oneTrustNetworkUrls =
    matchingUrls(
      allNetworkUrls,
      /onetrust|cookielaw\.org|otSDKStub/i
    );

  const oneTrustHtmlDetected =
    /onetrust|optanon|otSDKStub|cookielaw\.org/i.test(
      result.html
    );

  const oneTrustId =
    result.html.match(
      /data-domain-script=["']([A-Za-z0-9_-]+)["']/i
    )?.[1];

  const oneTrustSources =
    getSources({
      runtime:
        result.runtimeGlobals.oneTrust,
      html: oneTrustHtmlDetected,
      script:
        oneTrustScriptUrls.length > 0,
      network:
        oneTrustNetworkUrls.length > 0,
    });

  if (oneTrustSources.length > 0) {
    technologies.push({
      key: "onetrust",
      present: true,
      ids: oneTrustId
        ? [oneTrustId]
        : [],
      evidence: [
        ...(result.runtimeGlobals
          .oneTrust
          ? [
              "La variable runtime OneTrust est présente.",
            ]
          : []),

        ...(oneTrustHtmlDetected
          ? [
              "Des signatures OneTrust ou Optanon sont présentes dans le DOM rendu.",
            ]
          : []),

        ...(oneTrustScriptUrls.length >
        0
          ? [
              `${oneTrustScriptUrls.length} script(s) OneTrust chargé(s).`,
            ]
          : []),

        ...(oneTrustNetworkUrls.length >
        0
          ? [
              `${oneTrustNetworkUrls.length} requête(s) réseau OneTrust observée(s).`,
            ]
          : []),

        ...(oneTrustId
          ? [
              `Domain Script ID OneTrust : ${oneTrustId}.`,
            ]
          : []),
      ],
      sources: oneTrustSources,
      certainty: getCertainty(
        oneTrustSources,
        Boolean(oneTrustId)
      ),
      details: {
        domainScriptId: oneTrustId,
        runtimeDetected:
          result.runtimeGlobals
            .oneTrust,
        htmlDetected:
          oneTrustHtmlDetected,
        scriptUrls:
          oneTrustScriptUrls,
        networkUrls:
          oneTrustNetworkUrls,
      },
    });
  }

  /*
   * Didomi
   */
  const didomiScriptUrls =
    matchingUrls(
      result.scripts,
      /didomi\.io|privacy-center\.org|didomi/i
    );

  const didomiNetworkUrls =
    matchingUrls(
      allNetworkUrls,
      /didomi\.io|privacy-center\.org|didomi/i
    );

  const didomiHtmlDetected =
    /window\.Didomi|\bDidomi\b|didomi\.io|privacy-center\.org/i.test(
      result.html
    );

  const didomiNoticeId =
    result.html.match(
      /notice[_-]?id["'\s:=]+["']?([A-Za-z0-9_-]+)/i
    )?.[1];

  const didomiOrganizationId =
    result.html.match(
      /organization[_-]?id["'\s:=]+["']?([A-Za-z0-9_-]+)/i
    )?.[1];

  const didomiSources =
    getSources({
      runtime:
        result.runtimeGlobals.didomi,
      html: didomiHtmlDetected,
      script:
        didomiScriptUrls.length > 0,
      network:
        didomiNetworkUrls.length > 0,
    });

  if (didomiSources.length > 0) {
    const didomiIds = unique([
      didomiNoticeId ?? "",
      didomiOrganizationId ?? "",
    ]);

    technologies.push({
      key: "didomi",
      present: true,
      ids: didomiIds,
      evidence: [
        ...(result.runtimeGlobals.didomi
          ? [
              "La variable runtime Didomi est présente.",
            ]
          : []),

        ...(didomiHtmlDetected
          ? [
              "Des signatures Didomi sont présentes dans le DOM rendu.",
            ]
          : []),

        ...(didomiScriptUrls.length > 0
          ? [
              `${didomiScriptUrls.length} script(s) Didomi chargé(s).`,
            ]
          : []),

        ...(didomiNetworkUrls.length > 0
          ? [
              `${didomiNetworkUrls.length} requête(s) réseau Didomi observée(s).`,
            ]
          : []),
      ],
      sources: didomiSources,
      certainty: getCertainty(
        didomiSources,
        didomiIds.length > 0
      ),
      details: {
        noticeId:
          didomiNoticeId,
        organizationId:
          didomiOrganizationId,
        runtimeDetected:
          result.runtimeGlobals.didomi,
        htmlDetected:
          didomiHtmlDetected,
        scriptUrls:
          didomiScriptUrls,
        networkUrls:
          didomiNetworkUrls,
      },
    });
  }

  /*
   * Axeptio
   */
  const axeptioScriptUrls =
    matchingUrls(
      result.scripts,
      /axept\.io|axeptio/i
    );

  const axeptioNetworkUrls =
    matchingUrls(
      allNetworkUrls,
      /axept\.io|axeptio/i
    );

  const axeptioHtmlDetected =
    /window\._axcb|window\.axeptio|\bAxeptio\b|axept\.io/i.test(
      result.html
    );

  const axeptioClientId =
    result.html.match(
      /clientId["'\s:=]+["']?([A-Za-z0-9_-]+)/i
    )?.[1];

  const axeptioCookiesVersion =
    result.html.match(
      /cookiesVersion["'\s:=]+["']?([A-Za-z0-9._-]+)/i
    )?.[1];

  const axeptioSources =
    getSources({
      html: axeptioHtmlDetected,
      script:
        axeptioScriptUrls.length > 0,
      network:
        axeptioNetworkUrls.length > 0,
    });

  if (axeptioSources.length > 0) {
    const axeptioIds = unique([
      axeptioClientId ?? "",
      axeptioCookiesVersion ?? "",
    ]);

    technologies.push({
      key: "axeptio",
      present: true,
      ids: axeptioIds,
      evidence: [
        ...(axeptioHtmlDetected
          ? [
              "Des signatures Axeptio sont présentes dans le DOM rendu.",
            ]
          : []),

        ...(axeptioScriptUrls.length > 0
          ? [
              `${axeptioScriptUrls.length} script(s) Axeptio chargé(s).`,
            ]
          : []),

        ...(axeptioNetworkUrls.length > 0
          ? [
              `${axeptioNetworkUrls.length} requête(s) réseau Axeptio observée(s).`,
            ]
          : []),
      ],
      sources: axeptioSources,
      certainty: getCertainty(
        axeptioSources,
        axeptioIds.length > 0
      ),
      details: {
        clientId:
          axeptioClientId,
        cookiesVersion:
          axeptioCookiesVersion,
        htmlDetected:
          axeptioHtmlDetected,
        scriptUrls:
          axeptioScriptUrls,
        networkUrls:
          axeptioNetworkUrls,
      },
    });
  }

  /*
   * Cookiebot
   */
  const cookiebotScriptUrls =
    matchingUrls(
      result.scripts,
      /consent\.cookiebot\.com|consentcdn\.cookiebot\.com|cookiebot/i
    );

  const cookiebotNetworkUrls =
    matchingUrls(
      allNetworkUrls,
      /consent\.cookiebot\.com|consentcdn\.cookiebot\.com|cookiebot/i
    );

  const cookiebotHtmlDetected =
    /window\.Cookiebot|\bCookiebot\b|data-cbid|consent\.cookiebot\.com/i.test(
      result.html
    );

  const cookiebotId =
    result.html.match(
      /data-cbid=["']([A-Za-z0-9_-]+)["']/i
    )?.[1];

  const cookiebotSources =
    getSources({
      html:
        cookiebotHtmlDetected,
      script:
        cookiebotScriptUrls.length > 0,
      network:
        cookiebotNetworkUrls.length >
        0,
    });

  if (cookiebotSources.length > 0) {
    technologies.push({
      key: "cookiebot",
      present: true,
      ids: cookiebotId
        ? [cookiebotId]
        : [],
      evidence: [
        ...(cookiebotHtmlDetected
          ? [
              "Des signatures Cookiebot sont présentes dans le DOM rendu.",
            ]
          : []),

        ...(cookiebotScriptUrls.length >
        0
          ? [
              `${cookiebotScriptUrls.length} script(s) Cookiebot chargé(s).`,
            ]
          : []),

        ...(cookiebotNetworkUrls.length >
        0
          ? [
              `${cookiebotNetworkUrls.length} requête(s) réseau Cookiebot observée(s).`,
            ]
          : []),

        ...(cookiebotId
          ? [
              `Cookiebot CBID : ${cookiebotId}.`,
            ]
          : []),
      ],
      sources: cookiebotSources,
      certainty: getCertainty(
        cookiebotSources,
        Boolean(cookiebotId)
      ),
      details: {
        cbid: cookiebotId,
        htmlDetected:
          cookiebotHtmlDetected,
        scriptUrls:
          cookiebotScriptUrls,
        networkUrls:
          cookiebotNetworkUrls,
      },
    });
  }

  /*
   * Google Consent Mode
   */
  const consentCommandDetected =
    /gtag\s*\(\s*["']consent["']\s*,\s*["'](?:default|update)["']/i.test(
      result.html
    );

  const googleConsentSignals =
    consentSignals.filter((signal) =>
      /^(?:gcs|gcd|pscdl|npa)=/i.test(
        signal
      )
    );

  const hasPrimaryGoogleSignal =
    googleConsentSignals.some(
      (signal) =>
        /^(?:gcs|gcd)=/i.test(
          signal
        )
    );

  if (
    consentCommandDetected ||
    hasPrimaryGoogleSignal
  ) {
    const consentModeSources =
      getSources({
        html:
          consentCommandDetected,
        network:
          googleConsentSignals.length >
          0,
      });

    technologies.push({
      key: "google-consent-mode",
      present: true,
      ids: [],
      evidence: [
        ...(consentCommandDetected
          ? [
              "Une commande gtag consent est présente dans le DOM rendu.",
            ]
          : []),

        ...googleConsentSignals,
      ],
      sources:
        consentModeSources,
      certainty:
        getCertainty(
          consentModeSources,
          googleConsentSignals.some(
            (signal) =>
              /^gcd=/i.test(signal)
          )
        ),
      details: {
        consentCommandDetected,
        consentSignals:
          googleConsentSignals,
      },
    });
  }

  /*
   * IAB TCF API
   */
  const tcfApiDetected =
    /window\.__tcfapi|\b__tcfapi\s*\(/i.test(
      result.html
    );

  const tcfLocatorDetected =
    /__tcfapiLocator/i.test(
      result.html
    );

  const euConsentDetected =
    /euconsent-v2/i.test(
      result.html
    );

  if (
    tcfApiDetected ||
    tcfLocatorDetected ||
    euConsentDetected
  ) {
    const tcfSources =
      getSources({
        html: true,
      });

    technologies.push({
      key: "tcf-api",
      present: true,
      ids: [],
      evidence: [
        ...(tcfApiDetected
          ? ["API __tcfapi détectée"]
          : []),

        ...(tcfLocatorDetected
          ? [
              "Frame __tcfapiLocator détectée",
            ]
          : []),

        ...(euConsentDetected
          ? [
              "Signal euconsent-v2 détecté",
            ]
          : []),
      ],
      sources: tcfSources,
      certainty:
        tcfApiDetected ||
        tcfLocatorDetected
          ? "Élevé"
          : "Moyen",
      details: {
        tcfApiDetected,
        tcfLocatorDetected,
        euConsentDetected,
      },
    });
  }

  return technologies;
}