import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommunityHeroV2Component } from './community-hero-v2.component';

describe('CommunityHeroV2Component', () => {
  let component: CommunityHeroV2Component;
  let fixture: ComponentFixture<CommunityHeroV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CommunityHeroV2Component],
    }).compileComponents();

    fixture = TestBed.createComponent(CommunityHeroV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
