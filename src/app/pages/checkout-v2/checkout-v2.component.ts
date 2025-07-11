import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TourNetService } from '../../core/services/tourNet.service';

@Component({
  selector: 'app-checkout-v2',
  standalone: false,
  templateUrl: './checkout-v2.component.html',
  styleUrl: './checkout-v2.component.scss'
})
export class CheckoutV2Component implements OnInit {
  // Datos del tour
  tourName: string = '';
  departureDate: string = '';
  returnDate: string = '';
  departureId: number | null = null;
  loading: boolean = false;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tourNetService: TourNetService
  ) {}

  ngOnInit(): void {
    // Obtener el departureId de la URL
    this.route.paramMap.subscribe(params => {
      const departureIdParam = params.get('departureId');
      if (departureIdParam) {
        this.departureId = +departureIdParam;
        
        // Intentar obtener datos del history state
        const state = window.history.state;
        if (state && state.tourName) {
          this.tourName = state.tourName || '';
          this.departureDate = state.departureDate || '';
          this.returnDate = state.returnDate || '';
        } else {
          // Si no hay datos en el history state, cargarlos desde un servicio
          this.loadTourDataByDepartureId(this.departureId);
        }
      }
    });
  }

  // Método para cargar datos del tour por departureId
  private loadTourDataByDepartureId(departureId: number): void {
    this.loading = true;
    this.error = null;
    
    // Aquí implementarías la llamada al servicio para obtener los datos del tour
    // por el departureId. Por ejemplo:
    
    // this.tourNetService.getDepartureById(departureId).subscribe(
    //   (departure) => {
    //     this.tourName = departure.tourName;
    //     this.departureDate = departure.departureDate;
    //     this.returnDate = departure.returnDate;
    //     this.loading = false;
    //   },
    //   (error) => {
    //     console.error('Error al cargar los datos del tour:', error);
    //     this.error = 'Error al cargar los datos del tour. Por favor, inténtalo de nuevo más tarde.';
    //     this.loading = false;
    //   }
    // );
    
    // Por ahora, simplemente mostramos un mensaje en la consola
    console.log('Cargando datos del tour para departureId:', departureId);
    this.loading = false;
  }

  // Método para formatear la fecha
  formatDate(dateString: string): string {
    if (!dateString) return '';
    
    try {
      const dateParts = dateString.split('-'); // Ejemplo: "2025-07-23" -> ["2025", "07", "23"]
      
      if (dateParts.length !== 3) return dateString;
      
      const year = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]) - 1; // Los meses en JS van de 0-11
      const day = parseInt(dateParts[2]);
      
      // Crear fecha SIN zona horaria para evitar cambios de día
      const date = new Date(year, month, day);
      
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  }
}
