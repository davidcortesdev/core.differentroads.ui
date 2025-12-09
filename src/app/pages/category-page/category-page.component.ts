import { Component, OnInit, OnDestroy } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { TagService, ITagResponse } from '../../core/services/tag/tag.service';
import { TagCategoryService, ITagCategoryResponse } from '../../core/services/tag/tag-category.service';
import { TourTagService } from '../../core/services/tag/tour-tag.service';

@Component({
  selector: 'app-category-page',
  standalone: false,
  templateUrl: './category-page.component.html',
  styleUrl: './category-page.component.scss',
})
export class CategoryPageComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  
  categorySlug: string = ''; // menuItemSlug = categoría (ej: "temporada")
  subItemSlug: string = ''; // subItemSlug = tag específico (ej: "semana-santa")
  
  categoryData: ITagCategoryResponse | null = null;
  tagData: ITagResponse | null = null;
  categoryId: number | null = null;
  tagId: number | null = null;
  
  tourIds: number[] = []; // IDs de tours filtrados por tag/categoría
  isLoading = true;
  isLoadingTours = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private titleService: Title,
    private meta: Meta,
    private tagService: TagService,
    private tagCategoryService: TagCategoryService,
    private tourTagService: TourTagService
  ) {}

  ngOnInit(): void {
    // Observar cambios en los parámetros de la ruta
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.categorySlug = params['menuItemSlug'] || ''; // La categoría principal
        this.subItemSlug = params['subItemSlug'] || ''; // El tag específico (opcional)
        
        this.loadCategoryData();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCategoryData(): void {
    this.isLoading = true;
    
    // Si hay subItemSlug, buscar el tag específico
    if (this.subItemSlug) {
      const tagName = this.formatSlug(this.subItemSlug);
      
      this.tagService
        .getAll({ name: tagName, isActive: true, useExactMatchForStrings: true })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (tags) => {
            if (tags && tags.length > 0) {
              this.tagData = tags[0];
              this.tagId = this.tagData.id;
              this.updatePageInfo();
            } else {
              console.warn(`No se encontró tag para: ${tagName}`);
              this.router.navigate(['/not-found']);
            }
          },
          error: (error) => {
            console.error('Error al buscar tag:', error);
            this.router.navigate(['/not-found']);
          }
        });
    } else {
      // Si NO hay subItemSlug, buscar la categoría
      const categoryName = this.formatSlug(this.categorySlug);
      
      this.tagCategoryService
        .getAll({ name: categoryName, isActive: true, useExactMatchForStrings: true })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (categories) => {
            if (categories && categories.length > 0) {
              this.categoryData = categories[0];
              this.categoryId = this.categoryData.id;
              this.updatePageInfo();
            } else {
              console.warn(`No se encontró categoría para: ${categoryName}`);
              this.router.navigate(['/not-found']);
            }
          },
          error: (error) => {
            console.error('Error al buscar categoría:', error);
            this.router.navigate(['/not-found']);
          }
        });
    }
  }

  private updatePageInfo(): void {
    // Actualizar título y SEO
    let title: string;
    let description: string;
    let keywords: string;
    
    if (this.subItemSlug && this.tagData) {
      // Si buscamos tag y lo encontramos
      const tagName = this.tagData.name;
      const categoryName = this.getCategoryName();
      title = `${tagName} - Different Roads`;
      
      // Generar keywords según el tipo de categoría
      keywords = this.generateKeywordsForTag(categoryName, tagName);
      // Si el tag tiene descripción propia → usarla
      if (this.tagData?.description && this.tagData.description.trim()) {
          description = this.tagData.description;
      } else {
          // Si no → usar la descripción generada
          description = this.generateDescriptionForTag(categoryName, tagName);
      }

    } else if (this.subItemSlug) {
      // Si buscamos tag pero no lo encontramos
      const tagName = this.formatSlug(this.subItemSlug);
      const categoryName = this.getCategoryName();
      title = `${tagName} - Different Roads`;
      
      keywords = this.generateKeywordsForTag(categoryName, tagName);
      // Si el tag tiene descripción propia → usarla
      if (this.tagData?.description && this.tagData.description.trim()) {
          description = this.tagData.description;
      } else {
          // Si no → usar la descripción generada
          description = this.generateDescriptionForTag(categoryName, tagName);
      }

    } else if (this.categoryData) {
      // Si buscamos categoría y la encontramos
      const categoryName = this.categoryData.name;
      title = `${categoryName} - Different Roads`;
      
      keywords = this.generateKeywordsForCategory(categoryName);
      description = this.generateDescriptionForCategory(categoryName);
      
    } else {
      // Si buscamos categoría pero no la encontramos
      const categoryName = this.formatSlug(this.categorySlug);
      title = `${categoryName} - Different Roads`;
      
      keywords = this.generateKeywordsForCategory(categoryName);
      description = this.generateDescriptionForCategory(categoryName);
    }
    
    // Actualizar título
    this.titleService.setTitle(title);
    
    // Actualizar meta descripción
    this.meta.updateTag({ name: 'description', content: description });
    
    // Actualizar keywords SEO
    this.meta.updateTag({ name: 'keywords', content: keywords });

    // Log para debug

    this.isLoading = false;
    
    // Cargar tours basados en los tags
    this.loadTours();
  }

  /**
   * Carga los tours filtrados por tag o categoría
   */
  private loadTours(): void {
    const tagIds: number[] = [];
    
    // Si hay tag específico, usar solo ese
    if (this.tagId) {
      tagIds.push(this.tagId);
    } 
    // Si solo hay categoría, obtener todos los tags de esa categoría
    else if (this.categoryId) {
      // Primero obtener todos los tags de la categoría
      this.tagService
        .getAll({ tagCategoryId: this.categoryId, isActive: true })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (tags) => {
            const categoryTagIds = tags.map(tag => tag.id);
            if (categoryTagIds.length > 0) {
              this.loadToursByTags(categoryTagIds);
            } else {
              console.warn('No se encontraron tags para la categoría');
              this.isLoadingTours = false;
            }
          },
          error: (error) => {
            console.error('Error al cargar tags de la categoría:', error);
            this.tourIds = [];
            this.isLoadingTours = false;
          }
        });
      return;
    }

    // Si hay tagIds directamente, cargar los tours
    if (tagIds.length === 0) {
      console.warn('No hay IDs de tags para filtrar tours');
      return;
    }

    this.loadToursByTags(tagIds);
  }

  /**
   * Carga los tours por los IDs de tags proporcionados
   */
  private loadToursByTags(tagIds: number[]): void {
    this.isLoadingTours = true;
    
    this.tourTagService
      .getToursByTags(tagIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tourIds) => {
          this.tourIds = tourIds;

          this.isLoadingTours = false;
        },
        error: (error) => {
          console.error('Error al cargar tours por tags:', error);
          this.tourIds = [];
          this.isLoadingTours = false;
        }
      });
  }

  /**
   * Obtiene el nombre a mostrar para la categoría
   */
  getCategoryName(): string {
    // Si hay tag, la categoría no se buscó, usar el slug formateado
    if (this.subItemSlug) {
      return this.formatSlug(this.categorySlug);
    }
    // Si no hay tag, se buscó la categoría
    return this.categoryData?.name || this.formatSlug(this.categorySlug);
  }

  /**
   * Obtiene el nombre a mostrar para el tag
   */
  getTagName(): string {
    return this.tagData?.name || this.formatSlug(this.subItemSlug);
  }

  /**
   * Genera keywords SEO para categorías principales
   */
  private generateKeywordsForCategory(categoryName: string): string {
    const normalizedCategory = categoryName.toLowerCase();
    
    if (normalizedCategory.includes('tipos') || normalizedCategory.includes('tipo')) {
      return `tipos de viaje, viajes organizados, diferentes tipos de viaje, opciones de viaje`;
    } else if (normalizedCategory.includes('mes') || normalizedCategory.includes('meses')) {
      return `viajar por mes, mejores meses para viajar, cuándo viajar, temporada de viajes`;
    } else if (normalizedCategory.includes('temporada')) {
      return `viajes por temporada, vacaciones, viajes estacionales, mejores temporadas para viajar`;
    } else {
      return `${categoryName}, viajes ${categoryName.toLowerCase()}, tours ${categoryName.toLowerCase()}`;
    }
  }

  /**
   * Genera keywords SEO para tags específicos según el tipo de categoría
   */
  private generateKeywordsForTag(categoryName: string, tagName: string): string {
    const normalizedCategory = categoryName.toLowerCase();
    const normalizedTag = tagName.toLowerCase();
    
    if (normalizedCategory.includes('tipos') || normalizedCategory.includes('tipo')) {
      // Patrón: "viajar + tipo de viaje"
      if (normalizedTag.includes('grupo') || normalizedTag.includes('grupos')) {
        return `viajes en grupo, viajar en grupo, tours grupales, viajes organizados en grupo`;
      } else if (normalizedTag.includes('single') || normalizedTag.includes('solo')) {
        return `viajar solo, viajes single, viajes individuales, viajar independiente`;
      } else if (normalizedTag.includes('mixto')) {
        return `viajes mixtos, tours mixtos, viajes combinados`;
      } else if (normalizedTag.includes('medida') || normalizedTag.includes('personalizado')) {
        return `viajes a medida, tours personalizados, viajes customizados`;
      } else {
        return `viajar ${normalizedTag}, viajes ${normalizedTag}, tours ${normalizedTag}`;
      }
    } else if (normalizedCategory.includes('mes') || normalizedCategory.includes('meses')) {
      // Patrón: "viajar + mes"
      return `viajar en ${normalizedTag}, viajes ${normalizedTag}, mejores destinos ${normalizedTag}, cuándo viajar ${normalizedTag}`;
    } else if (normalizedCategory.includes('temporada')) {
      // Patrón: "viaje + vacaciones"
      if (normalizedTag.includes('navidad') || normalizedTag.includes('diciembre')) {
        return `viajar navidad, viajes navideños, vacaciones navidad, viajes diciembre`;
      } else if (normalizedTag.includes('verano')) {
        return `viajes verano, vacaciones verano, viajar en verano, destinos verano`;
      } else if (normalizedTag.includes('semana santa') || normalizedTag.includes('santa')) {
        return `viajar semana santa, viajes semana santa, vacaciones semana santa`;
      } else if (normalizedTag.includes('puente')) {
        return `viajes puente, viajar en puente, vacaciones puente`;
      } else {
        return `viaje ${normalizedTag}, viajes ${normalizedTag}, vacaciones ${normalizedTag}`;
      }
    } else {
      // Patrón genérico
      return `viajar ${normalizedTag}, viajes ${normalizedTag}, tours ${normalizedTag}`;
    }
  }

  /**
   * Genera descripción SEO para categorías principales
   */
  private generateDescriptionForCategory(categoryName: string): string {
    const normalizedCategory = categoryName.toLowerCase();
    
    if (normalizedCategory.includes('tipos') || normalizedCategory.includes('tipo')) {
      return `Descubre los diferentes tipos de viaje disponibles en Different Roads. Desde viajes en grupo hasta experiencias personalizadas, encuentra la opción perfecta para ti.`;
    } else if (normalizedCategory.includes('mes') || normalizedCategory.includes('meses')) {
      return `Planifica tu viaje según el mes del año. Descubre los mejores destinos y experiencias para cada temporada con Different Roads.`;
    } else if (normalizedCategory.includes('temporada')) {
      return `Explora viajes organizados por temporada. Desde vacaciones de verano hasta escapadas navideñas, encuentra la experiencia perfecta para cada época del año.`;
    } else {
      return `Descubre ${categoryName} con Different Roads. Encuentra los mejores tours y experiencias de viaje para ${categoryName.toLowerCase()}.`;
    }
  }

  /**
   * Genera descripción SEO para tags específicos
   */
  private generateDescriptionForTag(categoryName: string, tagName: string): string {
    const normalizedCategory = categoryName.toLowerCase();
    const normalizedTag = tagName.toLowerCase();
    
    if (normalizedCategory.includes('tipos') || normalizedCategory.includes('tipo')) {
      return `Descubre ${tagName} con Different Roads. Encuentra los mejores tours y experiencias de ${normalizedTag} para tu próximo viaje.`;
    } else if (normalizedCategory.includes('mes') || normalizedCategory.includes('meses')) {
      return `Planifica tu viaje en ${tagName}. Descubre los mejores destinos y experiencias para ${normalizedTag} con Different Roads.`;
    } else if (normalizedCategory.includes('temporada')) {
      return `Vive ${tagName} con Different Roads. Encuentra los mejores viajes y experiencias para ${normalizedTag} y crea recuerdos inolvidables.`;
    } else {
      return `Descubre ${tagName} con Different Roads. Encuentra los mejores tours y experiencias de ${normalizedTag} para tu próximo viaje.`;
    }
  }

  getTagPageDescription(): string {
    if (this.tagData?.description && this.tagData.description.trim()) {
      return this.tagData.description;
    }
    
    const tagName = this.getTagName() || this.getCategoryName();
    return ` Encuentra la experiencia perfecta para tu próximo viaje. Explora todos los tours disponibles para ${tagName}.`;
  }

  formatSlug(slug: string): string {
    return slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

