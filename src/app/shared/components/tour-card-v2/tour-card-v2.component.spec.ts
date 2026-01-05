import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TourCardV2Component } from './tour-card-v2.component';

describe('TourCardV2Component', () => {
  let component: TourCardV2Component;
  let fixture: ComponentFixture<TourCardV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TourCardV2Component],
    }).compileComponents();

    fixture = TestBed.createComponent(TourCardV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should navigate to tour page when clicked', () => {
    const routerSpy = spyOn(component['router'], 'navigate');
    component.tourData = {
      webSlug: 'test-tour',
      // Otras propiedades requeridas...
    } as any;

    component.handleTourClick();

    expect(routerSpy).toHaveBeenCalledWith(['/tour', 'test-tour']);
  });
});
