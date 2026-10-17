import React from 'react';

interface ArcReactorProps {
  status: 'idle' | 'processing' | 'speaking' | 'listening';
  size?: number;
  interactive?: boolean;
  onClick?: () => void;
}

export const ArcReactor: React.FC<ArcReactorProps> = ({
  status,
  size = 140,
  interactive = false,
  onClick,
}) => {
  const isSpeaking = status === 'speaking';
  const isProcessing = status === 'processing';
  const isListening = status === 'listening';

  // Glow and color tints based on state
  const ringColor = isListening
    ? '#10b981' // emerald for listening
    : isProcessing
    ? '#f59e0b' // amber for computing
    : isSpeaking
    ? '#38bdf8' // bright sky blue for speaking
    : '#06b6d4'; // classic cyan for idle/ready

  const pulseSpeed = isSpeaking
    ? 'animate-pulse duration-500'
    : isProcessing
    ? 'animate-pulse duration-700'
    : isListening
    ? 'animate-pulse duration-1000'
    : 'animate-pulse duration-2000';

  return (
    <div
      onClick={interactive ? onClick : undefined}
      className={`relative flex items-center justify-center select-none ${
        interactive ? 'cursor-pointer group' : ''
      }`}
      style={{ width: size, height: size }}
      title={interactive ? 'Klikněte pro aktivaci hlasového subsystému' : undefined}
    >
      {/* Outer ambient glow */}
      <div
        className="absolute inset-0 rounded-full blur-xl opacity-40 transition-all duration-700 pointer-events-none"
        style={{
          backgroundColor: ringColor,
          transform: isSpeaking || isProcessing ? 'scale(1.2)' : 'scale(1.0)',
        }}
      />

      {/* SVG Arc Reactor concentric geometry */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        className="relative z-10 drop-shadow-[0_0_12px_rgba(6,182,212,0.5)]"
      >
        {/* Outer Ring */}
        <circle
          cx="100"
          cy="100"
          r="92"
          fill="none"
          stroke={ringColor}
          strokeWidth="1.5"
          strokeOpacity="0.4"
          strokeDasharray="4 6"
        />

        {/* Outer Rotating Segment Ring (Clockwise) */}
        <g
          className="origin-center"
          style={{
            animation: `spin ${isProcessing ? '4s' : '18s'} linear infinite`,
          }}
        >
          <circle
            cx="100"
            cy="100"
            r="82"
            fill="none"
            stroke={ringColor}
            strokeWidth="2.5"
            strokeDasharray="25 40 10 40"
            strokeOpacity="0.8"
          />
        </g>

        {/* Counter-rotating Segment Ring */}
        <g
          className="origin-center"
          style={{
            animation: `spin-reverse ${isProcessing ? '5s' : '24s'} linear infinite`,
          }}
        >
          <circle
            cx="100"
            cy="100"
            r="70"
            fill="none"
            stroke={ringColor}
            strokeWidth="1.5"
            strokeDasharray="8 16"
            strokeOpacity="0.6"
          />
        </g>

        {/* 10 Power Core Triangular Radiators */}
        {[...Array(10)].map((_, i) => {
          const angle = (i * 360) / 10;
          return (
            <g
              key={i}
              transform={`rotate(${angle} 100 100)`}
              className="transition-opacity duration-300"
              opacity={isSpeaking ? (i % 2 === 0 ? 0.9 : 0.5) : 0.75}
            >
              <rect
                x="96"
                y="36"
                width="8"
                height="16"
                rx="2"
                fill={ringColor}
                opacity="0.85"
              />
              <line
                x1="100"
                y1="52"
                x2="100"
                y2="64"
                stroke={ringColor}
                strokeWidth="1.5"
                opacity="0.5"
              />
            </g>
          );
        })}

        {/* Inner Reactor Ring */}
        <circle
          cx="100"
          cy="100"
          r="48"
          fill="rgba(5, 8, 15, 0.9)"
          stroke={ringColor}
          strokeWidth="2.5"
          strokeOpacity="0.9"
        />

        {/* Core Center Ring */}
        <circle
          cx="100"
          cy="100"
          r="32"
          fill="rgba(6, 182, 212, 0.15)"
          stroke={ringColor}
          strokeWidth="2"
        />

        {/* Center Triangular/Tri-node Arc Core */}
        <g
          className="origin-center"
          style={{
            animation: `spin ${isSpeaking ? '3s' : '12s'} linear infinite`,
          }}
        >
          <polygon
            points="100,74 122,112 78,112"
            fill="none"
            stroke={ringColor}
            strokeWidth="2"
            opacity="0.9"
          />
        </g>

        {/* Luminous Core Bulb */}
        <circle
          cx="100"
          cy="100"
          r={isSpeaking ? 16 : isProcessing ? 14 : 12}
          fill={ringColor}
          className={pulseSpeed}
          opacity="0.95"
          filter="url(#glow)"
        />

        {/* SVG Glow Filter Definition */}
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      {/* Embedded CSS animations for clean SVG rotation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  );
};
