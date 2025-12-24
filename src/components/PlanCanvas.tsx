"use client";

import { useCallback, useRef, useEffect } from "react";
import { observer } from "mobx-react-lite";
import * as THREE from "three/webgpu";
import { useWebGPUCanvas } from "@/hooks/useWebGPUCanvas";
import { cameraStore } from "@/stores/cameraStore";

const ZOOM_SPEED = 0.1;

const PlanCanvas = observer(function PlanCanvas() {
  const cubeRef = useRef<THREE.Mesh | null>(null);
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  const setupScene = useCallback((scene: THREE.Scene) => {
    // Add infinite grid
    const gridSize = 1000;
    const gridDivisions = 1000;
    const gridHelper = new THREE.GridHelper(
      gridSize,
      gridDivisions,
      0x888888, // center line color
      0xcccccc // grid color
    );
    gridHelper.rotation.x = 0;
    scene.add(gridHelper);

    // Add a test cube
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0xe67e22 });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.y = 0.5;
    scene.add(cube);
    cubeRef.current = cube;

    // Add lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);
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

  const onAnimate = useCallback(() => {
    if (cubeRef.current) {
      cubeRef.current.rotation.y += 0.01;
    }
  }, []);

  const { containerRef, cameraRef } = useWebGPUCanvas({
    backgroundColor: 0xf5f5f5,
    setupScene,
    setupCamera,
    updateCamera,
    onAnimate,
  });

  // Sync camera with store changes
  useEffect(() => {
    if (cameraRef.current && containerRef.current) {
      const aspect =
        containerRef.current.clientWidth / containerRef.current.clientHeight;
      updateCamera(cameraRef.current, aspect);
    }
  }, [cameraStore.targetX, cameraStore.targetZ, cameraStore.zoom, cameraRef, containerRef, updateCamera]);

  // Handle zoom and pan
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1 + ZOOM_SPEED : 1 - ZOOM_SPEED;
      cameraStore.zoomBy(factor);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 1 || e.button === 0) {
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

      // Convert screen pixels to world units
      const pixelsPerUnit = container.clientHeight / cameraStore.zoom;
      cameraStore.pan(-deltaX / pixelsPerUnit, -deltaY / pixelsPerUnit);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      container.style.cursor = "grab";
    };

    const handleMouseLeave = () => {
      isDraggingRef.current = false;
      container.style.cursor = "grab";
    };

    container.style.cursor = "grab";

    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("mousedown", handleMouseDown);
    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseup", handleMouseUp);
    container.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("mousedown", handleMouseDown);
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseup", handleMouseUp);
      container.removeEventListener("mouseleave", handleMouseLeave);
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
        backgroundColor: "#f5f5f5",
        overflow: "hidden",
      }}
    />
  );
});

export default PlanCanvas;
