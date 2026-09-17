import { afterEach, describe, expect, it, vi } from "vitest";

import { WsClient } from "./wsClient";
import type { WsIncoming } from "../types/ws";

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  static OPEN = 1;

  readyState = FakeWebSocket.OPEN;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  sent: string[] = [];
  readonly url: string;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  send(payload: string) {
    this.sent.push(payload);
  }

  close() {
    this.readyState = 3;
    this.onclose?.();
  }
}

describe("WsClient", () => {
  afterEach(() => {
    FakeWebSocket.instances = [];
    vi.unstubAllGlobals();
  });

  it("emits topic snapshot websocket messages", () => {
    vi.stubGlobal("WebSocket", FakeWebSocket);
    const client = new WsClient("ws://127.0.0.1/ws", { autoReconnect: false });
    const received: WsIncoming[] = [];

    client.onMessage((message) => received.push(message));
    client.connect();

    FakeWebSocket.instances[0].onmessage?.({
      data: JSON.stringify({
        type: "topic_snapshot",
        topic: "/visual_servoing/velocity_command",
        message_type: "geometry_msgs/msg/TwistStamped",
        updated_at_ms: 2000,
        revision: 4,
        data: { twist: { linear: { x: 1, y: 0, z: 0 } } },
        error: null,
      }),
    });

    expect(received).toEqual([
      {
        type: "topic_snapshot",
        topic: "/visual_servoing/velocity_command",
        message_type: "geometry_msgs/msg/TwistStamped",
        updated_at_ms: 2000,
        revision: 4,
        data: { twist: { linear: { x: 1, y: 0, z: 0 } } },
        error: null,
      },
    ]);
  });
});
