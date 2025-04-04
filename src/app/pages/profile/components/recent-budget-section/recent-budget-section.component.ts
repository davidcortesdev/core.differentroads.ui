import { Component, OnInit, Input, ChangeDetectorRef, NgZone } from '@angular/core';
import { OrdersService } from '../../../../core/services/orders.service';
import { PeriodsService } from '../../../../core/services/periods.service';
import { ToursService } from '../../../../core/services/tours.service';
import { CldImage } from '../../../../core/models/commons/cld-image.model';

interface Budget {
  id: string;
  title: string;
  budgetNumber: string;
  creationDate: Date;
  status: string;
  departureDate: Date;
  departureName: string;
  passengers: number;
  price: number;
  image: string;
  tourID?: string; // Almacena el identificador del tour para obtener más datos
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
  @Input() userEmail!: string;

  constructor(
    private ordersService: OrdersService,
    private periodsService: PeriodsService,
    private toursService: ToursService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  // Genera una URL aleatoria de Picsum como imagen temporal
  private getRandomPicsumUrl(): string {
    const randomId = Math.floor(Math.random() * 1000);
    return `https://picsum.photos/id/${randomId}/400/300`;
  }

  ngOnInit() {
    this.fetchBudgets();
  }

  // Formatea la fecha mostrando el día y las 3 primeras letras del mes en español
  formatShortDate(date: Date): string {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return 'Fecha no disponible';
    }
    
    const day = date.getDate();
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const month = monthNames[date.getMonth()];
    
    return `${day} ${month}`;
  }

  // Obtiene los presupuestos del usuario
  fetchBudgets() {
    this.ordersService
      .getOrdersByUser(this.userEmail)
      .subscribe((response) => {
        // Filtra solo las órdenes con estado 'Budget'
        const budgetOrders = response.data.filter(order => order.status === 'Budget');
        
        // Limpia el array antes de añadir nuevos presupuestos
        this.budgets = [];
        
        budgetOrders.forEach(order => {
          const periodId = order.periodID;
          if (periodId) {
            // Obtiene detalles del período asociado a la orden
            this.periodsService.getPeriodDetail(periodId, ['all']).subscribe(
              (periodData) => {
                // Crea el presupuesto con los datos del período
                const budget = this.createBudgetWithPeriodData(order, periodData);
                
                this.ngZone.run(() => {
                  this.budgets.push(budget);
                  this.budgets = [...this.budgets]; // Nueva referencia para forzar actualización
                  this.budgets.sort((a, b) => b.creationDate.getTime() - a.creationDate.getTime());
                  this.cdr.detectChanges();
                  
                  // Carga la imagen del tour si existe
                  if (budget.tourID) {
                    this.loadBudgetImage(budget);
                  }
                });
              },
              (error) => {
                // En caso de error al obtener el período, crea presupuesto solo con datos de la orden
                const budget = this.createBudgetFromOrder(order);
                
                this.ngZone.run(() => {
                  this.budgets.push(budget);
                  this.budgets = [...this.budgets];
                  this.budgets.sort((a, b) => b.creationDate.getTime() - a.creationDate.getTime());
                  this.cdr.detectChanges();
                });
              }
            );
          } else {
            // Si no hay ID de período, crea presupuesto solo con datos de la orden
            const budget = this.createBudgetFromOrder(order);
            
            this.ngZone.run(() => {
              this.budgets.push(budget);
              this.budgets = [...this.budgets];
              this.budgets.sort((a, b) => b.creationDate.getTime() - a.creationDate.getTime());
              this.cdr.detectChanges();
            });
          }
        });
      });
  }

  // Crea un presupuesto base con los datos mínimos de la orden
  private createBaseBudget(order: any): Budget {
    const passengers = Array.isArray(order.travelers) ? order.travelers.length : 1;
    
    return {
      id: order.periodID || '',
      title: 'Sin información del tour',
      budgetNumber: order.id || '',
      creationDate: new Date(order.createdAt || Date.now()),
      status: order.status,
      departureName: '', 
      departureDate: new Date(order.createdAt || Date.now()),
      passengers: passengers,
      price: 0,
      image: this.getRandomPicsumUrl(),
      tourID: ''
    };
  }

  // Crea un presupuesto con datos adicionales del período
  private createBudgetWithPeriodData(order: any, periodData: any): Budget {
    const budget = this.createBaseBudget(order);
    
    if (periodData) {
      if (periodData.tourName) {
        budget.title = periodData.tourName;
      }
      
      if (periodData.dayOne) {
        const dateStr = periodData.dayOne;
        const dateParts = dateStr.split('T')[0].split('-');
        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1;
        const day = parseInt(dateParts[2]);
        
        budget.departureDate = new Date(year, month, day);
        budget.departureName = this.formatShortDate(budget.departureDate);
      }
      
      if (periodData.tourID) {
        budget.tourID = periodData.tourID;
      }
    }
    
    return budget;
  }

  // Crea un presupuesto solo con datos de la orden (cuando no hay período)
  private createBudgetFromOrder(order: any): Budget {
    return this.createBaseBudget(order);
  }

  // Carga la imagen y el precio real del tour asociado al presupuesto
  async loadBudgetImage(budget: Budget) {
    if (!budget.tourID) return;
    
    const tourData = await this.getTourData(budget.tourID);
    if (tourData.image && tourData.image.url) {
      budget.image = tourData.image.url;
    }
    
    if (tourData.price !== null && tourData.price !== undefined) {
      budget.price = tourData.price;
    }
    
    this.cdr.detectChanges();
  }

  // Obtiene los datos del tour (imagen y precio)
  getTourData(id: string): Promise<{ image: CldImage | null, price: number | null }> {
    return new Promise((resolve) => {
      const filters = {
        externalID: id,
      };
      this.toursService.getFilteredToursList(filters).subscribe({
        next: (tourData) => {
          if (tourData && tourData.data && tourData.data.length > 0) {
            const tour = tourData.data[0];
            resolve({
              image: tour.image && tour.image.length > 0 ? tour.image[0] : null,
              price: tour.price || null
            });
          } else {
            resolve({ image: null, price: null });
          }
        },
        error: (err) => {
          resolve({ image: null, price: null });
        },
      });
    });
  }

  // Carga las imágenes para todos los presupuestos
  loadTourImages() {
    this.budgets.forEach(budget => {
      if (budget.tourID) {
        this.loadBudgetImage(budget);
      }
    });
  }

  // Obtiene la imagen de un tour específico
  getImage(id: string): Promise<CldImage | null> {
    return new Promise((resolve) => {
      const filters = {
        externalID: id,
      };
      this.toursService.getFilteredToursList(filters).subscribe({
        next: (tourData) => {
          if (tourData?.data?.[0]?.image?.[0]) {
            resolve(tourData.data[0].image[0]);
          } else {
            resolve(null);
          }
        },
        error: (err) => {
          resolve(null);
        },
      });
    });
  }

  // Alternar la vista expandida/contraída
  toggleContent() {
    this.isExpanded = !this.isExpanded;
  }

  // Manejar la acción de ver un presupuesto
  viewBudget(budget: Budget) {
    // Lógica para ver el presupuesto
  }
}