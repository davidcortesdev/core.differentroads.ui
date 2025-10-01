import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommunitySectionV2Component } from './community-section-v2.component';

describe('CommunitySectionV2Component', () => {
  let component: CommunitySectionV2Component;
  let fixture: ComponentFixture<CommunitySectionV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CommunitySectionV2Component],
    }).compileComponents();

    fixture = TestBed.createComponent(CommunitySectionV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
