import {
  chromium,
  type Browser,
  type Request,
  type Response,
} from "playwright";

import {
  assertSafePublicUrl,
} from "../security/url-safety";

export interface RuntimeGlobals {
  dataLayer: boolean;
  gtag: boolean;
  googleTagManager: boolean;
  adobeSatellite: boolean;
  utag: boolean;
  didomi: boolean;
  oneTrust: boolean;
}

export type NetworkRequestState =
  | "pending"
  | "completed"
  | "failed";

export interface NetworkObservation {
  url: string;
  method: string;
  resourceType: string;
  state: NetworkRequestState;
  httpStatus: number | null;
  failureText: string | null;
  isNavigationRequest: boolean;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
}

export interface ConsentCommandObservation {
  action: "default" | "update";
  parameters: Record<string, unknown>;
  capturedAt: string;
}

export interface BrowserAnalysisResult {
  requestedUrl: string;
  finalUrl: string;
  title: string;
  status: number | null;
  html: string;
  htmlSize: number;
  scripts: string[];
  networkRequests: string[];
  networkObservations: NetworkObservation[];
  dataLayer: unknown[];
  consentCommands: ConsentCommandObservation[];
  runtimeGlobals: RuntimeGlobals;
  consoleErrors: string[];
  pageErrors: string[];
  warnings: string[];
  analyzedAt: string;
  executionTime: number;
}

export interface BrowserEngineOptions {
  navigationTimeoutMs?: number;
  settleTimeMs?: number;
  maxNetworkRequests?: number;
}

const DEFAULT_NAVIGATION_TIMEOUT = 30_000;
const DEFAULT_SETTLE_TIME = 3_000;
const DEFAULT_MAX_NETWORK_REQUESTS = 1_000;
const MAX_RECORDED_ERRORS = 25;
const MAX_DATA_LAYER_ENTRIES = 100;

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export class BrowserEngine {
  private readonly navigationTimeoutMs: number;
  private readonly settleTimeMs: number;
  private readonly maxNetworkRequests: number;

  constructor(options: BrowserEngineOptions = {}) {
    this.navigationTimeoutMs =
      options.navigationTimeoutMs ??
      DEFAULT_NAVIGATION_TIMEOUT;

    this.settleTimeMs =
      options.settleTimeMs ??
      DEFAULT_SETTLE_TIME;

    this.maxNetworkRequests =
      options.maxNetworkRequests ??
      DEFAULT_MAX_NETWORK_REQUESTS;
  }

  async analyze(
    url: string
  ): Promise<BrowserAnalysisResult> {
    const startedAt = Date.now();

    const requestedUrl = (
      await assertSafePublicUrl(url)
    ).toString();

    let browser: Browser | null = null;

    const networkRequests =
      new Set<string>();

    const networkObservations:
      NetworkObservation[] = [];

    const observationByRequest =
      new Map<Request, NetworkObservation>();

    const observationStartTimes =
      new Map<Request, number>();

    const safeOriginValidations =
      new Map<string, Promise<void>>();

    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const warnings: string[] = [];

    const finishNetworkObservation = (
      request: Request,
      state: NetworkRequestState,
      failureText: string | null = null
    ) => {
      const observation =
        observationByRequest.get(request);

      const requestStartedAt =
        observationStartTimes.get(request);

      if (
        !observation ||
        requestStartedAt === undefined
      ) {
        return;
      }

      const finishedAt = Date.now();

      observation.state = state;
      observation.failureText = failureText;
      observation.completedAt =
        new Date(finishedAt).toISOString();
      observation.durationMs =
        finishedAt - requestStartedAt;
    };

    try {
      browser = await chromium.launch({
        headless: true,
      });

      const context =
        await browser.newContext({
          ignoreHTTPSErrors: true,
          serviceWorkers: "block",
          locale: "fr-FR",

          viewport: {
            width: 1440,
            height: 900,
          },

          extraHTTPHeaders: {
            "Accept-Language":
              "fr-FR,fr;q=0.9,en;q=0.8",
          },
        });

      await context.route(
        "**/*",
        async (route) => {
          const outboundUrl =
            route.request().url();

          let parsedUrl: URL;

          try {
            parsedUrl =
              new URL(outboundUrl);
          } catch {
            await route.abort(
              "blockedbyclient"
            );

            return;
          }

          if (
            parsedUrl.protocol !== "http:" &&
            parsedUrl.protocol !== "https:"
          ) {
            await route.continue();
            return;
          }

          const originKey =
            parsedUrl.origin;

          let validation =
            safeOriginValidations.get(
              originKey
            );

          if (!validation) {
            validation =
              assertSafePublicUrl(
                outboundUrl
              ).then(() => undefined);

            safeOriginValidations.set(
              originKey,
              validation
            );
          }

          try {
            await validation;
            await route.continue();
          } catch (error) {
            if (
              warnings.length <
              MAX_RECORDED_ERRORS
            ) {
              const message =
                error instanceof Error
                  ? error.message
                  : "Unsafe network destination.";

              warnings.push(
                `Blocked unsafe request to ${originKey}: ${message}`
              );
            }

            await route.abort(
              "blockedbyclient"
            );
          }
        }
      );

      try {
        const page =
          await context.newPage();

        await page.addInitScript(() => {
          type ConsentAction =
            | "default"
            | "update";

          interface CapturedConsentCommand {
            action: ConsentAction;
            parameters: Record<
              string,
              unknown
            >;
            capturedAt: string;
          }

          const runtimeWindow =
            window as typeof window & {
              __aipConsentCommands?:
                CapturedConsentCommand[];

              dataLayer?: unknown[];
            };

          runtimeWindow.__aipConsentCommands =
            [];

          const captureConsentCommand = (
            entry: unknown
          ) => {
            if (
              typeof entry !== "object" ||
              entry === null
            ) {
              return;
            }

            const candidate =
              entry as {
                0?: unknown;
                1?: unknown;
                2?: unknown;
              };

            if (
              candidate[0] !== "consent" ||
              (
                candidate[1] !==
                  "default" &&
                candidate[1] !==
                  "update"
              )
            ) {
              return;
            }

            const parameters =
              typeof candidate[2] ===
                "object" &&
              candidate[2] !== null &&
              !Array.isArray(candidate[2])
                ? {
                    ...(
                      candidate[2] as
                        Record<
                          string,
                          unknown
                        >
                    ),
                  }
                : {};

            runtimeWindow
              .__aipConsentCommands
              ?.push({
                action:
                  candidate[1] as
                    ConsentAction,

                parameters,

                capturedAt:
                  new Date().toISOString(),
              });
          };

          let internalDataLayer:
            unknown[] = [];

          const interceptedDataLayers =
            new WeakSet<unknown[]>();

          const installPushInterceptor = (
            dataLayer: unknown[]
          ) => {
            if (
              interceptedDataLayers.has(
                dataLayer
              )
            ) {
              return dataLayer;
            }

            interceptedDataLayers.add(
              dataLayer
            );

            const originalPush =
              dataLayer.push.bind(
                dataLayer
              );

            dataLayer.push = (
              ...items: unknown[]
            ): number => {
              for (
                const item of items
              ) {
                captureConsentCommand(
                  item
                );
              }

              return originalPush(
                ...items
              );
            };

            return dataLayer;
          };

          Object.defineProperty(
            runtimeWindow,
            "dataLayer",
            {
              configurable: true,

              get() {
                return internalDataLayer;
              },

              set(value: unknown) {
                if (
                  !Array.isArray(value)
                ) {
                  return;
                }

                const wasAlreadyIntercepted =
                  interceptedDataLayers.has(
                    value
                  );

                internalDataLayer =
                  installPushInterceptor(
                    value
                  );

                if (
                  !wasAlreadyIntercepted
                ) {
                  for (
                    const entry of value
                  ) {
                    captureConsentCommand(
                      entry
                    );
                  }
                }
              },
            }
          );

          internalDataLayer =
            installPushInterceptor(
              internalDataLayer
            );
        });

        page.setDefaultTimeout(
          this.navigationTimeoutMs
        );

        page.setDefaultNavigationTimeout(
          this.navigationTimeoutMs
        );

        page.on(
          "request",
          (request) => {
            if (
              networkRequests.size <
              this.maxNetworkRequests
            ) {
              networkRequests.add(
                request.url()
              );
            }

            if (
              networkObservations.length >=
              this.maxNetworkRequests
            ) {
              return;
            }

            const requestStartedAt =
              Date.now();

            const observation:
              NetworkObservation = {
                url: request.url(),
                method:
                  request.method(),
                resourceType:
                  request.resourceType(),
                state: "pending",
                httpStatus: null,
                failureText: null,
                isNavigationRequest:
                  request.isNavigationRequest(),
                startedAt:
                  new Date(
                    requestStartedAt
                  ).toISOString(),
                completedAt: null,
                durationMs: null,
              };

            networkObservations.push(
              observation
            );

            observationByRequest.set(
              request,
              observation
            );

            observationStartTimes.set(
              request,
              requestStartedAt
            );
          }
        );

        page.on(
          "response",
          (receivedResponse) => {
            const observation =
              observationByRequest.get(
                receivedResponse.request()
              );

            if (observation) {
              observation.httpStatus =
                receivedResponse.status();
            }
          }
        );

        page.on(
          "requestfinished",
          (request) => {
            finishNetworkObservation(
              request,
              "completed"
            );
          }
        );

        page.on(
          "requestfailed",
          (request) => {
            const failure =
              request.failure()
                ?.errorText ??
              "Unknown request failure";

            finishNetworkObservation(
              request,
              "failed",
              failure
            );

            if (
              warnings.length <
              MAX_RECORDED_ERRORS
            ) {
              warnings.push(
                `Request failed: ${request.url()} — ${failure}`
              );
            }
          }
        );

        page.on(
          "console",
          (message) => {
            if (
              message.type() ===
                "error" &&
              consoleErrors.length <
                MAX_RECORDED_ERRORS
            ) {
              consoleErrors.push(
                message.text()
              );
            }
          }
        );

        page.on(
          "pageerror",
          (error) => {
            if (
              pageErrors.length <
              MAX_RECORDED_ERRORS
            ) {
              pageErrors.push(
                error.message
              );
            }
          }
        );

        let response:
          Response | null = null;

        try {
          response =
            await page.goto(
              requestedUrl,
              {
                waitUntil:
                  "domcontentloaded",

                timeout:
                  this
                    .navigationTimeoutMs,
              }
            );
        } catch (error) {
          warnings.push(
            error instanceof Error
              ? `Navigation warning: ${error.message}`
              : "Navigation did not complete normally."
          );
        }

        try {
          await page.waitForLoadState(
            "load",
            {
              timeout: 10_000,
            }
          );
        } catch {
          warnings.push(
            "The load event did not complete within 10 seconds."
          );
        }

        await page.waitForTimeout(
          this.settleTimeMs
        );

        const html =
          await page.content();

        const scripts =
          await page
            .locator("script[src]")
            .evaluateAll(
              (elements) =>
                elements
                  .map(
                    (element) =>
                      (
                        element as
                          HTMLScriptElement
                      ).src
                  )
                  .filter(Boolean)
            );

        const runtimeData =
          await page.evaluate(
            (
              maxDataLayerEntries
            ) => {
              const runtimeWindow =
                window as typeof window & {
                  dataLayer?: unknown;

                  __aipConsentCommands?:
                    Array<{
                      action:
                        | "default"
                        | "update";

                      parameters:
                        Record<
                          string,
                          unknown
                        >;

                      capturedAt:
                        string;
                    }>;

                  gtag?: unknown;

                  google_tag_manager?:
                    unknown;

                  _satellite?: unknown;

                  utag?: unknown;

                  Didomi?: unknown;

                  didomi?: unknown;

                  OneTrust?: unknown;
                };

              const rawDataLayer =
                runtimeWindow.dataLayer;

              const dataLayer =
                Array.isArray(
                  rawDataLayer
                )
                  ? rawDataLayer
                      .slice(
                        -maxDataLayerEntries
                      )
                      .map(
                        (entry) => {
                          try {
                            return JSON.parse(
                              JSON.stringify(
                                entry,
                                (
                                  _key,
                                  value
                                ) => {
                                  if (
                                    typeof value ===
                                    "function"
                                  ) {
                                    return "[Function]";
                                  }

                                  return value;
                                }
                              )
                            );
                          } catch {
                            return String(
                              entry
                            );
                          }
                        }
                      )
                  : [];

              const runtimeGlobals:
                RuntimeGlobals = {
                dataLayer:
                  Array.isArray(
                    rawDataLayer
                  ),

                gtag:
                  typeof runtimeWindow
                    .gtag ===
                  "function",

                googleTagManager:
                  Boolean(
                    runtimeWindow
                      .google_tag_manager
                  ),

                adobeSatellite:
                  Boolean(
                    runtimeWindow
                      ._satellite
                  ),

                utag:
                  Boolean(
                    runtimeWindow
                      .utag
                  ),

                didomi:
                  Boolean(
                    runtimeWindow
                      .Didomi ||
                      runtimeWindow
                        .didomi
                  ),

                oneTrust:
                  Boolean(
                    runtimeWindow
                      .OneTrust
                  ),
              };

              const consentCommands =
                Array.isArray(
                  runtimeWindow
                    .__aipConsentCommands
                )
                  ? runtimeWindow
                      .__aipConsentCommands
                      .slice(-50)
                  : [];

              return {
                dataLayer,
                runtimeGlobals,
                consentCommands,
              };
            },

            MAX_DATA_LAYER_ENTRIES
          );

        return {
          requestedUrl,

          finalUrl:
            page.url(),

          title:
            await page.title(),

          status:
            response?.status() ??
            null,

          html,

          htmlSize:
            Buffer.byteLength(
              html,
              "utf8"
            ),

          scripts:
            unique(scripts),

          networkRequests: [
            ...networkRequests,
          ],

          networkObservations:
            networkObservations.map(
              (observation) => ({
                ...observation,
              })
            ),

          dataLayer:
            runtimeData.dataLayer,

          consentCommands:
            runtimeData
              .consentCommands,

          runtimeGlobals:
            runtimeData
              .runtimeGlobals,

          consoleErrors,

          pageErrors,

          warnings,

          analyzedAt:
            new Date().toISOString(),

          executionTime:
            Date.now() -
            startedAt,
        };
      } finally {
        await context.close();
      }
    } finally {
      await browser?.close();
    }
  }
}