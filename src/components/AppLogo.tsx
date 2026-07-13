/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface AppLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  theme?: 'light' | 'dark' | 'auto';
}

export default function AppLogo({ className = '', size = 'md', theme = 'auto' }: AppLogoProps) {
  // Height and width overrides based on requested styles
  let styleContainer: React.CSSProperties = {};
  let styleImage: React.CSSProperties = {};

  if (size === 'sm') {
    styleContainer = { width: '235px', height: '168px' };
    styleImage = { height: '230px', width: '170px', transform: 'scale(1.4)' };
  } else if (size === 'md') {
    styleContainer = { width: '240px', height: '192px' };
    styleImage = { height: '260px', width: '192px', transform: 'scale(1.4)' };
  } else if (size === 'lg') {
    styleContainer = { width: '350px', height: '350px' };
    styleImage = { height: '350px', width: '350px', transform: 'scale(1.4)' };
  }

  return (
    <div 
      className={`relative overflow-hidden shrink-0 flex items-center justify-center ${className}`} 
      style={styleContainer}
      id="app-logo-container"
    >
      <img 
        src="/logo.png" 
        alt="Opinión del Pueblo Logo" 
        className="object-contain select-none transform-gpu"
        style={styleImage}
        referrerPolicy="no-referrer"
        id="app-logo-image"
      />
    </div>
  );
}

