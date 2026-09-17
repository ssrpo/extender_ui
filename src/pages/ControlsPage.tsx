import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { createPortal } from "react-dom";

import type { CanvasRect } from "../components/layout/CanvasItem";
import { wsClient } from "../services/wsClient";
import {
  ActionButtonWidget,
  CurvesWidget,
  DrinkWidget,
  GripperControlWidget,
  JoystickWidget,
  LoadPoseButtonWidget,
  LogsWidget,
  MagnetControlWidget,
  ModeButtonWidget,
  MomentaryRosMessageFields,
  MomentaryRosMessageWidget,
  MaxVelocityWidget,
  NavigationBarWidget,
  NavigationButtonWidget,
  RosMessageToggleFields,
  RosMessageToggleWidget,
  RosbagControlWidget,
  SavePoseButtonWidget,
  SliderWidget,
  StreamDisplayWidget,
  TopicMonitorWidget,
  ThrowDrawWidget,
  TogglePublisherFields,
  TextareaWidget,
  TextWidget,
  TogglePublisherWidget,
  WIDGET_CATALOG,
  buildMomentaryRosMessageWsMessage,
  buildRosMessageToggleWsMessage,
  buildTogglePublisherWsMessage,
  cloneWidgets,
  createWidgetFromCatalogType,
  DEFAULT_WIDGETS,
  getDefaultDemoConfigurationByName,
  loadConfigurationsFromLocalStorage,
  persistConfigurationsToLocalStorage,
  removeConfiguration,
  syncConfigurationsFromFolder,
  syncConfigurationsToFolder,
  type ButtonWidgetModel,
  type CanvasWidget,
  type CurvesWidgetModel,
  type DrinkWidgetModel,
  type JoystickWidgetModel,
  type LoadPoseButtonWidgetModel,
  type LogsWidgetModel,
  type MaxVelocityWidgetModel,
  type MomentaryRosMessageWidgetModel,
  type NavigationBarWidgetModel,
  type NavigationButtonWidgetModel,
  type PoseSnapshot,
  type PoseTopicValue,
  type RosMessageToggleWidgetModel,
  type RosbagControlWidgetModel,
  type SliderWidgetModel,
  type StreamDisplayWidgetModel,
  type ThrowDrawWidgetModel,
  type TogglePublisherWidgetModel,
  type TextAlign,
  type TextareaWidgetModel,
  type TextWidgetModel,
  type TopicMonitorWidgetModel,
  type WidgetIcon,
  type WidgetCatalogType,
  type WidgetConfiguration,
  CANVAS_PRESETS,
  DEFAULT_CANVAS_SETTINGS,
  cloneCanvasSettings,
  getCanvasPreset,
  resolveCanvasArtboardSize,
  resolveCanvasFitScale,
  resolveCanvasPresetSize,
  type CanvasSettings,
  type RuntimeCanvasMode,
  upsertConfiguration,
} from "../components/widgets";
import { useTeleopStore } from "../store/teleopStore";
import { useUiStore } from "../store/uiStore";
import {
  resolvePendingResizeSourcePreset,
} from "./controls/canvasPresetResizing";
import { useCanvasHistory } from "./controls/useCanvasHistory";
import {
  applyTeleopConfigScalarValue,
  resolveTeleopConfigScalarValue,
} from "./applicationTeleopConfig";

type ControlsPageProps = {
  focusOnly?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
};

type ContextMenuState = {
  clientX: number;
  clientY: number;
  canvasX: number;
  canvasY: number;
};

type SnapGuides = {
  vertical: number[];
  horizontal: number[];
};

type SnapMode = "off" | "slide" | "smart";

const ENABLED_WIDGETS = WIDGET_CATALOG.filter((entry) => entry.enabled);
const DEFAULT_ADD_WIDGET_TYPE: WidgetCatalogType =
  (ENABLED_WIDGETS[0]?.type as WidgetCatalogType | undefined) ?? "joystick";
const TOPIC_FRESHNESS_MS = 200;
const TOPIC_FRESHNESS_TICK_MS = 100;
const PETANQUE_TOTAL_DURATION_TOPIC = "/petanque_throw/total_duration";
const PETANQUE_ANGLE_TOPIC = "/petanque_throw/angle_between_start_and_finish";
const PETANQUE_ALPHA_TOPIC = "/petanque_throw/alpha";
const PETANQUE_ALPHA_SAFE_MAX = 20;
const PETANQUE_DEFAULT_TOTAL_DURATION_S = 1.1;
const SNAP_THRESHOLD_PX = 10;
const SNAP_GUIDE_HIDE_DELAY_MS = 130;
const MIN_EDITOR_ZOOM = 0.2;
const MAX_EDITOR_ZOOM = 2.5;
const EDITOR_ZOOM_STEP = 0.1;
const SNAP_MODE_LABEL: Record<SnapMode, string> = {
  off: "Off",
  slide: "Slide",
  smart: "Smart",
};

const readNumber = (raw: string, fallback: number) => {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const readOptionalNumber = (raw: string): number | undefined => {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const clampEditorZoom = (value: number) =>
  Math.max(MIN_EDITOR_ZOOM, Math.min(MAX_EDITOR_ZOOM, Math.round(value * 100) / 100));
const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}){1,2}$/;
const toColorInputValue = (value: string, fallback = "#4a9eff") =>
  HEX_COLOR_PATTERN.test(value.trim()) ? value : fallback;
const clampSignedUnit = (value: number) => Math.max(-1, Math.min(1, value));
const isTypingTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
};
const nextNavigationItemId = () =>
  `nav-item-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
const toScreenClassToken = (screenId: string) =>
  screenId.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
const formatMaxVelocityPowerPercent = (
  value: number,
  min: number,
  max: number,
  reverseDirection: boolean
) => {
  const span = Math.max(1e-6, max - min);
  const normalized = reverseDirection ? (max - value) / span : (value - min) / span;
  const percent = Math.max(0, Math.min(100, normalized * 100));
  return `Power ${percent.toFixed(0)}%`;
};
const resolveMaxVelocityBubbleFormatter = (
  widget: MaxVelocityWidgetModel,
  reverseDirection: boolean
) => {
  const mode =
    widget.bubbleMode ??
    (widget.topic === PETANQUE_ANGLE_TOPIC
      ? "degrees"
      : widget.topic === PETANQUE_ALPHA_TOPIC
        ? "degrees-unit"
        : widget.topic === PETANQUE_TOTAL_DURATION_TOPIC
          ? "power"
          : "number");
  if (mode === "degrees") {
    return (rawValue: number) => `${((rawValue * 180) / Math.PI).toFixed(1)}°`;
  }
  if (mode === "degrees-unit") {
    return (rawValue: number) => `${rawValue.toFixed(1)}°`;
  }
  if (mode === "power") {
    return (rawValue: number) =>
      formatMaxVelocityPowerPercent(rawValue, widget.min, widget.max, reverseDirection);
  }
  return undefined;
};

export function ControlsPage({ focusOnly = false, onDirtyChange }: ControlsPageProps) {
  const joyX = useTeleopStore((s) => s.joyX);
  const joyY = useTeleopStore((s) => s.joyY);
  const rotX = useTeleopStore((s) => s.rotX);
  const rotY = useTeleopStore((s) => s.rotY);
  const z = useTeleopStore((s) => s.z);
  const rz = useTeleopStore((s) => s.rz);
  const setJoy = useTeleopStore((s) => s.setJoy);
  const setRot = useTeleopStore((s) => s.setRot);
  const setZ = useTeleopStore((s) => s.setZ);
  const setRz = useTeleopStore((s) => s.setRz);
  const maxVelocity = useTeleopStore((s) => s.maxVelocity);
  const translationGain = useTeleopStore((s) => s.translationGain);
  const rotationGain = useTeleopStore((s) => s.rotationGain);
  const scaleX = useTeleopStore((s) => s.scaleX);
  const scaleY = useTeleopStore((s) => s.scaleY);
  const scaleZ = useTeleopStore((s) => s.scaleZ);
  const angularScaleX = useTeleopStore((s) => s.angularScaleX);
  const angularScaleY = useTeleopStore((s) => s.angularScaleY);
  const angularScaleZ = useTeleopStore((s) => s.angularScaleZ);
  const setMaxVelocity = useTeleopStore((s) => s.setMaxVelocity);
  const setTranslationGain = useTeleopStore((s) => s.setTranslationGain);
  const setRotationGain = useTeleopStore((s) => s.setRotationGain);
  const setScaleX = useTeleopStore((s) => s.setScaleX);
  const setScaleY = useTeleopStore((s) => s.setScaleY);
  const setScaleZ = useTeleopStore((s) => s.setScaleZ);
  const setAngularScaleX = useTeleopStore((s) => s.setAngularScaleX);
  const setAngularScaleY = useTeleopStore((s) => s.setAngularScaleY);
  const setAngularScaleZ = useTeleopStore((s) => s.setAngularScaleZ);
  const wsState = useTeleopStore((s) => s.wsState);
  const cameraStreamUrl = useUiStore((s) => s.cameraStreamUrl);
  const rvizStreamUrl = useUiStore((s) => s.rvizStreamUrl);

  const canvasSurfaceRef = useRef<HTMLDivElement | null>(null);
  const canvasViewportRef = useRef<HTMLDivElement | null>(null);
  const canvasFrameRef = useRef<HTMLDivElement | null>(null);
  const [topBarSlotElement, setTopBarSlotElement] = useState<HTMLElement | null>(null);

  const [widgets, setWidgets] = useState<CanvasWidget[]>([]);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [quickAddType, setQuickAddType] = useState<WidgetCatalogType>(DEFAULT_ADD_WIDGET_TYPE);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [pendingNavBarScreenId, setPendingNavBarScreenId] = useState<string>("");
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);

  const [configurations, setConfigurations] = useState<WidgetConfiguration[]>(() =>
    loadConfigurationsFromLocalStorage()
  );
  const [canvasSettings, setCanvasSettings] = useState<CanvasSettings>(() =>
    cloneCanvasSettings(DEFAULT_CANVAS_SETTINGS)
  );
  const [selectedConfigName, setSelectedConfigName] = useState<string>("");
  const [configNameInput, setConfigNameInput] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [widgetPulseMap, setWidgetPulseMap] = useState<Record<string, number>>({});
  const [throwDrawWidgetValues, setThrowDrawWidgetValues] = useState<
    Record<string, { angle: number; duration: number }>
  >({});
  const [throwDrawAlphaValues, setThrowDrawAlphaValues] = useState<Record<string, number>>({});
  const [maxVelocityWidgetValues, setMaxVelocityWidgetValues] = useState<Record<string, number>>({});
  const [freshnessClock, setFreshnessClock] = useState<number>(() => Date.now());
  const [rosbagRecording, setRosbagRecording] = useState(false);
  const [rosbagStatus, setRosbagStatus] = useState("idle");
  const [savedBaseline, setSavedBaseline] = useState<{
    name: string;
    widgetSignature: string;
    canvasSignature: string;
  }>({
    name: "",
    widgetSignature: JSON.stringify([]),
    canvasSignature: JSON.stringify(DEFAULT_CANVAS_SETTINGS),
  });
  const [canvasViewportSize, setCanvasViewportSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const [, setPendingResizeSourcePresetId] = useState<CanvasSettings["presetId"] | null>(null);
  const [editorZoom, setEditorZoom] = useState<number>(1);
  const [snapMode] = useState<SnapMode>("smart");
  const [snapGuides, setSnapGuides] = useState<SnapGuides>({ vertical: [], horizontal: [] });
  const snapGuideTimeoutRef = useRef<number | null>(null);

  const magnitude = useMemo(() => Math.min(1, Math.hypot(joyX, joyY)), [joyX, joyY]);

  useEffect(() => {
    if (!widgets.length) {
      setSelectedWidgetId(null);
      return;
    }
    if (selectedWidgetId && widgets.some((widget) => widget.id === selectedWidgetId)) {
      return;
    }
    setSelectedWidgetId(widgets[0].id);
  }, [selectedWidgetId, widgets]);

  useEffect(() => {
    persistConfigurationsToLocalStorage(configurations);
  }, [configurations]);

  useEffect(() => {
    if (focusOnly) {
      setTopBarSlotElement(null);
      return;
    }
    setTopBarSlotElement(document.getElementById("topbar-controls-slot"));
  }, [focusOnly]);

  useEffect(() => {
    const viewport = canvasViewportRef.current;
    if (!viewport) return;

    const updateSize = () => {
      setCanvasViewportSize({
        width: viewport.clientWidth,
        height: viewport.clientHeight,
      });
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(viewport);

    return () => observer.disconnect();
  }, [focusOnly]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setFreshnessClock(Date.now());
    }, TOPIC_FRESHNESS_TICK_MS);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (snapGuideTimeoutRef.current !== null) {
        window.clearTimeout(snapGuideTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setWidgetPulseMap((prev) => {
      const currentIds = new Set(widgets.map((widget) => widget.id));
      const next: Record<string, number> = {};
      let changed = false;

      for (const [id, timestamp] of Object.entries(prev)) {
        if (currentIds.has(id)) {
          next[id] = timestamp;
          continue;
        }
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [widgets]);

  useEffect(() => {
    setThrowDrawWidgetValues((prev) => {
      const currentIds = new Set(widgets.map((widget) => widget.id));
      let changed = false;
      const next: Record<string, { angle: number; duration: number }> = {};
      for (const [widgetId, value] of Object.entries(prev)) {
        if (currentIds.has(widgetId)) {
          next[widgetId] = value;
          continue;
        }
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [widgets]);

  useEffect(() => {
    setThrowDrawAlphaValues((prev) => {
      const currentIds = new Set(widgets.map((widget) => widget.id));
      let changed = false;
      const next: Record<string, number> = {};
      for (const [widgetId, value] of Object.entries(prev)) {
        if (currentIds.has(widgetId)) {
          next[widgetId] = value;
          continue;
        }
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [widgets]);

  useEffect(() => {
    if (!contextMenu) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest(".controls-context-menu")) {
        return;
      }
      setContextMenu(null);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [contextMenu]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.key !== "Delete" && event.key !== "Backspace") || !selectedWidgetId) {
        return;
      }
      if (isTypingTarget(event.target)) {
        return;
      }

      event.preventDefault();
      setWidgets((prev) => prev.filter((widget) => widget.id !== selectedWidgetId));
      setSelectedWidgetId(null);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedWidgetId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      if (!event.ctrlKey || event.key !== "\\") return;
      event.preventDefault();
      setIsInspectorOpen((prev) => !prev);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const selectedWidget = useMemo(
    () => widgets.find((widget) => widget.id === selectedWidgetId) ?? null,
    [selectedWidgetId, widgets]
  );
  const activeConfiguration = useMemo(
    () => configurations.find((configuration) => configuration.name === selectedConfigName) ?? null,
    [configurations, selectedConfigName]
  );
  const availableScreenIds = useMemo(
    () => configurations.map((configuration) => configuration.name),
    [configurations]
  );
  const widgetSignature = useMemo(() => JSON.stringify(widgets), [widgets]);
  const canvasSettingsSignature = useMemo(() => JSON.stringify(canvasSettings), [canvasSettings]);
  const trimmedNameInput = configNameInput.trim();
  const hasWidgetDiff = widgetSignature !== savedBaseline.widgetSignature;
  const hasCanvasSettingsDiff = canvasSettingsSignature !== savedBaseline.canvasSignature;
  const hasNameDiff = trimmedNameInput.length > 0 && trimmedNameInput !== savedBaseline.name;
  const isCanvasDirty = hasWidgetDiff || hasCanvasSettingsDiff || hasNameDiff;
  const teleopConfigScalarSnapshot = {
    maxVelocity,
    translationGain,
    rotationGain,
    scaleX,
    scaleY,
    scaleZ,
    angularScaleX,
    angularScaleY,
    angularScaleZ,
  };
  const teleopConfigScalarActions = {
    setMaxVelocity,
    setTranslationGain,
    setRotationGain,
    setScaleX,
    setScaleY,
    setScaleZ,
    setAngularScaleX,
    setAngularScaleY,
    setAngularScaleZ,
  };

  const editorCanvasSize = useMemo(
    () => resolveCanvasArtboardSize(widgets, canvasSettings),
    [canvasSettings, widgets]
  );
  const runtimeCanvasSize = useMemo(
    () => resolveCanvasPresetSize(canvasSettings),
    [canvasSettings]
  );
  const canvasSize = focusOnly ? runtimeCanvasSize : editorCanvasSize;
  const targetCanvasPreset = useMemo(
    () => getCanvasPreset(canvasSettings.presetId),
    [canvasSettings.presetId]
  );
  const runtimeCanvasMode: RuntimeCanvasMode = focusOnly ? "fit" : "left";
  const baseCanvasScale = useMemo(
    () => resolveCanvasFitScale(runtimeCanvasMode, canvasSize, canvasViewportSize),
    [canvasSize, canvasViewportSize, runtimeCanvasMode]
  );
  const canvasScale = useMemo(
    () => baseCanvasScale * (focusOnly ? 1 : editorZoom),
    [baseCanvasScale, editorZoom, focusOnly]
  );
  const scaledCanvasSize = useMemo(
    () => ({
      width: Math.round(canvasSize.width * canvasScale),
      height: Math.round(canvasSize.height * canvasScale),
    }),
    [canvasScale, canvasSize]
  );
  const editorZoomPercent = Math.round(editorZoom * 100);

  useCanvasHistory({
    widgets,
    canvasSettings,
    setWidgets,
    setCanvasSettings,
    setSelectedWidgetId,
    isTypingTarget,
    setStatusMessage,
    onSnapshotApplied: () => setPendingResizeSourcePresetId(null),
  });

  useEffect(() => {
    onDirtyChange?.(isCanvasDirty);
  }, [isCanvasDirty, onDirtyChange]);

  useEffect(() => {
    if (!isCanvasDirty) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isCanvasDirty]);

  useEffect(() => {
    if (!selectedWidget || selectedWidget.kind !== "navigation-bar") {
      setPendingNavBarScreenId("");
      return;
    }

    const available = availableScreenIds.filter(
      (screenId) =>
        !selectedWidget.items.some((item) => item.targetScreenId === screenId)
    );
    if (!available.length) {
      if (pendingNavBarScreenId) {
        setPendingNavBarScreenId("");
      }
      return;
    }

    if (!available.includes(pendingNavBarScreenId)) {
      setPendingNavBarScreenId(available[0]);
    }
  }, [availableScreenIds, pendingNavBarScreenId, selectedWidget]);

  const updateWidget = (id: string, updater: (widget: CanvasWidget) => CanvasWidget) => {
    setWidgets((prev) => prev.map((widget) => (widget.id === id ? updater(widget) : widget)));
  };

  const handleWidgetRectChange = (widgetId: string, nextRect: CanvasRect) => {
    const currentWidget = widgets.find((widget) => widget.id === widgetId);
    if (!currentWidget) return;

    const roundedRect: CanvasRect = {
      x: Math.round(nextRect.x),
      y: Math.round(nextRect.y),
      w: Math.round(nextRect.w),
      h: Math.round(nextRect.h),
    };

    if (snapMode === "off") {
      updateWidget(widgetId, (widget) => ({ ...widget, rect: roundedRect }));
      setSnapGuides((prev) =>
        prev.vertical.length || prev.horizontal.length ? { vertical: [], horizontal: [] } : prev
      );
      return;
    }

    const isResizeOnly =
      nextRect.x === currentWidget.rect.x &&
      nextRect.y === currentWidget.rect.y &&
      (nextRect.w !== currentWidget.rect.w || nextRect.h !== currentWidget.rect.h);

    const candidateVertical = [0, targetCanvasPreset.width / 2, targetCanvasPreset.width];
    const candidateHorizontal = [0, targetCanvasPreset.height / 2, targetCanvasPreset.height];

    if (snapMode === "smart") {
      for (const widget of widgets) {
        if (widget.id === widgetId) continue;
        candidateVertical.push(
          widget.rect.x,
          widget.rect.x + widget.rect.w / 2,
          widget.rect.x + widget.rect.w
        );
        candidateHorizontal.push(
          widget.rect.y,
          widget.rect.y + widget.rect.h / 2,
          widget.rect.y + widget.rect.h
        );
      }
    }

    let snappedRect: CanvasRect = roundedRect;

    const guides: SnapGuides = { vertical: [], horizontal: [] };

    if (isResizeOnly) {
      const right = snappedRect.x + snappedRect.w;
      const bottom = snappedRect.y + snappedRect.h;

      let bestVerticalDiff = Number.POSITIVE_INFINITY;
      let verticalGuide: number | null = null;
      for (const line of candidateVertical) {
        const diff = line - right;
        const distance = Math.abs(diff);
        if (distance <= SNAP_THRESHOLD_PX && distance < bestVerticalDiff) {
          bestVerticalDiff = distance;
          verticalGuide = line;
        }
      }

      if (verticalGuide !== null) {
        snappedRect = {
          ...snappedRect,
          w: Math.max(24, Math.round(verticalGuide - snappedRect.x)),
        };
        guides.vertical = [Math.round(verticalGuide)];
      }

      let bestHorizontalDiff = Number.POSITIVE_INFINITY;
      let horizontalGuide: number | null = null;
      for (const line of candidateHorizontal) {
        const diff = line - bottom;
        const distance = Math.abs(diff);
        if (distance <= SNAP_THRESHOLD_PX && distance < bestHorizontalDiff) {
          bestHorizontalDiff = distance;
          horizontalGuide = line;
        }
      }

      if (horizontalGuide !== null) {
        snappedRect = {
          ...snappedRect,
          h: Math.max(24, Math.round(horizontalGuide - snappedRect.y)),
        };
        guides.horizontal = [Math.round(horizontalGuide)];
      }
    } else {
      const verticalAnchors = [
        { value: snappedRect.x },
        { value: snappedRect.x + snappedRect.w / 2 },
        { value: snappedRect.x + snappedRect.w },
      ];
      const horizontalAnchors = [
        { value: snappedRect.y },
        { value: snappedRect.y + snappedRect.h / 2 },
        { value: snappedRect.y + snappedRect.h },
      ];

      let bestVerticalDiff = Number.POSITIVE_INFINITY;
      let verticalDelta = 0;
      let verticalGuide: number | null = null;
      for (const anchor of verticalAnchors) {
        for (const line of candidateVertical) {
          const diff = line - anchor.value;
          const distance = Math.abs(diff);
          if (distance <= SNAP_THRESHOLD_PX && distance < bestVerticalDiff) {
            bestVerticalDiff = distance;
            verticalDelta = diff;
            verticalGuide = line;
          }
        }
      }

      if (verticalGuide !== null) {
        snappedRect = {
          ...snappedRect,
          x: Math.max(0, Math.round(snappedRect.x + verticalDelta)),
        };
        guides.vertical = [Math.round(verticalGuide)];
      }

      let bestHorizontalDiff = Number.POSITIVE_INFINITY;
      let horizontalDelta = 0;
      let horizontalGuide: number | null = null;
      for (const anchor of horizontalAnchors) {
        for (const line of candidateHorizontal) {
          const diff = line - anchor.value;
          const distance = Math.abs(diff);
          if (distance <= SNAP_THRESHOLD_PX && distance < bestHorizontalDiff) {
            bestHorizontalDiff = distance;
            horizontalDelta = diff;
            horizontalGuide = line;
          }
        }
      }

      if (horizontalGuide !== null) {
        snappedRect = {
          ...snappedRect,
          y: Math.max(0, Math.round(snappedRect.y + horizontalDelta)),
        };
        guides.horizontal = [Math.round(horizontalGuide)];
      }
    }

    updateWidget(widgetId, (widget) => ({ ...widget, rect: snappedRect }));

    const hasGuides = guides.vertical.length > 0 || guides.horizontal.length > 0;
    if (hasGuides) {
      setSnapGuides(guides);
      if (snapGuideTimeoutRef.current !== null) {
        window.clearTimeout(snapGuideTimeoutRef.current);
      }
      snapGuideTimeoutRef.current = window.setTimeout(() => {
        setSnapGuides({ vertical: [], horizontal: [] });
      }, SNAP_GUIDE_HIDE_DELAY_MS);
      return;
    }

    setSnapGuides((prev) =>
      prev.vertical.length || prev.horizontal.length ? { vertical: [], horizontal: [] } : prev
    );
  };

  const updateSelectedWidget = (updater: (widget: CanvasWidget) => CanvasWidget) => {
    if (!selectedWidgetId) return;
    updateWidget(selectedWidgetId, updater);
  };

  const updateSelectedRectField = (field: keyof CanvasRect, raw: string) => {
    if (!selectedWidget) return;
    const fallback = selectedWidget.rect[field];
    const value = Math.max(0, Math.round(readNumber(raw, fallback)));

    if (selectedWidget.kind === "joystick" && (field === "w" || field === "h")) {
      updateSelectedWidget((widget) => ({
        ...widget,
        rect: {
          ...widget.rect,
          w: value,
          h: value,
        },
      }));
      return;
    }

    updateSelectedWidget((widget) => ({
      ...widget,
      rect: {
        ...widget.rect,
        [field]: value,
      },
    }));
  };

  const updateSelectedSlider = (updater: (widget: SliderWidgetModel) => SliderWidgetModel) => {
    updateSelectedWidget((widget) => (widget.kind === "slider" ? updater(widget) : widget));
  };

  const updateSelectedJoystick = (updater: (widget: JoystickWidgetModel) => JoystickWidgetModel) => {
    updateSelectedWidget((widget) => (widget.kind === "joystick" ? updater(widget) : widget));
  };
  const updateSelectedLoadPoseButton = (
    updater: (widget: LoadPoseButtonWidgetModel) => LoadPoseButtonWidgetModel
  ) => {
    updateSelectedWidget((widget) => (widget.kind === "load-pose-button" ? updater(widget) : widget));
  };
  const updateSelectedNavigationButton = (
    updater: (widget: NavigationButtonWidgetModel) => NavigationButtonWidgetModel
  ) => {
    updateSelectedWidget((widget) => (widget.kind === "navigation-button" ? updater(widget) : widget));
  };
  const updateSelectedNavigationBar = (
    updater: (widget: NavigationBarWidgetModel) => NavigationBarWidgetModel
  ) => {
    updateSelectedWidget((widget) => (widget.kind === "navigation-bar" ? updater(widget) : widget));
  };
  const updateSelectedText = (updater: (widget: TextWidgetModel) => TextWidgetModel) => {
    updateSelectedWidget((widget) => (widget.kind === "text" ? updater(widget) : widget));
  };
  const updateSelectedTextarea = (updater: (widget: TextareaWidgetModel) => TextareaWidgetModel) => {
    updateSelectedWidget((widget) => (widget.kind === "textarea" ? updater(widget) : widget));
  };
  const updateSelectedButton = (updater: (widget: ButtonWidgetModel) => ButtonWidgetModel) => {
    updateSelectedWidget((widget) => (widget.kind === "button" ? updater(widget) : widget));
  };
  const updateSelectedRosbagControl = (
    updater: (widget: RosbagControlWidgetModel) => RosbagControlWidgetModel
  ) => {
    updateSelectedWidget((widget) => (widget.kind === "rosbag-control" ? updater(widget) : widget));
  };
  const updateSelectedMaxVelocity = (
    updater: (widget: MaxVelocityWidgetModel) => MaxVelocityWidgetModel
  ) => {
    updateSelectedWidget((widget) => (widget.kind === "max-velocity" ? updater(widget) : widget));
  };
  const updateSelectedThrowDraw = (
    updater: (widget: ThrowDrawWidgetModel) => ThrowDrawWidgetModel
  ) => {
    updateSelectedWidget((widget) => (widget.kind === "throw-draw" ? updater(widget) : widget));
  };
  const updateSelectedStreamDisplay = (
    updater: (widget: StreamDisplayWidgetModel) => StreamDisplayWidgetModel
  ) => {
    updateSelectedWidget((widget) => (widget.kind === "stream-display" ? updater(widget) : widget));
  };
  const updateSelectedDrink = (updater: (widget: DrinkWidgetModel) => DrinkWidgetModel) => {
    updateSelectedWidget((widget) => (widget.kind === "drink" ? updater(widget) : widget));
  };
  const updateSelectedTogglePublisher = (
    updater: (widget: TogglePublisherWidgetModel) => TogglePublisherWidgetModel
  ) => {
    updateSelectedWidget((widget) => (widget.kind === "toggle-publisher" ? updater(widget) : widget));
  };
  const updateSelectedRosMessageToggle = (
    updater: (widget: RosMessageToggleWidgetModel) => RosMessageToggleWidgetModel
  ) => {
    updateSelectedWidget((widget) => (widget.kind === "ros-message-toggle" ? updater(widget) : widget));
  };
  const updateSelectedMomentaryRosMessage = (
    updater: (widget: MomentaryRosMessageWidgetModel) => MomentaryRosMessageWidgetModel
  ) => {
    updateSelectedWidget((widget) =>
      widget.kind === "momentary-ros-message" ? updater(widget) : widget
    );
  };
  const updateSelectedCurves = (updater: (widget: CurvesWidgetModel) => CurvesWidgetModel) => {
    updateSelectedWidget((widget) => (widget.kind === "curves" ? updater(widget) : widget));
  };
  const updateSelectedLogs = (updater: (widget: LogsWidgetModel) => LogsWidgetModel) => {
    updateSelectedWidget((widget) => (widget.kind === "logs" ? updater(widget) : widget));
  };
  const updateSelectedTopicMonitor = (
    updater: (widget: TopicMonitorWidgetModel) => TopicMonitorWidgetModel
  ) => {
    updateSelectedWidget((widget) => (widget.kind === "topic-monitor" ? updater(widget) : widget));
  };

  const markWidgetPulse = (widgetId: string) => {
    setWidgetPulseMap((prev) => ({
      ...prev,
      [widgetId]: Date.now(),
    }));
  };

  const isWidgetFresh = (widgetId: string) =>
    freshnessClock - (widgetPulseMap[widgetId] ?? 0) <= TOPIC_FRESHNESS_MS;

  const addWidgetByType = (type: WidgetCatalogType, position?: { x: number; y: number }) => {
    const offset = widgets.length * 14;
    const x = Math.max(0, Math.round(position?.x ?? 20 + offset));
    const y = Math.max(0, Math.round(position?.y ?? 20 + offset));

    const widget = createWidgetFromCatalogType(type, x, y);
    if (!widget) {
      setStatusMessage(`Widget type "${type}" is not implemented yet.`);
      return;
    }

    setWidgets((prev) => [...prev, widget]);
    setSelectedWidgetId(widget.id);
    setStatusMessage("");
  };

  const handleScreenSelectionChange = (name: string) => {
    if (!name) {
      setSelectedConfigName("");
      setConfigNameInput("");
      setCanvasSettings(cloneCanvasSettings(DEFAULT_CANVAS_SETTINGS));
      setPendingResizeSourcePresetId(null);
      setStatusMessage("No screen selected.");
      return;
    }

    loadConfigurationByName(name);
  };

  const confirmDiscardUnsavedChanges = (nextAction: string) => {
    if (!isCanvasDirty) return true;
    return window.confirm(
      `You have unsaved changes on this screen. ${nextAction} anyway?`
    );
  };

  const removeSelectedWidget = () => {
    if (!selectedWidgetId) return;
    setWidgets((prev) => prev.filter((widget) => widget.id !== selectedWidgetId));
    setSelectedWidgetId(null);
  };

  const clearCanvas = () => {
    if (!confirmDiscardUnsavedChanges("Clear the canvas")) return;
    setWidgets([]);
    setSelectedWidgetId(null);
    setPendingResizeSourcePresetId(null);
    setStatusMessage("Canvas cleared.");
  };

  const loadConfigurationByName = (name: string) => {
    const configuration = configurations.find((item) => item.name === name);
    if (!configuration) {
      setStatusMessage("Screen not found.");
      return;
    }
    if (!confirmDiscardUnsavedChanges(`Load screen "${name}"`)) {
      return;
    }
    const loadedWidgets = cloneWidgets(configuration.widgets);
    setWidgets(loadedWidgets);
    setCanvasSettings(cloneCanvasSettings(configuration.canvas));
    setPendingResizeSourcePresetId(null);
    setSelectedWidgetId(null);
    setSelectedConfigName(name);
    setConfigNameInput(name);
    setSavedBaseline({
      name,
      widgetSignature: JSON.stringify(loadedWidgets),
      canvasSignature: JSON.stringify(configuration.canvas),
    });
    setStatusMessage(`Loaded "${name}".`);
  };

  const saveCurrentConfiguration = () => {
    const name = (configNameInput || selectedConfigName).trim();
    if (!name) {
      setStatusMessage("Provide a screen name before saving.");
      return;
    }

    setConfigurations((prev) => upsertConfiguration(prev, name, widgets, undefined, canvasSettings));
    setSelectedConfigName(name);
    setConfigNameInput(name);
    setSavedBaseline({
      name,
      widgetSignature,
      canvasSignature: canvasSettingsSignature,
    });
    setStatusMessage(`Saved "${name}".`);
  };

  const deleteSelectedConfiguration = () => {
    if (!selectedConfigName) {
      setStatusMessage("Select a screen to delete.");
      return;
    }

    setConfigurations((prev) => removeConfiguration(prev, selectedConfigName));
    setStatusMessage(`Deleted "${selectedConfigName}".`);
    if (savedBaseline.name === selectedConfigName) {
      setSavedBaseline({
        name: "",
        widgetSignature: JSON.stringify([]),
        canvasSignature: JSON.stringify(DEFAULT_CANVAS_SETTINGS),
      });
    }
    setSelectedConfigName("");
    setConfigNameInput("");
  };

  const loadDemoConfiguration = () => {
    if (!confirmDiscardUnsavedChanges("Load demo widgets")) return;
    const requestedName = (selectedConfigName || configNameInput || "default_control").trim();
    const demoConfiguration =
      getDefaultDemoConfigurationByName(requestedName) ??
      getDefaultDemoConfigurationByName("default_control");

    if (demoConfiguration) {
      setWidgets(cloneWidgets(demoConfiguration.widgets));
      setCanvasSettings(cloneCanvasSettings(demoConfiguration.canvas));
      setPendingResizeSourcePresetId(null);
      setSelectedWidgetId(null);
      setStatusMessage(`Loaded demo layout for "${demoConfiguration.name}".`);
      return;
    }

    setWidgets(cloneWidgets(DEFAULT_WIDGETS));
    setCanvasSettings(cloneCanvasSettings(DEFAULT_CANVAS_SETTINGS));
    setPendingResizeSourcePresetId(null);
    setSelectedWidgetId(null);
    setStatusMessage("Loaded fallback demo widgets.");
  };

  const upsertPose = (poses: PoseSnapshot[], pose: PoseSnapshot) => {
    const index = poses.findIndex((item) => item.name === pose.name);
    if (index === -1) {
      return [...poses, pose].sort((a, b) => a.name.localeCompare(b.name));
    }
    return poses.map((item, itemIndex) => (itemIndex === index ? pose : item));
  };

  const collectCurrentPoseTopics = (): Record<string, PoseTopicValue> => {
    const topics: Record<string, PoseTopicValue> = {};

    for (const widget of widgets) {
      if (widget.kind === "slider") {
        const value = widget.binding === "z" ? z : rz;
        topics[widget.topic] = { kind: "scalar", value };
        continue;
      }

      if (widget.kind === "joystick") {
        const source = widget.binding === "joy" ? { x: joyX, y: joyY } : { x: rotX, y: rotY };
        topics[widget.topic] = { kind: "vector2", x: source.x, y: source.y };
      }
    }

    return topics;
  };

  const saveCurrentPose = () => {
    if (!selectedConfigName) {
      setStatusMessage("Select a screen before saving a pose.");
      return;
    }

    const defaultPoseName = `pose-${(activeConfiguration?.poses.length ?? 0) + 1}`;
    const rawPoseName = window.prompt("Pose name", defaultPoseName);
    if (rawPoseName == null) return;

    const poseName = rawPoseName.trim();
    if (!poseName) {
      setStatusMessage("Pose name cannot be empty.");
      return;
    }

    const nextPose: PoseSnapshot = {
      name: poseName,
      savedAt: new Date().toISOString(),
      topics: collectCurrentPoseTopics(),
    };

    setConfigurations((prev) =>
      prev.map((configuration) =>
        configuration.name !== selectedConfigName
          ? configuration
          : {
              ...configuration,
              poses: upsertPose(configuration.poses ?? [], nextPose),
              updatedAt: new Date().toISOString(),
            }
      )
    );
    setStatusMessage(`Pose "${poseName}" saved for screen "${selectedConfigName}".`);
  };

  const loadPoseByName = (poseName: string) => {
    if (!selectedConfigName) {
      setStatusMessage("Select a screen before loading a pose.");
      return;
    }
    const configuration = configurations.find((item) => item.name === selectedConfigName);
    if (!configuration) {
      setStatusMessage("Screen not found.");
      return;
    }

    const pose = configuration.poses.find((item) => item.name === poseName);
    if (!pose) {
      setStatusMessage(`Pose "${poseName}" not found.`);
      return;
    }

    const touchedWidgetIds: string[] = [];

    for (const widget of widgets) {
      const topicValue = pose.topics[widget.topic];
      if (!topicValue) continue;

      if (widget.kind === "slider" && topicValue.kind === "scalar") {
        const clamped = Math.min(widget.max, Math.max(widget.min, topicValue.value));
        if (widget.binding === "z") {
          setZ(clamped);
        } else {
          setRz(clamped);
        }
        touchedWidgetIds.push(widget.id);
        continue;
      }

      if (widget.kind === "joystick" && topicValue.kind === "vector2") {
        const x = clampSignedUnit(topicValue.x);
        const y = clampSignedUnit(topicValue.y);
        if (widget.binding === "joy") {
          setJoy(x, y);
        } else {
          setRot(x, y);
        }
        touchedWidgetIds.push(widget.id);
      }
    }

    if (touchedWidgetIds.length) {
      setWidgetPulseMap((prev) => {
        const now = Date.now();
        const next = { ...prev };
        for (const widgetId of touchedWidgetIds) {
          next[widgetId] = now;
        }
        return next;
      });
    }

    setStatusMessage(`Pose "${pose.name}" loaded.`);
  };

  const addSelectedScreenToNavigationBar = () => {
    const targetScreenId = pendingNavBarScreenId.trim();
    if (!targetScreenId) return;

    updateSelectedNavigationBar((widget) => {
      if (widget.items.some((item) => item.targetScreenId === targetScreenId)) {
        return widget;
      }

      return {
        ...widget,
        items: [
          ...widget.items,
          {
            id: nextNavigationItemId(),
            targetScreenId,
            label: targetScreenId,
          },
        ],
      };
    });
  };

  const toggleRosbagRecording = (widget: RosbagControlWidgetModel) => {
    const nextRecording = !rosbagRecording;
    setRosbagRecording(nextRecording);
    setRosbagStatus(nextRecording ? "recording" : "stopped");
    wsClient.send({
      type: "rosbag_cmd",
      action: nextRecording ? "start" : "stop",
      name: widget.bagName,
      auto_timestamp: widget.autoTimestamp,
    });
  };

  const handleSyncToFolder = async () => {
    try {
      const count = await syncConfigurationsToFolder(configurations);
      setStatusMessage(`Synced ${count} screen(s) to folder.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Sync to folder failed.");
    }
  };

  const handleSyncFromFolder = async () => {
    try {
      const merged = await syncConfigurationsFromFolder(configurations);
      setConfigurations(merged);
      setStatusMessage(`Synced ${merged.length} screen(s) from folder.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Sync from folder failed.");
    }
  };

  const zoomOutEditorCanvas = () => {
    setEditorZoom((prev) => clampEditorZoom(prev - EDITOR_ZOOM_STEP));
  };

  const zoomInEditorCanvas = () => {
    setEditorZoom((prev) => clampEditorZoom(prev + EDITOR_ZOOM_STEP));
  };

  const resetEditorCanvasZoom = () => {
    setEditorZoom(1);
  };

  const applyCanvasPreset = (nextPresetId: CanvasSettings["presetId"]) => {
    const previousPreset = getCanvasPreset(canvasSettings.presetId);
    const nextPreset = getCanvasPreset(nextPresetId);
    if (previousPreset.id === nextPreset.id) {
      return {
        changed: false,
        widgetCount: widgets.length,
        previousPreset,
        nextPreset,
      };
    }

    const widgetCount = widgets.length;
    setCanvasSettings((prev) => ({
      ...prev,
      presetId: nextPreset.id,
    }));
    setPendingResizeSourcePresetId((current) =>
      resolvePendingResizeSourcePreset(
        current,
        previousPreset.id,
        nextPreset.id,
        widgetCount > 0
      )
    );

    return {
      changed: true,
      widgetCount,
      previousPreset,
      nextPreset,
    };
  };

  const handleCanvasContextMenu = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();

    const frame = canvasFrameRef.current;
    if (!frame) return;

    const rect = frame.getBoundingClientRect();
    const safeScale = canvasScale > 0 ? canvasScale : 1;
    const rawX = (event.clientX - rect.left) / safeScale;
    const rawY = (event.clientY - rect.top) / safeScale;

    setContextMenu({
      clientX: event.clientX,
      clientY: event.clientY,
      canvasX: Math.max(0, Math.min(canvasSize.width, Math.round(rawX))),
      canvasY: Math.max(0, Math.min(canvasSize.height, Math.round(rawY))),
    });
  };

  const renderCanvasWidget = (widget: CanvasWidget) => {
    const selected = widget.id === selectedWidgetId;

    if (widget.kind === "save-pose-button") {
      return (
        <SavePoseButtonWidget
          key={widget.id}
          widget={widget}
          selected={selected}
          onSelect={() => setSelectedWidgetId(widget.id)}
          onRectChange={(next) => handleWidgetRectChange(widget.id, next)}
          onLabelChange={(nextLabel) =>
            updateWidget(widget.id, (current) =>
              current.kind === "save-pose-button" ? { ...current, label: nextLabel } : current
            )
          }
          onTrigger={saveCurrentPose}
        />
      );
    }

    if (widget.kind === "load-pose-button") {
      const poseAvailable = (activeConfiguration?.poses ?? []).some(
        (pose) => pose.name === widget.poseName
      );
      return (
        <LoadPoseButtonWidget
          key={widget.id}
          widget={widget}
          selected={selected}
          onSelect={() => setSelectedWidgetId(widget.id)}
          onRectChange={(next) => handleWidgetRectChange(widget.id, next)}
          onLabelChange={(nextLabel) =>
            updateWidget(widget.id, (current) =>
              current.kind === "load-pose-button"
                ? current.poseName
                  ? { ...current, poseName: nextLabel }
                  : { ...current, label: nextLabel }
                : current
            )
          }
          onTrigger={() => loadPoseByName(widget.poseName)}
          poseAvailable={poseAvailable}
        />
      );
    }

    if (widget.kind === "mode-button") {
      return (
        <ModeButtonWidget
          key={widget.id}
          widget={widget}
          selected={selected}
          onSelect={() => setSelectedWidgetId(widget.id)}
          onRectChange={(next) => handleWidgetRectChange(widget.id, next)}
          onLabelChange={(nextLabel) =>
            updateWidget(widget.id, (current) =>
              current.kind === "mode-button" ? { ...current, label: nextLabel } : current
            )
          }
        />
      );
    }

    if (widget.kind === "navigation-button") {
      const canNavigate = availableScreenIds.includes(widget.targetScreenId);
      return (
        <NavigationButtonWidget
          key={widget.id}
          widget={widget}
          selected={selected}
          onSelect={() => setSelectedWidgetId(widget.id)}
          onRectChange={(next) => handleWidgetRectChange(widget.id, next)}
          onLabelChange={(nextLabel) =>
            updateWidget(widget.id, (current) =>
              current.kind === "navigation-button" ? { ...current, label: nextLabel } : current
            )
          }
          onNavigate={(screenId) => setStatusMessage(`Navigation target selected: ${screenId}`)}
          canNavigate={canNavigate}
        />
      );
    }

    if (widget.kind === "navigation-bar") {
      return (
        <NavigationBarWidget
          key={widget.id}
          widget={widget}
          selected={selected}
          onSelect={() => setSelectedWidgetId(widget.id)}
          onRectChange={(next) => handleWidgetRectChange(widget.id, next)}
          onNavigate={(screenId) => setStatusMessage(`Navigation target selected: ${screenId}`)}
        />
      );
    }

    if (widget.kind === "text") {
      return (
        <TextWidget
          key={widget.id}
          widget={widget}
          selected={selected}
          onSelect={() => setSelectedWidgetId(widget.id)}
          onRectChange={(next) => handleWidgetRectChange(widget.id, next)}
          onTextChange={(nextText) =>
            updateWidget(widget.id, (current) =>
              current.kind === "text" ? { ...current, text: nextText } : current
            )
          }
        />
      );
    }

    if (widget.kind === "textarea") {
      return (
        <TextareaWidget
          key={widget.id}
          widget={widget}
          selected={selected}
          onSelect={() => setSelectedWidgetId(widget.id)}
          onRectChange={(next) => handleWidgetRectChange(widget.id, next)}
          onTextChange={(nextText) =>
            updateWidget(widget.id, (current) =>
              current.kind === "textarea" ? { ...current, text: nextText } : current
            )
          }
        />
      );
    }

    if (widget.kind === "button") {
      return (
        <ActionButtonWidget
          key={widget.id}
          widget={widget}
          selected={selected}
          onSelect={() => setSelectedWidgetId(widget.id)}
          onRectChange={(next) => handleWidgetRectChange(widget.id, next)}
          onLabelChange={(nextLabel) =>
            updateWidget(widget.id, (current) =>
              current.kind === "button" ? { ...current, label: nextLabel } : current
            )
          }
          onTrigger={() => {
            wsClient.send({
              type: "ui_button",
              topic: widget.topic,
              payload: widget.payload,
              widget_id: widget.id,
            });
            setStatusMessage(`Button "${widget.label}" emitted payload.`);
          }}
        />
      );
    }

    if (widget.kind === "rosbag-control") {
      return (
        <RosbagControlWidget
          key={widget.id}
          widget={widget}
          selected={selected}
          onSelect={() => setSelectedWidgetId(widget.id)}
          onRectChange={(next) => handleWidgetRectChange(widget.id, next)}
          onLabelChange={(nextLabel) =>
            updateWidget(widget.id, (current) =>
              current.kind === "rosbag-control" ? { ...current, label: nextLabel } : current
            )
          }
          isRecording={rosbagRecording}
          statusText={rosbagStatus}
          onToggleRecording={() => toggleRosbagRecording(widget)}
        />
      );
    }

    if (widget.kind === "throw-draw") {
      const angleMin = Math.min(widget.angleMin, widget.angleMax);
      const angleMax = Math.max(widget.angleMin, widget.angleMax);
      const durationMin = Math.min(widget.durationMin, widget.durationMax);
      const durationMax = Math.max(widget.durationMin, widget.durationMax);
      const hasAlphaControl =
        typeof widget.alphaTopic === "string" && widget.alphaTopic.trim().length > 0;
      const alphaMin = Math.min(widget.alphaMin ?? 0, widget.alphaMax ?? 40);
      const alphaMax = Math.max(widget.alphaMin ?? 0, widget.alphaMax ?? 40);
      const defaultDuration =
        widget.powerTopic === PETANQUE_TOTAL_DURATION_TOPIC
          ? PETANQUE_DEFAULT_TOTAL_DURATION_S
          : durationMax;
      const drawValue = throwDrawWidgetValues[widget.id] ?? {
        angle: Math.max(angleMin, Math.min(angleMax, 0)),
        duration: Math.max(durationMin, Math.min(durationMax, defaultDuration)),
      };
      const drawAlphaValue = hasAlphaControl
        ? Math.max(alphaMin, Math.min(alphaMax, throwDrawAlphaValues[widget.id] ?? alphaMin))
        : undefined;
      return (
        <ThrowDrawWidget
          key={widget.id}
          widget={widget}
          selected={selected}
          onSelect={() => setSelectedWidgetId(widget.id)}
          onRectChange={(next) => handleWidgetRectChange(widget.id, next)}
          angleValue={drawValue.angle}
          durationValue={drawValue.duration}
          alphaValue={drawAlphaValue}
          onAlphaChange={
            hasAlphaControl
              ? (nextAlpha) => {
                  setThrowDrawAlphaValues((prev) => ({
                    ...prev,
                    [widget.id]: Math.max(alphaMin, Math.min(alphaMax, nextAlpha)),
                  }));
                  markWidgetPulse(widget.id);
                }
              : undefined
          }
          onValueChange={(next) => {
            const resolvedAngle =
              typeof next.angle === "number"
                ? Math.max(angleMin, Math.min(angleMax, next.angle))
                : drawValue.angle;
            const resolvedDuration =
              typeof next.duration === "number"
                ? Math.max(durationMin, Math.min(durationMax, next.duration))
                : drawValue.duration;
            setThrowDrawWidgetValues((prev) => ({
              ...prev,
              [widget.id]: {
                angle: resolvedAngle,
                duration: resolvedDuration,
              },
            }));
            if (typeof next.alpha === "number" && hasAlphaControl) {
              const resolvedAlpha = Math.max(alphaMin, Math.min(alphaMax, next.alpha));
              setThrowDrawAlphaValues((prev) => ({
                ...prev,
                [widget.id]: resolvedAlpha,
              }));
            }
            markWidgetPulse(widget.id);
          }}
        />
      );
    }

    if (widget.kind === "max-velocity") {
      const clampToWidgetRange = (raw: number) => Math.max(widget.min, Math.min(widget.max, raw));
      const fallbackValue = clampToWidgetRange(maxVelocityWidgetValues[widget.id] ?? 1);
      const widgetValue =
        resolveTeleopConfigScalarValue(widget.topic, teleopConfigScalarSnapshot) ??
        fallbackValue;
      const reverseDirection =
        widget.reverseDirection ??
        widget.topic === PETANQUE_TOTAL_DURATION_TOPIC;
      const endpointLabels =
        widget.endpointLeftLabel || widget.endpointRightLabel
          ? {
              left: widget.endpointLeftLabel,
              right: widget.endpointRightLabel,
            }
          : widget.topic === PETANQUE_TOTAL_DURATION_TOPIC
            ? { left: "Slow", right: "Fast" }
            : widget.topic === PETANQUE_ANGLE_TOPIC
              ? { left: "Left", right: "Right" }
              : widget.topic === PETANQUE_ALPHA_TOPIC
                ? { left: "Tirer", right: "Pointer" }
                : undefined;
      return (
        <MaxVelocityWidget
          key={widget.id}
          widget={widget}
          selected={selected}
          onSelect={() => setSelectedWidgetId(widget.id)}
          onRectChange={(next) => handleWidgetRectChange(widget.id, next)}
          onLabelChange={(nextLabel) =>
            updateWidget(widget.id, (current) =>
              current.kind === "max-velocity" ? { ...current, label: nextLabel } : current
            )
          }
          value={clampToWidgetRange(widgetValue)}
          endpointLabels={endpointLabels}
          bubbleValueFormatter={resolveMaxVelocityBubbleFormatter(widget, reverseDirection)}
          unsafeThreshold={
            typeof widget.unsafeThreshold === "number"
              ? widget.unsafeThreshold
              : widget.topic === PETANQUE_ALPHA_TOPIC
                ? PETANQUE_ALPHA_SAFE_MAX
                : undefined
          }
          reverseDirection={reverseDirection}
          onValueChange={(nextValue) => {
            const resolvedNextValue = clampToWidgetRange(nextValue);
            const appliedToTeleopConfig = applyTeleopConfigScalarValue(
              widget.topic,
              resolvedNextValue,
              teleopConfigScalarActions
            );
            if (!appliedToTeleopConfig) {
              setMaxVelocityWidgetValues((prev) => ({
                ...prev,
                [widget.id]: resolvedNextValue,
              }));
            }
            markWidgetPulse(widget.id);
          }}
        />
      );
    }

    if (widget.kind === "gripper-control") {
      return (
        <GripperControlWidget
          key={widget.id}
          widget={widget}
          selected={selected}
          onSelect={() => setSelectedWidgetId(widget.id)}
          onRectChange={(next) => handleWidgetRectChange(widget.id, next)}
          onLabelChange={(nextLabel) =>
            updateWidget(widget.id, (current) =>
              current.kind === "gripper-control" ? { ...current, label: nextLabel } : current
            )
          }
          activeState={
            wsState?.gripper_state === "open" || wsState?.gripper_state === "close"
              ? wsState.gripper_state
              : null
          }
          onOpen={() => {
            wsClient.send({ type: "gripper_cmd", action: "open" });
            setStatusMessage("Gripper open command sent.");
          }}
          onClose={() => {
            wsClient.send({ type: "gripper_cmd", action: "close" });
            setStatusMessage("Gripper close command sent.");
          }}
        />
      );
    }

    if (widget.kind === "magnet-control") {
      return (
        <MagnetControlWidget
          key={widget.id}
          widget={widget}
          selected={selected}
          onSelect={() => setSelectedWidgetId(widget.id)}
          onRectChange={(next) => handleWidgetRectChange(widget.id, next)}
          onLabelChange={(nextLabel) =>
            updateWidget(widget.id, (current) =>
              current.kind === "magnet-control" ? { ...current, label: nextLabel } : current
            )
          }
          onActivate={() => {
            wsClient.send({
              type: "ui_button",
              topic: widget.topic,
              payload: widget.onPayload,
              widget_id: widget.id,
            });
            markWidgetPulse(widget.id);
          }}
          onDeactivate={() => {
            wsClient.send({
              type: "ui_button",
              topic: widget.topic,
              payload: widget.offPayload,
              widget_id: widget.id,
            });
            markWidgetPulse(widget.id);
          }}
        />
      );
    }

    if (widget.kind === "toggle-publisher") {
      return (
        <TogglePublisherWidget
          key={widget.id}
          widget={widget}
          selected={selected}
          onSelect={() => setSelectedWidgetId(widget.id)}
          onRectChange={(next) => handleWidgetRectChange(widget.id, next)}
          onLabelChange={(nextLabel) =>
            updateWidget(widget.id, (current) =>
              current.kind === "toggle-publisher" ? { ...current, label: nextLabel } : current
            )
          }
          onActivate={() => {
            wsClient.send(buildTogglePublisherWsMessage(widget, "on"));
            markWidgetPulse(widget.id);
            setStatusMessage(`Toggle "${widget.label}" published ON.`);
          }}
          onDeactivate={() => {
            wsClient.send(buildTogglePublisherWsMessage(widget, "off"));
            markWidgetPulse(widget.id);
            setStatusMessage(`Toggle "${widget.label}" published OFF.`);
          }}
        />
      );
    }

    if (widget.kind === "ros-message-toggle") {
      return (
        <RosMessageToggleWidget
          key={widget.id}
          widget={widget}
          selected={selected}
          onSelect={() => setSelectedWidgetId(widget.id)}
          onRectChange={(next) => handleWidgetRectChange(widget.id, next)}
          onLabelChange={(nextLabel) =>
            updateWidget(widget.id, (current) =>
              current.kind === "ros-message-toggle" ? { ...current, label: nextLabel } : current
            )
          }
          onActivate={() => {
            wsClient.send(buildRosMessageToggleWsMessage(widget, "on"));
            markWidgetPulse(widget.id);
            setStatusMessage(`ROS toggle "${widget.label}" published ON.`);
          }}
          onDeactivate={() => {
            wsClient.send(buildRosMessageToggleWsMessage(widget, "off"));
            markWidgetPulse(widget.id);
            setStatusMessage(`ROS toggle "${widget.label}" published OFF.`);
          }}
        />
      );
    }

    if (widget.kind === "momentary-ros-message") {
      return (
        <MomentaryRosMessageWidget
          key={widget.id}
          widget={widget}
          selected={selected}
          onSelect={() => setSelectedWidgetId(widget.id)}
          onRectChange={(next) => handleWidgetRectChange(widget.id, next)}
          onLabelChange={(nextLabel) =>
            updateWidget(widget.id, (current) =>
              current.kind === "momentary-ros-message" ? { ...current, label: nextLabel } : current
            )
          }
          onPress={() => {
            wsClient.send(buildMomentaryRosMessageWsMessage(widget, "pressed"));
            markWidgetPulse(widget.id);
            setStatusMessage(`Momentary "${widget.label}" published PRESSED.`);
          }}
          onRelease={() => {
            wsClient.send(buildMomentaryRosMessageWsMessage(widget, "released"));
            markWidgetPulse(widget.id);
            setStatusMessage(`Momentary "${widget.label}" published RELEASED.`);
          }}
        />
      );
    }

    if (widget.kind === "stream-display") {
      const url =
        widget.source === "camera"
          ? cameraStreamUrl
          : widget.source === "rviz"
            ? rvizStreamUrl
            : widget.streamUrl;
      const sourceStatus =
        widget.source === "rviz"
          ? "RViz stream"
          : widget.source === "visualization"
            ? "Visualization stream"
            : widget.source === "webcam"
              ? "Webcam stream"
              : "Camera stream";
      return (
        <StreamDisplayWidget
          key={widget.id}
          widget={{
            ...widget,
            streamUrl: url || widget.streamUrl,
            fitMode: widget.fitMode ?? "contain",
            showStatus: widget.showStatus ?? true,
            showUrl: widget.showUrl ?? true,
            overlayText: widget.overlayText ?? "stream preview",
          }}
          selected={selected}
          onSelect={() => setSelectedWidgetId(widget.id)}
          onRectChange={(next) => handleWidgetRectChange(widget.id, next)}
          onLabelChange={(nextLabel) =>
            updateWidget(widget.id, (current) =>
              current.kind === "stream-display" ? { ...current, label: nextLabel } : current
            )
          }
          statusText={sourceStatus}
        />
      );
    }

    if (widget.kind === "drink") {
      return (
        <DrinkWidget
          key={widget.id}
          widget={widget}
          selected={selected}
          onSelect={() => setSelectedWidgetId(widget.id)}
          onRectChange={(next) => handleWidgetRectChange(widget.id, next)}
          onLabelChange={(nextLabel) =>
            updateWidget(widget.id, (current) =>
              current.kind === "drink" ? { ...current, label: nextLabel } : current
            )
          }
        />
      );
    }

    if (widget.kind === "curves") {
      return (
        <CurvesWidget
          key={widget.id}
          widget={widget}
          selected={selected}
          onSelect={() => setSelectedWidgetId(widget.id)}
          onRectChange={(next) => handleWidgetRectChange(widget.id, next)}
          onLabelChange={(nextLabel) =>
            updateWidget(widget.id, (current) =>
              current.kind === "curves" ? { ...current, label: nextLabel } : current
            )
          }
        />
      );
    }

    if (widget.kind === "logs") {
      return (
        <LogsWidget
          key={widget.id}
          widget={widget}
          selected={selected}
          onSelect={() => setSelectedWidgetId(widget.id)}
          onRectChange={(next) => handleWidgetRectChange(widget.id, next)}
          onLabelChange={(nextLabel) =>
            updateWidget(widget.id, (current) =>
              current.kind === "logs" ? { ...current, label: nextLabel } : current
            )
          }
        />
      );
    }

    if (widget.kind === "topic-monitor") {
      return (
        <TopicMonitorWidget
          key={widget.id}
          widget={widget}
          selected={selected}
          onSelect={() => setSelectedWidgetId(widget.id)}
          onRectChange={(next) => handleWidgetRectChange(widget.id, next)}
          onLabelChange={(nextLabel) =>
            updateWidget(widget.id, (current) =>
              current.kind === "topic-monitor" ? { ...current, label: nextLabel } : current
            )
          }
        />
      );
    }

    if (widget.kind === "slider") {
      const value = widget.binding === "z" ? z : rz;
      const onChange = widget.binding === "z" ? setZ : setRz;
      const topicPreview = `${widget.topic}: ${value.toFixed(2)}`;
      const isTopicFresh = isWidgetFresh(widget.id);

      return (
        <SliderWidget
          key={widget.id}
          widget={widget}
          value={value}
          onValueChange={(nextValue) => {
            onChange(nextValue);
            markWidgetPulse(widget.id);
          }}
          topicPreview={topicPreview}
          isTopicFresh={isTopicFresh}
          selected={selected}
          onSelect={() => setSelectedWidgetId(widget.id)}
          onRectChange={(next) => handleWidgetRectChange(widget.id, next)}
        />
      );
    }

    const metrics = widget.binding === "joy" ? { x: joyX, y: joyY, magnitude } : { x: rotX, y: rotY };
    const topicPreview = `${widget.topic}: x=${metrics.x.toFixed(2)} y=${metrics.y.toFixed(2)}`;
    const isTopicFresh = isWidgetFresh(widget.id);

    return (
      <JoystickWidget
        key={widget.id}
        widget={widget}
        selected={selected}
        onSelect={() => setSelectedWidgetId(widget.id)}
        onRectChange={(next) => handleWidgetRectChange(widget.id, next)}
        onLabelChange={(nextLabel) =>
          updateWidget(widget.id, (current) =>
            current.kind === "joystick" ? { ...current, label: nextLabel } : current
          )
        }
        onMove={(x, y) => {
          if (widget.binding === "joy") {
            setJoy(x, y);
          } else {
            setRot(x, y);
          }
          markWidgetPulse(widget.id);
        }}
        metrics={metrics}
        topicPreview={topicPreview}
        isTopicFresh={isTopicFresh}
      />
    );
  };

  const canvasViewportClassName = `controls-canvas-viewport controls-canvas-mode-${runtimeCanvasMode}`;
  const canvasFrameStyle = {
    width: `${scaledCanvasSize.width}px`,
    height: `${scaledCanvasSize.height}px`,
  };
  const canvasTransformStyle = {
    width: `${canvasSize.width}px`,
    height: `${canvasSize.height}px`,
    transform: `scale(${canvasScale})`,
    transformOrigin: "top left",
  };
  const focusScreenClassName = selectedConfigName
    ? `controls-page-focus-screen-${toScreenClassToken(selectedConfigName)}`
    : "";

  const configToolbar = (
    <div className="controls-header-inline">
      <div className="controls-config-row">
        <label className="controls-field controls-config-field">
          <span>Screen</span>
          <select
            className="editor-input"
            value={selectedConfigName}
            onChange={(event) => handleScreenSelectionChange(event.target.value)}
          >
            <option value="">-- select --</option>
            {configurations.map((configuration) => (
              <option key={configuration.name} value={configuration.name}>
                {configuration.name}
              </option>
            ))}
          </select>
        </label>

        <label className="controls-field controls-config-field">
          <span>Name</span>
          <input
            className="editor-input"
            value={configNameInput}
            onChange={(event) => setConfigNameInput(event.target.value)}
            placeholder="new screen"
          />
        </label>

        <label className="controls-field controls-config-field">
          <span>Canvas Size</span>
          <select
            className="editor-input"
            value={canvasSettings.presetId}
            onChange={(event) => {
              const nextPresetId = event.target.value as CanvasSettings["presetId"];
              const result = applyCanvasPreset(nextPresetId);
              if (!result.changed) return;
              const resizeHint = result.widgetCount > 0 ? " Widgets kept their relative positions." : "";
              setStatusMessage(
                `Canvas size changed to ${result.nextPreset.label}.${resizeHint}`
              );
            }}
          >
            {CANVAS_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>
        <div className="controls-field controls-config-field controls-zoom-field">
          <span>Zoom</span>
          <div className="controls-zoom-controls">
            <button type="button" className="tab-button" onClick={zoomOutEditorCanvas} aria-label="Zoom out canvas">
              -
            </button>
            <button type="button" className="tab-button" onClick={resetEditorCanvasZoom} title="Reset zoom to 100%">
              {editorZoomPercent}%
            </button>
            <button type="button" className="tab-button" onClick={zoomInEditorCanvas} aria-label="Zoom in canvas">
              +
            </button>
          </div>
        </div>

        <button type="button" className="tab-button" onClick={() => selectedConfigName && loadConfigurationByName(selectedConfigName)}>
          Load
        </button>
        <button
          type="button"
          className={`tab-button ${isCanvasDirty ? "is-dirty-save" : ""}`}
          onClick={saveCurrentConfiguration}
        >
          {isCanvasDirty ? "Save*" : "Save"}
        </button>
        <button type="button" className="tab-button" onClick={deleteSelectedConfiguration} disabled={!selectedConfigName}>
          Delete
        </button>
        <button type="button" className="tab-button" onClick={clearCanvas}>
          Clear Canvas
        </button>
        <button type="button" className="tab-button" onClick={loadDemoConfiguration}>
          Load Demo
        </button>
        <button type="button" className="tab-button" onClick={() => setIsInspectorOpen((prev) => !prev)}>
          {isInspectorOpen ? "Hide Panel" : "Show Panel"}
        </button>
        <button type="button" className="tab-button" onClick={handleSyncToFolder}>
          Sync To Folder
        </button>
        <button type="button" className="tab-button" onClick={handleSyncFromFolder}>
          Sync From Folder
        </button>
      </div>
      {statusMessage ? <div className="controls-status-message">{statusMessage}</div> : null}
    </div>
  );

  if (focusOnly) {
    return (
      <main
        className={`controls-page controls-page-focus tab-accent tab-controls ${focusScreenClassName}`.trim()}
      >
        <section className="controls-workspace">
          <div className="controls-canvas-surface" ref={canvasSurfaceRef} onContextMenu={handleCanvasContextMenu}>
            <div className={canvasViewportClassName} ref={canvasViewportRef}>
              <div className="controls-canvas-frame" ref={canvasFrameRef} style={canvasFrameStyle}>
                <div className="controls-canvas-transform" style={canvasTransformStyle}>
                  <div className="controls-canvas" style={{ width: `${canvasSize.width}px`, height: `${canvasSize.height}px` }}>
                    {widgets.map(renderCanvasWidget)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {contextMenu ? (
          <div
            className="controls-context-menu"
            style={{ left: `${contextMenu.clientX}px`, top: `${contextMenu.clientY}px` }}
          >
            <div className="controls-context-title">Add Widget</div>
            <div className="controls-context-list">
              {WIDGET_CATALOG.map((entry) => (
                <button
                  key={entry.type}
                  type="button"
                  className="controls-context-item"
                  disabled={!entry.enabled}
                  onClick={() => {
                    addWidgetByType(entry.type, { x: contextMenu.canvasX, y: contextMenu.canvasY });
                    setContextMenu(null);
                  }}
                >
                  <span>{entry.label}</span>
                  <span className="controls-context-tag">{entry.enabled ? "add" : "soon"}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </main>
    );
  }

  return (
    <>
      {topBarSlotElement ? createPortal(configToolbar, topBarSlotElement) : null}
      <main className="controls-page controls-design-page tab-accent tab-controls">
        <section className="controls-workspace controls-workspace-editor">
          <div className="controls-canvas-zone">
            <div className="controls-canvas-surface" ref={canvasSurfaceRef} onContextMenu={handleCanvasContextMenu}>
              <div className={canvasViewportClassName} ref={canvasViewportRef}>
                <div className="controls-canvas-frame" ref={canvasFrameRef} style={canvasFrameStyle}>
                  <div className="controls-canvas-transform" style={canvasTransformStyle}>
                    <div className="controls-canvas" style={{ width: `${canvasSize.width}px`, height: `${canvasSize.height}px` }}>
                      <div
                        className="controls-canvas-target-zone"
                        style={{
                          width: `${targetCanvasPreset.width}px`,
                          height: `${targetCanvasPreset.height}px`,
                        }}
                        aria-hidden
                      >
                        <div className="controls-canvas-target-label">
                          {targetCanvasPreset.label}
                        </div>
                      </div>
                      {snapGuides.vertical.map((x) => (
                        <div
                          key={`snap-v-${x}`}
                          className="controls-canvas-snap-guide controls-canvas-snap-guide-vertical"
                          style={{ left: `${x}px` }}
                          aria-hidden
                        />
                      ))}
                      {snapGuides.horizontal.map((y) => (
                        <div
                          key={`snap-h-${y}`}
                          className="controls-canvas-snap-guide controls-canvas-snap-guide-horizontal"
                          style={{ top: `${y}px` }}
                          aria-hidden
                        />
                      ))}
                      {widgets.map(renderCanvasWidget)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {isInspectorOpen ? (
            <aside className="controls-aside controls-aside-overlay">
              <section className="card controls-aside-menu">
              <h2>Widgets</h2>

              <div className="controls-widget-actions">
                <select
                  className="editor-input"
                  value={quickAddType}
                  onChange={(event) => setQuickAddType(event.target.value as WidgetCatalogType)}
                >
                  {ENABLED_WIDGETS.map((entry) => (
                    <option key={entry.type} value={entry.type}>
                      {entry.label}
                    </option>
                  ))}
                </select>
                <button type="button" className="tab-button" onClick={() => addWidgetByType(quickAddType)}>
                  Add
                </button>
                <button type="button" className="tab-button" onClick={removeSelectedWidget} disabled={!selectedWidget}>
                  Remove
                </button>
              </div>

              <div className="controls-hint">
                Drag widgets to move. Right click to add at cursor. Snap: {SNAP_MODE_LABEL[snapMode]}. Use Zoom +/- or Fit to frame the slide.
              </div>

              <div className="controls-menu-list">
                {widgets.map((widget) => (
                  <button
                    key={widget.id}
                    type="button"
                    className={`controls-menu-item ${selectedWidgetId === widget.id ? "is-selected" : ""}`}
                    onClick={() => setSelectedWidgetId(widget.id)}
                  >
                    <span>{widget.label || widget.id}</span>
                    <span className="controls-menu-state">{widget.kind}</span>
                  </button>
                ))}
              </div>
            </section>

              <section className="card controls-inspector-card">
              <h2>Properties</h2>
              {!selectedWidget ? (
                <div className="placeholder">Select a widget to edit properties.</div>
              ) : (
                <div className="controls-inspector-grid">
                  <label className="controls-field">
                    <span>Type</span>
                    <input className="editor-input" value={selectedWidget.kind} readOnly />
                  </label>

                  <label className="controls-field">
                    <span>Label</span>
                    <input
                      className="editor-input"
                      value={selectedWidget.label}
                      onChange={(event) =>
                        updateSelectedWidget((widget) => ({
                          ...widget,
                          label: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label className="controls-field">
                    <span>Topic</span>
                    <input
                      className="editor-input"
                      value={selectedWidget.topic}
                      onChange={(event) =>
                        updateSelectedWidget((widget) => ({
                          ...widget,
                          topic: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <div className="controls-field-row">
                    <label className="controls-field">
                      <span>X</span>
                      <input
                        type="number"
                        className="editor-input"
                        value={selectedWidget.rect.x}
                        onChange={(event) => updateSelectedRectField("x", event.target.value)}
                      />
                    </label>
                    <label className="controls-field">
                      <span>Y</span>
                      <input
                        type="number"
                        className="editor-input"
                        value={selectedWidget.rect.y}
                        onChange={(event) => updateSelectedRectField("y", event.target.value)}
                      />
                    </label>
                    <label className="controls-field">
                      <span>W</span>
                      <input
                        type="number"
                        className="editor-input"
                        value={selectedWidget.rect.w}
                        onChange={(event) => updateSelectedRectField("w", event.target.value)}
                      />
                    </label>
                    <label className="controls-field">
                      <span>H</span>
                      <input
                        type="number"
                        className="editor-input"
                        value={selectedWidget.rect.h}
                        onChange={(event) => updateSelectedRectField("h", event.target.value)}
                      />
                    </label>
                  </div>

                  {selectedWidget.kind === "joystick" ? (
                    <>
                      <div className="controls-property-title">Joystick</div>
                      <div className="controls-field-row">
                        <label className="controls-field">
                          <span>Binding</span>
                          <select
                            className="editor-input"
                            value={selectedWidget.binding}
                            onChange={(event) =>
                              updateSelectedJoystick((widget) => ({
                                ...widget,
                                binding: event.target.value === "rot" ? "rot" : "joy",
                              }))
                            }
                          >
                            <option value="joy">translation</option>
                            <option value="rot">rotation</option>
                          </select>
                        </label>

                        <label className="controls-field">
                          <span>Deadzone (0..1)</span>
                          <input
                            type="number"
                            min={0}
                            max={1}
                            step={0.01}
                            className="editor-input"
                            value={selectedWidget.deadzone}
                            onChange={(event) =>
                              updateSelectedJoystick((widget) => ({
                                ...widget,
                                deadzone: clamp01(readNumber(event.target.value, widget.deadzone)),
                              }))
                            }
                          />
                        </label>

                        <label className="controls-field">
                          <span>Disk Radius</span>
                          <input
                            type="number"
                            min={20}
                            step={1}
                            className="editor-input"
                            value={selectedWidget.diskSize}
                            onChange={(event) =>
                              updateSelectedJoystick((widget) => ({
                                ...widget,
                                diskSize: Math.max(20, Math.round(readNumber(event.target.value, widget.diskSize))),
                              }))
                            }
                          />
                        </label>

                        <label className="controls-field">
                          <span>Topic Info</span>
                          <select
                            className="editor-input"
                            value={(selectedWidget.showTopicInfo ?? true) ? "visible" : "hidden"}
                            onChange={(event) =>
                              updateSelectedJoystick((widget) => ({
                                ...widget,
                                showTopicInfo: event.target.value === "visible",
                              }))
                            }
                          >
                            <option value="visible">visible</option>
                            <option value="hidden">hidden</option>
                          </select>
                        </label>
                      </div>

                      <div className="controls-field-row">
                        <label className="controls-field">
                          <span>Color Picker</span>
                          <input
                            type="color"
                            className="editor-input"
                            value={toColorInputValue(selectedWidget.color)}
                            onChange={(event) =>
                              updateSelectedJoystick((widget) => ({
                                ...widget,
                                color: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label className="controls-field">
                          <span>Color Hex</span>
                          <input
                            className="editor-input"
                            value={selectedWidget.color}
                            onChange={(event) =>
                              updateSelectedJoystick((widget) => ({
                                ...widget,
                                color: event.target.value,
                              }))
                            }
                          />
                        </label>
                      </div>

                      <div className="controls-field-row">
                        <label className="controls-field">
                          <span>Top Label</span>
                          <input
                            className="editor-input"
                            value={selectedWidget.labels.top}
                            onChange={(event) =>
                              updateSelectedJoystick((widget) => ({
                                ...widget,
                                labels: { ...widget.labels, top: event.target.value },
                              }))
                            }
                          />
                        </label>
                        <label className="controls-field">
                          <span>Right Label</span>
                          <input
                            className="editor-input"
                            value={selectedWidget.labels.right}
                            onChange={(event) =>
                              updateSelectedJoystick((widget) => ({
                                ...widget,
                                labels: { ...widget.labels, right: event.target.value },
                              }))
                            }
                          />
                        </label>
                      </div>

                      <div className="controls-field-row">
                        <label className="controls-field">
                          <span>Bottom Label</span>
                          <input
                            className="editor-input"
                            value={selectedWidget.labels.bottom}
                            onChange={(event) =>
                              updateSelectedJoystick((widget) => ({
                                ...widget,
                                labels: { ...widget.labels, bottom: event.target.value },
                              }))
                            }
                          />
                        </label>
                        <label className="controls-field">
                          <span>Left Label</span>
                          <input
                            className="editor-input"
                            value={selectedWidget.labels.left}
                            onChange={(event) =>
                              updateSelectedJoystick((widget) => ({
                                ...widget,
                                labels: { ...widget.labels, left: event.target.value },
                              }))
                            }
                          />
                        </label>
                      </div>
                    </>
                  ) : selectedWidget.kind === "slider" ? (
                    <>
                      <div className="controls-property-title">Slider</div>
                      <div className="controls-field-row">
                        <label className="controls-field">
                          <span>Binding</span>
                          <select
                            className="editor-input"
                            value={selectedWidget.binding}
                            onChange={(event) =>
                              updateSelectedSlider((widget) => ({
                                ...widget,
                                binding: event.target.value === "rz" ? "rz" : "z",
                              }))
                            }
                          >
                            <option value="z">z</option>
                            <option value="rz">rz</option>
                          </select>
                        </label>

                        <label className="controls-field">
                          <span>Direction</span>
                          <select
                            className="editor-input"
                            value={selectedWidget.direction}
                            onChange={(event) =>
                              updateSelectedSlider((widget) => ({
                                ...widget,
                                direction: event.target.value === "horizontal" ? "horizontal" : "vertical",
                              }))
                            }
                          >
                            <option value="vertical">vertical</option>
                            <option value="horizontal">horizontal</option>
                          </select>
                        </label>

                        <label className="controls-field">
                          <span>Label Visibility</span>
                          <select
                            className="editor-input"
                            value={(selectedWidget.showLabel ?? true) ? "visible" : "hidden"}
                            onChange={(event) =>
                              updateSelectedSlider((widget) => ({
                                ...widget,
                                showLabel: event.target.value === "visible",
                              }))
                            }
                          >
                            <option value="visible">visible</option>
                            <option value="hidden">hidden</option>
                          </select>
                        </label>

                        <label className="controls-field">
                          <span>Label Align</span>
                          <select
                            className="editor-input"
                            value={selectedWidget.labelAlign ?? "center"}
                            onChange={(event) =>
                              updateSelectedSlider((widget) => ({
                                ...widget,
                                labelAlign:
                                  event.target.value === "left"
                                    ? "left"
                                    : event.target.value === "right"
                                      ? "right"
                                      : "center",
                              }))
                            }
                          >
                            <option value="left">left</option>
                            <option value="center">center</option>
                            <option value="right">right</option>
                          </select>
                        </label>

                        <label className="controls-field">
                          <span>Topic Info</span>
                          <select
                            className="editor-input"
                            value={(selectedWidget.showTopicInfo ?? true) ? "visible" : "hidden"}
                            onChange={(event) =>
                              updateSelectedSlider((widget) => ({
                                ...widget,
                                showTopicInfo: event.target.value === "visible",
                              }))
                            }
                          >
                            <option value="visible">visible</option>
                            <option value="hidden">hidden</option>
                          </select>
                        </label>
                      </div>

                      <div className="controls-field-row">
                        <label className="controls-field">
                          <span>Min</span>
                          <input
                            type="number"
                            step={0.01}
                            className="editor-input"
                            value={selectedWidget.min}
                            onChange={(event) =>
                              updateSelectedSlider((widget) => ({
                                ...widget,
                                min: readNumber(event.target.value, widget.min),
                              }))
                            }
                          />
                        </label>

                        <label className="controls-field">
                          <span>Max</span>
                          <input
                            type="number"
                            step={0.01}
                            className="editor-input"
                            value={selectedWidget.max}
                            onChange={(event) =>
                              updateSelectedSlider((widget) => ({
                                ...widget,
                                max: readNumber(event.target.value, widget.max),
                              }))
                            }
                          />
                        </label>

                        <label className="controls-field">
                          <span>Step</span>
                          <input
                            type="number"
                            step={0.01}
                            className="editor-input"
                            value={selectedWidget.step}
                            onChange={(event) =>
                              updateSelectedSlider((widget) => ({
                                ...widget,
                                step: Math.max(0.001, readNumber(event.target.value, widget.step)),
                              }))
                            }
                          />
                        </label>
                      </div>
                    </>
                  ) : selectedWidget.kind === "load-pose-button" ? (
                    <>
                      <div className="controls-property-title">Load Pose Button</div>
                      <div className="controls-field-row">
                        <label className="controls-field">
                          <span>Pose</span>
                          <select
                            className="editor-input"
                            value={selectedWidget.poseName}
                            onChange={(event) =>
                              updateSelectedLoadPoseButton((widget) => ({
                                ...widget,
                                poseName: event.target.value,
                              }))
                            }
                          >
                            <option value="">-- select pose --</option>
                            {(activeConfiguration?.poses ?? []).map((pose) => (
                              <option key={pose.name} value={pose.name}>
                                {pose.name}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="controls-field">
                          <span>Icon</span>
                          <select
                            className="editor-input"
                            value={selectedWidget.icon}
                            onChange={(event) =>
                              updateSelectedLoadPoseButton((widget) => ({
                                ...widget,
                                icon: (event.target.value === "save" ? "save" : "home") as WidgetIcon,
                              }))
                            }
                          >
                            <option value="home">home</option>
                            <option value="save">save</option>
                            <option value="arrow-right">arrow-right</option>
                          </select>
                        </label>
                      </div>
                    </>
                  ) : selectedWidget.kind === "navigation-button" ? (
                    <>
                      <div className="controls-property-title">Navigation Button</div>
                      <div className="controls-field-row">
                        <label className="controls-field">
                          <span>Target Screen</span>
                          <select
                            className="editor-input"
                            value={selectedWidget.targetScreenId}
                            onChange={(event) =>
                              updateSelectedNavigationButton((widget) => ({
                                ...widget,
                                targetScreenId: event.target.value,
                              }))
                            }
                          >
                            <option value="">-- select screen --</option>
                            {availableScreenIds.map((screenId) => (
                              <option key={screenId} value={screenId}>
                                {screenId}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="controls-field">
                          <span>Icon</span>
                          <select
                            className="editor-input"
                            value={selectedWidget.icon}
                            onChange={(event) =>
                              updateSelectedNavigationButton((widget) => ({
                                ...widget,
                                icon: (event.target.value as WidgetIcon) || "arrow-right",
                              }))
                            }
                          >
                            <option value="arrow-right">arrow-right</option>
                            <option value="home">home</option>
                            <option value="save">save</option>
                          </select>
                        </label>
                      </div>
                    </>
                  ) : selectedWidget.kind === "navigation-bar" ? (
                    <>
                      <div className="controls-property-title">Navigation Bar</div>
                      <div className="controls-field-row">
                        <label className="controls-field">
                          <span>Orientation</span>
                          <select
                            className="editor-input"
                            value={selectedWidget.orientation}
                            onChange={(event) =>
                              updateSelectedNavigationBar((widget) => ({
                                ...widget,
                                orientation:
                                  event.target.value === "horizontal" ? "horizontal" : "vertical",
                              }))
                            }
                          >
                            <option value="vertical">vertical</option>
                            <option value="horizontal">horizontal</option>
                          </select>
                        </label>
                        <label className="controls-field">
                          <span>Add Screen</span>
                          <select
                            className="editor-input"
                            value={pendingNavBarScreenId}
                            onChange={(event) => setPendingNavBarScreenId(event.target.value)}
                          >
                            <option value="">-- select screen --</option>
                            {availableScreenIds
                              .filter(
                                (screenId) =>
                                  !selectedWidget.items.some(
                                    (item) => item.targetScreenId === screenId
                                  )
                              )
                              .map((screenId) => (
                                <option key={screenId} value={screenId}>
                                  {screenId}
                                </option>
                              ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          className="tab-button controls-inline-button"
                          onClick={addSelectedScreenToNavigationBar}
                          disabled={!pendingNavBarScreenId}
                        >
                          Add Link
                        </button>
                      </div>
                      <div className="controls-navigation-editor">
                        {selectedWidget.items.length === 0 ? (
                          <div className="controls-hint">No navigation links yet.</div>
                        ) : (
                          selectedWidget.items.map((item) => (
                            <div key={item.id} className="controls-navigation-editor-row">
                              <label className="controls-field">
                                <span>Screen</span>
                                <select
                                  className="editor-input"
                                  value={item.targetScreenId}
                                  onChange={(event) =>
                                    updateSelectedNavigationBar((widget) => ({
                                      ...widget,
                                      items: widget.items.map((entry) =>
                                        entry.id !== item.id
                                          ? entry
                                          : {
                                              ...entry,
                                              targetScreenId: event.target.value,
                                              label:
                                                entry.label.trim() && entry.label !== item.targetScreenId
                                                  ? entry.label
                                                  : event.target.value,
                                            }
                                      ),
                                    }))
                                  }
                                >
                                  <option value="">-- select screen --</option>
                                  {availableScreenIds.map((screenId) => (
                                    <option key={screenId} value={screenId}>
                                      {screenId}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="controls-field">
                                <span>Label</span>
                                <input
                                  className="editor-input"
                                  value={item.label}
                                  onChange={(event) =>
                                    updateSelectedNavigationBar((widget) => ({
                                      ...widget,
                                      items: widget.items.map((entry) =>
                                        entry.id === item.id
                                          ? { ...entry, label: event.target.value }
                                          : entry
                                      ),
                                    }))
                                  }
                                />
                              </label>
                              <button
                                type="button"
                                className="tab-button controls-inline-button"
                                onClick={() =>
                                  updateSelectedNavigationBar((widget) => ({
                                    ...widget,
                                    items: widget.items.filter((entry) => entry.id !== item.id),
                                  }))
                                }
                              >
                                Remove
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  ) : selectedWidget.kind === "text" ? (
                    <>
                      <div className="controls-property-title">Text</div>
                      <label className="controls-field">
                        <span>Text</span>
                        <textarea
                          className="editor-input"
                          rows={4}
                          value={selectedWidget.text}
                          onChange={(event) =>
                            updateSelectedText((widget) => ({
                              ...widget,
                              text: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <div className="controls-field-row">
                        <label className="controls-field">
                          <span>Font Size</span>
                          <input
                            type="number"
                            className="editor-input"
                            min={10}
                            max={80}
                            value={selectedWidget.fontSize}
                            onChange={(event) =>
                              updateSelectedText((widget) => ({
                                ...widget,
                                fontSize: Math.max(10, Math.round(readNumber(event.target.value, widget.fontSize))),
                              }))
                            }
                          />
                        </label>
                        <label className="controls-field">
                          <span>Align</span>
                          <select
                            className="editor-input"
                            value={selectedWidget.align}
                            onChange={(event) =>
                              updateSelectedText((widget) => ({
                                ...widget,
                                align: (event.target.value as TextAlign) || "left",
                              }))
                            }
                          >
                            <option value="left">left</option>
                            <option value="center">center</option>
                            <option value="right">right</option>
                          </select>
                        </label>
                      </div>
                    </>
                  ) : selectedWidget.kind === "textarea" ? (
                    <>
                      <div className="controls-property-title">Textarea</div>
                      <label className="controls-field">
                        <span>Text</span>
                        <textarea
                          className="editor-input"
                          rows={8}
                          value={selectedWidget.text}
                          onChange={(event) =>
                            updateSelectedTextarea((widget) => ({
                              ...widget,
                              text: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <label className="controls-field">
                        <span>Font Size</span>
                        <input
                          type="number"
                          className="editor-input"
                          min={10}
                          max={40}
                          value={selectedWidget.fontSize}
                          onChange={(event) =>
                            updateSelectedTextarea((widget) => ({
                              ...widget,
                              fontSize: Math.max(10, Math.round(readNumber(event.target.value, widget.fontSize))),
                            }))
                          }
                        />
                      </label>
                    </>
                  ) : selectedWidget.kind === "button" ? (
                    <>
                      <div className="controls-property-title">Action Button</div>
                      <label className="controls-field">
                        <span>Payload</span>
                        <input
                          className="editor-input"
                          value={selectedWidget.payload}
                          onChange={(event) =>
                            updateSelectedButton((widget) => ({
                              ...widget,
                              payload: event.target.value,
                            }))
                          }
                        />
                      </label>
                    </>
                  ) : selectedWidget.kind === "rosbag-control" ? (
                    <>
                      <div className="controls-property-title">Rosbag Control</div>
                      <label className="controls-field">
                        <span>Bag Name</span>
                        <input
                          className="editor-input"
                          value={selectedWidget.bagName}
                          onChange={(event) =>
                            updateSelectedRosbagControl((widget) => ({
                              ...widget,
                              bagName: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <label className="controls-field">
                        <span>Auto Timestamp</span>
                        <select
                          className="editor-input"
                          value={selectedWidget.autoTimestamp ? "on" : "off"}
                          onChange={(event) =>
                            updateSelectedRosbagControl((widget) => ({
                              ...widget,
                              autoTimestamp: event.target.value === "on",
                            }))
                          }
                        >
                          <option value="on">on</option>
                          <option value="off">off</option>
                        </select>
                      </label>
                    </>
                  ) : selectedWidget.kind === "max-velocity" ? (
                    <>
                      <div className="controls-property-title">Max Velocity</div>
                      <div className="controls-field-row">
                        <label className="controls-field">
                          <span>Min</span>
                          <input
                            type="number"
                            step={0.01}
                            className="editor-input"
                            value={selectedWidget.min}
                            onChange={(event) =>
                              updateSelectedMaxVelocity((widget) => ({
                                ...widget,
                                min: readNumber(event.target.value, widget.min),
                              }))
                            }
                          />
                        </label>
                        <label className="controls-field">
                          <span>Max</span>
                          <input
                            type="number"
                            step={0.01}
                            className="editor-input"
                            value={selectedWidget.max}
                            onChange={(event) =>
                              updateSelectedMaxVelocity((widget) => ({
                                ...widget,
                                max: readNumber(event.target.value, widget.max),
                              }))
                            }
                          />
                        </label>
                        <label className="controls-field">
                          <span>Step</span>
                          <input
                            type="number"
                            step={0.01}
                            className="editor-input"
                            value={selectedWidget.step}
                            onChange={(event) =>
                              updateSelectedMaxVelocity((widget) => ({
                                ...widget,
                                step: Math.max(0.001, readNumber(event.target.value, widget.step)),
                              }))
                            }
                          />
                        </label>
                      </div>
                      <div className="controls-field-row">
                        <label className="controls-field">
                          <span>Left Endpoint</span>
                          <input
                            className="editor-input"
                            value={selectedWidget.endpointLeftLabel ?? ""}
                            onChange={(event) =>
                              updateSelectedMaxVelocity((widget) => ({
                                ...widget,
                                endpointLeftLabel: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label className="controls-field">
                          <span>Right Endpoint</span>
                          <input
                            className="editor-input"
                            value={selectedWidget.endpointRightLabel ?? ""}
                            onChange={(event) =>
                              updateSelectedMaxVelocity((widget) => ({
                                ...widget,
                                endpointRightLabel: event.target.value,
                              }))
                            }
                          />
                        </label>
                      </div>
                      <div className="controls-field-row">
                        <label className="controls-field">
                          <span>Bubble Mode</span>
                          <select
                            className="editor-input"
                            value={selectedWidget.bubbleMode ?? "number"}
                            onChange={(event) =>
                              updateSelectedMaxVelocity((widget) => ({
                                ...widget,
                                bubbleMode:
                                  event.target.value === "degrees"
                                    ? "degrees"
                                    : event.target.value === "degrees-unit"
                                      ? "degrees-unit"
                                      : event.target.value === "power"
                                        ? "power"
                                        : "number",
                              }))
                            }
                          >
                            <option value="number">number</option>
                            <option value="degrees">degrees (rad -&gt; deg)</option>
                            <option value="degrees-unit">degrees unit (value + deg)</option>
                            <option value="power">power (%)</option>
                          </select>
                        </label>
                        <label className="controls-field">
                          <span>Direction</span>
                          <select
                            className="editor-input"
                            value={selectedWidget.reverseDirection ? "reversed" : "normal"}
                            onChange={(event) =>
                              updateSelectedMaxVelocity((widget) => ({
                                ...widget,
                                reverseDirection: event.target.value === "reversed",
                              }))
                            }
                          >
                            <option value="normal">normal</option>
                            <option value="reversed">reversed</option>
                          </select>
                        </label>
                        <label className="controls-field">
                          <span>Unsafe Threshold</span>
                          <input
                            type="number"
                            step={0.01}
                            className="editor-input"
                            value={selectedWidget.unsafeThreshold ?? ""}
                            onChange={(event) =>
                              updateSelectedMaxVelocity((widget) => ({
                                ...widget,
                                unsafeThreshold: readOptionalNumber(event.target.value),
                              }))
                            }
                          />
                        </label>
                      </div>
                    </>
                  ) : selectedWidget.kind === "throw-draw" ? (
                    <>
                      <div className="controls-property-title">Throw Draw</div>
                      <div className="controls-field-row">
                        <label className="controls-field">
                          <span>Angle Topic</span>
                          <input
                            className="editor-input"
                            value={selectedWidget.angleTopic}
                            onChange={(event) =>
                              updateSelectedThrowDraw((widget) => ({
                                ...widget,
                                angleTopic: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label className="controls-field">
                          <span>Power Topic</span>
                          <input
                            className="editor-input"
                            value={selectedWidget.powerTopic}
                            onChange={(event) =>
                              updateSelectedThrowDraw((widget) => ({
                                ...widget,
                                powerTopic: event.target.value,
                              }))
                            }
                          />
                        </label>
                      </div>
                      <div className="controls-field-row">
                        <label className="controls-field">
                          <span>Angle Min</span>
                          <input
                            type="number"
                            step={0.001}
                            className="editor-input"
                            value={selectedWidget.angleMin}
                            onChange={(event) =>
                              updateSelectedThrowDraw((widget) => ({
                                ...widget,
                                angleMin: readNumber(event.target.value, widget.angleMin),
                              }))
                            }
                          />
                        </label>
                        <label className="controls-field">
                          <span>Angle Max</span>
                          <input
                            type="number"
                            step={0.001}
                            className="editor-input"
                            value={selectedWidget.angleMax}
                            onChange={(event) =>
                              updateSelectedThrowDraw((widget) => ({
                                ...widget,
                                angleMax: readNumber(event.target.value, widget.angleMax),
                              }))
                            }
                          />
                        </label>
                      </div>
                      <div className="controls-field-row">
                        <label className="controls-field">
                          <span>Duration Min</span>
                          <input
                            type="number"
                            step={0.01}
                            className="editor-input"
                            value={selectedWidget.durationMin}
                            onChange={(event) =>
                              updateSelectedThrowDraw((widget) => ({
                                ...widget,
                                durationMin: readNumber(event.target.value, widget.durationMin),
                              }))
                            }
                          />
                        </label>
                        <label className="controls-field">
                          <span>Duration Max</span>
                          <input
                            type="number"
                            step={0.01}
                            className="editor-input"
                            value={selectedWidget.durationMax}
                            onChange={(event) =>
                              updateSelectedThrowDraw((widget) => ({
                                ...widget,
                                durationMax: readNumber(event.target.value, widget.durationMax),
                              }))
                            }
                          />
                        </label>
                      </div>
                      <div className="controls-field-row controls-field-row--single">
                        <label className="controls-field">
                          <span>Alpha Topic (optional)</span>
                          <input
                            className="editor-input"
                            value={selectedWidget.alphaTopic ?? ""}
                            onChange={(event) =>
                              updateSelectedThrowDraw((widget) => ({
                                ...widget,
                                alphaTopic: event.target.value,
                              }))
                            }
                          />
                        </label>
                      </div>
                      <div className="controls-field-row controls-field-row--3">
                        <label className="controls-field">
                          <span>Alpha Min</span>
                          <input
                            type="number"
                            step={0.1}
                            className="editor-input"
                            value={selectedWidget.alphaMin ?? 0}
                            onChange={(event) =>
                              updateSelectedThrowDraw((widget) => ({
                                ...widget,
                                alphaMin: readNumber(event.target.value, widget.alphaMin ?? 0),
                              }))
                            }
                          />
                        </label>
                        <label className="controls-field">
                          <span>Alpha Max</span>
                          <input
                            type="number"
                            step={0.1}
                            className="editor-input"
                            value={selectedWidget.alphaMax ?? 40}
                            onChange={(event) =>
                              updateSelectedThrowDraw((widget) => ({
                                ...widget,
                                alphaMax: readNumber(event.target.value, widget.alphaMax ?? 40),
                              }))
                            }
                          />
                        </label>
                        <label className="controls-field">
                          <span>Alpha Safe Max</span>
                          <input
                            type="number"
                            step={0.1}
                            className="editor-input"
                            value={selectedWidget.alphaSafeMax ?? 20}
                            onChange={(event) =>
                              updateSelectedThrowDraw((widget) => ({
                                ...widget,
                                alphaSafeMax: readNumber(event.target.value, widget.alphaSafeMax ?? 20),
                              }))
                            }
                          />
                        </label>
                      </div>
                      <div className="controls-field-row">
                        <label className="controls-field">
                          <span>Charge Time (ms)</span>
                          <input
                            type="number"
                            step={50}
                            className="editor-input"
                            value={selectedWidget.holdToMaxMs}
                            onChange={(event) =>
                              updateSelectedThrowDraw((widget) => ({
                                ...widget,
                                holdToMaxMs: Math.max(250, Math.round(readNumber(event.target.value, widget.holdToMaxMs))),
                              }))
                            }
                          />
                        </label>
                      </div>
                    </>
                  ) : selectedWidget.kind === "gripper-control" ? (
                    <>
                      <div className="controls-property-title">Gripper Control</div>
                      <div className="controls-hint">
                        Sends `open` and `close` commands to the backend bridge.
                      </div>
                    </>
                  ) : selectedWidget.kind === "toggle-publisher" ? (
                    <TogglePublisherFields
                      widget={selectedWidget}
                      onChange={(nextWidget: TogglePublisherWidgetModel) =>
                        updateSelectedTogglePublisher(() => nextWidget)
                      }
                    />
                  ) : selectedWidget.kind === "ros-message-toggle" ? (
                    <RosMessageToggleFields
                      widget={selectedWidget}
                      onChange={(nextWidget: RosMessageToggleWidgetModel) =>
                        updateSelectedRosMessageToggle(() => nextWidget)
                      }
                    />
                  ) : selectedWidget.kind === "momentary-ros-message" ? (
                    <MomentaryRosMessageFields
                      widget={selectedWidget}
                      onChange={(nextWidget: MomentaryRosMessageWidgetModel) =>
                        updateSelectedMomentaryRosMessage(() => nextWidget)
                      }
                    />
                  ) : selectedWidget.kind === "stream-display" ? (
                    <>
                      <div className="controls-property-title">Stream Display</div>
                      <label className="controls-field">
                        <span>Source</span>
                        <select
                          className="editor-input"
                          value={selectedWidget.source ?? "camera"}
                          onChange={(event) =>
                            updateSelectedStreamDisplay((widget) => ({
                              ...widget,
                              source:
                                event.target.value === "rviz"
                                  ? "rviz"
                                  : event.target.value === "webcam"
                                    ? "webcam"
                                    : event.target.value === "visualization"
                                      ? "visualization"
                                      : "camera",
                            }))
                          }
                        >
                          <option value="camera">camera</option>
                          <option value="rviz">rviz</option>
                          <option value="webcam">webcam</option>
                          <option value="visualization">visualization</option>
                        </select>
                      </label>
                      <label className="controls-field">
                        <span>Fit Mode</span>
                        <select
                          className="editor-input"
                          value={selectedWidget.fitMode ?? "contain"}
                          onChange={(event) =>
                            updateSelectedStreamDisplay((widget) => ({
                              ...widget,
                              fitMode: event.target.value === "cover" ? "cover" : "contain",
                            }))
                          }
                        >
                          <option value="contain">contain</option>
                          <option value="cover">cover</option>
                        </select>
                      </label>
                      <div className="controls-field-row">
                        <label className="controls-field">
                          <span>Status Label</span>
                          <select
                            className="editor-input"
                            value={(selectedWidget.showStatus ?? true) ? "visible" : "hidden"}
                            onChange={(event) =>
                              updateSelectedStreamDisplay((widget) => ({
                                ...widget,
                                showStatus: event.target.value === "visible",
                              }))
                            }
                          >
                            <option value="visible">visible</option>
                            <option value="hidden">hidden</option>
                          </select>
                        </label>
                        <label className="controls-field">
                          <span>Stream URL Row</span>
                          <select
                            className="editor-input"
                            value={(selectedWidget.showUrl ?? true) ? "visible" : "hidden"}
                            onChange={(event) =>
                              updateSelectedStreamDisplay((widget) => ({
                                ...widget,
                                showUrl: event.target.value === "visible",
                              }))
                            }
                          >
                            <option value="visible">visible</option>
                            <option value="hidden">hidden</option>
                          </select>
                        </label>
                      </div>
                      <label className="controls-field">
                        <span>Overlay Text</span>
                        <input
                          className="editor-input"
                          value={selectedWidget.overlayText ?? "stream preview"}
                          onChange={(event) =>
                            updateSelectedStreamDisplay((widget) => ({
                              ...widget,
                              overlayText: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <label className="controls-field">
                        <span>Fallback Stream URL</span>
                        <input
                          className="editor-input"
                          value={selectedWidget.streamUrl}
                          onChange={(event) =>
                            updateSelectedStreamDisplay((widget) => ({
                              ...widget,
                              streamUrl: event.target.value,
                            }))
                          }
                        />
                      </label>
                    </>
                  ) : selectedWidget.kind === "drink" ? (
                    <>
                      <div className="controls-property-title">Drink Widget</div>
                      <label className="controls-field">
                        <span>Video URL</span>
                        <input
                          className="editor-input"
                          value={selectedWidget.videoUrl}
                          onChange={(event) =>
                            updateSelectedDrink((widget) => ({
                              ...widget,
                              videoUrl: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <label className="controls-field">
                        <span>Auto Close On End</span>
                        <select
                          className="editor-input"
                          value={selectedWidget.autoCloseOnEnd ? "enabled" : "disabled"}
                          onChange={(event) =>
                            updateSelectedDrink((widget) => ({
                              ...widget,
                              autoCloseOnEnd: event.target.value === "enabled",
                            }))
                          }
                        >
                          <option value="enabled">enabled</option>
                          <option value="disabled">disabled</option>
                        </select>
                      </label>
                    </>
                  ) : selectedWidget.kind === "curves" ? (
                    <>
                      <div className="controls-property-title">Curves</div>
                      <div className="controls-field-row">
                        <label className="controls-field">
                          <span>Sample Rate (Hz)</span>
                          <input
                            type="number"
                            min={1}
                            max={60}
                            step={1}
                            className="editor-input"
                            value={selectedWidget.sampleRateHz}
                            onChange={(event) =>
                              updateSelectedCurves((widget) => ({
                                ...widget,
                                sampleRateHz: Math.max(1, Math.min(60, Math.round(readNumber(event.target.value, widget.sampleRateHz)))),
                              }))
                            }
                          />
                        </label>
                        <label className="controls-field">
                          <span>History (s)</span>
                          <input
                            type="number"
                            min={2}
                            max={60}
                            step={1}
                            className="editor-input"
                            value={selectedWidget.historySeconds}
                            onChange={(event) =>
                              updateSelectedCurves((widget) => ({
                                ...widget,
                                historySeconds: Math.max(2, Math.min(60, Math.round(readNumber(event.target.value, widget.historySeconds)))),
                              }))
                            }
                          />
                        </label>
                        <label className="controls-field">
                          <span>Legend</span>
                          <select
                            className="editor-input"
                            value={selectedWidget.showLegend ? "visible" : "hidden"}
                            onChange={(event) =>
                              updateSelectedCurves((widget) => ({
                                ...widget,
                                showLegend: event.target.value === "visible",
                              }))
                            }
                          >
                            <option value="visible">visible</option>
                            <option value="hidden">hidden</option>
                          </select>
                        </label>
                        <label className="controls-field">
                          <span>TCP Speed Line</span>
                          <select
                            className="editor-input"
                            value={selectedWidget.showSpeed ? "visible" : "hidden"}
                            onChange={(event) =>
                              updateSelectedCurves((widget) => ({
                                ...widget,
                                showSpeed: event.target.value === "visible",
                              }))
                            }
                          >
                            <option value="visible">visible</option>
                            <option value="hidden">hidden</option>
                          </select>
                        </label>
                      </div>
                    </>
                  ) : selectedWidget.kind === "logs" ? (
                    <>
                      <div className="controls-property-title">Logs</div>
                      <div className="controls-field-row">
                        <label className="controls-field">
                          <span>Max Entries</span>
                          <input
                            type="number"
                            min={10}
                            max={1000}
                            step={1}
                            className="editor-input"
                            value={selectedWidget.maxEntries}
                            onChange={(event) =>
                              updateSelectedLogs((widget) => ({
                                ...widget,
                                maxEntries: Math.max(10, Math.min(1000, Math.round(readNumber(event.target.value, widget.maxEntries)))),
                              }))
                            }
                          />
                        </label>
                        <label className="controls-field">
                          <span>Level Filter</span>
                          <select
                            className="editor-input"
                            value={selectedWidget.levelFilter}
                            onChange={(event) =>
                              updateSelectedLogs((widget) => ({
                                ...widget,
                                levelFilter:
                                  event.target.value === "info"
                                    ? "info"
                                    : event.target.value === "warn"
                                      ? "warn"
                                      : event.target.value === "error"
                                        ? "error"
                                        : "all",
                              }))
                            }
                          >
                            <option value="all">all</option>
                            <option value="info">info</option>
                            <option value="warn">warn</option>
                            <option value="error">error</option>
                          </select>
                        </label>
                        <label className="controls-field">
                          <span>Auto Scroll</span>
                          <select
                            className="editor-input"
                            value={selectedWidget.autoScroll ? "on" : "off"}
                            onChange={(event) =>
                              updateSelectedLogs((widget) => ({
                                ...widget,
                                autoScroll: event.target.value === "on",
                              }))
                            }
                          >
                            <option value="on">on</option>
                            <option value="off">off</option>
                          </select>
                        </label>
                        <label className="controls-field">
                          <span>Timestamps</span>
                          <select
                            className="editor-input"
                            value={selectedWidget.showTimestamp ? "on" : "off"}
                            onChange={(event) =>
                              updateSelectedLogs((widget) => ({
                                ...widget,
                                showTimestamp: event.target.value === "on",
                              }))
                            }
                          >
                            <option value="on">on</option>
                            <option value="off">off</option>
                          </select>
                        </label>
                      </div>
                    </>
                  ) : selectedWidget.kind === "topic-monitor" ? (
                    <>
                      <div className="controls-property-title">Topic Monitor</div>
                      <label className="controls-field">
                        <span>Summary</span>
                        <select
                          className="editor-input"
                          value={(selectedWidget.showSummary ?? true) ? "visible" : "hidden"}
                          onChange={(event) =>
                            updateSelectedTopicMonitor((widget) => ({
                              ...widget,
                              showSummary: event.target.value === "visible",
                            }))
                          }
                        >
                          <option value="visible">visible</option>
                          <option value="hidden">hidden</option>
                        </select>
                      </label>
                      <label className="controls-field">
                        <span>Details</span>
                        <select
                          className="editor-input"
                          value={(selectedWidget.showDetails ?? true) ? "visible" : "hidden"}
                          onChange={(event) =>
                            updateSelectedTopicMonitor((widget) => ({
                              ...widget,
                              showDetails: event.target.value === "visible",
                            }))
                          }
                        >
                          <option value="visible">visible</option>
                          <option value="hidden">hidden</option>
                        </select>
                      </label>
                      <label className="controls-field">
                        <span>Raw JSON</span>
                        <select
                          className="editor-input"
                          value={selectedWidget.showRaw ? "visible" : "hidden"}
                          onChange={(event) =>
                            updateSelectedTopicMonitor((widget) => ({
                              ...widget,
                              showRaw: event.target.value === "visible",
                            }))
                          }
                        >
                          <option value="hidden">hidden</option>
                          <option value="visible">visible</option>
                        </select>
                      </label>
                      <label className="controls-field">
                        <span>Stale Threshold (ms)</span>
                        <input
                          type="number"
                          min={250}
                          max={60000}
                          step={250}
                          className="editor-input"
                          value={selectedWidget.staleAfterMs ?? 2000}
                          onChange={(event) =>
                            updateSelectedTopicMonitor((widget) => ({
                              ...widget,
                              staleAfterMs: Math.max(
                                250,
                                Math.min(
                                  60000,
                                  Math.round(readNumber(event.target.value, widget.staleAfterMs ?? 2000))
                                )
                              ),
                            }))
                          }
                        />
                      </label>
                      {selectedWidget.topics.map((topic, index) => (
                        <div className="controls-field-group" key={`${topic.topic}-${index}`}>
                          <div className="controls-field-group-header">
                            <div className="controls-property-subtitle">Topic {index + 1}</div>
                            <button
                              type="button"
                              className="controls-inline-button"
                              disabled={selectedWidget.topics.length <= 1}
                              onClick={() =>
                                updateSelectedTopicMonitor((widget) => ({
                                  ...widget,
                                  topics: widget.topics.filter((_, itemIndex) => itemIndex !== index),
                                }))
                              }
                            >
                              Remove
                            </button>
                          </div>
                          <label className="controls-field">
                            <span>Label</span>
                            <input
                              className="editor-input"
                              value={topic.label}
                              onChange={(event) =>
                                updateSelectedTopicMonitor((widget) => ({
                                  ...widget,
                                  topics: widget.topics.map((item, itemIndex) =>
                                    itemIndex === index
                                      ? { ...item, label: event.target.value }
                                      : item
                                  ),
                                }))
                              }
                            />
                          </label>
                          <label className="controls-field">
                            <span>Topic</span>
                            <input
                              className="editor-input"
                              value={topic.topic}
                              onChange={(event) =>
                                updateSelectedTopicMonitor((widget) => ({
                                  ...widget,
                                  topics: widget.topics.map((item, itemIndex) =>
                                    itemIndex === index
                                      ? { ...item, topic: event.target.value }
                                      : item
                                  ),
                                }))
                              }
                            />
                          </label>
                          <label className="controls-field">
                            <span>Message Type</span>
                            <input
                              className="editor-input"
                              value={topic.messageType}
                              onChange={(event) =>
                                updateSelectedTopicMonitor((widget) => ({
                                  ...widget,
                                  topics: widget.topics.map((item, itemIndex) =>
                                    itemIndex === index
                                      ? { ...item, messageType: event.target.value }
                                      : item
                                  ),
                                }))
                              }
                            />
                          </label>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="controls-inline-button"
                        onClick={() =>
                          updateSelectedTopicMonitor((widget) => ({
                            ...widget,
                            topics: [
                              ...widget.topics,
                              {
                                label: `Topic ${widget.topics.length + 1}`,
                                topic: "/debug/topic",
                                messageType: "std_msgs/msg/String",
                              },
                            ],
                          }))
                        }
                      >
                        Add Topic
                      </button>
                    </>
                  ) : selectedWidget.kind === "mode-button" ? (
                    <>
                      <div className="controls-property-title">Mode Button</div>
                      <div className="controls-hint">
                        Cycles teleop mode on click and updates <code>teleop_cmd.mode</code> (0..3).
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="controls-property-title">Save Pose Button</div>
                      <div className="controls-hint">
                        Saves the current canvas topic state into the selected screen.
                      </div>
                    </>
                  )}
                </div>
              )}
              </section>
            </aside>
          ) : null}
        </section>

        {contextMenu ? (
          <div
            className="controls-context-menu"
            style={{ left: `${contextMenu.clientX}px`, top: `${contextMenu.clientY}px` }}
          >
            <div className="controls-context-title">Add Widget</div>
            <div className="controls-context-list">
              {WIDGET_CATALOG.map((entry) => (
                <button
                  key={entry.type}
                  type="button"
                  className="controls-context-item"
                  disabled={!entry.enabled}
                  onClick={() => {
                    addWidgetByType(entry.type, { x: contextMenu.canvasX, y: contextMenu.canvasY });
                    setContextMenu(null);
                  }}
                >
                  <span>{entry.label}</span>
                  <span className="controls-context-tag">{entry.enabled ? "add" : "soon"}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </main>
    </>
  );
}
