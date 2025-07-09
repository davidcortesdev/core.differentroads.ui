import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectorItineraryComponent } from './selector-itinerary.component';

describe('SelectorItineraryComponent', () => {
  let component: SelectorItineraryComponent;
  let fixture: ComponentFixture<SelectorItineraryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SelectorItineraryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelectorItineraryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
