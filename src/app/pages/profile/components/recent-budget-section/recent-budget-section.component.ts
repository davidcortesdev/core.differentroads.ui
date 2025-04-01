import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataViewModule } from 'primeng/dataview';
import { ButtonModule } from 'primeng/button';
import { OrdersService } from '../../../../core/services/orders.service';

interface Budget {
  id: string;
  title: string;
  budgetNumber: string;
  creationDate: Date;
  status: string;
  departureDate: Date;
  passengers: number;
  price: number;
  image: string;
}

@Component({
  selector: 'app-recent-budget-section',
  standalone: false,
  templateUrl: './recent-budget-section.component.html',
  styleUrls: ['./recent-budget-section.component.scss'],
})
export class RecentBudgetSectionComponent implements OnInit {
  budgets: Budget[] = [];
  isExpanded: boolean = true;
  loading: boolean = false;
  @Input() userEmail!: string;

  constructor(private ordersService: OrdersService) {}

  private getRandomPicsumUrl(): string {
    const randomId = Math.floor(Math.random() * 1000);
    return `https://picsum.photos/id/${randomId}/400/300`;
  }

  ngOnInit() {
    this.loading = true;
    this.fetchBudgets();
  }

  fetchBudgets() {
    this.ordersService
      .getOrders({ status: ['Budget'], keyword: this.userEmail })
      .subscribe((response) => {
        this.budgets = response.data.map((order) => ({
          id: order.periodID,
          title: '4 PERLAS BALTICAS',
          budgetNumber: order.id || '',
          creationDate: new Date(order.createdAt || Date.now()),
          status: order.status,
          departureDate: new Date(order.updatedAt || Date.now()),
          passengers: order.travelers?.length || 0,
          price: 1100,
          image: this.getRandomPicsumUrl(),
        }));
      });

    this.loading = false;
  }

  toggleContent() {
    this.isExpanded = !this.isExpanded;
  }

  viewBudget(budget: Budget) {
    console.log('Reservar:', budget);
  }
}
