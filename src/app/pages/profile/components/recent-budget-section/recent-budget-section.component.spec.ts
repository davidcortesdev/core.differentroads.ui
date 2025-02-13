import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecentBudgetSectionComponent } from './recent-budget-section.component';

describe('RecentBudgetSectionComponent', () => {
  let component: RecentBudgetSectionComponent;
  let fixture: ComponentFixture<RecentBudgetSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RecentBudgetSectionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecentBudgetSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
