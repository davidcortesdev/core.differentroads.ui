import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { PeriodsService } from '../../../core/services/periods.service';
import { MessageService } from 'primeng/api';
import { catchError, of } from 'rxjs';
import { Activity } from '../../../core/models/tours/activity.model';
import { PriceData } from '../../../core/models/commons/price-data.model';
import { Booking } from '../../../core/models/bookings/booking.model';
import { Router } from '@angular/router';
import { BookingsService } from '../../../core/services/bookings.service';

interface BookingActivity {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  price: number;
  priceValue: number;
  isOptional: boolean;
  perPerson: boolean;
  isIncluded: boolean;
}

interface BookingActivityExtended extends BookingActivity {
  showPassengers?: boolean;
  selectedTravelers?: {
    id: string;
    selected: boolean;
    ageGroup: string;
    price: number;
  }[];
  addedManually?: boolean;
}

@Component({
  selector: 'app-booking-activities',
  templateUrl: './booking-activities.component.html',
  styleUrls: ['./booking-activities.component.scss'],
  standalone: false,
})
export class BookingActivitiesComponent implements OnInit {
  @Input() periodId!: string;
  @Input() booking!: Booking;
  @Input() bookingActivities: BookingActivity[] = [];
  @Output() addActivity = new EventEmitter<string>();

  fullActivities: Activity[] = [];
  availableActivities: BookingActivityExtended[] = [];
  pricesSource: {
    [key: string]: { priceData: PriceData[]; availability?: number };
  } = {};
  isLoading = false;

  constructor(
    private sanitizer: DomSanitizer,
    private periodsService: PeriodsService,
    private messageService: MessageService,
    private router: Router,
    private bookingsService: BookingsService
  ) {}

  ngOnInit(): void {
    console.log(this.bookingActivities);
    this.loadPeriodActivities(this.periodId);
  }

  toggleAddActivity(activityId: string): void {
    const activity = this.availableActivities.find(
      (act) => act.id === activityId
    );
    if (!activity) return;

    // Si ya fue añadida manualmente
    if (activity.addedManually) {
      // "Desañadir" la actividad
      activity.addedManually = false;
      activity.showPassengers = false;
      activity.selectedTravelers = [];
    } else {
      // Añadir la actividad
      activity.addedManually = true;
      activity.showPassengers = true;
      activity.selectedTravelers =
        this.booking.travelers?.map((traveler) => {
          const ageGroup = traveler.travelerData?.ageGroup || 'Adultos';
          const price = this.getPriceById(activity.id, ageGroup);

          return {
            id: traveler._id,
            selected: true,
            ageGroup,
            price,
          };
        }) || [];
    }
  }

  isActivityAdded(activity: BookingActivityExtended): boolean {
    if (activity.isIncluded && !activity.addedManually) {
      return true;
    }
    return false;
  }

  // Método para sanitizar y limpiar la descripción si contiene etiquetas HTML
  getSafeDescription(description: string): SafeHtml {
    if (!description) return '';

    // Si hay etiquetas HTML visibles como texto, reemplazarlas
    if (description.includes('<p') || description.includes('&lt;p')) {
      // Remover etiquetas visibles como texto
      const cleaned = description
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/<\/?[^>]+(>|$)/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      return this.sanitizer.bypassSecurityTrustHtml(cleaned);
    }

    // Si ya es HTML, sanitizarlo
    return this.sanitizer.bypassSecurityTrustHtml(description);
  }

  // Método para cargar actividades del período
  loadPeriodActivities(externalId: string): void {
    this.periodsService.getPeriodPrices(externalId).subscribe({
      next: (pricesData) => {
        this.pricesSource = pricesData;
        this.updatePrices();
      },
      error: (error) => {
        this.messageService.add({
          key: 'center',
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar la información del período',
          life: 3000,
        });
      },
    });

    this.periodsService
      .getActivities(externalId)
      .pipe(
        catchError((error) => {
          this.messageService.add({
            key: 'center',
            severity: 'warn',
            summary: 'Advertencia',
            detail: 'No se pudieron cargar las actividades disponibles',
            life: 3000,
          });
          return of([]);
        })
      )
      .subscribe((activities) => {
        console.log('_______', activities);
        console.log('__act_____', this.bookingActivities);

        this.fullActivities = activities.map((activity) => ({
          ...activity,
          priceData: this.pricesSource[activity.activityId]?.priceData || [],
          price: this.getPriceById(activity.activityId),
        }));

        // Convertir actividades de la API al formato del componente
        this.availableActivities = activities
          .map((activity: Activity, index: number) => {
            // Verificar si esta actividad ya está incluida en las actividades actuales
            const isAlreadyIncluded = this.bookingActivities.some(
              (bookingActivity) => bookingActivity.id === activity.activityId
            );

            /* 
            if (isAlreadyIncluded) {
              return null; // Para filtrar después
            } */

            // Extraer la URL de la imagen si existe
            let imageUrl = 'https://picsum.photos/400/200'; // Imagen predeterminada
            if (
              activity.activityImage &&
              activity.activityImage.length > 0 &&
              activity.activityImage[0].url
            ) {
              imageUrl = activity.activityImage[0].url;
            }

            return {
              id: `${activity.activityId}`,
              title: activity.name || `Actividad ${index + 1}`,
              description: activity.description || 'Sin descripción disponible',
              imageUrl: imageUrl,
              price: this.getPriceById(activity.activityId),
              priceValue: activity.price || 0,
              isOptional: true,
              perPerson: true, // Valor predeterminado ya que perPerson no está en Activity
              isIncluded: isAlreadyIncluded,
            };
          })
          .filter((activity) => activity !== null); // Filtrar las actividades que ya están incluidas
      });
  }

  updatePrices() {
    this.fullActivities = this.fullActivities.map((activity) => {
      const price = this.getPriceById(activity.activityId);
      return {
        ...activity,
        price: price,
        priceData: this.pricesSource[activity.activityId]?.priceData || [],
      };
    });

    this.availableActivities = this.availableActivities.map((activity) => {
      const price = this.getPriceById(activity.id);
      return {
        ...activity,
        price: price,
      };
    });
  }

  getPriceById(id: string, ageGroupName: string = 'Adultos'): number {
    const priceData = this.pricesSource[id]?.priceData;
    if (!priceData) return 0;
    if (ageGroupName) {
      return (
        priceData.find((price) => price.age_group_name === ageGroupName)
          ?.value || 0
      );
    }

    return priceData[0]?.value || 0;
  }

  onContinueActivity(activityId: string): void {
    console.log('Continuar con la actividad', activityId);

    const activity = this.availableActivities.find(
      (act) => act.id === activityId
    );
    if (!activity) return;

    // Obtener los IDs de los viajeros seleccionados
    const selectedTravelerIds =
      activity.selectedTravelers?.filter((t) => t.selected).map((t) => t.id) ||
      [];

    const fullActivity = this.fullActivities.find(
      (act) => act.activityId === activityId
    );

    this.isLoading = true; // Set loading state to true

    // Llamar al servicio para agregar la actividad opcional
    this.bookingsService
      .addOptionalActivities(
        this.booking._id,
        activityId,
        selectedTravelerIds,
        fullActivity!
      )
      .subscribe({
        next: () => {
          this.router.navigate([`/payment/${this.booking._id}`], {});
        },
        error: (error) => {
          this.isLoading = false; // Reset loading state on error
          this.messageService.add({
            key: 'center',
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo agregar la actividad opcional',
            life: 3000,
          });
        },
      });
  }

  getTravelerNameById(travelerId: string): string {
    const traveler = this.booking.travelers?.find((t) => t._id === travelerId);
    if (traveler) {
      const { name, surname } = traveler.travelerData || {};
      return `${name || ''} ${surname || ''}`.trim();
    }
    return 'Pasajero';
  }
}
