import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PersonalInfoSectionV2Component } from './personal-info-section-v2.component';

describe('PersonalInfoSectionV2Component', () => {
  let component: PersonalInfoSectionV2Component;
  let fixture: ComponentFixture<PersonalInfoSectionV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PersonalInfoSectionV2Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PersonalInfoSectionV2Component);
    component = fixture.componentInstance;
    component.userId = 'test-user-123';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.userId).toBe('test-user-123');
    expect(component.isEditing).toBeFalse();
    expect(component.personalInfo).toBeDefined();
  });

  it('should generate mock data on init', () => {
    expect(component.personalInfo.nombre).toBe('Pedro');
    expect(component.personalInfo.apellido).toBe('Garcia');
    expect(component.personalInfo.email).toBe('pedro.garcia@example.com');
    expect(component.personalInfo.dni).toBe('12345678X');
  });

  it('should toggle edit mode', () => {
    expect(component.isEditing).toBeFalse();
    
    component.toggleEditMode();
    expect(component.isEditing).toBeTrue();
    
    component.toggleEditMode();
    expect(component.isEditing).toBeFalse();
  });

  it('should restore original data when canceling edit', () => {
    component.toggleEditMode();
    expect(component.isEditing).toBeTrue();
    
    component.personalInfo.nombre = 'Modified Name';
    
    component.toggleEditMode();
    expect(component.isEditing).toBeFalse();
    expect(component.personalInfo.nombre).toBe('Pedro');
  });

  it('should format date correctly', () => {
    const testDate = new Date('1996-10-10');
    const formattedDate = component['formatDate'](testDate);
    expect(formattedDate).toBe('10/10/1996');
  });

  it('should handle string date input', () => {
    const formattedDate = component['formatDate']('1996-10-10');
    expect(formattedDate).toBe('10/10/1996');
  });

  it('should handle already formatted date string', () => {
    const formattedDate = component['formatDate']('10/10/1996');
    expect(formattedDate).toBe('10/10/1996');
  });

  it('should handle empty date input', () => {
    const formattedDate = component['formatDate']('');
    expect(formattedDate).toBe('');
  });
});