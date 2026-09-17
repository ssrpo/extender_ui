export const ADMIN_DEMO_APP_ID = "app-petanque-admin";
export const ADMIN_DEMO_APP_NAME = "App Pétanque";

export const ADMIN_DEMO_SCREEN_IDS = [
  "default_control",
  "live_teleop",
  "articular",
  "camera",
  "visual_servoing",
  "visual_servoing_monitor",
  "logs",
  "poses",
  "petanque",
  "snake_control",
  "petanque_teleop_config",
  "curves",
  "configurations",
  "debug",
] as const;

export type AdminDemoScreenId = (typeof ADMIN_DEMO_SCREEN_IDS)[number];

export const ADMIN_DEMO_HOME_SCREEN_ID: AdminDemoScreenId = "default_control";
