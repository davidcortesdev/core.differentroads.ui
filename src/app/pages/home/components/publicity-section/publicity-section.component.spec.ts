import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PublicitySectionComponent } from './publicity-section.component';

describe('PublicitySectionComponent', () => {
  let component: PublicitySectionComponent;
  let fixture: ComponentFixture<PublicitySectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PublicitySectionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PublicitySectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
