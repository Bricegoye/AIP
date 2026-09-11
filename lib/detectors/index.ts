import type {
  AnalyticsToolDetection,
} from "../types";

import { detectGTM } from "./gtm-detector";
import { detectGA4 } from "./ga4-detector";
import { detectTagCommander } from "./tagcommander-detector";
import { detectConsent } from "./consent-detector";
import { detectDataLayer } from "./datalayer-detector";
import { detectAdobeLaunch } from "./adobe-launch-detector";
import { detectAdobeAnalytics } from "./adobe-analytics-detector";
import { detectMetaPixel } from "./meta-pixel-detector";
import { detectLinkedInInsight } from "./linkedin-insight-detector";
import { detectTikTokPixel } from "./tiktok-pixel-detector";
import { detectEulerian } from "./eulerian-detector";
import { detectFloodlight } from "./floodlight-detector";
import { detectDidomi } from "./didomi-detector";
import { detectAxeptio } from "./axeptio-detector";
import { detectOneTrust } from "./onetrust-detector";
import { detectCookiebot } from "./cookiebot-detector";
import {
  detectGoogleConsentMode,
} from "./google-consent-mode-detector";
import { detectTCFAPI } from "./tcf-api-detector";

type Detector = {
  key: string;
  name: string;
  detect: (
    html: string
  ) => AnalyticsToolDetection;
};

const detectors: Detector[] = [
  {
    key: "gtm",
    name: "Google Tag Manager",
    detect: detectGTM,
  },
  {
    key: "ga4",
    name: "Google Analytics 4",
    detect: detectGA4,
  },
  {
    key: "tagcommander",
    name: "TagCommander",
    detect: detectTagCommander,
  },
  {
    key: "datalayer",
    name: "Google DataLayer",
    detect: detectDataLayer,
  },
  {
    key: "adobe-launch",
    name: "Adobe Experience Platform Launch",
    detect: detectAdobeLaunch,
  },
  {
    key: "adobe-analytics",
    name: "Adobe Analytics",
    detect: detectAdobeAnalytics,
  },
  {
    key: "eulerian",
    name: "Eulerian",
    detect: detectEulerian,
  },
  {
    key: "meta-pixel",
    name: "Meta Pixel",
    detect: detectMetaPixel,
  },
  {
    key: "linkedin-insight",
    name: "LinkedIn Insight Tag",
    detect: detectLinkedInInsight,
  },
  {
    key: "floodlight",
    name: "Floodlight",
    detect: detectFloodlight,
  },
  {
    key: "tiktok-pixel",
    name: "TikTok Pixel",
    detect: detectTikTokPixel,
  },

  /*
   * CMP identifiées
   */
  {
    key: "didomi",
    name: "Didomi",
    detect: detectDidomi,
  },
  {
    key: "axeptio",
    name: "Axeptio",
    detect: detectAxeptio,
  },
  {
    key: "onetrust",
    name: "OneTrust",
    detect: detectOneTrust,
  },
  {
    key: "cookiebot",
    name: "Cookiebot",
    detect: detectCookiebot,
  },

  /*
   * Mécanismes de consentement
   */
  {
    key: "google-consent-mode",
    name: "Google Consent Mode",
    detect: detectGoogleConsentMode,
  },
  {
    key: "tcf-api",
    name:
      "IAB Transparency & Consent Framework",
    detect: detectTCFAPI,
  },

  /*
   * Repli générique si aucune technologie
   * précise n’a été identifiée.
   */
  {
    key: "consent",
    name: "Consent Management Platform",
    detect: detectConsent,
  },
];

const EXPLICIT_CONSENT_KEYS =
  new Set([
    "didomi",
    "axeptio",
    "onetrust",
    "cookiebot",
    "google-consent-mode",
    "tcf-api",
  ]);

export function runDetectors(
  html: string
): AnalyticsToolDetection[] {
  const detectedTools =
    detectors
      .map((detector) =>
        detector.detect(html)
      )
      .filter((tool) => tool.present);

  const explicitConsentDetected =
    detectedTools.some((tool) =>
      EXPLICIT_CONSENT_KEYS.has(
        tool.key
      )
    );

  /*
   * Le résultat générique est retiré lorsqu’une
   * CMP ou un mécanisme précis est identifié.
   */
  return detectedTools.filter(
    (tool) =>
      tool.key !== "consent" ||
      !explicitConsentDetected
  );
}