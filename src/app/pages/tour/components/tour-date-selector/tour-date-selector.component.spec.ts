import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TourDateSelectorComponent } from './tour-date-selector.component';

describe('TourDateSelectorComponent', () => {
  let component: TourDateSelectorComponent;
  let fixture: ComponentFixture<TourDateSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TourDateSelectorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TourDateSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
