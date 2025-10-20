import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InfoTravelersComponent } from './info-travelers.component';

describe('InfoTravelersComponent', () => {
  let component: InfoTravelersComponent;
  let fixture: ComponentFixture<InfoTravelersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [InfoTravelersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InfoTravelersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('canContinueToNextStep', () => {
    it('should return false when no traveler forms are loaded', () => {
      expect(component.canContinueToNextStep()).toBe(false);
    });

    // TODO: Agregar más tests cuando se implementen mocks de los formularios
  });

  describe('getNotReadyTravelers', () => {
    it('should return empty array when no traveler forms are loaded', () => {
      expect(component.getNotReadyTravelers()).toEqual([]);
    });
  });
});
