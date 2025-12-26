"use client";

import { useEffect } from "react";
import SplitView from "@/components/SplitView";
import ElevationCanvas from "@/components/ElevationCanvas";
import PlanCanvas from "@/components/PlanCanvas";
import { plantStore } from "@/stores/plantStore";

export default function Home() {
  // Add a test plant on mount
  useEffect(() => {
    // Only add if no plants exist yet
    if (plantStore.plantList.length === 0) {
      plantStore.createPlant("Test Plant", { x: 0, y: 0, z: 0 }, 0x4a90d9);
    }
  }, []);

  return (
    <SplitView
      topPanel={<ElevationCanvas />}
      bottomPanel={<PlanCanvas />}
      initialSplitRatio={0.5}
      minTopHeight={150}
      minBottomHeight={150}
    />
  );
}
