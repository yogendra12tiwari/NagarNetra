import React from "react";

export default function NagarNetraLogo({ size = 36, className = "" }) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-blue-500 p-0.5 shadow-md shadow-indigo-600/25 flex items-center justify-center overflow-hidden shrink-0 ${className}`}
    >
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full p-1 drop-shadow-xs"
      >
        {/* Eye contour representing "Netra" (City Vision) */}
        <path
          d="M3 18C7.5 9.5 13.5 6.5 18 6.5C22.5 6.5 28.5 9.5 33 18C28.5 26.5 22.5 29.5 18 29.5C13.5 29.5 7.5 26.5 3 18Z"
          stroke="white"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Vision Lens / Iris */}
        <circle
          cx="18"
          cy="18"
          r="6.5"
          fill="white"
          fillOpacity="0.22"
          stroke="white"
          strokeWidth="2"
        />

        {/* Road Perspective within Vision Pupil */}
        <path
          d="M15 22.8L17.2 16.5H18.8L21 22.8"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Road center marking line */}
        <line
          x1="18"
          y1="18"
          x2="18"
          y2="21.5"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* AI Camera focal highlight */}
        <circle cx="16" cy="14" r="1.3" fill="white" />
      </svg>
    </div>
  );
}
