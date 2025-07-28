import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivitiesOptionalsComponent } from './activities-optionals.component';

describe('ActivitiesOptionalsComponent', () => {
  let component: ActivitiesOptionalsComponent;
  let fixture: ComponentFixture<ActivitiesOptionalsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ActivitiesOptionalsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActivitiesOptionalsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
