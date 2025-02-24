import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TravelersInformationSectionComponent } from './travelers-information-section.component';

describe('TravelersInformationSectionComponent', () => {
  let component: TravelersInformationSectionComponent;
  let fixture: ComponentFixture<TravelersInformationSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TravelersInformationSectionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TravelersInformationSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
