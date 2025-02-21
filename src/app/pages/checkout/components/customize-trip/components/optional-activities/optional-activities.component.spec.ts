import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OptionalActivitiesComponent } from './optional-activities.component';

describe('OptionalActivitiesComponent', () => {
  let component: OptionalActivitiesComponent;
  let fixture: ComponentFixture<OptionalActivitiesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [OptionalActivitiesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OptionalActivitiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
