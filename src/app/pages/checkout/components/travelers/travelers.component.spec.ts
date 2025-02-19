import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TravelersComponent } from './travelers.component';

describe('TravelersComponent', () => {
  let component: TravelersComponent;
  let fixture: ComponentFixture<TravelersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TravelersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TravelersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
