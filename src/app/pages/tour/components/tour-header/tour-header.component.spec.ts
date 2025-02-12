import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TourHeaderComponent } from './tour-header.component';

describe('TourHeaderComponent', () => {
  let component: TourHeaderComponent;
  let fixture: ComponentFixture<TourHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TourHeaderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TourHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
