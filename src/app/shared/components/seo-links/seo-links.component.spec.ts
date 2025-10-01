import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SeoLinksComponent } from './seo-links.component';

describe('SeoLinksComponent', () => {
  let component: SeoLinksComponent;
  let fixture: ComponentFixture<SeoLinksComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SeoLinksComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SeoLinksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
