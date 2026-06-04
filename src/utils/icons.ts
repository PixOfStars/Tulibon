/**
 * Dynamic Phosphor icon mapping for plugins
 * Allows rendering icons by name string instead of importing each individually
 */
import React from 'react';
import * as PhosphorIcons from '@phosphor-icons/react';

/**
 * Get a Phosphor icon component by its name
 * @param iconName - Name of the icon (e.g., "Clock", "MagnifyingGlass", "Folders")
 * @param size - Icon size (default: 16)
 * @param weight - Icon weight (default: "bold")
 * @returns React component or null if icon not found
 */
export function getPhosphorIcon(
  iconName: string,
  size: number = 16,
  weight: 'bold' | 'regular' | 'thin' | 'light' | 'fill' | 'duotone' = 'bold',
): React.ReactElement | null {
  const iconComponent = (PhosphorIcons as Record<string, any>)[iconName];
  
  if (!iconComponent) {
    console.warn(`Phosphor icon not found: ${iconName}, falling back to PuzzlePiece`);
    return React.createElement(PhosphorIcons.PuzzlePiece, { size, weight });
  }

  return React.createElement(iconComponent, { size, weight });
}
