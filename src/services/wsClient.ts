import type { WsIncoming, WsStatus } from "../types/ws";

export type WsMessageHandler = (msg: WsIncoming) => void;
export type WsStatusHandler = (status: WsStatus) => void;

export type WsClientOptions = {
  autoReconnect?: boolean;
  reconnectDelayMs?: number;
};

export class WsClient {
  private url: string;
  private socket: WebSocket | null = null;
  private statusHandlers = new Set<WsStatusHandler>();
  private messageHandlers = new Set<WsMessageHandler>();
  private options: Required<WsClientOptions>;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(url: string, options?: WsClientOptions) {
    this.url = url;
    this.options = {
      autoReconnect: options?.autoReconnect ?? false,
      reconnectDelayMs: options?.reconnectDelayMs ?? 1000,
    };
  }

  connect() {
    if (typeof WebSocket === "undefined") {
      this.emitStatus("disconnected");
      return;
    }

    this.emitStatus("connecting");
    try {
      this.socket = new WebSocket(this.url);
    } catch {
      this.emitStatus("disconnected");
      return;
    }

    if (!this.socket) return;

    this.socket.onopen = () => this.emitStatus("connected");
    this.socket.onclose = () => {
      this.emitStatus("disconnected");
      this.scheduleReconnect();
    };
    this.socket.onerror = () => {
      this.emitStatus("disconnected");
      this.scheduleReconnect();
    };
    this.socket.onmessage = (event) => {
      const msg = this.safeParse(event.data);
      if (msg) {
        this.emitMessage(msg);
      }
    };
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close();
    this.socket = null;
  }

  send(payload: object) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify(payload));
  }

  onStatus(handler: WsStatusHandler) {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  onMessage(handler: WsMessageHandler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  private emitStatus(status: WsStatus) {
    this.statusHandlers.forEach((handler) => handler(status));
  }

  private emitMessage(msg: WsIncoming) {
    this.messageHandlers.forEach((handler) => handler(msg));
  }

  private safeParse(raw: string): WsIncoming | null {
    try {
      const parsed = JSON.parse(raw) as WsIncoming;
      if (
        parsed &&
        (parsed.type === "state" ||
          parsed.type === "event" ||
          parsed.type === "measure_result" ||
          parsed.type === "topic_snapshot")
      ) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }

  private scheduleReconnect() {
    if (!this.options.autoReconnect) return;
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.options.reconnectDelayMs);
  }
}

export const WS_URL = "ws://127.0.0.1:8765/ws/control";

export const wsClient = new WsClient(WS_URL, { autoReconnect: true });
