import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { Title } from '@angular/platform-browser';
import { PointsSectionV2Component } from './components/points-section-v2/points-section-v2.component';


@Component({
  selector: 'app-profile-v2',
  standalone: false,
  templateUrl: './profile-v2.component.html',
  styleUrl: './profile-v2.component.scss',
})
export class ProfileV2Component implements OnInit, OnDestroy {
  @ViewChild('pointsSection') pointsSection?: PointsSectionV2Component;
  
  userId: string = '';
  private routeSubscription: Subscription = new Subscription();
  private routerSubscription?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private titleService: Title
  ) {}

  ngOnInit() {
    console.log('🟢 [ProfileComponent] ngOnInit - Iniciando componente');
    console.log('🟢 [ProfileComponent] URL actual:', window.location.href);
    
    this.titleService.setTitle('Mi Perfil - Different Roads');
    
    // Monitorear eventos de navegación
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        console.log('🟢 [ProfileComponent] Router NavigationEnd:', {
          url: event.url,
          urlAfterRedirects: event.urlAfterRedirects,
          isProfileRoute: event.urlAfterRedirects.startsWith('/profile/')
        });
        
        // Si volvemos al perfil, loggearlo
        if (event.urlAfterRedirects.startsWith('/profile/')) {
          console.log('🟢 [ProfileComponent] ⚠️ Regresando al perfil desde:', window.location.href);
        }
      });
    
    // Suscribirse a cambios en los parámetros de la ruta
    this.routeSubscription = this.route.paramMap.subscribe(params => {
      const routeUserId = params.get('userId');
      console.log('🟢 [ProfileComponent] route.paramMap cambió, userId:', routeUserId);
      this.userId = routeUserId ? routeUserId : '';
    });
    
    console.log('🟢 [ProfileComponent] ngOnInit completado');
  }

  ngOnDestroy() {
    console.log('🟢 [ProfileComponent] ngOnDestroy - Destruyendo componente');
    // Limpiar suscripciones para evitar memory leaks
    this.routeSubscription.unsubscribe();
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  /**
   * Método para recargar la sección de puntos
   * Puede ser llamado desde componentes hijos
   */
  public reloadPointsSection(): void {
    if (this.pointsSection) {
      this.pointsSection.reloadData();
    }
  }
}