import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateProfileSectionV2Component } from './update-profile-section-v2.component';

describe('UpdateProfileSectionV2Component', () => {
  let component: UpdateProfileSectionV2Component;
  let fixture: ComponentFixture<UpdateProfileSectionV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UpdateProfileSectionV2Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpdateProfileSectionV2Component);
    component = fixture.componentInstance;
    component.userId = 'test-user-123';
    component.personalInfo = {
      nombre: 'Test',
      apellido: 'User',
      email: 'test@example.com',
      telefono: '123456789',
      dni: '12345678X',
      nacionalidad: 'Española',
      pasaporte: 'AB1234567',
      sexo: 'M',
      fechaNacimiento: '1990-01-01',
      avatarUrl: 'test.jpg'
    };
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.userId).toBe('test-user-123');
    expect(component.personalInfo).toBeDefined();
    expect(component.uploadedFiles).toEqual([]);
    expect(component.previewImageUrl).toBeNull();
    expect(component.maxFileSize).toBe(5000000);
  });

  it('should initialize sexo options', () => {
    expect(component.sexoOptions).toEqual([
      { label: 'Hombre', value: 'Hombre' },
      { label: 'Mujer', value: 'Mujer' }
    ]);
  });

  it('should generate mock data when personalInfo is empty', () => {
    component.personalInfo = {};
    component.ngOnInit();
    
    expect(component.personalInfo.nombre).toContain('Usuario');
    expect(component.personalInfo.email).toContain('@example.com');
  });

  it('should handle file upload', () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const mockEvent = {
      files: [mockFile]
    };

    component.onUpload(mockEvent);

    expect(component.uploadedFiles.length).toBe(1);
    expect(component.uploadedFiles[0]).toBe(mockFile);
  });

  it('should handle file removal', () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    component.uploadedFiles = [mockFile];

    component.clearFiles();

    expect(component.uploadedFiles.length).toBe(0);
  });

  it('should handle form submission', () => {
    spyOn(component, 'onSubmit').and.callThrough();
    
    component.onSubmit();

    expect(component.onSubmit).toHaveBeenCalled();
  });

  it('should handle cancel action', () => {
    spyOn(component.cancelEdit, 'emit');
    
    component.onCancel();

    expect(component.uploadedFiles).toEqual([]);
    expect(component.previewImageUrl).toBeNull();
    expect(component.cancelEdit.emit).toHaveBeenCalled();
  });

  it('should format date correctly', () => {
    const testDate = new Date('1990-01-01');
    const formattedDate = component.formatDate(testDate);
    expect(formattedDate).toBe('1990-01-01');
  });

  it('should handle string date input', () => {
    const formattedDate = component.formatDate('1990-01-01');
    expect(formattedDate).toBe('1990-01-01');
  });

  it('should handle already formatted date string', () => {
    const formattedDate = component.formatDate('01/01/1990');
    expect(formattedDate).toBe('1990-01-01');
  });

  it('should handle empty date input', () => {
    const formattedDate = component.formatDate('');
    expect(formattedDate).toBe('');
  });

  it('should filter sexo options', () => {
    const mockEvent = { query: 'hom' };
    component.filterSexo(mockEvent);
    
    expect(component.filteredSexoOptions.length).toBe(1);
    expect(component.filteredSexoOptions[0].label).toBe('Hombre');
  });

  it('should validate form correctly', () => {
    component.personalInfo.nombre = 'Test';
    component.personalInfo.apellido = 'User';
    component.personalInfo.email = 'test@example.com';
    
    const isValid = component['validateForm']();
    expect(isValid).toBeTrue();
  });

  it('should validate form with missing required fields', () => {
    component.personalInfo.nombre = '';
    component.personalInfo.apellido = 'User';
    component.personalInfo.email = 'test@example.com';
    
    const isValid = component['validateForm']();
    expect(isValid).toBeFalse();
  });

  it('should handle input validation for telefono', () => {
    const mockEvent = { target: { value: '123abc456' } };
    component.onTelefonoInput(mockEvent);
    
    expect(component.personalInfo.telefono).toBe('123456');
  });

  it('should handle input validation for dni', () => {
    const mockEvent = { target: { value: '12345678a' } };
    component.onDniInput(mockEvent);
    
    expect(component.personalInfo.dni).toBe('12345678A');
  });

  it('should handle input validation for pasaporte', () => {
    const mockEvent = { target: { value: 'ab1234567' } };
    component.onPasaporteInput(mockEvent);
    
    expect(component.personalInfo.pasaporte).toBe('AB1234567');
  });
});