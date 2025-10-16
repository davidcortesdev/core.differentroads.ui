import { Component, OnInit, OnDestroy } from '@angular/core';
import { Title } from '@angular/platform-browser';
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
        .getAll({ name: tagName, isActive: true })
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
        .getAll({ name: categoryName, isActive: true })
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
    // Actualizar título
    let title: string;
    
    if (this.subItemSlug && this.tagData) {
      // Si buscamos tag y lo encontramos
      title = `${this.tagData.name} - Different Roads`;
    } else if (this.subItemSlug) {
      // Si buscamos tag pero no lo encontramos
      title = `${this.formatSlug(this.subItemSlug)} - Different Roads`;
    } else if (this.categoryData) {
      // Si buscamos categoría y la encontramos
      title = `${this.categoryData.name} - Different Roads`;
    } else {
      // Si buscamos categoría pero no la encontramos
      title = `${this.formatSlug(this.categorySlug)} - Different Roads`;
    }
    
    this.titleService.setTitle(title);

    // Log para debug
    console.log('Datos de categoría/tag cargados:', {
      tagId: this.tagId,
      tagName: this.tagData?.name,
      categoryId: this.categoryId,
      categoryName: this.categoryData?.name
    });

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
          console.log(`Tours encontrados para los tags [${tagIds.join(', ')}]:`, tourIds);
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

  formatSlug(slug: string): string {
    return slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

