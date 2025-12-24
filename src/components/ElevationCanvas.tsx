"use client";

import { useCallback, useRef, useEffect } from "react";
import { observer } from "mobx-react-lite";
import * as THREE from "three/webgpu";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useWebGPUCanvas } from "@/hooks/useWebGPUCanvas";
import { cameraStore, DISTANCE_TO_ZOOM_FACTOR } from "@/stores/cameraStore";
import { addStandardLighting, createTestCube } from "@/utils/sceneHelpers";

const BACKGROUND_COLOR = 0x87ceeb; // Sky blue
const GROUND_COLOR = 0x90a955;

const ElevationCanvas = observer(function ElevationCanvas() {
  const controlsRef = useRef<OrbitControls | null>(null);
  const lastDistanceRef = useRef<number>(0);

  const setupScene = useCallback((scene: THREE.Scene) => {
    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: GROUND_COLOR,
      side: THREE.DoubleSide,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // Test cube
    scene.add(createTestCube(0x4a90d9));

    // Lighting
    addStandardLighting(scene);
  }, []);

  const setupCamera = useCallback((aspect: number) => {
    const { zoom, targetX, targetZ } = cameraStore;
    const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    camera.position.set(targetX, zoom, targetZ + zoom);
    lastDistanceRef.current = zoom * DISTANCE_TO_ZOOM_FACTOR;
    return camera;
  }, []);

  const updateCamera = useCallback((camera: THREE.Camera, aspect: number) => {
    const perspCamera = camera as THREE.PerspectiveCamera;
    perspCamera.aspect = aspect;
    perspCamera.updateProjectionMatrix();
  }, []);

  const onAnimate = useCallback(() => {
    if (!controlsRef.current || !cameraRef.current) return;

    controlsRef.current.update();

    const target = controlsRef.current.target;

    // Sync pan position back to store
    const panChanged =
      Math.abs(target.x - cameraStore.targetX) > 0.001 ||
      Math.abs(target.z - cameraStore.targetZ) > 0.001;

    if (panChanged) {
      cameraStore.setTarget(target.x, target.z);
    }

    // Sync zoom (camera distance) back to store
    const distance = cameraRef.current.position.distanceTo(target);
    if (Math.abs(distance - lastDistanceRef.current) > 0.1) {
      lastDistanceRef.current = distance;
      const newZoom = distance / DISTANCE_TO_ZOOM_FACTOR;
      if (Math.abs(newZoom - cameraStore.zoom) > 0.1) {
        cameraStore.setZoom(newZoom);
      }
    }
  }, []);

  const { containerRef, cameraRef } = useWebGPUCanvas({
    backgroundColor: BACKGROUND_COLOR,
    setupScene,
    setupCamera,
    updateCamera,
    onAnimate,
  });

  // Setup OrbitControls
  useEffect(() => {
    const container = containerRef.current;
    const camera = cameraRef.current;
    if (!container || !camera) return;

    const timeoutId = setTimeout(() => {
      const canvas = container.querySelector("canvas");
      if (!canvas) return;

      const controls = new OrbitControls(camera, canvas);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.minDistance = cameraStore.minZoom * DISTANCE_TO_ZOOM_FACTOR;
      controls.maxDistance = cameraStore.maxZoom * DISTANCE_TO_ZOOM_FACTOR;
      controls.maxPolarAngle = Math.PI / 2 - 0.1;
      controls.target.set(cameraStore.targetX, 0, cameraStore.targetZ);

      controlsRef.current = controls;
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      controlsRef.current?.dispose();
      controlsRef.current = null;
    };
  }, [containerRef, cameraRef]);

  // Sync from store to OrbitControls
  useEffect(() => {
    if (!controlsRef.current || !cameraRef.current) return;

    const controls = controlsRef.current;
    const camera = cameraRef.current;

    controls.target.x = cameraStore.targetX;
    controls.target.z = cameraStore.targetZ;

    const direction = new THREE.Vector3()
      .subVectors(camera.position, controls.target)
      .normalize();
    const newDistance = cameraStore.zoom * DISTANCE_TO_ZOOM_FACTOR;
    camera.position
      .copy(controls.target)
      .addScaledVector(direction, newDistance);
    lastDistanceRef.current = newDistance;
  }, [cameraStore.targetX, cameraStore.targetZ, cameraStore.zoom]);

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

export default ElevationCanvas;
