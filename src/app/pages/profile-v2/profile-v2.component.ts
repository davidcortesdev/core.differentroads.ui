import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { of, from } from 'rxjs';
import { Title } from '@angular/platform-browser';
import { PointsSectionV2Component } from './components/points-section-v2/points-section-v2.component';
import { AuthenticateService } from '../../core/services/auth/auth-service.service';
import { UsersNetService } from '../../core/services/users/usersNet.service';
import { IUserResponse } from '../../core/models/users/user.model';

@Component({
  selector: 'app-profile-v2',
  standalone: false,
  templateUrl: './profile-v2.component.html',
  styleUrl: './profile-v2.component.scss',
})
export class ProfileV2Component implements OnInit, OnDestroy {
  @ViewChild('pointsSection') pointsSection?: PointsSectionV2Component;
  
  userId: string = '';
  cognitoId: string = '';
  isLoadingUserId: boolean = true;
  showRedirectMessage: boolean = false;
  idReserva: string = '';
  slugTour: string = '';
  private authSubscription?: Subscription;

  constructor(
    private titleService: Title,
    private authenticateService: AuthenticateService,
    private usersNetService: UsersNetService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.titleService.setTitle('Mi Perfil - Different Roads');
    
    // Verificar si viene desde la URL de completar datos
    this.route.params.subscribe(params => {
      if (params['idreserva'] && params['slug-tour']) {
        this.showRedirectMessage = true;
        this.idReserva = params['idreserva'];
        this.slugTour = params['slug-tour'];
      }
    });
    
    // Obtener el userId del usuario logueado a través del cognitoSub
    this.authSubscription = from(this.authenticateService.getCognitoSub()).pipe(
      switchMap(cognitoSub => {
        if (!cognitoSub) {
          console.warn('⚠️ No se encontró Cognito Sub');
          return of([]);
        }
        this.cognitoId = cognitoSub;
        return this.usersNetService.getUsersByCognitoId(cognitoSub);
      }),
      map((users: IUserResponse[]) => {
        const userId = users && users.length > 0 ? users[0].id : null;
        return userId ? userId.toString() : '';
      }),
      catchError(error => {
        console.error('Error obteniendo el usuario:', error);
        return of('');
      })
    ).subscribe({
      next: (userId) => {
        this.userId = userId;
        this.isLoadingUserId = false;
      },
      error: (error) => {
        console.error('Error crítico en la obtención del usuario:', error);
        this.isLoadingUserId = false;
      }
    });
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  public reloadPointsSection(): void {
    if (this.pointsSection) {
      this.pointsSection.reloadData();
    }
  }

  closeRedirectMessage(): void {
    this.showRedirectMessage = false;
  }
}