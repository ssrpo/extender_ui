import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { CanvasItem } from "../layout/CanvasItem";
import type { CanvasRect } from "../layout/CanvasItem";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { InlineEditableText } from "./InlineEditableText";
import { selectModeLabel, useTeleopStore } from "../../store/teleopStore";
import { topicSnapshotKey, useUiStore } from "../../store/uiStore";
import { wsClient } from "../../services/wsClient";
import type { CSSProperties } from "react";
import type { WsTopicSnapshotMessage } from "../../types/ws";
import type {
  ButtonWidget as ButtonWidgetModel,
  CurvesWidget as CurvesWidgetModel,
  DrinkWidget as DrinkWidgetModel,
  GripperControlWidget as GripperControlWidgetModel,
  LogsWidget as LogsWidgetModel,
  MagnetControlWidget as MagnetControlWidgetModel,
  ModeButtonWidget as ModeButtonWidgetModel,
  MaxVelocityWidget as MaxVelocityWidgetModel,
  NavigationBarWidget as NavigationBarWidgetModel,
  NavigationButtonWidget as NavigationButtonWidgetModel,
  RosbagControlWidget as RosbagControlWidgetModel,
  StreamDisplayWidget as StreamDisplayWidgetModel,
  ThrowDrawWidget as ThrowDrawWidgetModel,
  TextareaWidget as TextareaWidgetModel,
  TextWidget as TextWidgetModel,
  TopicMonitorWidget as TopicMonitorWidgetModel,
  WidgetIcon,
} from "./widgetTypes";

type BaseWidgetProps = {
  selected: boolean;
  onSelect: () => void;
  onRectChange: (next: CanvasRect) => void;
};

type TextWidgetProps = BaseWidgetProps & {
  widget: TextWidgetModel;
  onTextChange: (nextText: string) => void;
};

type TextareaWidgetProps = BaseWidgetProps & {
  widget: TextareaWidgetModel;
  onTextChange: (nextText: string) => void;
};

type ActionButtonWidgetProps = BaseWidgetProps & {
  widget: ButtonWidgetModel;
  onLabelChange: (nextLabel: string) => void;
  onTrigger: () => void;
  disabled?: boolean;
  active?: boolean;
  tone?: "default" | "accent" | "success" | "danger";
};

type ModeButtonWidgetProps = BaseWidgetProps & {
  widget: ModeButtonWidgetModel;
  onLabelChange: (nextLabel: string) => void;
};

type NavigationButtonWidgetProps = BaseWidgetProps & {
  widget: NavigationButtonWidgetModel;
  onLabelChange: (nextLabel: string) => void;
  onNavigate: (screenId: string) => void;
  canNavigate: boolean;
};

type NavigationBarWidgetProps = BaseWidgetProps & {
  widget: NavigationBarWidgetModel;
  onNavigate: (screenId: string) => void;
  allowedScreenIds?: Set<string>;
};

type RosbagControlWidgetProps = BaseWidgetProps & {
  widget: RosbagControlWidgetModel;
  onLabelChange: (nextLabel: string) => void;
  isRecording: boolean;
  statusText: string;
  onToggleRecording: () => void;
};

type MaxVelocityWidgetProps = BaseWidgetProps & {
  widget: MaxVelocityWidgetModel;
  onLabelChange: (nextLabel: string) => void;
  value: number;
  onValueChange: (value: number) => void;
  valueLabel?: string;
  endpointLabels?: {
    left?: string;
    right?: string;
  };
  bubbleValueFormatter?: (value: number) => string;
  reverseDirection?: boolean;
  unsafeThreshold?: number;
};

type ThrowDrawWidgetProps = BaseWidgetProps & {
  widget: ThrowDrawWidgetModel;
  angleValue: number;
  durationValue: number;
  alphaValue?: number;
  onAlphaChange?: (nextAlpha: number) => void;
  onValueChange: (next: {
    angle?: number;
    duration?: number;
    powerPercent: number;
    alpha?: number;
    throwRequested?: boolean;
  }) => void;
};

type GripperControlWidgetProps = BaseWidgetProps & {
  widget: GripperControlWidgetModel;
  onLabelChange: (nextLabel: string) => void;
  onOpen: () => void;
  onClose: () => void;
  activeState?: "open" | "close" | null;
};

type MagnetControlWidgetProps = BaseWidgetProps & {
  widget: MagnetControlWidgetModel;
  onLabelChange: (nextLabel: string) => void;
  onActivate: () => void;
  onDeactivate: () => void;
  activeState?: "on" | "off" | null;
};

type StreamDisplayWidgetProps = BaseWidgetProps & {
  widget: StreamDisplayWidgetModel;
  onLabelChange: (nextLabel: string) => void;
  statusText: string;
};

type DrinkWidgetProps = BaseWidgetProps & {
  widget: DrinkWidgetModel;
  onLabelChange: (nextLabel: string) => void;
};

type CurvesWidgetProps = BaseWidgetProps & {
  widget: CurvesWidgetModel;
  onLabelChange: (nextLabel: string) => void;
};

type YouTubePlayerStateChangeEvent = {
  data: number;
};

type YouTubePlayer = {
  destroy: () => void;
};

type YouTubeApi = {
  Player: new (
    target: string | HTMLElement,
    options?: {
      events?: {
        onStateChange?: (event: YouTubePlayerStateChangeEvent) => void;
      };
    }
  ) => YouTubePlayer;
  PlayerState: {
    ENDED: number;
  };
};

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
    __extenderYouTubeApiPromise?: Promise<YouTubeApi>;
  }
}

type LogsWidgetProps = BaseWidgetProps & {
  widget: LogsWidgetModel;
  onLabelChange: (nextLabel: string) => void;
};

type TopicMonitorWidgetProps = BaseWidgetProps & {
  widget: TopicMonitorWidgetModel;
  onLabelChange: (nextLabel: string) => void;
};

const renderIcon = (icon: WidgetIcon) => {
  if (icon === "home") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 10.6L12 3l9 7.6" />
        <path d="M6.5 9.8V20h11V9.8" />
      </svg>
    );
  }
  if (icon === "save") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 4h11l3 3v13H5z" />
        <path d="M8 4v6h8V4" />
        <path d="M8 20v-6h8v6" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
};

const YOUTUBE_IFRAME_API_URL = "https://www.youtube.com/iframe_api";

const loadYouTubeApi = (): Promise<YouTubeApi> => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Window unavailable"));
  }
  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }
  if (window.__extenderYouTubeApiPromise) {
    return window.__extenderYouTubeApiPromise;
  }

  window.__extenderYouTubeApiPromise = new Promise<YouTubeApi>((resolve, reject) => {
    const resolveIfReady = () => {
      if (window.YT?.Player) {
        resolve(window.YT);
      }
    };
    const previousReadyCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReadyCallback?.();
      resolveIfReady();
    };

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${YOUTUBE_IFRAME_API_URL}"]`
    );
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = YOUTUBE_IFRAME_API_URL;
      script.async = true;
      script.onerror = () => reject(new Error("Failed to load YouTube iframe API"));
      document.head.appendChild(script);
    }

    if (window.YT?.Player) {
      resolve(window.YT);
    }
  });

  return window.__extenderYouTubeApiPromise;
};

const sanitizeYouTubeVideoId = (rawId: string): string | null => {
  const match = rawId.trim().match(/^[A-Za-z0-9_-]{11}$/);
  return match ? match[0] : null;
};

const extractYouTubeVideoId = (rawUrl: string): string | null => {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  const directId = sanitizeYouTubeVideoId(trimmed);
  if (directId) return directId;

  try {
    const parsed = new URL(trimmed);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (hostname === "youtu.be") {
      return sanitizeYouTubeVideoId(segments[0] ?? "");
    }

    const vParam = parsed.searchParams.get("v");
    if (vParam) return sanitizeYouTubeVideoId(vParam);

    if (
      hostname === "youtube.com" ||
      hostname === "m.youtube.com" ||
      hostname === "music.youtube.com" ||
      hostname === "youtube-nocookie.com"
    ) {
      if (segments[0] === "shorts" || segments[0] === "embed" || segments[0] === "v") {
        return sanitizeYouTubeVideoId(segments[1] ?? "");
      }
    }
  } catch {
    return null;
  }
  return null;
};

const resolveDrinkVideoEmbedUrl = (rawUrl: string, videoId: string | null) => {
  if (!videoId) return rawUrl.trim();
  const originQuery =
    typeof window !== "undefined" ? `&origin=${encodeURIComponent(window.location.origin)}` : "";
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1${originQuery}`;
};

export function TextWidget({
  widget,
  selected,
  onSelect,
  onRectChange,
  onTextChange,
}: TextWidgetProps) {
  return (
    <CanvasItem
      x={widget.rect.x}
      y={widget.rect.y}
      w={widget.rect.w}
      h={widget.rect.h}
      onChange={onRectChange}
      onSelect={onSelect}
      selected={selected}
      minSize={{ w: 120, h: 46 }}
      className="controls-text-item"
    >
      <div
        className={`controls-text-widget controls-align-${widget.align}`}
        style={{ fontSize: `${widget.fontSize}px` }}
      >
        <InlineEditableText value={widget.text} onCommit={onTextChange} className="controls-inline-label" />
      </div>
    </CanvasItem>
  );
}

export function TextareaWidget({
  widget,
  selected,
  onSelect,
  onRectChange,
  onTextChange,
}: TextareaWidgetProps) {
  return (
    <CanvasItem
      x={widget.rect.x}
      y={widget.rect.y}
      w={widget.rect.w}
      h={widget.rect.h}
      onChange={onRectChange}
      onSelect={onSelect}
      selected={selected}
      minSize={{ w: 140, h: 80 }}
      className="controls-textarea-item"
    >
      <div className="controls-textarea-widget" style={{ fontSize: `${widget.fontSize}px` }}>
        <InlineEditableText value={widget.text} onCommit={onTextChange} className="controls-inline-label" />
      </div>
    </CanvasItem>
  );
}

export function ActionButtonWidget({
  widget,
  selected,
  onSelect,
  onRectChange,
  onLabelChange,
  onTrigger,
  disabled = false,
  active = false,
  tone = "default",
}: ActionButtonWidgetProps) {
  const className = [
    "controls-action-button-widget",
    `tone-${tone}`,
    active ? "is-active" : "",
    disabled ? "is-disabled" : "",
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
      minSize={{ w: 92, h: 42 }}
      className="controls-action-button-item"
    >
      <button
        type="button"
        className={className}
        onClick={onTrigger}
        disabled={disabled}
        data-canvas-interactive="true"
      >
        <InlineEditableText value={widget.label} onCommit={onLabelChange} className="controls-inline-label" />
      </button>
    </CanvasItem>
  );
}

export function ModeButtonWidget({
  widget,
  selected,
  onSelect,
  onRectChange,
  onLabelChange,
}: ModeButtonWidgetProps) {
  const mode = useTeleopStore((s) => s.mode);
  const cycleMode = useTeleopStore((s) => s.cycleMode);
  const isBinaryModeButton = widget.label.toLowerCase().includes("b1");
  const modeLabel = selectModeLabel(mode);

  return (
    <CanvasItem
      x={widget.rect.x}
      y={widget.rect.y}
      w={widget.rect.w}
      h={widget.rect.h}
      onChange={onRectChange}
      onSelect={onSelect}
      selected={selected}
      minSize={{ w: 132, h: 42 }}
      className="controls-mode-button-item"
    >
      <button
        type="button"
        className={`controls-mode-button-widget ${isBinaryModeButton ? "is-binary-mode" : ""}`.trim()}
        data-canvas-interactive="true"
        onClick={cycleMode}
      >
        <span className="controls-mode-button-label">
          <InlineEditableText value={widget.label} onCommit={onLabelChange} className="controls-inline-label" />
        </span>
        {isBinaryModeButton ? (
          <span className="controls-mode-options" aria-label={`Mode actif ${modeLabel}`}>
            {(["B1", "B2"] as const).map((label) => (
              <span
                key={label}
                className={`controls-mode-option ${modeLabel === label ? "is-active" : ""}`.trim()}
              >
                {label}
              </span>
            ))}
          </span>
        ) : (
          <span className="controls-mode-button-value">{modeLabel}</span>
        )}
      </button>
    </CanvasItem>
  );
}

export function NavigationButtonWidget({
  widget,
  selected,
  onSelect,
  onRectChange,
  onLabelChange,
  onNavigate,
  canNavigate,
}: NavigationButtonWidgetProps) {
  return (
    <CanvasItem
      x={widget.rect.x}
      y={widget.rect.y}
      w={widget.rect.w}
      h={widget.rect.h}
      onChange={onRectChange}
      onSelect={onSelect}
      selected={selected}
      minSize={{ w: 110, h: 42 }}
      className="controls-navigation-button-item"
    >
      <button
        type="button"
        className="controls-navigation-button-widget"
        disabled={!canNavigate || !widget.targetScreenId}
        onClick={() => onNavigate(widget.targetScreenId)}
      >
        <span className="controls-navigation-icon">{renderIcon(widget.icon)}</span>
        <span className="controls-navigation-label">
          <InlineEditableText value={widget.label} onCommit={onLabelChange} className="controls-inline-label" />
        </span>
      </button>
    </CanvasItem>
  );
}

export function NavigationBarWidget({
  widget,
  selected,
  onSelect,
  onRectChange,
  onNavigate,
  allowedScreenIds,
}: NavigationBarWidgetProps) {
  return (
    <CanvasItem
      x={widget.rect.x}
      y={widget.rect.y}
      w={widget.rect.w}
      h={widget.rect.h}
      onChange={onRectChange}
      onSelect={onSelect}
      selected={selected}
      minSize={{ w: 150, h: 80 }}
      className="controls-navigation-bar-item"
    >
      <div
        className={`controls-navigation-bar-widget ${
          widget.orientation === "horizontal" ? "is-horizontal" : "is-vertical"
        }`}
      >
        {widget.items.length === 0 ? (
          <div className="controls-navigation-empty">No links configured.</div>
        ) : (
          widget.items.map((item) => {
            const allowed = allowedScreenIds ? allowedScreenIds.has(item.targetScreenId) : true;
            return (
              <button
                key={item.id}
                type="button"
                className="controls-navigation-link"
                disabled={!allowed || !item.targetScreenId}
                onClick={() => onNavigate(item.targetScreenId)}
              >
                {item.label}
              </button>
            );
          })
        )}
      </div>
    </CanvasItem>
  );
}

export function RosbagControlWidget({
  widget,
  selected,
  onSelect,
  onRectChange,
  onLabelChange,
  isRecording,
  statusText,
  onToggleRecording,
}: RosbagControlWidgetProps) {
  return (
    <CanvasItem
      x={widget.rect.x}
      y={widget.rect.y}
      w={widget.rect.w}
      h={widget.rect.h}
      onChange={onRectChange}
      onSelect={onSelect}
      selected={selected}
      minSize={{ w: 220, h: 120 }}
      className="controls-rosbag-item"
    >
      <div className="controls-rosbag-widget">
        <div className="controls-rosbag-title">
          <InlineEditableText value={widget.label} onCommit={onLabelChange} className="controls-inline-label" />
        </div>
        <div className="controls-rosbag-status-row">
          <span className={`controls-rosbag-led ${isRecording ? "is-on" : "is-off"}`} />
          <span className="controls-rosbag-status">{statusText}</span>
        </div>
        <div className="controls-rosbag-meta">
          <div>name: {widget.bagName || "n/a"}</div>
          <div>auto timestamp: {widget.autoTimestamp ? "on" : "off"}</div>
        </div>
        <button
          type="button"
          className={`controls-rosbag-toggle ${isRecording ? "is-stop" : "is-start"}`}
          onClick={onToggleRecording}
        >
          {isRecording ? "Stop recording" : "Start recording"}
        </button>
      </div>
    </CanvasItem>
  );
}

export function MaxVelocityWidget({
  widget,
  selected,
  onSelect,
  onRectChange,
  onLabelChange,
  value,
  onValueChange,
  valueLabel,
  endpointLabels,
  bubbleValueFormatter,
  reverseDirection = false,
  unsafeThreshold,
}: MaxVelocityWidgetProps) {
  const sliderSpan = Math.max(1e-6, widget.max - widget.min);
  const normalizedValue = Math.max(0, Math.min(1, (value - widget.min) / sliderSpan));
  const thumbRatio = reverseDirection ? 1 - normalizedValue : normalizedValue;
  const thumbPercent = `${thumbRatio * 100}%`;
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const leftEndpointValue = reverseDirection ? widget.max : widget.min;
  const rightEndpointValue = reverseDirection ? widget.min : widget.max;
  const clampToRange = (raw: number) => Math.max(widget.min, Math.min(widget.max, raw));
  const snapToStep = (raw: number) => {
    const step = widget.step > 0 ? widget.step : 0.01;
    const stepped = widget.min + Math.round((raw - widget.min) / step) * step;
    const decimals = Math.max(0, Math.min(6, (step.toString().split(".")[1] ?? "").length));
    return Number(clampToRange(stepped).toFixed(decimals));
  };
  const valueFromClientX = (clientX: number) => {
    const rect = sliderRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return value;
    const visualRatio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const valueRatio = reverseDirection ? 1 - visualRatio : visualRatio;
    return snapToStep(widget.min + valueRatio * sliderSpan);
  };
  const updateFromPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    onValueChange(valueFromClientX(event.clientX));
  };
  const formatCompactValue = (raw: number) => {
    const rounded = Math.round(raw * 100) / 100;
    if (Number.isInteger(rounded)) return `${rounded}`;
    return rounded.toFixed(2).replace(/\.?0+$/, "");
  };
  const hasUnsafeSegment =
    typeof unsafeThreshold === "number" &&
    Number.isFinite(unsafeThreshold) &&
    unsafeThreshold > widget.min &&
    unsafeThreshold < widget.max;
  const warningStartRatio = hasUnsafeSegment
    ? (unsafeThreshold - widget.min) / (widget.max - widget.min)
    : 0;
  const warningStartPercent = `${Math.max(0, Math.min(1, warningStartRatio)) * 100}%`;
  const trackStyle: CSSProperties | undefined = hasUnsafeSegment
    ? ({
        "--slider-warning-start": warningStartPercent,
        "--slider-warning-direction": reverseDirection ? "to left" : "to right",
      } as CSSProperties)
    : undefined;
  const isUnsafeValue =
    typeof unsafeThreshold === "number" && Number.isFinite(unsafeThreshold) && value > unsafeThreshold;

  return (
    <CanvasItem
      x={widget.rect.x}
      y={widget.rect.y}
      w={widget.rect.w}
      h={widget.rect.h}
      onChange={onRectChange}
      onSelect={onSelect}
      selected={selected}
      minSize={{ w: 180, h: 76 }}
      className="controls-max-velocity-item"
    >
      <div className="controls-max-velocity-widget">
        <div className="controls-max-velocity-title">
          <InlineEditableText value={widget.label} onCommit={onLabelChange} className="controls-inline-label" />
        </div>
        <div className="controls-max-velocity-slider-shell">
          <div className="controls-max-velocity-bubble" style={{ left: thumbPercent }}>
            {bubbleValueFormatter ? bubbleValueFormatter(value) : formatCompactValue(value)}
          </div>
          <div
            ref={sliderRef}
            className={`slider controls-max-velocity-slider ${hasUnsafeSegment ? "slider-with-unsafe-zone" : ""}`.trim()}
            data-canvas-interactive="true"
            role="slider"
            tabIndex={0}
            aria-valuemin={widget.min}
            aria-valuemax={widget.max}
            aria-valuenow={clampToRange(value)}
            aria-valuetext={bubbleValueFormatter ? bubbleValueFormatter(value) : formatCompactValue(value)}
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              event.preventDefault();
              event.currentTarget.setPointerCapture(event.pointerId);
              activePointerIdRef.current = event.pointerId;
              updateFromPointer(event);
            }}
            onPointerMove={(event) => {
              if (activePointerIdRef.current !== event.pointerId) return;
              updateFromPointer(event);
            }}
            onPointerUp={(event) => {
              if (activePointerIdRef.current !== event.pointerId) return;
              activePointerIdRef.current = null;
              event.currentTarget.releasePointerCapture(event.pointerId);
            }}
            onPointerCancel={(event) => {
              if (activePointerIdRef.current !== event.pointerId) return;
              activePointerIdRef.current = null;
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
              }
            }}
            onKeyDown={(event: ReactKeyboardEvent<HTMLDivElement>) => {
              const step = widget.step > 0 ? widget.step : 0.01;
              if (event.key === "Home") {
                event.preventDefault();
                onValueChange(reverseDirection ? widget.max : widget.min);
                return;
              }
              if (event.key === "End") {
                event.preventDefault();
                onValueChange(reverseDirection ? widget.min : widget.max);
                return;
              }
              const direction =
                event.key === "ArrowRight" || event.key === "ArrowUp"
                  ? 1
                  : event.key === "ArrowLeft" || event.key === "ArrowDown"
                    ? -1
                    : 0;
              if (!direction) return;
              event.preventDefault();
              onValueChange(snapToStep(value + direction * step * (reverseDirection ? -1 : 1)));
            }}
          >
            <div className="slider-track controls-max-velocity-track" style={trackStyle}>
              <div className="slider-range controls-max-velocity-range" style={{ width: thumbPercent }} />
            </div>
            <div className="slider-thumb controls-max-velocity-thumb" style={{ left: thumbPercent }} />
          </div>
          <div className="controls-max-velocity-endpoints">
            <span>{endpointLabels?.left || formatCompactValue(leftEndpointValue)}</span>
            <span>{endpointLabels?.right || formatCompactValue(rightEndpointValue)}</span>
          </div>
        </div>
        {valueLabel || isUnsafeValue ? (
          <div className={`controls-max-velocity-value ${isUnsafeValue ? "is-unsafe" : ""}`.trim()}>
            {valueLabel ? <span>{valueLabel}</span> : null}
            {isUnsafeValue ? (
              <span className="controls-max-velocity-warning">unsafe range</span>
            ) : null}
          </div>
        ) : null}
      </div>
    </CanvasItem>
  );
}

export function ThrowDrawWidget({
  widget,
  selected,
  onSelect,
  onRectChange,
  angleValue,
  durationValue,
  alphaValue,
  onAlphaChange,
  onValueChange,
}: ThrowDrawWidgetProps) {
  type ThrowHistoryEntry = {
    id: string;
    angle: number;
    duration: number;
    powerPercent: number;
    alpha?: number;
  };

  const angleMin = Math.min(widget.angleMin, widget.angleMax);
  const angleMax = Math.max(widget.angleMin, widget.angleMax);
  const angleSpan = Math.max(1e-6, angleMax - angleMin);
  const durationMin = Math.min(widget.durationMin, widget.durationMax);
  const durationMax = Math.max(widget.durationMin, widget.durationMax);
  const durationSpan = Math.max(1e-6, durationMax - durationMin);
  const hasAlphaControl = typeof widget.alphaTopic === "string" && widget.alphaTopic.trim().length > 0;
  const alphaMin = Math.min(widget.alphaMin ?? 0, widget.alphaMax ?? 40);
  const alphaMax = Math.max(widget.alphaMin ?? 0, widget.alphaMax ?? 40);
  const alphaSpan = Math.max(1e-6, alphaMax - alphaMin);
  const alphaSafeMax = widget.alphaSafeMax ?? 20;
  const holdToHighPowerMs = Math.max(3400, widget.holdToMaxMs * 2.7);
  const holdTailMs = Math.max(2200, widget.holdToMaxMs * 1.9);
  const chargeGraceMs = 360;
  const chargeSaturationGain = 3.6;
  const chargeCurveGamma = 1.28;
  const maxEasyPowerPercent = 94;
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
  // Expand the drawable sector for accessibility while preserving real command range.
  const drawAngleScale = 3.6;
  const drawAngleHalfSpan = Math.min(
    Math.PI * 0.48,
    Math.max(Math.abs(angleMin), Math.abs(angleMax), 0.02) * drawAngleScale
  );
  const drawAngleMin = -drawAngleHalfSpan;
  const drawAngleMax = drawAngleHalfSpan;
  const drawAngleSpan = Math.max(1e-6, drawAngleMax - drawAngleMin);
  const mapDrawAngleToActual = (drawAngle: number) => {
    const clampedDrawAngle = clamp(drawAngle, drawAngleMin, drawAngleMax);
    const t = (clampedDrawAngle - drawAngleMin) / drawAngleSpan;
    return clamp(angleMin + t * angleSpan, angleMin, angleMax);
  };
  const mapActualAngleToDraw = (actualAngle: number) => {
    const clampedActualAngle = clamp(actualAngle, angleMin, angleMax);
    const t = (clampedActualAngle - angleMin) / angleSpan;
    return clamp(drawAngleMin + t * drawAngleSpan, drawAngleMin, drawAngleMax);
  };
  const toPowerPercent = (duration: number) =>
    clamp(((durationMax - duration) / durationSpan) * 100, 0, 100);
  const toDuration = (powerPercent: number) =>
    clamp(durationMax - (clamp(powerPercent, 0, 100) / 100) * durationSpan, durationMin, durationMax);
  const toChargedPowerPercent = (elapsedMs: number) => {
    const activeMs = Math.max(0, elapsedMs - chargeGraceMs);
    const primaryProgress = clamp(activeMs / holdToHighPowerMs, 0, 1);
    const normalizedSaturation =
      (1 - Math.exp(-chargeSaturationGain * primaryProgress)) / (1 - Math.exp(-chargeSaturationGain));
    const basePower = maxEasyPowerPercent * Math.pow(normalizedSaturation, chargeCurveGamma);
    if (activeMs <= holdToHighPowerMs) {
      return clamp(basePower, 0, maxEasyPowerPercent);
    }
    // Extra hold time adds power more slowly near the maximum.
    const tailProgress = clamp((activeMs - holdToHighPowerMs) / holdTailMs, 0, 1);
    const tailPower =
      (100 - maxEasyPowerPercent) * ((1 - Math.exp(-4 * tailProgress)) / (1 - Math.exp(-4)));
    return clamp(basePower + tailPower, 0, 100);
  };

  const [angle, setAngle] = useState(() => clamp(angleValue, angleMin, angleMax));
  const initialPowerPercent = toPowerPercent(durationValue);
  const [powerPercent, setPowerPercent] = useState(() => initialPowerPercent);
  const [alpha, setAlpha] = useState(() =>
    clamp(typeof alphaValue === "number" ? alphaValue : alphaMin, alphaMin, alphaMax)
  );
  const [padSize, setPadSize] = useState({ w: 640, h: 360 });
  const [alphaPadSize, setAlphaPadSize] = useState({ w: 170, h: 280 });
  const [isDraggingAngle, setIsDraggingAngle] = useState(false);
  const [isChargingPower, setIsChargingPower] = useState(false);
  const [isDraggingAlpha, setIsDraggingAlpha] = useState(false);
  const [hasAngleSelection, setHasAngleSelection] = useState(false);
  const [isArcLocked, setIsArcLocked] = useState(false);
  const [gestureTrail, setGestureTrail] = useState<Array<{ x: number; y: number }>>([]);
  const [throwHistory, setThrowHistory] = useState<ThrowHistoryEntry[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [activePointerId, setActivePointerId] = useState<number | null>(null);
  const [activeAlphaPointerId, setActiveAlphaPointerId] = useState<number | null>(null);
  const padRef = useRef<HTMLDivElement | null>(null);
  const alphaPadRef = useRef<HTMLDivElement | null>(null);
  const chargeStartRef = useRef<number | null>(null);
  const chargeRafRef = useRef<number | null>(null);
  const powerPercentRef = useRef(initialPowerPercent);
  const arcLockedRef = useRef(false);

  const setPowerPercentValue = (nextPowerPercent: number) => {
    powerPercentRef.current = nextPowerPercent;
    setPowerPercent(nextPowerPercent);
  };
  const toAlphaDrawAngle = (value: number) =>
    clamp(((clamp(value, alphaMin, alphaMax) - alphaMin) / alphaSpan) * (Math.PI / 2), 0, Math.PI / 2);
  const drawAngleToAlpha = (drawAngle: number) =>
    clamp(alphaMin + (clamp(drawAngle, 0, Math.PI / 2) / (Math.PI / 2)) * alphaSpan, alphaMin, alphaMax);
  const setArcLocked = (nextLocked: boolean) => {
    arcLockedRef.current = nextLocked;
    setIsArcLocked(nextLocked);
  };

  const originX = padSize.w / 2;
  const originY = padSize.h * 0.9;
  const radius = Math.max(56, Math.min(padSize.w * 0.47, padSize.h * 0.88));
  const alphaPadOriginX = Math.max(18, alphaPadSize.w * 0.18);
  const alphaPadOriginY = alphaPadSize.h * 0.9;
  const alphaRadius = Math.max(
    34,
    Math.min(alphaPadSize.w - alphaPadOriginX - 12, alphaPadOriginY - 14)
  );
  const nearArcThreshold = radius * 0.9;

  useEffect(() => {
    if (!isDraggingAngle) {
      setAngle(clamp(angleValue, angleMin, angleMax));
    }
  }, [angleValue, angleMin, angleMax, isDraggingAngle]);

  useEffect(() => {
    if (isDraggingAlpha) return;
    if (typeof alphaValue === "number") {
      setAlpha(clamp(alphaValue, alphaMin, alphaMax));
    }
  }, [alphaMax, alphaMin, alphaValue, isDraggingAlpha]);

  useEffect(() => {
    if (hasAngleSelection || isDraggingAngle) return;
    if (Math.abs(angleValue) > 1e-4) {
      setHasAngleSelection(true);
    }
  }, [angleValue, hasAngleSelection, isDraggingAngle]);

  useEffect(() => {
    if (!isChargingPower) {
      setPowerPercentValue(toPowerPercent(durationValue));
    }
  }, [durationValue, durationMin, durationMax, isChargingPower]);

  useEffect(() => {
    const node = padRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setPadSize({
        w: Math.max(80, entry.contentRect.width),
        h: Math.max(80, entry.contentRect.height),
      });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const node = alphaPadRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setAlphaPadSize({
        w: Math.max(110, entry.contentRect.width),
        h: Math.max(180, entry.contentRect.height),
      });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasAlphaControl]);

  useEffect(() => {
    return () => {
      if (chargeRafRef.current !== null) {
        window.cancelAnimationFrame(chargeRafRef.current);
      }
    };
  }, []);

  const startPowerInference = () => {
    if (chargeStartRef.current !== null) return;
    chargeStartRef.current = performance.now();
    setIsChargingPower(true);
    setPowerPercentValue(0);
    onValueChange({ duration: toDuration(0), powerPercent: 0 });

    const step = (now: number) => {
      if (chargeStartRef.current === null) return;
      const elapsedMs = now - chargeStartRef.current;
      const nextPowerPercent = toChargedPowerPercent(elapsedMs);
      setPowerPercentValue(nextPowerPercent);
      onValueChange({
        duration: toDuration(nextPowerPercent),
        powerPercent: nextPowerPercent,
      });
      if (nextPowerPercent < 99.95 && chargeStartRef.current !== null) {
        chargeRafRef.current = window.requestAnimationFrame(step);
      }
    };
    chargeRafRef.current = window.requestAnimationFrame(step);
  };

  const updateAlphaFromPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!hasAlphaControl || !onAlphaChange) return;
    const rect = alphaPadRef.current?.getBoundingClientRect() ?? event.currentTarget.getBoundingClientRect();
    const scaleX = alphaPadSize.w / Math.max(1, rect.width);
    const scaleY = alphaPadSize.h / Math.max(1, rect.height);
    const localX = clamp((event.clientX - rect.left) * scaleX, 0, alphaPadSize.w);
    const localY = clamp((event.clientY - rect.top) * scaleY, 0, alphaPadSize.h);
    const dx = localX - alphaPadOriginX;
    const dy = alphaPadOriginY - localY;
    const drawAngle = clamp(Math.atan2(dy, Math.max(1e-6, dx)), 0, Math.PI / 2);
    const nextAlpha = drawAngleToAlpha(drawAngle);
    setAlpha(nextAlpha);
    onAlphaChange(nextAlpha);
    onValueChange({
      alpha: nextAlpha,
      powerPercent: powerPercentRef.current,
    });
  };

  const updateGestureFromPointer = (
    event: ReactPointerEvent<HTMLDivElement>,
    options?: { startNewTrail?: boolean }
  ) => {
    const rect = padRef.current?.getBoundingClientRect();
    if (!rect) return false;
    const scaleX = padSize.w / Math.max(1, rect.width);
    const scaleY = padSize.h / Math.max(1, rect.height);
    const localX = clamp((event.clientX - rect.left) * scaleX, 0, padSize.w);
    const localY = clamp((event.clientY - rect.top) * scaleY, 0, padSize.h);
    setGestureTrail((prev) => {
      if (options?.startNewTrail) {
        return [{ x: localX, y: localY }];
      }
      const last = prev[prev.length - 1];
      if (last && Math.hypot(localX - last.x, localY - last.y) < 4) {
        return prev;
      }
      const next = [...prev, { x: localX, y: localY }];
      if (next.length > 120) {
        next.shift();
      }
      return next;
    });

    const dx = localX - originX;
    const dy = originY - localY;
    const radialDistance = Math.hypot(dx, dy);
    const shouldLockNow = !isArcLocked && radialDistance >= nearArcThreshold;
    const isLocked = isArcLocked || shouldLockNow;
    if (!isLocked) return false;

    if (shouldLockNow) {
      setArcLocked(true);
      setHasAngleSelection(true);
      startPowerInference();
    }

    const rawDrawAngle = Math.atan2(dx, Math.max(1e-6, dy));
    const mappedAngle = mapDrawAngleToActual(rawDrawAngle);
    setAngle(mappedAngle);
    onValueChange({ angle: mappedAngle, powerPercent: powerPercentRef.current });
    return true;
  };

  const stopPowerCharge = () => {
    chargeStartRef.current = null;
    if (chargeRafRef.current !== null) {
      window.cancelAnimationFrame(chargeRafRef.current);
      chargeRafRef.current = null;
    }
    setIsChargingPower(false);
  };

  const finishPowerInference = (triggerThrow: boolean) => {
    const wasCharging = chargeStartRef.current !== null;
    stopPowerCharge();
    if (!triggerThrow || !wasCharging) return;
    const finalPowerPercent = clamp(powerPercentRef.current, 0, 100);
    const finalDuration = toDuration(finalPowerPercent);
    const finalAngle = clamp(angle, angleMin, angleMax);
    const historyEntry: ThrowHistoryEntry = {
      id: `throw-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      angle: finalAngle,
      duration: finalDuration,
      powerPercent: finalPowerPercent,
      alpha: hasAlphaControl ? alpha : undefined,
    };
    setThrowHistory((prev) => [historyEntry, ...prev].slice(0, 5));
    setSelectedHistoryId(historyEntry.id);
    onValueChange({
      angle: finalAngle,
      duration: finalDuration,
      powerPercent: finalPowerPercent,
      alpha: hasAlphaControl ? alpha : undefined,
      throwRequested: true,
    });
  };

  const pointForAngle = (angleValueRad: number, scale = 1) => ({
    x: originX + Math.sin(angleValueRad) * radius * scale,
    y: originY - Math.cos(angleValueRad) * radius * scale,
  });
  const minPoint = pointForAngle(drawAngleMin);
  const maxPoint = pointForAngle(drawAngleMax);
  const currentPoint = pointForAngle(mapActualAngleToDraw(angle), 0.9);
  const arcPath = `M ${minPoint.x} ${minPoint.y} A ${radius} ${radius} 0 0 1 ${maxPoint.x} ${maxPoint.y}`;
  const trailPoints = gestureTrail.map((point) => `${point.x},${point.y}`).join(" ");
  const alphaPointForDrawAngle = (drawAngle: number, scale = 0.9) => ({
    x: alphaPadOriginX + Math.cos(drawAngle) * alphaRadius * scale,
    y: alphaPadOriginY - Math.sin(drawAngle) * alphaRadius * scale,
  });
  const alphaMinPoint = alphaPointForDrawAngle(0, 1);
  const alphaMaxPoint = alphaPointForDrawAngle(Math.PI / 2, 1);
  const alphaSafePoint = alphaPointForDrawAngle(
    toAlphaDrawAngle(clamp(alphaSafeMax, alphaMin, alphaMax)),
    0.96
  );
  const alphaCurrentPoint = alphaPointForDrawAngle(toAlphaDrawAngle(alpha), 0.92);
  const alphaArcPath = `M ${alphaMinPoint.x} ${alphaMinPoint.y} A ${alphaRadius} ${alphaRadius} 0 0 0 ${alphaMaxPoint.x} ${alphaMaxPoint.y}`;
  const showLockedLine = hasAngleSelection && (!isDraggingAngle || isArcLocked);
  const applyHistoryPreset = (entry: ThrowHistoryEntry) => {
    stopPowerCharge();
    setIsDraggingAngle(false);
    setActivePointerId(null);
    setGestureTrail([]);
    setArcLocked(false);
    setHasAngleSelection(true);
    setSelectedHistoryId(entry.id);
    setAngle(clamp(entry.angle, angleMin, angleMax));
    setPowerPercentValue(clamp(entry.powerPercent, 0, 100));
    if (hasAlphaControl && typeof entry.alpha === "number") {
      const nextAlpha = clamp(entry.alpha, alphaMin, alphaMax);
      setAlpha(nextAlpha);
      onAlphaChange?.(nextAlpha);
    }
    onValueChange({
      angle: clamp(entry.angle, angleMin, angleMax),
      duration: clamp(entry.duration, durationMin, durationMax),
      powerPercent: clamp(entry.powerPercent, 0, 100),
      alpha:
        hasAlphaControl && typeof entry.alpha === "number"
          ? clamp(entry.alpha, alphaMin, alphaMax)
          : undefined,
    });
  };
  const hintText = isChargingPower
      ? "Hold to increase power, then lacher to throw."
    : isDraggingAngle && !isArcLocked
      ? "Draw path until the arc to lock angle."
      : hasAlphaControl && !hasAngleSelection
        ? "Draw alpha on the left, then draw to throw."
      : selectedHistoryId
        ? "Preset selected. You can test then draw+hold to throw."
      : hasAngleSelection
        ? "Ready: draw and hold again to throw, or Reset."
        : "Draw the initial path to select angle.";
  const hintClassName = `controls-throw-draw-hint ${isChargingPower ? "is-active" : ""}`.trim();

  return (
    <CanvasItem
      x={widget.rect.x}
      y={widget.rect.y}
      w={widget.rect.w}
      h={widget.rect.h}
      onChange={onRectChange}
      onSelect={onSelect}
      selected={selected}
      minSize={{ w: 300, h: 220 }}
      className="controls-throw-draw-item"
    >
      <div className="controls-throw-draw-widget">
        <div className="controls-throw-draw-toolbar">
          <div className="controls-throw-draw-readout">
            <span>{((angle * 180) / Math.PI).toFixed(1)}°</span>
            <span>{Math.round(powerPercent)}%</span>
          </div>
          <button
            type="button"
            className="controls-throw-draw-reset"
            data-canvas-interactive="true"
            onPointerDown={(event) => {
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.stopPropagation();
              stopPowerCharge();
              setHasAngleSelection(false);
              setArcLocked(false);
              setIsDraggingAngle(false);
              setIsDraggingAlpha(false);
              setActivePointerId(null);
              setActiveAlphaPointerId(null);
              setGestureTrail([]);
              setSelectedHistoryId(null);
              const resetAngle = clamp(0, angleMin, angleMax);
              setAngle(resetAngle);
              setPowerPercentValue(0);
              onValueChange({
                angle: resetAngle,
                duration: toDuration(0),
                powerPercent: 0,
              });
            }}
          >
            Reset
          </button>
        </div>
        <div className={`controls-throw-draw-main ${hasAlphaControl ? "has-alpha" : ""}`.trim()}>
          {hasAlphaControl ? (
            <div className="controls-throw-draw-alpha" data-canvas-interactive="true">
              <div
                ref={alphaPadRef}
                className="controls-throw-draw-alpha-pad"
                onPointerDown={(event) => {
                  event.stopPropagation();
                  event.preventDefault();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  setIsDraggingAlpha(true);
                  setActiveAlphaPointerId(event.pointerId);
                  updateAlphaFromPointer(event);
                }}
                onPointerMove={(event) => {
                  if (!isDraggingAlpha) return;
                  if (activeAlphaPointerId !== null && event.pointerId !== activeAlphaPointerId) return;
                  event.stopPropagation();
                  updateAlphaFromPointer(event);
                }}
                onPointerUp={(event) => {
                  if (activeAlphaPointerId !== null && event.pointerId !== activeAlphaPointerId) return;
                  event.stopPropagation();
                  setIsDraggingAlpha(false);
                  setActiveAlphaPointerId(null);
                }}
                onPointerCancel={(event) => {
                  if (activeAlphaPointerId !== null && event.pointerId !== activeAlphaPointerId) return;
                  event.stopPropagation();
                  setIsDraggingAlpha(false);
                  setActiveAlphaPointerId(null);
                }}
              >
                <svg
                  className="controls-throw-draw-alpha-svg"
                  viewBox={`0 0 ${alphaPadSize.w} ${alphaPadSize.h}`}
                  preserveAspectRatio="none"
                >
                  <path className="controls-throw-draw-alpha-sector" d={alphaArcPath} />
                  <line
                    className="controls-throw-draw-alpha-axis"
                    x1={alphaPadOriginX}
                    y1={alphaPadOriginY}
                    x2={alphaMinPoint.x}
                    y2={alphaMinPoint.y}
                  />
                  <line
                    className="controls-throw-draw-alpha-axis"
                    x1={alphaPadOriginX}
                    y1={alphaPadOriginY}
                    x2={alphaMaxPoint.x}
                    y2={alphaMaxPoint.y}
                  />
                  <line
                    className="controls-throw-draw-alpha-safe-vector"
                    x1={alphaPadOriginX}
                    y1={alphaPadOriginY}
                    x2={alphaSafePoint.x}
                    y2={alphaSafePoint.y}
                  />
                  <line
                    className="controls-throw-draw-alpha-vector"
                    x1={alphaPadOriginX}
                    y1={alphaPadOriginY}
                    x2={alphaCurrentPoint.x}
                    y2={alphaCurrentPoint.y}
                  />
                  <circle className="controls-throw-draw-alpha-origin" cx={alphaPadOriginX} cy={alphaPadOriginY} r={6} />
                  <circle
                    className="controls-throw-draw-alpha-target"
                    cx={alphaCurrentPoint.x}
                    cy={alphaCurrentPoint.y}
                    r={Math.max(8, alphaRadius * 0.08)}
                  />
                  <text
                    className="controls-throw-draw-alpha-label controls-throw-draw-alpha-label-pointer"
                    x={Math.max(8, alphaMaxPoint.x - 10)}
                    y={Math.max(16, alphaMaxPoint.y - 10)}
                    textAnchor="start"
                  >
                    Pointer
                  </text>
                  <text
                    className="controls-throw-draw-alpha-label controls-throw-draw-alpha-label-pointer"
                    x={alphaPadSize.w - 10}
                    y={alphaPadSize.h - 12}
                    textAnchor="end"
                  >
                    Tirer
                  </text>
                </svg>
              </div>
              <div className={`controls-throw-draw-alpha-value ${alpha > alphaSafeMax ? "is-unsafe" : ""}`.trim()}>
                {alpha.toFixed(1)}°
              </div>
            </div>
          ) : null}
          <div className="controls-throw-draw-left">
            <div
              ref={padRef}
              className="controls-throw-draw-pad"
              data-canvas-interactive="true"
              onPointerDown={(event) => {
                event.stopPropagation();
                event.preventDefault();
                event.currentTarget.setPointerCapture(event.pointerId);
                setIsDraggingAngle(true);
                setActivePointerId(event.pointerId);
                stopPowerCharge();
                setArcLocked(false);
                setGestureTrail([]);
                updateGestureFromPointer(event, { startNewTrail: true });
              }}
              onPointerMove={(event) => {
                if (!isDraggingAngle) return;
                if (activePointerId !== null && event.pointerId !== activePointerId) return;
                event.stopPropagation();
                updateGestureFromPointer(event);
              }}
              onPointerUp={(event) => {
                if (activePointerId !== null && event.pointerId !== activePointerId) return;
                event.stopPropagation();
                setIsDraggingAngle(false);
                setActivePointerId(null);
                finishPowerInference(arcLockedRef.current);
                setArcLocked(false);
                setGestureTrail([]);
              }}
              onPointerCancel={(event) => {
                if (activePointerId !== null && event.pointerId !== activePointerId) return;
                setIsDraggingAngle(false);
                setActivePointerId(null);
                finishPowerInference(false);
                setArcLocked(false);
                setGestureTrail([]);
              }}
            >
              <svg
                className="controls-throw-draw-svg"
                viewBox={`0 0 ${padSize.w} ${padSize.h}`}
                preserveAspectRatio="none"
              >
                <path className="controls-throw-draw-sector" d={arcPath} />
                <line className="controls-throw-draw-limit" x1={originX} y1={originY} x2={minPoint.x} y2={minPoint.y} />
                <line className="controls-throw-draw-limit" x1={originX} y1={originY} x2={maxPoint.x} y2={maxPoint.y} />
                <line
                  className="controls-throw-draw-centerline"
                  x1={originX}
                  y1={originY}
                  x2={originX}
                  y2={Math.max(16, originY - radius * 1.03)}
                />
                {isDraggingAngle && !isArcLocked && gestureTrail.length > 1 ? (
                  <polyline className="controls-throw-draw-trail" points={trailPoints} />
                ) : null}
                <line
                  className="controls-throw-draw-vector"
                  x1={originX}
                  y1={originY}
                  x2={currentPoint.x}
                  y2={currentPoint.y}
                  style={{ opacity: showLockedLine ? 1 : 0 }}
                />
                <circle
                  className="controls-throw-draw-target"
                  cx={currentPoint.x}
                  cy={currentPoint.y}
                  r={Math.max(10, radius * 0.04)}
                  style={{ opacity: showLockedLine ? 1 : 0 }}
                />
              </svg>
              <div className={hintClassName}>{hintText}</div>
            </div>
            <div className="controls-throw-draw-power-row">
              <span>Power</span>
              <div className="controls-throw-draw-power-track">
                <div className="controls-throw-draw-power-fill" style={{ width: `${powerPercent}%` }} />
              </div>
              <span>{Math.round(powerPercent)}%</span>
            </div>
          </div>
          <aside className="controls-throw-draw-history" data-canvas-interactive="true">
            <div className="controls-throw-draw-history-title">Last 5 Throws</div>
            {throwHistory.length === 0 ? (
              <div className="controls-throw-draw-history-empty">No throw history yet.</div>
            ) : (
              <div className="controls-throw-draw-history-list">
                {throwHistory.map((entry, index) => (
                  <button
                    key={entry.id}
                    type="button"
                    className={`controls-throw-draw-history-item ${selectedHistoryId === entry.id ? "is-selected" : ""}`.trim()}
                    onClick={(event) => {
                      event.stopPropagation();
                      applyHistoryPreset(entry);
                    }}
                  >
                    <span className="controls-throw-draw-history-rank">{index + 1}</span>
                    <span className="controls-throw-draw-history-angle">
                      {((entry.angle * 180) / Math.PI).toFixed(1)}°
                    </span>
                    <span className="controls-throw-draw-history-alpha">
                      {typeof entry.alpha === "number" ? `${entry.alpha.toFixed(0)}°a` : "--"}
                    </span>
                    <span className="controls-throw-draw-history-power">
                      {entry.powerPercent.toFixed(0)}%
                    </span>
                  </button>
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>
    </CanvasItem>
  );
}

export function GripperControlWidget({
  widget,
  selected,
  onSelect,
  onRectChange,
  onLabelChange,
  onOpen,
  onClose,
  activeState,
}: GripperControlWidgetProps) {
  const [localActiveSide, setLocalActiveSide] = useState<"open" | "close" | null>(null);
  const activeSide = activeState ?? localActiveSide;
  const isOpen = activeSide === "open";
  const statusLabel =
    isOpen
      ? "Open"
      : activeSide === "close"
        ? "Closed"
        : "Unknown";

  return (
    <CanvasItem
      x={widget.rect.x}
      y={widget.rect.y}
      w={widget.rect.w}
      h={widget.rect.h}
      onChange={onRectChange}
      onSelect={onSelect}
      selected={selected}
      minSize={{ w: 180, h: 92 }}
      className="controls-gripper-item"
    >
      <div className="controls-gripper-widget">
        <div className="controls-gripper-title">
          <InlineEditableText value={widget.label} onCommit={onLabelChange} className="controls-inline-label" />
        </div>
        <div className="controls-switch-row">
          <div className="controls-switch-meta" aria-live="polite">
            <span className="controls-switch-caption">State</span>
            <span className="controls-switch-state">{statusLabel}</span>
          </div>
          <button
            type="button"
            className={`controls-toggle-switch ${isOpen ? "is-on" : "is-off"}`.trim()}
            role="switch"
            aria-checked={isOpen}
            aria-label={`${widget.label} toggle`}
            onClick={() => {
              if (isOpen) {
                setLocalActiveSide("close");
                onClose();
                return;
              }
              setLocalActiveSide("open");
              onOpen();
            }}
          >
            <span className="controls-toggle-switch-thumb" />
          </button>
        </div>
      </div>
    </CanvasItem>
  );
}

export function MagnetControlWidget({
  widget,
  selected,
  onSelect,
  onRectChange,
  onLabelChange,
  onActivate,
  onDeactivate,
  activeState,
}: MagnetControlWidgetProps) {
  const [localActiveSide, setLocalActiveSide] = useState<"on" | "off" | null>(null);
  const activeSide = activeState ?? localActiveSide;
  const isOn = activeSide === "on";
  const statusLabel = isOn ? "ON" : activeSide === "off" ? "OFF" : "Unknown";

  return (
    <CanvasItem
      x={widget.rect.x}
      y={widget.rect.y}
      w={widget.rect.w}
      h={widget.rect.h}
      onChange={onRectChange}
      onSelect={onSelect}
      selected={selected}
      minSize={{ w: 180, h: 92 }}
      className="controls-magnet-item"
    >
      <div className="controls-magnet-widget">
        <div className="controls-magnet-title">
          <InlineEditableText value={widget.label} onCommit={onLabelChange} className="controls-inline-label" />
        </div>
        <div className="controls-switch-row">
          <div className="controls-switch-meta" aria-live="polite">
            <span className="controls-switch-caption">State</span>
            <span className="controls-switch-state">{statusLabel}</span>
          </div>
          <button
            type="button"
            className={`controls-toggle-switch ${isOn ? "is-on" : "is-off"}`.trim()}
            role="switch"
            aria-checked={isOn}
            aria-label={`${widget.label} toggle`}
            onClick={() => {
              if (isOn) {
                setLocalActiveSide("off");
                onDeactivate();
                return;
              }
              setLocalActiveSide("on");
              onActivate();
            }}
          >
            <span className="controls-toggle-switch-thumb" />
          </button>
        </div>
      </div>
    </CanvasItem>
  );
}

export function StreamDisplayWidget({
  widget,
  selected,
  onSelect,
  onRectChange,
  onLabelChange,
  statusText,
}: StreamDisplayWidgetProps) {
  type WebcamOption = {
    deviceId: string;
    label: string;
  };
  const [remoteImageFailed, setRemoteImageFailed] = useState(false);
  const [webcamLoading, setWebcamLoading] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [webcamFrameReady, setWebcamFrameReady] = useState(false);
  const [webcamOptions, setWebcamOptions] = useState<WebcamOption[]>([]);
  const [activeWebcamDeviceId, setActiveWebcamDeviceId] = useState("");
  const [preferredWebcamDeviceId, setPreferredWebcamDeviceId] = useState("");
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const webcamPreferenceKey = `extender.controls.webcam.device.${widget.id}`;
  const webcamPickerId = `stream-webcam-picker-${widget.id}`;
  const trimmedStreamUrl = widget.streamUrl.trim();
  const isHttpStream = /^https?:\/\//i.test(trimmedStreamUrl);
  const isInlineImageStream = /^data:image\//i.test(trimmedStreamUrl);
  const wantsWebcam =
    widget.source === "webcam" || /^webcam:\/\//i.test(trimmedStreamUrl);
  const canEmbedVisualization =
    widget.source === "visualization" && isHttpStream;
  type WebcamSelector =
    | { mode: "default" }
    | { mode: "device_id"; value: string }
    | { mode: "label_hint"; value: string };
  const parseWebcamSelector = (rawUrl: string): WebcamSelector => {
    const prefix = "webcam://";
    if (!rawUrl.toLowerCase().startsWith(prefix)) return { mode: "default" };
    const encodedSelector = rawUrl.slice(prefix.length).trim();
    if (!encodedSelector || encodedSelector.toLowerCase() === "default") {
      return { mode: "default" };
    }

    let decodedSelector = encodedSelector;
    try {
      decodedSelector = decodeURIComponent(encodedSelector);
    } catch {
      decodedSelector = encodedSelector;
    }
    const normalizedSelector = decodedSelector.trim().toLowerCase();
    if (
      normalizedSelector.startsWith("/dev/video") ||
      /^video\d+$/i.test(normalizedSelector)
    ) {
      return { mode: "label_hint", value: normalizedSelector };
    }
    return { mode: "device_id", value: decodedSelector.trim() };
  };
  const normalizeVideoLabelHint = (value: string) =>
    value.trim().toLowerCase().replace(/^\/dev\//, "");
  const parseVideoNodeIndex = (hint: string): number | null => {
    const match = hint.trim().toLowerCase().match(/(?:^|\/)video(\d+)$/);
    if (!match) return null;
    const index = Number.parseInt(match[1], 10);
    return Number.isFinite(index) ? index : null;
  };
  const resolveVideoInputDeviceIdByLabelHint = async (hint: string) => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return null;
    }
    const hintLower = hint.toLowerCase();
    const normalizedHint = normalizeVideoLabelHint(hintLower);
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoInputs = devices.filter((device) => device.kind === "videoinput");

    for (const device of devices) {
      if (device.kind !== "videoinput" || !device.label) continue;
      const labelLower = device.label.toLowerCase();
      const normalizedLabel = normalizeVideoLabelHint(labelLower);
      if (
        labelLower.includes(hintLower) ||
        normalizedLabel.includes(normalizedHint)
      ) {
        return device.deviceId;
      }
    }

    const nodeIndex = parseVideoNodeIndex(hintLower);
    if (nodeIndex != null && videoInputs.length) {
      const indexCandidates = [nodeIndex, Math.floor(nodeIndex / 2), nodeIndex - 1];
      const uniqueIndices = [...new Set(indexCandidates)];
      for (const candidate of uniqueIndices) {
        if (candidate >= 0 && candidate < videoInputs.length) {
          const mapped = videoInputs[candidate];
          if (mapped) return mapped.deviceId;
        }
      }
    }
    return null;
  };
  const describeWebcamError = (error: unknown) => {
    if (error instanceof DOMException) {
      if (error.name === "NotAllowedError") {
        return "Webcam access denied.";
      }
      if (error.name === "NotFoundError") {
        return "No webcam found.";
      }
      if (error.name === "NotReadableError") {
        return "Webcam is busy.";
      }
      if (error.name === "OverconstrainedError") {
        return "Requested webcam device is unavailable.";
      }
    }
    return "Unable to start webcam.";
  };
  const listWebcamOptions = async (): Promise<WebcamOption[]> => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return [];
    }
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoInputs = devices.filter((device) => device.kind === "videoinput");
    return videoInputs.map((device, index) => ({
      deviceId: device.deviceId,
      label: device.label?.trim() || `Camera ${index + 1}`,
    }));
  };
  const sourceLabel =
    widget.source === "rviz"
      ? "RViz"
      : widget.source === "visualization"
        ? "Visualization"
        : widget.source === "webcam"
          ? "Webcam"
        : "Camera";
  const showHeader = widget.showHeader ?? true;
  const showSourceBadge = widget.showSourceBadge ?? true;
  const showStatusRow = widget.showStatus ?? true;
  const showUrlRow = widget.showUrl ?? true;
  const showWebcamPicker = wantsWebcam && (widget.showWebcamPicker ?? true);
  const streamGridTemplateRows = [
    showHeader ? "auto" : null,
    showWebcamPicker ? "auto" : null,
    "1fr",
    showStatusRow ? "auto" : null,
    showUrlRow ? "auto" : null,
  ]
    .filter((row): row is string => row !== null)
    .join(" ");

  useEffect(() => {
    setRemoteImageFailed(false);
  }, [widget.source, widget.streamUrl]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem(webcamPreferenceKey) ?? "";
      setPreferredWebcamDeviceId(saved);
    } catch {
      setPreferredWebcamDeviceId("");
    }
  }, [webcamPreferenceKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (!preferredWebcamDeviceId) {
        window.localStorage.removeItem(webcamPreferenceKey);
        return;
      }
      window.localStorage.setItem(webcamPreferenceKey, preferredWebcamDeviceId);
    } catch {
      // ignore storage errors
    }
  }, [preferredWebcamDeviceId, webcamPreferenceKey]);

  useEffect(() => {
    const stopCurrentStream = () => {
      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = null;
      }
      if (!webcamStreamRef.current) return;
      for (const track of webcamStreamRef.current.getTracks()) {
        track.stop();
      }
      webcamStreamRef.current = null;
    };

    if (!wantsWebcam) {
      stopCurrentStream();
      setWebcamLoading(false);
      setWebcamError(null);
      setWebcamFrameReady(false);
      setWebcamOptions([]);
      setActiveWebcamDeviceId("");
      return;
    }

    let cancelled = false;
    const startWebcam = async () => {
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setWebcamError("Webcam API not available in this browser.");
        setWebcamLoading(false);
        return;
      }

      setWebcamLoading(true);
      setWebcamError(null);
      setWebcamFrameReady(false);
      stopCurrentStream();

      try {
        const selector = preferredWebcamDeviceId
          ? ({ mode: "device_id", value: preferredWebcamDeviceId } as const)
          : parseWebcamSelector(trimmedStreamUrl);
        let stream: MediaStream;
        if (selector.mode === "default") {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } else if (selector.mode === "device_id") {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: selector.value } },
            audio: false,
          });
        } else {
          const probeStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
          const hintedDeviceId = await resolveVideoInputDeviceIdByLabelHint(
            selector.value
          );
          if (!hintedDeviceId) {
            stream = probeStream;
          } else {
            const probeDeviceId =
              probeStream.getVideoTracks()[0]?.getSettings().deviceId ?? null;
            if (probeDeviceId === hintedDeviceId) {
              stream = probeStream;
            } else {
              for (const track of probeStream.getTracks()) {
                track.stop();
              }
              stream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: hintedDeviceId } },
                audio: false,
              });
            }
          }
        }
        if (cancelled) {
          for (const track of stream.getTracks()) {
            track.stop();
          }
          return;
        }
        webcamStreamRef.current = stream;
        const streamDeviceId =
          stream.getVideoTracks()[0]?.getSettings().deviceId ?? "";
        setActiveWebcamDeviceId(streamDeviceId);
        const options = await listWebcamOptions();
        if (!cancelled) {
          setWebcamOptions(options);
        }
        if (webcamVideoRef.current) {
          webcamVideoRef.current.srcObject = stream;
          webcamVideoRef.current.onloadedmetadata = () => {
            void webcamVideoRef.current?.play().catch(() => {
              // autoplay can fail until user interaction; browser controls this.
            });
          };
          webcamVideoRef.current.onplaying = () => {
            setWebcamFrameReady(true);
            setWebcamLoading(false);
          };
        }
      } catch (error) {
        if (cancelled) return;
        setWebcamError(describeWebcamError(error));
        setWebcamLoading(false);
        setWebcamFrameReady(false);
      }
    };

    void startWebcam();

    return () => {
      cancelled = true;
      stopCurrentStream();
    };
  }, [preferredWebcamDeviceId, trimmedStreamUrl, wantsWebcam]);

  const hasPreferredOption = webcamOptions.some(
    (option) => option.deviceId === preferredWebcamDeviceId
  );
  const webcamPickerValue =
    preferredWebcamDeviceId || activeWebcamDeviceId || "";

  return (
    <CanvasItem
      x={widget.rect.x}
      y={widget.rect.y}
      w={widget.rect.w}
      h={widget.rect.h}
      onChange={onRectChange}
      onSelect={onSelect}
      selected={selected}
      minSize={{ w: 220, h: 160 }}
      className="controls-stream-item"
    >
      <div className="controls-stream-widget" style={{ gridTemplateRows: streamGridTemplateRows }}>
        {showHeader ? (
          <div className="controls-stream-title-row">
            <div className="controls-stream-title">
              <InlineEditableText value={widget.label} onCommit={onLabelChange} className="controls-inline-label" />
            </div>
            {showSourceBadge ? <span className="controls-stream-source">{sourceLabel}</span> : null}
          </div>
        ) : null}
        {showWebcamPicker ? (
          <div className="controls-stream-picker-row">
            <label className="controls-stream-picker-label" htmlFor={webcamPickerId}>
              Camera
            </label>
            <select
              id={webcamPickerId}
              className="controls-stream-picker"
              value={webcamPickerValue}
              onChange={(event) => setPreferredWebcamDeviceId(event.target.value)}
              data-canvas-interactive="true"
            >
              <option value="">Auto</option>
              {preferredWebcamDeviceId && !hasPreferredOption ? (
                <option value={preferredWebcamDeviceId}>
                  Saved camera (unavailable)
                </option>
              ) : null}
              {webcamOptions.map((option) => (
                <option key={option.deviceId} value={option.deviceId}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className={`controls-stream-view controls-stream-fit-${widget.fitMode}`}>
          {wantsWebcam ? (
            webcamError ? (
              <div className="stream-placeholder">{webcamError}</div>
            ) : (
              <>
                {!webcamFrameReady || webcamLoading ? (
                  <div className="stream-placeholder">Starting webcam stream...</div>
                ) : null}
                <video
                  ref={webcamVideoRef}
                  className="controls-stream-media"
                  autoPlay
                  playsInline
                  muted
                  data-stream-widget-id={widget.id}
                  style={{
                    objectFit: widget.fitMode,
                    display: webcamFrameReady ? "block" : "none",
                  }}
                />
              </>
            )
          ) : canEmbedVisualization ? (
            <iframe
              className="controls-stream-iframe"
              src={widget.streamUrl}
              title={`${widget.label} visualization`}
              loading="lazy"
            />
          ) : (isHttpStream || isInlineImageStream) && !remoteImageFailed ? (
            <img
              className="controls-stream-media"
              src={widget.streamUrl}
              alt={`${widget.label} stream`}
              loading="lazy"
              data-stream-widget-id={widget.id}
              style={{ objectFit: widget.fitMode }}
              onError={() => setRemoteImageFailed(true)}
            />
          ) : (
            <div className="stream-placeholder">
              {widget.overlayText?.trim() || statusText}
            </div>
          )}
        </div>
        {showStatusRow ? <div className="controls-stream-status">{statusText}</div> : null}
        {showUrlRow ? <div className="controls-stream-url">{widget.streamUrl || "no stream url"}</div> : null}
      </div>
    </CanvasItem>
  );
}

type ViewerDragState = {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
};

export function DrinkWidget({
  widget,
  selected,
  onSelect,
  onRectChange,
  onLabelChange,
}: DrinkWidgetProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerPosition, setViewerPosition] = useState({ x: 12, y: 62 });
  const [dragState, setDragState] = useState<ViewerDragState | null>(null);
  const viewerHostRef = useRef<HTMLDivElement | null>(null);
  const viewerPanelRef = useRef<HTMLDivElement | null>(null);
  const youtubePlayerRef = useRef<YouTubePlayer | null>(null);
  const iframeId = `drink-video-frame-${widget.id}`;
  const videoId = useMemo(() => extractYouTubeVideoId(widget.videoUrl), [widget.videoUrl]);
  const embedUrl = useMemo(
    () => resolveDrinkVideoEmbedUrl(widget.videoUrl, videoId),
    [videoId, widget.videoUrl]
  );

  const clampViewerPosition = (x: number, y: number) => {
    const host = viewerHostRef.current;
    const panel = viewerPanelRef.current;
    if (!host || !panel) return { x, y };
    const maxX = Math.max(0, host.clientWidth - panel.offsetWidth);
    const maxY = Math.max(0, host.clientHeight - panel.offsetHeight);
    return {
      x: Math.max(0, Math.min(maxX, x)),
      y: Math.max(0, Math.min(maxY, y)),
    };
  };

  const closeViewer = () => {
    setViewerOpen(false);
  };

  const handleViewerHeaderPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragState({
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: viewerPosition.x,
      originY: viewerPosition.y,
    });
  };

  useEffect(() => {
    if (!viewerOpen) return;
    const frame = window.requestAnimationFrame(() => {
      setViewerPosition((current) => clampViewerPosition(current.x, current.y));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [viewerOpen, widget.rect.h, widget.rect.w]);

  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerId !== dragState.pointerId) return;
      const nextX = dragState.originX + (event.clientX - dragState.startX);
      const nextY = dragState.originY + (event.clientY - dragState.startY);
      setViewerPosition(clampViewerPosition(nextX, nextY));
    };

    const handlePointerEnd = (event: PointerEvent) => {
      if (event.pointerId !== dragState.pointerId) return;
      setDragState(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
    };
  }, [dragState]);

  useEffect(() => {
    if (!viewerOpen || !widget.autoCloseOnEnd || !videoId) return;
    let cancelled = false;

    void loadYouTubeApi()
      .then((api) => {
        if (cancelled || !document.getElementById(iframeId)) return;
        if (youtubePlayerRef.current) {
          youtubePlayerRef.current.destroy();
          youtubePlayerRef.current = null;
        }

        youtubePlayerRef.current = new api.Player(iframeId, {
          events: {
            onStateChange: (event) => {
              if (event.data === api.PlayerState.ENDED) {
                setViewerOpen(false);
              }
            },
          },
        });
      })
      .catch(() => {
        // Ignore API failures: iframe playback still works, only auto-close is skipped.
      });

    return () => {
      cancelled = true;
      if (youtubePlayerRef.current) {
        youtubePlayerRef.current.destroy();
        youtubePlayerRef.current = null;
      }
    };
  }, [iframeId, videoId, viewerOpen, widget.autoCloseOnEnd]);

  return (
    <CanvasItem
      x={widget.rect.x}
      y={widget.rect.y}
      w={widget.rect.w}
      h={widget.rect.h}
      onChange={onRectChange}
      onSelect={onSelect}
      selected={selected}
      minSize={{ w: 110, h: 52 }}
      className="controls-drink-item"
    >
      <div className="controls-drink-widget" ref={viewerHostRef} data-canvas-interactive="true">
        <button
          type="button"
          className="controls-drink-button"
          onClick={() => setViewerOpen((current) => !current)}
          data-canvas-interactive="true"
        >
          <InlineEditableText
            value={widget.label}
            onCommit={onLabelChange}
            className="controls-inline-label"
          />
        </button>
        {viewerOpen ? (
          <div
            className="controls-drink-viewer"
            ref={viewerPanelRef}
            style={{ left: `${viewerPosition.x}px`, top: `${viewerPosition.y}px` }}
            data-canvas-interactive="true"
          >
            <div
              className="controls-drink-viewer-header"
              onPointerDown={handleViewerHeaderPointerDown}
              data-canvas-interactive="true"
            >
              <span className="controls-drink-viewer-title">Drink break</span>
              <button
                type="button"
                className="controls-drink-close"
                onClick={closeViewer}
                data-canvas-interactive="true"
                aria-label="Close drink video"
                title="Close"
              >
                x
              </button>
            </div>
            <div className="controls-drink-frame-wrap" data-canvas-interactive="true">
              <iframe
                id={iframeId}
                className="controls-drink-frame"
                src={embedUrl}
                title={`${widget.label} video`}
                loading="lazy"
                allow="autoplay; encrypted-media; picture-in-picture; web-share"
                allowFullScreen
                data-canvas-interactive="true"
              />
            </div>
          </div>
        ) : null}
      </div>
    </CanvasItem>
  );
}

type CurveSample = {
  tick: number;
  joyX: number;
  joyY: number;
  rotX: number;
  rotY: number;
  z: number;
  rz: number;
  tcpSpeed: number;
};

export function CurvesWidget({
  widget,
  selected,
  onSelect,
  onRectChange,
  onLabelChange,
}: CurvesWidgetProps) {
  const joyX = useTeleopStore((s) => s.joyX);
  const joyY = useTeleopStore((s) => s.joyY);
  const rotX = useTeleopStore((s) => s.rotX);
  const rotY = useTeleopStore((s) => s.rotY);
  const z = useTeleopStore((s) => s.z);
  const rz = useTeleopStore((s) => s.rz);
  const tcpSpeed = useTeleopStore((s) => s.wsState?.tcp_speed_mps ?? 0);
  const [samples, setSamples] = useState<CurveSample[]>([]);

  useEffect(() => {
    const sampleRate = Math.max(1, Math.round(widget.sampleRateHz));
    const historySeconds = Math.max(2, Math.round(widget.historySeconds));
    const maxPoints = Math.max(16, sampleRate * historySeconds);
    const intervalMs = Math.round(1000 / sampleRate);

    // TODO: Replace client-side sampled values with backend telemetry history stream.
    const timer = window.setInterval(() => {
      setSamples((prev) => {
        const next: CurveSample = {
          tick: Date.now(),
          joyX,
          joyY,
          rotX,
          rotY,
          z,
          rz,
          tcpSpeed,
        };
        const merged = [...prev, next];
        if (merged.length <= maxPoints) return merged;
        return merged.slice(merged.length - maxPoints);
      });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [joyX, joyY, rotX, rotY, z, rz, tcpSpeed, widget.historySeconds, widget.sampleRateHz]);

  const chartData = useMemo(
    () =>
      samples.map((sample) => ({
        ...sample,
        t: new Date(sample.tick).toLocaleTimeString([], {
          minute: "2-digit",
          second: "2-digit",
        }),
      })),
    [samples]
  );

  return (
    <CanvasItem
      x={widget.rect.x}
      y={widget.rect.y}
      w={widget.rect.w}
      h={widget.rect.h}
      onChange={onRectChange}
      onSelect={onSelect}
      selected={selected}
      minSize={{ w: 280, h: 180 }}
      className="controls-curves-item"
    >
      <div className="controls-curves-widget">
        <div className="controls-curves-header">
          <div className="controls-curves-title">
            <InlineEditableText value={widget.label} onCommit={onLabelChange} className="controls-inline-label" />
          </div>
          <div className="controls-curves-meta">
            {widget.sampleRateHz}Hz / {widget.historySeconds}s
          </div>
        </div>
        <div className="controls-curves-chart">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="t" minTickGap={18} />
              <YAxis yAxisId="axes" domain={[-1, 1]} width={24} />
              <YAxis yAxisId="speed" orientation="right" domain={[0, 2]} width={24} />
              <Tooltip />
              {widget.showLegend ? <Legend /> : null}
              <Line yAxisId="axes" type="monotone" dataKey="joyX" name="joyX" dot={false} stroke="#60a5fa" strokeWidth={2} />
              <Line yAxisId="axes" type="monotone" dataKey="joyY" name="joyY" dot={false} stroke="#93c5fd" strokeWidth={2} />
              <Line yAxisId="axes" type="monotone" dataKey="rotX" name="rotX" dot={false} stroke="#f59e0b" strokeWidth={2} />
              <Line yAxisId="axes" type="monotone" dataKey="rotY" name="rotY" dot={false} stroke="#fb7185" strokeWidth={2} />
              <Line yAxisId="axes" type="monotone" dataKey="z" name="z" dot={false} stroke="#34d399" strokeWidth={2} />
              <Line yAxisId="axes" type="monotone" dataKey="rz" name="rz" dot={false} stroke="#22d3ee" strokeWidth={2} />
              {widget.showSpeed ? (
                <Line
                  yAxisId="speed"
                  type="monotone"
                  dataKey="tcpSpeed"
                  name="tcpSpeed"
                  dot={false}
                  stroke="#facc15"
                  strokeWidth={2}
                />
              ) : null}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </CanvasItem>
  );
}

type LogEntry = {
  id: string;
  ts: number;
  level: "info" | "warn" | "error";
  message: string;
};

type TopicMonitorStatus = "waiting" | "live" | "stale" | "error" | "blocked";

const DEFAULT_TOPIC_MONITOR_STALE_MS = 2000;
const BLOCKED_TOPIC_MONITOR_MESSAGE_TYPES = new Set([
  "sensor_msgs/msg/Image",
  "sensor_msgs/msg/CompressedImage",
]);

const isBlockedTopicMonitorMessageType = (messageType: string) =>
  BLOCKED_TOPIC_MONITOR_MESSAGE_TYPES.has(messageType.trim());

const formatTopicAge = (updatedAtMs: number | null) => {
  if (updatedAtMs == null) return "waiting";
  const ageMs = Math.max(0, Date.now() - updatedAtMs);
  if (ageMs < 1000) return `${ageMs} ms`;
  return `${(ageMs / 1000).toFixed(1)} s`;
};

const resolveTopicMonitorStatus = (
  snapshot: WsTopicSnapshotMessage | undefined,
  staleAfterMs: number
): TopicMonitorStatus => {
  if (!snapshot) return "waiting";
  if (snapshot.error) return "error";
  if (snapshot.updated_at_ms == null || snapshot.revision <= 0) return "waiting";
  return Date.now() - snapshot.updated_at_ms > staleAfterMs ? "stale" : "live";
};

const formatVector = (value: unknown) => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const x = typeof record.x === "number" ? record.x : null;
  const y = typeof record.y === "number" ? record.y : null;
  const z = typeof record.z === "number" ? record.z : null;
  if (x == null || y == null || z == null) return null;
  return `x=${x.toFixed(3)} y=${y.toFixed(3)} z=${z.toFixed(3)}`;
};

const getVectorComponents = (value: unknown) => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const x = typeof record.x === "number" ? record.x : null;
  const y = typeof record.y === "number" ? record.y : null;
  const z = typeof record.z === "number" ? record.z : null;
  if (x == null || y == null || z == null) return null;
  return { x, y, z };
};

const formatMagnitude = (value: number | null) =>
  value == null ? "-" : value.toFixed(3);

const getArraySummary = (value: unknown): string | null => {
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? "" : "s"}`;
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  for (const key of ["detections", "goals", "markers", "tags", "data"]) {
    const candidate = record[key];
    if (Array.isArray(candidate)) {
      return `${candidate.length} ${key}`;
    }
  }
  return null;
};

const getArrayCount = (value: unknown): number | null => {
  if (Array.isArray(value)) return value.length;
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  for (const key of ["detections", "goals", "markers", "tags", "data"]) {
    const candidate = record[key];
    if (Array.isArray(candidate)) return candidate.length;
  }
  return null;
};

const getTwistMagnitudes = (value: unknown) => {
  if (!value || typeof value !== "object") return { linear: null, angular: null };
  const record = value as Record<string, unknown>;
  const twist = record.twist as Record<string, unknown> | undefined;
  const linear = getVectorComponents(twist?.linear ?? record.linear);
  const angular = getVectorComponents(twist?.angular ?? record.angular);
  return {
    linear: linear ? Math.hypot(linear.x, linear.y, linear.z) : null,
    angular: angular ? Math.hypot(angular.x, angular.y, angular.z) : null,
  };
};

const summarizeTopicData = (snapshot: WsTopicSnapshotMessage | undefined) => {
  if (!snapshot) return "No snapshot yet";
  if (snapshot.error) return snapshot.error;
  const data = snapshot.data;
  if (!data || typeof data !== "object") return JSON.stringify(data);

  const record = data as Record<string, unknown>;
  const twist = record.twist as Record<string, unknown> | undefined;
  const linear = formatVector(twist?.linear ?? record.linear);
  const angular = formatVector(twist?.angular ?? record.angular);
  if (linear || angular) {
    return [linear ? `lin ${linear}` : null, angular ? `ang ${angular}` : null]
      .filter(Boolean)
      .join(" | ");
  }

  const arraySummary = getArraySummary(data);
  if (arraySummary) return arraySummary;

  const keys = Object.keys(record).slice(0, 4);
  return keys.length ? keys.join(", ") : "empty message";
};

const resolveMonitorSummary = (
  topics: TopicMonitorWidgetModel["topics"],
  topicSnapshots: Record<string, WsTopicSnapshotMessage>,
  staleAfterMs: number
) => {
  const findSnapshot = (matcher: (topic: TopicMonitorWidgetModel["topics"][number]) => boolean) => {
    const topic = topics.find(matcher);
    if (!topic) return undefined;
    return topicSnapshots[topicSnapshotKey(topic.topic, topic.messageType)];
  };

  const detectionsSnapshot = findSnapshot((topic) =>
    `${topic.label} ${topic.topic}`.toLowerCase().includes("detection") ||
    topic.topic.toLowerCase().includes("tag")
  );
  const commandSnapshot = findSnapshot((topic) =>
    `${topic.label} ${topic.topic}`.toLowerCase().includes("command")
  );
  const errorSnapshot = findSnapshot((topic) =>
    `${topic.label} ${topic.topic}`.toLowerCase().includes("error")
  );
  const commandMagnitudes = getTwistMagnitudes(commandSnapshot?.data);
  const errorMagnitudes = getTwistMagnitudes(errorSnapshot?.data);
  const activeSnapshots = [detectionsSnapshot, commandSnapshot, errorSnapshot].filter(
    (snapshot): snapshot is WsTopicSnapshotMessage => Boolean(snapshot)
  );
  const freshestUpdatedAt = activeSnapshots.reduce<number | null>((freshest, snapshot) => {
    if (snapshot.updated_at_ms == null) return freshest;
    if (freshest == null) return snapshot.updated_at_ms;
    return Math.max(freshest, snapshot.updated_at_ms);
  }, null);

  return [
    {
      label: "Tags",
      value: `${getArrayCount(detectionsSnapshot?.data) ?? 0}`,
      status: resolveTopicMonitorStatus(detectionsSnapshot, staleAfterMs),
    },
    {
      label: "Cmd |v|",
      value: formatMagnitude(commandMagnitudes.linear),
      status: resolveTopicMonitorStatus(commandSnapshot, staleAfterMs),
    },
    {
      label: "Err |v|",
      value: formatMagnitude(errorMagnitudes.linear),
      status: resolveTopicMonitorStatus(errorSnapshot, staleAfterMs),
    },
    {
      label: "Age",
      value: formatTopicAge(freshestUpdatedAt),
      status:
        freshestUpdatedAt == null
          ? "waiting"
          : Date.now() - freshestUpdatedAt > staleAfterMs
            ? "stale"
            : "live",
    },
  ];
};

export function TopicMonitorWidget({
  widget,
  selected,
  onSelect,
  onRectChange,
  onLabelChange,
}: TopicMonitorWidgetProps) {
  const topicSnapshots = useUiStore((s) => s.topicSnapshots);
  const topicMonitorEvent = useUiStore((s) => s.topicMonitorEvent);
  const [, setFreshnessTick] = useState(0);
  const staleAfterMs = Math.max(
    250,
    Math.round(widget.staleAfterMs ?? DEFAULT_TOPIC_MONITOR_STALE_MS)
  );
  const blockedTopics = widget.topics.filter((topic) =>
    isBlockedTopicMonitorMessageType(topic.messageType)
  );
  const showDetails = widget.showDetails ?? true;
  const subscriptionSignature = useMemo(
    () => widget.topics.map((topic) => `${topic.topic}|${topic.messageType}`).join("\n"),
    [widget.topics]
  );
  const summaryItems = resolveMonitorSummary(widget.topics, topicSnapshots, staleAfterMs);

  useEffect(() => {
    const intervalMs = Math.max(250, Math.min(1000, Math.round(staleAfterMs / 2)));
    const timer = window.setInterval(() => {
      setFreshnessTick((value) => value + 1);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [staleAfterMs]);

  useEffect(() => {
    const topics = widget.topics
      .map((topic) => ({
        topic: topic.topic.trim(),
        message_type: topic.messageType.trim(),
      }))
      .filter(
        (topic) =>
          topic.topic &&
          topic.message_type &&
          !isBlockedTopicMonitorMessageType(topic.message_type)
      );
    if (!topics.length) return;
    wsClient.send({
      type: "topic_subscribe",
      topics,
    });
  }, [subscriptionSignature, widget.topics]);

  return (
    <CanvasItem
      x={widget.rect.x}
      y={widget.rect.y}
      w={widget.rect.w}
      h={widget.rect.h}
      onChange={onRectChange}
      onSelect={onSelect}
      selected={selected}
      minSize={{ w: 300, h: showDetails ? 170 : 84 }}
      className="controls-topic-monitor-item"
    >
      <div className={`controls-topic-monitor-widget ${showDetails ? "" : "is-compact"}`.trim()}>
        <div className="controls-topic-monitor-header">
          <div className="controls-topic-monitor-title">
            <InlineEditableText value={widget.label} onCommit={onLabelChange} className="controls-inline-label" />
          </div>
          <div className="controls-topic-monitor-meta">{widget.topics.length} topics</div>
        </div>
        {topicMonitorEvent ? (
          <div className={`controls-topic-monitor-event is-${topicMonitorEvent.severity}`}>
            {topicMonitorEvent.message}
          </div>
        ) : null}
        {blockedTopics.length ? (
          <div className="controls-topic-monitor-event is-warning">
            Image/video message types are not monitored here. Use stream widgets for{" "}
            {blockedTopics.map((topic) => topic.topic || topic.label).join(", ")}.
          </div>
        ) : null}
        {widget.showSummary ?? true ? (
          <div className="controls-topic-monitor-summary-grid">
            {summaryItems.map((item) => (
              <div
                key={item.label}
                className={`controls-topic-monitor-summary-card is-${item.status}`}
              >
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        ) : null}
        {showDetails ? (
          <div className="controls-topic-monitor-list">
            {widget.topics.map((topic) => {
              const blocked = isBlockedTopicMonitorMessageType(topic.messageType);
              const snapshot =
                topicSnapshots[topicSnapshotKey(topic.topic, topic.messageType)];
              const status = blocked
                ? "blocked"
                : resolveTopicMonitorStatus(snapshot, staleAfterMs);
              return (
                <div
                  key={`${topic.topic}|${topic.messageType}`}
                  className={`controls-topic-monitor-row is-${status}`}
                >
                  <div className="controls-topic-monitor-row-head">
                    <span className="controls-topic-monitor-name">{topic.label || topic.topic}</span>
                    <span className="controls-topic-monitor-age">
                      {blocked ? "blocked" : formatTopicAge(snapshot?.updated_at_ms ?? null)}
                    </span>
                  </div>
                  <div className="controls-topic-monitor-topic">{topic.topic}</div>
                  <div className="controls-topic-monitor-summary">
                    {blocked
                      ? "image/video topic blocked; use a stream widget instead"
                      : summarizeTopicData(snapshot)}
                  </div>
                  {widget.showRaw && snapshot?.data != null ? (
                    <pre className="controls-topic-monitor-raw">
                      {JSON.stringify(snapshot.data, null, 2)}
                    </pre>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </CanvasItem>
  );
}

export function LogsWidget({
  widget,
  selected,
  onSelect,
  onRectChange,
  onLabelChange,
}: LogsWidgetProps) {
  const wsStatus = useTeleopStore((s) => s.wsStatus);
  const wsState = useTeleopStore((s) => s.wsState);
  const mode = useTeleopStore((s) => s.mode);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const listRef = useRef<HTMLDivElement | null>(null);

  const appendEntry = (level: LogEntry["level"], message: string) => {
    const maxEntries = Math.max(10, Math.round(widget.maxEntries));
    setEntries((prev) => {
      const entry: LogEntry = {
        id: `log-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
        ts: Date.now(),
        level,
        message,
      };
      const merged = [...prev, entry];
      if (merged.length <= maxEntries) return merged;
      return merged.slice(merged.length - maxEntries);
    });
  };

  useEffect(() => {
    const level = wsStatus === "connected" ? "info" : wsStatus === "connecting" ? "warn" : "error";
    appendEntry(level, `WebSocket status: ${wsStatus}`);
  }, [wsStatus]);

  useEffect(() => {
    appendEntry("info", `Control mode: ${selectModeLabel(mode)}`);
  }, [mode]);

  useEffect(() => {
    // TODO: Replace synthetic heartbeat events with backend log stream subscription.
    const timer = window.setInterval(() => {
      const cmdAge = wsState?.cmd_age_ms ?? null;
      if (cmdAge != null && cmdAge > 300) {
        appendEntry("warn", `Command latency elevated (${cmdAge}ms)`);
        return;
      }
      appendEntry("info", "Runtime heartbeat");
    }, 3000);

    return () => window.clearInterval(timer);
  }, [wsState?.cmd_age_ms]);

  const filteredEntries = useMemo(() => {
    if (widget.levelFilter === "all") return entries;
    return entries.filter((entry) => entry.level === widget.levelFilter);
  }, [entries, widget.levelFilter]);

  useEffect(() => {
    if (!widget.autoScroll) return;
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [filteredEntries, widget.autoScroll]);

  return (
    <CanvasItem
      x={widget.rect.x}
      y={widget.rect.y}
      w={widget.rect.w}
      h={widget.rect.h}
      onChange={onRectChange}
      onSelect={onSelect}
      selected={selected}
      minSize={{ w: 260, h: 170 }}
      className="controls-logs-item"
    >
      <div className="controls-logs-widget">
        <div className="controls-logs-header">
          <div className="controls-logs-title">
            <InlineEditableText value={widget.label} onCommit={onLabelChange} className="controls-inline-label" />
          </div>
          <div className="controls-logs-meta">{filteredEntries.length} entries</div>
        </div>
        <div className="controls-logs-list" ref={listRef}>
          {filteredEntries.length ? (
            filteredEntries.map((entry) => (
              <div key={entry.id} className={`controls-log-entry is-${entry.level}`}>
                {widget.showTimestamp ? (
                  <span className="controls-log-ts">
                    {new Date(entry.ts).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                ) : null}
                <span className="controls-log-level">{entry.level.toUpperCase()}</span>
                <span className="controls-log-message">{entry.message}</span>
              </div>
            ))
          ) : (
            <div className="controls-log-empty">No logs for current filter.</div>
          )}
        </div>
        <div className="controls-logs-footer">filter: {widget.levelFilter}</div>
      </div>
    </CanvasItem>
  );
}
