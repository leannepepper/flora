"use client";

import { useCallback, useRef, useEffect } from "react";
import { observer } from "mobx-react-lite";
import * as THREE from "three/webgpu";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { useWebGPUCanvas } from "@/hooks/useWebGPUCanvas";
import { cameraStore } from "@/stores/cameraStore";
import { plantStore } from "@/stores/plantStore";
import { addStandardLighting } from "@/utils/sceneHelpers";

const BACKGROUND_COLOR = 0xf5f5f5;
const GRID_COLOR = 0xcccccc;
const GRID_CENTER_COLOR = 0x888888;
const SELECTION_COLOR = 0xff69b4; // Pink outline color
const ZOOM_SPEED = 0.1;

const PlanCanvas = observer(function PlanCanvas() {
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const plantMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const outlineMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const transformControlsRef = useRef<TransformControls | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());

  const setupScene = useCallback((scene: THREE.Scene) => {
    // Infinite grid
    const gridHelper = new THREE.GridHelper(
      1000,
      1000,
      GRID_CENTER_COLOR,
      GRID_COLOR
    );
    scene.add(gridHelper);

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

  const { containerRef, cameraRef, sceneRef } = useWebGPUCanvas({
    backgroundColor: BACKGROUND_COLOR,
    setupScene,
    setupCamera,
    updateCamera,
  });

  // Create outline mesh for selected plants
  const createOutlineMesh = useCallback(
    (originalMesh: THREE.Mesh): THREE.Mesh => {
      const outlineGeometry = originalMesh.geometry.clone();
      const outlineMaterial = new THREE.MeshBasicMaterial({
        color: SELECTION_COLOR,
        side: THREE.BackSide,
      });
      const outlineMesh = new THREE.Mesh(outlineGeometry, outlineMaterial);
      outlineMesh.scale.multiplyScalar(1.2);
      outlineMesh.position.copy(originalMesh.position);
      return outlineMesh;
    },
    []
  );

  // Sync plants with scene
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const currentPlantIds = new Set(plantStore.plantList.map((p) => p.id));
    const existingIds = new Set(plantMeshesRef.current.keys());

    // Remove meshes for plants that no longer exist
    for (const id of existingIds) {
      if (!currentPlantIds.has(id)) {
        const mesh = plantMeshesRef.current.get(id);
        const outline = outlineMeshesRef.current.get(id);
        if (mesh) {
          scene.remove(mesh);
          mesh.geometry.dispose();
          (mesh.material as THREE.Material).dispose();
          plantMeshesRef.current.delete(id);
        }
        if (outline) {
          scene.remove(outline);
          outline.geometry.dispose();
          (outline.material as THREE.Material).dispose();
          outlineMeshesRef.current.delete(id);
        }
      }
    }

    // Add meshes for new plants and update existing ones
    for (const plant of plantStore.plantList) {
      if (!plantMeshesRef.current.has(plant.id)) {
        const mesh = plant.createPlanMesh();
        scene.add(mesh);
        plantMeshesRef.current.set(plant.id, mesh);
      } else {
        // Update position of existing mesh
        const mesh = plantMeshesRef.current.get(plant.id)!;
        mesh.position.set(plant.position.x, 0.5, plant.position.z);
      }

      // Handle outline for selected plants
      const mesh = plantMeshesRef.current.get(plant.id)!;
      const existingOutline = outlineMeshesRef.current.get(plant.id);

      if (plant.selected) {
        if (!existingOutline) {
          const outline = createOutlineMesh(mesh);
          scene.add(outline);
          outlineMeshesRef.current.set(plant.id, outline);
        } else {
          existingOutline.position.copy(mesh.position);
        }
      } else if (existingOutline) {
        scene.remove(existingOutline);
        existingOutline.geometry.dispose();
        (existingOutline.material as THREE.Material).dispose();
        outlineMeshesRef.current.delete(plant.id);
      }
    }

    // Update transform controls target
    const selectedPlant = plantStore.selectedPlant;
    if (selectedPlant && transformControlsRef.current) {
      const mesh = plantMeshesRef.current.get(selectedPlant.id);
      if (mesh && transformControlsRef.current.object !== mesh) {
        transformControlsRef.current.attach(mesh);
      }
    } else if (transformControlsRef.current?.object) {
      transformControlsRef.current.detach();
    }
  }, [plantStore.plantList, plantStore.selectedPlant, sceneRef, createOutlineMesh]);

  // Setup TransformControls
  useEffect(() => {
    const container = containerRef.current;
    const camera = cameraRef.current;
    const scene = sceneRef.current;
    if (!container || !camera || !scene) return;

    const timeoutId = setTimeout(() => {
      const canvas = container.querySelector("canvas");
      if (!canvas) return;

      // Transform controls for moving selected plants
      const transformControls = new TransformControls(camera, canvas);
      transformControls.setMode("translate");
      transformControls.showY = false; // Only X and Z in plan view
      scene.add(transformControls.getHelper());
      transformControlsRef.current = transformControls;

      // Track when dragging with transform controls
      transformControls.addEventListener("dragging-changed", (event) => {
        const isDragging = event.value as boolean;
        isDraggingRef.current = isDragging;
        const selectedPlant = plantStore.selectedPlant;
        if (selectedPlant) {
          selectedPlant.setIsMoving(isDragging);
        }
      });

      // Update plant position when transform controls change
      transformControls.addEventListener("change", () => {
        const selectedPlant = plantStore.selectedPlant;
        if (selectedPlant && transformControls.object) {
          const pos = transformControls.object.position;
          plantStore.updatePlantPosition(selectedPlant.id, {
            x: pos.x,
            z: pos.z,
          });
        }
      });
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (transformControlsRef.current) {
        scene.remove(transformControlsRef.current.getHelper());
        transformControlsRef.current.dispose();
        transformControlsRef.current = null;
      }
    };
  }, [containerRef, cameraRef, sceneRef]);

  // Handle click for selection
  useEffect(() => {
    const container = containerRef.current;
    const camera = cameraRef.current;
    if (!container || !camera) return;

    const handleClick = (event: MouseEvent) => {
      // Don't process if we were just dragging transform controls
      if (transformControlsRef.current?.dragging) return;

      const rect = container.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);

      const meshes = Array.from(plantMeshesRef.current.values());
      const intersects = raycasterRef.current.intersectObjects(meshes);

      if (intersects.length > 0) {
        const plantId = intersects[0].object.userData.plantId;
        if (plantId) {
          plantStore.selectPlant(plantId);
        }
      } else {
        plantStore.deselectAll();
      }
    };

    container.addEventListener("click", handleClick);

    return () => {
      container.removeEventListener("click", handleClick);
    };
  }, [containerRef, cameraRef]);

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
      // Don't start panning if transform controls are being used
      if (transformControlsRef.current?.dragging) return;

      if (e.button === 0 || e.button === 1) {
        // Small delay to check if this is a click vs drag
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (transformControlsRef.current?.dragging) return;

      const deltaX = e.clientX - lastMouseRef.current.x;
      const deltaY = e.clientY - lastMouseRef.current.y;

      // Only start dragging after moving a bit
      if (
        !isDraggingRef.current &&
        (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3)
      ) {
        if (e.buttons === 1 || e.buttons === 4) {
          isDraggingRef.current = true;
          container.style.cursor = "grabbing";
        }
      }

      if (isDraggingRef.current) {
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
        const pixelsPerUnit = container.clientHeight / cameraStore.zoom;
        cameraStore.pan(-deltaX / pixelsPerUnit, -deltaY / pixelsPerUnit);
      }
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
