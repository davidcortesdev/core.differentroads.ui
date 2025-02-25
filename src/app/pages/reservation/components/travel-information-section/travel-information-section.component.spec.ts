import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TravelInformationSectionComponent } from './travel-information-section.component';

describe('TravelInformationSectionComponent', () => {
  let component: TravelInformationSectionComponent;
  let fixture: ComponentFixture<TravelInformationSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TravelInformationSectionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TravelInformationSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
