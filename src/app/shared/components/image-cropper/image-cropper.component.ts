import { Component, ViewChild, ElementRef, Input, Output, EventEmitter } from '@angular/core';
import { CloudinaryService } from '../../../core/services/media/cloudinary.service';
import { CldImage } from '../../models/cloudinary/cld-image.model';
import Cropper from 'cropperjs';

@Component({
  selector: 'app-image-cropper',
  standalone: false,
  templateUrl: './image-cropper.component.html',
  styleUrl: './image-cropper.component.scss'
})
export class ImageCropperComponent {
  @ViewChild('cropperImage') cropperImageElement: ElementRef | undefined;
  @ViewChild('fileInput') fileInput: ElementRef | undefined;

  // Inputs
  @Input() croppedImage: string | null = null;
  @Input() containerWidth: string = '100%';
  @Input() containerHeight: string = '500px';
  @Input() previewUrl: string = '';
  @Input() aspectRatio?: number;

  // Outputs
  @Output() imageCropped = new EventEmitter<string>();
  @Output() uploadError = new EventEmitter<string>();

  // Propiedades
  private cropper: Cropper | undefined;
  imageSource: string | null = null;
  originalImageSource: string | null = null;
  isCropping: boolean = false;
  loading: boolean = false;
  image: CldImage | null = null;
  
  // Configuración de validaciones
  private readonly MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB en bytes

  constructor(private cloudinaryService: CloudinaryService) { }

  /**
   * Activa el input de archivo oculto
   */
  triggerFileInput(): void {
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.click();
    } else {
      console.error('File input element is not available');
    }
  }

  /**
   * Restablece el recorte a la imagen original
   */
  resetCrop(): void {
    this.croppedImage = null;
    this.imageSource = this.originalImageSource;
  }

  /**
   * Maneja la selección de archivo de imagen
   */
  onImageFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validar tamaño de archivo
      if (file.size > this.MAX_FILE_SIZE) {
        this.uploadError.emit('El archivo es demasiado grande. El tamaño máximo permitido es de 8MB.');
        return;
      }

      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        this.uploadError.emit('Por favor selecciona un archivo de imagen válido.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imageSource = e.target.result;
        this.originalImageSource = this.imageSource;
        setTimeout(() => this.initCropper(), 300);
      };
      reader.readAsDataURL(file);
    }
  }

  /**
   * Inicializa el componente cropper
   */
  initCropper(): void {
    if (!this.cropperImageElement?.nativeElement) {
      console.error('Cropper image element not found');
      return;
    }

    if (this.cropper) {
      this.cropper.destroy();
      this.cropper = undefined;
    }

    if (!this.aspectRatio) {
      console.info('Aspect ratio values are not set, defaulting to 16:9.');
      this.aspectRatio = 16 / 9;
    } else {
      console.info('Aspect ratio set to:', this.aspectRatio);
    }

    this.cropper = new Cropper(this.cropperImageElement.nativeElement, {
      viewMode: 1,
      dragMode: 'crop',
      aspectRatio: this.aspectRatio,
      autoCropArea: 0.8,
      restore: false,
      guides: true,
      center: true,
      highlight: false,
      cropBoxMovable: true,
      cropBoxResizable: true,
      toggleDragModeOnDblclick: false,
      zoomable: true,
      responsive: false,
      background: false,
      modal: true,
      minContainerWidth: 300,
      minContainerHeight: 300,
      ready: () => {
        console.log('Cropper is ready');
        this.cropper?.crop();
      },
    });
  }

  /**
   * Recorta la imagen actual
   */
  cropImage(): void {
    if (!this.cropper) return;

    const canvas = this.cropper.getCroppedCanvas({
      maxWidth: 1200,
      maxHeight: 1200,
      fillColor: '#fff',
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
    });

    // Convertir a WebP con calidad del 85%
    this.croppedImage = canvas.toDataURL('image/webp', 0.85);
    this.uploadImage();
  }

  /**
   * Cancela el recorte actual
   */
  cancelCrop(): void {
    this.imageSource = null;
    this.croppedImage = null;
    if (this.cropper) {
      this.cropper.destroy();
      this.cropper = undefined;
    }
  }

  /**
   * Restablece completamente el cropper
   */
  resetCropper(): void {
    this.imageSource = '';
    if (this.cropper) {
      this.cropper.destroy();
      this.cropper = undefined;
    }
    this.isCropping = false;
    this.croppedImage = null;
  }

  /**
   * Carga una imagen en el cropper
   */
  loadImage(image: CldImage | null): void {
    if (image?.url) {
      this.image = image;
      this.imageSource = image.url || this.previewUrl;
      this.originalImageSource = image.url;

      setTimeout(() => {
        this.initCropper();
        this.croppedImage = image.url;
      }, 300);

      console.log('Image loaded into cropper:', image);
    } else if (this.previewUrl) {
      this.imageSource = this.previewUrl;
      this.originalImageSource = this.previewUrl;

      setTimeout(() => {
        this.initCropper();
        this.croppedImage = this.previewUrl;
      }, 300);

      console.log('Image loaded from previewUrl:', this.previewUrl);
    } else {
      console.warn('Attempted to load invalid image:', image);
    }
  }

  /**
   * Sube la imagen recortada a Cloudinary y emite el resultado
   */
  private uploadImage(): void {
    console.log('About to upload image:', this.croppedImage);
    this.loading = true;

    if (!this.croppedImage) {
      console.log('No cropped image available');
      this.loading = false;
      return;
    }

    // Si es una URL de datos, subir a Cloudinary
    if (this.croppedImage.startsWith('data:')) {
      this.cloudinaryService.uploadImage(this.croppedImage).subscribe({
        next: (uploadedImage) => {
          console.log('Image uploaded to Cloudinary:', uploadedImage);

          const validImage: string = uploadedImage.url || '';

          // Emitir la imagen al componente padre
          this.imageCropped.emit(validImage);
          this.loading = false;
          
          // Resetear el componente para la próxima imagen
          this.resetCropper();
        },
        error: (error) => {
          console.error('Error uploading image:', error);
          this.uploadError.emit('Error al subir la imagen. Por favor, intenta de nuevo.');
          this.loading = false;
        }
      });
    } else {
      // Ya es una URL válida
      const validImage: string = this.croppedImage || '';

      // Emitir la imagen al componente padre
      this.imageCropped.emit(validImage);
      this.loading = false;
      
      // Resetear el componente para la próxima imagen
      this.resetCropper();
    }
  }
}