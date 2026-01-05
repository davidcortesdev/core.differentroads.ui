// summary-info.component.ts
import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
  OnDestroy,
} from '@angular/core';
import { Subject, takeUntil, catchError, EMPTY } from 'rxjs';
import { MessageService } from 'primeng/api';
import {
  ReservationService,
  IReservationSummaryResponse,
  ReservationSummaryItem,
} from '../../../../../core/services/reservation/reservation.service';

@Component({
  selector: 'app-summary-info',
  standalone: false,
  templateUrl: './summary-info.component.html',
  styleUrl: './summary-info.component.scss',
  providers: [MessageService],
})
export class SummaryInfoComponent implements OnInit, OnChanges, OnDestroy {
  @Input() reservationId: number | undefined;

  private destroy$: Subject<void> = new Subject<void>();

  loading: boolean = false;
  error: boolean = false;

  priceDetails: ReservationSummaryItem[] = [];
  reservationSummary: IReservationSummaryResponse | undefined;

  get totalPrice(): number {
    return this.reservationSummary?.totalAmount || 0;
  }

  constructor(
    private reservationService: ReservationService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    if (this.reservationId) {
      this.loadReservationSummary();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['reservationId'] && this.reservationId) {
      this.loadReservationSummary();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadReservationSummary(): void {
    if (!this.reservationId) {
      return;
    }

    this.loading = true;
    this.error = false;

    this.reservationService
      .getSummary(this.reservationId)
      .pipe(
        takeUntil(this.destroy$),
        catchError((err) => {
          this.error = true;
          this.loading = false;
          return EMPTY;
        })
      )
      .subscribe({
        next: (summary: IReservationSummaryResponse) => {
          this.reservationSummary = summary;
          this.priceDetails = summary.items || [];
          this.loading = false;
        },
      });
  }
}
