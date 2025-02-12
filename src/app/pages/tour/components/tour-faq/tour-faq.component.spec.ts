import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TourFaqComponent } from './tour-faq.component';

describe('TourFaqComponent', () => {
  let component: TourFaqComponent;
  let fixture: ComponentFixture<TourFaqComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TourFaqComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TourFaqComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
