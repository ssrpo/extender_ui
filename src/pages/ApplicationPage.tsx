import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { resolveApplicationRuntimePlugins } from "../app/runtime/registry";
import { useApplicationRuntimeState } from "../app/runtime/useApplicationRuntimeState";
import type { CanvasRect } from "../components/layout/CanvasItem";
import {
  DEFAULT_CANVAS_SETTINGS,
  resolveCanvasFitScale,
  resolveCanvasPresetSize,
  cloneWidgets,
  type CanvasWidget,
  type PoseSnapshot,
  type WidgetConfiguration,
} from "../components/widgets";
import { wsClient } from "../services/wsClient";
import { useTeleopStore } from "../store/teleopStore";
import { useUiStore } from "../store/uiStore";
import { browserApplicationRepository } from "../storage/applicationRepository";
import { browserConfigurationRepository } from "../storage/configurationRepository";
import {
  applyPoseSnapshot,
  collectCurrentPoseTopics,
  upsertPose,
} from "./applicationPoseRuntime";
import { RuntimeWidgetRenderer } from "./applicationRuntime/RuntimeWidgetRenderer";

type ApplicationPageProps = {
  applicationId: string;
  routeScreenId: string | null;
  onNavigateToScreen: (screenId: string) => void;
  gripperCardsVisible?: boolean;
  modeButtonsVisible?: boolean;
};

const TOPIC_FRESHNESS_MS = 200;
const TOPIC_FRESHNESS_TICK_MS = 100;

const NOOP_RECT_CHANGE: (next: CanvasRect) => void = () => {};
const NOOP_TEXT_CHANGE = Object.assign(
  () => {},
  { __readonly: true as const }
);
const toScreenClassToken = (screenId: string) =>
  screenId.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
const resolveVisualizationUrlForRuntime = (rawUrl: string) => {
  if (!rawUrl || typeof window === "undefined") return rawUrl;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost") {
      parsed.hostname = window.location.hostname;
      return parsed.toString();
    }
    return rawUrl;
  } catch {
    return rawUrl;
  }
};

export function ApplicationPage({
  applicationId,
  routeScreenId,
  onNavigateToScreen,
  gripperCardsVisible = true,
  modeButtonsVisible = true,
}: ApplicationPageProps) {
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
  const setMaxVelocity = useTeleopStore((s) => s.setMaxVelocity);
  const scaleX = useTeleopStore((s) => s.scaleX);
  const scaleY = useTeleopStore((s) => s.scaleY);
  const scaleZ = useTeleopStore((s) => s.scaleZ);
  const angularScaleX = useTeleopStore((s) => s.angularScaleX);
  const angularScaleY = useTeleopStore((s) => s.angularScaleY);
  const angularScaleZ = useTeleopStore((s) => s.angularScaleZ);
  const translationGain = useTeleopStore((s) => s.translationGain);
  const rotationGain = useTeleopStore((s) => s.rotationGain);
  const swapXY = useTeleopStore((s) => s.swapXY);
  const invertLinearX = useTeleopStore((s) => s.invertLinearX);
  const invertLinearY = useTeleopStore((s) => s.invertLinearY);
  const invertLinearZ = useTeleopStore((s) => s.invertLinearZ);
  const invertAngularX = useTeleopStore((s) => s.invertAngularX);
  const invertAngularY = useTeleopStore((s) => s.invertAngularY);
  const invertAngularZ = useTeleopStore((s) => s.invertAngularZ);
  const setTranslationGain = useTeleopStore((s) => s.setTranslationGain);
  const setRotationGain = useTeleopStore((s) => s.setRotationGain);
  const setScaleX = useTeleopStore((s) => s.setScaleX);
  const setScaleY = useTeleopStore((s) => s.setScaleY);
  const setScaleZ = useTeleopStore((s) => s.setScaleZ);
  const setAngularScaleX = useTeleopStore((s) => s.setAngularScaleX);
  const setAngularScaleY = useTeleopStore((s) => s.setAngularScaleY);
  const setAngularScaleZ = useTeleopStore((s) => s.setAngularScaleZ);
  const setSwapXY = useTeleopStore((s) => s.setSwapXY);
  const setInvertLinearX = useTeleopStore((s) => s.setInvertLinearX);
  const setInvertLinearY = useTeleopStore((s) => s.setInvertLinearY);
  const setInvertLinearZ = useTeleopStore((s) => s.setInvertLinearZ);
  const setInvertAngularX = useTeleopStore((s) => s.setInvertAngularX);
  const setInvertAngularY = useTeleopStore((s) => s.setInvertAngularY);
  const setInvertAngularZ = useTeleopStore((s) => s.setInvertAngularZ);
  const saveTeleopProfile = useTeleopStore((s) => s.saveTeleopProfile);
  const resetTeleopConfig = useTeleopStore((s) => s.resetTeleopConfig);
  const wsStatus = useTeleopStore((s) => s.wsStatus);
  const wsState = useTeleopStore((s) => s.wsState);
  const cameraStreamUrl = useUiStore((s) => s.cameraStreamUrl);
  const rvizStreamUrl = useUiStore((s) => s.rvizStreamUrl);

  const [configurations, setConfigurations] = useState<WidgetConfiguration[]>(() =>
    browserConfigurationRepository.load()
  );
  const [widgetPulseMap, setWidgetPulseMap] = useState<Record<string, number>>({});
  const [freshnessClock, setFreshnessClock] = useState<number>(() => Date.now());
  const [rosbagRecording, setRosbagRecording] = useState(false);
  const [rosbagStatus, setRosbagStatus] = useState("idle");
  const canvasViewportRef = useRef<HTMLDivElement | null>(null);
  const [canvasViewportSize, setCanvasViewportSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  const applications = useMemo(() => browserApplicationRepository.load(), []);
  const activeApplication = useMemo(
    () => applications.find((application) => application.id === applicationId) ?? null,
    [applicationId, applications]
  );

  const activeScreenId = useMemo(() => {
    if (!activeApplication) return null;
    if (routeScreenId && activeApplication.screenIds.includes(routeScreenId)) {
      return routeScreenId;
    }
    if (activeApplication.homeScreenId && activeApplication.screenIds.includes(activeApplication.homeScreenId)) {
      return activeApplication.homeScreenId;
    }
    return activeApplication.screenIds[0] ?? null;
  }, [activeApplication, routeScreenId]);

  const activeConfiguration = useMemo(
    () => configurations.find((configuration) => configuration.name === activeScreenId) ?? null,
    [activeScreenId, configurations]
  );

  const widgets: CanvasWidget[] = useMemo(
    () => cloneWidgets(activeConfiguration?.widgets ?? []),
    [activeConfiguration]
  );
  const runtimeWidgets: CanvasWidget[] = useMemo(
    () =>
      widgets.filter((widget) => {
        if (!gripperCardsVisible && widget.kind === "gripper-control") return false;
        if (!modeButtonsVisible && widget.kind === "mode-button") return false;
        return true;
      }),
    [gripperCardsVisible, modeButtonsVisible, widgets]
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setFreshnessClock(Date.now());
    }, TOPIC_FRESHNESS_TICK_MS);
    return () => window.clearInterval(timer);
  }, []);

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
  }, [activeScreenId]);

  useEffect(() => {
    browserConfigurationRepository.save(configurations);
  }, [configurations]);

  useEffect(() => {
    if (!activeScreenId) return;
    if (routeScreenId === activeScreenId) return;
    onNavigateToScreen(activeScreenId);
  }, [activeScreenId, onNavigateToScreen, routeScreenId]);

  const activeRuntimePlugins = useMemo(
    () =>
      resolveApplicationRuntimePlugins({
        application: activeApplication,
        activeScreenId,
      }),
    [activeApplication, activeScreenId]
  );
  const markWidgetPulse = useCallback((widgetId: string) => {
    setWidgetPulseMap((prev) => ({
      ...prev,
      [widgetId]: Date.now(),
    }));
  }, []);
  const {
    runtimePluginState,
    runtimePluginActions,
    setMaxVelocityWidgetValues,
  } = useApplicationRuntimeState({
    activeApplication,
    activeScreenId,
    activeRuntimePlugins,
    widgets,
    wsStatus,
    markWidgetPulse,
  });
  const isWidgetFresh = (widgetId: string) =>
    freshnessClock - (widgetPulseMap[widgetId] ?? 0) <= TOPIC_FRESHNESS_MS;

  const allowedScreenIds = useMemo(
    () => new Set(activeApplication?.screenIds ?? []),
    [activeApplication]
  );

  const canvasSettings = activeConfiguration?.canvas ?? DEFAULT_CANVAS_SETTINGS;
  const canvasSize = useMemo(
    () => resolveCanvasPresetSize(canvasSettings),
    [canvasSettings]
  );
  const effectiveRuntimeMode = useMemo(() => {
    const viewportWidth =
      canvasViewportSize.width > 0
        ? canvasViewportSize.width
        : typeof window !== "undefined"
          ? window.innerWidth
          : 0;
    if (viewportWidth > 0 && viewportWidth <= 1200) return "fit";
    return canvasSettings.runtimeMode;
  }, [canvasSettings.runtimeMode, canvasViewportSize.width]);
  const canvasScale = useMemo(
    () => {
      const scale = resolveCanvasFitScale(
        effectiveRuntimeMode,
        canvasSize,
        canvasViewportSize
      );
      // Keep a tiny margin to avoid 1px overflow caused by browser chrome and rounding.
      return effectiveRuntimeMode === "fit" ? scale * 0.99 : scale;
    },
    [effectiveRuntimeMode, canvasSize, canvasViewportSize]
  );
  const scaledCanvasSize = useMemo(
    () => ({
      width: Math.max(1, Math.floor(canvasSize.width * canvasScale)),
      height: Math.max(1, Math.floor(canvasSize.height * canvasScale)),
    }),
    [canvasScale, canvasSize]
  );

  const saveCurrentPose = () => {
    if (!activeConfiguration) return;
    const defaultPoseName = `pose-${(activeConfiguration.poses.length ?? 0) + 1}`;
    const rawPoseName = window.prompt("Pose name", defaultPoseName);
    if (rawPoseName == null) return;
    const poseName = rawPoseName.trim();
    if (!poseName) return;

    const nextPose: PoseSnapshot = {
      name: poseName,
      savedAt: new Date().toISOString(),
      topics: collectCurrentPoseTopics(widgets, {
        joyX,
        joyY,
        rotX,
        rotY,
        z,
        rz,
      }),
    };

    setConfigurations((prev) =>
      prev.map((configuration) =>
        configuration.name !== activeConfiguration.name
          ? configuration
          : {
              ...configuration,
              poses: upsertPose(configuration.poses, nextPose),
              updatedAt: new Date().toISOString(),
            }
      )
    );
  };

  const loadPoseByName = (poseName: string) => {
    if (!activeConfiguration) return;
    const pose = activeConfiguration.poses.find((item) => item.name === poseName);
    if (!pose) return;

    applyPoseSnapshot(widgets, pose, {
      setZ,
      setRz,
      setJoy,
      setRot,
      markWidgetPulse,
    });
  };

  const toggleRosbagRecording = (widget: Extract<CanvasWidget, { kind: "rosbag-control" }>) => {
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
  const runtimeWidgetElements = runtimeWidgets.map((widget) => (
    <RuntimeWidgetRenderer
      key={widget.id}
      widget={widget}
      activeApplication={activeApplication}
      activeScreenId={activeScreenId}
      activeConfiguration={activeConfiguration}
      widgets={widgets}
      allowedScreenIds={allowedScreenIds}
      activeRuntimePlugins={activeRuntimePlugins}
      runtimePluginState={runtimePluginState}
      runtimePluginActions={runtimePluginActions}
      teleopSnapshot={{
        joyX,
        joyY,
        rotX,
        rotY,
        z,
        rz,
        maxVelocity,
        translationGain,
        rotationGain,
        scaleX,
        scaleY,
        scaleZ,
        angularScaleX,
        angularScaleY,
        angularScaleZ,
        swapXY,
        invertLinearX,
        invertLinearY,
        invertLinearZ,
        invertAngularX,
        invertAngularY,
        invertAngularZ,
      }}
      teleopActions={{
        setJoy,
        setRot,
        setZ,
        setRz,
        setMaxVelocity,
        setTranslationGain,
        setRotationGain,
        setScaleX,
        setScaleY,
        setScaleZ,
        setAngularScaleX,
        setAngularScaleY,
        setAngularScaleZ,
        setSwapXY,
        setInvertLinearX,
        setInvertLinearY,
        setInvertLinearZ,
        setInvertAngularX,
        setInvertAngularY,
        setInvertAngularZ,
        saveTeleopProfile,
        resetTeleopConfig,
      }}
      onNavigateToScreen={onNavigateToScreen}
      saveCurrentPose={saveCurrentPose}
      loadPoseByName={loadPoseByName}
      toggleRosbagRecording={toggleRosbagRecording}
      rosbagRecording={rosbagRecording}
      rosbagStatus={rosbagStatus}
      wsState={wsState}
      cameraStreamUrl={cameraStreamUrl}
      rvizStreamUrl={rvizStreamUrl}
      markWidgetPulse={markWidgetPulse}
      isWidgetFresh={isWidgetFresh}
      setMaxVelocityWidgetValues={setMaxVelocityWidgetValues}
      resolveVisualizationUrlForRuntime={resolveVisualizationUrlForRuntime}
      noopRectChange={NOOP_RECT_CHANGE}
      noopTextChange={NOOP_TEXT_CHANGE}
    />
  ));

  const canvasViewportClassName = `controls-canvas-viewport controls-canvas-mode-${effectiveRuntimeMode}`;
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
  const showRuntimeScreenTabs = (activeApplication?.screenIds.length ?? 0) > 1;
  const activeScreenClassName = activeScreenId
    ? `application-runtime-screen-${toScreenClassToken(activeScreenId)}`
    : "";
  const topBarSlotElement =
    typeof document !== "undefined"
      ? document.getElementById("topbar-controls-slot")
      : null;
  const runtimeScreenIds = activeApplication?.screenIds ?? [];
  const runtimeScreenTabs =
    showRuntimeScreenTabs && topBarSlotElement
      ? createPortal(
          <div className="application-runtime-topbar-tabs">
            {runtimeScreenIds.map((screenId) => (
              <button
                key={screenId}
                type="button"
                className={`tab-button ${screenId === activeScreenId ? "active" : ""}`}
                onClick={() => onNavigateToScreen(screenId)}
              >
                {screenId}
              </button>
            ))}
          </div>,
          topBarSlotElement
        )
      : null;

  if (!activeApplication) {
    return (
      <main className="layout tab-accent tab-controls">
        <section className="card">
          <h2>Application not found</h2>
          <div className="placeholder">Unknown application ID: {applicationId}</div>
        </section>
      </main>
    );
  }

  if (!activeScreenId || !activeConfiguration) {
    return (
      <main className="layout tab-accent tab-controls">
        <section className="card">
          <h2>{activeApplication.name}</h2>
          <div className="placeholder">
            No valid screen selected. Configure at least one screen in <code>/canvas-design</code>.
          </div>
        </section>
      </main>
    );
  }

  return (
    <main
      className={`controls-page tab-accent tab-controls application-runtime-page ${activeScreenClassName}`.trim()}
    >
      <section className="controls-workspace">
        <div className="controls-canvas-zone application-runtime-canvas-zone">
          <div className="controls-canvas-surface">
            <div className={canvasViewportClassName} ref={canvasViewportRef}>
              <div className="controls-canvas-frame" style={canvasFrameStyle}>
                <div className="controls-canvas-transform" style={canvasTransformStyle}>
                  <div className="controls-canvas" style={{ width: `${canvasSize.width}px`, height: `${canvasSize.height}px` }}>
                    {runtimeWidgetElements}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {runtimeScreenTabs}
    </main>
  );
}
