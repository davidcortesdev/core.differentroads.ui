import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';

interface RetailerInfo {
  name: string;
  email: string;
/*   phone: string; */
}

@Component({
  selector: 'app-booking-header-section',
  templateUrl: './booking-header-section.component.html',
  styleUrls: ['./booking-header-section.component.scss'],
  standalone: false,
})
export class BookingHeaderSectionComponent implements OnInit {
  @Input() title: string = '';
  @Input() date: string = '';
  @Input() retailerInfo: RetailerInfo = { name: '', email: ''/* , phone: '' */ };
  @Input() showRetailerPanel: boolean = false;

  @Output() backEvent = new EventEmitter<void>();

  constructor() {}

  ngOnInit(): void {}

  goBack(): void {
    this.backEvent.emit();
  }
}
