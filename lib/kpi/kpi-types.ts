
/**
 * AIP V3 — KPI Engine V1
 *
 * Définit les recommandations de KPIs.
 * Aucune valeur de performance n'est calculée
 * ou inventée par ce module.
 */

export type SiteType =
  | "ecommerce"
  | "lead_generation"
  | "content"
  | "corporate"
  | "unknown";

export type KPICategory =
  | "acquisition"
  | "engagement"
  | "conversion"
  | "revenue"
  | "retention"
  | "consent";

export type KPIPriority =
  | "high"
  | "medium"
  | "low";

export type KPITrackingStatus =
  | "requires_validation"
  | "tracking_missing"
  | "partially_observed";

export interface KPIRecommendation {
  id: string;
  name: string;
  description: string;
  category: KPICategory;
  priority: KPIPriority;

  /**
   * Méthode de calcul ou de mesure proposée.
   */
  measurement: string;

  /**
   * Événements GA4 recommandés.
   * Leur présence n'est pas présumée.
   */
  suggestedEvents: string[];

  /**
   * Statut indicatif de l'instrumentation.
   */
  trackingStatus: KPITrackingStatus;
}

export interface KPIAnalysis {
  siteType: SiteType;
  siteTypeConfidence: "low" | "medium" | "high";
  recommendations: KPIRecommendation[];
}
