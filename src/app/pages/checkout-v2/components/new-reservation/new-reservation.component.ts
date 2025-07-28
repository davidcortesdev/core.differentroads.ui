import { Component, OnInit } from '@angular/core';
import { IReservationResponse, ReservationService } from '../../../../core/services/reservation/reservation.service';
import { ActivatedRoute } from '@angular/router';
import { IPaymentResponse, PaymentsNetService } from '../../services/paymentsNet.service';
import { NewScalapayService } from '../../services/newScalapay.service';
import { MessageService } from 'primeng/api';

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
  travelers: any[] = [];
  //Hasta aqui

  loading: boolean = true;
  error: boolean = false;


  constructor(private route: ActivatedRoute, private reservationService: ReservationService, private paymentService: PaymentsNetService, private scalapayService: NewScalapayService, private messageService: MessageService) { }

  ngOnInit(): void {
    //TODO: Capturar order 
    console.log("NewReservationComponent initialized");
    this.route.params.subscribe((params) => {
      this.reservationId = params['reservationId'];
      this.paymentId = params['paymentId'];
    });

    this.loadReservation();
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
    });

    this.captureOrder();
  }
  //De aqui sacar paymentStatus.name
  //De aqui sacar paymentMethod.name

  // loadUser(): void {
  //   this.userService.getUserById(this.reservation?.userId).subscribe((user) => {
  //     this.user = user;
  //   });
  // }

  captureOrder(): void {
    this.scalapayService.captureOrder(this.payment.transactionReference).subscribe((response: any) => {
      console.log(response);
      this.messageService.add({ severity: 'success', summary: 'Order captured', detail: 'Order captured successfully' });
    });
  }

}
