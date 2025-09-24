import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MembershipCardsComponent } from './membership-cards.component';

describe('MembershipCardsComponent', () => {
  let component: MembershipCardsComponent;
  let fixture: ComponentFixture<MembershipCardsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MembershipCardsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MembershipCardsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
