import { Component } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { ToursService } from '../../../../core/services/tours.service';
import { Tour } from '../../../../core/models/tours/tour.model';

@Component({
  selector: 'app-tour-additional-info',
  standalone: false,
  templateUrl: './tour-additional-info.component.html',
  styleUrl: './tour-additional-info.component.scss',
})
export class TourAdditionalInfoComponent {
  tour: any;

  constructor(
    private sanitizer: DomSanitizer,
    private route: ActivatedRoute,
    private toursService: ToursService
  ) {}

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (slug) {
      const selectedFields: (keyof Tour | 'all' | undefined)[] = [
        'extra-info-section', // Asegúrate de incluir 'extra-info-section'
      ];
      this.toursService
        .getTourDetailBySlug(slug, selectedFields)
        .subscribe((tour) => {
          console.log('Fetched tour data:', tour);
          // Ordenar el array 'info-card' por la propiedad 'order'
          if (tour && tour['extra-info-section']?.['infoCard']) {
            tour['extra-info-section']['infoCard'].sort(
              (a, b) => parseInt(a.order) - parseInt(b.order)
            );
          }
          this.tour = tour;
        });
    }
  }

  handleSaveTrip(): void {
    // Implement save trip logic
  }

  handleDownloadTrip(): void {
    // Implement download trip logic
  }

  handleInviteFriend(): void {
    // Implement invite friend logic
  }

  sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
