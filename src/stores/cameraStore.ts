import { makeAutoObservable } from "mobx";

// Conversion factor for camera distance to zoom
// Camera sits at 45° angle, so distance = zoom * sqrt(2)
export const DISTANCE_TO_ZOOM_FACTOR = Math.sqrt(2);

class CameraStore {
  // Shared target position for pan (X and Z only)
  targetX = 0;
  targetZ = 0;

  // Shared zoom level (world units visible)
  zoom = 10;

  // Zoom constraints
  readonly minZoom = 2;
  readonly maxZoom = 100;

  constructor() {
    makeAutoObservable(this);
  }

  setTarget(x: number, z: number) {
    this.targetX = x;
    this.targetZ = z;
  }

  pan(deltaX: number, deltaZ: number) {
    this.targetX += deltaX;
    this.targetZ += deltaZ;
  }

  setZoom(zoom: number) {
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
  }

  zoomBy(factor: number) {
    this.setZoom(this.zoom * factor);
  }
}

export const cameraStore = new CameraStore();
