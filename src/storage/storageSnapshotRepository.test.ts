import { describe, expect, it, vi } from "vitest";

import { createHttpStorageSnapshotRepository } from "./storageSnapshotRepository";

describe("createHttpStorageSnapshotRepository", () => {
  it("loads snapshots through the storage API client contract", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          applications: [],
          configurations: [],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    ) as unknown as typeof fetch;

    const repository = createHttpStorageSnapshotRepository(
      "http://127.0.0.1:8765",
      fetchMock
    );

    await expect(repository.load()).resolves.toEqual({
      applications: [],
      configurations: [],
    });
  });

  it("saves snapshots through the storage API client contract", async () => {
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

    const repository = createHttpStorageSnapshotRepository(
      "http://127.0.0.1:8765",
      fetchMock
    );

    await expect(
      repository.save({
        applications: [],
        configurations: [],
      })
    ).resolves.toEqual({
      applicationsImported: 1,
      configurationsImported: 1,
    });
  });
});
