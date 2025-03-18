import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'sortBy',
  standalone: true,
})
export class SortByPipe implements PipeTransform {
  transform(array: any[], path: string): any[] {
    //console.log('Entrada del pipe:', array);
    //console.log('Path a ordenar:', path);

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

      //console.log('Comparando valores:');
      //console.log('A:', aValue, 'Type:', a.type);
      //console.log('B:', bValue, 'Type:', b.type);

      if (aValue === bValue) return 0;
      if (aValue === undefined) return 1;
      if (bValue === undefined) return -1;

      const result = aValue < bValue ? -1 : 1;
      //console.log('Resultado de la comparación:', result);

      return result;
    });

    //console.log('Lista ordenada:', sortedArray);
    return sortedArray;
  }
}
