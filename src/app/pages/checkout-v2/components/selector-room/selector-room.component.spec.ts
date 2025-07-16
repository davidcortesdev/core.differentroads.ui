import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectorRoomComponent } from './selector-room.component';

describe('SelectorRoomComponent', () => {
  let component: SelectorRoomComponent;
  let fixture: ComponentFixture<SelectorRoomComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SelectorRoomComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelectorRoomComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
