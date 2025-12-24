"use client";

import { useCallback, useRef, useEffect } from "react";
import { observer } from "mobx-react-lite";
import * as THREE from "three/webgpu";
import { useWebGPUCanvas } from "@/hooks/useWebGPUCanvas";
import { cameraStore } from "@/stores/cameraStore";
import { addStandardLighting, createTestCube } from "@/utils/sceneHelpers";

const BACKGROUND_COLOR = 0xf5f5f5;
const GRID_COLOR = 0xcccccc;
const GRID_CENTER_COLOR = 0x888888;
const ZOOM_SPEED = 0.1;

const PlanCanvas = observer(function PlanCanvas() {
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  const setupScene = useCallback((scene: THREE.Scene) => {
    // Infinite grid
    const gridHelper = new THREE.GridHelper(
      1000,
      1000,
      GRID_CENTER_COLOR,
      GRID_COLOR
    );
    scene.add(gridHelper);

    // Test cube
    scene.add(createTestCube(0xe67e22));

    // Lighting
    addStandardLighting(scene);
  }, []);

  const setupCamera = useCallback((aspect: number) => {
    const { zoom, targetX, targetZ } = cameraStore;
    const camera = new THREE.OrthographicCamera(
      (zoom * aspect) / -2,
      (zoom * aspect) / 2,
      zoom / 2,
      zoom / -2,
      0.1,
      1000
    );
    camera.position.set(targetX, 100, targetZ);
    camera.lookAt(targetX, 0, targetZ);
    return camera;
  }, []);

  const updateCamera = useCallback((camera: THREE.Camera, aspect: number) => {
    const orthoCamera = camera as THREE.OrthographicCamera;
    const { zoom, targetX, targetZ } = cameraStore;
    orthoCamera.left = (zoom * aspect) / -2;
    orthoCamera.right = (zoom * aspect) / 2;
    orthoCamera.top = zoom / 2;
    orthoCamera.bottom = zoom / -2;
    orthoCamera.position.set(targetX, 100, targetZ);
    orthoCamera.lookAt(targetX, 0, targetZ);
    orthoCamera.updateProjectionMatrix();
  }, []);

  const { containerRef, cameraRef } = useWebGPUCanvas({
    backgroundColor: BACKGROUND_COLOR,
    setupScene,
    setupCamera,
    updateCamera,
  });

  // Sync camera with store
  useEffect(() => {
    if (cameraRef.current && containerRef.current) {
      const aspect =
        containerRef.current.clientWidth / containerRef.current.clientHeight;
      updateCamera(cameraRef.current, aspect);
    }
  }, [cameraStore.targetX, cameraStore.targetZ, cameraStore.zoom, cameraRef, containerRef, updateCamera]);

  // Pan and zoom handlers
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1 + ZOOM_SPEED : 1 - ZOOM_SPEED;
      cameraStore.zoomBy(factor);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0 || e.button === 1) {
        isDraggingRef.current = true;
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
        container.style.cursor = "grabbing";
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;

      const deltaX = e.clientX - lastMouseRef.current.x;
      const deltaY = e.clientY - lastMouseRef.current.y;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };

      const pixelsPerUnit = container.clientHeight / cameraStore.zoom;
      cameraStore.pan(-deltaX / pixelsPerUnit, -deltaY / pixelsPerUnit);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      container.style.cursor = "grab";
    };

    container.style.cursor = "grab";

    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("mousedown", handleMouseDown);
    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseup", handleMouseUp);
    container.addEventListener("mouseleave", handleMouseUp);

    return () => {
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("mousedown", handleMouseDown);
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseup", handleMouseUp);
      container.removeEventListener("mouseleave", handleMouseUp);
    };
  }, [containerRef]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        position: "absolute",
        top: 0,
        left: 0,
        backgroundColor: `#${BACKGROUND_COLOR.toString(16).padStart(6, "0")}`,
        overflow: "hidden",
      }}
    />
  );
});

export default PlanCanvas;
