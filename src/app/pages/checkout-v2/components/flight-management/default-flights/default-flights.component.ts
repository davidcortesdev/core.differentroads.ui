import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
  Output,
  EventEmitter,
  ViewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  FlightsNetService,
  IFlightDetailDTO,
  IFlightPackDTO,
} from '../../../services/flightsNet.service';
import {
  ReservationTravelerService,
  IReservationTravelerResponse,
} from '../../../../../core/services/reservation/reservation-traveler.service';
import {
  ReservationTravelerActivityPackService,
  IReservationTravelerActivityPackResponse,
} from '../../../../../core/services/reservation/reservation-traveler-activity-pack.service';

@Component({
  selector: 'app-default-flights',
  standalone: false,
  templateUrl: './default-flights.component.html',
  styleUrl: './default-flights.component.scss',
})
export class DefaultFlightsComponent implements OnInit, OnChanges {
  @Input() departureId: number | null = null;
  @Input() reservationId: number | null = null;
  @Output() flightSelectionChange = new EventEmitter<{
    selectedFlight: IFlightPackDTO | null;
    totalPrice: number;
  }>();



  selectedFlight: IFlightPackDTO | null = null;
  flightPacks: IFlightPackDTO[] = [];
  loginDialogVisible: boolean = false;
  flightDetails: Map<number, IFlightDetailDTO> = new Map();
  travelers: IReservationTravelerResponse[] = [];

  constructor(
    private router: Router,
    private flightsNetService: FlightsNetService,
    private reservationTravelerService: ReservationTravelerService,
    private reservationTravelerActivityPackService: ReservationTravelerActivityPackService
  ) {}

  ngOnInit(): void {
    this.getFlights();
    this.getTravelers();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['departureId'] &&
      changes['departureId'].currentValue &&
      changes['departureId'].currentValue !==
        changes['departureId'].previousValue
    ) {
      this.getFlights();
    }

    if (
      changes['reservationId'] &&
      changes['reservationId'].currentValue &&
      changes['reservationId'].currentValue !==
        changes['reservationId'].previousValue
    ) {
      this.getTravelers();
    }
  }

  getFlights(): void {
    if (!this.departureId) {
      return;
    }
    this.flightsNetService.getFlights(this.departureId).subscribe((flights) => {
      this.flightPacks = flights;
      this.flightPacks.forEach((pack) => {
        pack.flights.forEach((flight) => {
          this.getFlightDetail(flight.id);
        });
      });
    });
  }

  getTravelers(): void {
    if (!this.reservationId) {
      return;
    }

    this.reservationTravelerService
      .getByReservation(this.reservationId)
      .subscribe({
        next: (travelers) => {
          this.travelers = travelers;
          this.recalculateFlightPrice();
        },
        error: (error) => {
          // Handle error silently or add proper error handling
        },
      });
  }

  private recalculateFlightPrice(): void {
    if (this.selectedFlight) {
      const basePrice = this.selectedFlight.ageGroupPrices.find(
        (price) => price.ageGroupId === this.travelers[0].ageGroupId
      )?.price || 0; //TODO: Añadir al summary los precios segun el ageGroup de los diferentes viajeros , no solo el del leadTraveler
      const totalTravelers = this.travelers.length;
      const totalPrice = totalTravelers > 0 ? basePrice * totalTravelers : 0;

      this.flightSelectionChange.emit({
        selectedFlight: this.selectedFlight,
        totalPrice: basePrice,
      });
    }
  }

  getTravelerInfo(): void {
    if (!this.reservationId) return;

    this.reservationTravelerService
      .getTravelerCount(this.reservationId)
      .subscribe((count) => {
        // Handle count if needed
      });

    this.reservationTravelerService
      .hasLeadTraveler(this.reservationId)
      .subscribe((hasLead) => {
        // Handle hasLead if needed
      });

    this.reservationTravelerService
      .getLeadTraveler(this.reservationId)
      .subscribe((leadTraveler) => {
        if (leadTraveler) {
          // Handle leadTraveler if needed
        }
      });
  }

  selectFlight(flightPack: IFlightPackDTO): void {
    if (this.selectedFlight === flightPack) {
      this.selectedFlight = null;
      this.flightSelectionChange.emit({ selectedFlight: null, totalPrice: 0 });
    } else {
      this.selectedFlight = flightPack;
      const basePrice = flightPack.ageGroupPrices.find(
        (price) => price.ageGroupId === this.travelers[0].ageGroupId
      )?.price || 0; //TODO: Añadir al summary los precios segun el ageGroup de los diferentes viajeros , no solo el del leadTraveler
      const totalTravelers = this.travelers.length;
      const totalPrice = totalTravelers > 0 ? basePrice * totalTravelers : 0;

      this.flightSelectionChange.emit({
        selectedFlight: flightPack,
        totalPrice: basePrice,
      });

      this.saveFlightAssignments()
        .then((success) => {
          if (!success) {
            // Handle error if needed
          }
        })
        .catch((error) => {
          // Handle error if needed
        });
    }
  }

  getFlightDetail(flightId: number): void {
    this.flightsNetService.getFlightDetail(flightId).subscribe((detail) => {
      this.flightDetails.set(flightId, detail);
    });
  }



  refreshData(): void {
    this.getFlights();
    this.getTravelers();
  }

  logTravelerIds(): void {
    const ids = this.travelers.map((t) => t.id);
    // Handle ids if needed
  }

  logLeadTravelerId(): void {
    const leadTraveler = this.travelers.find((t) => t.isLeadTraveler);
    if (leadTraveler) {
      // Handle leadTraveler.id if needed
    }
  }

  closeLoginModal(): void {
    this.loginDialogVisible = false;
  }

  async saveFlightAssignments(): Promise<boolean> {
    if (!this.selectedFlight || !this.reservationId) {
      return true;
    }

    try {
      const travelers = await new Promise<IReservationTravelerResponse[]>(
        (resolve, reject) => {
          this.reservationTravelerService
            .getAll({ reservationId: this.reservationId! })
            .subscribe({
              next: (travelers) => {
                resolve(travelers);
              },
              error: (error) => {
                reject(error);
              },
            });
        }
      );

      if (travelers.length === 0) {
        return true;
      }

      await this.clearExistingFlightAssignments(travelers);

      const activityPackId = this.selectedFlight.id;

      const assignmentPromises = travelers.map((traveler) => {
        return new Promise<boolean>((resolve, reject) => {
          this.reservationTravelerActivityPackService
            .getByReservationTraveler(traveler.id)
            .subscribe({
              next: (
                existingAssignments: IReservationTravelerActivityPackResponse[]
              ) => {
                const existingAssignment = existingAssignments.find(
                  (assignment) => assignment.activityPackId === activityPackId
                );

                if (existingAssignment) {
                  const updateData = {
                    id: existingAssignment.id,
                    reservationTravelerId: traveler.id,
                    activityPackId: activityPackId,
                  };

                  this.reservationTravelerActivityPackService
                    .update(existingAssignment.id, updateData)
                    .subscribe({
                      next: (updated: boolean) => {
                        if (updated) {
                          resolve(true);
                        } else {
                          reject(new Error('Error al actualizar asignación'));
                        }
                      },
                      error: (error: any) => {
                        reject(error);
                      },
                    });
                } else {
                  const assignmentData = {
                    id: 0,
                    reservationTravelerId: traveler.id,
                    activityPackId: activityPackId,
                  };

                  this.reservationTravelerActivityPackService
                    .create(assignmentData)
                    .subscribe({
                      next: (
                        createdAssignment: IReservationTravelerActivityPackResponse
                      ) => {
                        resolve(true);
                      },
                      error: (error: any) => {
                        reject(error);
                      },
                    });
                }
              },
              error: (error: any) => {
                reject(error);
              },
            });
        });
      });

      await Promise.all(assignmentPromises);
      return true;
    } catch (error) {
      return false;
    }
  }

  private async clearExistingFlightAssignments(
    travelers: IReservationTravelerResponse[]
  ): Promise<void> {
    const clearPromises = travelers.map((traveler) => {
      return new Promise<void>((resolve, reject) => {
        this.reservationTravelerActivityPackService
          .getByReservationTraveler(traveler.id)
          .subscribe({
            next: (
              existingAssignments: IReservationTravelerActivityPackResponse[]
            ) => {
              const otherFlightAssignments = existingAssignments.filter(
                (assignment) =>
                  assignment.activityPackId !== this.selectedFlight!.id
              );

              const deletePromises = otherFlightAssignments.map(
                (assignment: IReservationTravelerActivityPackResponse) => {
                  return new Promise<void>((resolveDelete, rejectDelete) => {
                    this.reservationTravelerActivityPackService
                      .delete(assignment.id)
                      .subscribe({
                        next: (deleted: boolean) => {
                          resolveDelete();
                        },
                        error: (error: any) => {
                          resolveDelete();
                        },
                      });
                  });
                }
              );

              Promise.all(deletePromises)
                .then(() => resolve())
                .catch(() => resolve());
            },
            error: (error: any) => {
              resolve();
            },
          });
      });
    });

    await Promise.all(clearPromises);
  }

  navigateToLogin(): void {
    this.closeLoginModal();
    this.router.navigate(['/login']);
  }

  navigateToRegister(): void {
    this.closeLoginModal();
    this.router.navigate(['/sign-up']);
  }
}
