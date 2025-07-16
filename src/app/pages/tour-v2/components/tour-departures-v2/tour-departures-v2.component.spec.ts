import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TourDeparturesV2Component } from './tour-departures-v2.component';

describe('TourDeparturesV2Component', () => {
  let component: TourDeparturesV2Component;
  let fixture: ComponentFixture<TourDeparturesV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TourDeparturesV2Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TourDeparturesV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
