import { Component, OnInit, OnDestroy, Renderer2 } from '@angular/core';
import { PasswordRecoveryFormComponent } from './components/forget-password-form/forget-password-form.component';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';

@Component({
  selector: 'app-forget-password',
  imports: [CommonModule, PasswordRecoveryFormComponent],
  templateUrl: './forget-password.component.html',
  styleUrl: './forget-password.component.scss',
})

export class ForgetPasswordComponent implements OnInit, OnDestroy {
  private chatHideTimeouts: number[] = [];

  constructor(
    private titleService: Title,
    private renderer: Renderer2,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.titleService.setTitle('Recuperar Contraseña - Different Roads');
    // Verificar si debe ocultar el chat (solo en rutas standalone)
    this.checkAndToggleChatWidget();
  }

  ngOnDestroy(): void {
    // Limpiar timeouts y restaurar chat
    this.chatHideTimeouts.forEach(timeout => clearTimeout(timeout));
    this.chatHideTimeouts = [];
    this.renderer.removeClass(document.body, 'hide-chat-widget');
  }

  /**
   * Verifica si debe ocultar el chat basándose en la ruta.
   * Solo se oculta cuando la ruta es standalone (rutas que contienen '/standalone/').
   */
  private checkAndToggleChatWidget(): void {
    const currentUrl = this.router.url;
    const isStandaloneRoute = currentUrl.includes('/standalone/');
    
    if (isStandaloneRoute) {
      this.renderer.addClass(document.body, 'hide-chat-widget');
      
      // Forzar ocultación adicional con delay para asegurar que funcione incluso si el chat se carga después
      const timeout1 = window.setTimeout(() => this.hideChatElements(), 100);
      const timeout2 = window.setTimeout(() => this.hideChatElements(), 500);
      const timeout3 = window.setTimeout(() => this.hideChatElements(), 1000);
      
      this.chatHideTimeouts.push(timeout1, timeout2, timeout3);
    } else {
      this.renderer.removeClass(document.body, 'hide-chat-widget');
    }
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
