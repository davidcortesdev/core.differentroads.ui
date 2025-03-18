import { Component, OnInit, AfterViewInit, ElementRef, Renderer2 } from '@angular/core';
import { GeneralConfigService } from '../../core/services/general-config.service';
import { FooterSection, Link } from '../../core/models/general/footer.model';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  standalone: false,
})
export class FooterComponent implements OnInit, AfterViewInit {
  footerSection: FooterSection | null = null;
  isSubscribed = false;
  formLoaded = false;
  private scriptLoaded = false;

  constructor(
    private generalConfigService: GeneralConfigService,
    private renderer: Renderer2,
    private el: ElementRef
  ) {}

  ngOnInit() {
    this.fetchFooterConfig();
  }

  ngAfterViewInit() {
    this.loadMailerLiteScript();
  }

  fetchFooterConfig() {
    this.generalConfigService
      .getFooterSection()
      .subscribe({
        next: (footerSection: FooterSection) => {
          this.footerSection = footerSection;
        },
        error: (error) => console.error('Error fetching footer config:', error)
      });
  }

  loadMailerLiteScript(): void {
    // Check if script is already loaded
    if (document.getElementById('mailer-lite-script')) {
      this.scriptLoaded = true;
      this.setupFormListener();
      return;
    }

    const script = this.renderer.createElement('script');
    this.renderer.setAttribute(script, 'id', 'mailer-lite-script');
    this.renderer.setAttribute(script, 'src', 'https://static.mailerlite.com/js/w/webforms.min.js?vd4de52e171e8eb9c47c0c20caf367ddf');
    this.renderer.setAttribute(script, 'type', 'text/javascript');
    
    // Add event listeners for script loading
    this.renderer.listen(script, 'load', () => {
      this.scriptLoaded = true;
      this.setupFormListener();
    });
    
    this.renderer.listen(script, 'error', (event) => {
      console.error('Failed to load MailerLite script:', event);
    });
    
    this.renderer.appendChild(document.body, script);
  }

  private setupFormListener(): void {
    // Use ElementRef to find the form within this component
    const form = this.el.nativeElement.querySelector('.ml-block-form');
    if (form) {
      this.renderer.listen(form, 'submit', (event) => this.handleFormSubmit(event));
      this.formLoaded = true;
    } else {
      // If form isn't found immediately, try again after a short delay
      // This handles cases where the DOM might not be fully rendered
      setTimeout(() => {
        const retryForm = this.el.nativeElement.querySelector('.ml-block-form');
        if (retryForm) {
          this.renderer.listen(retryForm, 'submit', (event) => this.handleFormSubmit(event));
          this.formLoaded = true;
        }
      }, 500);
    }
  }

  handleFormSubmit(event: Event): void {
    // Prevent default form submission if we're handling it
    event.preventDefault();
    
    // Get form elements using ElementRef
    const submitBtn = this.el.nativeElement.querySelector('.ml-subscribe-form-6075553 button[type="submit"]');
    const loadingBtn = this.el.nativeElement.querySelector('.ml-subscribe-form-6075553 button.loading');
    
    if (submitBtn && loadingBtn) {
      this.renderer.setStyle(submitBtn, 'display', 'none');
      this.renderer.setStyle(loadingBtn, 'display', 'inline-block');
    }
    
    // Get the form data
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const email = formData.get('fields[email]') as string;
    
    // Here you would typically send the data to your API
    // For now, we'll simulate a successful submission
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
}
