/**
 * helpers.ts
 * Shared utility functions used across the app.
 */

/**
 * Format a number in Indian numbering system (lakhs/crores).
 * e.g. 1500000 → "15,00,000"
 */
export function formatINR(value: number, fallback = "0"): string {
  if (!value && value !== 0) return fallback;
  const rounded = Math.round(value);
  if (rounded === 0) return fallback;
  const str = rounded.toString();
  const len = str.length;
  if (len <= 3) return str;
  let result = str.slice(-3);
  let remaining = str.slice(0, len - 3);
  while (remaining.length > 2) {
    result = remaining.slice(-2) + "," + result;
    remaining = remaining.slice(0, remaining.length - 2);
  }
  return remaining + "," + result;
}

/**
 * Format a number as a compact label: ₹12.5L, ₹2.3Cr, ₹50K
 */
export function formatINRCompact(value: number): string {
  if (!value) return "₹0";
  if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(1)}Cr`;
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(1)}L`;
  if (value >= 1_000) return `₹${(value / 1_000).toFixed(0)}K`;
  return `₹${Math.round(value)}`;
}

/**
 * Format a percentage with given decimal places.
 * e.g. 0.65 → "65%"
 */
export function formatPercent(value: number, decimals = 0): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Validate a 10-digit Indian mobile number.
 */
export function isValidMobile(mobile: string): boolean {
  return /^[6-9]\d{9}$/.test(mobile.replace(/\s/g, ""));
}

/**
 * Validate an Indian name (2+ characters, letters and spaces).
 */
export function isValidName(name: string): boolean {
  return /^[a-zA-Z\s]{2,}$/.test(name.trim());
}

/**
 * Convert months to a human-readable tenure label.
 * e.g. 60 → "5 years", 18 → "1 year 6 months"
 */
export function formatTenure(months: number): string {
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years === 0) return `${rem} month${rem !== 1 ? "s" : ""}`;
  if (rem === 0) return `${years} year${years !== 1 ? "s" : ""}`;
  return `${years} yr ${rem} mo`;
}

/**
 * Derive a color for a risk category.
 */
export function riskColor(
  risk: "low" | "medium" | "high"
): { bg: string; text: string } {
  switch (risk) {
    case "low":
      return { bg: "#dcfce7", text: "#15803d" };
    case "medium":
      return { bg: "#fef9c3", text: "#854d0e" };
    case "high":
      return { bg: "#fee2e2", text: "#991b1b" };
  }
}
