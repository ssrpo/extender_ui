import {
  fetchStorageSnapshot,
  importStorageSnapshot,
  type StorageFetch,
  type StorageImportSummary,
  type StorageSnapshot,
} from "./storageApiClient";

export type StorageSnapshotRepository = {
  load(): Promise<StorageSnapshot>;
  save(snapshot: StorageSnapshot): Promise<StorageImportSummary>;
};

export function createHttpStorageSnapshotRepository(
  baseUrl = "",
  fetchImpl: StorageFetch = fetch
): StorageSnapshotRepository {
  return {
    load() {
      return fetchStorageSnapshot(baseUrl, fetchImpl);
    },
    save(snapshot) {
      return importStorageSnapshot(snapshot, baseUrl, fetchImpl);
    },
  };
}
