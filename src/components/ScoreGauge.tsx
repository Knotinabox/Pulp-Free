import React, { useEffect, useState } from 'react';

interface ScoreGaugeProps {
  score: number;
}

export default function ScoreGauge({ score }: ScoreGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    // Trigger animation slightly after mount for visual effect
    const timeout = setTimeout(() => setAnimatedScore(score), 100);
    return () => clearTimeout(timeout);
  }, [score]);

  // Determine colors based on inverted logic (0 = good, 100 = bad)
  let colorClass = "text-lime-500";
  let strokeClass = "stroke-lime-500";
  let dropShadow = "drop-shadow-[0_0_8px_rgba(132,204,22,0.6)]";
  let label = "Low Pulp";

  if (score > 75) {
    colorClass = "text-red-500";
    strokeClass = "stroke-red-500";
    dropShadow = "drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]";
    label = "Lemon / High Pulp";
  } else if (score > 45) {
    colorClass = "text-orange-500";
    strokeClass = "stroke-orange-500";
    dropShadow = "drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]";
    label = "High Pulp";
  } else if (score > 20) {
    colorClass = "text-yellow-500";
    strokeClass = "stroke-yellow-500";
    dropShadow = "drop-shadow-[0_0_8px_rgba(234,179,8,0.6)]";
    label = "Moderate Pulp";
  }

  // SVG dimensions
  const size = 200;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  
  // Circumference of a half circle is PI * radius
  const circumference = Math.PI * radius;
  // Dash offset calculations
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center relative my-6">
      <div className="relative" style={{ width: size, height: size / 2 + strokeWidth / 2 }}>
        <svg
          width={size}
          height={size / 2 + strokeWidth / 2}
          className="overflow-visible"
        >
          {/* Background Track */}
          <path
            d={`M ${strokeWidth/2} ${cy} A ${radius} ${radius} 0 0 1 ${size - strokeWidth/2} ${cy}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-zinc-800"
            strokeLinecap="round"
          />
          
          {/* Progress Track */}
          <path
            d={`M ${strokeWidth/2} ${cy} A ${radius} ${radius} 0 0 1 ${size - strokeWidth/2} ${cy}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={`${strokeClass} ${dropShadow} transition-all duration-1000 ease-out`}
          />
        </svg>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <span className={`text-6xl font-black tracking-tighter ${colorClass}`}>
            {score}
          </span>
        </div>
      </div>
      <span className={`mt-3 text-sm font-bold uppercase tracking-widest ${colorClass}`}>
        {label}
      </span>
    </div>
  );
}
