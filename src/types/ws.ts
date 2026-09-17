export type WsStatus = "disconnected" | "connecting" | "connected";

export type WsState = {
  connected: boolean;
  cmd_age_ms: number | null;
  watchdog_timeout_ms: number;
  last_seq: number;
  publishing_rate_hz: number;
  current_mode: number;
  gripper_state?: "open" | "close" | "unknown" | null;
  tcp_speed_mps?: number;
  ee_pose?: {
    x: number;
    y: number;
    z: number;
  };
  joint_positions?: number[];
  watchdog_state?: string;
  joint_torques?: number[];
};

export type WsStateMessage = WsState & {
  type: "state";
};

export type WsEventMessage = {
  type: "event";
  severity: "info" | "warning" | "error";
  code: string;
  message: string;
};

export type WsMeasureResultMessage = {
  type: "measure_result";
  image_data_url: string | null;
  vectors_json: string | null;
  updated_at_ms: number | null;
};

export type WsTopicSnapshotMessage = {
  type: "topic_snapshot";
  topic: string;
  message_type: string;
  updated_at_ms: number | null;
  revision: number;
  data: unknown;
  error: string | null;
};

export type WsIncoming =
  | WsStateMessage
  | WsEventMessage
  | WsMeasureResultMessage
  | WsTopicSnapshotMessage;
