import {
  loadApplicationsFromLocalStorage,
  persistApplicationsToLocalStorage,
  syncApplicationsFromFolder,
  syncApplicationsToFolder,
  type ApplicationConfig,
} from "../app/applications";

export type ApplicationRepository = {
  load(): ApplicationConfig[];
  save(applications: ApplicationConfig[]): void;
  syncToFolder(applications: ApplicationConfig[]): Promise<number>;
  syncFromFolder(applications: ApplicationConfig[]): Promise<ApplicationConfig[]>;
};

export const browserApplicationRepository: ApplicationRepository = {
  load() {
    return loadApplicationsFromLocalStorage();
  },
  save(applications) {
    persistApplicationsToLocalStorage(applications);
  },
  syncToFolder(applications) {
    return syncApplicationsToFolder(applications);
  },
  syncFromFolder(applications) {
    return syncApplicationsFromFolder(applications);
  },
};
