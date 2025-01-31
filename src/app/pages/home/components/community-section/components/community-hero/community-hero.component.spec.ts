import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommunityHeroComponent } from './community-hero.component';

describe('CommunityHeroComponent', () => {
  let component: CommunityHeroComponent;
  let fixture: ComponentFixture<CommunityHeroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CommunityHeroComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CommunityHeroComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
