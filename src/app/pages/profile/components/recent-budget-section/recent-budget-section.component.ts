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
  tourID?: string; // Add tourID to store the tour identifier
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
    private toursService: ToursService, // Add ToursService
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  private getRandomPicsumUrl(): string {
    const randomId = Math.floor(Math.random() * 1000);
    return `https://picsum.photos/id/${randomId}/400/300`;
  }

  ngOnInit() {
    this.fetchBudgets();
  }

  // Método para formatear la fecha mostrando el día y las 3 primeras letras del mes
  formatShortDate(date: Date): string {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return 'Fecha no disponible';
    }
    
    // Obtener el día como número
    const day = date.getDate();
    
    // Obtener el mes en español y tomar las 3 primeras letras
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const month = monthNames[date.getMonth()];
    
    // Devolver el formato día + primeras 3 letras del mes
    return `${day} ${month}`;
  }

  fetchBudgets() {
    this.ordersService
      .getOrdersByUser(this.userEmail)
      .subscribe((response) => {
        console.log('Órdenes recibidas:', response.data);
        
        // Filtrar los presupuestos
        const budgetOrders = response.data.filter(order => order.status === 'Budget');
        console.log('Presupuestos filtrados:', budgetOrders);
        
        // Limpiar budgets antes de añadir nuevos
        this.budgets = [];
        
        budgetOrders.forEach(order => {
          const periodId = order.periodID;
          if (periodId) {
            // Obtener detalles del período
            this.periodsService.getPeriodDetail(periodId, ['all']).subscribe(
              (periodData) => {
                console.log(`Detalles del período ${periodId}:`, periodData);
                
                // Crear el objeto de presupuesto con los datos del período
                const budget = this.createBudgetWithPeriodData(order, periodData);
                
                // Ejecutar dentro de NgZone para asegurar la detección de cambios
                this.ngZone.run(() => {
                  this.budgets.push(budget);
                  this.budgets = [...this.budgets]; // Crear nueva referencia para forzar actualización
                  this.budgets.sort((a, b) => b.creationDate.getTime() - a.creationDate.getTime());
                  this.cdr.detectChanges(); // Forzar detección de cambios
                  
                  // Cargar la imagen del tour después de agregar el presupuesto
                  if (budget.tourID) {
                    this.loadBudgetImage(budget);
                  }
                });
              },
              (error) => {
                console.error(`Error al obtener detalles del período ${periodId}:`, error);
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
            // Si no hay ID de período, crear presupuesto solo con datos de la orden
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

  // Método base para crear un presupuesto
  private createBaseBudget(order: any): Budget {
    // Calcular el número de pasajeros basado en la cantidad de travelers
    const passengers = Array.isArray(order.travelers) ? order.travelers.length : 1;
    
    return {
      id: order.periodID || '',
      title: 'Sin información del tour', // Título genérico hasta obtener el nombre del tour
      budgetNumber: order.id || '',
      creationDate: new Date(order.createdAt || Date.now()),
      status: order.status,
      departureName: '', 
      departureDate: new Date(order.createdAt || Date.now()),
      passengers: passengers,
      price: 0, // Inicializar a 0, se actualizará con el precio real del tour
      image: this.getRandomPicsumUrl(), // Imagen temporal hasta cargar la real
      tourID: '' // Inicializar tourID vacío
    };
  }

  // Método para crear un objeto Budget con datos del período
  private createBudgetWithPeriodData(order: any, periodData: any): Budget {
    // Crear presupuesto base
    const budget = this.createBaseBudget(order);
    
    // Actualizar con datos específicos del período
    if (periodData) {
      // Obtener título del tour desde los datos del período (tourName)
      if (periodData.tourName) {
        budget.title = periodData.tourName;
      }
      
      // Obtener fecha de salida desde dayOne
      if (periodData.dayOne) {
        // Fix for date timezone issue - ensure we preserve the exact date
        const dateStr = periodData.dayOne;
        // Parse the date and adjust for timezone
        const dateParts = dateStr.split('T')[0].split('-');
        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1; // Months are 0-indexed in JS
        const day = parseInt(dateParts[2]);
        
        // Create date with local timezone to prevent day shift
        budget.departureDate = new Date(year, month, day);
        
        // Formatear directamente la fecha para departureName
        budget.departureName = this.formatShortDate(budget.departureDate);
      }
      
      // Guardar el ID del tour para cargar la imagen
      if (periodData.tourID) {
        budget.tourID = periodData.tourID;
      }
    }
    
    return budget;
  }

  // Método para crear un objeto Budget solo con datos de la orden
  private createBudgetFromOrder(order: any): Budget {
    // Simplemente usa el método base
    return this.createBaseBudget(order);
  }

  // Nuevo método para cargar la imagen y el precio del tour
  async loadBudgetImage(budget: Budget) {
    if (!budget.tourID) return;
    
    console.log(`Cargando datos para tour ID: ${budget.tourID}, precio actual: ${budget.price}`);
    
    const tourData = await this.getTourData(budget.tourID);
    if (tourData.image && tourData.image.url) {
      budget.image = tourData.image.url; // Actualizamos la URL de la imagen
      console.log(`Imagen actualizada para tour ${budget.tourID}:`, budget.image);
    }
    
    if (tourData.price !== null && tourData.price !== undefined) {
      const oldPrice = budget.price;
      budget.price = tourData.price; // Actualizamos el precio con el valor real
      console.log(`Precio actualizado para tour ${budget.tourID}: ${oldPrice} -> ${budget.price}`);
    } else {
      console.log(`No se pudo obtener el precio para tour ${budget.tourID}`);
    }
    
    this.cdr.detectChanges(); // Forzar la detección de cambios
  }

  // Método para obtener la imagen y el precio del tour
  getTourData(id: string): Promise<{ image: CldImage | null, price: number | null }> {
    return new Promise((resolve) => {
      const filters = {
        externalID: id,
      };
      this.toursService.getFilteredToursList(filters).subscribe({
        next: (tourData) => {
          if (tourData && tourData.data && tourData.data.length > 0) {
            const tour = tourData.data[0];
            const result = {
              image: tour.image && tour.image.length > 0 ? tour.image[0] : null,
              price: tour.price || null
            };
            console.log(`Datos del tour ${id}:`, result);
            resolve(result);
          } else {
            console.log('No tour data available for tour:', id);
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

  // Método para cargar todas las imágenes de los presupuestos
  loadTourImages() {
    this.budgets.forEach(budget => {
      if (budget.tourID) {
        this.loadBudgetImage(budget);
      }
    });
  }

  // Método para obtener la imagen del tour
  getImage(id: string): Promise<CldImage | null> {
    return new Promise((resolve) => {
      const filters = {
        externalID: id,
      };
      this.toursService.getFilteredToursList(filters).subscribe({
        next: (tourData) => {
          if (
            tourData &&
            tourData.data &&
            tourData.data.length > 0 &&
            tourData.data[0].image &&
            tourData.data[0].image.length > 0
          ) {
            resolve(tourData.data[0].image[0]);
          } else {
            console.log('No image data available for tour:', id);
            resolve(null);
          }
        },
        error: (err) => {
          console.error('Error fetching tour image:', err);
          resolve(null);
        },
      });
    });
  }

  toggleContent() {
    this.isExpanded = !this.isExpanded;
  }

  viewBudget(budget: Budget) {
    console.log('Reservar:', budget);
  }
}