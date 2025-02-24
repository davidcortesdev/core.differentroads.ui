import { Component, OnInit } from '@angular/core';

interface TravelerInfo {
  name: string;
  email: string;
  phone: string;
  gender: string;
  room: string;
}

interface Flight {
  date: string;
  airline: {
    name: string;
    logo: string;
  };
  departure: {
    time: string;
    airport: string;
  };
  arrival: {
    time: string;
    airport: string;
  };
  duration: string;
  flightNumber: string;
  type: 'direct' | 'layover';
  layoverCity?: string;
}

interface PriceDetail {
  description: string;
  amount: number;
  quantity: number;
  total: number;
}

interface PaymentInfo {
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  lastPaymentDate: string;
  lastPaymentDetails: string;
  nextPaymentDetails: string;
}

interface BankInfo {
  name: string;
  account: string;
  beneficiary: string;
  concept: string;
}

interface ReservationInfo {
  status: 'confirm' | 'rq' | 'transfer';
  reservationNumber: string;
  date: string;
  amount: string;
  customerName: string;
  tripDetails: {
    destination: string;
    period: string;
    travelers: string;
  };
  travelers: TravelerInfo[];
}

@Component({
  selector: 'app-reservation',
  standalone: false,
  templateUrl: './reservation.component.html',
  styleUrls: ['./reservation.component.scss'],
})
export class ReservationComponent implements OnInit {
  reservationInfo: ReservationInfo = {
    status: 'transfer',
    reservationNumber: '#80276',
    date: '28/11/2024',
    amount: '200€',
    customerName: 'Laura Segarra',
    tripDetails: {
      destination: 'Nepal, namasté desde el techo del mundo',
      period: '02/03/2025 - 12/03/2025',
      travelers: '2 Adultos',
    },
    travelers: [
      {
        name: 'Laura Segarra Marín',
        email: 'lsegarra@differentroads.es',
        phone: '+34 638 815 010',
        gender: 'Femenino (mujer)',
        room: 'Individual',
      },
      {
        name: 'Patricia Sanchis Alcaraz',
        email: 'lsegarra@differentroads.es',
        phone: '+34 638 815 010',
        gender: 'Femenino (mujer)',
        room: 'Individual',
      },
    ],
  };

  bankInfo: BankInfo[] = [
    {
      name: 'CaixaBank, S.A',
      account: 'ES35 2100 1463 1702 0013 5710',
      beneficiary: 'Different Roads S.L',
      concept: '784932 Laura Segarra',
    },
    {
      name: 'Banco Santander',
      account: 'ES35 2100 1463 1702 0013 5710',
      beneficiary: 'Different Roads S.L',
      concept: '784932 Laura Segarra',
    },
  ];

  flights: Flight[] = [
    {
      date: '02/03/2025',
      airline: {
        name: 'QATAR Airways',
        logo: 'https://picsum.photos/id/1/200/300',
      },
      departure: {
        time: '01:15',
        airport: 'DOH',
      },
      arrival: {
        time: '01:15',
        airport: 'DOH',
      },
      duration: '14 h',
      flightNumber: 'QR648',
      type: 'layover',
      layoverCity: 'Loremipsum',
    },
    {
      date: '12/03/2025',
      airline: {
        name: 'QATAR Airways',
        logo: 'https://picsum.photos/id/1/200/300',
      },
      departure: {
        time: '01:15',
        airport: 'DOH',
      },
      arrival: {
        time: '01:15',
        airport: 'DOH',
      },
      duration: '14 h',
      flightNumber: 'QR648',
      type: 'direct',
    },
  ];

  priceDetails: PriceDetail[] = [
    {
      description: 'Precio base',
      amount: 600,
      quantity: 2,
      total: 1200,
    },
    {
      description: 'Suplemento individual',
      amount: 250,
      quantity: 2,
      total: 500,
    },
    {
      description: 'Paseo en lago kawaguchi',
      amount: 250,
      quantity: 2,
      total: 345,
    },
    {
      description: 'Suplemento ciudad salida',
      amount: 1000,
      quantity: 2,
      total: 1345,
    },
  ];

  paymentInfo: PaymentInfo = {
    totalAmount: 3595,
    paidAmount: 1200,
    remainingAmount: 2395,
    lastPaymentDate: '16/12/2024',
    lastPaymentDetails: 'Pago de 200€ a través de la web',
    nextPaymentDetails: 'Antes del 6/01/2025 de 725€',
  };

  get totalPrice(): number {
    return this.priceDetails.reduce((sum, item) => sum + item.total, 0);
  }

  constructor() {}

  ngOnInit() {}
}
