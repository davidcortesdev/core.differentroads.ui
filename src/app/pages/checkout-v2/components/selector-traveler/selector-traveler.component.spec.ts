import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectorTravelerComponent } from './selector-traveler.component';

describe('SelectorTravelerComponent', () => {
  let component: SelectorTravelerComponent;
  let fixture: ComponentFixture<SelectorTravelerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SelectorTravelerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelectorTravelerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
