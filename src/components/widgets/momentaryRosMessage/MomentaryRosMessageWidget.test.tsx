import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MomentaryRosMessageWidget } from "./MomentaryRosMessageWidget";
import type { MomentaryRosMessageWidget as MomentaryRosMessageWidgetModel } from "../widgetTypes";

const widget: MomentaryRosMessageWidgetModel = {
  id: "snake-hold",
  kind: "momentary-ros-message",
  label: "Hold Snake",
  topic: "/activate_snake",
  messageType: "std_msgs/msg/Bool",
  pressedPayload: "{data: true}",
  releasedPayload: "{data: false}",
  rect: { x: 0, y: 0, w: 260, h: 120 },
};

const renderWidget = (callbacks?: {
  onPress?: () => void;
  onRelease?: () => void;
}) => {
  const onPress = callbacks?.onPress ?? vi.fn();
  const onRelease = callbacks?.onRelease ?? vi.fn();
  render(
    <MomentaryRosMessageWidget
      widget={widget}
      selected={false}
      onSelect={vi.fn()}
      onRectChange={vi.fn()}
      onLabelChange={vi.fn()}
      onPress={onPress}
      onRelease={onRelease}
    />
  );
  return { onPress, onRelease };
};

afterEach(() => {
  cleanup();
});

describe("MomentaryRosMessageWidget", () => {
  it("fires press once on pointer down and release on pointer up", () => {
    const onPress = vi.fn();
    const onRelease = vi.fn();
    renderWidget({ onPress, onRelease });

    const button = screen.getByRole("button", { name: "Hold Snake hold button" });
    fireEvent.pointerDown(button, { button: 0, pointerId: 1 });
    fireEvent.pointerDown(button, { button: 0, pointerId: 1 });
    fireEvent.pointerUp(button, { pointerId: 1 });

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onRelease).toHaveBeenCalledTimes(1);
  });

  it("supports keyboard hold semantics", () => {
    const onPress = vi.fn();
    const onRelease = vi.fn();
    renderWidget({ onPress, onRelease });

    const button = screen.getByRole("button", { name: "Hold Snake hold button" });
    fireEvent.keyDown(button, { key: " " });
    fireEvent.keyDown(button, { key: " ", repeat: true });
    fireEvent.keyUp(button, { key: " " });

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onRelease).toHaveBeenCalledTimes(1);
  });
});
