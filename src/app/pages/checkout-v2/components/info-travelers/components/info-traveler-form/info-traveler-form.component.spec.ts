import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InfoTravelerFormComponent } from './info-traveler-form.component';

describe('InfoTravelerFormComponent', () => {
  let component: InfoTravelerFormComponent;
  let fixture: ComponentFixture<InfoTravelerFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [InfoTravelerFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InfoTravelerFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

