import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TourListV2Component } from './tour-list-v2.component';

describe('TourListV2Component', () => {
  let component: TourListV2Component;
  let fixture: ComponentFixture<TourListV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TourListV2Component],
    }).compileComponents();

    fixture = TestBed.createComponent(TourListV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
