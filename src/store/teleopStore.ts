import { create } from "zustand";

import type { TeleopCommand, TeleopMode } from "../types/teleop";
import type { WsState, WsStatus } from "../types/ws";
import { readJsonStorage, writeJsonStorage } from "../utils/browserStorage";

type TeleopConfigProfile = {
  maxVelocity: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  angularScaleX: number;
  angularScaleY: number;
  angularScaleZ: number;
  translationGain: number;
  rotationGain: number;
  swapXY: boolean;
  invertLinearX: boolean;
  invertLinearY: boolean;
  invertLinearZ: boolean;
  invertAngularX: boolean;
  invertAngularY: boolean;
  invertAngularZ: boolean;
};

const TELEOP_PROFILE_STORAGE_KEY = "extender_ui.teleop_profiles.v1";
const DEFAULT_TELEOP_PROFILE_ROBOT = "explorer";
const TELEOP_MAX_VELOCITY_MIN = 0;
const TELEOP_MAX_VELOCITY_MAX = 1;

export const clampTeleopMaxVelocity = (value: number) =>
  Math.max(TELEOP_MAX_VELOCITY_MIN, Math.min(TELEOP_MAX_VELOCITY_MAX, value));

const normalizeProfileRobot = (robot: string) => {
  const normalized = robot.trim().toLowerCase();
  return normalized || DEFAULT_TELEOP_PROFILE_ROBOT;
};

const getDefaultTeleopConfigProfile = (
  robot: string = DEFAULT_TELEOP_PROFILE_ROBOT
): TeleopConfigProfile => {
  const baseDefaults: TeleopConfigProfile = {
    maxVelocity: 1,
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
    angularScaleX: 1,
    angularScaleY: 1,
    angularScaleZ: 1,
    translationGain: 1,
    rotationGain: 1,
    swapXY: false,
    invertLinearX: false,
    invertLinearY: false,
    invertLinearZ: false,
    invertAngularX: false,
    invertAngularY: false,
    invertAngularZ: false,
  };

  if (normalizeProfileRobot(robot) === "explorer") {
    return {
      ...baseDefaults,
      swapXY: true,
      invertLinearX: true,
    };
  }

  return baseDefaults;
};

const readTeleopProfiles = (): Record<string, TeleopConfigProfile> => {
  return readJsonStorage(TELEOP_PROFILE_STORAGE_KEY, {}, (parsed) => {
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, TeleopConfigProfile>;
  });
};

const writeTeleopProfiles = (profiles: Record<string, TeleopConfigProfile>) => {
  writeJsonStorage(TELEOP_PROFILE_STORAGE_KEY, profiles);
};

const loadTeleopConfigProfile = (robot: string): TeleopConfigProfile => {
  const defaults = getDefaultTeleopConfigProfile(robot);
  const profiles = readTeleopProfiles();
  const stored = profiles[normalizeProfileRobot(robot)];
  if (!stored || typeof stored !== "object") return defaults;

  return {
    maxVelocity:
      typeof stored.maxVelocity === "number"
        ? clampTeleopMaxVelocity(stored.maxVelocity)
        : defaults.maxVelocity,
    scaleX: typeof stored.scaleX === "number" ? stored.scaleX : defaults.scaleX,
    scaleY: typeof stored.scaleY === "number" ? stored.scaleY : defaults.scaleY,
    scaleZ: typeof stored.scaleZ === "number" ? stored.scaleZ : defaults.scaleZ,
    angularScaleX:
      typeof stored.angularScaleX === "number" ? stored.angularScaleX : defaults.angularScaleX,
    angularScaleY:
      typeof stored.angularScaleY === "number" ? stored.angularScaleY : defaults.angularScaleY,
    angularScaleZ:
      typeof stored.angularScaleZ === "number" ? stored.angularScaleZ : defaults.angularScaleZ,
    translationGain:
      typeof stored.translationGain === "number" ? stored.translationGain : defaults.translationGain,
    rotationGain: typeof stored.rotationGain === "number" ? stored.rotationGain : defaults.rotationGain,
    swapXY: typeof stored.swapXY === "boolean" ? stored.swapXY : defaults.swapXY,
    invertLinearX:
      typeof stored.invertLinearX === "boolean" ? stored.invertLinearX : defaults.invertLinearX,
    invertLinearY:
      typeof stored.invertLinearY === "boolean" ? stored.invertLinearY : defaults.invertLinearY,
    invertLinearZ:
      typeof stored.invertLinearZ === "boolean" ? stored.invertLinearZ : defaults.invertLinearZ,
    invertAngularX:
      typeof stored.invertAngularX === "boolean" ? stored.invertAngularX : defaults.invertAngularX,
    invertAngularY:
      typeof stored.invertAngularY === "boolean" ? stored.invertAngularY : defaults.invertAngularY,
    invertAngularZ:
      typeof stored.invertAngularZ === "boolean" ? stored.invertAngularZ : defaults.invertAngularZ,
  };
};

const profileRobot = DEFAULT_TELEOP_PROFILE_ROBOT;
const initialProfile = loadTeleopConfigProfile(profileRobot);

export type TeleopState = {
  joyX: number;
  joyY: number;
  rotX: number;
  rotY: number;
  z: number;
  rz: number;
  mode: TeleopMode;
  wsStatus: WsStatus;
  wsState: WsState | null;
  seq: number;
  maxVelocity: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  angularScaleX: number;
  angularScaleY: number;
  angularScaleZ: number;
  invertX: boolean;
  invertY: boolean;
  invertZ: boolean;
  translationGain: number;
  rotationGain: number;
  swapXY: boolean;
  invertLinearX: boolean;
  invertLinearY: boolean;
  invertLinearZ: boolean;
  invertAngularX: boolean;
  invertAngularY: boolean;
  invertAngularZ: boolean;
  profileRobot: string;
  setJoy: (x: number, y: number) => void;
  setRot: (x: number, y: number) => void;
  setZ: (z: number) => void;
  setRz: (z: number) => void;
  setMode: (mode: TeleopMode) => void;
  cycleMode: () => void;
  setWsStatus: (status: WsStatus) => void;
  setWsState: (state: WsState | null) => void;
  setMaxVelocity: (value: number) => void;
  setScaleX: (v: number) => void;
  setScaleY: (v: number) => void;
  setScaleZ: (v: number) => void;
  setAngularScaleX: (v: number) => void;
  setAngularScaleY: (v: number) => void;
  setAngularScaleZ: (v: number) => void;
  setInvertX: (v: boolean) => void;
  setInvertY: (v: boolean) => void;
  setInvertZ: (v: boolean) => void;
  setTranslationGain: (v: number) => void;
  setRotationGain: (v: number) => void;
  setSwapXY: (v: boolean) => void;
  setInvertLinearX: (v: boolean) => void;
  setInvertLinearY: (v: boolean) => void;
  setInvertLinearZ: (v: boolean) => void;
  setInvertAngularX: (v: boolean) => void;
  setInvertAngularY: (v: boolean) => void;
  setInvertAngularZ: (v: boolean) => void;
  setProfileRobot: (robot: string) => void;
  saveTeleopProfile: (robot?: string) => void;
  loadTeleopProfile: (robot?: string) => void;
  resetTeleopConfig: () => void;
  nextSeq: () => number;
  buildTeleopCommand: (seq: number) => TeleopCommand;
};

const modeLabelMap: Record<TeleopMode, string> = {
  0: "B1",
  1: "ROTATION",
  2: "TRANSLATION",
  3: "B2",
  4: "SNAKE"
};

const TABLET_MODE_CYCLE: TeleopMode[] = [0, 3];

export const selectNextTabletMode = (mode: TeleopMode): TeleopMode => {
  const currentIndex = TABLET_MODE_CYCLE.indexOf(mode);
  if (currentIndex === -1) return TABLET_MODE_CYCLE[1] ?? 3;
  return TABLET_MODE_CYCLE[(currentIndex + 1) % TABLET_MODE_CYCLE.length] ?? 3;
};

export const useTeleopStore = create<TeleopState>((set, get) => ({
  joyX: 0,
  joyY: 0,
  rotX: 0,
  rotY: 0,
  z: 0,
  rz: 0,
  mode: 0,
  wsStatus: "disconnected",
  wsState: null,
  seq: 0,
  maxVelocity: initialProfile.maxVelocity,
  scaleX: initialProfile.scaleX,
  scaleY: initialProfile.scaleY,
  scaleZ: initialProfile.scaleZ,
  angularScaleX: initialProfile.angularScaleX,
  angularScaleY: initialProfile.angularScaleY,
  angularScaleZ: initialProfile.angularScaleZ,
  invertX: false,
  invertY: false,
  invertZ: false,
  translationGain: initialProfile.translationGain,
  rotationGain: initialProfile.rotationGain,
  swapXY: initialProfile.swapXY,
  invertLinearX: initialProfile.invertLinearX,
  invertLinearY: initialProfile.invertLinearY,
  invertLinearZ: initialProfile.invertLinearZ,
  invertAngularX: initialProfile.invertAngularX,
  invertAngularY: initialProfile.invertAngularY,
  invertAngularZ: initialProfile.invertAngularZ,
  profileRobot,
  setJoy: (x, y) => set({ joyX: x, joyY: y }),
  setRot: (x, y) => set({ rotX: x, rotY: y }),
  setZ: (value) => set({ z: value }),
  setRz: (value) => set({ rz: value }),
  setMode: (mode) => set({ mode }),
  cycleMode: () => set((state) => ({ mode: selectNextTabletMode(state.mode) })),
  setWsStatus: (status) => set({ wsStatus: status }),
  setWsState: (state) => set({ wsState: state }),
  setMaxVelocity: (value) => set({ maxVelocity: clampTeleopMaxVelocity(value) }),
  setScaleX: (v) => set({ scaleX: v }),
  setScaleY: (v) => set({ scaleY: v }),
  setScaleZ: (v) => set({ scaleZ: v }),
  setAngularScaleX: (v) => set({ angularScaleX: v }),
  setAngularScaleY: (v) => set({ angularScaleY: v }),
  setAngularScaleZ: (v) => set({ angularScaleZ: v }),
  setInvertX: (v) => set({ invertX: v }),
  setInvertY: (v) => set({ invertY: v }),
  setInvertZ: (v) => set({ invertZ: v }),
  setTranslationGain: (v) => set({ translationGain: v }),
  setRotationGain: (v) => set({ rotationGain: v }),
  setSwapXY: (v) => set({ swapXY: v }),
  setInvertLinearX: (v) => set({ invertLinearX: v }),
  setInvertLinearY: (v) => set({ invertLinearY: v }),
  setInvertLinearZ: (v) => set({ invertLinearZ: v }),
  setInvertAngularX: (v) => set({ invertAngularX: v }),
  setInvertAngularY: (v) => set({ invertAngularY: v }),
  setInvertAngularZ: (v) => set({ invertAngularZ: v }),
  setProfileRobot: (robot) => set({ profileRobot: normalizeProfileRobot(robot) }),
  saveTeleopProfile: (robot) => {
    const state = get();
    const targetRobot = normalizeProfileRobot(robot ?? state.profileRobot);
    const profile: TeleopConfigProfile = {
      maxVelocity: clampTeleopMaxVelocity(state.maxVelocity),
      scaleX: state.scaleX,
      scaleY: state.scaleY,
      scaleZ: state.scaleZ,
      angularScaleX: state.angularScaleX,
      angularScaleY: state.angularScaleY,
      angularScaleZ: state.angularScaleZ,
      translationGain: state.translationGain,
      rotationGain: state.rotationGain,
      swapXY: state.swapXY,
      invertLinearX: state.invertLinearX,
      invertLinearY: state.invertLinearY,
      invertLinearZ: state.invertLinearZ,
      invertAngularX: state.invertAngularX,
      invertAngularY: state.invertAngularY,
      invertAngularZ: state.invertAngularZ,
    };
    const profiles = readTeleopProfiles();
    profiles[targetRobot] = profile;
    writeTeleopProfiles(profiles);
    set({ profileRobot: targetRobot });
  },
  loadTeleopProfile: (robot) => {
    const targetRobot = normalizeProfileRobot(robot ?? get().profileRobot);
    const profile = loadTeleopConfigProfile(targetRobot);
    set({
      profileRobot: targetRobot,
      maxVelocity: clampTeleopMaxVelocity(profile.maxVelocity),
      scaleX: profile.scaleX,
      scaleY: profile.scaleY,
      scaleZ: profile.scaleZ,
      angularScaleX: profile.angularScaleX,
      angularScaleY: profile.angularScaleY,
      angularScaleZ: profile.angularScaleZ,
      translationGain: profile.translationGain,
      rotationGain: profile.rotationGain,
      swapXY: profile.swapXY,
      invertLinearX: profile.invertLinearX,
      invertLinearY: profile.invertLinearY,
      invertLinearZ: profile.invertLinearZ,
      invertAngularX: profile.invertAngularX,
      invertAngularY: profile.invertAngularY,
      invertAngularZ: profile.invertAngularZ,
    });
  },
  resetTeleopConfig: () => {
    const defaults = getDefaultTeleopConfigProfile(get().profileRobot);
    set({
      maxVelocity: defaults.maxVelocity,
      scaleX: defaults.scaleX,
      scaleY: defaults.scaleY,
      scaleZ: defaults.scaleZ,
      angularScaleX: defaults.angularScaleX,
      angularScaleY: defaults.angularScaleY,
      angularScaleZ: defaults.angularScaleZ,
      translationGain: defaults.translationGain,
      rotationGain: defaults.rotationGain,
      swapXY: defaults.swapXY,
      invertLinearX: defaults.invertLinearX,
      invertLinearY: defaults.invertLinearY,
      invertLinearZ: defaults.invertLinearZ,
      invertAngularX: defaults.invertAngularX,
      invertAngularY: defaults.invertAngularY,
      invertAngularZ: defaults.invertAngularZ,
    });
  },
  nextSeq: () => {
    const next = get().seq + 1;
    set({ seq: next });
    return next;
  },
  buildTeleopCommand: (seq) => {
    const {
      joyX,
      joyY,
      rotX,
      rotY,
      z,
      rz,
      mode,
      scaleX,
      scaleY,
      scaleZ,
      angularScaleX,
      angularScaleY,
      angularScaleZ,
      translationGain,
      rotationGain,
      maxVelocity,
      swapXY,
      invertX,
      invertY,
      invertZ,
      invertLinearX,
      invertLinearY,
      invertLinearZ,
      invertAngularX,
      invertAngularY,
      invertAngularZ,
    } = get();

    const rotationActive = mode === 0 || mode === 1 || mode === 3;
    const translationActive = mode === 0 || mode === 2 || mode === 3 || mode === 4;

    const linearSourceX = swapXY ? joyY : joyX;
    const linearSourceY = swapXY ? joyX : joyY;
    const angularSourceX = swapXY ? rotY : rotX;
    const angularSourceY = swapXY ? rotX : rotY;

    const linearSignX = (invertX ? -1 : 1) * (invertLinearX ? -1 : 1);
    const linearSignY = (invertY ? -1 : 1) * (invertLinearY ? -1 : 1);
    const linearSignZ = (invertZ ? -1 : 1) * (invertLinearZ ? -1 : 1);
    const angularSignX = (invertX ? -1 : 1) * (invertAngularX ? -1 : 1);
    const angularSignY = (invertY ? -1 : 1) * (invertAngularY ? -1 : 1);
    const angularSignZ = (invertZ ? -1 : 1) * (invertAngularZ ? -1 : 1);

    const safeMaxVelocity = clampTeleopMaxVelocity(maxVelocity);
    const linearGain = translationGain * safeMaxVelocity;
    const angularGain = rotationGain * safeMaxVelocity;

    const linearX = translationActive ? linearSignX * linearSourceX * scaleX * linearGain : 0;
    const linearY = translationActive ? linearSignY * linearSourceY * scaleY * linearGain : 0;
    const linearZ = translationActive ? linearSignZ * z * scaleZ * linearGain : 0;

    const angularX = rotationActive
      ? angularSignX * angularSourceX * angularScaleX * angularGain
      : 0;
    const angularY = rotationActive
      ? angularSignY * angularSourceY * angularScaleY * angularGain
      : 0;
    const angularZ = rotationActive ? angularSignZ * rz * angularScaleZ * angularGain : 0;

    return {
      type: "teleop_cmd",
      seq,
      mode,
      linear: {
        x: linearX,
        y: linearY,
        z: linearZ,
      },
      angular: {
        x: angularX,
        y: angularY,
        z: angularZ,
      },
    };
  },
}));

export const selectModeLabel = (mode: TeleopMode) => modeLabelMap[mode] ?? "UNKNOWN";

export const selectWatchdogStatus = (state: WsState | null) => {
  if (!state) return "n/a";
  if (state.watchdog_state) return state.watchdog_state;
  if (state.cmd_age_ms == null || state.watchdog_timeout_ms == null) return "n/a";
  return state.cmd_age_ms > state.watchdog_timeout_ms ? "timeout" : "ok";
};
