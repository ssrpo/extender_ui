import type { ApplicationConfig } from "../app/applications";
import type { WidgetConfiguration } from "../components/widgets/configurations";

export type StorageSnapshot = {
  applications: ApplicationConfig[];
  configurations: WidgetConfiguration[];
};

export type StorageImportSummary = {
  applicationsImported: number;
  configurationsImported: number;
};

export type StorageFetch = typeof fetch;

const STORAGE_API_PREFIX = "/api/storage";

const buildStorageUrl = (baseUrl: string, path: string) => {
  const trimmedBaseUrl = baseUrl.trim().replace(/\/+$/, "");
  return `${trimmedBaseUrl}${STORAGE_API_PREFIX}${path}`;
};

const parseErrorDetail = async (response: Response) => {
  try {
    const text = await response.text();
    return text.trim();
  } catch {
    return "";
  }
};

const requireOk = async (response: Response, action: string) => {
  if (response.ok) return response;
  const detail = await parseErrorDetail(response);
  throw new Error(
    detail
      ? `${action} failed: ${response.status} ${response.statusText} - ${detail}`
      : `${action} failed: ${response.status} ${response.statusText}`
  );
};

export async function fetchStorageSnapshot(
  baseUrl = "",
  fetchImpl: StorageFetch = fetch
): Promise<StorageSnapshot> {
  const response = await fetchImpl(buildStorageUrl(baseUrl, "/snapshot"), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });
  await requireOk(response, "Fetching storage snapshot");
  return (await response.json()) as StorageSnapshot;
}

export async function importStorageSnapshot(
  snapshot: StorageSnapshot,
  baseUrl = "",
  fetchImpl: StorageFetch = fetch
): Promise<StorageImportSummary> {
  const response = await fetchImpl(buildStorageUrl(baseUrl, "/snapshot/import"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(snapshot),
  });
  await requireOk(response, "Importing storage snapshot");
  return (await response.json()) as StorageImportSummary;
}
