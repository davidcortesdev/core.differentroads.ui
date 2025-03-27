import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import {
  FileUploadService,
  CloudinaryResponse,
} from '../../../core/services/file-upload.service';
import { MessageService } from 'primeng/api';
import { catchError, finalize, tap } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-upload-button',
  standalone: false,
  templateUrl: './upload-button.component.html',
  styleUrl: './upload-button.component.scss',
})
export class UploadButtonComponent implements OnInit {
  @Input() label: string = 'Subir archivo';
  @Input() accept: string = 'image/*, .pdf';
  @Input() maxFileSize: number = 1000000;
  @Input() folder: string = 'uploads';
  @Input() auto: boolean = true;
  @Input() multiple: boolean = false;
  @Input() chooseIcon: string = 'pi pi-upload';
  @Input() styleClass: string = '';

  @Output() onUploadSuccess = new EventEmitter<CloudinaryResponse>();
  @Output() onUploadError = new EventEmitter<any>();
  @Output() onFileSelect = new EventEmitter<File[]>();

  uploading: boolean = false;
  pendingFile: File | null = null;

  constructor(
    private fileUploadService: FileUploadService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    // ...existing code without upload logs...
  }

  onUpload(event: any) {
    if (event.files && event.files.length > 0) {
      const files = event.files;
      this.onFileSelect.emit(files);
      if (this.auto) {
        this.uploadFile(files[0]);
      } else {
        this.pendingFile = files[0];
      }
    }
  }

  confirmUpload() {
    if (this.pendingFile) {
      this.uploadFile(this.pendingFile);
      this.pendingFile = null;
    }
  }

  uploadFile(file: File) {
    try {
      this.uploading = true;
      this.fileUploadService
        .uploadFile(file, this.folder)
        .pipe(
          tap(() => {}),
          catchError((error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error de carga',
              detail: `Ha ocurrido un error al subir el archivo ${file.name}.`,
            });
            this.onUploadError.emit(error);
            return of(null);
          }),
          finalize(() => {
            this.uploading = false;
          })
        )
        .subscribe((response) => {
          if (response) {
            this.messageService.add({
              severity: 'success',
              summary: 'Archivo subido',
              detail: `El archivo ${file.name} se ha subido correctamente.`,
            });
            this.onUploadSuccess.emit(response);
          }
        });
    } catch (err) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error de configuración',
        detail: 'Ha ocurrido un error al configurar la carga del archivo.',
      });
      this.onUploadError.emit(err);
    }
  }
}
