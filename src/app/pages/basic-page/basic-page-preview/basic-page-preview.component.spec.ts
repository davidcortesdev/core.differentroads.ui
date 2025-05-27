import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BasicPagePreviewComponent } from './basic-page-preview.component';

describe('BasicPagePreviewComponent', () => {
  let component: BasicPagePreviewComponent;
  let fixture: ComponentFixture<BasicPagePreviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BasicPagePreviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BasicPagePreviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
