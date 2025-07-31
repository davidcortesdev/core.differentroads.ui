import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InfoTravelersComponent } from './info-travelers.component';

describe('InfoTravelersComponent', () => {
  let component: InfoTravelersComponent;
  let fixture: ComponentFixture<InfoTravelersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [InfoTravelersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InfoTravelersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
