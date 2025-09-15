import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';

// SOLO servicios de configuración del home
import {
  HomeSectionService,
  IHomeSectionResponse,
} from '../../core/services/home/home-section.service';
import {
  HomeSectionConfigurationService,
  IHomeSectionConfigurationResponse,
} from '../../core/services/home/home-section-configuration.service';

@Component({
  selector: 'app-home-v2',
  standalone: false,
  templateUrl: './home-v2.component.html',
  styleUrls: ['./home-v2.component.scss'],
})
export class HomeV2Component implements OnInit, OnDestroy {
  // Configuraciones por tipo de sección
  bannerConfigurations: IHomeSectionConfigurationResponse[] = [];
  tourCarouselConfigurations: IHomeSectionConfigurationResponse[] = [];
  fullscreenCardsConfigurations: IHomeSectionConfigurationResponse[] = [];
  mixedSectionConfigurations: IHomeSectionConfigurationResponse[] = [];
  travelerSectionConfigurations: IHomeSectionConfigurationResponse[] = [];
  reviewsSectionConfigurations: IHomeSectionConfigurationResponse[] = [];
  featuredSectionConfigurations: IHomeSectionConfigurationResponse[] = [];
  partnersSectionConfigurations: IHomeSectionConfigurationResponse[] = [];

  // Estado de carga
  isLoading = true;
  hasError = false;

  private destroy$ = new Subject<void>();

  constructor(
    private homeSectionService: HomeSectionService,
    private homeSectionConfigurationService: HomeSectionConfigurationService
  ) {}

  ngOnInit() {
    this.loadAllHomeSections();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadAllHomeSections(): void {
    this.isLoading = true;
    this.hasError = false;

    // Cargar todas las configuraciones activas ordenadas
    this.homeSectionConfigurationService
      .getActiveOrdered()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (configurations) => {
          this.distributeConfigurationsBySection(configurations);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading home configurations:', error);
          this.hasError = true;
          this.isLoading = false;
        },
      });
  }

  private distributeConfigurationsBySection(
    configurations: IHomeSectionConfigurationResponse[]
  ): void {
    console.log('🔍 HomeV2 - All configurations received:', configurations);

    // Agrupar configuraciones por tipo de sección
    this.bannerConfigurations = configurations.filter(
      (c) => c.homeSectionId === 1
    );
    this.tourCarouselConfigurations = configurations.filter(
      (c) => c.homeSectionId === 2
    );
    this.fullscreenCardsConfigurations = configurations.filter(
      (c) => c.homeSectionId === 4
    );
    this.mixedSectionConfigurations = configurations.filter(
      (c) => c.homeSectionId === 5
    );
    this.travelerSectionConfigurations = configurations.filter(
      (c) => c.homeSectionId === 6
    );
    this.reviewsSectionConfigurations = configurations.filter(
      (c) => c.homeSectionId === 7
    );
    this.featuredSectionConfigurations = configurations.filter(
      (c) => c.homeSectionId === 8
    );
    this.partnersSectionConfigurations = configurations.filter(
      (c) => c.homeSectionId === 10
    );

    console.log(
      '🔍 HomeV2 - Mixed Section Configurations (ID: 5):',
      this.mixedSectionConfigurations
    );
  }

  // Métodos helper para verificar si las secciones tienen configuraciones
  hasBannerSection(): boolean {
    return this.bannerConfigurations.length > 0;
  }

  hasTourCarouselSection(): boolean {
    return this.tourCarouselConfigurations.length > 0;
  }

  hasFullscreenCardsSection(): boolean {
    return this.fullscreenCardsConfigurations.length > 0;
  }

  hasMixedSection(): boolean {
    return this.mixedSectionConfigurations.length > 0;
  }

  hasTravelerSection(): boolean {
    return this.travelerSectionConfigurations.length > 0;
  }

  hasReviewsSection(): boolean {
    return this.reviewsSectionConfigurations.length > 0;
  }

  hasFeaturedSection(): boolean {
    return this.featuredSectionConfigurations.length > 0;
  }

  hasPartnersSection(): boolean {
    return this.partnersSectionConfigurations.length > 0;
  }

  // Métodos para obtener configuraciones específicas por orden
  getBannerConfiguration(
    displayOrder: number = 1
  ): IHomeSectionConfigurationResponse | null {
    return (
      this.bannerConfigurations.find((c) => c.displayOrder === displayOrder) ||
      this.bannerConfigurations[0] ||
      null
    );
  }

  getTourCarouselConfiguration(
    displayOrder: number = 1
  ): IHomeSectionConfigurationResponse | null {
    return (
      this.tourCarouselConfigurations.find(
        (c) => c.displayOrder === displayOrder
      ) ||
      this.tourCarouselConfigurations[0] ||
      null
    );
  }

  getFullscreenCardsConfiguration(
    displayOrder: number = 1
  ): IHomeSectionConfigurationResponse | null {
    return (
      this.fullscreenCardsConfigurations.find(
        (c) => c.displayOrder === displayOrder
      ) ||
      this.fullscreenCardsConfigurations[0] ||
      null
    );
  }

  getMixedSectionConfiguration(
    displayOrder: number = 1
  ): IHomeSectionConfigurationResponse | null {
    return (
      this.mixedSectionConfigurations.find(
        (c) => c.displayOrder === displayOrder
      ) ||
      this.mixedSectionConfigurations[0] ||
      null
    );
  }

  getTravelerSectionConfiguration(
    displayOrder: number = 1
  ): IHomeSectionConfigurationResponse | null {
    return (
      this.travelerSectionConfigurations.find(
        (c) => c.displayOrder === displayOrder
      ) ||
      this.travelerSectionConfigurations[0] ||
      null
    );
  }

  getReviewsSectionConfiguration(
    displayOrder: number = 1
  ): IHomeSectionConfigurationResponse | null {
    return (
      this.reviewsSectionConfigurations.find(
        (c) => c.displayOrder === displayOrder
      ) ||
      this.reviewsSectionConfigurations[0] ||
      null
    );
  }

  getFeaturedSectionConfiguration(
    displayOrder: number = 1
  ): IHomeSectionConfigurationResponse | null {
    return (
      this.featuredSectionConfigurations.find(
        (c) => c.displayOrder === displayOrder
      ) ||
      this.featuredSectionConfigurations[0] ||
      null
    );
  }

  getPartnersSectionConfiguration(
    displayOrder: number = 1
  ): IHomeSectionConfigurationResponse | null {
    return (
      this.partnersSectionConfigurations.find(
        (c) => c.displayOrder === displayOrder
      ) ||
      this.partnersSectionConfigurations[0] ||
      null
    );
  }

  // Método para obtener todas las configuraciones ordenadas globalmente
  getAllConfigurationsOrdered(): IHomeSectionConfigurationResponse[] {
    const allConfigurations = [
      ...this.bannerConfigurations,
      ...this.tourCarouselConfigurations,
      ...this.fullscreenCardsConfigurations,
      ...this.mixedSectionConfigurations,
      ...this.travelerSectionConfigurations,
      ...this.reviewsSectionConfigurations,
      ...this.featuredSectionConfigurations,
      ...this.partnersSectionConfigurations,
    ];

    return allConfigurations.sort((a, b) => a.displayOrder - b.displayOrder);
  }

  // Método para obtener el nombre de la sección por ID
  getSectionName(sectionId: number): string {
    const sectionNames: { [key: number]: string } = {
      1: 'Banner',
      2: 'Carrusel de Tours',
      4: 'Cards a Pantalla Completa',
      5: 'Sección Mixta',
      6: 'Sección de Viajeros',
      7: 'Sección de Reviews',
      8: 'Sección Destacada',
      10: 'Carrusel de Colaboradores',
    };
    return sectionNames[sectionId] || 'Sección desconocida';
  }
}
