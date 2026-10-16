import { displayMonth } from "@/lib/display-date";

export function PublicationMonth({ created, className = "index-entry__date" }: {
  created: string | null; className?: string;
}) {
  const month = created?.slice(0, 7);
  if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null;
  const label = displayMonth(created);
  return <time className={className} dateTime={month} aria-label={`发布于${label}`}>{label}</time>;
}
