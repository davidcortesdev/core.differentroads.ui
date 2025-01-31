import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommunityGalleryComponent } from './community-gallery.component';

describe('CommunityGalleryComponent', () => {
  let component: CommunityGalleryComponent;
  let fixture: ComponentFixture<CommunityGalleryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CommunityGalleryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CommunityGalleryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
