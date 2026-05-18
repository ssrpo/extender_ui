import { useEffect, useMemo, useState } from "react";

import {
  createEmptyApplication,
  removeApplication,
  type ApplicationConfig,
  upsertApplication,
} from "../app/applications";
import { type WidgetConfiguration } from "../components/widgets";
import { browserApplicationRepository } from "../storage/applicationRepository";
import { browserConfigurationRepository } from "../storage/configurationRepository";

type HomePageProps = {
  onOpenCanvasDesign: () => void;
  onOpenApplication: (applicationId: string) => void;
};

const normalizeScreenRefs = (screenIds: string[]) => {
  const unique = new Set<string>();
  const result: string[] = [];
  for (const id of screenIds) {
    const trimmed = id.trim();
    if (!trimmed || unique.has(trimmed)) continue;
    unique.add(trimmed);
    result.push(trimmed);
  }
  return result;
};

export function HomePage({ onOpenCanvasDesign, onOpenApplication }: HomePageProps) {
  const [applications, setApplications] = useState<ApplicationConfig[]>(() =>
    browserApplicationRepository.load()
  );
  const [screens, setScreens] = useState<WidgetConfiguration[]>(() =>
    browserConfigurationRepository.load()
  );
  const [selectedApplicationId, setSelectedApplicationId] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>("");

  useEffect(() => {
    browserApplicationRepository.save(applications);
  }, [applications]);

  useEffect(() => {
    setScreens(browserConfigurationRepository.load());
  }, []);

  useEffect(() => {
    if (!applications.length) {
      setSelectedApplicationId("");
      return;
    }
    if (!selectedApplicationId || !applications.some((application) => application.id === selectedApplicationId)) {
      setSelectedApplicationId(applications[0].id);
    }
  }, [applications, selectedApplicationId]);

  const selectedApplication = useMemo(
    () => applications.find((application) => application.id === selectedApplicationId) ?? null,
    [applications, selectedApplicationId]
  );

  const applyApplicationUpdate = (updater: (current: ApplicationConfig) => ApplicationConfig) => {
    if (!selectedApplication) return;
    const next = updater(selectedApplication);
    setApplications((prev) => upsertApplication(prev, next));
  };

  const toggleScreenInApplication = (screenId: string, checked: boolean) => {
    applyApplicationUpdate((application) => {
      const nextScreenIds = checked
        ? normalizeScreenRefs([...application.screenIds, screenId])
        : application.screenIds.filter((id) => id !== screenId);
      const fallbackHome = nextScreenIds[0] ?? null;
      const nextHome =
        application.homeScreenId && nextScreenIds.includes(application.homeScreenId)
          ? application.homeScreenId
          : fallbackHome;

      return {
        ...application,
        screenIds: nextScreenIds,
        homeScreenId: nextHome,
      };
    });
  };

  const createApplication = () => {
    const created = createEmptyApplication();
    setApplications((prev) => upsertApplication(prev, created));
    setSelectedApplicationId(created.id);
    setStatusMessage(`Created ${created.name}.`);
  };

  const deleteSelectedApplication = () => {
    if (!selectedApplication) return;
    setApplications((prev) => removeApplication(prev, selectedApplication.id));
    setStatusMessage(`Deleted ${selectedApplication.name}.`);
  };

  const handleSyncToFolder = async () => {
    try {
      const count = await browserApplicationRepository.syncToFolder(applications);
      setStatusMessage(`Synced ${count} application(s) to folder.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Sync to folder failed.");
    }
  };

  const handleSyncFromFolder = async () => {
    try {
      const merged = await browserApplicationRepository.syncFromFolder(applications);
      setApplications(merged);
      setStatusMessage(`Synced ${merged.length} application(s) from folder.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Sync from folder failed.");
    }
  };

  return (
    <main className="layout builder-home-layout tab-accent tab-controls">
      <section className="card">
        <h2>Start</h2>
        <div className="builder-home-actions">
          <button type="button" className="header-button focus" onClick={onOpenCanvasDesign}>
            Open Screen Builder
          </button>
        </div>
        <p className="placeholder">
          Design screens in <code>/canvas-design</code>, then run one application in <code>/application/:id</code>.
        </p>
      </section>

      <section className="card">
        <h2>Applications</h2>
        <div className="builder-home-app-grid">
          {applications.map((application) => (
            <button
              key={application.id}
              type="button"
              className={`controls-menu-item ${
                selectedApplicationId === application.id ? "is-selected" : ""
              }`}
              onClick={() => setSelectedApplicationId(application.id)}
            >
              <span>{application.name}</span>
              <span className="controls-menu-state">{application.screenIds.length} screens</span>
            </button>
          ))}
        </div>
        <div className="builder-home-actions">
          <button type="button" className="tab-button" onClick={createApplication}>
            New Application
          </button>
          <button
            type="button"
            className="tab-button"
            disabled={!selectedApplication}
            onClick={() => selectedApplication && onOpenApplication(selectedApplication.id)}
          >
            Open Runtime
          </button>
          <button
            type="button"
            className="tab-button"
            disabled={!selectedApplication}
            onClick={deleteSelectedApplication}
          >
            Delete
          </button>
          <button type="button" className="tab-button" onClick={handleSyncToFolder}>
            Sync To Folder
          </button>
          <button type="button" className="tab-button" onClick={handleSyncFromFolder}>
            Sync From Folder
          </button>
        </div>
        {statusMessage ? <div className="controls-status-message">{statusMessage}</div> : null}
      </section>

      <section className="card">
        <h2>Application Setup</h2>
        {!selectedApplication ? (
          <div className="placeholder">Create or select an application.</div>
        ) : (
          <div className="controls-inspector-grid">
            <label className="controls-field">
              <span>Application ID</span>
              <input className="editor-input" value={selectedApplication.id} readOnly />
            </label>
            <label className="controls-field">
              <span>Name</span>
              <input
                className="editor-input"
                value={selectedApplication.name}
                onChange={(event) =>
                  applyApplicationUpdate((application) => ({
                    ...application,
                    name: event.target.value,
                  }))
                }
              />
            </label>
            <label className="controls-field">
              <span>Home Screen</span>
              <select
                className="editor-input"
                value={selectedApplication.homeScreenId ?? ""}
                onChange={(event) =>
                  applyApplicationUpdate((application) => ({
                    ...application,
                    homeScreenId: event.target.value || null,
                  }))
                }
              >
                <option value="">-- none --</option>
                {selectedApplication.screenIds.map((screenId) => (
                  <option key={screenId} value={screenId}>
                    {screenId}
                  </option>
                ))}
              </select>
            </label>

            <div className="controls-property-title">Screen Selection</div>
            <div className="builder-home-screen-list">
              {screens.length === 0 ? (
                <div className="placeholder">
                  No screens found. Create one first in <code>/canvas-design</code>.
                </div>
              ) : (
                screens.map((screen) => {
                  const checked = selectedApplication.screenIds.includes(screen.name);
                  return (
                    <label key={screen.name} className="builder-home-checkbox">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => toggleScreenInApplication(screen.name, event.target.checked)}
                      />
                      <span>{screen.name}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
