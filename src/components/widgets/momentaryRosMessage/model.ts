import type { MomentaryRosMessageWidget } from "../widgetTypes";

export const DEFAULT_MOMENTARY_ROS_MESSAGE_TYPE = "std_msgs/msg/Bool";
export const DEFAULT_MOMENTARY_ROS_MESSAGE_PRESSED_PAYLOAD = "{data: true}";
export const DEFAULT_MOMENTARY_ROS_MESSAGE_RELEASED_PAYLOAD = "{data: false}";

export type MomentaryRosMessageState = "pressed" | "released";

export type MomentaryRosMessageWsMessage = {
  type: "ui_typed";
  topic: string;
  message_type: string;
  payload_text: string;
  widget_id: string;
};

const normalizeText = (value: string | undefined) => value?.trim() ?? "";

export const normalizeMomentaryRosMessageWidget = (
  widget: MomentaryRosMessageWidget
): MomentaryRosMessageWidget => {
  const messageType = normalizeText(widget.messageType) || DEFAULT_MOMENTARY_ROS_MESSAGE_TYPE;
  const pressedPayload =
    normalizeText(widget.pressedPayload) || DEFAULT_MOMENTARY_ROS_MESSAGE_PRESSED_PAYLOAD;
  const releasedPayload =
    normalizeText(widget.releasedPayload) || DEFAULT_MOMENTARY_ROS_MESSAGE_RELEASED_PAYLOAD;

  return {
    ...widget,
    kind: "momentary-ros-message",
    messageType,
    pressedPayload,
    releasedPayload,
  };
};

export const buildMomentaryRosMessageWsMessage = (
  widget: MomentaryRosMessageWidget,
  state: MomentaryRosMessageState
): MomentaryRosMessageWsMessage => {
  const normalized = normalizeMomentaryRosMessageWidget(widget);
  return {
    type: "ui_typed",
    topic: normalized.topic,
    message_type: normalized.messageType,
    payload_text:
      state === "pressed" ? normalized.pressedPayload : normalized.releasedPayload,
    widget_id: normalized.id,
  };
};

export const buildMomentaryRosMessageCliExample = (
  widget: Pick<
    MomentaryRosMessageWidget,
    "topic" | "messageType" | "pressedPayload" | "releasedPayload"
  >,
  state: MomentaryRosMessageState
) => {
  const normalized = normalizeMomentaryRosMessageWidget({
    id: "preview",
    kind: "momentary-ros-message",
    label: "Preview",
    topic: widget.topic,
    messageType: widget.messageType,
    pressedPayload: widget.pressedPayload,
    releasedPayload: widget.releasedPayload,
    rect: { x: 0, y: 0, w: 1, h: 1 },
  });
  const payload =
    state === "pressed" ? normalized.pressedPayload : normalized.releasedPayload;
  return `ros2 topic pub -1 ${normalized.topic} ${normalized.messageType} "${payload}"`;
};
