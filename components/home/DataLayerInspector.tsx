"use client";

import { useLanguage } from "@/lib/i18n/language-context";

import {

  useMemo,

  useState,

} from "react";

type DataLayerVariableValue = {

  path: string;

  values: unknown[];

  occurrences: number;

};

type EventFilter =

  | "all"

  | "business"

  | "technical"

  | "consent";

type DataLayerDetails = {

  entryCount?: number;

  events?: string[];

  allEvents?: string[];

  eventCount?: number;

  businessEvents?: string[];

  businessEventCount?: number;

  internalEvents?: string[];

  internalEventCount?: number;

  variables?: string[];

  variableCount?: number;

  variableValues?: DataLayerVariableValue[];

  variableValueCount?: number;

  rawEntries?: unknown[];

  rawEntryCount?: number;

  consentSignals?: string[];

  consentSignalEvidence?: string[];

};

interface DataLayerInspectorProps {

  details?: Record<string, unknown>;

}

const INITIAL_VARIABLE_LIMIT = 10;

const VARIABLE_INCREMENT = 20;

const INITIAL_EVENT_LIMIT = 12;

const EVENT_INCREMENT = 20;

const INITIAL_RAW_LIMIT = 5;

const RAW_INCREMENT = 10;

function asStringArray(

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

function asNumber(

  value: unknown

): number {

  return typeof value === "number"

    ? value

    : 0;

}

function asUnknownArray(

  value: unknown

): unknown[] {

  return Array.isArray(value)

    ? value

    : [];

}

function asVariableValues(

  value: unknown

): DataLayerVariableValue[] {

  if (!Array.isArray(value)) {

    return [];

  }

  return value.filter(

    (

      item

    ): item is DataLayerVariableValue => {

      if (

        typeof item !== "object" ||

        item === null

      ) {

        return false;

      }

      const candidate =

        item as Partial<DataLayerVariableValue>;

      return (

        typeof candidate.path ===

          "string" &&

        Array.isArray(candidate.values) &&

        typeof candidate.occurrences ===

          "number"

      );

    }

  );

}

function unique(

  values: string[]

): string[] {

  return [...new Set(values)];

}

function isTechnicalArrayPath(

  variable: string

): boolean {

  return /^\d+(?:\.|$|\[)/.test(

    variable

  );

}

function isConsentEvent(

  event: string

): boolean {

  return /consent|gdpr|cookie|optanon|didomi|onetrust|axeptio|tcf/i.test(

    event

  );

}

function formatRawEntry(

  entry: unknown

): string {

  try {

    return JSON.stringify(

      entry,

      null,

      2

    );

  } catch {

    return String(entry);

  }

}

function formatObservedValue(

  value: unknown

): string {

  if (value === null) {

    return "null";

  }

  if (value === undefined) {

    return "undefined";

  }

  if (typeof value === "string") {

    return value === ""

      ? '""'

      : value;

  }

  if (

    typeof value === "number" ||

    typeof value === "boolean"

  ) {

    return String(value);

  }

  try {

    return JSON.stringify(value);

  } catch {

    return String(value);

  }

}

function getEntryEvent(

  entry: unknown

): string | null {

  if (

    typeof entry !== "object" ||

    entry === null ||

    Array.isArray(entry)

  ) {

    return null;

  }

  const candidate =

    entry as Record<string, unknown>;

  return typeof candidate.event ===

    "string"

    ? candidate.event

    : null;

}

export default function DataLayerInspector({

  details,

}: DataLayerInspectorProps) {
  const { language } = useLanguage();
  const fr = language === "fr";

  const [search, setSearch] =

    useState("");

  const [

    visibleVariableCount,

    setVisibleVariableCount,

  ] = useState(

    INITIAL_VARIABLE_LIMIT

  );

  const [

    visibleEventCount,

    setVisibleEventCount,

  ] = useState(

    INITIAL_EVENT_LIMIT

  );

  const [

    visibleRawCount,

    setVisibleRawCount,

  ] = useState(

    INITIAL_RAW_LIMIT

  );

  const [

    eventFilter,

    setEventFilter,

  ] = useState<EventFilter>(

    "all"

  );

  if (!details) {

    return null;

  }

  const typedDetails =

    details as DataLayerDetails;

  const events = unique([

    ...asStringArray(

      typedDetails.allEvents

    ),

    ...asStringArray(

      typedDetails.events

    ),

  ]);

  const businessEvents =

    asStringArray(

      typedDetails.businessEvents

    );

  const technicalEvents =

    asStringArray(

      typedDetails.internalEvents

    );

  const consentEvents =

    events.filter(isConsentEvent);

  const allVariables =

    asStringArray(

      typedDetails.variables

    );

  const variables =

    allVariables.filter(

      (variable) =>

        !isTechnicalArrayPath(

          variable

        )

    );

  const variableValues =

    asVariableValues(

      typedDetails.variableValues

    );

  const rawEntries =

    asUnknownArray(

      typedDetails.rawEntries

    );

  const consentSignals = unique([

    ...asStringArray(

      typedDetails.consentSignals

    ),

    ...asStringArray(

      typedDetails.consentSignalEvidence

    ),

  ]);

  const entryCount =

    asNumber(

      typedDetails.entryCount

    ) || rawEntries.length;

  const eventCount =

    typeof typedDetails.eventCount ===

    "number"

      ? typedDetails.eventCount

      : events.length;

  const variableCount =

    typeof typedDetails.variableCount ===

    "number"

      ? typedDetails.variableCount

      : allVariables.length;

  const usableVariableCount =

    typeof typedDetails

      .variableValueCount === "number"

      ? typedDetails.variableValueCount

      : variableValues.length;

  const filteredEvents =

    useMemo(() => {

      switch (eventFilter) {

        case "business":

          return businessEvents;

        case "technical":

          return technicalEvents;

        case "consent":

          return consentEvents;

        default:

          return events;

      }

    }, [

      eventFilter,

      events,

      businessEvents,

      technicalEvents,

      consentEvents,

    ]);

  const visibleEvents =

    filteredEvents.slice(

      0,

      visibleEventCount

    );

  const normalizedSearch =

    search

      .trim()

      .toLowerCase();

  const filteredVariableValues =

    useMemo(() => {

      if (!normalizedSearch) {

        return variableValues;

      }

      return variableValues.filter(

        (variable) => {

          const valuesText =

            variable.values

              .map(

                formatObservedValue

              )

              .join(" ")

              .toLowerCase();

          return (

            variable.path

              .toLowerCase()

              .includes(

                normalizedSearch

              ) ||

            valuesText.includes(

              normalizedSearch

            )

          );

        }

      );

    }, [

      variableValues,

      normalizedSearch,

    ]);

  const visibleVariableValues =

    filteredVariableValues.slice(

      0,

      visibleVariableCount

    );

  const visibleRawEntries =

    rawEntries.slice(

      0,

      visibleRawCount

    );

  function changeEventFilter(

    filter: EventFilter

  ) {

    setEventFilter(filter);

    setVisibleEventCount(

      INITIAL_EVENT_LIMIT

    );

  }

  function handleSearchChange(

    value: string

  ) {

    setSearch(value);

    setVisibleVariableCount(

      INITIAL_VARIABLE_LIMIT

    );

  }

  const filterButtons: Array<{

    key: EventFilter;

    label: string;

    count: number;

  }> = [

    {

      key: "all",

      label: fr ? "Tous" : "All",

      count: events.length,

    },

    {

      key: "business",

      label: "Business",

      count: businessEvents.length,

    },

    {

      key: "technical",

      label: fr ? "Technique" : "Technical",

      count: technicalEvents.length,

    },

    {

      key: "consent",

      label: fr ? "Consentement" : "Consent",

      count: consentEvents.length,

    },

  ];

  return (

    <div className="mt-5 border-t border-slate-200 pt-5">

      <details className="group overflow-hidden rounded-xl border border-slate-200 bg-white">

        {/* Compact Inspector Header */}

        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 transition hover:bg-slate-50">

          <div className="min-w-0">

            <p className="text-sm font-semibold text-slate-800">

              DataLayer Inspector

            </p>

            <p className="mt-1 text-xs text-slate-500">

              {entryCount} {fr ? "entrées" : "entries"} · {eventCount} {fr ? "événements" : "events"} · {variableCount} variables

            </p>

          </div>

          <div className="flex shrink-0 items-center gap-3">

            <span className="hidden text-xs font-semibold text-sky-700 sm:inline">

              {fr ? "Ouvrir l’inspecteur" : "Open inspector"}

            </span>

            <span className="text-lg text-slate-400 transition-transform group-open:rotate-180">

              ↓

            </span>

          </div>

        </summary>

        <div className="border-t border-slate-200 bg-slate-50/40 px-4 pb-5 pt-5 sm:px-5">

          {/* Inspector Header */}

          <div>

            <p className="text-xs font-semibold uppercase tracking-wider text-sky-600">

              DataLayer Inspector

            </p>

            <p className="mt-1 text-sm text-slate-500">

              {fr ? "Données réellement observées dans window.dataLayer pendant l’audit." : "Data actually observed in window.dataLayer during the audit."}

            </p>

          </div>

      {/* Metrics */}

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">

        <div className="rounded-xl border border-slate-200 bg-white p-4">

          <p className="text-2xl font-bold text-slate-900">

            {entryCount}

          </p>

          <p className="mt-1 text-xs font-medium text-slate-500">

            {fr ? "Entrées" : "Entries"}

          </p>

        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">

          <p className="text-2xl font-bold text-slate-900">

            {eventCount}

          </p>

          <p className="mt-1 text-xs font-medium text-slate-500">

            {fr ? "Événements" : "Events"}

          </p>

        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">

          <p className="text-2xl font-bold text-slate-900">

            {variableCount}

          </p>

          <p className="mt-1 text-xs font-medium text-slate-500">

            Variables

          </p>

        </div>

      </div>

      {/* Events */}

      {events.length > 0 && (

        <div className="mt-7">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">

              {fr ? "Événements observés" : "Observed events"}

            </p>

            <span className="text-xs text-slate-400">

              {filteredEvents.length} {fr ? "événement" : "event"}

              {filteredEvents.length > 1

                ? "s"

                : ""}

            </span>

          </div>

          {/* Event filters */}

          <div className="mt-3 flex flex-wrap gap-2">

            {filterButtons.map(

              (filter) => {

                const active =

                  eventFilter ===

                  filter.key;

                return (

                  <button

                    key={filter.key}

                    type="button"

                    onClick={() =>

                      changeEventFilter(

                        filter.key

                      )

                    }

                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${

                      active

                        ? "border-sky-200 bg-sky-100 text-sky-700"

                        : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"

                    }`}

                  >

                    {filter.label}

                    <span className="ml-1.5 opacity-70">

                      {filter.count}

                    </span>

                  </button>

                );

              }

            )}

          </div>

          {/* Event chips */}

          {visibleEvents.length > 0 ? (

            <div className="mt-3 flex flex-wrap gap-2">

              {visibleEvents.map(

                (event, index) => (

                  <span

                    key={`${event}-${index}`}

                    className="rounded-lg border border-sky-100 bg-sky-50 px-3 py-1.5 font-mono text-xs font-medium text-sky-700"

                  >

                    {event}

                  </span>

                )

              )}

            </div>

          ) : (

            <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3">

              <p className="text-sm text-slate-500">

                {fr ? "Aucun événement dans cette catégorie." : "No events in this category."}

              </p>

            </div>

          )}

          {visibleEventCount <

            filteredEvents.length && (

            <button

              type="button"

              onClick={() =>

                setVisibleEventCount(

                  (current) =>

                    current +

                    EVENT_INCREMENT

                )

              }

              className="mt-3 text-xs font-semibold text-sky-700 hover:text-sky-800"

            >

              {fr ? "Afficher" : "Show"}{" "}

              {Math.min(

                EVENT_INCREMENT,

                filteredEvents.length -

                  visibleEventCount

              )}{" "}

              {fr ? "de plus" : "more"}

            </button>

          )}

        </div>

      )}

      {/* Variables & Values */}

      {variableValues.length > 0 ? (

        <div className="mt-7">

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">

            <div>

              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">

                {fr ? "Variables et valeurs" : "Variables & values"}

              </p>

              <p className="mt-1 text-xs text-slate-400">

                {usableVariableCount} {fr ? "variables exploitables observées" : "usable variables observed"}

              </p>

            </div>

            <span className="text-xs text-slate-400">

              {filteredVariableValues.length} {fr ? "résultat" : "result"}

              {filteredVariableValues.length > 1

                ? "s"

                : ""}

            </span>

          </div>

          {/* Search */}

          <div className="mt-3">

            <input

              type="search"

              value={search}

              onChange={(event) =>

                handleSearchChange(

                  event.target.value

                )

              }

              placeholder={fr ? "Rechercher une variable ou une valeur..." : "Search for a variable or value..."}

              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"

            />

          </div>

          {/* Variable table */}

          <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">

            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_70px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">

              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">

                Variable

              </p>

              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">

                {fr ? "Valeur observée" : "Observed value"}

              </p>

              <p className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500">

                Obs.

              </p>

            </div>

            {visibleVariableValues.length >

            0 ? (

              visibleVariableValues.map(

                (

                  variable,

                  index

                ) => (

                  <div

                    key={variable.path}

                    className={`grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_70px] gap-3 px-4 py-3 ${

                      index !==

                      visibleVariableValues.length -

                        1

                        ? "border-b border-slate-100"

                        : ""

                    }`}

                  >

                    <div className="min-w-0">

                      <p

                        title={

                          variable.path

                        }

                        className="break-words font-mono text-xs font-medium text-slate-700"

                      >

                        {variable.path}

                      </p>

                    </div>

                    <div className="min-w-0">

                      {variable.values.length >

                      0 ? (

                        <div className="space-y-1">

                          {variable.values

                            .slice(0, 3)

                            .map(

                              (

                                value,

                                valueIndex

                              ) => (

                                <p

                                  key={

                                    valueIndex

                                  }

                                  title={formatObservedValue(

                                    value

                                  )}

                                  className="break-words font-mono text-xs text-slate-600"

                                >

                                  {formatObservedValue(

                                    value

                                  )}

                                </p>

                              )

                            )}

                          {variable.values

                            .length >

                            3 && (

                            <p className="text-xs font-medium text-sky-600">

                              +

                              {variable

                                .values

                                .length -

                                3}{" "}

                              {fr ? "autre" : "other"}

                              {fr && variable.values.length - 3 > 1 ? "s" : ""}{" "}

                              {fr ? "valeur" : "value"}

                              {variable

                                .values

                                .length -

                                3 >

                              1

                                ? "s"

                                : ""}

                            </p>

                          )}

                        </div>

                      ) : (

                        <span className="text-xs text-slate-400">

                          —

                        </span>

                      )}

                    </div>

                    <div className="text-right">

                      <span className="inline-flex min-w-8 justify-center rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">

                        {variable.occurrences}

                      </span>

                    </div>

                  </div>

                )

              )

            ) : (

              <div className="px-4 py-8 text-center">

                <p className="text-sm text-slate-500">

                  {fr ? "Aucune variable ne correspond à la recherche." : "No variables match your search."}

                </p>

              </div>

            )}

          </div>

          {/* Show more variables */}

          {visibleVariableCount <

            filteredVariableValues.length && (

            <div className="mt-3 flex justify-center">

              <button

                type="button"

                onClick={() =>

                  setVisibleVariableCount(

                    (current) =>

                      current +

                      VARIABLE_INCREMENT

                  )

                }

                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"

              >

                {fr ? "Afficher" : "Show"}{" "}

                {Math.min(

                  VARIABLE_INCREMENT,

                  filteredVariableValues.length -

                    visibleVariableCount

                )}{" "}

                {fr ? "de plus" : "more"}

              </button>

            </div>

          )}

          {variables.length !==

            allVariables.length && (

            <p className="mt-3 text-xs text-slate-400">

              {fr ? "Les index techniques des commandes DataLayer sont masqués dans cette vue mais restent disponibles dans les données brutes." : "Technical indexes of DataLayer commands are hidden in this view but remain available in the raw data."}

            </p>

          )}

        </div>

      ) : (

        variables.length > 0 && (

          <div className="mt-7">

            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">

              {fr ? "Variables observées" : "Observed variables"}

            </p>

            <div className="mt-3 max-h-72 overflow-auto rounded-xl border border-slate-200 bg-white">

              {variables.map(

                (

                  variable,

                  index

                ) => (

                  <div

                    key={variable}

                    className={`px-4 py-2.5 font-mono text-xs text-slate-700 ${

                      index !==

                      variables.length -

                        1

                        ? "border-b border-slate-100"

                        : ""

                    }`}

                  >

                    {variable}

                  </div>

                )

              )}

            </div>

          </div>

        )

      )}

      {/* Consent */}

      {consentSignals.length > 0 && (

        <div className="mt-7">

          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">

            {fr ? "Signaux de consentement observés" : "Observed consent signals"}

          </p>

          <div className="mt-3 flex flex-wrap gap-2">

            {consentSignals.map(

              (signal, index) => (

                <span

                  key={`${signal}-${index}`}

                  className="rounded-lg border border-violet-100 bg-violet-50 px-3 py-1.5 font-mono text-xs text-violet-700"

                >

                  {signal}

                </span>

              )

            )}

          </div>

        </div>

      )}

      {/* Raw DataLayer */}

      {rawEntries.length > 0 && (

        <div className="mt-7">

          <div className="flex items-center justify-between gap-4">

            <div>

              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">

                Raw DataLayer

              </p>

              <p className="mt-1 text-xs text-slate-400">

                {fr ? "Données brutes capturées pendant l’observation runtime." : "Raw data captured during runtime observation."}

              </p>

            </div>

            <span className="shrink-0 text-xs text-slate-400">

              {rawEntries.length} {fr ? "entrées" : "entries"}

            </span>

          </div>

          <div className="mt-3 space-y-2">

            {visibleRawEntries.map(

              (entry, index) => {

                const eventName =

                  getEntryEvent(

                    entry

                  );

                return (

                  <details

                    key={index}

                    className="group overflow-hidden rounded-xl border border-slate-200 bg-white"

                  >

                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3">

                      <div className="flex min-w-0 items-center gap-3">

                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">

                          {index + 1}

                        </span>

                        <div className="min-w-0">

                          <span className="text-sm font-medium text-slate-700">

                            {fr ? "Entrée" : "Entry"} #{index + 1}

                          </span>

                          {eventName && (

                            <span className="ml-2 rounded-md bg-sky-50 px-2 py-1 font-mono text-xs text-sky-700">

                              {eventName}

                            </span>

                          )}

                        </div>

                      </div>

                      <span className="shrink-0 text-slate-400 transition-transform group-open:rotate-180">

                        ↓

                      </span>

                    </summary>

                    <div className="border-t border-slate-200 bg-slate-950 p-4">

                      <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-6 text-slate-200">

                        {formatRawEntry(

                          entry

                        )}

                      </pre>

                    </div>

                  </details>

                );

              }

            )}

          </div>

          {visibleRawCount <

            rawEntries.length && (

            <div className="mt-3 flex justify-center">

              <button

                type="button"

                onClick={() =>

                  setVisibleRawCount(

                    (current) =>

                      current +

                      RAW_INCREMENT

                  )

                }

                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"

              >

                {fr ? "Afficher" : "Show"}{" "}

                {Math.min(

                  RAW_INCREMENT,

                  rawEntries.length -

                    visibleRawCount

                )}{" "}

                {fr ? (Math.min(RAW_INCREMENT, rawEntries.length - visibleRawCount) > 1 ? "entrées" : "entrée") : (Math.min(RAW_INCREMENT, rawEntries.length - visibleRawCount) > 1 ? "entries" : "entry")}{" "}

                {fr ? "de plus" : "more"}

              </button>

            </div>

          )}

        </div>

      )}

        </div>

      </details>

    </div>

  );

}