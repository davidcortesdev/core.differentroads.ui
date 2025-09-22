import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NewsLetterSectionV2Component } from './newsletter-section-v2.component';

describe('NewsLetterSectionV2Component', () => {
  let component: NewsLetterSectionV2Component;
  let fixture: ComponentFixture<NewsLetterSectionV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [NewsLetterSectionV2Component],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NewsLetterSectionV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load MailerLite script', () => {
    spyOn(component, 'loadMailerLiteScript');
    component.ngOnInit();
    expect(component.loadMailerLiteScript).toHaveBeenCalled();
  });
});
