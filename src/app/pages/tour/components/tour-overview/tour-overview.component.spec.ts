import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TourOverviewComponent } from './tour-overview.component';

describe('TourOverviewComponent', () => {
  let component: TourOverviewComponent;
  let fixture: ComponentFixture<TourOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TourOverviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TourOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});