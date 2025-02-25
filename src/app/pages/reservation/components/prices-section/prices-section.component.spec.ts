import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PricesSectionComponent } from './prices-section.component';

describe('PricesSectionComponent', () => {
  let component: PricesSectionComponent;
  let fixture: ComponentFixture<PricesSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PricesSectionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PricesSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
