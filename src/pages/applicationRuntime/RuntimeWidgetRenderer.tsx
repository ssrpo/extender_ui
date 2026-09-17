import type { ApplicationConfig } from "../../app/applications";
import type { CanvasRect } from "../../components/layout/CanvasItem";
import {
  ActionButtonWidget,
  CurvesWidget,
  DrinkWidget,
  GripperControlWidget,
  JoystickWidget,
  LoadPoseButtonWidget,
  LogsWidget,
  MagnetControlWidget,
  MaxVelocityWidget,
  MomentaryRosMessageWidget,
  ModeButtonWidget,
  NavigationBarWidget,
  NavigationButtonWidget,
  RosMessageToggleWidget,
  RosbagControlWidget,
  SavePoseButtonWidget,
  SliderWidget,
  StreamDisplayWidget,
  TextareaWidget,
  TextWidget,
  TopicMonitorWidget,
  TogglePublisherWidget,
  ThrowDrawWidget,
  type CanvasWidget,
  type WidgetConfiguration,
  buildRosMessageToggleWsMessage,
  buildMomentaryRosMessageWsMessage,
  buildTogglePublisherWsMessage,
} from "../../components/widgets";
import { wsClient } from "../../services/wsClient";
import type { WsState } from "../../types/ws";
import type {
  ApplicationRuntimeMessageActions,
  ApplicationRuntimePlugin,
  ApplicationRuntimeState,
} from "../../app/runtime/types";
import {
  applyTeleopConfigScalarValue,
  getTeleopConfigButtonLabel,
  getTeleopConfigButtonState,
  isTeleopConfigButtonTopic,
  resolveTeleopConfigScalarValue,
  triggerTeleopConfigButton,
} from "../applicationTeleopConfig";
import { isLocalMaxVelocityTopic } from "../applicationTopics";
import { resolveSliderChannel } from "../applicationPoseRuntime";

type RuntimeRendererTeleopSnapshot = {
  joyX: number;
  joyY: number;
  rotX: number;
  rotY: number;
  z: number;
  rz: number;
  maxVelocity: number;
  translationGain: number;
  rotationGain: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  angularScaleX: number;
  angularScaleY: number;
  angularScaleZ: number;
  swapXY: boolean;
  invertLinearX: boolean;
  invertLinearY: boolean;
  invertLinearZ: boolean;
  invertAngularX: boolean;
  invertAngularY: boolean;
  invertAngularZ: boolean;
};

type RuntimeRendererTeleopActions = {
  setJoy: (x: number, y: number) => void;
  setRot: (x: number, y: number) => void;
  setZ: (value: number) => void;
  setRz: (value: number) => void;
  setMaxVelocity: (value: number) => void;
  setTranslationGain: (value: number) => void;
  setRotationGain: (value: number) => void;
  setScaleX: (value: number) => void;
  setScaleY: (value: number) => void;
  setScaleZ: (value: number) => void;
  setAngularScaleX: (value: number) => void;
  setAngularScaleY: (value: number) => void;
  setAngularScaleZ: (value: number) => void;
  setSwapXY: (value: boolean) => void;
  setInvertLinearX: (value: boolean) => void;
  setInvertLinearY: (value: boolean) => void;
  setInvertLinearZ: (value: boolean) => void;
  setInvertAngularX: (value: boolean) => void;
  setInvertAngularY: (value: boolean) => void;
  setInvertAngularZ: (value: boolean) => void;
  saveTeleopProfile: (robot?: string) => void;
  resetTeleopConfig: () => void;
};

type RuntimeWidgetRendererProps = {
  widget: CanvasWidget;
  activeApplication: ApplicationConfig | null;
  activeScreenId: string | null;
  activeConfiguration: WidgetConfiguration | null;
  widgets: CanvasWidget[];
  allowedScreenIds: Set<string>;
  activeRuntimePlugins: ApplicationRuntimePlugin[];
  runtimePluginState: ApplicationRuntimeState;
  runtimePluginActions: ApplicationRuntimeMessageActions;
  teleopSnapshot: RuntimeRendererTeleopSnapshot;
  teleopActions: RuntimeRendererTeleopActions;
  onNavigateToScreen: (screenId: string) => void;
  saveCurrentPose: () => void;
  loadPoseByName: (poseName: string) => void;
  toggleRosbagRecording: (
    widget: Extract<CanvasWidget, { kind: "rosbag-control" }>
  ) => void;
  rosbagRecording: boolean;
  rosbagStatus: string;
  wsState: WsState | null;
  cameraStreamUrl: string;
  rvizStreamUrl: string;
  markWidgetPulse: (widgetId: string) => void;
  isWidgetFresh: (widgetId: string) => boolean;
  setMaxVelocityWidgetValues: (
    value:
      | Record<string, number>
      | ((prev: Record<string, number>) => Record<string, number>)
  ) => void;
  resolveVisualizationUrlForRuntime: (rawUrl: string) => string;
  noopRectChange: (next: CanvasRect) => void;
  noopTextChange: ((nextLabel: string) => void) & { __readonly: true };
};

const NOOP_SELECT = () => {};

const resolveRuntimeWidget = (
  widget: CanvasWidget,
  args: Pick<
    RuntimeWidgetRendererProps,
    | "activeApplication"
    | "activeScreenId"
    | "widgets"
    | "activeRuntimePlugins"
    | "runtimePluginState"
  >
) =>
  args.activeRuntimePlugins.reduce<CanvasWidget>((current, plugin) => {
    return (
      plugin.decorateWidget?.({
        application: args.activeApplication,
        activeScreenId: args.activeScreenId,
        widget: current,
        widgets: args.widgets,
        state: args.runtimePluginState,
      }) ?? current
    );
  }, widget);

export function RuntimeWidgetRenderer({
  widget,
  activeApplication,
  activeScreenId,
  activeConfiguration,
  widgets,
  allowedScreenIds,
  activeRuntimePlugins,
  runtimePluginState,
  runtimePluginActions,
  teleopSnapshot,
  teleopActions,
  onNavigateToScreen,
  saveCurrentPose,
  loadPoseByName,
  toggleRosbagRecording,
  rosbagRecording,
  rosbagStatus,
  wsState,
  cameraStreamUrl,
  rvizStreamUrl,
  markWidgetPulse,
  isWidgetFresh,
  setMaxVelocityWidgetValues,
  resolveVisualizationUrlForRuntime,
  noopRectChange,
  noopTextChange,
}: RuntimeWidgetRendererProps) {
  const runtimeWidget = resolveRuntimeWidget(widget, {
    activeApplication,
    activeScreenId,
    widgets,
    activeRuntimePlugins,
    runtimePluginState,
  });

  if (widget.kind === "save-pose-button") {
    return (
      <SavePoseButtonWidget
        key={widget.id}
        widget={widget}
        selected={false}
        onSelect={NOOP_SELECT}
        onRectChange={noopRectChange}
        onLabelChange={noopTextChange}
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
        selected={false}
        onSelect={NOOP_SELECT}
        onRectChange={noopRectChange}
        onLabelChange={noopTextChange}
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
        selected={false}
        onSelect={NOOP_SELECT}
        onRectChange={noopRectChange}
        onLabelChange={noopTextChange}
      />
    );
  }

  if (widget.kind === "navigation-button") {
    return (
      <NavigationButtonWidget
        key={widget.id}
        widget={widget}
        selected={false}
        onSelect={NOOP_SELECT}
        onRectChange={noopRectChange}
        onLabelChange={noopTextChange}
        onNavigate={onNavigateToScreen}
        canNavigate={allowedScreenIds.has(widget.targetScreenId)}
      />
    );
  }

  if (widget.kind === "navigation-bar") {
    return (
      <NavigationBarWidget
        key={widget.id}
        widget={widget}
        selected={false}
        onSelect={NOOP_SELECT}
        onRectChange={noopRectChange}
        onNavigate={onNavigateToScreen}
        allowedScreenIds={allowedScreenIds}
      />
    );
  }

  if (widget.kind === "text") {
    return (
      <TextWidget
        key={widget.id}
        widget={runtimeWidget as Extract<CanvasWidget, { kind: "text" }>}
        selected={false}
        onSelect={NOOP_SELECT}
        onRectChange={noopRectChange}
        onTextChange={noopTextChange}
      />
    );
  }

  if (widget.kind === "textarea") {
    return (
      <TextareaWidget
        key={widget.id}
        widget={runtimeWidget as Extract<CanvasWidget, { kind: "textarea" }>}
        selected={false}
        onSelect={NOOP_SELECT}
        onRectChange={noopRectChange}
        onTextChange={noopTextChange}
      />
    );
  }

  if (widget.kind === "button") {
    const isTeleopConfigButton = isTeleopConfigButtonTopic(widget.topic);
    const runtimeButtonPresentation = activeRuntimePlugins.reduce<{
      disabled?: boolean;
      active?: boolean;
      tone?: "default" | "accent" | "success" | "danger";
      label?: string;
    } | null>((current, plugin) => {
      if (current) return current;
        return (
          plugin.getButtonPresentation?.({
            application: activeApplication,
            activeScreenId,
            widget,
            widgets,
          state: runtimePluginState,
          actions: runtimePluginActions,
        }) ?? null
      );
    }, null);

    const teleopConfigButtonState = isTeleopConfigButton
      ? getTeleopConfigButtonState(widget.topic, teleopSnapshot)
      : null;

    const runtimeButtonWidget = isTeleopConfigButton
      ? {
          ...widget,
          label: getTeleopConfigButtonLabel(widget.topic, widget.label, teleopSnapshot),
        }
      : runtimeButtonPresentation?.label
        ? {
            ...widget,
            label: runtimeButtonPresentation.label,
          }
        : widget;

    return (
      <ActionButtonWidget
        key={widget.id}
        widget={runtimeButtonWidget}
        selected={false}
        onSelect={NOOP_SELECT}
        onRectChange={noopRectChange}
        onLabelChange={noopTextChange}
        disabled={runtimeButtonPresentation?.disabled ?? false}
        active={runtimeButtonPresentation?.active ?? teleopConfigButtonState?.active ?? false}
        tone={
          runtimeButtonPresentation?.tone ??
          teleopConfigButtonState?.tone ??
          widget.tone ??
          "default"
        }
        onTrigger={() => {
          for (const plugin of activeRuntimePlugins) {
            const handled = plugin.handleButtonTrigger?.({
              application: activeApplication,
              activeScreenId,
              widget,
              widgets,
              state: runtimePluginState,
              actions: runtimePluginActions,
            });
            if (handled) return;
          }

          if (isTeleopConfigButton) {
            const changed = triggerTeleopConfigButton(widget.topic, teleopSnapshot, teleopActions);
            if (changed) {
              markWidgetPulse(widget.id);
            }
            return;
          }

          wsClient.send({
            type: "ui_button",
            topic: widget.topic,
            payload: widget.payload,
            widget_id: widget.id,
          });
          markWidgetPulse(widget.id);
        }}
      />
    );
  }

  if (widget.kind === "rosbag-control") {
    return (
      <RosbagControlWidget
        key={widget.id}
        widget={widget}
        selected={false}
        onSelect={NOOP_SELECT}
        onRectChange={noopRectChange}
        onLabelChange={noopTextChange}
        isRecording={rosbagRecording}
        statusText={rosbagStatus}
        onToggleRecording={() => toggleRosbagRecording(widget)}
      />
    );
  }

  if (widget.kind === "throw-draw") {
    const runtimeThrowDrawState = activeRuntimePlugins.reduce<{
      angleValue: number;
      durationValue: number;
      alphaValue?: number;
      hasAlphaControl: boolean;
    } | null>((current, plugin) => {
      if (current) return current;
        return (
          plugin.getThrowDrawState?.({
            application: activeApplication,
            activeScreenId,
            widget,
            widgets,
          state: runtimePluginState,
          actions: runtimePluginActions,
        }) ?? null
      );
    }, null);

    if (!runtimeThrowDrawState) {
      return null;
    }

    const sendThrowDrawChange = (next: {
      angle?: number;
      duration?: number;
      powerPercent: number;
      alpha?: number;
      throwRequested?: boolean;
    }) => {
      for (const plugin of activeRuntimePlugins) {
        const handled = plugin.handleThrowDrawChange?.({
          application: activeApplication,
          activeScreenId,
          widget,
          widgets,
          state: runtimePluginState,
          actions: runtimePluginActions,
          next,
        });
        if (handled) return;
      }
    };

    return (
      <ThrowDrawWidget
        key={widget.id}
        widget={widget}
        selected={false}
        onSelect={NOOP_SELECT}
        onRectChange={noopRectChange}
        angleValue={runtimeThrowDrawState.angleValue}
        durationValue={runtimeThrowDrawState.durationValue}
        alphaValue={runtimeThrowDrawState.alphaValue}
        onAlphaChange={
          runtimeThrowDrawState.hasAlphaControl
            ? (nextAlpha) =>
                sendThrowDrawChange({
                  powerPercent: 0,
                  alpha: nextAlpha,
                })
            : undefined
        }
        onValueChange={sendThrowDrawChange}
      />
    );
  }

  if (widget.kind === "max-velocity") {
    const runtimeMaxVelocityState = activeRuntimePlugins.reduce<{
      value?: number | null;
      endpointLabels?: {
        left?: string;
        right?: string;
      };
      bubbleValueFormatter?: (value: number) => string;
      reverseDirection?: boolean;
      unsafeThreshold?: number;
    } | null>((current, plugin) => {
      if (current) return current;
        return (
          plugin.getMaxVelocityState?.({
            application: activeApplication,
            activeScreenId,
            widget,
            widgets,
          state: runtimePluginState,
          actions: runtimePluginActions,
        }) ?? null
      );
    }, null);

    const widgetValue =
      resolveTeleopConfigScalarValue(widget.topic, teleopSnapshot) ??
      (runtimeMaxVelocityState?.value ?? 1);

    const presentation = runtimeMaxVelocityState ?? {
      reverseDirection: widget.reverseDirection,
      endpointLabels: undefined,
      bubbleValueFormatter: undefined,
      unsafeThreshold: undefined,
    };

    return (
      <MaxVelocityWidget
        key={widget.id}
        widget={widget}
        selected={false}
        onSelect={NOOP_SELECT}
        onRectChange={noopRectChange}
        onLabelChange={noopTextChange}
        value={widgetValue}
        endpointLabels={presentation.endpointLabels}
        bubbleValueFormatter={presentation.bubbleValueFormatter}
        unsafeThreshold={presentation.unsafeThreshold}
        reverseDirection={presentation.reverseDirection}
        onValueChange={(nextValue) => {
          const runtimeMaxVelocityChange = activeRuntimePlugins.reduce<{
            value: number;
          } | null>((current, plugin) => {
            if (current) return current;
            return (
              plugin.handleMaxVelocityChange?.({
                application: activeApplication,
                activeScreenId,
                widget,
                widgets,
                state: runtimePluginState,
                actions: runtimePluginActions,
                nextValue,
              }) ?? null
            );
          }, null);
          const resolvedNextValue = runtimeMaxVelocityChange?.value ?? nextValue;
          setMaxVelocityWidgetValues((prev) => ({
            ...prev,
            [widget.id]: resolvedNextValue,
          }));
          applyTeleopConfigScalarValue(widget.topic, resolvedNextValue, teleopActions);
          if (!isLocalMaxVelocityTopic(widget.topic)) {
            wsClient.send({
              type: "ui_scalar",
              topic: widget.topic,
              value: resolvedNextValue,
              widget_id: widget.id,
            });
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
        selected={false}
        onSelect={NOOP_SELECT}
        onRectChange={noopRectChange}
        onLabelChange={noopTextChange}
        activeState={
          wsState?.gripper_state === "open" || wsState?.gripper_state === "close"
            ? wsState.gripper_state
            : null
        }
        onOpen={() => wsClient.send({ type: "gripper_cmd", action: "open" })}
        onClose={() => wsClient.send({ type: "gripper_cmd", action: "close" })}
      />
    );
  }

  if (widget.kind === "magnet-control") {
    return (
      <MagnetControlWidget
        key={widget.id}
        widget={widget}
        selected={false}
        onSelect={NOOP_SELECT}
        onRectChange={noopRectChange}
        onLabelChange={noopTextChange}
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
        selected={false}
        onSelect={NOOP_SELECT}
        onRectChange={noopRectChange}
        onLabelChange={noopTextChange}
        onActivate={() => {
          wsClient.send(buildTogglePublisherWsMessage(widget, "on"));
          markWidgetPulse(widget.id);
        }}
        onDeactivate={() => {
          wsClient.send(buildTogglePublisherWsMessage(widget, "off"));
          markWidgetPulse(widget.id);
        }}
      />
    );
  }

  if (widget.kind === "ros-message-toggle") {
    return (
      <RosMessageToggleWidget
        key={widget.id}
        widget={widget}
        selected={false}
        onSelect={NOOP_SELECT}
        onRectChange={noopRectChange}
        onLabelChange={noopTextChange}
        onActivate={() => {
          wsClient.send(buildRosMessageToggleWsMessage(widget, "on"));
          markWidgetPulse(widget.id);
        }}
        onDeactivate={() => {
          wsClient.send(buildRosMessageToggleWsMessage(widget, "off"));
          markWidgetPulse(widget.id);
        }}
      />
    );
  }

  if (widget.kind === "momentary-ros-message") {
    return (
      <MomentaryRosMessageWidget
        key={widget.id}
        widget={widget}
        selected={false}
        onSelect={NOOP_SELECT}
        onRectChange={noopRectChange}
        onLabelChange={noopTextChange}
        onPress={() => {
          wsClient.send(buildMomentaryRosMessageWsMessage(widget, "pressed"));
          markWidgetPulse(widget.id);
        }}
        onRelease={() => {
          wsClient.send(buildMomentaryRosMessageWsMessage(widget, "released"));
          markWidgetPulse(widget.id);
        }}
      />
    );
  }

  if (widget.kind === "stream-display") {
    const runtimeStreamWidget = runtimeWidget as Extract<CanvasWidget, { kind: "stream-display" }>;
    const url =
      runtimeStreamWidget.source === "camera"
        ? cameraStreamUrl
        : runtimeStreamWidget.source === "rviz"
          ? rvizStreamUrl
          : runtimeStreamWidget.source === "visualization"
            ? resolveVisualizationUrlForRuntime(runtimeStreamWidget.streamUrl)
            : runtimeStreamWidget.streamUrl;
    const sourceStatus =
      runtimeStreamWidget.source === "rviz"
        ? "RViz stream"
        : runtimeStreamWidget.source === "visualization"
          ? "Visualization stream"
          : runtimeStreamWidget.source === "webcam"
            ? "Webcam stream"
            : "Camera stream";
    return (
      <StreamDisplayWidget
        key={widget.id}
        widget={{
          ...runtimeStreamWidget,
          streamUrl: url || runtimeStreamWidget.streamUrl,
          fitMode: runtimeStreamWidget.fitMode ?? "contain",
          showStatus: runtimeStreamWidget.showStatus ?? true,
          showUrl: runtimeStreamWidget.showUrl ?? true,
          overlayText: runtimeStreamWidget.overlayText ?? "stream preview",
        }}
        selected={false}
        onSelect={NOOP_SELECT}
        onRectChange={noopRectChange}
        onLabelChange={noopTextChange}
        statusText={sourceStatus}
      />
    );
  }

  if (widget.kind === "drink") {
    return (
      <DrinkWidget
        key={widget.id}
        widget={widget}
        selected={false}
        onSelect={NOOP_SELECT}
        onRectChange={noopRectChange}
        onLabelChange={noopTextChange}
      />
    );
  }

  if (widget.kind === "curves") {
    return (
      <CurvesWidget
        key={widget.id}
        widget={widget}
        selected={false}
        onSelect={NOOP_SELECT}
        onRectChange={noopRectChange}
        onLabelChange={noopTextChange}
      />
    );
  }

  if (widget.kind === "logs") {
    return (
      <LogsWidget
        key={widget.id}
        widget={widget}
        selected={false}
        onSelect={NOOP_SELECT}
        onRectChange={noopRectChange}
        onLabelChange={noopTextChange}
      />
    );
  }

  if (widget.kind === "topic-monitor") {
    return (
      <TopicMonitorWidget
        key={widget.id}
        widget={widget}
        selected={false}
        onSelect={NOOP_SELECT}
        onRectChange={noopRectChange}
        onLabelChange={noopTextChange}
      />
    );
  }

  if (widget.kind === "slider") {
    const channel = resolveSliderChannel(widget);
    const value = channel === "z" ? teleopSnapshot.z : teleopSnapshot.rz;
    const onChange = channel === "z" ? teleopActions.setZ : teleopActions.setRz;
    return (
      <SliderWidget
        key={widget.id}
        widget={widget}
        value={value}
        onValueChange={(nextValue) => {
          onChange(nextValue);
          markWidgetPulse(widget.id);
        }}
        topicPreview={`${widget.topic}: ${value.toFixed(2)}`}
        isTopicFresh={isWidgetFresh(widget.id)}
        selected={false}
        onSelect={NOOP_SELECT}
        onRectChange={noopRectChange}
      />
    );
  }

  const metrics =
    widget.binding === "joy"
      ? {
          x: teleopSnapshot.joyX,
          y: teleopSnapshot.joyY,
          magnitude: Math.min(1, Math.hypot(teleopSnapshot.joyX, teleopSnapshot.joyY)),
        }
      : { x: teleopSnapshot.rotX, y: teleopSnapshot.rotY };

  return (
    <JoystickWidget
      key={widget.id}
      widget={widget}
      selected={false}
      onSelect={NOOP_SELECT}
      onRectChange={noopRectChange}
      onLabelChange={noopTextChange}
      onMove={(x, y) => {
        if (widget.binding === "joy") {
          teleopActions.setJoy(x, y);
        } else {
          teleopActions.setRot(x, y);
        }
        markWidgetPulse(widget.id);
      }}
      metrics={metrics}
      topicPreview={`${widget.topic}: x=${metrics.x.toFixed(2)} y=${metrics.y.toFixed(2)}`}
      isTopicFresh={isWidgetFresh(widget.id)}
    />
  );
}
