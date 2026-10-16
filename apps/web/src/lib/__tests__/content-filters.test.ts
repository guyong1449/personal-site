import { describe, expect, it } from "vitest";
import { countFilterValues, matchesContentFilters, selectedFilterValues, sortFilterOptions, toggleFilterValue } from "../content-filters";

describe("independent content filters", () => {
  it("maps old lowercase links to renamed uppercase tags", () => {
    expect(selectedFilterValues(new URLSearchParams("tag=area%2Fdku&tag=topic%2Fduo"), "tag")).toEqual(["DKU", "DUO"]);
    expect(matchesContentFilters({ tags: ["DKU", "DUO"] }, new URLSearchParams("tag=dku&tag=duo"))).toBe(true);
    expect(selectedFilterValues(new URLSearchParams("tag=constructor&tag=__proto__"), "tag")).toEqual(["constructor", "__proto__"]);
  });
  const item = { topics: ["课程", "CS"], tags: ["course/CS308", "topic/algorithm"], artCategory: "sketch", series: "alpha" };

  it("keeps multiple exact tags and query text across toggles", () => {
    const first = toggleFilterValue(new URLSearchParams("q=graph&tag=course%2FCS308"), "tag", "topic/algorithm");
    expect(first.getAll("tag")).toEqual(item.tags);
    expect(first.get("q")).toBe("graph");
    expect(toggleFilterValue(first, "tag", "course/CS308").getAll("tag")).toEqual(["topic/algorithm"]);
    expect(selectedFilterValues(new URLSearchParams("tag=x&tag=x&tag="), "tag")).toEqual(["x"]);
  });

  it("requires all selected tags while matching any selected theme", () => {
    expect(matchesContentFilters(item, new URLSearchParams("topic=生活&topic=CS&tag=course%2FCS308&tag=topic%2Falgorithm"))).toBe(true);
    expect(matchesContentFilters(item, new URLSearchParams("tag=course%2FCS308&tag=missing"))).toBe(false);
    expect(matchesContentFilters(item, new URLSearchParams("topic=生活&tag=course%2FCS308"))).toBe(false);
    expect(matchesContentFilters(item, new URLSearchParams("tag=course"))).toBe(false);
  });

  it("does not infer themes from existing tags", () => {
    expect(matchesContentFilters({ tags: ["course/CS308", "topic/CS"] }, new URLSearchParams("topic=CS"))).toBe(false);
    expect(matchesContentFilters({ tags: [] }, new URLSearchParams())).toBe(true);
    expect(matchesContentFilters({ tags: [], topics: ["CS"] }, new URLSearchParams("topic=CS"))).toBe(true);
  });

  it("intersects gallery dimensions while allowing multiple categories", () => {
    expect(matchesContentFilters(item, new URLSearchParams("category=sketch&category=photo&series=alpha&topic=CS"))).toBe(true);
    expect(matchesContentFilters(item, new URLSearchParams("category=photo&series=alpha"))).toBe(false);
  });

  it("counts documents once per label", () => {
    expect(countFilterValues([["CS", "CS"], ["CS", "生活"]])).toEqual([{ value: "生活", count: 1 }, { value: "CS", count: 2 }]);
  });

  it("sorts by displayed name across namespaces without count priority", () => {
    expect(sortFilterOptions("tag", [
      { value: "area/zebra", count: 20 }, { value: "topic/alpha", count: 1 },
      { value: "CS10", count: 10 }, { value: "CS2", count: 2 },
    ]).map(({ value }) => value)).toEqual(["topic/alpha", "CS2", "CS10", "area/zebra"]);
    expect(countFilterValues([["zebra", "alpha"], ["zebra"]])).toEqual([
      { value: "alpha", count: 1 }, { value: "zebra", count: 2 },
    ]);
  });
});
