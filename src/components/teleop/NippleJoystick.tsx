import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

const clamp = (value: number, min = -1, max = 1) => Math.max(min, Math.min(max, value));

export type NippleJoystickProps = {
  onMove: (x: number, y: number) => void;
  onEnd?: () => void;
  color?: string;
  size?: number;
  deadzone?: number;
  className?: string;
};

export function NippleJoystick({
  onMove,
  onEnd,
  color = "#4a9eff",
  size = 160,
  deadzone = 0.1,
  className,
}: NippleJoystickProps) {
  const zoneRef = useRef<HTMLDivElement | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const onMoveRef = useRef(onMove);
  const onEndRef = useRef(onEnd);
  const [visualVector, setVisualVector] = useState({ x: 0, y: 0 });
  const knobDiameter = size * 0.33;
  const visualTravelRadius = Math.max(1, (size - knobDiameter) / 2);
  const axisActivationThreshold = 0.08;
  const visualMagnitude = Math.hypot(visualVector.x, visualVector.y);
  const isMovingOutsideDeadzone = visualMagnitude >= deadzone;
  const isHorizontalAxisActive = isMovingOutsideDeadzone && Math.abs(visualVector.y) <= axisActivationThreshold;
  const isVerticalAxisActive = isMovingOutsideDeadzone && Math.abs(visualVector.x) <= axisActivationThreshold;

  useEffect(() => {
    onMoveRef.current = onMove;
    onEndRef.current = onEnd;
  }, [onMove, onEnd]);

  const vectorFromPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = zoneRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const radius = Math.max(1, Math.min(rect.width, rect.height) / 2);
    const rawX = (event.clientX - centerX) / radius;
    const rawY = -(event.clientY - centerY) / radius;
    const magnitude = Math.hypot(rawX, rawY);
    const scale = magnitude > 1 ? 1 / magnitude : 1;
    return {
      x: clamp(rawX * scale),
      y: clamp(rawY * scale),
    };
  };

  const publishVector = (vector: { x: number; y: number }) => {
    setVisualVector(vector);
    const magnitude = Math.hypot(vector.x, vector.y);
    if (magnitude < deadzone) {
      onMoveRef.current(0, 0);
      return;
    }
    onMoveRef.current(vector.x, vector.y);
  };

  const endInteraction = () => {
    if (activePointerIdRef.current === null) return;
    activePointerIdRef.current = null;
    setVisualVector({ x: 0, y: 0 });
    if (onEndRef.current) {
      onEndRef.current();
    } else {
      onMoveRef.current(0, 0);
    }
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointerIdRef.current = event.pointerId;
    publishVector(vectorFromPointer(event));
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== event.pointerId) return;
    publishVector(vectorFromPointer(event));
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    endInteraction();
  };

  return (
    <div
      className={`joystick-shell ${className ?? ""}`.trim()}
      data-canvas-interactive="true"
      style={{
        ["--joy-size" as string]: `${size}px`,
        ["--joy-deadzone" as string]: `${deadzone}`,
        ["--joy-color" as string]: color,
        ["--joy-knob-size" as string]: `${knobDiameter}px`,
        ["--joy-x" as string]: `${visualVector.x * visualTravelRadius}px`,
        ["--joy-y" as string]: `${visualVector.y * -visualTravelRadius}px`,
      }}
    >
      <div className="joystick-deadzone" />
      <div
        className="joystick-zone"
        ref={zoneRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onLostPointerCapture={endInteraction}
      >
        <div className="joystick-back" />
        <div
          className={`joystick-axis-guide joystick-axis-guide-x ${
            isHorizontalAxisActive ? "joystick-axis-guide-active" : ""
          }`.trim()}
        />
        <div
          className={`joystick-axis-guide joystick-axis-guide-y ${
            isVerticalAxisActive ? "joystick-axis-guide-active" : ""
          }`.trim()}
        />
        <div className="joystick-front" />
      </div>
    </div>
  );
}
