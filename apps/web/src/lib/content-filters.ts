import taxonomy from "../../../../content/site/taxonomy.json";

export type ContentFilterKey = "topic" | "tag" | "category" | "series";
export type FilterableContent = {
  tags: string[];
  topics?: string[];
  artCategory?: string | null;
  series?: string | null;
};
export type FilterOption = { value: string; count: number };

export const defaultTopics = taxonomy.topics;
export const defaultTags = taxonomy.tags;
export const contentFilterKeys: ContentFilterKey[] = ["topic", "tag", "category", "series"];
const renamedTags = new Map(Object.entries({ "area/dku": "DKU", "area/dkucc": "DKUCC", "topic/duo": "DUO", dku: "DKU", dkucc: "DKUCC", duo: "DUO" }));

export function selectedFilterValues(params: URLSearchParams, key: ContentFilterKey): string[] {
  return [...new Set(params.getAll(key).filter(Boolean).map((value) => key === "tag" ? renamedTags.get(value) ?? value : value))];
}

export function toggleFilterValue(params: URLSearchParams, key: ContentFilterKey, value: string) {
  const next = new URLSearchParams(params);
  const selected = selectedFilterValues(params, key);
  next.delete(key);
  const values = selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value];
  values.forEach((item) => next.append(key, item));
  return next;
}

export function countFilterValues(values: string[][]): FilterOption[] {
  const counts = new Map<string, number>();
  for (const row of values) {
    for (const value of new Set(row)) {
      if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  return [...counts].map(([value, count]) => ({ value, count }))
    .sort((left, right) => left.value.localeCompare(right.value, "zh-CN", { numeric: true, sensitivity: "base" }));
}

export function sortFilterOptions(key: ContentFilterKey, options: FilterOption[]) {
  return [...options].sort((left, right) =>
    filterValueLabel(key, left.value).localeCompare(filterValueLabel(key, right.value), "zh-CN", { numeric: true, sensitivity: "base" })
      || left.value.localeCompare(right.value, "zh-CN"));
}

// Themes are independent of tags. Multiple themes form a union; selected tags
// must all occur on the document. Other dimensions intersect with both.
export function matchesContentFilters(item: FilterableContent, params: URLSearchParams) {
  const topics = selectedFilterValues(params, "topic");
  const tags = selectedFilterValues(params, "tag");
  const categories = selectedFilterValues(params, "category");
  const series = selectedFilterValues(params, "series");
  return (topics.length === 0 || topics.some((value) => item.topics?.includes(value)))
    && tags.every((value) => item.tags.includes(value))
    && (categories.length === 0 || categories.includes(item.artCategory ?? ""))
    && (series.length === 0 || series.includes(item.series ?? ""));
}

export function filterValueLabel(key: ContentFilterKey, value: string) {
  return key === "tag" ? renamedTags.get(value) ?? value.replace(/^(area|topic|type|course)\//, "") : value;
}
