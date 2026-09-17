import type { CanvasRect } from "../layout/CanvasItem";

export type JoystickBinding = "joy" | "rot";
export type SliderBinding = "z" | "rz";
export type SliderDirection = "vertical" | "horizontal";
export type WidgetIcon = "home" | "save" | "arrow-right";
export type ButtonTone = "default" | "accent" | "success" | "danger";
export type NavigationOrientation = "horizontal" | "vertical";
export type TextAlign = "left" | "center" | "right";
export type StreamSource = "camera" | "rviz" | "visualization" | "webcam";
export type StreamFitMode = "contain" | "cover";
export type LogLevelFilter = "all" | "info" | "warn" | "error";
export type TogglePublisherOutputMode = "numeric" | "boolean";

export type TopicMonitorTopic = {
  label: string;
  topic: string;
  messageType: string;
};

export type WidgetKind =
  | "joystick"
  | "slider"
  | "mode-button"
  | "save-pose-button"
  | "load-pose-button"
  | "navigation-button"
  | "navigation-bar"
  | "text"
  | "textarea"
  | "button"
  | "rosbag-control"
  | "max-velocity"
  | "gripper-control"
  | "magnet-control"
  | "toggle-publisher"
  | "ros-message-toggle"
  | "momentary-ros-message"
  | "stream-display"
  | "throw-draw"
  | "drink"
  | "curves"
  | "logs"
  | "topic-monitor";

type WidgetBase = {
  id: string;
  kind: WidgetKind;
  label: string;
  topic: string;
  rect: CanvasRect;
};

export type JoystickWidget = WidgetBase & {
  kind: "joystick";
  binding: JoystickBinding;
  showTopicInfo?: boolean;
  color: string;
  deadzone: number;
  diskSize: number;
  labels: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
};

export type SliderWidget = WidgetBase & {
  kind: "slider";
  binding: SliderBinding;
  direction: SliderDirection;
  showLabel?: boolean;
  showTopicInfo?: boolean;
  labelAlign?: TextAlign;
  min: number;
  max: number;
  step: number;
};

export type SavePoseButtonWidget = WidgetBase & {
  kind: "save-pose-button";
};

export type ModeButtonWidget = WidgetBase & {
  kind: "mode-button";
};

export type LoadPoseButtonWidget = WidgetBase & {
  kind: "load-pose-button";
  poseName: string;
  icon: WidgetIcon;
};

export type NavigationButtonWidget = WidgetBase & {
  kind: "navigation-button";
  targetScreenId: string;
  icon: WidgetIcon;
};

export type NavigationBarWidget = WidgetBase & {
  kind: "navigation-bar";
  orientation: NavigationOrientation;
  items: Array<{
    id: string;
    label: string;
    targetScreenId: string;
  }>;
};

export type TextWidget = WidgetBase & {
  kind: "text";
  text: string;
  fontSize: number;
  align: TextAlign;
};

export type TextareaWidget = WidgetBase & {
  kind: "textarea";
  text: string;
  fontSize: number;
};

export type ButtonWidget = WidgetBase & {
  kind: "button";
  payload: string;
  tone?: ButtonTone;
};

export type RosbagControlWidget = WidgetBase & {
  kind: "rosbag-control";
  bagName: string;
  autoTimestamp: boolean;
};

export type MaxVelocityWidget = WidgetBase & {
  kind: "max-velocity";
  min: number;
  max: number;
  step: number;
  reverseDirection?: boolean;
  unsafeThreshold?: number;
  endpointLeftLabel?: string;
  endpointRightLabel?: string;
  bubbleMode?: "number" | "degrees" | "degrees-unit" | "power";
};

export type GripperControlWidget = WidgetBase & {
  kind: "gripper-control";
  showAdvancedControls?: boolean;
};

export type MagnetControlWidget = WidgetBase & {
  kind: "magnet-control";
  onPayload: string;
  offPayload: string;
};

export type TogglePublisherWidget = WidgetBase & {
  kind: "toggle-publisher";
  outputMode: TogglePublisherOutputMode;
};

export type RosMessageToggleWidget = WidgetBase & {
  kind: "ros-message-toggle";
  presetId?: string;
  messageType: string;
  onPayload: string;
  offPayload: string;
};

export type MomentaryRosMessageWidget = WidgetBase & {
  kind: "momentary-ros-message";
  messageType: string;
  pressedPayload: string;
  releasedPayload: string;
};

export type StreamDisplayWidget = WidgetBase & {
  kind: "stream-display";
  source: StreamSource;
  streamUrl: string;
  fitMode: StreamFitMode;
  showStatus: boolean;
  showUrl: boolean;
  overlayText: string;
  showHeader?: boolean;
  showSourceBadge?: boolean;
  showWebcamPicker?: boolean;
};

export type ThrowDrawWidget = WidgetBase & {
  kind: "throw-draw";
  angleTopic: string;
  powerTopic: string;
  alphaTopic?: string;
  alphaMin?: number;
  alphaMax?: number;
  alphaSafeMax?: number;
  angleMin: number;
  angleMax: number;
  durationMin: number;
  durationMax: number;
  holdToMaxMs: number;
};

export type DrinkWidget = WidgetBase & {
  kind: "drink";
  videoUrl: string;
  autoCloseOnEnd: boolean;
};

export type CurvesWidget = WidgetBase & {
  kind: "curves";
  sampleRateHz: number;
  historySeconds: number;
  showLegend: boolean;
  showSpeed: boolean;
};

export type LogsWidget = WidgetBase & {
  kind: "logs";
  maxEntries: number;
  levelFilter: LogLevelFilter;
  autoScroll: boolean;
  showTimestamp: boolean;
};

export type TopicMonitorWidget = WidgetBase & {
  kind: "topic-monitor";
  topics: TopicMonitorTopic[];
  showSummary?: boolean;
  showDetails?: boolean;
  showRaw: boolean;
  staleAfterMs?: number;
};

export type CanvasWidget =
  | JoystickWidget
  | SliderWidget
  | ModeButtonWidget
  | SavePoseButtonWidget
  | LoadPoseButtonWidget
  | NavigationButtonWidget
  | NavigationBarWidget
  | TextWidget
  | TextareaWidget
  | ButtonWidget
  | RosbagControlWidget
  | MaxVelocityWidget
  | GripperControlWidget
  | MagnetControlWidget
  | TogglePublisherWidget
  | RosMessageToggleWidget
  | MomentaryRosMessageWidget
  | StreamDisplayWidget
  | ThrowDrawWidget
  | DrinkWidget
  | CurvesWidget
  | LogsWidget
  | TopicMonitorWidget;

export const DEFAULT_WIDGETS: CanvasWidget[] = [
  {
    id: "slider-rz",
    kind: "slider",
    binding: "rz",
    label: "RZ",
    topic: "/cmd/joystick_rz",
    direction: "horizontal",
    showLabel: true,
    showTopicInfo: true,
    labelAlign: "center",
    min: -1,
    max: 1,
    step: 0.01,
    rect: { x: 105, y: 25, w: 100, h: 50 },
  },
  {
    id: "slider-z",
    kind: "slider",
    binding: "z",
    label: "Z",
    topic: "/cmd/joystick_z",
    direction: "vertical",
    showLabel: true,
    showTopicInfo: true,
    labelAlign: "center",
    min: -1,
    max: 1,
    step: 0.01,
    rect: { x: 0, y: 100, w: 50, h: 100 },
  },
  {
    id: "mode-button",
    kind: "mode-button",
    label: "Mode",
    topic: "/cmd/mode",
    rect: { x: 210, y: 25, w: 170, h: 50 },
  },
  {
    id: "joystick-translation",
    kind: "joystick",
    binding: "joy",
    label: "Translation",
    topic: "/cmd/joystick_xy",
    showTopicInfo: true,
    color: "#4a9eff",
    deadzone: 0.1,
    diskSize: 64,
    labels: { top: "Y+", right: "X+", bottom: "Y-", left: "X-" },
    rect: { x: 0, y: 100, w: 100, h: 100 },
  },
  {
    id: "joystick-rotation",
    kind: "joystick",
    binding: "rot",
    label: "Rotation",
    topic: "/cmd/joystick_rxry",
    showTopicInfo: true,
    color: "#f97316",
    deadzone: 0.1,
    diskSize: 64,
    labels: { top: "RY+", right: "RX+", bottom: "RY-", left: "RX-" },
    rect: { x: 105, y: 100, w: 100, h: 100 },
  },
];

export const nextWidgetId = () => `widget-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
