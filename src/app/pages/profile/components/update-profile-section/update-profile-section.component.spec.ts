import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateProfileSectionComponent } from './update-profile-section.component';

describe('UpdateProfileSectionComponent', () => {
  let component: UpdateProfileSectionComponent;
  let fixture: ComponentFixture<UpdateProfileSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UpdateProfileSectionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpdateProfileSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
