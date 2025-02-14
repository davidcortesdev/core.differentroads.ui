import { Component, OnInit } from '@angular/core';

interface TravelHistory {
  bookingNumber: string;
  date: string;
  destination: string;
  departure: string;
  origin: string;
  passengers: number;
}

@Component({
  selector: 'app-travel-history-section',
  standalone: false,
  templateUrl: './travel-history-section.component.html',
  styleUrls: ['./travel-history-section.component.scss'],
})
export class TravelHistorySectionComponent implements OnInit {
  travels: TravelHistory[] = [];
  isExpanded: boolean = true;

  ngOnInit() {
    this.travels = [
      {
        bookingNumber: '64592',
        date: '03/01/2023',
        destination: '4 Perlas Bálticas',
        departure: '10 MAY',
        origin: 'MAD',
        passengers: 2,
      },
      {
        bookingNumber: '60182',
        date: '12/04/2022',
        destination: 'Nepal, namasté desde el techo del mundo',
        departure: '12 AGO',
        origin: 'VLC',
        passengers: 1,
      },
      {
        bookingNumber: '43911',
        date: '06/08/2021',
        destination: 'Bellezas de Japón',
        departure: '21 AGO',
        origin: 'MAD',
        passengers: 2,
      },
    ];
  }

  toggleContent() {
    this.isExpanded = !this.isExpanded;
  }
}
