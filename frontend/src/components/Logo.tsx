/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import logoUrl from '../assets/brand/back-to-eden-logo.png';
import markUrl from '/back-to-eden-mark.png';

interface LogoProps {
  /** Height utility classes. The emblem keeps its own aspect ratio. */
  className?: string;
  /** 'full' is the emblem with the wordmark; 'mark' is the tree roundel alone. */
  variant?: 'full' | 'mark';
}

/** Back To Eden brand emblem. */
export const Logo: React.FC<LogoProps> = ({ className = 'h-10 w-auto', variant = 'full' }) => (
  <img
    src={variant === 'mark' ? markUrl : logoUrl}
    alt="Back To Eden — Preventive Health, Nutrition, Wellness"
    className={`${className} object-contain select-none`}
    draggable={false}
  />
);
