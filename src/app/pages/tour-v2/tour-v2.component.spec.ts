import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TourV2Component } from './tour-v2.component';

describe('TourV2Component', () => {
  let component: TourV2Component;
  let fixture: ComponentFixture<TourV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TourV2Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TourV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
