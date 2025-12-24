"use client";

import { useCallback, useRef, useEffect } from "react";
import * as THREE from "three/webgpu";
import { useWebGPUCanvas } from "@/hooks/useWebGPUCanvas";

const DEFAULT_ZOOM = 10;
const MIN_ZOOM = 2;
const MAX_ZOOM = 100;
const ZOOM_SPEED = 0.1;

export default function PlanCanvas() {
  const cubeRef = useRef<THREE.Mesh | null>(null);
  const zoomRef = useRef(DEFAULT_ZOOM);
  const panRef = useRef({ x: 0, z: 0 });
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
    gridHelper.rotation.x = 0; // Grid is already in XZ plane, viewed from above
    scene.add(gridHelper);

    // Add a test cube
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0xe67e22 });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.y = 0.5; // Lift it so it sits on the grid
    scene.add(cube);
    cubeRef.current = cube;

    // Add lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);
  }, []);

  const setupCamera = useCallback((aspect: number) => {
    const zoom = zoomRef.current;
    const camera = new THREE.OrthographicCamera(
      (zoom * aspect) / -2,
      (zoom * aspect) / 2,
      zoom / 2,
      zoom / -2,
      0.1,
      1000
    );
    camera.position.set(panRef.current.x, 100, panRef.current.z);
    camera.lookAt(panRef.current.x, 0, panRef.current.z);
    return camera;
  }, []);

  const updateCamera = useCallback((camera: THREE.Camera, aspect: number) => {
    const orthoCamera = camera as THREE.OrthographicCamera;
    const zoom = zoomRef.current;
    orthoCamera.left = (zoom * aspect) / -2;
    orthoCamera.right = (zoom * aspect) / 2;
    orthoCamera.top = zoom / 2;
    orthoCamera.bottom = zoom / -2;
    orthoCamera.position.set(panRef.current.x, 100, panRef.current.z);
    orthoCamera.lookAt(panRef.current.x, 0, panRef.current.z);
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

  // Handle zoom and pan
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      // Adjust zoom based on scroll direction
      const delta = e.deltaY > 0 ? 1 + ZOOM_SPEED : 1 - ZOOM_SPEED;
      zoomRef.current = Math.max(
        MIN_ZOOM,
        Math.min(MAX_ZOOM, zoomRef.current * delta)
      );

      // Update camera
      if (cameraRef.current) {
        const aspect = container.clientWidth / container.clientHeight;
        updateCamera(cameraRef.current, aspect);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      // Middle mouse button or left mouse button
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

      // Convert screen pixels to world units based on zoom level
      const pixelsPerUnit = container.clientHeight / zoomRef.current;
      panRef.current.x -= deltaX / pixelsPerUnit;
      panRef.current.z -= deltaY / pixelsPerUnit;

      // Update camera position
      if (cameraRef.current) {
        const aspect = container.clientWidth / container.clientHeight;
        updateCamera(cameraRef.current, aspect);
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      container.style.cursor = "grab";
    };

    const handleMouseLeave = () => {
      isDraggingRef.current = false;
      container.style.cursor = "grab";
    };

    // Set initial cursor
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
  }, [containerRef, cameraRef, updateCamera]);

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
}
