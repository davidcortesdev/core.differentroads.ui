import { Component, OnInit, OnDestroy } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { ToursService } from '../../../../core/services/tours.service';
import { Tour } from '../../../../core/models/tours/tour.model';
import { Subscription } from 'rxjs';
import { InfoCard } from '../tour-info-accordion/tour-info-accordion.component';

@Component({
  selector: 'app-tour-additional-info',
  standalone: false,
  templateUrl: './tour-additional-info.component.html',
  styleUrl: './tour-additional-info.component.scss',
})
export class TourAdditionalInfoComponent implements OnInit, OnDestroy {
  tour: Tour | null = null;
  visible: boolean = false;
  private subscription: Subscription = new Subscription();

  // Optimización: Extraer configuraciones a propiedades
  dialogBreakpoints = { '1199px': '80vw', '575px': '90vw' };
  dialogStyle = { width: '50vw' };

  // Optimización: Getters para simplificar la plantilla
  get infoCards(): InfoCard[] {
    return this.tour?.['extra-info-section']?.['info-card'] || [];
  }

  get hasInfoCards(): boolean {
    return this.infoCards.length > 0;
  }

  constructor(
    private sanitizer: DomSanitizer,
    private route: ActivatedRoute,
    private toursService: ToursService
  ) {}

  ngOnInit(): void {
    this.loadTourData();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private loadTourData(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (slug) {
      const tourSubscription = this.toursService
        .getTourDetailBySlug(slug, ['extra-info-section'])
        .subscribe({
          next: (tour) => {
            if (tour && tour['extra-info-section']?.['info-card']) {
              tour['extra-info-section']['info-card'].sort(
                (a, b) => parseInt(a.order) - parseInt(b.order)
              );
            }
            this.tour = tour;
          },
          error: (error) => {
            console.error('Error loading tour data:', error);
          },
        });

      this.subscription.add(tourSubscription);
    }
  }

  handleSaveTrip(): void {
    this.visible = true;
  }

  sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html || '');
  }

  handleCloseModal(): void {
    this.visible = false;
  }

  handleDownloadTrip(): void {
    console.log('Downloading trip information...');

    if (this.tour) {
      // Optimización: Usar Promise para simular operación asíncrona
      this.showDownloadNotification();
    } else {
      alert('No hay información disponible para descargar');
    }
  }

  // Optimización: Método separado para mostrar notificación
  private showDownloadNotification(): void {
    alert('La descarga de tu viaje comenzará en breve');
    // Aquí iría la lógica para generar y descargar el PDF
  }

  handleInviteFriend(): void {
    console.log('Inviting friend to trip...');

    // Fix: Check if Web Share API is available by checking if it's a function
    if (navigator.share && typeof navigator.share === 'function') {
      this.shareViaWebAPI();
    } else {
      this.shareViaEmail();
    }
  }

  // Optimización: Métodos separados para compartir
  private shareViaWebAPI(): void {
    navigator
      .share({
        title: this.tour?.name || 'Mi viaje con Different Roads',
        text: '¡Mira este increíble viaje que estoy planeando!',
        url: window.location.href,
      })
      .catch((error) => console.error('Error sharing:', error));
  }

  private shareViaEmail(): void {
    const emailSubject = encodeURIComponent(
      this.tour?.name || 'Mi viaje con Different Roads'
    );
    const emailBody = encodeURIComponent(
      '¡Mira este increíble viaje que estoy planeando! ' + window.location.href
    );
    window.open(`mailto:?subject=${emailSubject}&body=${emailBody}`);
  }
}
