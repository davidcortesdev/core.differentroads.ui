import { Component, OnInit } from '@angular/core';

interface Budget {
  id: number;
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

  private getRandomPicsumUrl(): string {
    const randomId = Math.floor(Math.random() * 1000);
    return `https://picsum.photos/id/${randomId}/400/300`;
  }

  ngOnInit() {
    this.budgets = [
      {
        id: 1,
        title: '4 PERLAS BÁLTICAS',
        budgetNumber: '78560',
        creationDate: new Date('2025-03-28'),
        status: 'Budget',
        departureDate: new Date('2025-04-06'),
        passengers: 2,
        price: 3145,
        image: this.getRandomPicsumUrl(),
      },
    ];
  }

  toggleContent() {
    this.isExpanded = !this.isExpanded;
  }

  viewBudget(budget: Budget) {
    console.log('Reservar:', budget);
  }
}
