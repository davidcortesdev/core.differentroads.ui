import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TravelerItemComponent } from './traveler-item.component';

describe('TravelerItemComponent', () => {
  let component: TravelerItemComponent;
  let fixture: ComponentFixture<TravelerItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TravelerItemComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TravelerItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
