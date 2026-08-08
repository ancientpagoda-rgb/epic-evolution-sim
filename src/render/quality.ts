export type QualityTier = 'ultra' | 'adaptive' | 'native' | 'performance';

export interface QualityProfile {
  label: string;
  targetPixels: number;
  maxPixelRatio: number;
}

export const QUALITY_PROFILES: Record<QualityTier, QualityProfile> = {
  ultra: { label: 'Ultra 4K', targetPixels: 3840 * 2160, maxPixelRatio: 4 },
  adaptive: { label: 'Adaptive HD', targetPixels: 2560 * 1440, maxPixelRatio: 2.5 },
  native: { label: 'Native display', targetPixels: Number.POSITIVE_INFINITY, maxPixelRatio: 3 },
  performance: { label: 'Performance', targetPixels: 1600 * 900, maxPixelRatio: 1.5 },
};

export function pixelRatioForViewport(
  widthCss: number,
  heightCss: number,
  tier: QualityTier,
  devicePixelRatio = window.devicePixelRatio || 1,
): number {
  const profile = QUALITY_PROFILES[tier];
  const nativeRatio = Math.min(devicePixelRatio, profile.maxPixelRatio);
  if (!Number.isFinite(profile.targetPixels)) return nativeRatio;
  const pixelsAtOne = Math.max(1, widthCss * heightCss);
  const budgetRatio = Math.sqrt(profile.targetPixels / pixelsAtOne);
  return Math.max(0.5, Math.min(nativeRatio, profile.maxPixelRatio, budgetRatio));
}
