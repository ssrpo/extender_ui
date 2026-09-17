import { useEffect } from "react";

import { wsClient } from "../services/wsClient";
import { useTeleopStore } from "../store/teleopStore";
import { useUiStore } from "../store/uiStore";

export function useWsConnection() {
  const setWsStatus = useTeleopStore((s) => s.setWsStatus);
  const setWsState = useTeleopStore((s) => s.setWsState);
  const setTopicSnapshot = useUiStore((s) => s.setTopicSnapshot);
  const setTopicMonitorEvent = useUiStore((s) => s.setTopicMonitorEvent);

  useEffect(() => {
    const unsubscribeStatus = wsClient.onStatus(setWsStatus);
    const unsubscribeMessage = wsClient.onMessage((msg) => {
      if (msg.type === "state") {
        setWsState(msg);
      } else if (msg.type === "topic_snapshot") {
        setTopicSnapshot(msg);
      } else if (msg.type === "event" && msg.code.startsWith("TOPIC_SUBSCRIBE_")) {
        setTopicMonitorEvent(msg);
      }
    });

    wsClient.connect();

    return () => {
      unsubscribeStatus();
      unsubscribeMessage();
      wsClient.disconnect();
    };
  }, [setTopicMonitorEvent, setTopicSnapshot, setWsState, setWsStatus]);
}
