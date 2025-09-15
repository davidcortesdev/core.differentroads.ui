import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PublicitySectionV2Component } from './publicity-section-v2.component';

describe('PublicitySectionV2Component', () => {
  let component: PublicitySectionV2Component;
  let fixture: ComponentFixture<PublicitySectionV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PublicitySectionV2Component],
    }).compileComponents();

    fixture = TestBed.createComponent(PublicitySectionV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
