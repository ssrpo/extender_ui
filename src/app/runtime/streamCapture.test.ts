import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildCameraFrameMessage,
  captureImageDataUrlFromStreamWidget,
  findStreamWidgetById,
} from "./streamCapture";

describe("streamCapture", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("finds stream widgets by id and ignores other widget kinds", () => {
    const widget = findStreamWidgetById(
      [
        {
          id: "text-1",
          kind: "text",
          label: "Ignored",
          text: "Hello",
          rect: { x: 0, y: 0, w: 10, h: 10 },
        } as never,
        {
          id: "camera-front",
          kind: "stream-display",
          label: "Front camera",
          topic: "/camera/front",
          source: "camera",
          rect: { x: 0, y: 0, w: 10, h: 10 },
        } as never,
      ],
      "camera-front"
    );

    expect(widget?.id).toBe("camera-front");
    expect(findStreamWidgetById([], "missing")).toBeNull();
  });

  it("captures a frame from a matching video element", () => {
    const video = document.createElement("video");
    video.dataset.streamWidgetId = "camera-front";
    Object.defineProperty(video, "videoWidth", { value: 320 });
    Object.defineProperty(video, "videoHeight", { value: 180 });
    document.body.appendChild(video);

    const drawImage = vi.fn();
    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({ drawImage })),
      toDataURL: vi.fn(() => "data:image/jpeg;base64,video"),
    } as unknown as HTMLCanvasElement;
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(((tagName: string) => {
      if (tagName === "canvas") return fakeCanvas;
      return originalCreateElement(tagName);
    }) as typeof document.createElement);

    expect(captureImageDataUrlFromStreamWidget("camera-front")).toBe(
      "data:image/jpeg;base64,video"
    );
    expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 320, 180);
  });

  it("falls back to the image element when no video frame is available", () => {
    const image = document.createElement("img");
    image.dataset.streamWidgetId = "camera-front";
    Object.defineProperty(image, "naturalWidth", { value: 640 });
    Object.defineProperty(image, "naturalHeight", { value: 480 });
    document.body.appendChild(image);

    const drawImage = vi.fn();
    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({ drawImage })),
      toDataURL: vi.fn(() => "data:image/jpeg;base64,image"),
    } as unknown as HTMLCanvasElement;
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(((tagName: string) => {
      if (tagName === "canvas") return fakeCanvas;
      return originalCreateElement(tagName);
    }) as typeof document.createElement);

    expect(captureImageDataUrlFromStreamWidget("camera-front")).toBe(
      "data:image/jpeg;base64,image"
    );
    expect(drawImage).toHaveBeenCalledWith(image, 0, 0, 640, 480);
  });

  it("returns null when canvas capture is unavailable or drawing fails", () => {
    const video = document.createElement("video");
    video.dataset.streamWidgetId = "camera-front";
    Object.defineProperty(video, "videoWidth", { value: 320 });
    Object.defineProperty(video, "videoHeight", { value: 180 });
    document.body.appendChild(video);

    const fakeCanvasWithoutContext = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => null),
    } as unknown as HTMLCanvasElement;
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(((tagName: string) => {
      if (tagName === "canvas") return fakeCanvasWithoutContext;
      return originalCreateElement(tagName);
    }) as typeof document.createElement);

    expect(captureImageDataUrlFromStreamWidget("camera-front")).toBeNull();

    vi.restoreAllMocks();
    const fakeCanvasThatThrows = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({
        drawImage: () => {
          throw new Error("capture blocked");
        },
      })),
      toDataURL: vi.fn(() => "data:image/jpeg;base64,video"),
    } as unknown as HTMLCanvasElement;
    vi.spyOn(document, "createElement").mockImplementation(((tagName: string) => {
      if (tagName === "canvas") return fakeCanvasThatThrows;
      return originalCreateElement(tagName);
    }) as typeof document.createElement);

    expect(captureImageDataUrlFromStreamWidget("camera-front")).toBeNull();
    expect(captureImageDataUrlFromStreamWidget("missing")).toBeNull();
  });

  it("builds camera frame messages only when the topic is usable", () => {
    const widget = {
      id: "camera-front",
      kind: "stream-display",
      label: "Front camera",
      topic: " /camera/front ",
      source: "camera",
      rect: { x: 0, y: 0, w: 10, h: 10 },
    };

    expect(buildCameraFrameMessage(widget as never, "data:image/jpeg;base64,frame")).toEqual({
      type: "camera_frame",
      topic: "/camera/front",
      image_data_url: "data:image/jpeg;base64,frame",
      widget_id: "camera-front",
    });
    expect(
      buildCameraFrameMessage(
        {
          ...widget,
          topic: "   ",
        } as never,
        "data:image/jpeg;base64,frame"
      )
    ).toBeNull();
  });
});
