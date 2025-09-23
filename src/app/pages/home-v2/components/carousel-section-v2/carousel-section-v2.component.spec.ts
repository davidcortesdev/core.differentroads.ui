import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CarouselSectionV2Component } from './carousel-section-v2.component';

describe('CarouselSectionV2Component', () => {
  let component: CarouselSectionV2Component;
  let fixture: ComponentFixture<CarouselSectionV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CarouselSectionV2Component],
    }).compileComponents();

    fixture = TestBed.createComponent(CarouselSectionV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

