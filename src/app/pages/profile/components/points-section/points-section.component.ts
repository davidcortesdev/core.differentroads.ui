import { Component, OnInit } from '@angular/core';
import { PointsService } from '../../../../core/services/points.service';
import { GeneralConfigService } from '../../../../core/services/general-config.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  PointsSection,
  PointsCard,
} from '../../../../core/models/general/points-sections.model';
import { AuthenticateService } from '../../../../core/services/auth-service.service';
import { UsersService } from '../../../../core/services/users.service';

interface PointsRecord {
  booking: string;
  category: string;
  concept: string;
  tour: string;
  points: number;
}

interface MembershipCard {
  type: string;
  title: string;
  image: string;
  benefits: any;
  unlocked: boolean;
  isCurrent: boolean;
  requirement: string;
  minTrips: number;
  maxTrips?: number;
  remainingTrips?: number;
}

@Component({
  selector: 'app-points-section',
  standalone: false,
  templateUrl: './points-section.component.html',
  styleUrls: ['./points-section.component.scss'],
})
export class PointsSectionComponent implements OnInit {
  points: PointsRecord[] = [];
  showTable: boolean = false;
  totalPoints: number = 0;
  membershipCards: MembershipCard[] = [];
  currentTrips: number = 0; // Inicializado en 0, se actualizará con la respuesta
  userEmail: string = '';
  userDni: string = '';
  isLoading: boolean = true;

  constructor(
    private pointsService: PointsService,
    private generalConfigService: GeneralConfigService,
    private sanitizer: DomSanitizer,
    private authService: AuthenticateService,
    private usersService: UsersService
  ) {
    this.points = [];
  }

  ngOnInit(): void {
    // Primero obtenemos el email del usuario autenticado
    this.authService.getUserEmail().subscribe({
      next: (email: string) => {
        console.log('Email del usuario autenticado:', email);
        if (email) {
          this.userEmail = email;
          // Después obtenemos los datos del usuario incluyendo el DNI
          this.getUserDniByEmail(email);
        } else {
          console.warn('No hay usuario autenticado o no se pudo obtener el email');
          this.isLoading = false;
        }
      },
      error: (error) => {
        console.error('Error al obtener el email del usuario:', error);
        this.isLoading = false;
      }
    });
    
    // Cargamos las tarjetas mientras tanto
    this.loadMembershipCards();
  }

  private getUserDniByEmail(email: string): void {
    this.usersService.getUserByEmail(email).subscribe({
      next: (user) => {
        console.log('Datos completos del usuario:', user);
        if (user && user.dni) {
          this.userDni = user.dni;
          console.log('DNI del usuario obtenido:', this.userDni);
          // Una vez que tenemos el DNI, cargamos los puntos
          this.loadPoints();
        } else {
          console.warn('El usuario no tiene DNI registrado');
          this.isLoading = false;
        }
      },
      error: (error) => {
        console.error('Error al obtener el usuario por email:', error);
        this.isLoading = false;
      }
    });
  }

  private loadPoints(): void {
    if (!this.userEmail) {
      console.warn('No se puede cargar los puntos porque el email no está disponible');
      this.isLoading = false;
      return;
    }
    
    console.log('Obteniendo puntos para el email:', this.userEmail);
    
    // Obtener los puntos del usuario
    this.pointsService
      .getPointsByDni(this.userEmail, { page: 1, limit: 1000 })
      .subscribe({
        next: (response: any) => {
          console.log('Respuesta completa de getPointsByDni:', response);
          
          if (response && response.data) {
            this.points = response.data.map((point: any) => ({
              booking: point.extraData?.bookingID || 'N/A',
              category: point.type === 'income' ? 'Acumulación' : 'Redención',
              concept: point.extraData?.concept || point.subType || 'N/A',
              tour: point.extraData?.tourName || 'N/A',
              points: point.points || 0,
            }));
            
            console.log('Puntos procesados:', this.points);
            
            // Obtener el total de puntos directamente de la respuesta
            this.totalPoints = response.totalpoints || 0;
            console.log('Total de puntos:', this.totalPoints);
            
            // Obtener la cantidad de viajes que ha realizado el usuario
            if (response.trips !== undefined) {
              this.currentTrips = response.trips;
              console.log('Cantidad de viajes completados:', this.currentTrips);
            }
            
            // Capturar el tipo de viajero de la respuesta
            if (response.typetraveler) {
              console.log('Tipo de viajero obtenido:', response.typetraveler);
              // Actualizar las tarjetas para marcar la tarjeta correcta como actual
              this.updateCurrentMembershipCard(response.typetraveler);
            }
            
            // Actualizar las tarjetas con la información de viajes completados
            this.updateCardsByTrips();
          } else {
            console.warn('La respuesta no contiene datos de puntos válidos');
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error al obtener los puntos:', error);
          // En caso de error, intentamos obtener al menos el total de puntos
          this.loadTotalPoints();
          this.isLoading = false;
        },
        complete: () => {
          console.log('Petición de puntos completada');
        }
      });
  }
  
  private updateCardsByTrips(): void {
    // Actualizar el estado de desbloqueo de las tarjetas basado en los viajes
    this.membershipCards.forEach(card => {
      // Una tarjeta está desbloqueada si el usuario tiene suficientes viajes
      const isUnlockedByTrips = this.currentTrips >= card.minTrips;
      
      // Solo actualizamos el estado si no ha sido marcada como actual por el tipo de viajero
      if (!card.isCurrent) {
        card.unlocked = isUnlockedByTrips;
      }
      
      // Actualizar la cantidad de viajes restantes
      card.remainingTrips = isUnlockedByTrips 
        ? 0 
        : card.minTrips - this.currentTrips;
    });
  }
  
  private updateCurrentMembershipCard(typeTraveler: string): void {
    // Actualizar las tarjetas basado en el tipo de viajero recibido
    this.membershipCards.forEach(card => {
      if (card.title === typeTraveler) {
        card.unlocked = true;
        card.isCurrent = true;
      }
    });
  }

  private loadTotalPoints(): void {
    if (!this.userEmail) {
      return;
    }
    
    this.pointsService.getTotalPointsByDni(this.userEmail).subscribe({
      next: (total: number) => {
        console.log('Total de puntos obtenido con getTotalPointsByDni:', total);
        this.totalPoints = total;
      },
      error: (error) => {
        console.error('Error al obtener el total de puntos:', error);
      }
    });
  }

  private loadMembershipCards(): void {
    const cardConfigs = [
      {
        title: 'Globetrotter',
        minTrips: 1,
        maxTrips: 3,
        type: 'Viajero',
      },
      {
        title: 'Voyager',
        minTrips: 3,
        maxTrips: 6,
        type: 'Viajero',
      },
      {
        title: 'Nomad',
        minTrips: 6,
        maxTrips: undefined,
        type: 'Viajero',
      },
    ];

    this.generalConfigService
      .getPointsSection()
      .subscribe({
        next: (response: PointsSection) => {
          console.log('Respuesta de getPointsSection:', response);
          
          this.membershipCards = cardConfigs
            .map((config) => {
              const card = response['points-cards'].find(
                (c) => c.name === config.title
              );
              if (!card) return null;
              
              return {
                type: config.type,
                title: config.title,
                image: card['point-image'][0].url,
                benefits: this.sanitizeHtml(card.content),
                unlocked: false,
                isCurrent: false,
                requirement: !config.maxTrips
                  ? `${config.minTrips} viajes en adelante`
                  : `${config.minTrips} - ${config.maxTrips} viajes`,
                minTrips: config.minTrips,
                maxTrips: config.maxTrips,
                remainingTrips: 0, // Se actualizará cuando tengamos los datos reales
              };
            })
            .filter((card) => card !== null);
          
          console.log('Tarjetas de membresía procesadas:', this.membershipCards);
        },
        error: (error) => {
          console.error('Error al obtener las tarjetas de membresía:', error);
        }
      });
  }

  private sanitizeHtml(content: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(content);
  }

  getCardClass(card: MembershipCard): string {
    if (!card.unlocked) return 'locked-card';
    return card.isCurrent ? 'current-card' : 'unlocked-card';
  }

  getRemainingTripsText(card: MembershipCard): string {
    if (card.isCurrent) {
      return 'Nivel Actual';
    } else if (card.unlocked) {
      return 'Desbloqueado';
    } else {
      const requiredTrips = card.minTrips;
      return `${this.currentTrips} de ${requiredTrips} viajes completados`;
    }
  }

  toggleTable(): void {
    this.showTable = !this.showTable;
    console.log('Estado de la tabla:', this.showTable ? 'Visible' : 'Oculta');
  }
}