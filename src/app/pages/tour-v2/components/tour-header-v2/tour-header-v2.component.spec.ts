import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TourHeaderV2Component } from './tour-header-v2.component';

describe('TourHeaderV2Component', () => {
  let component: TourHeaderV2Component;
  let fixture: ComponentFixture<TourHeaderV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TourHeaderV2Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TourHeaderV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
