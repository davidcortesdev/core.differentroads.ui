import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Bookingsv2Component } from './bookings.component';

describe('Bookingsv2Component', () => {
  let component: Bookingsv2Component;
  let fixture: ComponentFixture<Bookingsv2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Bookingsv2Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Bookingsv2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
