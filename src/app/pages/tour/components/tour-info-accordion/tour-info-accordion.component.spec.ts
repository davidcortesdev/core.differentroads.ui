import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TourInfoAccordionComponent } from './tour-info-accordion.component';

describe('TourInfoAccordionComponent', () => {
  let component: TourInfoAccordionComponent;
  let fixture: ComponentFixture<TourInfoAccordionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TourInfoAccordionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TourInfoAccordionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});