import { describe, expect, it } from "vitest";

import { topicSnapshotKey, useUiStore } from "./uiStore";

describe("uiStore topic snapshots", () => {
  it("stores snapshots by topic and message type", () => {
    useUiStore.setState({ topicSnapshots: {} });

    useUiStore.getState().setTopicSnapshot({
      type: "topic_snapshot",
      topic: "/tag_detections",
      message_type: "extender_msgs/msg/SharedControlGoalArray",
      updated_at_ms: 1200,
      revision: 3,
      data: { detections: [{ id: 4 }] },
      error: null,
    });

    const key = topicSnapshotKey(
      "/tag_detections",
      "extender_msgs/msg/SharedControlGoalArray"
    );
    expect(useUiStore.getState().topicSnapshots[key]).toMatchObject({
      topic: "/tag_detections",
      revision: 3,
      data: { detections: [{ id: 4 }] },
    });
  });

  it("stores the latest topic monitor subscription event", () => {
    useUiStore.setState({ topicMonitorEvent: null });

    useUiStore.getState().setTopicMonitorEvent({
      type: "event",
      severity: "warning",
      code: "TOPIC_SUBSCRIBE_PARTIAL",
      message: "/camera/image_raw: image topic blocked",
    });

    expect(useUiStore.getState().topicMonitorEvent).toMatchObject({
      severity: "warning",
      code: "TOPIC_SUBSCRIBE_PARTIAL",
    });
  });
});
