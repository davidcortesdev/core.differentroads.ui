import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TourAdditionalInfoComponent } from './tour-additional-info.component';

describe('TourAdditionalInfoComponent', () => {
  let component: TourAdditionalInfoComponent;
  let fixture: ComponentFixture<TourAdditionalInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TourAdditionalInfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TourAdditionalInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
