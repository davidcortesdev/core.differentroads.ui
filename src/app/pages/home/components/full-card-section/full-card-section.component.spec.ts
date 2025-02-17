import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FullCardSectionComponent } from './full-card-section.component';
import { By } from '@angular/platform-browser';

describe('FullCardSectionComponent', () => {
  let component: FullCardSectionComponent;
  let fixture: ComponentFixture<FullCardSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FullCardSectionComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FullCardSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display three cards', () => {
    const cardElements = fixture.debugElement.queryAll(By.css('.card'));
    expect(cardElements.length).toBe(3);
  });

  it('should display card titles and descriptions', () => {
    const cardTitles = fixture.debugElement.queryAll(By.css('.card-title'));
    const cardDescriptions = fixture.debugElement.queryAll(By.css('.card-description'));

    expect(cardTitles.length).toBe(3);
    expect(cardDescriptions.length).toBe(3);

    expect(cardTitles[0].nativeElement.textContent).toContain('Card 1');
    expect(cardDescriptions[0].nativeElement.textContent).toContain('Description for card 1');
  });
});
