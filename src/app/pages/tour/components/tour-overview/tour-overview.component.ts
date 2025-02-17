import { Component, OnInit } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { ToursService } from '../../../../core/services/tours.service';
import { Tour } from '../../../../core/models/tours/tour.model';

@Component({
  selector: 'app-tour-overview',
  standalone: false,
  templateUrl: './tour-overview.component.html',
  styleUrls: ['./tour-overview.component.scss'],
})
export class TourOverviewComponent implements OnInit {
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
        'image' as keyof Tour,
        'cities',
        'expert',
        'vtags',
        'description',
        'highlights-title',
        'subtitle',
        'continent',
        'country',
      ]; // Add selected fields here
      this.toursService
        .getTourDetailBySlug(slug,selectedFields)
        //.getTourDetailBySlug(slug)
        .subscribe((tour) => {
          this.tour = tour;
        });
    }
  }

  sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  get destinationItems(): MenuItem[] {
    return (
      this.tour?.destinations.map((destination: string) => ({
        label: destination,
      })) || []
    );
  }

  get breadcrumbItems(): MenuItem[] {
    return [
      { label: this.tour?.continent },
      { label: this.tour?.country },
      { label: this.tour?.name },
    ];
  }
}
