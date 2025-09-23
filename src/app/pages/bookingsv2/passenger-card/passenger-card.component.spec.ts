import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PassengerCardV2Component } from './passenger-card.component';

describe('PassengerCardV2Component', () => {
  let component: PassengerCardV2Component;
  let fixture: ComponentFixture<PassengerCardV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PassengerCardV2Component],
    }).compileComponents();

    fixture = TestBed.createComponent(PassengerCardV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
});
