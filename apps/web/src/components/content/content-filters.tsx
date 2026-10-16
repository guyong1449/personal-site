"use client";

import {
  contentFilterKeys,
  countFilterValues,
  defaultTopics,
  defaultTags,
  filterValueLabel,
  selectedFilterValues,
  sortFilterOptions,
  toggleFilterValue,
  type ContentFilterKey,
  type FilterableContent,
  type FilterOption,
} from "@/lib/content-filters";

export function ContentFilters({ items, params, onChange, galleryFilters = false }: {
  items: FilterableContent[];
  params: URLSearchParams;
  onChange: (change: (params: URLSearchParams) => URLSearchParams | void) => void;
  galleryFilters?: boolean;
}) {
  const topicCounts = countFilterValues(items.map((item) => item.topics ?? []));
  const topicNames = [...new Set([...defaultTopics, ...topicCounts.map(({ value }) => value), ...params.getAll("topic")])];
  const topics = topicNames.map((value) => ({ value, count: topicCounts.find((option) => option.value === value)?.count ?? 0 }));
  const tags = countFilterValues(items.map((item) => item.tags));
  for (const value of defaultTags) {
    if (!tags.some((option) => option.value === value)) tags.push({ value, count: 0 });
  }
  // Keep unknown selections visible so even an empty deep link can be cleared.
  for (const value of selectedFilterValues(params, "tag")) {
    if (!tags.some((option) => option.value === value)) tags.push({ value, count: 0 });
  }
  const active = contentFilterKeys.flatMap((key) => selectedFilterValues(params, key).map((value) => ({ key, value })));

  function options(key: ContentFilterKey, values: FilterOption[]) {
    return (key === "tag" ? sortFilterOptions(key, values) : values).map(({ value }) => {
      const checked = selectedFilterValues(params, key).includes(value);
      return (
        <label key={value} className={`content-filter-option${checked ? " is-active" : ""}`}>
          <input type="checkbox" checked={checked} onChange={() => onChange((next) => toggleFilterValue(next, key, value))} />
          <span>{filterValueLabel(key, value)}</span>
        </label>
      );
    });
  }

  return (
    <nav className="content-filters" aria-label="主题与标签筛选">
      <details className="content-filter-panel">
        <summary>主题</summary>
        <div className="content-filter-options">{options("topic", topics)}</div>
      </details>
      {tags.length > 0 && (
        <details className="content-filter-panel">
          <summary>标签</summary>
          <div className="content-filter-options">{options("tag", tags)}</div>
        </details>
      )}
      {galleryFilters && ([
        { key: "category" as const, label: "作品分类", values: countFilterValues(items.map((item) => item.artCategory ? [item.artCategory] : [])) },
        { key: "series" as const, label: "系列", values: countFilterValues(items.map((item) => item.series ? [item.series] : [])) },
      ]).map(({ key, label, values }) => values.length > 0 ? (
        <details key={key} className="content-filter-panel"><summary>{label}</summary><div className="content-filter-options">{options(key, values)}</div></details>
      ) : null)}
      {active.length > 0 && <div className="content-filter-selection" aria-live="polite">
          <>
            {active.map(({ key, value }) => (
              <button key={`${key}-${value}`} type="button" aria-label={`移除${key === "topic" ? "主题" : "标签"} ${filterValueLabel(key, value)}`} onClick={() => onChange((next) => toggleFilterValue(next, key, value))}>
                {key === "topic" ? "主题 · " : ""}{filterValueLabel(key, value)} <span aria-hidden="true">×</span>
              </button>
            ))}
            <button type="button" onClick={() => onChange((next) => { contentFilterKeys.forEach((key) => next.delete(key)); })}>清除筛选</button>
          </>
      </div>}
    </nav>
  );
}
