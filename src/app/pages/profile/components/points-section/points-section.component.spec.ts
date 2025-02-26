import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PointsSectionComponent } from './points-section.component';

describe('PointsSectionComponent', () => {
  let component: PointsSectionComponent;
  let fixture: ComponentFixture<PointsSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PointsSectionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PointsSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
