import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TourCarrusselV2Component } from './tour-carrussel-v2.component';

describe('TourCarrusselV2Component', () => {
  let component: TourCarrusselV2Component;
  let fixture: ComponentFixture<TourCarrusselV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TourCarrusselV2Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TourCarrusselV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
