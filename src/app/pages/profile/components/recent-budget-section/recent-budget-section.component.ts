import { Component, OnInit, Input, ChangeDetectorRef, NgZone, AfterViewInit } from '@angular/core';
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
export class RecentBudgetSectionComponent implements OnInit, AfterViewInit {
  budgets: Budget[] = [];
  isExpanded: boolean = true;
  loading: boolean = false;
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
    this.loading = true;
    this.fetchBudgets();
  }

  ngAfterViewInit() {
    // Esperar un momento después de la carga para asegurar que los datos estén disponibles
    setTimeout(() => this.logBudgetData(), 1500);
  }

  // Debug function to log all budget information
  logBudgetData() {
    console.log('=== DEBUGGING BUDGET DATA ===');
    console.log(`Total budgets: ${this.budgets.length}`);
    
    this.budgets.forEach((budget, index) => {
      console.log(`\n--- Budget ${index + 1} ---`);
      console.log('ID:', budget.id);
      console.log('Budget Number:', budget.budgetNumber);
      console.log('Title:', budget.title);
      console.log('Creation Date:', budget.creationDate);
      console.log('Formatted Creation Date:', budget.creationDate instanceof Date ? 
        budget.creationDate.toLocaleDateString() : 'Invalid Date');
      console.log('Status:', budget.status);
      console.log('Departure Date:', budget.departureDate);
      console.log('Formatted Departure Date:', budget.departureDate instanceof Date ? 
        budget.departureDate.toLocaleDateString() : 'Invalid Date');
      console.log('Departure Name:', budget.departureName);
      console.log('Passengers:', budget.passengers);
      console.log('Price:', budget.price);
      console.log('Image URL:', budget.image);
      console.log('Tour ID:', budget.tourID || 'No Tour ID');
      console.log('---------------------------');
    });
    
    console.log('=== END BUDGET DATA ===');

    // Inspeccionar la estructura completa de los objetos
    console.log('Full Budget Objects:');
    console.log(JSON.stringify(this.budgets, null, 2));
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
        
        // Log del response para ver la estructura completa
        console.log('API Response:', response);
        console.log('Budget Orders:', budgetOrders);
        
        // Limpia el array antes de añadir nuevos presupuestos
        this.budgets = [];
        
        budgetOrders.forEach(order => {
          const periodId = order.periodID;
          if (periodId) {
            // Obtiene detalles del período asociado a la orden
            this.periodsService.getPeriodDetail(periodId, ['all']).subscribe(
              (periodData) => {
                console.log('Period Data for ID:', periodId, periodData);
                
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
                console.error('Error fetching period:', periodId, error);
                
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

        // Log después de procesar todos los presupuestos
        setTimeout(() => this.logBudgetData(), 2000);
      });

    this.loading = false;
  }

  // Crea un presupuesto base con los datos mínimos de la orden
  private createBaseBudget(order: any): Budget {
    console.log('Creating base budget from order:', order);
    
    // Usamos la función de depuración para obtener el número correcto de pasajeros
    const passengers = this.getPassengerCount(order);
    console.log(`Final passenger count for order ${order.id}: ${passengers}`);
    
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
  
  // Función de depuración específica para pasajeros
  private getPassengerCount(order: any): number {
    // Registramos la estructura exacta del objeto de viajeros
    console.log('DEBUG - Travelers data:', {
      travelersProperty: order.travelers,
      travelersType: typeof order.travelers,
      isArray: Array.isArray(order.travelers)
    });
    
    if (Array.isArray(order.travelers)) {
      // Si es un array, verificamos cada elemento
      console.log('DEBUG - Travelers array content:', JSON.stringify(order.travelers));
      
      // Filtramos posibles elementos nulos o inválidos
      const validTravelers = order.travelers.filter((traveler: any) => 
        traveler !== null && traveler !== undefined
      );
      
      console.log(`DEBUG - Valid travelers count: ${validTravelers.length}`);
      return validTravelers.length;
    } 
    else if (typeof order.travelers === 'number') {
      // Si es directamente un número
      console.log(`DEBUG - Travelers is a number: ${order.travelers}`);
      return order.travelers;
    }
    else if (order.numPassengers !== undefined) {
      console.log(`DEBUG - Using numPassengers: ${order.numPassengers}`);
      return Number(order.numPassengers) || 0;
    }
    else {
      // Si no hay información clara de viajeros
      console.log('DEBUG - No valid travelers data found');
      return 0;
    }
  }

  // Crea un presupuesto con datos adicionales del período
  private createBudgetWithPeriodData(order: any, periodData: any): Budget {
    console.log('Creating budget with period data:', order, periodData);
    
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
    console.log('Creating budget from order only:', order);
    return this.createBaseBudget(order);
  }

  // Carga la imagen y el precio real del tour asociado al presupuesto
  async loadBudgetImage(budget: Budget) {
    if (!budget.tourID) return;
    
    console.log('Loading image for budget with tourID:', budget.tourID);
    
    const tourData = await this.getTourData(budget.tourID);
    console.log('Tour data received:', tourData);
    
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
      console.log('Getting tour data with filters:', filters);
      
      this.toursService.getFilteredToursList(filters).subscribe({
        next: (tourData) => {
          console.log('Tour data response:', tourData);
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
          console.error('Error fetching tour data:', err);
          resolve({ image: null, price: null });
        },
      });
    });
  }

  // Carga las imágenes para todos los presupuestos
  loadTourImages() {
    console.log('Loading images for all budgets');
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
          console.error('Error fetching image:', err);
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
    console.log('View budget clicked:', budget);
  }
}