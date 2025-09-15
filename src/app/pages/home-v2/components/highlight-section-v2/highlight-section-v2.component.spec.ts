import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HighlightSectionV2Component } from './highlight-section-v2.component';

describe('HighlightSectionV2Component', () => {
  let component: HighlightSectionV2Component;
  let fixture: ComponentFixture<HighlightSectionV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HighlightSectionV2Component],
    }).compileComponents();

    fixture = TestBed.createComponent(HighlightSectionV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
