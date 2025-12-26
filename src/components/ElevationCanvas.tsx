"use client";

import { useCallback, useRef, useEffect } from "react";
import { reaction } from "mobx";
import { observer } from "mobx-react-lite";
import * as THREE from "three/webgpu";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useWebGPUCanvas } from "@/hooks/useWebGPUCanvas";
import { cameraStore, DISTANCE_TO_ZOOM_FACTOR } from "@/stores/cameraStore";
import { plantStore } from "@/stores/plantStore";
import { addStandardLighting } from "@/utils/sceneHelpers";

const BACKGROUND_COLOR = 0x87ceeb;
const GROUND_COLOR = 0x90a955;

const ElevationCanvas = observer(function ElevationCanvas() {
  const controlsRef = useRef<OrbitControls | null>(null);
  const lastDistanceRef = useRef<number>(0);
  const plantMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());

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

  const { containerRef, cameraRef, sceneRef } = useWebGPUCanvas({
    backgroundColor: BACKGROUND_COLOR,
    setupScene,
    setupCamera,
    updateCamera,
    onAnimate,
  });

  // Sync plants with scene
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const dispose = reaction(
      () =>
        plantStore.plantList.map((plant) => ({
          id: plant.id,
          x: plant.position.x,
          y: plant.position.y,
          z: plant.position.z,
          color: plant.color,
        })),
      () => {
        const currentPlantIds = new Set(plantStore.plantList.map((p) => p.id));
        const existingIds = new Set(plantMeshesRef.current.keys());

        // Remove meshes for plants that no longer exist
        for (const id of existingIds) {
          if (!currentPlantIds.has(id)) {
            const mesh = plantMeshesRef.current.get(id);
            if (mesh) {
              scene.remove(mesh);
              mesh.geometry.dispose();
              (mesh.material as THREE.Material).dispose();
              plantMeshesRef.current.delete(id);
            }
          }
        }

        // Add meshes for new plants and update existing ones
        for (const plant of plantStore.plantList) {
          if (!plantMeshesRef.current.has(plant.id)) {
            const mesh = plant.createElevationMesh();
            scene.add(mesh);
            plantMeshesRef.current.set(plant.id, mesh);
          } else {
            // Update position of existing mesh
            const mesh = plantMeshesRef.current.get(plant.id)!;
            mesh.position.set(
              plant.position.x,
              plant.position.y + 0.5,
              plant.position.z
            );
          }
        }
      },
      { fireImmediately: true }
    );

    return () => {
      dispose();
    };
  }, [sceneRef]);

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
