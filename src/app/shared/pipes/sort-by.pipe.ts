import { Pipe, PipeTransform } from '@angular/core';

/**
 * SortByPipe
 * 
 * A custom Angular pipe that sorts an array of objects by a specified property path.
 * 
 * @example
 * // Sort users by name
 * <div *ngFor="let user of users | sortBy:'name'">
 *   {{ user.name }}
 * </div>
 * 
 * // Sort users by nested property (descending order)
 * <div *ngFor="let user of users | sortBy:'profile.age':true">
 *   {{ user.profile.age }}
 * </div>
 */
@Pipe({
  name: 'sortBy',
  standalone: true,
})
export class SortByPipe implements PipeTransform {
  /**
   * Transforms an array by sorting its elements based on a specified property path.
   * 
   * @param array - The array to sort
   * @param path - The property path to sort by (supports dot notation for nested properties)
   * @param descending - Whether to sort in descending order (default: false)
   * @returns The sorted array
   */
  transform(array: any[], path: string, descending: boolean = false): any[] {
    if (!Array.isArray(array) || !path) {
      return array;
    }

    // Check if the property exists in at least one item
    const propertyExists = array.some((item) => {
      const value = path.split('.').reduce((obj, key) => obj?.[key], item);
      return value !== undefined;
    });

    if (!propertyExists && array.length > 0) {
      console.warn(
        `SortByPipe: Property '${path}' not found in any array item. Check if the property name is correct.`
      );
    }

    const sortedArray = [...array].sort((a, b) => {
      const aValue = path.split('.').reduce((obj, key) => obj?.[key], a);
      const bValue = path.split('.').reduce((obj, key) => obj?.[key], b);

      if (aValue === bValue) return 0;
      if (aValue === undefined) return 1;
      if (bValue === undefined) return -1;

      let result = aValue < bValue ? -1 : 1;
      
      // If descending is true, invert the result
      if (descending) {
        result = -result;
      }

      return result;
    });

    return sortedArray;
  }
}