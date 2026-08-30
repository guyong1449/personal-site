import { describe, expect, it } from "vitest";
import { serializeStructuredData } from "../structured-data";

describe("serializeStructuredData", () => {
  it("prevents user text from closing the JSON-LD script element", () => {
    const result = serializeStructuredData({ title: "</script><script>alert(1)</script>" });
    expect(result).not.toContain("</script>");
    expect(JSON.parse(result).title).toBe("</script><script>alert(1)</script>");
  });
});
