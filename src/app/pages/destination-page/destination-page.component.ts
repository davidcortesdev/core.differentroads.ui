import { Component, OnInit, OnDestroy } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-destination-page',
  standalone: false,
  templateUrl: './destination-page.component.html',
  styleUrl: './destination-page.component.scss',
})
export class DestinationPageComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  
  menuTipoSlug: string = '';
  menuItemSlug: string = '';
  destinationSlug: string = '';
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
        this.menuTipoSlug = params['menuTipoSlug'] || '';
        this.menuItemSlug = params['menuItemSlug'] || '';
        this.destinationSlug = params['destinationSlug'] || '';
        
        this.loadDestinationData();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDestinationData(): void {
    this.isLoading = true;
    
    // Actualizar título
    const title = this.destinationSlug 
      ? `${this.formatSlug(this.destinationSlug)} - Different Roads`
      : `${this.formatSlug(this.menuItemSlug)} - Different Roads`;
    this.titleService.setTitle(title);

    // TODO: Aquí cargarás los tours por ubicación/país
    console.log('Cargando destino:', {
      menuTipoSlug: this.menuTipoSlug,
      menuItemSlug: this.menuItemSlug,
      destinationSlug: this.destinationSlug
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

