import { Component, Input, OnInit } from '@angular/core';
import {
  HomeSectionImageService,
  IHomeSectionImageResponse,
} from '../../../../core/services/home/home-section-image.service';
import {
  HomeSectionConfigurationService,
} from '../../../../core/services/home/home-section-configuration.service';
import { CAROUSEL_CONFIG } from '../../../../shared/constants/carousel.constants';

@Component({
  selector: 'app-partners-section-v2',
  standalone: false,
  templateUrl: './partners-section-v2.component.html',
  styleUrl: './partners-section-v2.component.scss',
})
export class PartnersSectionV2Component implements OnInit {
  @Input() configurationId?: number; // ID específico de configuración

  partners: IHomeSectionImageResponse[] = [];
  numVisible = 4;
  title = 'Colaboradores'; // Valor por defecto
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

  constructor(
    private homeSectionImageService: HomeSectionImageService,
    private homeSectionConfigurationService: HomeSectionConfigurationService
  ) {}

  ngOnInit(): void {
    this.loadPartners();
  }

  private loadPartners(): void {
    // Si no se proporciona configurationId, mostrar error y no cargar nada
    if (!this.configurationId) {
      console.error('PartnersSectionV2 - configurationId is required');
      this.partners = [];
      return;
    }

    console.log('PartnersSectionV2 - Loading partners for configurationId:', this.configurationId);

    // Primero cargar la configuración para obtener el título
    this.homeSectionConfigurationService.getById(this.configurationId).subscribe({
      next: (configuration) => {
        // Establecer el título desde la configuración
        this.title = configuration.title || 'Colaboradores';
        console.log('PartnersSectionV2 - Configuration loaded:', configuration);
        console.log('PartnersSectionV2 - Title:', this.title);

        // Luego cargar las imágenes de la configuración
        this.loadPartnersImages();
      },
      error: (error) => {
        console.error('PartnersSectionV2 - Error loading configuration:', error);
        console.error('ConfigurationId:', this.configurationId);
        // Continuar con la carga de imágenes aunque falle la configuración
        this.loadPartnersImages();
      },
    });
  }

  private loadPartnersImages(): void {
    if (!this.configurationId) {
      return;
    }

    // Obtener imágenes activas de la configuración específica
    this.homeSectionImageService
      .getByConfiguration(this.configurationId, true)
      .subscribe({
        next: (images: IHomeSectionImageResponse[]) => {
          console.log('Partners images received:', images);
          console.log('ConfigurationId used:', this.configurationId);
          console.log('Total images:', images.length);
          images.forEach((image, index) => {
            console.log(`Image ${index + 1}:`, {
              id: image.id,
              imageUrl: image.imageUrl,
              altText: image.altText,
              title: image.title,
              homeSectionConfigurationId: image.homeSectionConfigurationId,
              isActive: image.isActive,
              displayOrder: image.displayOrder,
            });
          });
          // Ordenar por displayOrder y limitar a 8 partners si es necesario
          const sortedImages = images.sort((a, b) => a.displayOrder - b.displayOrder);
          this.partners = sortedImages.slice(0, 8);
          console.log('Partners displayed (first 8, sorted by displayOrder):', this.partners);
        },
        error: (error) => {
          console.error('Error loading partners images:', error);
          console.error('ConfigurationId:', this.configurationId);
          this.partners = [];
        },
      });
  }
}
