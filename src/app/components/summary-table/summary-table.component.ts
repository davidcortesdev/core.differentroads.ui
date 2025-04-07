import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageModule } from 'primeng/message';

export interface SummaryItem {
  description?: string;
  qty?: number;
  value?: number | null;
  isDiscount?: boolean;
}

@Component({
  selector: 'app-summary-table',
  standalone: false,
  templateUrl: './summary-table.component.html',
  styleUrls: ['./summary-table.component.scss']
})
export class SummaryTableComponent implements OnInit {
  @Input() summary: SummaryItem[] = [];
  @Input() currency: string = 'EUR';
  @Input() customClass: string = '';
  @Input() includedText: string = 'incluido';
  
  // Mapping properties
  @Input() descriptionField: string = 'description';
  @Input() qtyField: string = 'qty';
  @Input() valueField: string = 'value';
  @Input() isDiscountField: string = 'isDiscount';
  @Input() isDiscountFn: (item: any) => boolean = (item) => 
    item[this.isDiscountField] || 
    (item[this.descriptionField] && item[this.descriptionField].toLowerCase().includes('descuento'));
  
  // Display control
  @Input() showTitle: boolean = true;
  @Input() title: string = 'Resumen del pedido';
  @Input() showPointsSection: boolean = true;
  @Input() showTotalSection: boolean = true;
  @Input() showFlightSection: boolean = true;
  @Input() totalLabel: string = 'TOTAL';
  
  // Data for calculations
  @Input() subtotal: number = 0;
  @Input() total: number = 0;
  @Input() isAuthenticated: boolean = false;
  @Input() selectedFlight: any = null;

  constructor() { }

  ngOnInit(): void {
  }
  
  getDescription(item: any): string {
    return item[this.descriptionField] || '';
  }
  
  getQuantity(item: any): number {
    return item[this.qtyField] || 1;
  }
  
  getValue(item: any): number | undefined {
    return item[this.valueField] !== undefined ? item[this.valueField] : undefined;
  }
  
  isDiscount(item: any): boolean {
    return this.isDiscountFn(item);
  }
  
  calculateTotal(item: any): number {
    const qty = this.getQuantity(item);
    const value = this.getValue(item);
    return value !== null && value !== undefined ? value * qty : 0;
  }
}
