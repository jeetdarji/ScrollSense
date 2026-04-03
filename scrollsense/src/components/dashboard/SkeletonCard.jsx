import React from 'react';

export default function SkeletonCard({ lines = 4, showChart = false }) {
  const widths = ['100%', '75%', '50%', '66%', '40%', '80%'];
  const bars = ['40%', '60%', '35%', '75%', '45%', '65%', '80%'];

  return (
    <div className="w-full">
      {showChart && (
        <div className="flex items-end gap-2 h-32 mb-4">
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 bg-[#27272A] animate-pulse rounded-none"
              style={{ height: h }}
            />
          ))}
        </div>
      )}
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 bg-[#27272A] animate-pulse mb-3 rounded-none"
          style={{ width: widths[i % widths.length] }}
        />
      ))}
    </div>
  );
}