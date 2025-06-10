import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TourMapV2Component } from './tour-map-v2.component';

describe('TourMapV2Component', () => {
  let component: TourMapV2Component;
  let fixture: ComponentFixture<TourMapV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TourMapV2Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TourMapV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
