import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomizeTripComponent } from './customize-trip.component';

describe('CustomizeTripComponent', () => {
  let component: CustomizeTripComponent;
  let fixture: ComponentFixture<CustomizeTripComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CustomizeTripComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomizeTripComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
