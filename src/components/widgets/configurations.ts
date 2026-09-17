import type { CanvasWidget } from "./widgetTypes";
import {
  DEFAULT_CANVAS_SETTINGS,
  cloneCanvasSettings,
  normalizeCanvasSettings,
  type CanvasSettings,
} from "./canvasSettings";
import { ADMIN_DEMO_SCREEN_IDS } from "../../app/demoDefaults";
import { createWidgetFromCatalogType, type WidgetCatalogType } from "./widgetCatalog";
import { normalizeRosMessageToggleWidget } from "./rosMessageToggle/model";
import { readJsonStorage, writeJsonStorage } from "../../utils/browserStorage";

export type PoseTopicValue =
  | { kind: "scalar"; value: number }
  | { kind: "vector2"; x: number; y: number };

export type PoseSnapshot = {
  name: string;
  savedAt: string;
  topics: Record<string, PoseTopicValue>;
};

export type WidgetConfiguration = {
  name: string;
  widgets: CanvasWidget[];
  poses: PoseSnapshot[];
  canvas: CanvasSettings;
  updatedAt: string;
};

const STORAGE_KEY = "extender.controls.widget-configurations.v1";
const DEMO_UPDATED_AT = "2026-02-24T00:00:00.000Z";
const DEMO_CANVAS_SETTINGS: CanvasSettings = {
  presetId: "hd",
  runtimeMode: "fit",
};

type DemoWidgetPatch = {
  rect?: Partial<CanvasWidget["rect"]>;
  [key: string]: unknown;
};

const createDemoWidget = (
  id: string,
  type: WidgetCatalogType,
  x: number,
  y: number,
  patch: DemoWidgetPatch = {}
): CanvasWidget => {
  const widget = createWidgetFromCatalogType(type, x, y);
  if (!widget) {
    throw new Error(`Unsupported demo widget type: ${type}`);
  }
  return {
    ...widget,
    ...patch,
    id,
    rect: {
      ...widget.rect,
      ...(patch.rect ?? {}),
    },
  } as CanvasWidget;
};

const createDemoConfiguration = (
  name: string,
  widgets: CanvasWidget[],
  canvas: CanvasSettings = DEMO_CANVAS_SETTINGS
): WidgetConfiguration => ({
  name,
  widgets,
  poses: [],
  canvas: cloneCanvasSettings(canvas),
  updatedAt: DEMO_UPDATED_AT,
});

export const DEFAULT_DEMO_CONFIGURATIONS: WidgetConfiguration[] = [
  createDemoConfiguration("default_control", [
    createDemoWidget("ctrl-rz", "slider", 724, 16, {
      binding: "rz",
      label: "rz",
      topic: "/cmd/joystick_rz",
      direction: "horizontal",
      showLabel: false,
      showTopicInfo: false,
      labelAlign: "left",
      rect: { w: 520, h: 92 },
    }),
    createDemoWidget("ctrl-mode", "mode-button", 1048, 16, {
      label: "mode",
      topic: "/cmd/mode",
      rect: { w: 200, h: 62 },
    }),
    createDemoWidget("ctrl-z", "slider", 24, 146, {
      binding: "z",
      label: "z",
      topic: "/cmd/joystick_z",
      direction: "vertical",
      showLabel: true,
      showTopicInfo: false,
      labelAlign: "center",
      rect: { w: 96, h: 500 },
    }),
    createDemoWidget("ctrl-translation", "joystick", 144, 146, {
      binding: "joy",
      label: "",
      topic: "/cmd/joystick_xy",
      showTopicInfo: false,
      color: "#4a9eff",
      rect: { w: 470, h: 470 },
    }),
    createDemoWidget("ctrl-rotation", "joystick", 640, 146, {
      binding: "rot",
      label: "",
      topic: "/cmd/joystick_rxry",
      showTopicInfo: false,
      color: "#f97316",
      rect: { w: 470, h: 470 },
    }),
    createDemoWidget("ctrl-gripper", "gripper-control", 24, 16, {
      label: "Gripper",
      topic: "/cmd/gripper",
      rect: { w: 300, h: 108 },
    }),
    createDemoWidget("ctrl-max-velocity", "max-velocity", 334, 620, {
      label: "velocity",
      topic: "/cmd/max_velocity",
      rect: { w: 914, h: 92 },
    }),
  ]),

  createDemoConfiguration("sandbox_control", [
    createDemoWidget("sandbox-max-velocity", "max-velocity", 279, 95, {
      label: "Max Velocity",
      topic: "/cmd/max_velocity",
      min: 0,
      max: 1,
      step: 0.01,
      rect: { w: 382, h: 159 },
    }),
    createDemoWidget("sandbox-rotation", "joystick", 802, 268, {
      binding: "rot",
      label: "Rotation",
      topic: "/cmd/joystick_rxry",
      showTopicInfo: true,
      color: "#ff4d67",
      deadzone: 0.1,
      diskSize: 80,
      labels: {
        top: "RY+",
        right: "RX+",
        bottom: "RY-",
        left: "RX-",
      },
      rect: { w: 435, h: 441 },
    }),
    createDemoWidget("sandbox-translation", "joystick", 255, 268, {
      binding: "joy",
      label: "Translation",
      topic: "/cmd/joystick",
      showTopicInfo: true,
      color: "#4a9eff",
      deadzone: 0.1,
      diskSize: 80,
      labels: {
        top: "Y+",
        right: "X+",
        bottom: "Y-",
        left: "X-",
      },
      rect: { w: 429, h: 441 },
    }),
    createDemoWidget("sandbox-mode", "mode-button", 20, 109, {
      label: "Mode",
      topic: "/cmd/mode",
      rect: { w: 173, h: 108 },
    }),
    createDemoWidget("sandbox-rz", "slider", 802, 124, {
      binding: "rz",
      label: "RZ",
      topic: "/cmd/joystick_rz",
      direction: "horizontal",
      showLabel: false,
      showTopicInfo: false,
      labelAlign: "center",
      min: -1,
      max: 1,
      step: 0.01,
      rect: { w: 435, h: 130 },
    }),
    createDemoWidget("sandbox-z", "slider", 75, 268, {
      binding: "z",
      label: "Z",
      topic: "/cmd/joystick_z",
      direction: "vertical",
      showLabel: false,
      showTopicInfo: false,
      labelAlign: "center",
      min: -1,
      max: 1,
      step: 0.01,
      rect: { w: 162, h: 422 },
    }),
    createDemoWidget("sandbox-gripper", "gripper-control", 848, 17, {
      label: "Gripper",
      topic: "/cmd/gripper",
      showAdvancedControls: false,
      rect: { w: 188, h: 92 },
    }),
    createDemoWidget("sandbox-toggle-output", "ros-message-toggle", 1048, 17, {
      label: "Digital Output",
      topic: "/sandbox/digital_output",
      messageType: "std_msgs/msg/Float64",
      onPayload: "{data: 1.0}",
      offPayload: "{data: 0.0}",
      rect: { w: 188, h: 92 },
    }),
  ]),

  createDemoConfiguration("control_panel", [
    createDemoWidget("control-panel-title", "text", 20, 20, {
      text: "Control Panel",
      fontSize: 26,
      rect: { w: 300, h: 56 },
    }),
    createDemoWidget("control-panel-camera", "stream-display", 20, 90, {
      label: "Camera",
      topic: "/camera/play_petanque",
      source: "webcam",
      streamUrl: "webcam:///dev/video2",
      fitMode: "cover",
      showStatus: true,
      showUrl: false,
      showWebcamPicker: true,
      overlayText: "webcam feed",
      rect: { w: 560, h: 400 },
    }),
    createDemoWidget("control-panel-gripper", "gripper-control", 20, 510, {
      label: "Gripper",
      topic: "/cmd/gripper",
      showAdvancedControls: true,
      rect: { w: 260, h: 86 },
    }),
    createDemoWidget("control-panel-servo-enable", "ros-message-toggle", 300, 510, {
      label: "Visual Servoing",
      topic: "/ui/visual_servoing/on",
      messageType: "std_msgs/msg/Bool",
      onPayload: "{data: true}",
      offPayload: "{data: false}",
      rect: { w: 280, h: 86 },
    }),
    createDemoWidget("control-panel-servo-save", "button", 20, 629, {
      label: "Save Tag",
      topic: "/ui/visual_servoing/save",
      payload: "save",
      tone: "success",
      rect: { w: 260, h: 58 },
    }),
    createDemoWidget("control-panel-open-monitor", "navigation-button", 300, 629, {
      label: "Monitor",
      topic: "/ui/navigation/visual_servoing_monitor",
      targetScreenId: "visual_servoing_monitor",
      icon: "arrow-right",
      rect: { w: 280, h: 58 },
    }),
    createDemoWidget("control-panel-max-velocity", "max-velocity", 610, 20, {
      label: "Teleop Gain",
      topic: "/cmd/max_velocity",
      min: 0,
      max: 1,
      step: 0.01,
      rect: { w: 640, h: 145 },
    }),
    createDemoWidget("control-panel-z", "slider", 589, 174, {
      binding: "z",
      label: "Z",
      topic: "/cmd/joystick_z",
      direction: "vertical",
      showLabel: true,
      showTopicInfo: false,
      labelAlign: "center",
      min: -1,
      max: 1,
      step: 0.01,
      rect: { w: 162, h: 413 },
    }),
    createDemoWidget("control-panel-translation", "joystick", 765, 185, {
      binding: "joy",
      label: "X Y",
      topic: "/cmd/joystick",
      showTopicInfo: false,
      color: "#4a9eff",
      deadzone: 0.1,
      diskSize: 80,
      labels: {
        top: "Y+",
        right: "X+",
        bottom: "Y-",
        left: "X-",
      },
      rect: { w: 240, h: 240 },
    }),
    createDemoWidget("control-panel-rotation", "joystick", 1015, 185, {
      binding: "rot",
      label: "RX RY",
      topic: "/cmd/joystick_rxry",
      showTopicInfo: false,
      color: "#ff4d67",
      deadzone: 0.1,
      diskSize: 80,
      labels: {
        top: "RY+",
        right: "RX+",
        bottom: "RY-",
        left: "RX-",
      },
      rect: { w: 240, h: 240 },
    }),
    createDemoWidget("control-panel-rz", "slider", 765, 432, {
      binding: "rz",
      label: "RZ",
      topic: "/cmd/joystick_rz",
      direction: "horizontal",
      showLabel: true,
      showTopicInfo: false,
      labelAlign: "center",
      min: -1,
      max: 1,
      step: 0.01,
      rect: { w: 490, h: 157 },
    }),
    createDemoWidget("control-panel-mode", "mode-button", 600, 616, {
      label: "Mode",
      topic: "/cmd/mode",
      rect: { w: 141, h: 71 },
    }),
    createDemoWidget("control-panel-servo-telemetry", "topic-monitor", 763, 606, {
      label: "Servo Telemetry",
      topic: "/ui/visual_servoing/control_panel_topics",
      topics: [
        {
          label: "Tags",
          topic: "/tag_detections",
          messageType: "extender_msgs/msg/SharedControlGoalArray",
        },
        {
          label: "Cmd",
          topic: "/visual_servoing/velocity_command",
          messageType: "geometry_msgs/msg/TwistStamped",
        },
        {
          label: "Err",
          topic: "/visual_servoing/error_TAGtoTAGd",
          messageType: "geometry_msgs/msg/TwistStamped",
        },
      ],
      showSummary: true,
      showDetails: false,
      showRaw: false,
      staleAfterMs: 2000,
      rect: { w: 492, h: 104 },
    }),
  ]),

  createDemoConfiguration("live_teleop", [
    createDemoWidget("live-title", "text", 20, 20, {
      label: "Live Teleop",
      topic: "/ui/title/live_teleop",
      text: "Live Teleoperation Monitor",
      align: "left",
      fontSize: 26,
      rect: { w: 420, h: 56 },
    }),
    createDemoWidget("live-rviz", "stream-display", 20, 90, {
      label: "RViz",
      topic: "/viz/rviz",
      source: "rviz",
      fitMode: "contain",
      showStatus: true,
      showUrl: false,
      overlayText: "rviz overlay",
      rect: { w: 610, h: 410 },
    }),
    createDemoWidget("live-camera", "stream-display", 650, 90, {
      label: "Camera",
      topic: "/camera/front",
      source: "camera",
      fitMode: "cover",
      showStatus: true,
      showUrl: false,
      overlayText: "front camera",
      rect: { w: 610, h: 410 },
    }),
    createDemoWidget("live-curves", "curves", 20, 520, {
      label: "Control Curves",
      topic: "/telemetry/control",
      sampleRateHz: 12,
      historySeconds: 10,
      showLegend: true,
      showSpeed: true,
      rect: { w: 760, h: 240 },
    }),
    createDemoWidget("live-logs", "logs", 800, 520, {
      label: "Runtime Logs",
      topic: "/logs/runtime",
      maxEntries: 120,
      levelFilter: "warn",
      autoScroll: true,
      showTimestamp: true,
      rect: { w: 460, h: 240 },
    }),
  ]),

  createDemoConfiguration("articular", [
    createDemoWidget("art-title", "text", 20, 20, {
      text: "Articular Control",
      align: "left",
      fontSize: 26,
      rect: { w: 360, h: 56 },
    }),
    createDemoWidget("art-notes", "textarea", 20, 90, {
      label: "Roadmap",
      text: "TODO backend integration:\n- joint state subscription\n- per-joint command topics\n- limits/safety checks",
      fontSize: 15,
      rect: { w: 430, h: 220 },
    }),
    createDemoWidget("art-visualization", "stream-display", 470, 90, {
      label: "Articular Visualization",
      source: "visualization",
      fitMode: "contain",
      showStatus: true,
      showUrl: false,
      overlayText: "joint visualization",
      rect: { w: 790, h: 430 },
    }),
    createDemoWidget("art-send-goal", "button", 20, 340, {
      label: "Send Joint Goal",
      topic: "/cmd/joint_goal",
      payload: "execute",
      rect: { w: 200, h: 58 },
    }),
    createDemoWidget("art-stop", "button", 240, 340, {
      label: "Stop Motion",
      topic: "/cmd/joint_stop",
      payload: "stop",
      rect: { w: 180, h: 58 },
    }),
    createDemoWidget("art-speed", "max-velocity", 20, 430, {
      label: "Joint Speed Scale",
      topic: "/cmd/joint_speed_scale",
      rect: { w: 400, h: 100 },
    }),
  ]),

  createDemoConfiguration("camera", [
    createDemoWidget("cam-title", "text", 20, 20, {
      text: "Camera & Vision",
      fontSize: 26,
      rect: { w: 340, h: 56 },
    }),
    createDemoWidget("cam-main", "stream-display", 20, 90, {
      label: "Main Camera",
      topic: "/camera/main",
      source: "camera",
      fitMode: "cover",
      showStatus: true,
      showUrl: false,
      overlayText: "main stream",
      rect: { w: 760, h: 510 },
    }),
    createDemoWidget("cam-aux", "stream-display", 800, 90, {
      label: "Visualization",
      topic: "/camera/overlay",
      source: "visualization",
      fitMode: "contain",
      showStatus: true,
      showUrl: false,
      overlayText: "vision overlay",
      rect: { w: 460, h: 300 },
    }),
    createDemoWidget("cam-settings", "textarea", 800, 410, {
      label: "Camera Settings",
      topic: "/camera/settings",
      text: "TODO backend integration:\n- exposure\n- white balance\n- camera profile",
      fontSize: 14,
      rect: { w: 460, h: 190 },
    }),
    createDemoWidget("cam-snapshot", "button", 20, 620, {
      label: "Snapshot",
      topic: "/camera/action",
      payload: "snapshot",
      rect: { w: 160, h: 56 },
    }),
    createDemoWidget("cam-record", "rosbag-control", 200, 620, {
      label: "Record Camera",
      topic: "/rosbag/camera",
      bagName: "camera_session",
      autoTimestamp: true,
      rect: { w: 320, h: 170 },
    }),
  ]),

  createDemoConfiguration("visual_servoing", [
    createDemoWidget("servo-title", "text", 20, 20, {
      text: "Visual Servoing",
      fontSize: 26,
      rect: { w: 320, h: 56 },
    }),
    createDemoWidget("servo-rviz", "stream-display", 20, 90, {
      label: "AprilTag RViz",
      topic: "/tag_detections",
      source: "rviz",
      fitMode: "contain",
      showStatus: true,
      showUrl: false,
      overlayText: "RViz: camera and tag frames",
      rect: { w: 760, h: 510 },
    }),
    createDemoWidget("servo-camera", "stream-display", 800, 90, {
      label: "Camera Preview",
      topic: "/image_raw",
      source: "webcam",
      streamUrl: "webcam://default",
      fitMode: "cover",
      showStatus: true,
      showUrl: false,
      showWebcamPicker: true,
      overlayText: "webcam preview",
      rect: { w: 460, h: 260 },
    }),
    createDemoWidget("servo-enable", "ros-message-toggle", 800, 370, {
      label: "Visual Servoing",
      topic: "/ui/visual_servoing/on",
      messageType: "std_msgs/msg/Bool",
      onPayload: "{data: true}",
      offPayload: "{data: false}",
      rect: { w: 220, h: 110 },
    }),
    createDemoWidget("servo-save", "button", 1040, 370, {
      label: "Save Tag",
      topic: "/ui/visual_servoing/save",
      payload: "save",
      tone: "success",
      rect: { w: 220, h: 58 },
    }),
    createDemoWidget("servo-open-monitor", "navigation-button", 1040, 445, {
      label: "Monitor",
      topic: "/ui/navigation/visual_servoing_monitor",
      targetScreenId: "visual_servoing_monitor",
      icon: "arrow-right",
      rect: { w: 220, h: 58 },
    }),
  ]),

  createDemoConfiguration("visual_servoing_monitor", [
    createDemoWidget("servo-monitor-title", "text", 20, 20, {
      text: "Visual Servoing Monitor",
      fontSize: 26,
      rect: { w: 420, h: 56 },
    }),
    createDemoWidget("servo-monitor-back", "navigation-button", 1080, 20, {
      label: "Control",
      topic: "/ui/navigation/visual_servoing",
      targetScreenId: "visual_servoing",
      icon: "home",
      rect: { w: 180, h: 58 },
    }),
    createDemoWidget("servo-topic-monitor", "topic-monitor", 20, 100, {
      label: "ROS Topic Monitor",
      topic: "/ui/visual_servoing/topics",
      topics: [
        {
          label: "AprilTag detections",
          topic: "/tag_detections",
          messageType: "extender_msgs/msg/SharedControlGoalArray",
        },
        {
          label: "Velocity command",
          topic: "/visual_servoing/velocity_command",
          messageType: "geometry_msgs/msg/TwistStamped",
        },
        {
          label: "Servo error",
          topic: "/visual_servoing/error_TAGtoTAGd",
          messageType: "geometry_msgs/msg/TwistStamped",
        },
      ],
      showSummary: true,
      showRaw: false,
      staleAfterMs: 2000,
      rect: { w: 1240, h: 600 },
    }),
  ]),

  createDemoConfiguration("logs", [
    createDemoWidget("logs-title", "text", 20, 20, {
      text: "Logs & Rosbags",
      fontSize: 26,
      rect: { w: 320, h: 56 },
    }),
    createDemoWidget("logs-runtime", "logs", 20, 90, {
      label: "Robot Logs",
      topic: "/logs/robot",
      maxEntries: 200,
      levelFilter: "all",
      autoScroll: true,
      showTimestamp: true,
      rect: { w: 860, h: 670 },
    }),
    createDemoWidget("logs-rec", "rosbag-control", 900, 90, {
      label: "Session Recording",
      topic: "/rosbag/control",
      bagName: "session",
      autoTimestamp: true,
      rect: { w: 360, h: 220 },
    }),
    createDemoWidget("logs-note", "textarea", 900, 330, {
      label: "Session Notes",
      topic: "/ui/session_notes",
      text: "Operator notes...",
      fontSize: 14,
      rect: { w: 360, h: 220 },
    }),
    createDemoWidget("logs-mark", "button", 900, 570, {
      label: "Insert Marker",
      topic: "/logs/marker",
      payload: "marker",
      rect: { w: 180, h: 58 },
    }),
  ]),

  createDemoConfiguration("poses", [
    createDemoWidget("poses-title", "text", 20, 20, {
      text: "Poses & Trajectories",
      fontSize: 26,
      rect: { w: 420, h: 56 },
    }),
    createDemoWidget("poses-save", "save-pose-button", 20, 90, {
      label: "Save Current Pose",
      topic: "/ui/save_pose",
      rect: { w: 220, h: 58 },
    }),
    createDemoWidget("poses-load-home", "load-pose-button", 260, 90, {
      label: "Load Home",
      poseName: "home",
      icon: "home",
      topic: "/ui/load_pose",
      rect: { w: 200, h: 58 },
    }),
    createDemoWidget("poses-run", "button", 480, 90, {
      label: "Run Trajectory",
      topic: "/cmd/trajectory",
      payload: "run",
      rect: { w: 200, h: 58 },
    }),
    createDemoWidget("poses-preview", "stream-display", 20, 170, {
      label: "Trajectory Preview",
      topic: "/viz/trajectory",
      source: "visualization",
      fitMode: "contain",
      showStatus: true,
      showUrl: false,
      overlayText: "trajectory view",
      rect: { w: 760, h: 460 },
    }),
    createDemoWidget("poses-list", "textarea", 800, 170, {
      label: "Saved Poses",
      topic: "/ui/poses",
      text: "home\ninspect\npick\nplace",
      fontSize: 14,
      rect: { w: 460, h: 300 },
    }),
    createDemoWidget("poses-nav", "navigation-bar", 800, 490, {
      label: "Quick Pages",
      orientation: "horizontal",
      items: [
        { id: "pose-nav-control", label: "Control", targetScreenId: "default_control" },
        { id: "pose-nav-live", label: "Live", targetScreenId: "live_teleop" },
        { id: "pose-nav-debug", label: "Debug", targetScreenId: "debug" },
      ],
      rect: { w: 460, h: 120 },
    }),
  ]),

  createDemoConfiguration("petanque", [
    createDemoWidget("pet-title", "text", 20, 20, {
      text: "Pétanque Control",
      fontSize: 26,
      rect: { w: 360, h: 56 },
    }),
    createDemoWidget("pet-state-teleop", "button", 20, 90, {
      label: "Teleop",
      topic: "/petanque_state_machine/change_state",
      payload: "teleop",
      tone: "default",
      rect: { w: 170, h: 58 },
    }),
    createDemoWidget("pet-state-activate", "button", 202, 90, {
      label: "Start",
      topic: "/petanque_state_machine/change_state",
      payload: "activate_throw",
      tone: "accent",
      rect: { w: 210, h: 58 },
    }),
    createDemoWidget("pet-state-go-start", "button", 424, 90, {
      label: "Home",
      topic: "/petanque_state_machine/change_state",
      payload: "go_to_start",
      tone: "success",
      rect: { w: 190, h: 58 },
    }),
    createDemoWidget("pet-state-throw", "button", 626, 90, {
      label: "Throw",
      topic: "/petanque_state_machine/change_state",
      payload: "throw",
      tone: "danger",
      rect: { w: 150, h: 58 },
    }),
    createDemoWidget("pet-state-pick-up", "button", 788, 90, {
      label: "Pick Up Ball",
      topic: "/petanque_state_machine/change_state",
      payload: "pick_up",
      tone: "accent",
      rect: { w: 150, h: 58 },
    }),
    createDemoWidget("pet-state-stop", "button", 950, 90, {
      label: "Stop",
      topic: "/petanque_state_machine/change_state",
      payload: "stop",
      tone: "danger",
      rect: { w: 150, h: 58 },
    }),
    createDemoWidget("pet-gripper", "gripper-control", 950, 20, {
      label: "Gripper",
      topic: "/cmd/gripper",
      rect: { w: 146, h: 92 },
    }),
    createDemoWidget("pet-magnet", "magnet-control", 1112, 20, {
      label: "Magnet",
      topic: "/hub/digital_output",
      onPayload: "electromagnet_on",
      offPayload: "electromagnet_off",
      rect: { w: 146, h: 92 },
    }),
    createDemoWidget("pet-speed", "max-velocity", 20, 166, {
      label: "Throw Speed",
      topic: "/petanque_throw/total_duration",
      min: 0.9,
      max: 3.0,
      step: 0.1,
      rect: { w: 500, h: 92 },
    }),
    createDemoWidget("pet-notes", "textarea", 20, 272, {
      label: "Runbook",
      topic: "/petanque/runbook",
      text: "Recommended flow:\n1) Teleop\n2) Start\n3) Throw (or Pick Up Ball)\n\nStart triggers activate_throw and the state machine transitions to go_to_start.\nHome can be used to resend go_to_start if needed.\nStop is only enabled after Start (petanque mode active).\nTeleop returns manual control.\nUse Throw Speed to tune trajectory duration (mapped to /petanque_throw total_duration).",
      fontSize: 14,
      rect: { w: 500, h: 220 },
    }),
    createDemoWidget("pet-rviz", "stream-display", 540, 166, {
      label: "RViz",
      source: "rviz",
      topic: "/petanque/rviz",
      fitMode: "contain",
      showStatus: true,
      showUrl: false,
      overlayText: "petanque trajectory",
      rect: { w: 720, h: 420 },
    }),
  ]),

  createDemoConfiguration("petanque_teleop_config", [
    createDemoWidget("pet-cfg-lin-gain", "max-velocity", 20, 94, {
      label: "Translation Gain",
      topic: "/teleop_config/translation_gain",
      min: 0.1,
      max: 2.0,
      step: 0.01,
      rect: { w: 610, h: 92 },
    }),
    createDemoWidget("pet-cfg-ang-gain", "max-velocity", 650, 94, {
      label: "Rotation Gain",
      topic: "/teleop_config/rotation_gain",
      min: 0.1,
      max: 2.0,
      step: 0.01,
      rect: { w: 610, h: 92 },
    }),
    createDemoWidget("pet-cfg-lin-scale-x", "max-velocity", 20, 200, {
      label: "Linear X",
      topic: "/teleop_config/linear_scale_x",
      min: 0.1,
      max: 2.0,
      step: 0.01,
      rect: { w: 530, h: 92 },
    }),
    createDemoWidget("pet-cfg-ang-scale-x", "max-velocity", 650, 200, {
      label: "Angular X",
      topic: "/teleop_config/angular_scale_x",
      min: 0.1,
      max: 2.0,
      step: 0.01,
      rect: { w: 530, h: 92 },
    }),
    createDemoWidget("pet-cfg-lin-scale-y", "max-velocity", 20, 306, {
      label: "Linear Y",
      topic: "/teleop_config/linear_scale_y",
      min: 0.1,
      max: 2.0,
      step: 0.01,
      rect: { w: 530, h: 92 },
    }),
    createDemoWidget("pet-cfg-ang-scale-y", "max-velocity", 650, 306, {
      label: "Angular Y",
      topic: "/teleop_config/angular_scale_y",
      min: 0.1,
      max: 2.0,
      step: 0.01,
      rect: { w: 530, h: 92 },
    }),
    createDemoWidget("pet-cfg-lin-scale-z", "max-velocity", 20, 412, {
      label: "Linear Z",
      topic: "/teleop_config/linear_scale_z",
      min: 0.1,
      max: 2.0,
      step: 0.01,
      rect: { w: 530, h: 92 },
    }),
    createDemoWidget("pet-cfg-ang-scale-z", "max-velocity", 650, 412, {
      label: "Angular Z",
      topic: "/teleop_config/angular_scale_z",
      min: 0.1,
      max: 2.0,
      step: 0.01,
      rect: { w: 530, h: 92 },
    }),
    createDemoWidget("pet-cfg-swap-xy", "button", 650, 20, {
      label: "Swap XY",
      topic: "/teleop_config/swap_xy",
      payload: "toggle",
      tone: "accent",
      rect: { w: 170, h: 58 },
    }),
    createDemoWidget("pet-cfg-save-explorer", "button", 840, 20, {
      label: "Save Explorer",
      topic: "/teleop_config/save_profile",
      payload: "save",
      tone: "success",
      rect: { w: 190, h: 58 },
    }),
    createDemoWidget("pet-cfg-reset", "button", 1050, 20, {
      label: "Reset",
      topic: "/teleop_config/reset_defaults",
      payload: "reset",
      tone: "accent",
      rect: { w: 170, h: 58 },
    }),
    createDemoWidget("pet-cfg-lin-x", "button", 560, 217, {
      label: "LX +",
      topic: "/teleop_config/invert_linear_x",
      payload: "toggle",
      tone: "success",
      rect: { w: 70, h: 58 },
    }),
    createDemoWidget("pet-cfg-lin-y", "button", 560, 323, {
      label: "LY +",
      topic: "/teleop_config/invert_linear_y",
      payload: "toggle",
      tone: "success",
      rect: { w: 70, h: 58 },
    }),
    createDemoWidget("pet-cfg-lin-z", "button", 560, 429, {
      label: "LZ +",
      topic: "/teleop_config/invert_linear_z",
      payload: "toggle",
      tone: "success",
      rect: { w: 70, h: 58 },
    }),
    createDemoWidget("pet-cfg-ang-x", "button", 1190, 217, {
      label: "AX +",
      topic: "/teleop_config/invert_angular_x",
      payload: "toggle",
      tone: "danger",
      rect: { w: 70, h: 58 },
    }),
    createDemoWidget("pet-cfg-ang-y", "button", 1190, 323, {
      label: "AY +",
      topic: "/teleop_config/invert_angular_y",
      payload: "toggle",
      tone: "danger",
      rect: { w: 70, h: 58 },
    }),
    createDemoWidget("pet-cfg-ang-z", "button", 1190, 429, {
      label: "AZ +",
      topic: "/teleop_config/invert_angular_z",
      payload: "toggle",
      tone: "danger",
      rect: { w: 70, h: 58 },
    }),
  ]),

  createDemoConfiguration("snake_control", [
    createDemoWidget("snake-title", "text", 20, 20, {
      label: "Snake Control",
      topic: "/ui/title/snake_control",
      text: "Snake Control",
      align: "left",
      fontSize: 30,
      rect: { w: 420, h: 58 },
    }),
    createDemoWidget("snake-mode-toggle", "mode-button", 210, 116, {
      label: "B1 / B2",
      topic: "/cmd/mode",
      rect: { w: 210, h: 76 },
    }),
    createDemoWidget("snake-hold", "momentary-ros-message", 860, 116, {
      label: "Hold Snake",
      topic: "/activate_snake",
      messageType: "std_msgs/msg/Bool",
      pressedPayload: "{data: true}",
      releasedPayload: "{data: false}",
      rect: { w: 220, h: 76 },
    }),
    createDemoWidget("snake-joystick", "joystick", 430, 271, {
      binding: "joy",
      label: "Joystick",
      topic: "/cmd/joystick",
      showTopicInfo: false,
      color: "#4a9eff",
      deadzone: 0.1,
      diskSize: 96,
      labels: {
        top: "Haut",
        right: "Droite",
        bottom: "Bas",
        left: "Gauche",
      },
      rect: { w: 420, h: 420 },
    }),
  ]),

  createDemoConfiguration("sandbox_teleop_config", [
    createDemoWidget("sandbox-cfg-lin-gain", "max-velocity", 20, 94, {
      label: "Translation Gain",
      topic: "/teleop_config/translation_gain",
      min: 0.1,
      max: 2.0,
      step: 0.01,
      rect: { w: 530, h: 157 },
    }),
    createDemoWidget("sandbox-cfg-ang-gain", "max-velocity", 650, 94, {
      label: "Rotation Gain",
      topic: "/teleop_config/rotation_gain",
      min: 0.1,
      max: 2.0,
      step: 0.01,
      rect: { w: 610, h: 152 },
    }),
    createDemoWidget("sandbox-cfg-lin-scale-x", "max-velocity", 20, 255, {
      label: "Linear X",
      topic: "/teleop_config/linear_scale_x",
      min: 0.1,
      max: 2.0,
      step: 0.01,
      rect: { w: 530, h: 152 },
    }),
    createDemoWidget("sandbox-cfg-ang-scale-x", "max-velocity", 650, 255, {
      label: "Angular X",
      topic: "/teleop_config/angular_scale_x",
      min: 0.1,
      max: 2.0,
      step: 0.01,
      rect: { w: 529, h: 152 },
    }),
    createDemoWidget("sandbox-cfg-lin-scale-y", "max-velocity", 20, 407, {
      label: "Linear Y",
      topic: "/teleop_config/linear_scale_y",
      min: 0.1,
      max: 2.0,
      step: 0.01,
      rect: { w: 530, h: 152 },
    }),
    createDemoWidget("sandbox-cfg-ang-scale-y", "max-velocity", 650, 417, {
      label: "Angular Y",
      topic: "/teleop_config/angular_scale_y",
      min: 0.1,
      max: 2.0,
      step: 0.01,
      rect: { w: 530, h: 141 },
    }),
    createDemoWidget("sandbox-cfg-lin-scale-z", "max-velocity", 20, 560, {
      label: "Linear Z",
      topic: "/teleop_config/linear_scale_z",
      min: 0.1,
      max: 2.0,
      step: 0.01,
      rect: { w: 530, h: 144 },
    }),
    createDemoWidget("sandbox-cfg-ang-scale-z", "max-velocity", 650, 567, {
      label: "Angular Z",
      topic: "/teleop_config/angular_scale_z",
      min: 0.1,
      max: 2.0,
      step: 0.01,
      rect: { w: 531, h: 145 },
    }),
    createDemoWidget("sandbox-cfg-swap-xy", "button", 650, 20, {
      label: "Swap XY",
      topic: "/teleop_config/swap_xy",
      payload: "toggle",
      tone: "accent",
      rect: { w: 170, h: 58 },
    }),
    createDemoWidget("sandbox-cfg-save-explorer", "button", 840, 20, {
      label: "Save Explorer",
      topic: "/teleop_config/save_profile",
      payload: "save",
      tone: "success",
      rect: { w: 190, h: 58 },
    }),
    createDemoWidget("sandbox-cfg-reset", "button", 1050, 20, {
      label: "Reset",
      topic: "/teleop_config/reset_defaults",
      payload: "reset",
      tone: "accent",
      rect: { w: 170, h: 58 },
    }),
    createDemoWidget("sandbox-cfg-lin-x", "button", 560, 302, {
      label: "Invert Linear X",
      topic: "/teleop_config/invert_linear_x",
      payload: "toggle",
      tone: "success",
      rect: { w: 70, h: 58 },
    }),
    createDemoWidget("sandbox-cfg-lin-y", "button", 560, 459, {
      label: "Invert Linear Y",
      topic: "/teleop_config/invert_linear_y",
      payload: "toggle",
      tone: "success",
      rect: { w: 70, h: 58 },
    }),
    createDemoWidget("sandbox-cfg-lin-z", "button", 560, 603, {
      label: "Invert Linear Z",
      topic: "/teleop_config/invert_linear_z",
      payload: "toggle",
      tone: "success",
      rect: { w: 70, h: 58 },
    }),
    createDemoWidget("sandbox-cfg-ang-x", "button", 1190, 321, {
      label: "Invert Angular X",
      topic: "/teleop_config/invert_angular_x",
      payload: "toggle",
      tone: "danger",
      rect: { w: 70, h: 58 },
    }),
    createDemoWidget("sandbox-cfg-ang-y", "button", 1190, 459, {
      label: "Invert Angular Y",
      topic: "/teleop_config/invert_angular_y",
      payload: "toggle",
      tone: "danger",
      rect: { w: 70, h: 58 },
    }),
    createDemoWidget("sandbox-cfg-ang-z", "button", 1190, 611, {
      label: "Invert Angular Z",
      topic: "/teleop_config/invert_angular_z",
      payload: "toggle",
      tone: "danger",
      rect: { w: 70, h: 58 },
    }),
  ]),

  createDemoConfiguration("play_petanque_camera", [
    createDemoWidget("play-cam-title", "text", 20, 20, {
      text: "PlayPetanque Camera",
      fontSize: 26,
      rect: { w: 420, h: 56 },
    }),
    createDemoWidget("play-cam-feed", "stream-display", 20, 90, {
      label: "Webcam /dev/video2",
      topic: "/camera/play_petanque",
      source: "webcam",
      streamUrl: "webcam:///dev/video2",
      fitMode: "cover",
      showStatus: true,
      showUrl: true,
      overlayText: "webcam feed",
      rect: { w: 1240, h: 620 },
    }),
  ]),

  createDemoConfiguration("play_petanque_lancer", [
    createDemoWidget("play-lancer-title", "text", 20, 20, {
      text: "PlayPetanque LANCER",
      fontSize: 26,
      rect: { w: 420, h: 56 },
    }),
    createDemoWidget("play-lancer-teleop", "button", 20, 90, {
      label: "Teleop",
      topic: "/petanque_state_machine/change_state",
      payload: "teleop",
      tone: "default",
      rect: { w: 150, h: 58 },
    }),
    createDemoWidget("play-lancer-start", "button", 180, 90, {
      label: "Start",
      topic: "/petanque_state_machine/change_state",
      payload: "activate_throw",
      tone: "accent",
      rect: { w: 170, h: 58 },
    }),
    createDemoWidget("play-lancer-home", "button", 360, 90, {
      label: "Home",
      topic: "/petanque_state_machine/change_state",
      payload: "go_to_start",
      tone: "success",
      rect: { w: 150, h: 58 },
    }),
    createDemoWidget("play-lancer-throw", "button", 520, 90, {
      label: "Throw",
      topic: "/petanque_state_machine/change_state",
      payload: "throw",
      tone: "danger",
      rect: { w: 150, h: 58 },
    }),
    createDemoWidget("play-lancer-stop", "button", 680, 90, {
      label: "Stop",
      topic: "/petanque_state_machine/change_state",
      payload: "stop",
      tone: "danger",
      rect: { w: 150, h: 58 },
    }),
    createDemoWidget("play-lancer-test-loop", "button", 840, 90, {
      label: "TEST",
      topic: "/petanque_state_machine/change_state",
      payload: "test_loop",
      tone: "accent",
      rect: { w: 190, h: 58 },
    }),
    createDemoWidget("play-lancer-pointer", "button", 840, 154, {
      label: "Pointer",
      topic: "/petanque_throw/alpha_preset",
      payload: "pointer",
      tone: "success",
      rect: { w: 190, h: 52 },
    }),
    createDemoWidget("play-lancer-tirer", "button", 1040, 154, {
      label: "Tirer",
      topic: "/petanque_throw/alpha_preset",
      payload: "tirer",
      tone: "danger",
      rect: { w: 190, h: 52 },
    }),
    createDemoWidget("play-lancer-drink", "drink", 1063, 18, {
      label: "Drink",
      topic: "/ui/drink",
      videoUrl: "https://www.youtube.com/shorts/JQbLM2BUcLg",
      autoCloseOnEnd: true,
      rect: { w: 197, h: 72 },
    }),
    createDemoWidget("play-lancer-speed", "max-velocity", 20, 170, {
      label: "Throw Speed",
      topic: "/petanque_throw/total_duration",
      min: 0.9,
      max: 3.0,
      step: 0.1,
      reverseDirection: true,
      endpointLeftLabel: "Slow",
      endpointRightLabel: "Fast",
      bubbleMode: "power",
      rect: { w: 500, h: 92 },
    }),
    createDemoWidget("play-lancer-angle", "max-velocity", 540, 170, {
      label: "Throw Angle",
      topic: "/petanque_throw/angle_between_start_and_finish",
      min: -0.26,
      max: 0.26,
      step: 0.005,
      endpointLeftLabel: "Left",
      endpointRightLabel: "Right",
      bubbleMode: "degrees",
      rect: { w: 280, h: 92 },
    }),
    createDemoWidget("play-lancer-alpha", "max-velocity", 830, 214, {
      label: "Alpha",
      topic: "/petanque_throw/alpha",
      min: 0,
      max: 40,
      step: 0.01,
      unsafeThreshold: 20,
      endpointLeftLabel: "Tirer",
      endpointRightLabel: "Pointer",
      bubbleMode: "degrees-unit",
      rect: { w: 400, h: 76 },
    }),
    createDemoWidget("play-lancer-rviz", "stream-display", 20, 302, {
      label: "Throw Visualization",
      topic: "/petanque/rviz",
      source: "rviz",
      fitMode: "contain",
      showStatus: false,
      showUrl: false,
      overlayText: "throw trajectory",
      rect: { w: 1240, h: 404 },
    }),
  ]),

  createDemoConfiguration("play_petanque_lancer_draw", [
    createDemoWidget("play-lancer-teleop", "button", 20, 25, {
      label: "Teleop",
      topic: "/petanque_state_machine/change_state",
      payload: "teleop",
      tone: "default",
      rect: { w: 150, h: 58 },
    }),
    createDemoWidget("play-lancer-start", "button", 180, 25, {
      label: "Start",
      topic: "/petanque_state_machine/change_state",
      payload: "activate_throw",
      tone: "accent",
      rect: { w: 170, h: 58 },
    }),
    createDemoWidget("play-lancer-home", "button", 683, 20, {
      label: "Home",
      topic: "/petanque_state_machine/change_state",
      payload: "go_to_start",
      tone: "success",
      rect: { w: 150, h: 58 },
    }),
    createDemoWidget("play-lancer-throw", "button", 360, 25, {
      label: "Throw",
      topic: "/petanque_state_machine/change_state",
      payload: "throw",
      tone: "danger",
      rect: { w: 150, h: 58 },
    }),
    createDemoWidget("play-lancer-test-loop", "button", 850, 20, {
      label: "TEST",
      topic: "/petanque_state_machine/change_state",
      payload: "test_loop",
      tone: "accent",
      rect: { w: 190, h: 58 },
    }),
    createDemoWidget("play-lancer-pointer", "button", 852, 102, {
      label: "Pointer",
      topic: "/petanque_throw/alpha_preset",
      payload: "pointer",
      tone: "success",
      rect: { w: 190, h: 52 },
    }),
    createDemoWidget("play-lancer-tirer", "button", 1067, 102, {
      label: "Tirer",
      topic: "/petanque_throw/alpha_preset",
      payload: "tirer",
      tone: "danger",
      rect: { w: 190, h: 52 },
    }),
    createDemoWidget("play-lancer-alpha", "max-velocity", 20, 102, {
      label: "Alpha",
      topic: "/petanque_throw/alpha",
      min: 0,
      max: 40,
      step: 0.01,
      unsafeThreshold: 20,
      endpointLeftLabel: "Tirer",
      endpointRightLabel: "Pointer",
      bubbleMode: "degrees-unit",
      rect: { w: 401, h: 157 },
    }),
    createDemoWidget("play-lancer-drink", "drink", 1063, 18, {
      label: "Drink",
      topic: "/ui/drink",
      videoUrl: "https://www.youtube.com/shorts/JQbLM2BUcLg",
      autoCloseOnEnd: true,
      rect: { w: 197, h: 72 },
    }),
    createDemoWidget("play-lancer-draw", "throw-draw", 20, 289, {
      label: "Throw Draw",
      topic: "/petanque_throw/draw",
      angleTopic: "/petanque_throw/angle_between_start_and_finish",
      powerTopic: "/petanque_throw/total_duration",
      angleMin: -0.26,
      angleMax: 0.26,
      durationMin: 0.9,
      durationMax: 3,
      holdToMaxMs: 1400,
      rect: { w: 1159, h: 385 },
    }),
  ]),

  createDemoConfiguration("play_petanque_ramassage", [
    createDemoWidget("play-ram-title", "text", 20, 20, {
      text: "PlayPetanque RAMASSAGE",
      fontSize: 26,
      rect: { w: 500, h: 56 },
    }),
    createDemoWidget("play-ram-teleop", "button", 20, 90, {
      label: "Teleop",
      topic: "/petanque_state_machine/change_state",
      payload: "teleop",
      tone: "default",
      rect: { w: 150, h: 58 },
    }),
    createDemoWidget("play-ram-home", "button", 180, 90, {
      label: "Home",
      topic: "/petanque_state_machine/change_state",
      payload: "go_to_start",
      tone: "success",
      rect: { w: 150, h: 58 },
    }),
    createDemoWidget("play-ram-pick-up", "button", 340, 90, {
      label: "Pick Up Ball",
      topic: "/petanque_state_machine/change_state",
      payload: "pick_up",
      tone: "accent",
      rect: { w: 190, h: 58 },
    }),
    createDemoWidget("play-ram-magnet", "magnet-control", 1030, 90, {
      label: "Magnet",
      topic: "/hub/digital_output",
      onPayload: "electromagnet_on",
      offPayload: "electromagnet_off",
      rect: { w: 220, h: 92 },
    }),
    createDemoWidget("play-ram-camera", "stream-display", 20, 170, {
      label: "Ramassage Camera",
      topic: "/camera/ramassage",
      source: "webcam",
      streamUrl: "webcam:///dev/video2",
      fitMode: "cover",
      showStatus: false,
      showUrl: false,
      overlayText: "",
      showHeader: false,
      showSourceBadge: false,
      showWebcamPicker: false,
      rect: { w: 760, h: 530 },
    }),
    createDemoWidget("play-ram-rz", "slider", 800, 170, {
      binding: "rz",
      label: "RZ",
      topic: "/cmd/joystick_rz",
      direction: "horizontal",
      showLabel: true,
      showTopicInfo: false,
      labelAlign: "center",
      min: -1,
      max: 1,
      step: 0.01,
      rect: { w: 450, h: 80 },
    }),
    createDemoWidget("play-ram-translation", "joystick", 800, 270, {
      binding: "joy",
      label: "Translation",
      topic: "/cmd/joystick",
      showTopicInfo: true,
      color: "#4a9eff",
      deadzone: 0.1,
      diskSize: 80,
      labels: { top: "Y+", right: "X+", bottom: "Y-", left: "X-" },
      rect: { w: 220, h: 220 },
    }),
    createDemoWidget("play-ram-rotation", "joystick", 1030, 270, {
      binding: "rot",
      label: "Rotation",
      topic: "/cmd/joystick_rxry",
      showTopicInfo: true,
      color: "#ff4d67",
      deadzone: 0.1,
      diskSize: 80,
      labels: { top: "RY+", right: "RX+", bottom: "RY-", left: "RX-" },
      rect: { w: 220, h: 220 },
    }),
    createDemoWidget("play-ram-z", "slider", 1160, 500, {
      binding: "z",
      label: "Z",
      topic: "/cmd/joystick_z",
      direction: "vertical",
      showLabel: true,
      showTopicInfo: false,
      labelAlign: "center",
      min: -1,
      max: 1,
      step: 0.01,
      rect: { w: 90, h: 200 },
    }),
  ]),

  createDemoConfiguration("play_petanque_measures", [
    createDemoWidget("play-measure-title", "text", 20, 20, {
      text: "PlayPetanque MEASURES",
      fontSize: 26,
      rect: { w: 460, h: 56 },
    }),
    createDemoWidget("play-measure-capture", "button", 20, 90, {
      label: "Capture Image",
      topic: "/petanque_measure/capture",
      payload: "capture",
      tone: "accent",
      rect: { w: 180, h: 58 },
    }),
    createDemoWidget("play-measure-request", "button", 210, 90, {
      label: "Measure",
      topic: "/petanque_measure/request",
      payload: "measure",
      tone: "success",
      rect: { w: 180, h: 58 },
    }),
    createDemoWidget("play-measure-refresh", "button", 400, 90, {
      label: "Refresh",
      topic: "/petanque_measure/refresh",
      payload: "refresh",
      tone: "default",
      rect: { w: 180, h: 58 },
    }),
    createDemoWidget("play-measure-live", "button", 590, 90, {
      label: "Live Feed",
      topic: "/petanque_measure/view_live",
      payload: "live",
      tone: "default",
      rect: { w: 150, h: 58 },
    }),
    createDemoWidget("play-measure-last", "button", 750, 90, {
      label: "Last Measure",
      topic: "/petanque_measure/view_result",
      payload: "result",
      tone: "default",
      rect: { w: 190, h: 58 },
    }),
    createDemoWidget("play-measure-stream", "stream-display", 20, 170, {
      label: "Measure Camera",
      topic: "/camera/measures",
      source: "webcam",
      streamUrl: "webcam:///dev/video2",
      fitMode: "cover",
      showStatus: false,
      showUrl: false,
      overlayText: "live webcam",
      showHeader: false,
      showSourceBadge: false,
      showWebcamPicker: false,
      rect: { w: 900, h: 500 },
    }),
    createDemoWidget("play-measure-vectors", "textarea", 940, 170, {
      label: "Measure Vectors",
      topic: "/petanque_measure/vectors",
      text: "No vectors yet.",
      fontSize: 15,
      rect: { w: 320, h: 500 },
    }),
    createDemoWidget("play-measure-status", "text", 20, 680, {
      text: "Live feed active",
      topic: "/petanque_measure/status",
      fontSize: 18,
      align: "left",
      rect: { w: 1240, h: 30 },
    }),
  ]),

  createDemoConfiguration("curves", [
    createDemoWidget("curves-title", "text", 20, 20, {
      text: "Curves & Metrics",
      fontSize: 26,
      rect: { w: 340, h: 56 },
    }),
    createDemoWidget("curves-main", "curves", 20, 90, {
      label: "TCP / Joystick Trends",
      topic: "/telemetry/main",
      sampleRateHz: 15,
      historySeconds: 12,
      showLegend: true,
      showSpeed: true,
      rect: { w: 830, h: 320 },
    }),
    createDemoWidget("curves-secondary", "curves", 20, 430, {
      label: "Joint Trends",
      topic: "/telemetry/joints",
      sampleRateHz: 10,
      historySeconds: 15,
      showLegend: true,
      showSpeed: false,
      rect: { w: 830, h: 330 },
    }),
    createDemoWidget("curves-logs", "logs", 870, 90, {
      label: "Curve Events",
      topic: "/telemetry/events",
      maxEntries: 160,
      levelFilter: "info",
      autoScroll: true,
      showTimestamp: true,
      rect: { w: 390, h: 670 },
    }),
  ]),

  createDemoConfiguration("configurations", [
    createDemoWidget("cfg-title", "text", 20, 20, {
      text: "Configuration",
      fontSize: 26,
      rect: { w: 260, h: 56 },
    }),
    createDemoWidget("cfg-theme", "textarea", 20, 90, {
      label: "UI Preferences",
      topic: "/ui/config/theme",
      text: "TODO backend integration:\n- user profile binding\n- role-based page access",
      fontSize: 14,
      rect: { w: 430, h: 220 },
    }),
    createDemoWidget("cfg-axis", "textarea", 20, 330, {
      label: "Axis Mapping",
      topic: "/ui/config/axis",
      text: "invert_x=false\ninvert_y=false\ninvert_z=false",
      fontSize: 14,
      rect: { w: 430, h: 220 },
    }),
    createDemoWidget("cfg-save", "button", 20, 570, {
      label: "Apply Config",
      topic: "/ui/config/apply",
      payload: "apply",
      rect: { w: 200, h: 58 },
    }),
    createDemoWidget("cfg-reset", "button", 240, 570, {
      label: "Reset Defaults",
      topic: "/ui/config/reset",
      payload: "reset",
      rect: { w: 210, h: 58 },
    }),
    createDemoWidget("cfg-nav", "navigation-bar", 470, 90, {
      label: "All Pages",
      orientation: "vertical",
      items: ADMIN_DEMO_SCREEN_IDS.map((screenId) => ({
        id: `cfg-nav-${screenId}`,
        label: screenId,
        targetScreenId: screenId,
      })),
      rect: { w: 220, h: 540 },
    }),
    createDemoWidget("cfg-open-debug", "navigation-button", 710, 90, {
      label: "Open Debug",
      topic: "/ui/navigation",
      icon: "arrow-right",
      targetScreenId: "debug",
      rect: { w: 220, h: 58 },
    }),
  ]),

  createDemoConfiguration("debug", [
    createDemoWidget("dbg-title", "text", 20, 20, {
      text: "Debug Console",
      fontSize: 26,
      rect: { w: 320, h: 56 },
    }),
    createDemoWidget("dbg-stream", "stream-display", 20, 90, {
      label: "Debug Visualization",
      topic: "/debug/rviz",
      source: "rviz",
      fitMode: "contain",
      showStatus: true,
      showUrl: true,
      overlayText: "debug stream",
      rect: { w: 620, h: 360 },
    }),
    createDemoWidget("dbg-logs", "logs", 660, 90, {
      label: "Debug Logs",
      topic: "/debug/logs",
      maxEntries: 200,
      levelFilter: "all",
      autoScroll: true,
      showTimestamp: true,
      rect: { w: 600, h: 360 },
    }),
    createDemoWidget("dbg-raw", "textarea", 20, 470, {
      label: "Raw Topics",
      topic: "/debug/raw",
      text: "TODO backend integration:\n- websocket topic inspector\n- message replay\n- export snapshots",
      fontSize: 14,
      rect: { w: 1240, h: 230 },
    }),
    createDemoWidget("dbg-ping", "button", 20, 720, {
      label: "Ping Backend",
      topic: "/debug/ping",
      payload: "ping",
      rect: { w: 200, h: 58 },
    }),
  ]),
];

const cloneConfiguration = (configuration: WidgetConfiguration): WidgetConfiguration => ({
  name: configuration.name,
  widgets: cloneWidgets(configuration.widgets),
  poses: clonePoses(configuration.poses),
  canvas: cloneCanvasSettings(configuration.canvas),
  updatedAt: configuration.updatedAt,
});

const stableJsonValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stableJsonValue);
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stableJsonValue(value[key])])
    );
  }
  return value;
};

const serializeConfigurationContent = (configuration: WidgetConfiguration): string =>
  JSON.stringify(
    stableJsonValue({
      name: configuration.name,
      widgets: configuration.widgets,
      poses: configuration.poses,
      canvas: configuration.canvas,
    })
  );

const hasSameConfigurationContent = (
  left: WidgetConfiguration,
  right: WidgetConfiguration
): boolean => serializeConfigurationContent(left) === serializeConfigurationContent(right);

const LEGACY_DEMO_UPDATED_AT = "2026-02-17T00:00:00.000Z";

const migrateLegacyDefaultControl = (
  configurations: WidgetConfiguration[]
): WidgetConfiguration[] => {
  const latestDefaultControl = DEFAULT_DEMO_CONFIGURATIONS.find(
    (configuration) => configuration.name === "default_control"
  );
  if (!latestDefaultControl) return configurations;

  return configurations.map((configuration) => {
    if (configuration.name !== "default_control") return configuration;

    const hasLegacySignature =
      configuration.updatedAt === LEGACY_DEMO_UPDATED_AT &&
      configuration.widgets.some((widget) => widget.id === "ctrl-home") &&
      configuration.widgets.some(
        (widget) => widget.id === "ctrl-gripper" && widget.kind === "gripper-control"
      );

    if (!hasLegacySignature) return configuration;

    return {
      ...cloneConfiguration(latestDefaultControl),
      poses: clonePoses(configuration.poses),
    };
  });
};

const migrateLegacyPetanque = (
  configurations: WidgetConfiguration[]
): WidgetConfiguration[] => {
  const latestPetanque = DEFAULT_DEMO_CONFIGURATIONS.find(
    (configuration) => configuration.name === "petanque"
  );
  if (!latestPetanque) return configurations;

  return configurations.map((configuration) => {
    if (configuration.name !== "petanque") return configuration;

    const hasLegacySignature =
      configuration.widgets.some((widget) => widget.id === "pet-detect") ||
      configuration.widgets.some((widget) => widget.id === "pet-plan") ||
      configuration.widgets.some((widget) => widget.id === "pet-execute");

    if (!hasLegacySignature) return configuration;

    return {
      ...cloneConfiguration(latestPetanque),
      poses: clonePoses(configuration.poses),
    };
  });
};

const disablePetanqueViewerWidget = (
  configurations: WidgetConfiguration[]
): WidgetConfiguration[] => {
  const latestPetanque = DEFAULT_DEMO_CONFIGURATIONS.find(
    (configuration) => configuration.name === "petanque"
  );
  if (!latestPetanque) return configurations;

  const rvizTemplate = latestPetanque.widgets.find(
    (widget) => widget.id === "pet-rviz"
  );
  if (!rvizTemplate) return configurations;

  return configurations.map((configuration) => {
    if (configuration.name !== "petanque") return configuration;

    const hasViewerWidget = configuration.widgets.some(
      (widget) => widget.id === "pet-state-machine"
    );
    const hasTargetRvizSize = configuration.widgets.some(
      (widget) =>
        widget.id === rvizTemplate.id &&
        widget.rect.w === rvizTemplate.rect.w &&
        widget.rect.h === rvizTemplate.rect.h
    );

    if (!hasViewerWidget && hasTargetRvizSize) return configuration;

    const nextWidgets = cloneWidgets(configuration.widgets)
      .filter((widget) => widget.id !== "pet-state-machine")
      .map((widget) =>
        widget.id === rvizTemplate.id
          ? {
              ...widget,
              rect: {
                ...widget.rect,
                w: rvizTemplate.rect.w,
                h: rvizTemplate.rect.h,
              },
            }
          : widget
      );

    return {
      ...configuration,
      widgets: nextWidgets,
      updatedAt: new Date().toISOString(),
    };
  });
};

const normalizePetanqueSliderRanges = (
  configurations: WidgetConfiguration[]
): WidgetConfiguration[] => {
  return configurations.map((configuration) => {
    const isPetanqueConfig =
      configuration.name === "petanque" ||
      configuration.name === "play_petanque_lancer" ||
      configuration.name === "play_petanque_lancer_draw";
    if (!isPetanqueConfig) return configuration;

    let changed = false;
    const nextWidgets = configuration.widgets.map((widget) => {
      if (widget.kind !== "max-velocity") return widget;

      if (widget.topic === "/petanque_throw/total_duration") {
        const normalized = {
          ...widget,
          min: 0.9,
          max: 3.0,
          step: 0.1,
        };
        if (
          widget.min !== normalized.min ||
          widget.max !== normalized.max ||
          widget.step !== normalized.step
        ) {
          changed = true;
        }
        return normalized;
      }

      if (widget.topic === "/petanque_throw/angle_between_start_and_finish") {
        const normalized = {
          ...widget,
          min: -0.26,
          max: 0.26,
          step: 0.005,
        };
        if (
          widget.min !== normalized.min ||
          widget.max !== normalized.max ||
          widget.step !== normalized.step
        ) {
          changed = true;
        }
        return normalized;
      }

      if (widget.topic === "/petanque_throw/alpha") {
        const normalized = {
          ...widget,
          min: 0,
          max: 40,
          step: 0.01,
        };
        if (
          widget.min !== normalized.min ||
          widget.max !== normalized.max ||
          widget.step !== normalized.step
        ) {
          changed = true;
        }
        return normalized;
      }

      return widget;
    });

    if (!changed) return configuration;
    return {
      ...configuration,
      widgets: nextWidgets,
      updatedAt: new Date().toISOString(),
    };
  });
};

const normalizePetanqueSliderDisplayOptions = (
  configurations: WidgetConfiguration[]
): WidgetConfiguration[] => {
  return configurations.map((configuration) => {
    const isPetanqueConfig =
      configuration.name === "petanque" ||
      configuration.name === "play_petanque_lancer" ||
      configuration.name === "play_petanque_lancer_draw";
    if (!isPetanqueConfig) return configuration;

    let changed = false;
    const nextWidgets = configuration.widgets.map((widget) => {
      if (widget.kind !== "max-velocity") return widget;

      if (widget.topic === "/petanque_throw/total_duration") {
        const normalized = {
          ...widget,
          reverseDirection: widget.reverseDirection ?? true,
          endpointLeftLabel: widget.endpointLeftLabel ?? "Slow",
          endpointRightLabel: widget.endpointRightLabel ?? "Fast",
          bubbleMode: widget.bubbleMode ?? "power",
        };
        if (
          widget.reverseDirection !== normalized.reverseDirection ||
          widget.endpointLeftLabel !== normalized.endpointLeftLabel ||
          widget.endpointRightLabel !== normalized.endpointRightLabel ||
          widget.bubbleMode !== normalized.bubbleMode
        ) {
          changed = true;
        }
        return normalized;
      }

      if (widget.topic === "/petanque_throw/angle_between_start_and_finish") {
        const normalized = {
          ...widget,
          endpointLeftLabel: widget.endpointLeftLabel ?? "Left",
          endpointRightLabel: widget.endpointRightLabel ?? "Right",
          bubbleMode: widget.bubbleMode ?? "degrees",
        };
        if (
          widget.endpointLeftLabel !== normalized.endpointLeftLabel ||
          widget.endpointRightLabel !== normalized.endpointRightLabel ||
          widget.bubbleMode !== normalized.bubbleMode
        ) {
          changed = true;
        }
        return normalized;
      }

      if (widget.topic === "/petanque_throw/alpha") {
        const normalized = {
          ...widget,
          unsafeThreshold: widget.unsafeThreshold ?? 20,
          endpointLeftLabel: widget.endpointLeftLabel ?? "Tirer",
          endpointRightLabel: widget.endpointRightLabel ?? "Pointer",
          bubbleMode: widget.bubbleMode ?? "degrees-unit",
        };
        if (
          widget.unsafeThreshold !== normalized.unsafeThreshold ||
          widget.endpointLeftLabel !== normalized.endpointLeftLabel ||
          widget.endpointRightLabel !== normalized.endpointRightLabel ||
          widget.bubbleMode !== normalized.bubbleMode
        ) {
          changed = true;
        }
        return normalized;
      }

      return widget;
    });

    if (!changed) return configuration;
    return {
      ...configuration,
      widgets: nextWidgets,
      updatedAt: new Date().toISOString(),
    };
  });
};

const ensurePlayPetanqueLancerActionButtons = (
  configurations: WidgetConfiguration[]
): WidgetConfiguration[] => {
  const latestLancer = DEFAULT_DEMO_CONFIGURATIONS.find(
    (configuration) => configuration.name === "play_petanque_lancer"
  );
  if (!latestLancer) return configurations;

  const requiredButtons = latestLancer.widgets.filter(
    (widget): widget is Extract<CanvasWidget, { kind: "button" }> =>
      widget.kind === "button" &&
      (widget.id === "play-lancer-test-loop" ||
        widget.id === "play-lancer-pointer" ||
        widget.id === "play-lancer-tirer")
  );
  if (requiredButtons.length === 0) return configurations;

  return configurations.map((configuration) => {
    if (configuration.name !== "play_petanque_lancer") return configuration;

    const hasEquivalentButton = (
      topic: string,
      payload: string
    ) =>
      configuration.widgets.some(
        (widget) =>
          widget.kind === "button" &&
          widget.topic === topic &&
          widget.payload === payload
      );

    const missingButtons = requiredButtons.filter(
      (button) => !hasEquivalentButton(button.topic, button.payload)
    );
    if (!missingButtons.length) return configuration;

    return {
      ...configuration,
      widgets: [...configuration.widgets, ...cloneWidgets(missingButtons)],
      updatedAt: new Date().toISOString(),
    };
  });
};

const migratePlayPetanqueLancerDrawThrowWidget = (
  configurations: WidgetConfiguration[]
): WidgetConfiguration[] => {
  const latestLancerDraw = DEFAULT_DEMO_CONFIGURATIONS.find(
    (configuration) => configuration.name === "play_petanque_lancer_draw"
  );
  if (!latestLancerDraw) return configurations;

  const drawTemplate = latestLancerDraw.widgets.find(
    (widget): widget is Extract<CanvasWidget, { kind: "throw-draw" }> =>
      widget.kind === "throw-draw" && widget.id === "play-lancer-draw"
  );
  if (!drawTemplate) return configurations;

  return configurations.map((configuration) => {
    if (configuration.name !== "play_petanque_lancer_draw") return configuration;

    const hasThrowDrawWidget = configuration.widgets.some(
      (widget) => widget.kind === "throw-draw"
    );
    const legacyVisualizationWidget = configuration.widgets.find(
      (widget) => widget.id === "play-lancer-rviz" && widget.kind === "stream-display"
    );

    if (hasThrowDrawWidget && !legacyVisualizationWidget) {
      return configuration;
    }

    const nextWidgets = configuration.widgets
      .filter((widget) => widget.id !== "play-lancer-rviz")
      .map((widget) => ({ ...widget }));

    if (!hasThrowDrawWidget) {
      const drawWidget: Extract<CanvasWidget, { kind: "throw-draw" }> = {
        ...cloneWidgets([drawTemplate])[0],
        rect: legacyVisualizationWidget?.rect
          ? { ...legacyVisualizationWidget.rect }
          : { ...drawTemplate.rect },
      } as Extract<CanvasWidget, { kind: "throw-draw" }>;
      nextWidgets.push(drawWidget);
    }

    return {
      ...configuration,
      widgets: nextWidgets,
      updatedAt: new Date().toISOString(),
    };
  });
};

const ensurePetanqueElectromagnetControl = (
  configurations: WidgetConfiguration[]
): WidgetConfiguration[] => {
  const latestPetanque = DEFAULT_DEMO_CONFIGURATIONS.find(
    (configuration) => configuration.name === "petanque"
  );
  if (!latestPetanque) return configurations;

  const magnetTemplate = latestPetanque.widgets.find(
    (widget) => widget.id === "pet-magnet"
  );
  if (!magnetTemplate) return configurations;

  return configurations.map((configuration) => {
    if (configuration.name !== "petanque") return configuration;

    const hasMagnetControl = configuration.widgets.some(
      (widget) => widget.id === "pet-magnet"
    );
    const hasLegacyMagnetButtons = configuration.widgets.some(
      (widget) => widget.id === "pet-magnet-on" || widget.id === "pet-magnet-off"
    );
    if (hasMagnetControl && !hasLegacyMagnetButtons) return configuration;

    const withoutLegacy = configuration.widgets.filter(
      (widget) => widget.id !== "pet-magnet-on" && widget.id !== "pet-magnet-off"
    );
    const nextWidgets = hasMagnetControl
      ? withoutLegacy
      : [...withoutLegacy, cloneWidgets([magnetTemplate])[0]];

    return {
      ...configuration,
      widgets: nextWidgets,
      updatedAt: new Date().toISOString(),
    };
  });
};

const ensurePetanqueGripperControl = (
  configurations: WidgetConfiguration[]
): WidgetConfiguration[] => {
  const latestPetanque = DEFAULT_DEMO_CONFIGURATIONS.find(
    (configuration) => configuration.name === "petanque"
  );
  if (!latestPetanque) return configurations;

  const gripperTemplate = latestPetanque.widgets.find(
    (widget) => widget.id === "pet-gripper"
  );
  if (!gripperTemplate) return configurations;

  return configurations.map((configuration) => {
    if (configuration.name !== "petanque") return configuration;
    if (configuration.widgets.some((widget) => widget.id === "pet-gripper")) {
      return configuration;
    }

    return {
      ...configuration,
      widgets: [...configuration.widgets, cloneWidgets([gripperTemplate])[0]],
      updatedAt: new Date().toISOString(),
    };
  });
};

const ensureSandboxRosMessageToggle = (
  configurations: WidgetConfiguration[]
): WidgetConfiguration[] => {
  const latestSandbox = DEFAULT_DEMO_CONFIGURATIONS.find(
    (configuration) => configuration.name === "sandbox_control"
  );
  if (!latestSandbox) return configurations;

  const toggleTemplate = latestSandbox.widgets.find(
    (widget) => widget.id === "sandbox-toggle-output"
  );
  if (!toggleTemplate) return configurations;

  return configurations.map((configuration) => {
    if (configuration.name !== "sandbox_control") return configuration;
    if (configuration.widgets.some((widget) => widget.id === "sandbox-toggle-output")) {
      return configuration;
    }

    return {
      ...configuration,
      widgets: [...configuration.widgets, cloneWidgets([toggleTemplate])[0]],
      updatedAt: new Date().toISOString(),
    };
  });
};

const migrateVisualServoingLayout = (
  configurations: WidgetConfiguration[]
): WidgetConfiguration[] => {
  const latestVisualServoing = DEFAULT_DEMO_CONFIGURATIONS.find(
    (configuration) => configuration.name === "visual_servoing"
  );
  if (!latestVisualServoing) return configurations;

  const requiredWidgetIds = new Set([
    "servo-rviz",
    "servo-camera",
    "servo-enable",
    "servo-save",
    "servo-open-monitor",
  ]);
  const legacyLabelPattern = /^(alignment|servo gain|start servo|stop servo)$/i;

  return configurations.map((configuration) => {
    if (configuration.name !== "visual_servoing") return configuration;

    const hasRequiredWidgets = [...requiredWidgetIds].every((requiredId) =>
      configuration.widgets.some((widget) => widget.id === requiredId)
    );
    const hasLegacyWidget = configuration.widgets.some((widget) =>
      legacyLabelPattern.test(widget.label.trim())
    );
    const hasOutdatedWidget = configuration.widgets.some(
      (widget) =>
        (widget.id === "servo-camera" &&
          widget.kind === "stream-display" &&
          widget.streamUrl === "webcam:///dev/video2") ||
        (widget.id === "servo-rviz" &&
          widget.kind === "stream-display" &&
          widget.topic !== "/tag_detections")
    );

    if (hasRequiredWidgets && !hasLegacyWidget && !hasOutdatedWidget) return configuration;

    return {
      ...cloneConfiguration(latestVisualServoing),
      poses: clonePoses(configuration.poses),
    };
  });
};

const migrateRosMessageToggleWidgets = (
  configurations: WidgetConfiguration[]
): WidgetConfiguration[] => {
  return configurations.map((configuration) => {
    let changed = false;
    const nextWidgets = configuration.widgets.map((widget) => {
      if (widget.kind === "ros-message-toggle") {
        const normalizedWidget = normalizeRosMessageToggleWidget(widget);
        const widgetChanged =
          (widget as Partial<typeof normalizedWidget>).messageType !== normalizedWidget.messageType ||
          (widget as Partial<typeof normalizedWidget>).onPayload !== normalizedWidget.onPayload ||
          (widget as Partial<typeof normalizedWidget>).offPayload !== normalizedWidget.offPayload;
        if (widgetChanged) {
          changed = true;
        }
        return normalizedWidget;
      }

      if (
        widget.kind !== "toggle-publisher" ||
        !("messageType" in widget || "onPayload" in widget || "offPayload" in widget)
      ) {
        return widget;
      }

      changed = true;
      return normalizeRosMessageToggleWidget({
        id: widget.id,
        kind: "ros-message-toggle",
        label: widget.label,
        topic: widget.topic,
        rect: widget.rect,
        outputMode: widget.outputMode,
        messageType:
          typeof (widget as { messageType?: unknown }).messageType === "string"
            ? (widget as { messageType?: string }).messageType
            : undefined,
        onPayload:
          typeof (widget as { onPayload?: unknown }).onPayload === "string"
            ? (widget as { onPayload?: string }).onPayload
            : undefined,
        offPayload:
          typeof (widget as { offPayload?: unknown }).offPayload === "string"
            ? (widget as { offPayload?: string }).offPayload
            : undefined,
      });
    });

    if (!changed) return configuration;
    return {
      ...configuration,
      widgets: nextWidgets,
      updatedAt: new Date().toISOString(),
    };
  });
};

const removePetanqueLegacyNavigationButtons = (
  configurations: WidgetConfiguration[]
): WidgetConfiguration[] => {
  return configurations.map((configuration) => {
    if (configuration.name !== "petanque" && configuration.name !== "petanque_teleop_config") {
      return configuration;
    }

    const nextWidgets = configuration.widgets.filter(
      (widget) => widget.kind !== "navigation-button"
    );
    if (nextWidgets.length === configuration.widgets.length) return configuration;

    return {
      ...configuration,
      widgets: nextWidgets,
      updatedAt: new Date().toISOString(),
    };
  });
};

const migratePetanqueTeleopConfigLayout = (
  configurations: WidgetConfiguration[]
): WidgetConfiguration[] => {
  const latestTeleopConfig = DEFAULT_DEMO_CONFIGURATIONS.find(
    (configuration) => configuration.name === "petanque_teleop_config"
  );
  if (!latestTeleopConfig) return configurations;

  const requiredWidgetIds = new Set([
    "pet-cfg-lin-gain",
    "pet-cfg-ang-gain",
    "pet-cfg-lin-scale-x",
    "pet-cfg-lin-scale-y",
    "pet-cfg-lin-scale-z",
    "pet-cfg-ang-scale-x",
    "pet-cfg-ang-scale-y",
    "pet-cfg-ang-scale-z",
    "pet-cfg-swap-xy",
    "pet-cfg-save-explorer",
    "pet-cfg-reset",
    "pet-cfg-lin-x",
    "pet-cfg-lin-y",
    "pet-cfg-lin-z",
    "pet-cfg-ang-x",
    "pet-cfg-ang-y",
    "pet-cfg-ang-z",
  ]);
  const legacyWidgetIds = new Set([
    "pet-cfg-translation-gain",
    "pet-cfg-rotation-gain",
    "pet-cfg-scale-x",
    "pet-cfg-scale-y",
    "pet-cfg-scale-z",
    "pet-cfg-title",
    "pet-cfg-mode",
    "pet-cfg-rz",
    "pet-cfg-z",
    "pet-cfg-translation",
    "pet-cfg-rotation",
  ]);

  return configurations.map((configuration) => {
    if (configuration.name !== "petanque_teleop_config") return configuration;

    const hasLegacyWidget = configuration.widgets.some((widget) =>
      legacyWidgetIds.has(widget.id)
    );
    const hasAllRequiredWidgets = [...requiredWidgetIds].every((requiredId) =>
      configuration.widgets.some((widget) => widget.id === requiredId)
    );

    if (!hasLegacyWidget && hasAllRequiredWidgets) return configuration;

    return {
      ...cloneConfiguration(latestTeleopConfig),
      poses: clonePoses(configuration.poses),
    };
  });
};

const normalizePetanqueTeleopButtonLayout = (
  configurations: WidgetConfiguration[]
): WidgetConfiguration[] => {
  return configurations.map((configuration) => {
    if (configuration.name !== "petanque_teleop_config") return configuration;

    let changed = false;
    const nextWidgets = configuration.widgets.map((widget) => {
      if (widget.id === "pet-cfg-lin-scale-x") {
        const nextWidget = {
          ...widget,
          rect: { ...widget.rect, x: 20, y: 200, w: 530, h: 92 },
        };
        if (
          widget.rect.x !== nextWidget.rect.x ||
          widget.rect.y !== nextWidget.rect.y ||
          widget.rect.w !== nextWidget.rect.w ||
          widget.rect.h !== nextWidget.rect.h
        ) {
          changed = true;
        }
        return nextWidget;
      }

      if (widget.id === "pet-cfg-lin-scale-y") {
        const nextWidget = {
          ...widget,
          rect: { ...widget.rect, x: 20, y: 306, w: 530, h: 92 },
        };
        if (
          widget.rect.x !== nextWidget.rect.x ||
          widget.rect.y !== nextWidget.rect.y ||
          widget.rect.w !== nextWidget.rect.w ||
          widget.rect.h !== nextWidget.rect.h
        ) {
          changed = true;
        }
        return nextWidget;
      }

      if (widget.id === "pet-cfg-lin-scale-z") {
        const nextWidget = {
          ...widget,
          rect: { ...widget.rect, x: 20, y: 412, w: 530, h: 92 },
        };
        if (
          widget.rect.x !== nextWidget.rect.x ||
          widget.rect.y !== nextWidget.rect.y ||
          widget.rect.w !== nextWidget.rect.w ||
          widget.rect.h !== nextWidget.rect.h
        ) {
          changed = true;
        }
        return nextWidget;
      }

      if (widget.id === "pet-cfg-ang-scale-x") {
        const nextWidget = {
          ...widget,
          rect: { ...widget.rect, x: 650, y: 200, w: 530, h: 92 },
        };
        if (
          widget.rect.x !== nextWidget.rect.x ||
          widget.rect.y !== nextWidget.rect.y ||
          widget.rect.w !== nextWidget.rect.w ||
          widget.rect.h !== nextWidget.rect.h
        ) {
          changed = true;
        }
        return nextWidget;
      }

      if (widget.id === "pet-cfg-ang-scale-y") {
        const nextWidget = {
          ...widget,
          rect: { ...widget.rect, x: 650, y: 306, w: 530, h: 92 },
        };
        if (
          widget.rect.x !== nextWidget.rect.x ||
          widget.rect.y !== nextWidget.rect.y ||
          widget.rect.w !== nextWidget.rect.w ||
          widget.rect.h !== nextWidget.rect.h
        ) {
          changed = true;
        }
        return nextWidget;
      }

      if (widget.id === "pet-cfg-ang-scale-z") {
        const nextWidget = {
          ...widget,
          rect: { ...widget.rect, x: 650, y: 412, w: 530, h: 92 },
        };
        if (
          widget.rect.x !== nextWidget.rect.x ||
          widget.rect.y !== nextWidget.rect.y ||
          widget.rect.w !== nextWidget.rect.w ||
          widget.rect.h !== nextWidget.rect.h
        ) {
          changed = true;
        }
        return nextWidget;
      }

      if (widget.id === "pet-cfg-swap-xy") {
        const nextWidget = {
          ...widget,
          rect: { ...widget.rect, x: 650, y: 20, w: 170, h: 58 },
        };
        if (
          widget.rect.x !== nextWidget.rect.x ||
          widget.rect.y !== nextWidget.rect.y ||
          widget.rect.w !== nextWidget.rect.w ||
          widget.rect.h !== nextWidget.rect.h
        ) {
          changed = true;
        }
        return nextWidget;
      }

      if (widget.id === "pet-cfg-save-explorer") {
        const nextWidget = {
          ...widget,
          rect: { ...widget.rect, x: 840, y: 20, w: 190, h: 58 },
        };
        if (
          widget.rect.x !== nextWidget.rect.x ||
          widget.rect.y !== nextWidget.rect.y ||
          widget.rect.w !== nextWidget.rect.w ||
          widget.rect.h !== nextWidget.rect.h
        ) {
          changed = true;
        }
        return nextWidget;
      }

      if (widget.id === "pet-cfg-reset") {
        const nextWidget = {
          ...widget,
          rect: { ...widget.rect, x: 1050, y: 20, w: 170, h: 58 },
        };
        if (
          widget.rect.x !== nextWidget.rect.x ||
          widget.rect.y !== nextWidget.rect.y ||
          widget.rect.w !== nextWidget.rect.w ||
          widget.rect.h !== nextWidget.rect.h
        ) {
          changed = true;
        }
        return nextWidget;
      }

      if (widget.id === "pet-cfg-lin-x") {
        const nextWidget = {
          ...widget,
          rect: { ...widget.rect, x: 560, y: 217, w: 70, h: 58 },
        };
        if (
          widget.rect.x !== nextWidget.rect.x ||
          widget.rect.y !== nextWidget.rect.y ||
          widget.rect.w !== nextWidget.rect.w ||
          widget.rect.h !== nextWidget.rect.h
        ) {
          changed = true;
        }
        return nextWidget;
      }

      if (widget.id === "pet-cfg-lin-y") {
        const nextWidget = {
          ...widget,
          rect: { ...widget.rect, x: 560, y: 323, w: 70, h: 58 },
        };
        if (
          widget.rect.x !== nextWidget.rect.x ||
          widget.rect.y !== nextWidget.rect.y ||
          widget.rect.w !== nextWidget.rect.w ||
          widget.rect.h !== nextWidget.rect.h
        ) {
          changed = true;
        }
        return nextWidget;
      }

      if (widget.id === "pet-cfg-lin-z") {
        const nextWidget = {
          ...widget,
          rect: { ...widget.rect, x: 560, y: 429, w: 70, h: 58 },
        };
        if (
          widget.rect.x !== nextWidget.rect.x ||
          widget.rect.y !== nextWidget.rect.y ||
          widget.rect.w !== nextWidget.rect.w ||
          widget.rect.h !== nextWidget.rect.h
        ) {
          changed = true;
        }
        return nextWidget;
      }

      if (widget.id === "pet-cfg-ang-x") {
        const nextWidget = {
          ...widget,
          rect: { ...widget.rect, x: 1190, y: 217, w: 70, h: 58 },
        };
        if (
          widget.rect.x !== nextWidget.rect.x ||
          widget.rect.y !== nextWidget.rect.y ||
          widget.rect.w !== nextWidget.rect.w ||
          widget.rect.h !== nextWidget.rect.h
        ) {
          changed = true;
        }
        return nextWidget;
      }

      if (widget.id === "pet-cfg-ang-y") {
        const nextWidget = {
          ...widget,
          rect: { ...widget.rect, x: 1190, y: 323, w: 70, h: 58 },
        };
        if (
          widget.rect.x !== nextWidget.rect.x ||
          widget.rect.y !== nextWidget.rect.y ||
          widget.rect.w !== nextWidget.rect.w ||
          widget.rect.h !== nextWidget.rect.h
        ) {
          changed = true;
        }
        return nextWidget;
      }

      if (widget.id === "pet-cfg-ang-z") {
        const nextWidget = {
          ...widget,
          rect: { ...widget.rect, x: 1190, y: 429, w: 70, h: 58 },
        };
        if (
          widget.rect.x !== nextWidget.rect.x ||
          widget.rect.y !== nextWidget.rect.y ||
          widget.rect.w !== nextWidget.rect.w ||
          widget.rect.h !== nextWidget.rect.h
        ) {
          changed = true;
        }
        return nextWidget;
      }

      return widget;
    });

    if (!changed) return configuration;
    return {
      ...configuration,
      widgets: nextWidgets,
      updatedAt: new Date().toISOString(),
    };
  });
};

const normalizeGenericTeleopMaxVelocityRanges = (
  configurations: WidgetConfiguration[]
): WidgetConfiguration[] =>
  configurations.map((configuration) => {
    let changed = false;
    const nextWidgets = configuration.widgets.map((widget) => {
      if (widget.kind !== "max-velocity" || widget.topic !== "/cmd/max_velocity") {
        return widget;
      }

      const nextWidget = {
        ...widget,
        min: 0,
        max: 1,
        step: 0.01,
      };
      if (
        widget.min !== nextWidget.min ||
        widget.max !== nextWidget.max ||
        widget.step !== nextWidget.step
      ) {
        changed = true;
      }
      return nextWidget;
    });

    if (!changed) return configuration;
    return {
      ...configuration,
      widgets: nextWidgets,
      updatedAt: new Date().toISOString(),
    };
  });

const migrateSnakeControlTopic = (
  configurations: WidgetConfiguration[]
): WidgetConfiguration[] =>
  configurations.map((configuration) => {
    if (configuration.name !== "snake_control") return configuration;

    let changed = false;
    const nextWidgets = configuration.widgets.map((widget) => {
      if (
        widget.id === "snake-hold" &&
        widget.kind === "momentary-ros-message" &&
        widget.topic === "/snake_control/enable"
      ) {
        changed = true;
        return {
          ...widget,
          topic: "/activate_snake",
        };
      }
      return widget;
    });

    if (!changed) return configuration;
    return {
      ...configuration,
      widgets: nextWidgets,
      updatedAt: new Date().toISOString(),
    };
  });

const migrateControlPanelVisualServoTelemetry = (
  configurations: WidgetConfiguration[]
): WidgetConfiguration[] => {
  const latestControlPanel = DEFAULT_DEMO_CONFIGURATIONS.find(
    (configuration) => configuration.name === "control_panel"
  );
  if (!latestControlPanel) return configurations;

  const telemetryTemplate = latestControlPanel.widgets.find(
    (widget) => widget.id === "control-panel-servo-telemetry"
  );
  if (!telemetryTemplate) return configurations;

  return configurations.map((configuration) => {
    if (configuration.name !== "control_panel") return configuration;

    let changed = false;
    const nextWidgets = configuration.widgets.map((widget) => {
      if (
        widget.id === "control-panel-max-velocity" &&
        widget.kind === "max-velocity" &&
        widget.label !== "Teleop Gain"
      ) {
        changed = true;
        return {
          ...widget,
          label: "Teleop Gain",
        };
      }
      return widget;
    });

    if (!nextWidgets.some((widget) => widget.id === telemetryTemplate.id)) {
      nextWidgets.push(cloneWidgets([telemetryTemplate])[0]);
      changed = true;
    }

    if (!changed) return configuration;
    return {
      ...configuration,
      widgets: nextWidgets,
      updatedAt: new Date().toISOString(),
    };
  });
};

const cloneDefaultConfigurations = () => DEFAULT_DEMO_CONFIGURATIONS.map(cloneConfiguration);

const mergeMissingDemoConfigurations = (
  configurations: WidgetConfiguration[]
): WidgetConfiguration[] => {
  if (!configurations.length) return cloneDefaultConfigurations();
  const existingNames = new Set(configurations.map((configuration) => configuration.name));
  const missing = DEFAULT_DEMO_CONFIGURATIONS.filter(
    (configuration) => !existingNames.has(configuration.name)
  ).map(cloneConfiguration);
  return missing.length ? [...configurations, ...missing] : configurations;
};

export const getDefaultDemoConfigurationByName = (name: string): WidgetConfiguration | null => {
  const match = DEFAULT_DEMO_CONFIGURATIONS.find((configuration) => configuration.name === name);
  return match ? cloneConfiguration(match) : null;
};

type DirectoryPickerHandle = {
  values: () => AsyncIterable<FileSystemHandle>;
  getFileHandle: (
    name: string,
    options?: FileSystemGetFileOptions
  ) => Promise<FileSystemFileHandle>;
};

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: () => Promise<DirectoryPickerHandle>;
};

type FileEntryHandle = FileSystemHandle & {
  kind: "file";
  name: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const cloneWidgets = (widgets: CanvasWidget[]): CanvasWidget[] =>
  JSON.parse(JSON.stringify(widgets)) as CanvasWidget[];
export const clonePoses = (poses: PoseSnapshot[]): PoseSnapshot[] =>
  JSON.parse(JSON.stringify(poses)) as PoseSnapshot[];

const isPoseTopicValue = (value: unknown): value is PoseTopicValue => {
  if (!isRecord(value) || typeof value.kind !== "string") return false;
  if (value.kind === "scalar") {
    return typeof value.value === "number";
  }
  if (value.kind === "vector2") {
    return typeof value.x === "number" && typeof value.y === "number";
  }
  return false;
};

const parsePose = (value: unknown): PoseSnapshot | null => {
  if (!isRecord(value) || typeof value.name !== "string" || !isRecord(value.topics)) {
    return null;
  }

  const topics: Record<string, PoseTopicValue> = {};
  for (const [topic, topicValue] of Object.entries(value.topics)) {
    if (!isPoseTopicValue(topicValue)) continue;
    topics[topic] = topicValue;
  }

  return {
    name: value.name,
    savedAt: typeof value.savedAt === "string" ? value.savedAt : new Date().toISOString(),
    topics,
  };
};

const parsePoses = (value: unknown): PoseSnapshot[] => {
  if (!Array.isArray(value)) return [];
  return value.map(parsePose).filter((pose): pose is PoseSnapshot => pose !== null);
};

const applyConfigurationMigrations = (
  configurations: WidgetConfiguration[]
): WidgetConfiguration[] => {
  let nextConfigurations = mergeMissingDemoConfigurations(configurations);
  nextConfigurations = migrateLegacyDefaultControl(nextConfigurations);
  nextConfigurations = migrateLegacyPetanque(nextConfigurations);
  nextConfigurations = disablePetanqueViewerWidget(nextConfigurations);
  nextConfigurations = migratePetanqueTeleopConfigLayout(nextConfigurations);
  nextConfigurations = removePetanqueLegacyNavigationButtons(nextConfigurations);
  nextConfigurations = ensurePetanqueElectromagnetControl(nextConfigurations);
  nextConfigurations = ensurePetanqueGripperControl(nextConfigurations);
  nextConfigurations = ensureSandboxRosMessageToggle(nextConfigurations);
  nextConfigurations = migrateVisualServoingLayout(nextConfigurations);
  nextConfigurations = migrateRosMessageToggleWidgets(nextConfigurations);
  nextConfigurations = normalizePetanqueSliderRanges(nextConfigurations);
  nextConfigurations = normalizePetanqueSliderDisplayOptions(nextConfigurations);
  nextConfigurations = ensurePlayPetanqueLancerActionButtons(nextConfigurations);
  nextConfigurations = migratePlayPetanqueLancerDrawThrowWidget(nextConfigurations);
  nextConfigurations = normalizePetanqueTeleopButtonLayout(nextConfigurations);
  nextConfigurations = normalizeGenericTeleopMaxVelocityRanges(nextConfigurations);
  nextConfigurations = migrateSnakeControlTopic(nextConfigurations);
  return migrateControlPanelVisualServoTelemetry(nextConfigurations);
};

export function loadConfigurationsFromLocalStorage(): WidgetConfiguration[] {
  return readJsonStorage(STORAGE_KEY, cloneDefaultConfigurations(), (parsed) => {
    if (!Array.isArray(parsed)) return cloneDefaultConfigurations();
    const sanitized = parsed
      .filter((item): item is WidgetConfiguration => {
        if (!isRecord(item)) return false;
        return typeof item.name === "string" && Array.isArray(item.widgets);
      })
      .map((item) => ({
        name: item.name,
        widgets: cloneWidgets(item.widgets),
        poses: parsePoses(item.poses),
        canvas: normalizeCanvasSettings(item.canvas),
        updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : new Date().toISOString(),
      }));
    return applyConfigurationMigrations(sanitized);
  });
}

export function persistConfigurationsToLocalStorage(configurations: WidgetConfiguration[]) {
  writeJsonStorage(STORAGE_KEY, configurations);
}

export function upsertConfiguration(
  configurations: WidgetConfiguration[],
  name: string,
  widgets: CanvasWidget[],
  poses?: PoseSnapshot[],
  canvas?: CanvasSettings,
  updatedAt?: string
): WidgetConfiguration[] {
  const existing = configurations.find((config) => config.name === name);
  const nextConfig: WidgetConfiguration = {
    name,
    widgets: cloneWidgets(widgets),
    poses: clonePoses(poses ?? existing?.poses ?? []),
    canvas: cloneCanvasSettings(canvas ?? existing?.canvas ?? DEFAULT_CANVAS_SETTINGS),
    updatedAt: updatedAt ?? new Date().toISOString(),
  };

  const existingIndex = configurations.findIndex((config) => config.name === name);
  if (existingIndex === -1) {
    return [...configurations, nextConfig].sort((a, b) => a.name.localeCompare(b.name));
  }

  if (existing && hasSameConfigurationContent(existing, nextConfig)) {
    return configurations;
  }

  return configurations.map((config, index) => (index === existingIndex ? nextConfig : config));
}

export function removeConfiguration(configurations: WidgetConfiguration[], name: string): WidgetConfiguration[] {
  return configurations.filter((config) => config.name !== name);
}

const sanitizeFileName = (name: string) =>
  `${name.trim().replace(/[^a-zA-Z0-9-_]+/g, "_").replace(/_+/g, "_") || "configuration"}.json`;

const parseConfigurationFile = async (
  entry: FileSystemFileHandle
): Promise<WidgetConfiguration | null> => {
  try {
    const file = await entry.getFile();
    const content = await file.text();
    const parsed = JSON.parse(content);
    if (!isRecord(parsed) || typeof parsed.name !== "string" || !Array.isArray(parsed.widgets)) {
      return null;
    }

    return {
      name: parsed.name,
      widgets: cloneWidgets(parsed.widgets as CanvasWidget[]),
      poses: parsePoses(parsed.poses),
      canvas: normalizeCanvasSettings(parsed.canvas),
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
};

export async function syncConfigurationsToFolder(configurations: WidgetConfiguration[]) {
  const pickerWindow = window as DirectoryPickerWindow;
  if (!pickerWindow.showDirectoryPicker) {
    throw new Error("File System Access API not available in this browser.");
  }

  const directoryHandle = await pickerWindow.showDirectoryPicker();

  for (const configuration of configurations) {
    const fileName = sanitizeFileName(configuration.name);
    let configurationToWrite = configuration;
    let fileHandle: FileSystemFileHandle;

    try {
      fileHandle = await directoryHandle.getFileHandle(fileName);
      const existingConfiguration = await parseConfigurationFile(fileHandle);
      if (
        existingConfiguration &&
        hasSameConfigurationContent(existingConfiguration, configuration)
      ) {
        configurationToWrite = {
          ...configuration,
          updatedAt: existingConfiguration.updatedAt,
        };
      }
    } catch {
      fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
    }

    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(configurationToWrite, null, 2));
    await writable.close();
  }

  return configurations.length;
}

export async function syncConfigurationsFromFolder(
  configurations: WidgetConfiguration[]
): Promise<WidgetConfiguration[]> {
  const pickerWindow = window as DirectoryPickerWindow;
  if (!pickerWindow.showDirectoryPicker) {
    throw new Error("File System Access API not available in this browser.");
  }

  const directoryHandle = await pickerWindow.showDirectoryPicker();
  const loaded: WidgetConfiguration[] = [];

  for await (const entry of directoryHandle.values()) {
    const fileEntry = entry as FileEntryHandle;
    if (fileEntry.kind !== "file" || !fileEntry.name.endsWith(".json")) continue;
    const configuration = await parseConfigurationFile(fileEntry as FileSystemFileHandle);
    if (configuration) loaded.push(configuration);
  }

  let merged = [...configurations];
  for (const configuration of loaded) {
    merged = upsertConfiguration(
      merged,
      configuration.name,
      configuration.widgets,
      configuration.poses,
      configuration.canvas,
      configuration.updatedAt
    );
  }

  return applyConfigurationMigrations(merged);
}
