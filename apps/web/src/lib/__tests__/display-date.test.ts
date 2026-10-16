import { describe, expect, it } from "vitest";
import { displayMonth } from "../display-date";

describe("displayMonth", () => {
  it("formats stored dates as zero-padded year.month", () => {
    expect(displayMonth("2026-10-16")).toBe("2026.10");
    expect(displayMonth("2026-01-02")).toBe("2026.01");
    expect(displayMonth("2026-10")).toBe("2026.10");
  });
  it("omits incomplete or invalid month values", () => {
    for (const value of [null, undefined, "", "2026-1", "2026-13-01", "2026-00-01"]) expect(displayMonth(value)).toBeNull();
  });
});
