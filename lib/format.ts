/** "Charlotte Cozens" becomes "CC". Any run of whitespace separates the words. */
export function initials(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .join("");
}

const LONG_DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** "2026-10-22" becomes "22 October 2026". */
export function longDate(isoDate: string): string {
  return LONG_DATE.format(new Date(`${isoDate}T00:00:00Z`));
}
