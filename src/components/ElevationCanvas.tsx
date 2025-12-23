"use client";

import { useCallback, useRef } from "react";
import * as THREE from "three/webgpu";
import { useWebGPUCanvas } from "@/hooks/useWebGPUCanvas";

export default function ElevationCanvas() {
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
    const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    camera.position.z = 5;
    return camera;
  }, []);

  const updateCamera = useCallback((camera: THREE.Camera, aspect: number) => {
    const perspCamera = camera as THREE.PerspectiveCamera;
    perspCamera.aspect = aspect;
    perspCamera.updateProjectionMatrix();
  }, []);

  const onAnimate = useCallback(() => {
    if (cubeRef.current) {
      cubeRef.current.rotation.x += 0.01;
      cubeRef.current.rotation.y += 0.01;
    }
  }, []);

  const { containerRef } = useWebGPUCanvas({
    backgroundColor: 0xffc0cb,
    setupScene,
    setupCamera,
    updateCamera,
    onAnimate,
  });

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
}
