import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TravelerFieldComponent } from './traveler-field.component';

describe('TravelerFieldComponent', () => {
  let component: TravelerFieldComponent;
  let fixture: ComponentFixture<TravelerFieldComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TravelerFieldComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TravelerFieldComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

