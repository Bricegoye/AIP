"use client";

interface TechnicalEvidenceInspectorProps {
  evidence?: unknown;
  sources?: unknown;
  details?: Record<string, unknown>;
  certainty?: string;
}

function asStringArray(
  value: unknown
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string =>
      typeof item === "string" &&
      item.trim().length > 0
  );
}

function unique(
  values: string[]
): string[] {
  return [...new Set(values)];
}

function formatValue(
  value: unknown
): string {
  if (value === null) {
    return "null";
  }

  if (value === undefined) {
    return "undefined";
  }

  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  try {
    return JSON.stringify(
      value,
      null,
      2
    );
  } catch {
    return String(value);
  }
}

function isDisplayableDetail(
  value: unknown
): boolean {
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
        value as Record<
          string,
          unknown
        >
      ).length > 0
    );
  }

  return false;
}

function formatDetailName(
  key: string
): string {
  return key
    .replace(
      /([a-z0-9])([A-Z])/g,
      "$1 $2"
    )
    .replace(/[-_]/g, " ")
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase()
    );
}

export default function TechnicalEvidenceInspector({
  evidence,
  sources,
  details,
  certainty,
}: TechnicalEvidenceInspectorProps) {
  const evidenceItems = unique(
    asStringArray(evidence)
  );

  const sourceItems = unique(
    asStringArray(sources)
  );

  /*
   * Ces données peuvent être très volumineuses.
   * Certaines disposent déjà de leur propre
   * Inspector, notamment le DataLayer.
   */
  const hiddenDetailKeys = new Set([
    "rawEntries",
    "variableValues",
    "variables",
    "allEvents",
    "events",
    "businessEvents",
    "internalEvents",
    "consentSignalEvidence",
  ]);

  const detailEntries =
    Object.entries(
      details ?? {}
    ).filter(
      ([key, value]) =>
        !hiddenDetailKeys.has(key) &&
        isDisplayableDetail(value)
    );

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

      {/*
       * Vue compacte.
       *
       * Toutes les preuves sont repliées
       * par défaut afin de conserver une
       * page d'audit lisible.
       */}
      <details className="group overflow-hidden rounded-xl border border-slate-200 bg-white">

        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 transition hover:bg-slate-50">

          <div className="min-w-0">

            <div className="flex flex-wrap items-center gap-2">

              <p className="text-sm font-semibold text-slate-700">
                Voir les preuves techniques
              </p>

              {certainty && (
                <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                  {certainty}
                </span>
              )}

            </div>

            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">

              {sourceItems.length > 0 && (
                <span>
                  {sourceItems.length} source
                  {sourceItems.length > 1
                    ? "s"
                    : ""}
                </span>
              )}

              {evidenceItems.length > 0 && (
                <span>
                  {evidenceItems.length} preuve
                  {evidenceItems.length > 1
                    ? "s"
                    : ""}
                </span>
              )}

              {detailEntries.length > 0 && (
                <span>
                  {detailEntries.length} détail
                  {detailEntries.length > 1
                    ? "s"
                    : ""}
                </span>
              )}

            </div>

          </div>

          <span className="shrink-0 text-lg text-slate-400 transition-transform group-open:rotate-180">
            ↓
          </span>

        </summary>

        <div className="border-t border-slate-200 bg-slate-50/50 px-4 py-5">

          {/* Detection sources */}
          {sourceItems.length > 0 && (
            <div>

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
            <div
              className={
                sourceItems.length > 0
                  ? "mt-6"
                  : ""
              }
            >

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

              {evidenceItems.length >
                5 && (
                <details className="group/evidence mt-3">

                  <summary className="cursor-pointer list-none text-xs font-semibold text-sky-700 hover:text-sky-800">
                    Afficher les{" "}
                    {evidenceItems.length -
                      5}{" "}
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

          {/* Technical details */}
          {detailEntries.length > 0 && (
            <div
              className={
                sourceItems.length > 0 ||
                evidenceItems.length > 0
                  ? "mt-6"
                  : ""
              }
            >

              <details className="group/details overflow-hidden rounded-xl border border-slate-200 bg-white">

                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3">

                  <div>

                    <p className="text-sm font-semibold text-slate-700">
                      Détails techniques
                    </p>

                    <p className="mt-0.5 text-xs text-slate-400">
                      {detailEntries.length} élément
                      {detailEntries.length >
                      1
                        ? "s"
                        : ""}
                    </p>

                  </div>

                  <span className="text-slate-400 transition-transform group-open/details:rotate-180">
                    ↓
                  </span>

                </summary>

                <div className="border-t border-slate-200">

                  {detailEntries.map(
                    (
                      [key, value],
                      index
                    ) => (
                      <div
                        key={key}
                        className={`grid gap-2 px-4 py-3 sm:grid-cols-[180px_minmax(0,1fr)] ${
                          index !==
                          detailEntries.length -
                            1
                            ? "border-b border-slate-100"
                            : ""
                        }`}
                      >

                        <p className="text-xs font-semibold text-slate-500">
                          {formatDetailName(
                            key
                          )}
                        </p>

                        <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-5 text-slate-700">
                          {formatValue(
                            value
                          )}
                        </pre>

                      </div>
                    )
                  )}

                </div>

              </details>

            </div>
          )}

        </div>

      </details>

    </div>
  );
}