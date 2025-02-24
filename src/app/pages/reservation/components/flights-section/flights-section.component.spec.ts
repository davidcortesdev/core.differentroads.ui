import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FlightsSectionComponent } from './flights-section.component';

describe('FlightsSectionComponent', () => {
  let component: FlightsSectionComponent;
  let fixture: ComponentFixture<FlightsSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FlightsSectionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FlightsSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
