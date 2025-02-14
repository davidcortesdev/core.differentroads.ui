import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-tour-gallery',
  standalone: false,
  templateUrl: './tour-gallery.component.html',
  styleUrl: './tour-gallery.component.scss'
})
export class TourGalleryComponent implements AfterViewInit, OnDestroy {
  @ViewChild('galleryGrid') galleryGrid!: ElementRef;

  images = [
    { id: 1, width: 400, height: 300 },
    { id: 2, width: 300, height: 400 },
    { id: 3, width: 600, height: 400 },
    { id: 4, width: 400, height: 300 },
    { id: 5, width: 500, height: 300 },
    { id: 6, width: 400, height: 500 },
    { id: 7, width: 600, height: 400 },
    { id: 8, width: 400, height: 300 },
    { id: 9, width: 300, height: 400 },
    { id: 10, width: 500, height: 300 },
    { id: 11, width: 400, height: 400 },
    { id: 12, width: 400, height: 300 },
    { id: 21, width: 400, height: 300 },
    { id: 22, width: 300, height: 400 },
    { id: 23, width: 600, height: 400 },
    { id: 24, width: 400, height: 300 },
    { id: 25, width: 500, height: 300 },
    { id: 26, width: 400, height: 500 },
    { id: 27, width: 600, height: 400 },
    { id: 28, width: 400, height: 300 },
    { id: 29, width: 300, height: 400 },
    { id: 210, width: 500, height: 300 },
    { id: 211, width: 400, height: 400 },
    { id: 212, width: 400, height: 300 }
  ];
  
  showAll = false;
  itemsPerRow = 4; // Set default value
  private resizeObserver?: ResizeObserver;
  
  constructor(private cdr: ChangeDetectorRef) {}

  get visibleImages() {
    return this.showAll ? this.images : this.images.slice(0, this.itemsPerRow * 2);
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
          const calculatedItems = Math.floor(containerWidth / (firstItemRect.width + 20));
          this.itemsPerRow = calculatedItems > 0 ? calculatedItems : this.itemsPerRow;
          this.cdr.detectChanges();
        }
      }
    });

    this.resizeObserver.observe(this.galleryGrid.nativeElement);
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
  }

  toggleShowMore() {
    this.showAll = !this.showAll;
  }
}
