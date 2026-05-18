import { useEffect, useMemo, useState } from "react";

import { TopBar } from "../components/layout/TopBar";
import { ApplicationPage } from "../pages/ApplicationPage";
import { CanvasDesignPage } from "../pages/CanvasDesignPage";
import { HomePage } from "../pages/HomePage";
import { useUiStore } from "../store/uiStore";
import { useWsConnection } from "../hooks/useWsConnection";
import { useTeleopPublisher } from "../hooks/useTeleopPublisher";
import { useThemeMode } from "../hooks/useThemeMode";
import { browserApplicationRepository } from "../storage/applicationRepository";
import { type AppRoute, useAppRouter } from "./router";

export default function App() {
  useWsConnection();
  useTeleopPublisher();
  useThemeMode();
  const { route, navigate } = useAppRouter();
  const focusMode = useUiStore((s) => s.focusMode);
  const setIsEditorMode = useUiStore((s) => s.setIsEditorMode);
  const [hasUnsavedCanvasChanges, setHasUnsavedCanvasChanges] = useState(false);
  const [gripperCardsVisible, setGripperCardsVisible] = useState(true);
  const [modeButtonsVisible, setModeButtonsVisible] = useState(true);
  const applicationTitle = useMemo(() => {
    if (route.kind !== "application") return null;
    const match = browserApplicationRepository.load().find(
      (application) => application.id === route.appId
    );
    return match?.name ?? route.appId;
  }, [route]);
  const pageTitle =
    route.kind === "canvas-design"
      ? "Canvas Design"
      : route.kind === "application"
        ? applicationTitle ?? route.appId
        : "Extender Tablet Interface";

  useEffect(() => {
    setIsEditorMode(route.kind === "canvas-design" && !focusMode);
  }, [focusMode, route.kind, setIsEditorMode]);

  useEffect(() => {
    if (route.kind !== "application") return;

    const handleDoubleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.closest(".application-runtime-page")) return;
      if (target.closest("input, textarea, select, [contenteditable='true']")) return;
      event.preventDefault();
    };
    const handleContextMenu = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.closest(".application-runtime-page")) return;
      event.preventDefault();
    };

    document.addEventListener("dblclick", handleDoubleClick, true);
    document.addEventListener("contextmenu", handleContextMenu, true);
    return () => {
      document.removeEventListener("dblclick", handleDoubleClick, true);
      document.removeEventListener("contextmenu", handleContextMenu, true);
    };
  }, [route.kind]);

  const guardedNavigate = (nextRoute: AppRoute) => {
    const leavingCanvasDesign = route.kind === "canvas-design" && nextRoute.kind !== "canvas-design";
    if (
      leavingCanvasDesign &&
      hasUnsavedCanvasChanges &&
      !window.confirm("You have unsaved screen changes. Leave without saving?")
    ) {
      return;
    }
    navigate(nextRoute);
  };

  return (
    <div className="app">
      <TopBar
        onHome={() => guardedNavigate({ kind: "home" })}
        onOpenCanvasDesign={() => guardedNavigate({ kind: "canvas-design" })}
        isCanvasDesign={route.kind === "canvas-design"}
        isRuntimeView={route.kind === "application"}
        pageTitle={pageTitle}
        gripperCardsVisible={gripperCardsVisible}
        onToggleGripperCards={() => setGripperCardsVisible((prev) => !prev)}
        modeButtonsVisible={modeButtonsVisible}
        onToggleModeButtons={() => setModeButtonsVisible((prev) => !prev)}
      />
      {route.kind === "home" ? (
        <HomePage
          onOpenCanvasDesign={() => guardedNavigate({ kind: "canvas-design" })}
          onOpenApplication={(applicationId) =>
            guardedNavigate({ kind: "application", appId: applicationId, screenId: null })
          }
        />
      ) : route.kind === "canvas-design" ? (
        <CanvasDesignPage
          focusOnly={focusMode}
          onDirtyChange={setHasUnsavedCanvasChanges}
        />
      ) : (
        <ApplicationPage
          applicationId={route.appId}
          routeScreenId={route.screenId}
          onNavigateToScreen={(screenId) =>
            navigate({ kind: "application", appId: route.appId, screenId })
          }
          gripperCardsVisible={gripperCardsVisible}
          modeButtonsVisible={modeButtonsVisible}
        />
      )}
    </div>
  );
}
