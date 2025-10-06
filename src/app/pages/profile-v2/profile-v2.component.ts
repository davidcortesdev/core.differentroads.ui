import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { Title } from '@angular/platform-browser';


@Component({
  selector: 'app-profile-v2',
  standalone: false,
  templateUrl: './profile-v2.component.html',
  styleUrl: './profile-v2.component.scss',
})
export class ProfileV2Component implements OnInit, OnDestroy {
  userId: string = '';
  private routeSubscription: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private titleService: Title
  ) {}

  ngOnInit() {
    this.titleService.setTitle('Mi Perfil - Different Roads');
    // Suscribirse a cambios en los parámetros de la ruta
    this.routeSubscription = this.route.paramMap.subscribe(params => {
      const routeUserId = params.get('userId');
      this.userId = routeUserId ? routeUserId : '';
    });
  }

  ngOnDestroy() {
    // Limpiar suscripción para evitar memory leaks
    this.routeSubscription.unsubscribe();
  }
}