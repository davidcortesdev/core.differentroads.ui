import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  ChangeDetectorRef,
  OnInit,
} from '@angular/core';
import { ToursService } from '../../../../core/services/tours.service';
import { ActivatedRoute } from '@angular/router';
import { TravelersCard } from '../../../../core/models/tours/tour.model';

@Component({
  selector: 'app-tour-gallery',
  standalone: false,
  templateUrl: './tour-gallery.component.html',
  styleUrl: './tour-gallery.component.scss',
})
export class TourGalleryComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('galleryGrid') galleryGrid!: ElementRef;

  title: string = '';
  images: TravelersCard[] = [];
  showAll = false;
  itemsPerRow = 4;
  private resizeObserver?: ResizeObserver;

  constructor(
    private toursService: ToursService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  get visibleImages() {
    return this.showAll
      ? this.images
      : this.images.slice(0, this.itemsPerRow * 2);
  }

  ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('slug');
    
    // Obtener el parámetro filterByStatus de los query params
    const filterByStatus = this.route.snapshot.queryParamMap.get('filterByStatus') !== 'false';

    if (slug) {
      this.toursService.getTourDetailBySlug(slug, undefined, filterByStatus).subscribe({
        next: (tour) => {
          if (tour['travelers-section']) {
            this.title = tour['travelers-section'].title;

            const travelersCards =
              tour['travelers-section']['travelers-cards'] || [];
            this.images = travelersCards;

            this.cdr.detectChanges();
          }
        },
        error: (error) => {
          console.error('Error al obtener los detalles del tour:', error);
        },
      });
    }
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.setupResizeObserver();
      this.cdr.detectChanges();
    });
  }

  private setupResizeObserver() {
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const containerWidth = entry.contentRect.width;
        const itemWidth = 200;
        const calculatedItemsPerRow = Math.floor(containerWidth / itemWidth);
        this.itemsPerRow = Math.max(2, calculatedItemsPerRow);

        this.cdr.detectChanges();
      }
    });

    if (this.galleryGrid) {
      this.resizeObserver.observe(this.galleryGrid.nativeElement);
    }
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
  }

  toggleShowMore() {
    this.showAll = !this.showAll;
  }
}
