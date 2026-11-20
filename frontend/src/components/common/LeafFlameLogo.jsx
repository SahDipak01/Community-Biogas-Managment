import React from 'react';

const LeafFlameLogo = ({ className = 'w-12 h-12', size }) => {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
      aria-label="Rural Community Biogas Logo"
    >
      <defs>
        {/* Outer Left Leaf Gradient */}
        <linearGradient id="logoLeafLeft" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#047857" />
          <stop offset="40%" stopColor="#059669" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>

        {/* Outer Right Leaf Gradient */}
        <linearGradient id="logoLeafRight" x1="100%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#047857" />
          <stop offset="40%" stopColor="#059669" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>

        {/* Inner Left Petal */}
        <linearGradient id="logoInnerLeft" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>

        {/* Inner Right Petal */}
        <linearGradient id="logoInnerRight" x1="100%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>

        {/* Main Blue Flame Gradient */}
        <linearGradient id="logoFlameMain" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#0284c7" />
          <stop offset="45%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>

        {/* Inner Flame Core Highlight */}
        <linearGradient id="logoFlameCore" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#e0f2fe" />
        </linearGradient>
      </defs>

      {/* Base Stem/Cradle */}
      <path
        d="M60 106 C50 106 44 100 42 94 C54 98 66 98 78 94 C76 100 70 106 60 106 Z"
        fill="#047857"
      />

      {/* Outer Left Major Leaf */}
      <path
        d="M60 102 C38 102 18 84 14 56 C12 40 20 25 28 18 C26 31 29 46 38 57 C45 66 53 74 60 102 Z"
        fill="url(#logoLeafLeft)"
      />

      {/* Outer Right Major Leaf */}
      <path
        d="M60 102 C82 102 102 84 106 56 C108 40 100 25 92 18 C94 31 91 46 82 57 C75 66 67 74 60 102 Z"
        fill="url(#logoLeafRight)"
      />

      {/* Inner Left Minor Leaf */}
      <path
        d="M60 98 C48 94 38 82 38 66 C38 52 45 38 50 28 C49 40 51 52 56 62 C58 66 60 84 60 98 Z"
        fill="url(#logoInnerLeft)"
      />

      {/* Inner Right Minor Leaf */}
      <path
        d="M60 98 C72 94 82 82 82 66 C82 52 75 38 70 28 C71 40 69 52 64 62 C62 66 60 84 60 98 Z"
        fill="url(#logoInnerRight)"
      />

      {/* Central Clean Biogas Flame Outer */}
      <path
        d="M60 22 C63 36 72 48 72 62 C72 76 66 88 60 90 C54 88 48 76 48 62 C48 48 57 36 60 22 Z"
        fill="url(#logoFlameMain)"
      />

      {/* Central Flame Core Inner Glow */}
      <path
        d="M60 42 C62 50 66 56 66 66 C66 74 63 80 60 82 C57 80 54 74 54 66 C54 56 58 50 60 42 Z"
        fill="url(#logoFlameCore)"
      />
    </svg>
  );
};

export default LeafFlameLogo;
