import { describe, expect, it } from "vitest";

import { sandboxRuntimePlugin } from "./runtime";
import { isSandboxScreenId } from "./topics";

describe("sandboxRuntimePlugin", () => {
  it("tracks sandbox screen ids through shared topic constants", () => {
    expect(isSandboxScreenId("sandbox_control")).toBe(true);
    expect(isSandboxScreenId("sandbox_teleop_config")).toBe(true);
    expect(isSandboxScreenId("play_petanque_measures")).toBe(false);
  });

  it("decorates the sandbox max-velocity widget with sandbox defaults", () => {
    const runtimeState = sandboxRuntimePlugin.getMaxVelocityState?.({
      application: {
        id: "application-95a8",
        name: "SandboxV0.0",
        screenIds: ["sandbox_control"],
        homeScreenId: "sandbox_control",
        updatedAt: new Date().toISOString(),
      },
      activeScreenId: "sandbox_control",
      widget: {
        id: "sandbox-max-velocity",
        kind: "max-velocity",
        label: "Max Velocity",
        topic: "/cmd/max_velocity",
        min: 0,
        max: 1,
        step: 0.01,
        rect: { x: 0, y: 0, w: 10, h: 10 },
      } as never,
      widgets: [],
      state: {
        petanqueFlowStage: "teleop",
        measureViewMode: "live",
        measureRequestPending: false,
        measureResultImageDataUrl: null,
        capturedMeasureImageDataUrl: null,
        measureResultHistory: [],
        measureVectorsJson: null,
        measureStatusText: "",
        measureLastUpdatedAtMs: null,
        maxVelocityWidgetValues: {},
        throwDrawWidgetValues: {},
        throwDrawAlphaValues: {},
        petanqueAlphaUnsafeValidated: false,
      },
      actions: {
        setMeasureResultImageDataUrl: () => {},
        setMeasureVectorsJson: () => {},
        setMeasureLastUpdatedAtMs: () => {},
        setMeasureStatusText: () => {},
        setMeasureRequestPending: () => {},
        setMeasureViewMode: () => {},
        setMeasureResultHistory: () => {},
        setCapturedMeasureImageDataUrl: () => {},
        setPetanqueFlowStage: () => {},
        setPetanqueAlpha: () => {},
        setPetanqueAlphaUnsafeValidated: () => {},
        setMaxVelocityWidgetValues: () => {},
        setThrowDrawWidgetValues: () => {},
        setThrowDrawAlphaValues: () => {},
        confirmAction: () => true,
        sendPetanqueStateCommand: () => {},
        markWidgetPulse: () => {},
        sendMessage: () => {},
      },
    });

    expect(runtimeState).toMatchObject({
      reverseDirection: false,
      endpointLabels: {
        left: "Precise",
        right: "Fast",
      },
    });
  });
});
