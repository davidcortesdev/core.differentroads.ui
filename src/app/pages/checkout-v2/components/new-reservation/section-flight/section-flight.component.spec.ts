import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SectionFlightComponent } from './section-flight.component';

describe('SectionFlightComponent', () => {
  let component: SectionFlightComponent;
  let fixture: ComponentFixture<SectionFlightComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SectionFlightComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SectionFlightComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
