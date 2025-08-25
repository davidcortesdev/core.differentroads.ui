import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CloudinaryService } from '../../../core/services/cloudinary.service';

@Component({
  selector: 'app-image-upload-modal',
  standalone: false,
  templateUrl: './image-upload-modal.component.html',
  styleUrl: './image-upload-modal.component.scss',
})
export class ImageUploadModalComponent {
  @Input() uploadedImages: string[] = [];
  @Input() maxImages: number = 40;
  @Output() imageCropped = new EventEmitter<string>();
  @Output() uploadError = new EventEmitter<string>();
  @Output() removeImage = new EventEmitter<number>();

  showImageCropper: boolean = false;
  uploadErrorMessage: string = '';

  /**
   * Muestra el componente de recorte de imagen
   */
  showImageUploader(): void {
    if (this.uploadedImages.length >= this.maxImages) {
      this.uploadErrorMessage = `Solo puedes subir un máximo de ${this.maxImages} imágenes.`;
      setTimeout(() => (this.uploadErrorMessage = ''), 5000);
      return;
    }
    this.uploadErrorMessage = '';
    this.showImageCropper = true;
  }

  /**
   * Maneja la imagen recortada y subida
   */
  onImageCropped(imageUrl: string): void {
    if (imageUrl) {
      this.imageCropped.emit(imageUrl);
      this.showImageCropper = false;
      console.log('Imagen subida:', imageUrl);
      console.log('Total de imágenes:', this.uploadedImages.length);
    }
  }

  /**
   * Elimina una imagen de la lista
   */
  onRemoveImage(index: number): void {
    this.removeImage.emit(index);
  }

  /**
   * Cancela la subida de imagen
   */
  cancelImageUpload(): void {
    this.showImageCropper = false;
    this.uploadErrorMessage = '';
  }

  /**
   * Maneja errores de subida de imagen
   */
  onUploadError(errorMessage: string): void {
    this.uploadError.emit(errorMessage);
    this.uploadErrorMessage = errorMessage;
    setTimeout(() => (this.uploadErrorMessage = ''), 5000);
  }

  /**
   * Verifica si se pueden subir más imágenes
   */
  canUploadMoreImages(): boolean {
    return this.uploadedImages.length < this.maxImages;
  }
}
