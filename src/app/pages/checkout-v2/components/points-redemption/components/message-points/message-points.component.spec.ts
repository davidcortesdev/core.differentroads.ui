import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MessagePointsComponent } from './message-points.component';

describe('MessagePointsComponent', () => {
  let component: MessagePointsComponent;
  let fixture: ComponentFixture<MessagePointsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MessagePointsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MessagePointsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
