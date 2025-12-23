"use client";

import { useCallback, useRef } from "react";
import * as THREE from "three/webgpu";
import { useWebGPUCanvas } from "@/hooks/useWebGPUCanvas";

const FRUSTUM_SIZE = 10;

export default function PlanCanvas() {
  const cubeRef = useRef<THREE.Mesh | null>(null);

  const setupScene = useCallback((scene: THREE.Scene) => {
    // Add a test cube
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0xe67e22 });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
    cubeRef.current = cube;

    // Add lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);
  }, []);

  const setupCamera = useCallback((aspect: number) => {
    const camera = new THREE.OrthographicCamera(
      (FRUSTUM_SIZE * aspect) / -2,
      (FRUSTUM_SIZE * aspect) / 2,
      FRUSTUM_SIZE / 2,
      FRUSTUM_SIZE / -2,
      0.1,
      1000
    );
    camera.position.y = 10;
    camera.lookAt(0, 0, 0);
    return camera;
  }, []);

  const updateCamera = useCallback((camera: THREE.Camera, aspect: number) => {
    const orthoCamera = camera as THREE.OrthographicCamera;
    orthoCamera.left = (FRUSTUM_SIZE * aspect) / -2;
    orthoCamera.right = (FRUSTUM_SIZE * aspect) / 2;
    orthoCamera.top = FRUSTUM_SIZE / 2;
    orthoCamera.bottom = FRUSTUM_SIZE / -2;
    orthoCamera.updateProjectionMatrix();
  }, []);

  const onAnimate = useCallback(() => {
    if (cubeRef.current) {
      cubeRef.current.rotation.y += 0.01;
    }
  }, []);

  const { containerRef } = useWebGPUCanvas({
    backgroundColor: 0xc8e6c9,
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
        backgroundColor: "#c8e6c9",
        overflow: "hidden",
      }}
    />
  );
}
