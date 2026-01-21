import { Component, OnInit, OnDestroy, Renderer2 } from '@angular/core';
import { PasswordRecoveryFormComponent } from './components/forget-password-form/forget-password-form.component';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-forget-password',
  imports: [CommonModule, PasswordRecoveryFormComponent],
  templateUrl: './forget-password.component.html',
  styleUrl: './forget-password.component.scss',
})

export class ForgetPasswordComponent implements OnInit, OnDestroy {
  private chatHideTimeouts: number[] = [];
  private chatHideInterval: number | null = null;

  constructor(
    private titleService: Title,
    private renderer: Renderer2,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.titleService.setTitle('Recuperar Contraseña - Different Roads');
    // Verificar si viene desde touroperacion para ocultar el chat
    this.checkAndToggleChatWidget();
  }

  ngOnDestroy(): void {
    // Limpiar timeouts y restaurar chat
    this.chatHideTimeouts.forEach(timeout => clearTimeout(timeout));
    this.chatHideTimeouts = [];
    
    if (this.chatHideInterval !== null) {
      clearInterval(this.chatHideInterval);
      this.chatHideInterval = null;
    }
    
    this.renderer.removeClass(document.body, 'hide-chat-widget');
  }

  /**
   * Verifica si debe ocultar el chat.
   * Solo se oculta si viene desde touroperacion (source=touroperacion en query params).
   */
  private checkAndToggleChatWidget(): void {
    // Verificar si viene desde touroperacion
    this.route.queryParams.subscribe(params => {
      const isFromTourOperacion = params['source'] === 'touroperacion';
      
      if (isFromTourOperacion) {
        this.renderer.addClass(document.body, 'hide-chat-widget');
        
        // Forzar ocultación inmediata
        this.hideChatElements();
        
        // Forzar ocultación adicional con múltiples delays para asegurar que funcione incluso si el chat se carga después
        const delays = [50, 100, 200, 300, 500, 1000, 2000, 3000, 5000];
        delays.forEach(delay => {
          const timeout = window.setTimeout(() => this.hideChatElements(), delay);
          this.chatHideTimeouts.push(timeout);
        });
        
        // Configurar intervalo para verificar periódicamente
        this.setupInterval();
      } else {
        // Si no viene de touroperacion, asegurarse de que el chat esté visible
        this.renderer.removeClass(document.body, 'hide-chat-widget');
      }
    });
  }

  /**
   * Configura un intervalo para verificar y ocultar el chat periódicamente
   */
  private setupInterval(): void {
    this.chatHideInterval = window.setInterval(() => {
      this.hideChatElements();
    }, 500); // Verificar cada 500ms
  }

  /**
   * Fuerza la ocultación de elementos de chat directamente en el DOM
   */
  private hideChatElements(): void {
    // Selectores específicos para HubSpot/Alicia chat
    const selectors = [
      '[id^="hubspot-messages-iframe-container"]',
      '[id*="hubspot-messages"]',
      '[id*="hubspot-conversations"]',
      'iframe[src*="hs-scripts.com"]',
      'iframe[src*="hubspot.com"]',
      'iframe[src*="hubspotusercontent.com"]',
      '.hs-chat-widget',
      '.hs-chat-flow',
      '.hs-messages-widget',
      '.hs-messages-widget-open',
      '.hs-messages-widget-container',
      '[class*="hs-chat"]',
      '[class*="hs-messages"]',
      '[id*="hs-chat"]',
      '[id*="hs-messages"]'
    ];

    selectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el: Element) => {
          const htmlEl = el as HTMLElement;
          // Verificar que no esté dentro del componente forget-password
          if (!this.isInsideForgetPasswordComponent(htmlEl)) {
            htmlEl.style.setProperty('display', 'none', 'important');
            htmlEl.style.setProperty('visibility', 'hidden', 'important');
            htmlEl.style.setProperty('opacity', '0', 'important');
            htmlEl.style.setProperty('pointer-events', 'none', 'important');
          }
        });
      } catch (e) {
        // Ignorar errores de selectores
      }
    });

    // Buscar elementos flotantes en esquinas que puedan ser el chat
    this.hideFloatingChatWidgets();
  }

  /**
   * Verifica si un elemento está dentro del componente forget-password
   */
  private isInsideForgetPasswordComponent(element: HTMLElement): boolean {
    let current: HTMLElement | null = element;
    while (current) {
      if (current.tagName === 'APP-FORGET-PASSWORD' || 
          current.classList.contains('auth-card-container') ||
          current.classList.contains('sign-up-form')) {
        return true;
      }
      current = current.parentElement;
    }
    return false;
  }

  /**
   * Oculta widgets flotantes de chat que estén en las esquinas
   */
  private hideFloatingChatWidgets(): void {
    // Buscar elementos con posición fija y z-index alto en las esquinas
    const allElements = document.querySelectorAll('*');
    allElements.forEach((el: Element) => {
      const htmlEl = el as HTMLElement;
      
      // Saltar si está dentro del componente forget-password
      if (this.isInsideForgetPasswordComponent(htmlEl)) {
        return;
      }

      const computedStyle = window.getComputedStyle(htmlEl);
      const position = computedStyle.position;
      const zIndex = parseInt(computedStyle.zIndex) || 0;
      
      // Solo procesar elementos fijos con z-index alto
      if (position === 'fixed' && zIndex > 1000) {
        const rect = htmlEl.getBoundingClientRect();
        const isInBottomRight = rect.right > window.innerWidth - 150 && 
                                rect.bottom > window.innerHeight - 150;
        const isInBottomLeft = rect.left < 150 && 
                               rect.bottom > window.innerHeight - 150;
        
        // Verificar si tiene indicadores de chat
        const id = htmlEl.id?.toLowerCase() || '';
        const className = htmlEl.className?.toLowerCase() || '';
        const ariaLabel = htmlEl.getAttribute('aria-label')?.toLowerCase() || '';
        const text = (id + ' ' + className + ' ' + ariaLabel).toLowerCase();
        
        const chatIndicators = ['hubspot', 'hs-', 'chat', 'mensaje', 'message', 'widget', 'bubble', 'alicia'];
        const hasChatIndicator = chatIndicators.some(indicator => text.includes(indicator));
        
        // Si está en una esquina y tiene indicadores de chat, ocultarlo
        if ((isInBottomRight || isInBottomLeft) && hasChatIndicator) {
          htmlEl.style.setProperty('display', 'none', 'important');
          htmlEl.style.setProperty('visibility', 'hidden', 'important');
          htmlEl.style.setProperty('opacity', '0', 'important');
          htmlEl.style.setProperty('pointer-events', 'none', 'important');
        }
      }
    });
  }
}
