import { Component, OnInit } from '@angular/core';
import { PointsService } from '../../../../core/services/points.service';
import { GeneralConfigService } from '../../../../core/services/general-config.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  PointsSection,
} from '../../../../core/models/general/points-sections.model';
import { AuthenticateService } from '../../../../core/services/auth-service.service';
import { UsersService } from '../../../../core/services/users.service';

interface PointsRecord {
  booking: string;
  category: string;
  concept: string;
  tour: string;
  points: number;
  type: string; // 'income' o 'redemption'
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
  statusText: string; // Para el texto "Desbloqueado" o "x de y viajes completados"
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
  currentTrips: number = 0;
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
    // Get authenticated user's email
    this.authService.getUserEmail().subscribe({
      next: (email: string) => {
        if (email) {
          this.userEmail = email;
          // Load points directly using email
          this.loadPoints();
        } else {
          this.isLoading = false;
        }
      },
      error: (error) => {
        console.error('Error getting user email:', error);
        this.isLoading = false;
      }
    });
    
    // Cargamos las tarjetas mientras tanto
    this.loadMembershipCards();
  }


  private loadPoints(): void {
    if (!this.userEmail) {
      this.isLoading = false;
      return;
    }
    
    console.log('Iniciando obtención de puntos para el usuario:', this.userEmail);

    // Obtener los puntos del usuario
    this.pointsService
      .getPointsByDni(this.userEmail, { page: 1, limit: 1000 })
      .subscribe({
        next: (response: any) => {
          console.log('Respuesta de puntos:', response);
          if (response && response.data) {
            this.points = response.data.map((point: any) => ({
              booking: point.extraData?.bookingID || 'N/A',
              category: point.category,
              concept: point.concept,
              tour: point.extraData?.tourName || 'N/A',
              points: point.points || 0,
              type: point.type || 'income', // Por defecto asumimos income si no viene tipo
            }));
            
            console.log('Puntos mapeados:', this.points);
            
            // Obtener el total de puntos directamente de la respuesta
            this.totalPoints = response.totalpoints || 0;
            console.log('Total de puntos:', this.totalPoints);
            // Obtener la cantidad de viajes desde count
            if (response.count !== undefined) {
              this.currentTrips = response.count;
            } else if (response.trips !== undefined) {
              // Fallback a trips si count no está disponible
              this.currentTrips = response.trips;
            }
            console.log('Cantidad de viajes:', this.currentTrips);
            
            // Actualizar las tarjetas con la información de viajes 
            this.updateCardsByCount();
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error obteniendo puntos:', error);
          // En caso de error, intentamos obtener al menos el total de puntos
          this.loadTotalPoints();
          this.isLoading = false;
        },
        complete: () => {
        }
      });
  }  

  private updateCardsByCount(): void {
    // Actualizar el estado de todas las tarjetas basado en la cantidad de viajes (count)
    this.membershipCards.forEach(card => {
      // Una tarjeta está desbloqueada si el usuario tiene suficientes viajes
      card.unlocked = this.currentTrips >= card.minTrips;
      
      // Una tarjeta es la actual si la cantidad de viajes está dentro de su rango
      card.isCurrent = this.currentTrips >= card.minTrips && 
                       (card.maxTrips === undefined || this.currentTrips < card.maxTrips);
      
      // Actualizar el tipo según el estado actual
      if (card.isCurrent) {
        card.type = 'Enhorabuena, ya eres viajero:';
      } else {
        card.type = 'Viajero';
      }
    });
  }

  private loadTotalPoints(): void {
    if (!this.userEmail) {
      return;
    }
    
    this.pointsService.getTotalPointsByDni(this.userEmail).subscribe({
      next: (total: number) => {
        this.totalPoints = total;
        console.log('Total de puntos:', total);
      },
      error: (error) => {
      }
    });
  }

  private loadMembershipCards(): void {
    this.generalConfigService
      .getPointsSection()
      .subscribe({
        next: (response: PointsSection) => {
          // Verificar que tenemos las tarjetas de puntos
          if (response['points-cards'] && response['points-cards'].length > 0) {
            // Ordenar las tarjetas por minTravels para asegurarnos de que estén en orden ascendente
            const sortedCards = [...response['points-cards']].sort((a, b) => {
              const minA = parseInt(a.minTravels) || 0;
              const minB = parseInt(b.minTravels) || 0;
              return minA - minB;
            });
            
            // Transformar las PointsCard en MembershipCard
            this.membershipCards = sortedCards.map((card, index, array) => {
              // Convertir minTravels a número
              const minTrips = parseInt(card.minTravels) || 0;
              
              // Determinar maxTrips: 
              // - Si hay una siguiente tarjeta, maxTrips es el minTravels de esa tarjeta
              // - Si es la última tarjeta, maxTrips es undefined (sin límite)
              let maxTrips: number | undefined;
              if (index < array.length - 1) {
                maxTrips = parseInt(array[index + 1].minTravels) || undefined;
              }
              
              // Si maxTravels está definido en la tarjeta, usamos ese valor
              if (card.maxTravels && card.maxTravels !== '' && !isNaN(Number(card.maxTravels))) {
                maxTrips = parseInt(card.maxTravels.toString());
              }
              
              // Generar el texto del requisito
              const requirement = !maxTrips
                ? `${minTrips} viajes en adelante`
                : `${minTrips} - ${maxTrips} viajes`;
              
              // Por defecto todas las tarjetas muestran "Viajero" como tipo
              return {
                type: 'Viajero',
                title: card.name,
                image: card['point-image'][0]?.url || '',
                benefits: this.sanitizeHtml(card.content),
                unlocked: false, // Se actualizará después con updateCardsByCount
                isCurrent: false, // Se actualizará después con updateCardsByCount
                requirement: requirement,
                minTrips: minTrips,
                maxTrips: maxTrips,
                remainingTrips: minTrips, // Valor inicial, se actualizará después
                statusText: 'Desbloqueado' // Valor inicial, se actualizará después
              };
            });
            
            // Si ya tenemos la cantidad de viajes, actualizamos los estados de las tarjetas
            if (this.currentTrips > 0) {
              this.updateCardsByCount();
            }
          }
        },
        error: (error) => {
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
    if (card.unlocked) {
      return 'Desbloqueado';
    } else {
      const requiredTrips = card.minTrips;
      return `${this.currentTrips} de ${requiredTrips} viajes completados`;
    }
  }

  // Nuevo método para formatear los puntos con el símbolo + o - según el tipo
  getFormattedPoints(point: PointsRecord): string {
    if (point.type === 'redemption') {
      return `- ${point.points}`;
    } else {
      return `+ ${point.points}`;
    }
  }

  // Método para obtener la clase CSS según el tipo de punto (para colorear)
  getPointsClass(type: string): string {
    return type === 'redemption' ? 'redemption-points' : 'income-points';
  }

  toggleTable(): void {
    this.showTable = !this.showTable;
  }
}