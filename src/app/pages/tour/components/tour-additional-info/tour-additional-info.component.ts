import { Component, OnInit, OnDestroy } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { ToursService } from '../../../../core/services/tours.service';
import { Tour } from '../../../../core/models/tours/tour.model';
import { Subscription } from 'rxjs';

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
    // Implementación para descargar el viaje
    // Por ejemplo, generar un PDF con la información del viaje
    console.log('Downloading trip information...');

    if (this.tour) {
      // Aquí iría la lógica para generar y descargar el PDF
      alert('La descarga de tu viaje comenzará en breve');
    } else {
      alert('No hay información disponible para descargar');
    }
  }

  handleInviteFriend(): void {
    // Implementación para invitar a un amigo
    // Por ejemplo, abrir un modal para compartir por email o redes sociales
    console.log('Inviting friend to trip...');

    // Ejemplo de implementación básica
    if (navigator.share) {
      navigator
        .share({
          title: this.tour?.name || 'Mi viaje con Different Roads',
          text: '¡Mira este increíble viaje que estoy planeando!',
          url: window.location.href,
        })
        .catch((error) => console.error('Error sharing:', error));
    } else {
      // Fallback para navegadores que no soportan Web Share API
      const emailSubject = encodeURIComponent(
        this.tour?.name || 'Mi viaje con Different Roads'
      );
      const emailBody = encodeURIComponent(
        '¡Mira este increíble viaje que estoy planeando! ' +
          window.location.href
      );
      window.open(`mailto:?subject=${emailSubject}&body=${emailBody}`);
    }
  }
}
