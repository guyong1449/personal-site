import { expect, it } from "vitest";
import { findOutboundLink } from "../outbound-links";
import { excludesAnalytics } from "../analytics-preferences";

it("recognizes known destinations with fragments without accepting a lookalike host", () => {
  expect(findOutboundLink("https://github.com/guyong1449/DKUCC-skill/?tab=readme#usage")?.id).toBe("dkucc-skill");
  expect(findOutboundLink("https://guyong1449.github.io/#publications")?.id).toBe("research");
  expect(findOutboundLink("mailto:rw335@duke.edu")?.id).toBe("email");
  expect(findOutboundLink("https://github.com.evil.example/guyong1449")).toBeUndefined();
  expect(findOutboundLink("/notes/dkucc-guide")).toBeUndefined();
});
it("only excludes the exact owner preference cookie", () => {
  expect(excludesAnalytics("other=1; guyong-analytics-exclude=1; test=2")).toBe(true);
  expect(excludesAnalytics("guyong-analytics-exclude=10")).toBe(false);
  expect(excludesAnalytics("fake-guyong-analytics-exclude=1")).toBe(false);
});
