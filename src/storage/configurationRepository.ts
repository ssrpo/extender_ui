import {
  loadConfigurationsFromLocalStorage,
  persistConfigurationsToLocalStorage,
  syncConfigurationsFromFolder,
  syncConfigurationsToFolder,
} from "../components/widgets";
import type { WidgetConfiguration } from "../components/widgets/configurations";

export type ConfigurationRepository = {
  load(): WidgetConfiguration[];
  save(configurations: WidgetConfiguration[]): void;
  syncToFolder(configurations: WidgetConfiguration[]): Promise<number>;
  syncFromFolder(configurations: WidgetConfiguration[]): Promise<WidgetConfiguration[]>;
};

export const browserConfigurationRepository: ConfigurationRepository = {
  load() {
    return loadConfigurationsFromLocalStorage();
  },
  save(configurations) {
    persistConfigurationsToLocalStorage(configurations);
  },
  syncToFolder(configurations) {
    return syncConfigurationsToFolder(configurations);
  },
  syncFromFolder(configurations) {
    return syncConfigurationsFromFolder(configurations);
  },
};
