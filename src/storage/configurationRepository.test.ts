import { describe, expect, it } from "vitest";

import { upsertConfiguration } from "../components/widgets";
import { browserConfigurationRepository } from "./configurationRepository";

describe("browserConfigurationRepository", () => {
  it("returns seeded configurations when storage is empty", () => {
    const configurations = browserConfigurationRepository.load();

    expect(configurations.length).toBeGreaterThan(0);
    expect(configurations.some((configuration) => configuration.name === "sandbox_control")).toBe(true);
  });

  it("round-trips saved configurations through local storage", () => {
    const nextConfigurations = upsertConfiguration(
      browserConfigurationRepository.load(),
      "sandbox_control_copy",
      [],
    );

    browserConfigurationRepository.save(nextConfigurations);
    const reloaded = browserConfigurationRepository.load();
    const restored = reloaded.find((configuration) => configuration.name === "sandbox_control_copy");

    expect(restored).toBeTruthy();
    expect(restored?.widgets).toEqual([]);
    expect(restored?.canvas.runtimeMode).toBeDefined();
  });
});
