import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TravelerSelectorComponent } from './traveler-selector.component';

describe('TravelerSelectorComponent', () => {
  let component: TravelerSelectorComponent;
  let fixture: ComponentFixture<TravelerSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TravelerSelectorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TravelerSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
