import { describe, expect, it } from "vitest";

import { createEmptyApplication, upsertApplication } from "../app/applications";
import { browserApplicationRepository } from "./applicationRepository";

describe("browserApplicationRepository", () => {
  it("returns seeded applications when storage is empty", () => {
    const applications = browserApplicationRepository.load();

    expect(applications.length).toBeGreaterThan(0);
    expect(applications.some((application) => application.name === "SandboxV0.0")).toBe(true);
  });

  it("round-trips saved applications through local storage", () => {
    const created = createEmptyApplication("sandbox-copy");
    const saved = upsertApplication(browserApplicationRepository.load(), {
      ...created,
      name: "Sandbox Copy",
      screenIds: ["sandbox_control", "sandbox_teleop_config"],
      homeScreenId: "sandbox_control",
    });

    browserApplicationRepository.save(saved);
    const reloaded = browserApplicationRepository.load();
    const restored = reloaded.find((application) => application.id === created.id);

    expect(restored).toMatchObject({
      id: created.id,
      name: "Sandbox Copy",
      screenIds: ["sandbox_control", "sandbox_teleop_config"],
      homeScreenId: "sandbox_control",
    });
  });
});
