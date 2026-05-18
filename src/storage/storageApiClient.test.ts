import { describe, expect, it, vi } from "vitest";

import { fetchStorageSnapshot, importStorageSnapshot, type StorageSnapshot } from "./storageApiClient";

const sandboxSnapshot: StorageSnapshot = {
  applications: [
    {
      id: "application-sandbox-copy",
      name: "Sandbox Copy",
      screenIds: ["sandbox_control_copy"],
      homeScreenId: "sandbox_control_copy",
      updatedAt: "2026-05-18T10:05:00Z",
    },
  ],
  configurations: [
    {
      name: "sandbox_control_copy",
      widgets: [
        {
          id: "sandbox-toggle-output",
          kind: "ros-message-toggle",
          label: "Digital Output",
          topic: "/hub/digital_output",
          messageType: "std_msgs/msg/Int32MultiArray",
          onPayload: "{data: [13, 1]}",
          offPayload: "{data: [13, 0]}",
          rect: { x: 0, y: 0, w: 200, h: 100 },
        },
      ],
      poses: [],
      canvas: {
        presetId: "hd",
        runtimeMode: "fit",
      },
      updatedAt: "2026-05-18T10:05:00Z",
    },
  ],
};

describe("storageApiClient", () => {
  it("fetches a storage snapshot from the backend API", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify(sandboxSnapshot), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    ) as unknown as typeof fetch;

    const snapshot = await fetchStorageSnapshot("http://127.0.0.1:8765", fetchMock);

    expect(snapshot).toEqual(sandboxSnapshot);
    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8765/api/storage/snapshot", {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });
  });

  it("posts a storage snapshot import request to the backend API", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          applicationsImported: 1,
          configurationsImported: 1,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    ) as unknown as typeof fetch;

    const result = await importStorageSnapshot(
      sandboxSnapshot,
      "http://127.0.0.1:8765/",
      fetchMock
    );

    expect(result).toEqual({
      applicationsImported: 1,
      configurationsImported: 1,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8765/api/storage/snapshot/import",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(sandboxSnapshot),
      }
    );
  });

  it("surfaces backend errors with context", async () => {
    const fetchMock = vi.fn(async () =>
      new Response("application payload must include a non-empty 'id'", {
        status: 422,
        statusText: "Unprocessable Entity",
      })
    ) as unknown as typeof fetch;

    await expect(fetchStorageSnapshot("", fetchMock)).rejects.toThrow(
      "Fetching storage snapshot failed: 422 Unprocessable Entity - application payload must include a non-empty 'id'"
    );
  });
});
