import { afterEach, expect, it, vi } from "vitest";
import { studioParentOrigin } from "../studio-parent";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

it("accepts the origin-only referrer sent by a local cross-origin Studio iframe", () => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubGlobal("window", { parent: {}, location: { origin: "http://127.0.0.1:4317" } });
  vi.stubGlobal("document", { referrer: "http://127.0.0.1:4319/" });
  expect(studioParentOrigin()).toBe("http://127.0.0.1:4319");
  vi.stubGlobal("document", { referrer: "https://foreign.example/studio" });
  expect(studioParentOrigin()).toBeNull();
  vi.stubGlobal("document", { referrer: "http://127.0.0.1:4319/" });
  vi.stubEnv("NODE_ENV", "production");
  expect(studioParentOrigin()).toBeNull();
});
