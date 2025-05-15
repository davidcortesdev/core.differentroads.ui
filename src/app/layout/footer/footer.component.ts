import { Component, OnInit, AfterViewInit, ElementRef, Renderer2, OnDestroy } from '@angular/core';
import { GeneralConfigService } from '../../core/services/general-config.service';
import { FooterSection, Link } from '../../core/models/general/footer.model';
import { Subscription } from 'rxjs';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  standalone: false,
})
export class FooterComponent implements OnInit, AfterViewInit, OnDestroy {
  footerSection: FooterSection | null = null;
  isSubscribed = false;
  formLoaded = false;
  private scriptLoaded = false;
  emailForm: FormGroup;
  private subscription: Subscription = new Subscription();

  constructor(
    private generalConfigService: GeneralConfigService,
    private renderer: Renderer2,
    private el: ElementRef,
    private fb: FormBuilder
  ) {
    this.emailForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit() {
    this.fetchFooterConfig();
  }

  ngAfterViewInit() {
    this.loadMailerLiteScript();
  }

  fetchFooterConfig() {
    this.subscription.add(
      this.generalConfigService
        .getFooterSection()
        .subscribe({
          next: (footerSection: FooterSection) => {
            this.footerSection = footerSection;
          },
          error: (error) => console.error('Error fetching footer config:', error)
        })
    );
  }

  // Optimize script loading with better error handling and performance
  loadMailerLiteScript(): void {
    // Verificar si el script ya está cargado
    if (document.getElementById('mailer-lite-script')) {
      this.scriptLoaded = true;
      this.setupFormListener();
      return;
    }
  
    // Usar un timeout para evitar bloqueos
    const timeoutId = setTimeout(() => {
      console.error('Timeout loading MailerLite script');
    }, 10000); // 10 segundos de timeout
  
    const script = this.renderer.createElement('script');
    this.renderer.setAttribute(script, 'id', 'mailer-lite-script');
    this.renderer.setAttribute(script, 'src', 'https://static.mailerlite.com/js/w/webforms.min.js?vd4de52e171e8eb9c47c0c20caf367ddf');
    this.renderer.setAttribute(script, 'type', 'text/javascript');
    this.renderer.setAttribute(script, 'async', 'true');
    this.renderer.setAttribute(script, 'defer', 'true');
    
    // Mejorar los event listeners para la carga del script
    this.renderer.listen(script, 'load', () => {
      clearTimeout(timeoutId);
      this.scriptLoaded = true;
      this.setupFormListener();
    });
    
    this.renderer.listen(script, 'error', (event) => {
      clearTimeout(timeoutId);
      console.error('Failed to load MailerLite script:', event);
      // Implementar una estrategia de fallback si es necesario
    });
    
    this.renderer.appendChild(document.body, script);
  }

  private setupFormListener(): void {
    // Usar un enfoque más robusto para encontrar el formulario
    const maxRetries = 5;
    let retries = 0;
    
    const findAndSetupForm = () => {
      const form = this.el.nativeElement.querySelector('.ml-block-form');
      if (form) {
        this.renderer.listen(form, 'submit', (event) => this.handleFormSubmit(event));
        this.formLoaded = true;
        return true;
      }
      return false;
    };
    
    // Intentar encontrar el formulario inmediatamente
    if (findAndSetupForm()) {
      return;
    }
    
    // Si no se encuentra, intentar con un intervalo
    const intervalId = setInterval(() => {
      retries++;
      if (findAndSetupForm() || retries >= maxRetries) {
        clearInterval(intervalId);
        if (retries >= maxRetries && !this.formLoaded) {
          console.warn('No se pudo encontrar el formulario después de varios intentos');
        }
      }
    }, 300);
  }

  handleFormSubmit(event: Event): void {
    event.preventDefault();
    
    if (this.emailForm.invalid) {
      return;
    }
    
    const submitBtn = this.el.nativeElement.querySelector('.ml-subscribe-form-6075553 button[type="submit"]');
    const loadingBtn = this.el.nativeElement.querySelector('.ml-subscribe-form-6075553 button.loading');
    
    if (submitBtn && loadingBtn) {
      this.renderer.setStyle(submitBtn, 'display', 'none');
      this.renderer.setStyle(loadingBtn, 'display', 'inline-block');
    }
    
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const email = this.emailForm.get('email')?.value;
    
    // Aquí normalmente enviarías los datos a tu API
    // Por ahora, simulamos una respuesta exitosa
    setTimeout(() => {
      const formElement = this.el.nativeElement.querySelector('.ml-subscribe-form-6075553 .row-form');
      const successElement = this.el.nativeElement.querySelector('.ml-subscribe-form-6075553 .row-success');
      const titleElement = this.el.nativeElement.querySelector('.newsletter .title.inicial');
      
      if (formElement) this.renderer.setStyle(formElement, 'display', 'none');
      if (successElement) this.renderer.setStyle(successElement, 'display', 'block');
      if (titleElement) this.renderer.setStyle(titleElement, 'display', 'none');
      
      this.isSubscribed = true;
    }, 2000);
  }

  // Ya no necesitamos este método con ReactiveForms
  // updateEmailValue(value: string): void {
  //   this.emailValue = value;
  // }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
