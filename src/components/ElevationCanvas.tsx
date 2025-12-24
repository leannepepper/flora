"use client";

import { useCallback, useRef, useEffect } from "react";
import { observer } from "mobx-react-lite";
import * as THREE from "three/webgpu";
import { useWebGPUCanvas } from "@/hooks/useWebGPUCanvas";
import { cameraStore } from "@/stores/cameraStore";

const ElevationCanvas = observer(function ElevationCanvas() {
  const cubeRef = useRef<THREE.Mesh | null>(null);

  const setupScene = useCallback((scene: THREE.Scene) => {
    // Add a test cube
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0x4a90d9 });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
    cubeRef.current = cube;

    // Add lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);
  }, []);

  const setupCamera = useCallback((aspect: number) => {
    const { zoom, targetX, targetZ } = cameraStore;
    const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    // Position camera to look at target from the side (along Z axis)
    camera.position.set(targetX, zoom / 2, targetZ + zoom);
    camera.lookAt(targetX, 0, targetZ);
    return camera;
  }, []);

  const updateCamera = useCallback((camera: THREE.Camera, aspect: number) => {
    const perspCamera = camera as THREE.PerspectiveCamera;
    const { zoom, targetX, targetZ } = cameraStore;
    perspCamera.aspect = aspect;
    // Position camera to look at target from the side
    perspCamera.position.set(targetX, zoom / 2, targetZ + zoom);
    perspCamera.lookAt(targetX, 0, targetZ);
    perspCamera.updateProjectionMatrix();
  }, []);

  const onAnimate = useCallback(() => {
    if (cubeRef.current) {
      cubeRef.current.rotation.x += 0.01;
      cubeRef.current.rotation.y += 0.01;
    }
  }, []);

  const { containerRef, cameraRef } = useWebGPUCanvas({
    backgroundColor: 0xffc0cb,
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

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        position: "absolute",
        top: 0,
        left: 0,
        backgroundColor: "#ffc0cb",
        overflow: "hidden",
      }}
    />
  );
});

export default ElevationCanvas;
