import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TitleAndQuillComponent } from './title-and-quill.component';

describe('TitleAndQuillComponent', () => {
  let component: TitleAndQuillComponent;
  let fixture: ComponentFixture<TitleAndQuillComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TitleAndQuillComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TitleAndQuillComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
