import { Component, OnInit, OnDestroy } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

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
  isLoading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private titleService: Title
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
    
    // Actualizar título
    const title = this.subItemSlug 
      ? `${this.formatSlug(this.subItemSlug)} - Different Roads`
      : `${this.formatSlug(this.categorySlug)} - Different Roads`;
    this.titleService.setTitle(title);

    // TODO: Aquí cargarás los tours por tag/categoría
    console.log('Cargando categoría:', {
      categorySlug: this.categorySlug,
      subItemSlug: this.subItemSlug
    });

    // Simular carga
    setTimeout(() => {
      this.isLoading = false;
    }, 500);
  }

  formatSlug(slug: string): string {
    return slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

