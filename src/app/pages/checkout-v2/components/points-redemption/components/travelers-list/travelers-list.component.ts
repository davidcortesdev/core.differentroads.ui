import { Component, Input, Output, EventEmitter } from '@angular/core';

export interface Traveler {
  id: string;
  name: string;
  email?: string;
  hasEmail: boolean;
  maxPoints: number;
  assignedPoints: number;
}

@Component({
  selector: 'app-travelers-list',
  templateUrl: './travelers-list.component.html',
  styleUrls: ['./travelers-list.component.scss'],
  standalone: false
})
export class TravelersListComponent {
  @Input() travelers: Traveler[] = [];
  @Input() maxAllowedPoints: number = 0;
  @Input() travelerMaxPoints: { [key: string]: number } = {};
  @Input() canAssignPoints: { [key: string]: boolean } = {};

  @Output() travelerPointsChange = new EventEmitter<{ travelerId: string; points: number }>();
  @Output() distributeEqually = new EventEmitter<void>();

  /**
   * Obtiene los puntos asignados a un viajero
   */
  getTravelerAssignedPoints(travelerId: string): number {
    const traveler = this.travelers.find(t => t.id === travelerId);
    return traveler?.assignedPoints || 0;
  }

  /**
   * Obtiene el máximo de puntos que puede recibir un viajero
   */
  getTravelerMaxPoints(travelerId: string): number {
    return this.travelerMaxPoints[travelerId] || 0;
  }

  /**
   * Obtiene el máximo fijo de puntos por persona para mostrar en la UI
   */
  getTravelerMaxPointsDisplay(travelerId: string): number {
    const traveler = this.travelers.find(t => t.id === travelerId);
    return traveler?.maxPoints || 0;
  }

  /**
   * Valida si se puede asignar la cantidad de puntos especificada a un viajero
   */
  canAssignPointsToTraveler(travelerId: string, points: number): boolean {
    return this.canAssignPoints[travelerId] !== false;
  }

  /**
   * Maneja el cambio de puntos de un viajero
   */
  onTravelerPointsBlur(travelerId: string, event: any): void {
    const inputValue = event.value || event.target?.value || 0;
    const points = Math.max(0, parseFloat(inputValue) || 0);
    
    this.travelerPointsChange.emit({ travelerId, points });
  }

  /**
   * Maneja la distribución equitativa
   */
  onDistributeEqually(): void {
    this.distributeEqually.emit();
  }
}
