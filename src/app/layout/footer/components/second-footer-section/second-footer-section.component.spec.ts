import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SecondFooterSectionComponent } from './second-footer-section.component';

describe('SecondFooterSectionComponent', () => {
  let component: SecondFooterSectionComponent;
  let fixture: ComponentFixture<SecondFooterSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SecondFooterSectionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SecondFooterSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
