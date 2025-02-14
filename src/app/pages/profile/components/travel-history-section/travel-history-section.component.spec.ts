import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TravelHistorySectionComponent } from './travel-history-section.component';

describe('TravelHistorySectionComponent', () => {
  let component: TravelHistorySectionComponent;
  let fixture: ComponentFixture<TravelHistorySectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TravelHistorySectionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TravelHistorySectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
