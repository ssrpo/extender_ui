import { describe, expect, it } from "vitest";

import { clampTeleopMaxVelocity, selectNextTabletMode, useTeleopStore } from "./teleopStore";

describe("teleopStore", () => {
  it("starts in B1 to match the snake joystick demo", () => {
    expect(useTeleopStore.getState().mode).toBe(0);
  });

  it("cycles tablet controls through combined modes only", () => {
    expect(selectNextTabletMode(0)).toBe(3);
    expect(selectNextTabletMode(3)).toBe(0);
    expect(selectNextTabletMode(4)).toBe(3);
  });

  it("recovers legacy rotation-only and translation-only modes to BOTH", () => {
    expect(selectNextTabletMode(1)).toBe(3);
    expect(selectNextTabletMode(2)).toBe(3);
  });

  it("keeps generic teleop max velocity normalized", () => {
    expect(clampTeleopMaxVelocity(-0.5)).toBe(0);
    expect(clampTeleopMaxVelocity(0.42)).toBe(0.42);
    expect(clampTeleopMaxVelocity(3)).toBe(1);

    useTeleopStore.getState().setMaxVelocity(3);
    expect(useTeleopStore.getState().maxVelocity).toBe(1);
  });
});
