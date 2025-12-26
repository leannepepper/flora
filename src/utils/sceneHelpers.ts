import * as THREE from "three/webgpu";

export function addStandardLighting(scene: THREE.Scene) {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 10, 5);
  scene.add(directionalLight);

  return { ambientLight, directionalLight };
}
