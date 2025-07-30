import { Component, OnInit } from '@angular/core';
import { IReservationResponse, ReservationService } from '../../../../core/services/reservation/reservation.service';
import { ActivatedRoute } from '@angular/router';
import { IPaymentResponse, IPaymentStatusResponse, PaymentsNetService, PaymentStatusFilter } from '../../services/paymentsNet.service';
import { NewScalapayService } from '../../services/newScalapay.service';
import { MessageService } from 'primeng/api';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-new-reservation',
  standalone: false,

  templateUrl: './new-reservation.component.html',
  styleUrl: './new-reservation.component.scss'
})
export class NewReservationComponent implements OnInit {
  reservationId: number = 0;
  reservation: IReservationResponse | undefined;

  //SACAR y Tipar
  user: any;
  payment: any;
  paymentId: number = 0;
  paymentStatus: string = '';
  paymentMethod: string = '';
  status: string = '';
  travelers: any[] = [];
  successId = 0;
  failedId = 0;
  pendingId = 0;
  //Hasta aqui

  loading: boolean = true;
  error: boolean = false;


  constructor(private route: ActivatedRoute, private reservationService: ReservationService, private paymentService: PaymentsNetService, private scalapayService: NewScalapayService, private messageService: MessageService) { }

  ngOnInit(): void {
    console.log("NewReservationComponent initialized");
    this.route.params.subscribe((params) => {
      this.reservationId = params['reservationId'];
      this.paymentId = params['paymentId'];
      this.status = params['status'];
    });

    // First load payment statuses, then load reservation
    this.loadPaymentStatuses();
    
  }

  loadPaymentStatuses(): void {
    const successStatus$ = this.paymentService.getStatus({code: "COMPLETED"} as PaymentStatusFilter);
    const failedStatus$ = this.paymentService.getStatus({code: "FAILED"} as PaymentStatusFilter);
    const pendingStatus$ = this.paymentService.getStatus({code: "PENDING"} as PaymentStatusFilter);

    forkJoin({
      success: successStatus$,
      failed: failedStatus$,
      pending: pendingStatus$
    }).subscribe({
      next: (statuses) => {
        // Validate arrays are not empty before accessing [0]
        if (statuses.success && statuses.success.length > 0) {
          this.successId = statuses.success[0].id;
        } else {
          console.error('SUCCESS status not found');
        }
        
        if (statuses.failed && statuses.failed.length > 0) {
          this.failedId = statuses.failed[0].id;
        } else {
          console.error('FAILED status not found');
        }
        
        if (statuses.pending && statuses.pending.length > 0) {
          this.pendingId = statuses.pending[0].id;
        } else {
          console.error('PENDING status not found');
        }

        // Only load reservation after payment statuses are loaded
        this.loadReservation();
      },
      error: (error) => {
        console.error('Error loading payment statuses:', error);
        this.error = true;
        this.loading = false;
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Error', 
          detail: 'Error loading payment statuses' 
        });
      }
    });
  }

  loadReservation(): void {
    this.reservationService.getById(this.reservationId).subscribe((reservation) => {
      this.reservation = reservation;
      this.loading = false;
    }, (error) => {
      this.error = true;
      this.loading = false;
    });

    this.loadPayment();
    // this.loadUser();
    // this.loadTravelers();
  }

  loadPayment(): void {
    this.paymentService.getPaymentById(this.paymentId).subscribe((payment: IPaymentResponse) => {
      this.payment = payment;
      console.log(this.payment);
      if(this.payment.paymentStatusId === this.pendingId) {
        this.captureOrder();
      } else if(this.payment.paymentStatusId === this.successId) {
        this.status = 'SUCCESS';
      } else if(this.payment.paymentStatusId === this.failedId) {
        this.status = 'FAILED';
      }
    });

    
  }
  //De aqui sacar paymentStatus.name
  //De aqui sacar paymentMethod.name

  // loadUser(): void {
  //   this.userService.getUserById(this.reservation?.userId).subscribe((user) => {
  //     this.user = user;
  //   });
  // }

  captureOrder(): void {
    if (this.payment.transactionReference) {
      this.scalapayService.captureOrder(this.payment.transactionReference).subscribe({
        next: (response: any) => {
          console.log(response);
          this.payment.paymentStatusId = this.successId;
          this.paymentService.update(this.payment).subscribe({
            next: () => {
              this.messageService.add({ severity: 'success', summary: 'Order captured', detail: 'Order captured successfully' });
              this.status = 'SUCCESS';
            },
            error: (updateError) => {
              console.error('Error updating payment:', updateError);
            }
          });
        },
        error: (error: any) => {
          console.error('Error capturing order:', error);
          this.payment.paymentStatusId = this.failedId;
          this.paymentService.update(this.payment).subscribe({
            next: () => {
              this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error capturing order' });
              this.status = 'FAILED';
            },
            error: (updateError) => {
              console.error('Error updating payment:', updateError);
            }
          });
        }
      });
    }
  }

}
