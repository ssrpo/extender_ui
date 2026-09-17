import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { CanvasItem } from "../../layout/CanvasItem";
import type { CanvasRect } from "../../layout/CanvasItem";
import { InlineEditableText } from "../InlineEditableText";
import type { MomentaryRosMessageWidget as MomentaryRosMessageWidgetModel } from "../widgetTypes";

type MomentaryRosMessageWidgetProps = {
  widget: MomentaryRosMessageWidgetModel;
  selected: boolean;
  onSelect: () => void;
  onRectChange: (next: CanvasRect) => void;
  onLabelChange: (nextLabel: string) => void;
  onPress: () => void;
  onRelease: () => void;
};

const isActivationKey = (key: string) => key === " " || key === "Enter";

export function MomentaryRosMessageWidget({
  widget,
  selected,
  onSelect,
  onRectChange,
  onLabelChange,
  onPress,
  onRelease,
}: MomentaryRosMessageWidgetProps) {
  const [pressed, setPressed] = useState(false);
  const pressedRef = useRef(false);
  const onReleaseRef = useRef(onRelease);

  useEffect(() => {
    onReleaseRef.current = onRelease;
  }, [onRelease]);

  const beginPress = () => {
    if (pressedRef.current) return;
    pressedRef.current = true;
    setPressed(true);
    onPress();
  };

  const endPress = () => {
    if (!pressedRef.current) return;
    pressedRef.current = false;
    setPressed(false);
    onRelease();
  };

  useEffect(() => {
    return () => {
      if (!pressedRef.current) return;
      pressedRef.current = false;
      onReleaseRef.current();
    };
  }, []);

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    beginPress();
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    endPress();
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (!isActivationKey(event.key) || event.repeat) return;
    event.preventDefault();
    beginPress();
  };

  const handleKeyUp = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (!isActivationKey(event.key)) return;
    event.preventDefault();
    endPress();
  };

  const className = [
    "controls-action-button-widget",
    "tone-danger",
    pressed ? "is-active" : "",
  ]
    .join(" ")
    .trim();

  return (
    <CanvasItem
      x={widget.rect.x}
      y={widget.rect.y}
      w={widget.rect.w}
      h={widget.rect.h}
      onChange={onRectChange}
      onSelect={onSelect}
      selected={selected}
      minSize={{ w: 120, h: 52 }}
      className="controls-action-button-item"
    >
      <button
        type="button"
        className={className}
        data-canvas-interactive="true"
        aria-pressed={pressed}
        aria-label={`${widget.label} hold button`}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onLostPointerCapture={endPress}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onBlur={endPress}
      >
        <span className="controls-momentary-content">
          <span className="controls-momentary-label">
            <InlineEditableText value={widget.label} onCommit={onLabelChange} className="controls-inline-label" />
          </span>
          <span className={`controls-momentary-state ${pressed ? "is-on" : "is-off"}`}>
            {pressed ? "ON" : "OFF"}
          </span>
        </span>
      </button>
    </CanvasItem>
  );
}
