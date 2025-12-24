import { makeAutoObservable } from "mobx";

class CameraStore {
  // Shared target position (the point cameras look at)
  targetX = 0;
  targetZ = 0;

  // Shared zoom level
  zoom = 10;

  // Zoom constraints
  minZoom = 2;
  maxZoom = 100;

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
