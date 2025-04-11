import { Component, OnInit, OnDestroy } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { ToursService } from '../../../../core/services/tours.service';
import { Tour } from '../../../../core/models/tours/tour.model';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-tour-overview',
  standalone: false,
  templateUrl: './tour-overview.component.html',
  styleUrls: ['./tour-overview.component.scss'],
})
export class TourOverviewComponent implements OnInit, OnDestroy {
  tour: Tour | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private sanitizer: DomSanitizer,
    private route: ActivatedRoute,
    private toursService: ToursService
  ) {}

  ngOnInit(): void {
    this.loadTourData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadTourData(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) return;

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
      'name',
    ];
    
    this.toursService
      .getTourDetailBySlug(slug, selectedFields)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tour) => {
          this.tour = tour;
        },
        error: (error) => {
          console.error('Error loading tour data:', error);
        }
      });
  }

  sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  trackByIndex(index: number): number {
    return index;
  }

  get destinationItems(): MenuItem[] {
    return (
      this.tour?.cities?.map((destination: string) => ({
        label: destination,
      })) || []
    );
  }

  get breadcrumbItems(): MenuItem[] {
    if (!this.tour) return [];
    
    return [
      {
        label: this.tour?.continent,
        routerLink: ['/tours'],
        queryParams: {
          destination: typeof this.tour?.continent === 'string'
            ? this.tour.continent.trim()
            : this.tour?.continent || '',
        },
      },
      {
        label: this.tour?.country,
        routerLink: ['/tours'],
        queryParams: {
          destination: typeof this.tour?.country === 'string'
            ? this.tour.country.trim()
            : this.tour?.country || '',
        },
      },
      { label: this.tour?.name },
    ];
  }
}
