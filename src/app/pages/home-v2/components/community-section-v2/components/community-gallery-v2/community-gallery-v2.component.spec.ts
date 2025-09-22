import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommunityGalleryV2Component } from './community-gallery-v2.component';

describe('CommunityGalleryV2Component', () => {
  let component: CommunityGalleryV2Component;
  let fixture: ComponentFixture<CommunityGalleryV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CommunityGalleryV2Component],
    }).compileComponents();

    fixture = TestBed.createComponent(CommunityGalleryV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
