import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

interface TextsData {
  rooms?: { [key: string]: any };
  flights?: { [key: string]: any };
  insurances?: { [key: string]: any };
  activities?: { [key: string]: any };
  tour?: { [key: string]: any };
  period?: { [key: string]: any };
  [key: string]: { [key: string]: any } | undefined;
}

@Injectable({
  providedIn: 'root',
})
export class TextsService {
  private textsDataSource = new BehaviorSubject<TextsData>({});
  textsData$ = this.textsDataSource.asObservable();

  constructor() {}

  /**
   * Get the current texts data
   */
  getTextsData(): TextsData {
    return this.textsDataSource.getValue();
  }

  /**
   * Update texts data for a specific category and ID
   * @param category The category (e.g., 'rooms', 'flights')
   * @param id The ID of the item
   * @param data The data to store
   */
  updateText(category: string, id: string, data: any): void {
    const currentData = this.getTextsData();

    if (!currentData[category]) {
      currentData[category] = {};
    }

    currentData[category]![id] = data;
    this.textsDataSource.next(currentData);
  }

  /**
   * Get text data for a specific category and ID
   * @param category The category (e.g., 'rooms', 'flights')
   * @param id The ID of the item
   * @returns The stored data or null if not found
   */
  getText(category: string, id: string): any | null {
    const currentData = this.getTextsData();

    if (currentData[category] && currentData[category]![id]) {
      return currentData[category]![id];
    }

    return null;
  }

  /**
   * Update multiple texts for a specific category
   * @param category The category (e.g., 'rooms', 'flights')
   * @param textsMap Object with IDs as keys and data as values
   */
  updateTextsForCategory(
    category: string,
    textsMap: { [key: string]: any }
  ): void {
    const currentData = this.getTextsData();

    if (!currentData[category]) {
      currentData[category] = {};
    }

    currentData[category] = {
      ...currentData[category],
      ...textsMap,
    };

    this.textsDataSource.next(currentData);
  }

  /**
   * Get all texts for a specific category
   * @param category The category (e.g., 'rooms', 'flights')
   * @returns Object with all texts for the category or an empty object if none
   */
  getTextsForCategory(category: string): { [key: string]: any } {
    const currentData = this.getTextsData();
    return currentData[category] || {};
  }

  /**
   * Clear all stored text data
   */
  clearAll(): void {
    this.textsDataSource.next({});
  }

  /**
   * Clear texts for a specific category
   * @param category The category to clear
   */
  clearCategory(category: string): void {
    const currentData = this.getTextsData();
    if (currentData[category]) {
      delete currentData[category];
      this.textsDataSource.next(currentData);
    }
  }
}
