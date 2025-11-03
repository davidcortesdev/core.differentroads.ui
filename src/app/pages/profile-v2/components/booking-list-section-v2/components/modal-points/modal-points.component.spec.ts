import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalPointsComponent } from './modal-points.component';

describe('ModalPointsComponent', () => {
  let component: ModalPointsComponent;
  let fixture: ComponentFixture<ModalPointsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ModalPointsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalPointsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

