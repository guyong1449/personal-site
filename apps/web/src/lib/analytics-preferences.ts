export const ANALYTICS_EXCLUDE_COOKIE = "guyong-analytics-exclude";

export function excludesAnalytics(cookieHeader: string): boolean {
  return cookieHeader.split(";").some((part) => part.trim() === `${ANALYTICS_EXCLUDE_COOKIE}=1`);
}
