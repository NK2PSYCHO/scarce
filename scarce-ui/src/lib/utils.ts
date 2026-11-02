/**
 * @packageDocumentation
 * Class-name helper for the shadcn components: merges conditional class names
 * with clsx, then resolves conflicting Tailwind classes with tailwind-merge.
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges conditional class names and resolves Tailwind class conflicts.
 *
 * @param inputs - Any mix of strings, arrays, or conditional objects accepted by clsx.
 * @returns A single deduplicated class string with Tailwind conflicts resolved.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
