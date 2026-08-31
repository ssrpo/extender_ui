/**
 * Mode contract shared with the `cartesian_manager` ROS package.
 *
 * `cartesian_manager` selects its shapers from a `std_msgs/msg/String` published
 * on `/mode_request`. `tablet_interface` validates the string before forwarding
 * it, so an unknown mode is reported back as a `MODE_REQUEST_REJECTED` event
 * rather than silently ignored by the robot.
 *
 * Note that B1/B2 are *not* manager modes: they only change which joystick axes
 * drive translation and rotation, which the tablet resolves locally before
 * sending a twist.
 *
 * The manager sums every activated input rather than arbitrating between them,
 * so the tablet twist adds to joystick, head, hand, visual servoing and shared
 * control. Always send zeros on release.
 *
 * The target architecture adds `translation` and `orientation` behaviours,
 * replacing `geometric/jaco`. When those land, teleop modes 1 (ROTATION) and 2
 * (TRANSLATION) should become real mode requests rather than local axis masks.
 */

export const MODE_REQUEST_TOPIC = "/mode_request";
export const MODE_REQUEST_MESSAGE_TYPE = "std_msgs/msg/String";

/** Neutral geometric state: the manager applies no shaping. */
export const MODE_GEOMETRIC_BOTH = "geometric/both";
export const MODE_GEOMETRIC_JACO = "geometric/jaco";
export const MODE_GEOMETRIC_SNAKE = "geometric/snake";
export const MODE_BEHAVIOUR_PASSTHROUGH = "behaviour/passthrough";
export const MODE_JOINT_TARGET_HOME = "behaviour/joint_target/home";

/** Build the YAML payload a typed widget sends for a String mode request. */
export const modeRequestPayload = (mode: string) => `{data: ${mode}}`;

export const SNAKE_MODE_REQUEST_TOPIC = MODE_REQUEST_TOPIC;
export const SNAKE_MODE_PRESSED_PAYLOAD = modeRequestPayload(MODE_GEOMETRIC_SNAKE);
export const SNAKE_MODE_RELEASED_PAYLOAD = modeRequestPayload(MODE_GEOMETRIC_BOTH);

/**
 * Topics the snake hold button used before the `cartesian_manager` migration.
 * Kept so saved configurations can be migrated forward on load.
 */
export const LEGACY_SNAKE_TOPICS = ["/activate_snake", "/snake_control/enable"];
