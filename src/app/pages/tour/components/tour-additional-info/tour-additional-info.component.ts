import { Component, OnInit } from '@angular/core';
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
export class TourAdditionalInfoComponent implements OnInit {
  tour: Tour | null = null;
  tourData: Tour | null = null;
  visible: boolean = false;

  constructor(
    private sanitizer: DomSanitizer,
    private route: ActivatedRoute,
    private toursService: ToursService
  ) {}

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (slug) {
      this.toursService
        .getTourDetailBySlug(slug, ['extra-info-section'])
        .subscribe((tour) => {
          if (tour && tour['extra-info-section']?.['info-card']) {
            tour['extra-info-section']['info-card'].sort(
              (a, b) => parseInt(a.order) - parseInt(b.order)
            );
          }
          this.tour = tour;
        });
    }
  }

  handleSaveTrip(): void {
    this.visible = true;
  }

  sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  handleCloseModal(): void {
    this.visible = false;
  }

  handleDownloadTrip() {
    throw new Error('Method not implemented.');
  }
  handleInviteFriend() {
    throw new Error('Method not implemented.');
  }
}
