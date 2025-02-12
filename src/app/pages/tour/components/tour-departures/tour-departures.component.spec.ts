import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TourDeparturesComponent } from './tour-departures.component';

describe('TourDeparturesComponent', () => {
  let component: TourDeparturesComponent;
  let fixture: ComponentFixture<TourDeparturesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TourDeparturesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TourDeparturesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
