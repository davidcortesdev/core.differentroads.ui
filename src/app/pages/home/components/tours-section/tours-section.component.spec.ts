import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ToursSectionComponent } from './tours-section.component';

describe('ToursSectionComponent', () => {
  let component: ToursSectionComponent;
  let fixture: ComponentFixture<ToursSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ToursSectionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ToursSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
