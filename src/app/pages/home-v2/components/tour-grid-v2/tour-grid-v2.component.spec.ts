import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TourGridV2Component } from './tour-grid-v2.component';

describe('TourGridV2Component', () => {
  let component: TourGridV2Component;
  let fixture: ComponentFixture<TourGridV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TourGridV2Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TourGridV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

