import { expect, test } from "@playwright/test";

/**
 * Full-chain integration check: real browser UI -> `tablet_interface` websocket
 * -> `cartesian_manager`.
 *
 * This needs a sourced ROS workspace with both nodes running:
 *
 *   ros2 run cartesian_manager cartesian_manager_node --ros-args \
 *     --params-file install/cartesian_manager/share/cartesian_manager/config/explorer_params.yaml
 *   cd src/input_interfaces/tablet_interface && make run-node
 *
 * It skips instead of failing when the backend is not up, so the default
 * `npm run test:e2e` run stays green on a machine without ROS.
 */

const BACKEND_WS = "ws://127.0.0.1:8765/ws/control";

const backendIsUp = async (): Promise<boolean> => {
  try {
    const response = await fetch("http://127.0.0.1:8765/", {
      signal: AbortSignal.timeout(1000),
    });
    return response.status < 500;
  } catch {
    return false;
  }
};

test("sandbox runtime drives cartesian_manager through tablet_interface", async ({
  page,
}) => {
  test.skip(!(await backendIsUp()), `tablet_interface not reachable at ${BACKEND_WS}`);

  const sent: Record<string, unknown>[] = [];
  page.on("websocket", (ws) => {
    ws.on("framesent", (frame) => {
      try {
        sent.push(JSON.parse(String(frame.payload)));
      } catch {
        /* non-JSON frame */
      }
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: /SandboxV0\.0/i }).click();
  await page.getByRole("button", { name: "Open Runtime" }).click();
  await expect(page.getByText("SandboxV0.0")).toBeVisible();

  // The 30 Hz teleop heartbeat must be reaching the backend.
  await expect
    .poll(() => sent.filter((message) => message.type === "teleop_cmd").length, {
      timeout: 20000,
    })
    .toBeGreaterThan(10);

  // Move to the snake screen, which carries the teleop joystick and the
  // hold-to-request snake button.
  const snakeTab = page.getByRole("button", { name: /snake/i }).first();
  if (await snakeTab.count()) {
    await snakeTab.click();
    await page.waitForTimeout(400);
  }

  // Drag the joystick so a non-zero twist reaches the robot.
  const joystick = page.locator(".joystick-wrap").first();
  await expect(joystick).toBeVisible();
  const box = await joystick.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    await page.mouse.move(centerX, centerY);
    await page.mouse.down();
    await page.mouse.move(centerX + box.width * 0.35, centerY, { steps: 8 });
    await page.waitForTimeout(1000);
    await page.mouse.up();
    await page.waitForTimeout(400);
  }

  const movedTeleop = sent.filter(
    (message) =>
      message.type === "teleop_cmd" &&
      typeof message.linear === "object" &&
      message.linear !== null &&
      Object.values(message.linear as Record<string, number>).some(
        (value) => Math.abs(value) > 0.01
      )
  );
  expect(movedTeleop.length).toBeGreaterThan(0);

  // Hold the snake button: it must produce cartesian_manager mode requests
  // rather than the retired /activate_snake boolean.
  const hold = page.getByRole("button", { name: /Hold Snake/i }).first();
  if (await hold.count()) {
    await hold.hover();
    await page.mouse.down();
    await page.waitForTimeout(600);
    await page.mouse.up();
    await page.waitForTimeout(400);
  }

  const modeMessages = sent.filter(
    (message) => message.type === "ui_typed" && message.topic === "/mode_request"
  );
  expect(modeMessages.length).toBeGreaterThan(0);
  expect(modeMessages.map((message) => message.payload_text)).toContain(
    "{data: geometric/snake}"
  );
  expect(modeMessages.map((message) => message.payload_text)).toContain(
    "{data: geometric/both}"
  );
});
