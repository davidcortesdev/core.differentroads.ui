import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  ChangeDetectorRef,
} from '@angular/core';
import { ToursService } from '../../../../core/services/tours.service';
import { ActivatedRoute } from '@angular/router';
import { TravelersCard } from '../../../../core/models/tours/tour.model';

interface GalleryImage extends TravelersCard {
  width: number;
  height: number;
}

@Component({
  selector: 'app-tour-gallery',
  standalone: false,
  templateUrl: './tour-gallery.component.html',
  styleUrl: './tour-gallery.component.scss',
})
export class TourGalleryComponent implements AfterViewInit, OnDestroy {
  @ViewChild('galleryGrid') galleryGrid!: ElementRef;

  title: string = '';
  images: GalleryImage[] = [];
  showAll = false;
  itemsPerRow = 4;
  private resizeObserver?: ResizeObserver;

  // Configuración de tamaños para el grid
  private imageSizes = [
    { width: 400, height: 300 },
    { width: 300, height: 400 },
    { width: 600, height: 400 },
    { width: 400, height: 500 },
    { width: 500, height: 300 },
    { width: 400, height: 400 },
  ];

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

    if (slug) {
      this.toursService.getTourDetailBySlug(slug).subscribe({
        next: (tour) => {
          if (tour['travelers-section']) {
            // Obtenemos el título de la sección
            this.title = tour['travelers-section'].title;

            // Mapeamos los travelers-cards con dimensiones dinámicas
            const travelersCards =
              tour['travelers-section']['travelers-cards'] || [];
            this.images = travelersCards.map((card, index) => {
              const size = this.imageSizes[index % this.imageSizes.length];
              return {
                ...card,
                width: size.width,
                height: size.height,
              };
            });

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
        const items = entry.target.querySelectorAll('.gallery-item');
        if (items.length > 0) {
          const firstItemRect = items[0].getBoundingClientRect();
          const containerWidth = entry.contentRect.width;
          const calculatedItems = Math.floor(
            containerWidth / (firstItemRect.width + 20)
          );
          this.itemsPerRow =
            calculatedItems > 0 ? calculatedItems : this.itemsPerRow;
          this.cdr.detectChanges();
        }
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
