import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TourRelatedComponent } from './tour-related.component';

describe('TourRelatedComponent', () => {
  let component: TourRelatedComponent;
  let fixture: ComponentFixture<TourRelatedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TourRelatedComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TourRelatedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
