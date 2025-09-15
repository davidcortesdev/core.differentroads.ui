import { Component, OnInit } from '@angular/core';
import {
  HomeSectionImageService,
  IHomeSectionImageResponse,
} from '../../../../core/services/home/home-section-image.service';
import { CAROUSEL_CONFIG } from '../../../../shared/constants/carousel.constants';

@Component({
  selector: 'app-partners-section-v2',
  standalone: false,
  templateUrl: './partners-section-v2.component.html',
  styleUrl: './partners-section-v2.component.scss',
})
export class PartnersSectionV2Component implements OnInit {
  partners: IHomeSectionImageResponse[] = [];
  numVisible = 4;
  title = 'Colaboradores';
  responsiveOptions = [
    {
      breakpoint: '1800px',
      numVisible: 4,
      numScroll: 1,
    },
    {
      breakpoint: '1300px',
      numVisible: 3,
      numScroll: 1,
    },
    {
      breakpoint: '1000px',
      numVisible: 2,
      numScroll: 1,
    },
    {
      breakpoint: '700px',
      numVisible: 1,
      numScroll: 1,
    },
  ];
  protected carouselConfig = CAROUSEL_CONFIG;

  constructor(private homeSectionImageService: HomeSectionImageService) {}

  ngOnInit(): void {
    this.loadPartners();
  }

  private loadPartners(): void {
    // Obtener todas las imágenes activas
    this.homeSectionImageService.getActive().subscribe({
      next: (images: IHomeSectionImageResponse[]) => {
        // Mostrar todas las imágenes por ahora para debugging
        this.partners = images.slice(0, 8); // Limitar a 8 partners
      },
      error: (error) => {
        console.error('Error loading partners:', error);
        this.partners = [];
      },
    });
  }
}
