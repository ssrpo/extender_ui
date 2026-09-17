import { describe, expect, it } from "vitest";

import {
  buildMomentaryRosMessageCliExample,
  buildMomentaryRosMessageWsMessage,
  normalizeMomentaryRosMessageWidget,
} from "./model";

describe("momentaryRosMessage/model", () => {
  it("normalizes empty typed settings to Bool press/release defaults", () => {
    const widget = normalizeMomentaryRosMessageWidget({
      id: "snake-hold",
      kind: "momentary-ros-message",
      label: "Snake",
      topic: "/activate_snake",
      messageType: "",
      pressedPayload: "",
      releasedPayload: "",
      rect: { x: 0, y: 0, w: 200, h: 100 },
    });

    expect(widget).toMatchObject({
      messageType: "std_msgs/msg/Bool",
      pressedPayload: "{data: true}",
      releasedPayload: "{data: false}",
    });
  });

  it("builds a pressed typed WebSocket message", () => {
    const message = buildMomentaryRosMessageWsMessage(
      {
        id: "snake-hold",
        kind: "momentary-ros-message",
        label: "Snake",
        topic: "/activate_snake",
        messageType: "std_msgs/msg/Bool",
        pressedPayload: "{data: true}",
        releasedPayload: "{data: false}",
        rect: { x: 0, y: 0, w: 200, h: 100 },
      },
      "pressed"
    );

    expect(message).toEqual({
      type: "ui_typed",
      topic: "/activate_snake",
      message_type: "std_msgs/msg/Bool",
      payload_text: "{data: true}",
      widget_id: "snake-hold",
    });
  });

  it("builds a released typed WebSocket message", () => {
    const message = buildMomentaryRosMessageWsMessage(
      {
        id: "snake-hold",
        kind: "momentary-ros-message",
        label: "Snake",
        topic: "/activate_snake",
        messageType: "std_msgs/msg/Bool",
        pressedPayload: "{data: true}",
        releasedPayload: "{data: false}",
        rect: { x: 0, y: 0, w: 200, h: 100 },
      },
      "released"
    );

    expect(message).toEqual({
      type: "ui_typed",
      topic: "/activate_snake",
      message_type: "std_msgs/msg/Bool",
      payload_text: "{data: false}",
      widget_id: "snake-hold",
    });
  });

  it("builds a CLI-style preview string", () => {
    const command = buildMomentaryRosMessageCliExample(
      {
        topic: "/activate_snake",
        messageType: "std_msgs/msg/Bool",
        pressedPayload: "{data: true}",
        releasedPayload: "{data: false}",
      },
      "pressed"
    );

    expect(command).toBe(
      'ros2 topic pub -1 /activate_snake std_msgs/msg/Bool "{data: true}"'
    );
  });
});
