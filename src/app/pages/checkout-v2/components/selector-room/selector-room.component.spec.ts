import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';

import { SelectorRoomComponent } from './selector-room.component';

describe('SelectorRoomComponent', () => {
  let component: SelectorRoomComponent;
  let fixture: ComponentFixture<SelectorRoomComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SelectorRoomComponent],
      providers: [MessageService],
    }).compileComponents();

    fixture = TestBed.createComponent(SelectorRoomComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
