import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TravelerActivitySelectorComponent } from './traveler-activity-selector.component';

describe('TravelerActivitySelectorComponent', () => {
  let component: TravelerActivitySelectorComponent;
  let fixture: ComponentFixture<TravelerActivitySelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TravelerActivitySelectorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TravelerActivitySelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
