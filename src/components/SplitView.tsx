"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface SplitViewProps {
  topPanel: React.ReactNode;
  bottomPanel: React.ReactNode;
  initialSplitRatio?: number; // 0 to 1, default 0.5
  minTopHeight?: number; // minimum height in pixels
  minBottomHeight?: number; // minimum height in pixels
}

export default function SplitView({
  topPanel,
  bottomPanel,
  initialSplitRatio = 0.5,
  minTopHeight = 100,
  minBottomHeight = 100,
}: SplitViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [splitRatio, setSplitRatio] = useState(initialSplitRatio);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const containerHeight = containerRect.height;
      const mouseY = e.clientY - containerRect.top;

      // Calculate new ratio with constraints
      let newRatio = mouseY / containerHeight;

      // Apply min height constraints
      const minTopRatio = minTopHeight / containerHeight;
      const maxTopRatio = 1 - minBottomHeight / containerHeight;

      newRatio = Math.max(minTopRatio, Math.min(maxTopRatio, newRatio));

      setSplitRatio(newRatio);
    },
    [isDragging, minTopHeight, minBottomHeight]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={containerRef}
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {/* Top Panel (Elevation View) */}
      <div
        style={{
          height: `calc(${splitRatio * 100}% - 4px)`,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {topPanel}
      </div>

      {/* Divider */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          height: "8px",
          background: isDragging ? "#888" : "#444",
          cursor: "row-resize",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: isDragging ? "none" : "background 0.2s",
        }}
      >
        {/* Drag handle indicator */}
        <div
          style={{
            width: "40px",
            height: "4px",
            background: isDragging ? "#ccc" : "#666",
            borderRadius: "2px",
            transition: isDragging ? "none" : "background 0.2s",
          }}
        />
      </div>

      {/* Bottom Panel (Plan View) */}
      <div
        style={{
          height: `calc(${(1 - splitRatio) * 100}% - 4px)`,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {bottomPanel}
      </div>
    </div>
  );
}
