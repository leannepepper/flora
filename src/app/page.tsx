import SplitView from "@/components/SplitView";
import ElevationCanvas from "@/components/ElevationCanvas";
import PlanCanvas from "@/components/PlanCanvas";

export default function Home() {
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
