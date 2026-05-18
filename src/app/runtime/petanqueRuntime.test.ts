import { describe, expect, it, vi } from "vitest";

import {
  PETANQUE_ALPHA_PRESET_TOPIC,
  PETANQUE_ALPHA_TOPIC,
  PETANQUE_STATE_TOPIC,
  PLAY_PETANQUE_MEASURE_REFRESH_TOPIC,
  PLAY_PETANQUE_MEASURE_STATUS_TOPIC,
  PLAY_PETANQUE_MEASURE_STREAM_WIDGET_ID,
  PLAY_PETANQUE_MEASURE_VECTORS_TOPIC,
} from "../../pages/applicationTopics";
import { MEASURE_DEMO_HISTORY_ENTRY } from "../../apps/petanque/measureRuntime";
import { petanqueRuntimePlugin } from "./petanqueRuntime";
import { sandboxRuntimePlugin } from "./sandboxRuntime";
import { resolveApplicationRuntimePlugins } from "./registry";
import type { ApplicationRuntimeButtonArgs, ApplicationRuntimeMessageArgs } from "./types";

const createRuntimeState = () => ({
  petanqueFlowStage: "teleop" as const,
  measureViewMode: "live" as const,
  measureRequestPending: false,
  measureResultImageDataUrl: null,
  capturedMeasureImageDataUrl: null,
  measureResultHistory: [],
  measureVectorsJson: null,
  measureStatusText: "Live feed active (demo available)",
  measureLastUpdatedAtMs: null,
  maxVelocityWidgetValues: {},
  throwDrawWidgetValues: {},
  throwDrawAlphaValues: {},
  petanqueAlphaUnsafeValidated: false,
});

const createRuntimeActions = () => ({
  setMeasureResultImageDataUrl: vi.fn(),
  setMeasureVectorsJson: vi.fn(),
  setMeasureLastUpdatedAtMs: vi.fn(),
  setMeasureStatusText: vi.fn(),
  setMeasureRequestPending: vi.fn(),
  setMeasureViewMode: vi.fn(),
  setMeasureResultHistory: vi.fn(),
  setCapturedMeasureImageDataUrl: vi.fn(),
  setPetanqueFlowStage: vi.fn(),
  setPetanqueAlpha: vi.fn(),
  setPetanqueAlphaUnsafeValidated: vi.fn(),
  setMaxVelocityWidgetValues: vi.fn(),
  setThrowDrawWidgetValues: vi.fn(),
  setThrowDrawAlphaValues: vi.fn(),
  confirmAction: vi.fn(() => true),
  sendPetanqueStateCommand: vi.fn(),
  markWidgetPulse: vi.fn(),
  sendMessage: vi.fn(),
});

describe("petanqueRuntimePlugin", () => {
  it("matches petanque and sandbox runtimes through the registry", () => {
    const petanquePlugins = resolveApplicationRuntimePlugins({
      application: {
        id: "application-play-petanque",
        name: "PlayPetanque",
        screenIds: ["play_petanque_measures"],
        homeScreenId: "play_petanque_measures",
        updatedAt: new Date().toISOString(),
      },
      activeScreenId: "play_petanque_measures",
    });
    expect(petanquePlugins.map((plugin) => plugin.id)).toContain("petanque");

    const sandboxPlugins = resolveApplicationRuntimePlugins({
      application: {
        id: "application-95a8",
        name: "SandboxV0.0",
        screenIds: ["sandbox_control"],
        homeScreenId: "sandbox_control",
        updatedAt: new Date().toISOString(),
      },
      activeScreenId: "sandbox_control",
    });
    expect(sandboxPlugins.map((plugin) => plugin.id)).toContain("sandbox");
  });

  it("exposes sandbox max-velocity presentation through the runtime re-export", () => {
    const presentation = sandboxRuntimePlugin.getMaxVelocityState?.({
      application: null,
      activeScreenId: "sandbox_control",
      widget: {
        id: "sandbox-max-velocity",
        kind: "max-velocity",
        label: "Max Velocity",
        topic: "/cmd/max_velocity",
        min: 0.1,
        max: 3.0,
        step: 0.1,
        rect: { x: 0, y: 0, w: 10, h: 10 },
      } as never,
      widgets: [],
      state: createRuntimeState(),
      actions: createRuntimeActions(),
    });

    expect(sandboxRuntimePlugin.matches({
      application: null,
      activeScreenId: "sandbox_control",
    })).toBe(true);
    expect(presentation).toMatchObject({
      reverseDirection: false,
      endpointLabels: {
        left: "Precise",
        right: "Fast",
      },
    });
  });

  it("maps measure websocket messages into runtime state actions", () => {
    const actions = createRuntimeActions();
    const args: ApplicationRuntimeMessageArgs = {
      application: null,
      activeScreenId: "play_petanque_measures",
      message: {
        type: "measure_result",
        image_data_url: "data:image/jpeg;base64,opencv",
        vectors_json: '{"distance":12}',
        updated_at_ms: 123,
      },
      widgets: [],
      state: createRuntimeState(),
      actions,
    };

    expect(petanqueRuntimePlugin.handleIncomingMessage?.(args)).toBe(true);
    expect(actions.setMeasureResultImageDataUrl).toHaveBeenCalledWith(
      "data:image/jpeg;base64,opencv"
    );
    expect(actions.setMeasureVectorsJson).toHaveBeenCalledWith('{"distance":12}');
    expect(actions.setMeasureRequestPending).toHaveBeenCalledWith(false);
    expect(actions.setMeasureViewMode).toHaveBeenCalledWith("result");
    expect(actions.setMeasureResultHistory).toHaveBeenCalled();
  });

  it("derives button presentation for petanque state-machine buttons", () => {
    const presentation = petanqueRuntimePlugin.getButtonPresentation?.({
      application: null,
      activeScreenId: "petanque",
      widget: {
        id: "throw",
        kind: "button",
        label: "Throw",
        topic: PETANQUE_STATE_TOPIC,
        payload: "throw",
        x: 0,
        y: 0,
        width: 10,
        height: 10,
      } as never,
      widgets: [],
      state: createRuntimeState(),
      actions: createRuntimeActions(),
    });

    expect(presentation).toMatchObject({
      disabled: true,
      tone: "danger",
    });
  });

  it("derives alpha preset button presentation from petanque flow state", () => {
    const presentation = petanqueRuntimePlugin.getButtonPresentation?.({
      application: null,
      activeScreenId: "petanque",
      widget: {
        id: "pointer",
        kind: "button",
        label: "Pointer",
        topic: PETANQUE_ALPHA_PRESET_TOPIC,
        payload: "pointer",
        x: 0,
        y: 0,
        width: 10,
        height: 10,
      } as never,
      widgets: [],
      state: {
        ...createRuntimeState(),
        petanqueFlowStage: "start_ready",
      },
      actions: createRuntimeActions(),
    });

    expect(presentation).toMatchObject({
      disabled: false,
      tone: "success",
    });
  });

  it("routes state-machine triggers through the generic runtime action API", () => {
    const actions = createRuntimeActions();
    const args: ApplicationRuntimeButtonArgs = {
      application: null,
      activeScreenId: "petanque",
      widget: {
        id: "teleop",
        kind: "button",
        label: "Teleop",
        topic: PETANQUE_STATE_TOPIC,
        payload: "teleop",
        x: 0,
        y: 0,
        width: 10,
        height: 10,
      } as never,
      widgets: [],
      state: createRuntimeState(),
      actions,
    };

    expect(petanqueRuntimePlugin.handleButtonTrigger?.(args)).toBe(true);
    expect(actions.sendMessage).toHaveBeenCalledWith({
      type: "state_cmd",
      command: "teleop",
    });
    expect(actions.setPetanqueFlowStage).toHaveBeenCalledWith("teleop");
    expect(actions.markWidgetPulse).toHaveBeenCalledWith("teleop");
  });

  it("handles measure refresh through the plugin button hook", () => {
    const actions = createRuntimeActions();
    const args: ApplicationRuntimeButtonArgs = {
      application: null,
      activeScreenId: "play_petanque_measures",
      widget: {
        id: "refresh",
        kind: "button",
        label: "Refresh",
        topic: PLAY_PETANQUE_MEASURE_REFRESH_TOPIC,
        payload: "",
        x: 0,
        y: 0,
        width: 10,
        height: 10,
      } as never,
      widgets: [],
      state: createRuntimeState(),
      actions,
    };

    expect(petanqueRuntimePlugin.handleButtonTrigger?.(args)).toBe(true);
    expect(actions.sendMessage).toHaveBeenCalledWith({ type: "measure_refresh" });
    expect(actions.setMeasureViewMode).toHaveBeenCalledWith("result");
    expect(actions.markWidgetPulse).toHaveBeenCalledWith("refresh");
  });

  it("routes alpha preset buttons through the petanque runtime plugin", () => {
    const actions = createRuntimeActions();
    const args: ApplicationRuntimeButtonArgs = {
      application: null,
      activeScreenId: "petanque",
      widget: {
        id: "tirer",
        kind: "button",
        label: "Tirer",
        topic: PETANQUE_ALPHA_PRESET_TOPIC,
        payload: "tirer",
        x: 0,
        y: 0,
        width: 10,
        height: 10,
      } as never,
      widgets: [],
      state: {
        ...createRuntimeState(),
        petanqueFlowStage: "start_ready",
      },
      actions,
    };

    expect(petanqueRuntimePlugin.handleButtonTrigger?.(args)).toBe(true);
    expect(actions.setPetanqueAlpha).toHaveBeenCalledWith(0);
    expect(actions.sendMessage).toHaveBeenCalledWith({
      type: "state_cmd",
      command: "throw",
    });
    expect(actions.markWidgetPulse).toHaveBeenCalledWith("tirer");
  });

  it("exposes petanque max-velocity runtime state from the plugin", () => {
    const runtimeState = petanqueRuntimePlugin.getMaxVelocityState?.({
      application: null,
      activeScreenId: "play_petanque_lancer",
      widget: {
        id: "play-lancer-alpha",
        kind: "max-velocity",
        label: "Alpha",
        topic: PETANQUE_ALPHA_TOPIC,
        min: 0,
        max: 40,
        step: 1,
        rect: { x: 0, y: 0, w: 10, h: 10 },
      } as never,
      widgets: [],
      state: {
        ...createRuntimeState(),
        maxVelocityWidgetValues: {
          "play-lancer-alpha": 12,
        },
      },
      actions: createRuntimeActions(),
    });

    expect(runtimeState).toMatchObject({
      value: 12,
      reverseDirection: false,
      unsafeThreshold: 20,
      endpointLabels: {
        left: "Tirer",
        right: "Pointer",
      },
    });
  });

  it("decorates measure status widgets from runtime state", () => {
    const decorated = petanqueRuntimePlugin.decorateWidget?.({
      application: null,
      activeScreenId: "play_petanque_measures",
      widget: {
        id: "status",
        kind: "text",
        label: "Status",
        topic: PLAY_PETANQUE_MEASURE_STATUS_TOPIC,
        text: "placeholder",
        fontSize: 12,
        align: "left",
        rect: { x: 0, y: 0, w: 10, h: 10 },
      } as never,
      widgets: [],
      state: {
        ...createRuntimeState(),
        measureStatusText: "Measure result updated",
        measureLastUpdatedAtMs: 123,
        measureVectorsJson: null,
      },
    });

    expect(decorated).toMatchObject({
      kind: "text",
    });
    expect((decorated as { text: string }).text).toContain("Measure result updated");
  });

  it("decorates measure textarea and result stream widgets", () => {
    const baseState = {
      ...createRuntimeState(),
      measureVectorsJson: '{"distance": 12}',
      measureViewMode: "result" as const,
      measureResultImageDataUrl: MEASURE_DEMO_HISTORY_ENTRY.imageDataUrl,
    };

    const textarea = petanqueRuntimePlugin.decorateWidget?.({
      application: null,
      activeScreenId: "play_petanque_measures",
      widget: {
        id: "vectors",
        kind: "textarea",
        label: "Vectors",
        topic: PLAY_PETANQUE_MEASURE_VECTORS_TOPIC,
        text: "",
        fontSize: 12,
        rect: { x: 0, y: 0, w: 10, h: 10 },
      } as never,
      widgets: [],
      state: baseState,
    });
    expect((textarea as { text: string }).text).toContain('"distance": 12');

    const stream = petanqueRuntimePlugin.decorateWidget?.({
      application: null,
      activeScreenId: "play_petanque_measures",
      widget: {
        id: PLAY_PETANQUE_MEASURE_STREAM_WIDGET_ID,
        kind: "stream-display",
        label: "Measure stream",
        topic: "/measure/stream",
        source: "camera",
        streamUrl: "",
        fitMode: "contain",
        showStatus: true,
        showUrl: true,
        overlayText: "",
        rect: { x: 0, y: 0, w: 10, h: 10 },
      } as never,
      widgets: [],
      state: baseState,
    });
    expect(stream).toMatchObject({
      kind: "stream-display",
      source: "visualization",
      overlayText: "demo measure",
    });
  });
});
