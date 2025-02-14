import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PersonalInfoSectionComponent } from './personal-info-section.component';

describe('PersonalInfoSectionComponent', () => {
  let component: PersonalInfoSectionComponent;
  let fixture: ComponentFixture<PersonalInfoSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PersonalInfoSectionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PersonalInfoSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
