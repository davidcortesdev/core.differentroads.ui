import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AnalyticsService } from '../../../../core/services/analytics.service';
import { AuthenticateService } from '../../../../core/services/auth-service.service';

interface TripType {
  title: string;
  description: string;
  class: string;
  value: string;
}

@Component({
  selector: 'app-trip-types-section-v2',
  standalone: false,
  templateUrl: './trip-types-section-v2.component.html',
  styleUrls: ['./trip-types-section-v2.component.scss'],
})
export class TripTypesSectionV2Component {
  tripTypes: TripType[] = [
    {
      title: 'En grupo',
      description: 'Viajes para todos: solos, con amigos o en pareja',
      class: 'group',
      value: 'Grupo',
    },
    {
      title: 'Singles',
      description: 'Viaja solo y conoce a gente nueva',
      class: 'singles',
      value: 'Singles',
    },
    {
      title: 'Privados',
      description: 'Viajes a medida para ti y los tuyos',
      class: 'private',
      value: 'private',
    },
  ];

  constructor(
    private router: Router,
    private analyticsService: AnalyticsService,
    private authService: AuthenticateService
  ) {}

  navigateToTripType(type: string): void {
    // Disparar evento trip_type
    this.onTripTypeClick(type);
    
    this.router.navigate(['/tours'], {
      queryParams: { tripType: type },
    });
  }

  /**
   * Disparar evento trip_type cuando el usuario hace clic en tipos de viaje
   */
  onTripTypeClick(clickElement: string): void {
    this.analyticsService.tripType(
      clickElement,
      this.getUserData()
    );
  }

  /**
   * Obtener datos del usuario para analytics
   */
  private getUserData() {
    if (this.authService.isAuthenticatedValue()) {
      return this.analyticsService.getUserData(
        this.authService.getUserEmailValue(),
        undefined, // No tenemos teléfono en este componente
        this.authService.getCognitoIdValue()
      );
    }
    return undefined;
  }
}
