import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'currencyFormat',
})
export class CurrencyPipe implements PipeTransform {
  transform(value: number, currencyCode: string = 'EUR'): string {
    if (value == null) return '';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      useGrouping: true,
    }).format(value);
  }
}
