import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HighlightSectionComponent } from './highlight-section.component';

describe('HighlightSectionComponent', () => {
  let component: HighlightSectionComponent;
  let fixture: ComponentFixture<HighlightSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HighlightSectionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HighlightSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
