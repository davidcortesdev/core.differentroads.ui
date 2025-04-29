import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TourCardComponent } from './tour-card.component';

describe('TourCardComponent', () => {
  let component: TourCardComponent;
  let fixture: ComponentFixture<TourCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TourCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TourCardComponent);
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

  it('should calculate monthly price correctly', () => {
    component.tourData = {
      price: 1000,
      // Otras propiedades requeridas...
    } as any;
    
    component.ngOnInit();
    
    expect(component.monthlyPrice).toBe(250);
  });
});
