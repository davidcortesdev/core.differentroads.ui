import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { of,from } from 'rxjs';
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
  private authSubscription?: Subscription;

  constructor(
    private titleService: Title,
    private authenticateService: AuthenticateService,
    private usersNetService: UsersNetService
  ) {}

  ngOnInit() {
    this.titleService.setTitle('Mi Perfil - Different Roads');
    
    // Obtener el userId del usuario logueado a través del cognitoSub
    this.authSubscription = from(this.authenticateService.getCognitoSub()).pipe(
      switchMap(cognitoSub => {
        if (!cognitoSub) {
          console.warn('⚠️ No se encontró Cognito Sub');
          return of([]);
        }
        this.cognitoId = cognitoSub;
        // Buscar el usuario por Cognito ID para obtener su ID en la base de datos
        return this.usersNetService.getUsersByCognitoId(cognitoSub);
      }),
      map((users: IUserResponse[]) => {
        // Extraer el userId del primer usuario encontrado
        const userId = users && users.length > 0 ? users[0].id : null;
        return userId ? userId.toString() : '';
      }),
      catchError(error => {
        console.error('Error obteniendo el usuario:', error);
        return of(''); // Retornar string vacío en caso de error
      })
    ).subscribe({
      next: (userId) => {
        this.userId = userId;
        this.isLoadingUserId = false;
      },
      error: (error) => {
        console.error('Error crítico en la obtención del usuario:', error);
        this.isLoadingUserId = false;
        // El userId permanecerá como string vacío, activando el estado de error
      }
    });
  }

  ngOnDestroy() {
    // Limpiar suscripciones para evitar memory leaks
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
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