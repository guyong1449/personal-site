import { expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

it("marks the browser across apex/www before redirecting to the requested page", () => {
  const response = GET(new NextRequest("https://guyong.site/analytics/exclude?returnTo=/account"));
  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toBe("https://guyong.site/account");
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(response.headers.get("set-cookie")).toContain("guyong-analytics-exclude=1");
  expect(response.headers.get("set-cookie")).toContain("Domain=guyong.site");
  expect(response.headers.get("set-cookie")).toContain("Secure");
});
it("refuses external redirect targets and can clear the opt-out", () => {
  for (const path of ["//evil.example", "/\\evil.example", "/?token=private"]) {
    const response = GET(new NextRequest(`https://guyong.site/analytics/exclude?returnTo=${encodeURIComponent(path)}`));
    expect(response.headers.get("location")).toBe("https://guyong.site/");
  }
  const response = GET(new NextRequest("https://guyong.site/analytics/exclude?enabled=0"));
  expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
});
