import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';

import { InfoTravelersRoomComponent } from './info-travelers-room.component';

describe('InfoTravelersRoomComponent', () => {
  let component: InfoTravelersRoomComponent;
  let fixture: ComponentFixture<InfoTravelersRoomComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InfoTravelersRoomComponent ],
      providers: [MessageService]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InfoTravelersRoomComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
