import React from 'react';

/**
 * Technical Grid: A subtle background pattern inspired by construction layout grids.
 */
export const ConstructionGrid = ({ className = "" }: { className?: string }) => (
  <div className={`absolute inset-0 pointer-events-none opacity-[0.03] overflow-hidden ${className}`} style={{ zIndex: 0 }}>
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="smallGrid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
        </pattern>
        <pattern id="largeGrid" width="200" height="200" patternUnits="userSpaceOnUse">
          <rect width="200" height="200" fill="url(#smallGrid)" />
          <path d="M 200 0 L 0 0 0 200" fill="none" stroke="currentColor" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#largeGrid)" />
      
      {/* Abstract measurement lines */}
      <line x1="10%" y1="0" x2="10%" y2="100%" stroke="currentColor" strokeWidth="0.2" strokeDasharray="5,5" />
      <line x1="90%" y1="0" x2="90%" y2="100%" stroke="currentColor" strokeWidth="0.2" strokeDasharray="5,5" />
      <line x1="0" y1="30%" x2="100%" y2="30%" stroke="currentColor" strokeWidth="0.2" strokeDasharray="10,5" />
    </svg>
  </div>
);

/**
 * Skeletal Building Frame: A decorative SVG sketch of a modern cantilevered structure.
 */
export const SkeletalFrame = ({ className = "" }: { className?: string }) => (
  <svg 
    viewBox="0 0 400 400" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={`opacity-[0.07] text-architect-coal ${className}`}
  >
    {/* Foundation & Ground Plane */}
    <line x1="50" y1="350" x2="350" y2="350" stroke="currentColor" strokeWidth="1" />
    
    {/* Main Vertical Trusses */}
    <rect x="100" y="100" width="10" height="250" fill="currentColor" opacity="0.5" />
    <rect x="250" y="150" width="10" height="200" fill="currentColor" opacity="0.3" />
    
    {/* Cantilevered Slabs */}
    <path d="M 80 120 L 320 120 L 310 140 L 90 140 Z" fill="currentColor" opacity="0.1" />
    <path d="M 80 200 L 370 200 L 360 220 L 90 220 Z" fill="currentColor" opacity="0.1" />
    <path d="M 80 280 L 320 280 L 310 300 L 90 300 Z" fill="currentColor" opacity="0.1" />
    
    {/* Bracing */}
    <line x1="110" y1="100" x2="250" y2="150" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2,2" />
    <line x1="110" y1="350" x2="250" y2="280" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2,2" />
    
    {/* Measurement Symbols */}
    <circle cx="105" cy="100" r="3" stroke="currentColor" strokeWidth="0.5" fill="none" />
    <circle cx="370" cy="200" r="3" stroke="currentColor" strokeWidth="0.5" fill="none" />
  </svg>
);

/**
 * Crane Motif: Subtle abstract representation of site machinery
 */
export const CraneMotif = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full opacity-[0.05] text-olive-primary">
    <path d="M 20 90 L 20 20 L 80 20" stroke="currentColor" strokeWidth="1" fill="none" />
    <line x1="20" y1="20" x2="15" y2="15" stroke="currentColor" strokeWidth="1" />
    <line x1="80" y1="20" x2="80" y2="40" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1,1" />
    <rect x="18" y="85" width="4" height="2" fill="currentColor" />
  </svg>
);
