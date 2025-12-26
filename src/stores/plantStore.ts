import { makeAutoObservable } from "mobx";
import { Plant, PlantPosition } from "@/models/Plant";

class PlantStore {
  plants: Map<string, Plant> = new Map();

  constructor() {
    makeAutoObservable(this);
  }

  get plantList(): Plant[] {
    return Array.from(this.plants.values());
  }

  get selectedPlant(): Plant | null {
    return this.plantList.find((p) => p.selected) || null;
  }

  get selectedPlants(): Plant[] {
    return this.plantList.filter((p) => p.selected);
  }

  addPlant(plant: Plant) {
    this.plants.set(plant.id, plant);
  }

  removePlant(id: string) {
    this.plants.delete(id);
  }

  getPlant(id: string): Plant | undefined {
    return this.plants.get(id);
  }

  selectPlant(id: string) {
    // Deselect all other plants first
    this.deselectAll();
    const plant = this.plants.get(id);
    if (plant) {
      plant.setSelected(true);
    }
  }

  deselectAll() {
    for (const plant of this.plants.values()) {
      plant.setSelected(false);
      plant.setIsMoving(false);
    }
  }

  togglePlantSelection(id: string) {
    const plant = this.plants.get(id);
    if (plant) {
      if (plant.selected) {
        plant.setSelected(false);
      } else {
        this.deselectAll();
        plant.setSelected(true);
      }
    }
  }

  updatePlantPosition(id: string, position: Partial<PlantPosition>) {
    const plant = this.plants.get(id);
    if (plant) {
      plant.setPosition(position);
    }
  }

  // Create a new plant with auto-generated ID
  createPlant(name: string, position: PlantPosition, color?: number): Plant {
    const id = `plant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const plant = new Plant(id, name, position, color);
    this.addPlant(plant);
    return plant;
  }
}

export const plantStore = new PlantStore();
