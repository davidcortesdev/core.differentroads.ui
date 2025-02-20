import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RoomSelectorComponent } from './room-selector.component';

describe('RoomSelectorComponent', () => {
  let component: RoomSelectorComponent;
  let fixture: ComponentFixture<RoomSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RoomSelectorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RoomSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
