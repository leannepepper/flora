"use client";

import { useEffect, useRef, useCallback } from "react";
import * as THREE from "three/webgpu";

interface UseWebGPUCanvasOptions {
  backgroundColor: number;
  setupScene: (scene: THREE.Scene) => void;
  setupCamera: (aspect: number) => THREE.Camera;
  updateCamera: (camera: THREE.Camera, aspect: number) => void;
  onAnimate?: (delta: number) => void;
}

export function useWebGPUCanvas({
  backgroundColor,
  setupScene,
  setupCamera,
  updateCamera,
  onAnimate,
}: UseWebGPUCanvasOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGPURenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const animationIdRef = useRef<number>(0);
  const clockRef = useRef(new THREE.Clock());
  const isReadyRef = useRef(false);

  const handleResize = useCallback(
    (width: number, height: number) => {
      if (width === 0 || height === 0 || !isReadyRef.current) return;

      const aspect = width / height;

      if (cameraRef.current) {
        updateCamera(cameraRef.current, aspect);
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.setSize(width, height, false);
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    },
    [updateCamera]
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    const init = async () => {
      // Create scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(backgroundColor);
      sceneRef.current = scene;

      // Setup scene contents
      setupScene(scene);

      // Create camera
      const aspect = container.clientWidth / container.clientHeight;
      const camera = setupCamera(aspect);
      cameraRef.current = camera;

      // Create WebGPU renderer
      const renderer = new THREE.WebGPURenderer({ antialias: true });
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      rendererRef.current = renderer;

      await renderer.init();

      renderer.domElement.style.display = "block";
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";

      container.appendChild(renderer.domElement);

      // Mark as ready
      isReadyRef.current = true;

      // Animation loop
      const animate = () => {
        animationIdRef.current = requestAnimationFrame(animate);
        const delta = clockRef.current.getDelta();
        onAnimate?.(delta);
        renderer.render(scene, camera);
      };
      animate();
    };

    init();

    return () => {
      isReadyRef.current = false;
      cancelAnimationFrame(animationIdRef.current);
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (rendererRef.current.domElement.parentNode === container) {
          container.removeChild(rendererRef.current.domElement);
        }
      }
    };
  }, [backgroundColor, setupScene, setupCamera, onAnimate]);

  // Handle resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        handleResize(width, height);
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [handleResize]);

  return { containerRef, sceneRef, cameraRef };
}
