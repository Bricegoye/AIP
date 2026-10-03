"use client";

interface ConsentInspectorProps {
  toolKey: string;
  toolName: string;
  evidence?: unknown;
  sources?: unknown;
  details?: Record<string, unknown>;
  certainty?: string;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string =>
      typeof item === "string" &&
      item.trim().length > 0
  );
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function formatLabel(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
}

function formatValue(value: unknown): string {
  if (value === null) {
    return "null";
  }

  if (value === undefined) {
    return "undefined";
  }

  if (typeof value === "boolean") {
    return value ? "Observé" : "Non observé";
  }

  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
    return String(value);
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function getObservationClass(value: unknown): string {
  if (value === true) {
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }

  if (value === false) {
    return "border-slate-200 bg-slate-50 text-slate-500";
  }

  return "border-sky-100 bg-sky-50 text-sky-700";
}

function isDisplayable(value: unknown): boolean {
  if (
    value === null ||
    value === undefined
  ) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === "object") {
    return (
      Object.keys(
        value as Record<string, unknown>
      ).length > 0
    );
  }

  return false;
}

export default function ConsentInspector({
  toolKey,
  toolName,
  evidence,
  sources,
  details,
  certainty,
}: ConsentInspectorProps) {
  const evidenceItems = unique(
    asStringArray(evidence)
  );

  const sourceItems = unique(
    asStringArray(sources)
  );

  const detailEntries = Object.entries(
    details ?? {}
  ).filter(([, value]) =>
    isDisplayable(value)
  );

  const booleanObservations =
    detailEntries.filter(
      ([, value]) =>
        typeof value === "boolean"
    );

  const otherDetails =
    detailEntries.filter(
      ([, value]) =>
        typeof value !== "boolean"
    );

  const isGoogleConsentMode =
    toolKey === "google-consent-mode";

  const isTCF =
    toolKey === "tcf-api";

  const isCMP =
    !isGoogleConsentMode && !isTCF;

  const hasContent =
    evidenceItems.length > 0 ||
    sourceItems.length > 0 ||
    detailEntries.length > 0 ||
    Boolean(certainty);

  if (!hasContent) {
    return null;
  }

  return (
    <div className="mt-4 border-t border-slate-200 pt-4">

      <details className="group overflow-hidden rounded-xl border border-violet-200 bg-white">

        {/* Compact view */}
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 transition hover:bg-violet-50/40">

          <div className="min-w-0">

            <div className="flex flex-wrap items-center gap-2">

              <p className="text-sm font-semibold text-slate-700">
                Ouvrir le Consent Inspector
              </p>

              {certainty && (
                <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
                  {certainty}
                </span>
              )}

            </div>

            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">

              {isCMP && (
                <span>
                  CMP
                </span>
              )}

              {isGoogleConsentMode && (
                <span>
                  Google Consent Mode
                </span>
              )}

              {isTCF && (
                <span>
                  IAB TCF
                </span>
              )}

              {booleanObservations.length > 0 && (
                <span>
                  {booleanObservations.length} observations
                </span>
              )}

              {evidenceItems.length > 0 && (
                <span>
                  {evidenceItems.length} preuves
                </span>
              )}

            </div>

          </div>

          <span className="shrink-0 text-lg text-slate-400 transition-transform group-open:rotate-180">
            ↓
          </span>

        </summary>

        {/* Expanded inspector */}
        <div className="border-t border-violet-100 bg-violet-50/20 px-4 py-5">

          {/* Inspector Header */}
          <div className="flex flex-wrap items-start justify-between gap-3">

            <div>

              <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
                Consent Inspector
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-800">
                {toolName}
              </p>

              <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
                États et signaux réellement observés pendant cet audit.
                Une valeur « Non observé » ne signifie pas nécessairement
                que le mécanisme est absent du site.
              </p>

            </div>

            {certainty && (
              <span className="rounded-full border border-violet-100 bg-white px-3 py-1 text-xs font-semibold text-violet-700">
                Certitude : {certainty}
              </span>
            )}

          </div>

          {/* Boolean observations */}
          {booleanObservations.length > 0 && (
            <div className="mt-6">

              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                États observés
              </p>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">

                {booleanObservations.map(
                  ([key, value]) => (
                    <div
                      key={key}
                      className="rounded-xl border border-slate-200 bg-white p-4"
                    >

                      <p className="text-xs font-semibold text-slate-500">
                        {formatLabel(key)}
                      </p>

                      <div className="mt-2">

                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getObservationClass(
                            value
                          )}`}
                        >
                          {formatValue(value)}
                        </span>

                      </div>

                    </div>
                  )
                )}

              </div>

            </div>
          )}

          {/* Other consent details */}
          {otherDetails.length > 0 && (
            <div className="mt-6">

              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Informations observées
              </p>

              <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">

                {otherDetails.map(
                  ([key, value], index) => (
                    <div
                      key={key}
                      className={`grid gap-2 px-4 py-3 sm:grid-cols-[190px_minmax(0,1fr)] ${
                        index !==
                        otherDetails.length - 1
                          ? "border-b border-slate-100"
                          : ""
                      }`}
                    >

                      <p className="text-xs font-semibold text-slate-500">
                        {formatLabel(key)}
                      </p>

                      <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-5 text-slate-700">
                        {formatValue(value)}
                      </pre>

                    </div>
                  )
                )}

              </div>

            </div>
          )}

          {/* Detection sources */}
          {sourceItems.length > 0 && (
            <div className="mt-6">

              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Sources de détection
              </p>

              <div className="mt-3 flex flex-wrap gap-2">

                {sourceItems.map(
                  (source) => (
                    <span
                      key={source}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700"
                    >
                      <span>
                        ✓
                      </span>

                      {source}
                    </span>
                  )
                )}

              </div>

            </div>
          )}

          {/* Evidence */}
          {evidenceItems.length > 0 && (
            <div className="mt-6">

              <div className="flex items-center justify-between gap-4">

                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Preuves observées
                </p>

                <span className="text-xs text-slate-400">
                  {evidenceItems.length}
                </span>

              </div>

              <div className="mt-3 space-y-2">

                {evidenceItems
                  .slice(0, 5)
                  .map(
                    (
                      evidenceItem,
                      index
                    ) => (
                      <div
                        key={`${evidenceItem}-${index}`}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2.5"
                      >
                        <p className="break-words font-mono text-xs leading-5 text-slate-600">
                          {evidenceItem}
                        </p>
                      </div>
                    )
                  )}

              </div>

              {evidenceItems.length > 5 && (
                <details className="mt-3">

                  <summary className="cursor-pointer list-none text-xs font-semibold text-violet-700 hover:text-violet-800">
                    Afficher les{" "}
                    {evidenceItems.length - 5}{" "}
                    autres preuves
                  </summary>

                  <div className="mt-3 space-y-2">

                    {evidenceItems
                      .slice(5)
                      .map(
                        (
                          evidenceItem,
                          index
                        ) => (
                          <div
                            key={`${evidenceItem}-${index}`}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5"
                          >
                            <p className="break-words font-mono text-xs leading-5 text-slate-600">
                              {evidenceItem}
                            </p>
                          </div>
                        )
                      )}

                  </div>

                </details>
              )}

            </div>
          )}

        </div>

      </details>

    </div>
  );
}