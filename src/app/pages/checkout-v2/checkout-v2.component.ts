import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TourNetService } from '../../core/services/tourNet.service';
import { ReservationService } from '../../core/services/reservation/reservation.service';
import { DepartureService } from '../../core/services/departure/departure.service';
import { MenuItem } from 'primeng/api';
import { SelectorRoomComponent } from './components/selector-room/selector-room.component';
import { SelectorTravelerComponent } from './components/selector-traveler/selector-traveler.component';

@Component({
  selector: 'app-checkout-v2',
  standalone: false,
  templateUrl: './checkout-v2.component.html',
  styleUrl: './checkout-v2.component.scss'
})
export class CheckoutV2Component implements OnInit {
  // Referencia al componente de habitaciones
  @ViewChild('roomSelector') roomSelector!: SelectorRoomComponent;
  @ViewChild('travelerSelector') travelerSelector!: SelectorTravelerComponent;

  // Datos del tour
  tourName: string = '';
  departureDate: string = '';
  returnDate: string = '';
  departureId: number | null = null;
  reservationId: number | null = null;
  totalAmount: number = 0;
  loading: boolean = false;
  error: string | null = null;

  // Variables adicionales para mostrar información completa
  tourId: number | null = null;
  totalPassengers: number = 0;

  // Steps configuration
  items: MenuItem[] = [];
  activeIndex: number = 0;

  // Tour slug para navegación
  tourSlug: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tourNetService: TourNetService,
    private reservationService: ReservationService,
    private departureService: DepartureService
  ) {}

  ngOnInit(): void {
    // Configurar los steps
    this.initializeSteps();

    // Obtener el reservationId de la URL
    this.route.paramMap.subscribe(params => {
      const reservationIdParam = params.get('reservationId');
      if (reservationIdParam) {
        this.reservationId = +reservationIdParam;
        
        console.log('🔍 CHECKOUT-V2 INICIADO');
        console.log('📋 Reservation ID desde URL:', this.reservationId);
        
        // Cargar datos de la reservación desde el backend
        this.loadReservationData(this.reservationId);
      } else {
        console.error('❌ No se encontró reservationId en la URL');
        this.error = 'No se proporcionó un ID de reservación válido';
      }
    });
  }

  // Inicializar los pasos del checkout
  private initializeSteps(): void {
    this.items = [
      {
        label: 'Personalizar viaje',
        command: () => this.onActiveIndexChange(0)
      },
      {
        label: 'Vuelos',
        command: () => this.onActiveIndexChange(1)
      },
      {
        label: 'Viajeros',
        command: () => this.onActiveIndexChange(2)
      },
      {
        label: 'Pago',
        command: () => this.onActiveIndexChange(3)
      }
    ];
  }

  // Método para cargar datos de la reservación
  private loadReservationData(reservationId: number): void {
    this.loading = true;
    this.error = null;
    
    console.log('🔄 Cargando datos de la reservación ID:', reservationId);
    
    this.reservationService.getById(reservationId).subscribe({
      next: (reservation) => {
        console.log('✅ Datos de reservación cargados:', reservation);
        
        // Extraer datos de la reservación
        this.departureId = reservation.departureId;
        this.totalAmount = reservation.totalAmount;
        this.tourId = reservation.tourId;
        this.totalPassengers = reservation.totalPassengers;
        
        console.log('📊 Datos extraídos de la reservación:');
        console.log('  - Tour ID:', reservation.tourId);
        console.log('  - Departure ID:', reservation.departureId);
        console.log('  - Total Passengers:', reservation.totalPassengers);
        console.log('  - Total Amount:', reservation.totalAmount);
        
        // Cargar datos del tour usando reservation.tourId
        this.loadTourData(reservation.tourId);
        
        // Cargar datos del departure usando reservation.departureId
        this.loadDepartureData(reservation.departureId);
      },
      error: (error) => {
        console.error('❌ Error al cargar los datos de la reservación:', error);
        this.error = 'Error al cargar los datos de la reservación. Por favor, inténtalo de nuevo más tarde.';
        this.loading = false;
      }
    });
  }

  // Método para cargar datos del tour
  private loadTourData(tourId: number): void {
    console.log('🔄 Cargando datos del tour ID:', tourId);
    
    this.tourNetService.getTourById(tourId).subscribe({
      next: (tour) => {
        console.log('✅ Datos del tour cargados:', tour);
        
        this.tourName = tour.name || '';
        this.tourSlug = this.generateTourSlug(this.tourName);
        
        console.log('📝 Datos del tour procesados:');
        console.log('  - Tour Name:', this.tourName);
        console.log('  - Tour Slug:', this.tourSlug);
        
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Error al cargar los datos del tour:', error);
        this.error = 'Error al cargar los datos del tour. Por favor, inténtalo de nuevo más tarde.';
        this.loading = false;
      }
    });
  }

  // Método para cargar datos del departure
  private loadDepartureData(departureId: number): void {
    console.log('🔄 Cargando datos del departure ID:', departureId);
    
    this.departureService.getById(departureId).subscribe({
      next: (departure) => {
        console.log('✅ Datos del departure cargados:', departure);
        
        this.departureDate = departure.departureDate;
        this.returnDate = departure.arrivalDate;
        
        console.log('📅 Fechas del departure procesadas:');
        console.log('  - Departure Date:', this.departureDate);
        console.log('  - Return Date:', this.returnDate);
      },
      error: (error) => {
        console.error('❌ Error al cargar los datos del departure:', error);
        console.warn('⚠️ Continuando sin fechas del departure');
      }
    });
  }

  // ============ NUEVO: MÉTODO PARA COMUNICACIÓN ENTRE COMPONENTES ============

  /**
   * Método llamado cuando cambian los números de viajeros en el selector de travelers
   * Este método actualiza el componente de habitaciones con los nuevos números
   */
  onTravelersNumbersChange(travelersNumbers: { adults: number; childs: number; babies: number }): void {
    console.log('👥 Números de viajeros cambiados en el componente padre:', travelersNumbers);
    
    // Actualizar el total de pasajeros
    this.totalPassengers = travelersNumbers.adults + travelersNumbers.childs + travelersNumbers.babies;
    
    // Comunicar el cambio al componente de habitaciones
    if (this.roomSelector) {
      this.roomSelector.updateTravelersNumbers(travelersNumbers);
    }
    
    // Log para debugging
    console.log('📊 Total pasajeros actualizado:', this.totalPassengers);
  }

  // ============ MÉTODOS EXISTENTES ============

  // Método para formatear la fecha
  formatDate(dateString: string): string {
    if (!dateString) return '';
    
    try {
      const dateParts = dateString.split('-'); // Ejemplo: "2025-07-23" -> ["2025", "07", "23"]
      
      if (dateParts.length !== 3) return dateString;
      
      const year = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]) - 1; // Los meses en JS van de 0-11
      const day = parseInt(dateParts[2]);
      
      // Crear fecha SIN zona horaria para evitar cambios de día
      const date = new Date(year, month, day);
      
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  }

  // Generar fechas formateadas para el subtítulo
  get tourDates(): string {
    if (!this.departureDate && !this.returnDate) return '';
    
    const departure = this.formatDate(this.departureDate);
    const returnFormatted = this.formatDate(this.returnDate);
    
    if (departure && returnFormatted) {
      return `${departure} - ${returnFormatted}`;
    } else if (departure) {
      return `Salida: ${departure}`;
    } else if (returnFormatted) {
      return `Regreso: ${returnFormatted}`;
    }
    
    return '';
  }

  // Generar slug del tour para navegación
  private generateTourSlug(tourName: string): string {
    if (!tourName) return '';
    
    return tourName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // Manejar cambio de paso activo
  onActiveIndexChange(index: number): void {
    this.activeIndex = index;
    console.log('Paso activo cambiado a:', index);
  }

  // Método para navegar al siguiente paso con validación
  async nextStepWithValidation(targetStep: number): Promise<void> {
    // NUEVO: Guardar cambios de travelers y habitaciones antes de continuar
    if (targetStep === 1 && this.travelerSelector && this.roomSelector) {
      let canContinue = true;

      // 1. Guardar cambios de travelers si hay pendientes
      if (this.travelerSelector.hasUnsavedChanges) {
        console.log('💾 Guardando cambios de travelers antes de continuar...');
        this.travelerSelector.saveTravelersChanges();
        
        // Esperar más tiempo para que se complete la sincronización
        console.log('⏳ Esperando sincronización de travelers...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // 2. Recargar travelers en el componente de habitaciones
      console.log('🔄 Recargando travelers en componente de habitaciones...');
      if (this.reservationId) {
        await this.roomSelector.loadExistingTravelers();
        // Esperar un momento adicional
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // 3. Verificar que hay habitaciones seleccionadas
      const hasSelectedRooms = Object.values(this.roomSelector.selectedRooms).some((qty: number) => qty > 0);
      if (!hasSelectedRooms) {
        console.warn('⚠️ No hay habitaciones seleccionadas');
        alert('Por favor, selecciona al menos una habitación antes de continuar.');
        canContinue = false;
      }

      // 4. Guardar asignaciones de habitaciones
      if (canContinue) {
        console.log('🏠 Guardando asignaciones de habitaciones...');
        const roomsSaved = await this.roomSelector.saveRoomAssignments();
        
        if (!roomsSaved) {
          console.error('❌ Error al guardar asignaciones de habitaciones');
          alert('Hubo un error al guardar las asignaciones de habitaciones. Por favor, inténtalo de nuevo.');
          canContinue = false;
        } else {
          console.log('✅ Asignaciones de habitaciones guardadas exitosamente');
          console.log('📋 Resumen:', this.roomSelector.getAssignmentsSummary());
        }
      }

      if (!canContinue) {
        return; // No continuar al siguiente paso
      }
    }

    console.log('Navegando al paso:', targetStep);
    this.onActiveIndexChange(targetStep);
  }
}