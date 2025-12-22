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
      this.partners = [];
      return;
    }

    // Primero cargar la configuración para obtener el título
    this.homeSectionConfigurationService.getById(this.configurationId).subscribe({
      next: (configuration) => {
        // Establecer el título desde la configuración
        this.title = configuration.title || 'Colaboradores';

        // Luego cargar las imágenes de la configuración
        this.loadPartnersImages();
      },
      error: (error) => {
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
          // Ordenar por displayOrder y limitar a 8 partners si es necesario
          const sortedImages = images.sort((a, b) => a.displayOrder - b.displayOrder);
          this.partners = sortedImages.slice(0, 8);
        },
        error: (error) => {
          this.partners = [];
        },
      });
  }
}
