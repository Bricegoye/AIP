
"use client";

import type {
  KPIAnalysis,
  KPIRecommendation,
} from "@/lib/kpi/kpi-types";

import { useLanguage } from "@/lib/i18n/language-context";

interface KPIRecommendationsProps {
  kpis: KPIAnalysis;
}

type KPIText = Pick<
  KPIRecommendation,
  "name" | "description" | "measurement"
>;

const KPI_TRANSLATIONS: Record<
  string,
  { fr: KPIText; en: KPIText }
> = {
  sessions: {
    fr: {
      name: "Sessions",
      description: "Mesurer le volume des visites sur le site.",
      measurement: "Nombre total de sessions sur une période.",
    },
    en: {
      name: "Sessions",
      description: "Measure the volume of visits to the website.",
      measurement: "Total number of sessions over a given period.",
    },
  },

  "engagement-rate": {
    fr: {
      name: "Taux d'engagement",
      description: "Mesurer la proportion de sessions engagées.",
      measurement: "Sessions engagées / sessions × 100.",
    },
    en: {
      name: "Engagement rate",
      description: "Measure the proportion of engaged sessions.",
      measurement: "Engaged sessions / sessions × 100.",
    },
  },

  "cta-clicks": {
    fr: {
      name: "Clics sur les CTA",
      description:
        "Mesurer les interactions avec les appels à l'action.",
      measurement: "Nombre de clics sur les CTA principaux.",
    },
    en: {
      name: "CTA clicks",
      description: "Measure interactions with calls to action.",
      measurement: "Number of clicks on primary CTAs.",
    },
  },

  "purchase-conversion": {
    fr: {
      name: "Taux de conversion des achats",
      description:
        "Mesurer la conversion des sessions en achats.",
      measurement: "Sessions avec achat / sessions × 100.",
    },
    en: {
      name: "Purchase conversion rate",
      description:
        "Measure the proportion of sessions resulting in a purchase.",
      measurement: "Sessions with a purchase / sessions × 100.",
    },
  },

  revenue: {
    fr: {
      name: "Chiffre d'affaires",
      description: "Mesurer le chiffre d'affaires généré.",
      measurement: "Somme des montants des transactions.",
    },
    en: {
      name: "Revenue",
      description: "Measure the revenue generated.",
      measurement: "Sum of transaction amounts.",
    },
  },

  "add-to-cart": {
    fr: {
      name: "Taux d'ajout au panier",
      description: "Mesurer l'ajout de produits au panier.",
      measurement:
        "Sessions avec ajout au panier / sessions × 100.",
    },
    en: {
      name: "Add-to-cart rate",
      description: "Measure product additions to the cart.",
      measurement:
        "Sessions with an add-to-cart event / sessions × 100.",
    },
  },

  "lead-conversion": {
    fr: {
      name: "Taux de conversion des prospects",
      description:
        "Mesurer les sessions générant un prospect.",
      measurement: "Sessions avec lead / sessions × 100.",
    },
    en: {
      name: "Lead conversion rate",
      description:
        "Measure the proportion of sessions generating a lead.",
      measurement: "Sessions with a lead / sessions × 100.",
    },
  },

  "form-submissions": {
    fr: {
      name: "Soumissions de formulaires",
      description:
        "Mesurer les formulaires envoyés avec succès.",
      measurement: "Nombre de soumissions réussies.",
    },
    en: {
      name: "Form submissions",
      description: "Measure successfully submitted forms.",
      measurement: "Number of successful form submissions.",
    },
  },

  "content-views": {
    fr: {
      name: "Vues de contenu",
      description: "Mesurer la consommation des contenus.",
      measurement: "Nombre de vues des pages de contenu.",
    },
    en: {
      name: "Content views",
      description: "Measure content consumption.",
      measurement: "Number of content page views.",
    },
  },

  "content-engagement": {
    fr: {
      name: "Engagement sur les contenus",
      description: "Mesurer l'engagement sur les contenus.",
      measurement:
        "Sessions engagées sur les pages de contenu / sessions sur ces pages × 100.",
    },
    en: {
      name: "Content engagement",
      description: "Measure engagement with content.",
      measurement:
        "Engaged sessions on content pages / sessions on those pages × 100.",
    },
  },

  "contact-interactions": {
    fr: {
      name: "Interactions de contact",
      description:
        "Mesurer les interactions vers les points de contact.",
      measurement:
        "Nombre de clics vers les formulaires ou contacts.",
    },
    en: {
      name: "Contact interactions",
      description:
        "Measure interactions with contact options.",
      measurement:
        "Number of clicks leading to forms or contact options.",
    },
  },
};

export default function KPIRecommendations({
  kpis,
}: KPIRecommendationsProps) {
  const { language } = useLanguage();
  const fr = language === "fr";

  const siteLabels: Record<string, string> = {
    ecommerce: "E-commerce",
    lead_generation: fr
      ? "Génération de prospects"
      : "Lead generation",
    content: fr ? "Contenu / média" : "Content / media",
    corporate: fr ? "Site institutionnel" : "Corporate",
    unknown: fr ? "Non déterminé" : "Undetermined",
  };

  const priorityLabels = {
    high: fr ? "Haute" : "High",
    medium: fr ? "Moyenne" : "Medium",
    low: fr ? "Basse" : "Low",
  };

  const statusLabels = {
    requires_validation: fr
      ? "À vérifier"
      : "Requires validation",
    tracking_missing: fr
      ? "Instrumentation non détectée"
      : "Instrumentation not detected",
    partially_observed: fr
      ? "Infrastructure partiellement observée"
      : "Infrastructure partially observed",
  };

  const priorityStyles = {
    high: "bg-rose-50 text-rose-700 border-rose-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    low: "bg-slate-100 text-slate-600 border-slate-200",
  };

  const categoryLabels: Record<string, string> = {
    acquisition: "Acquisition",
    engagement: "Engagement",
    conversion: "Conversion",
    revenue: fr ? "Revenus" : "Revenue",
    retention: fr ? "Rétention" : "Retention",
    consent: fr ? "Consentement" : "Consent",
  };

  return (
    <section className="mt-12 border-t border-slate-200 pt-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-sky-600">
            KPI Engine V1
          </span>

          <h3 className="mt-2 text-lg font-bold text-slate-900">
            {fr ? "KPIs recommandés" : "Recommended KPIs"}
          </h3>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            {fr
              ? "Indicateurs proposés pour orienter le plan de mesure. Les valeurs réelles et la collecte des événements ne sont pas vérifiées."
              : "Suggested indicators to guide the measurement plan. Actual KPI values and event collection have not been verified."}
          </p>
        </div>

        <span className="rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-700">
          {kpis.recommendations.length} KPIs
        </span>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {fr ? "Type de site" : "Site type"} :{" "}
          <strong className="text-slate-900">
            {siteLabels[kpis.siteType] ?? kpis.siteType}
          </strong>
        </span>

        <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {fr ? "Confiance" : "Confidence"} :{" "}
          <strong className="text-slate-900">
            {kpis.siteTypeConfidence === "high"
              ? fr
                ? "Élevée"
                : "High"
              : kpis.siteTypeConfidence === "medium"
                ? fr
                  ? "Moyenne"
                  : "Medium"
                : fr
                  ? "Faible"
                  : "Low"}
          </strong>
        </span>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {kpis.recommendations.map((kpi) => {
          const translated =
            KPI_TRANSLATIONS[kpi.id]?.[language] ?? kpi;

          return (
            <article
              key={kpi.id}
              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-700">
                  {categoryLabels[kpi.category] ?? kpi.category}
                </span>

                <span
                  className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${
                    priorityStyles[kpi.priority]
                  }`}
                >
                  {fr ? "Priorité" : "Priority"} :{" "}
                  {priorityLabels[kpi.priority]}
                </span>
              </div>

              <h4 className="mt-4 font-bold text-slate-900">
                {translated.name}
              </h4>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                {translated.description}
              </p>

              <div className="mt-4 border-t border-slate-200 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {fr ? "Méthode de mesure" : "Measurement method"}
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {translated.measurement}
                </p>
              </div>

              {kpi.suggestedEvents.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {fr
                      ? "Événements GA4 suggérés"
                      : "Suggested GA4 events"}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {kpi.suggestedEvents.map((event) => (
                      <code
                        key={event}
                        className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700"
                      >
                        {event}
                      </code>
                    ))}
                  </div>
                </div>
              )}

              <p className="mt-4 text-xs leading-5 text-slate-500">
                {fr ? "Tracking : " : "Tracking: "}
                {statusLabels[kpi.trackingStatus]}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
