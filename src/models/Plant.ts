import * as THREE from "three/webgpu";
import { makeAutoObservable } from "mobx";

export interface PlantPosition {
  x: number;
  y: number;
  z: number;
}

export class Plant {
  id: string;
  name: string;
  position: PlantPosition;
  color: number;
  selected: boolean = false;
  isMoving: boolean = false;

  constructor(
    id: string,
    name: string,
    position: PlantPosition = { x: 0, y: 0, z: 0 },
    color: number = 0x4a90d9
  ) {
    this.id = id;
    this.name = name;
    this.position = position;
    this.color = color;
    makeAutoObservable(this);
  }

  setPosition(position: Partial<PlantPosition>) {
    this.position = { ...this.position, ...position };
  }

  setSelected(selected: boolean) {
    this.selected = selected;
  }

  setIsMoving(isMoving: boolean) {
    this.isMoving = isMoving;
  }

  toggleSelected() {
    this.selected = !this.selected;
  }

  // Create the 3D representation for the elevation view (cube)
  createElevationMesh(): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: this.color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(this.position.x, this.position.y + 0.5, this.position.z);
    mesh.userData.plantId = this.id;
    return mesh;
  }

  // Create the 3D representation for the plan view (sphere seen from above)
  createPlanMesh(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(0.5, 32, 32);
    const material = new THREE.MeshStandardMaterial({ color: this.color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(this.position.x, 0.5, this.position.z);
    mesh.userData.plantId = this.id;
    return mesh;
  }
}
