import { Component, AfterViewInit, ElementRef } from '@angular/core';

@Component({
  selector: 'app-main',
  standalone: false,
  
  templateUrl: './main.component.html',
  styleUrl: './main.component.scss'
})
export class MainComponent implements AfterViewInit {
  
  constructor(private el: ElementRef) {}

  ngAfterViewInit() {
    // Forzar a Termly a re-escane el DOM para detectar el nuevo elemento
    // Termly puede necesitar que el elemento esté en el DOM cuando se carga inicialmente
    // Por eso forzamos un re-escane después de que el componente se renderice
    setTimeout(() => {
      const cookieLink = this.el.nativeElement.querySelector('.termly-display-preferences') as HTMLElement;
      if (cookieLink) {
        // Método 1: Intentar disparar un evento que Termly pueda escuchar
        // Crear un evento personalizado que Termly pueda detectar
        const termlyEvent = new CustomEvent('termly:element-added', {
          bubbles: true,
          cancelable: true,
          detail: { element: cookieLink }
        });
        document.dispatchEvent(termlyEvent);

        // Método 2: Si Termly tiene un método para re-escane el DOM
        const win = window as any;
        if (win.Termly && typeof win.Termly.scan === 'function') {
          win.Termly.scan();
        } else if (win.Termly && typeof win.Termly.init === 'function') {
          win.Termly.init();
        } else if (win.Termly && typeof win.Termly.refresh === 'function') {
          win.Termly.refresh();
        }

        // Método 3: Simular que el elemento fue agregado al DOM
        // Remover y volver a agregar el elemento para que Termly lo detecte
        const parent = cookieLink.parentNode;
        if (parent) {
          const nextSibling = cookieLink.nextSibling;
          parent.removeChild(cookieLink);
          if (nextSibling) {
            parent.insertBefore(cookieLink, nextSibling);
          } else {
            parent.appendChild(cookieLink);
          }
        }

        // Método 4: Agregar un listener nativo que use la API de Termly si está disponible
        cookieLink.addEventListener('click', (e: MouseEvent) => {
          e.preventDefault();
          const win = window as any;
          
          // Intentar usar la API de Termly directamente
          if (win.Termly) {
            if (typeof win.Termly.showPreferences === 'function') {
              win.Termly.showPreferences();
              return;
            }
            if (typeof win.Termly.openPreferences === 'function') {
              win.Termly.openPreferences();
              return;
            }
          }
          
          // Si no hay API, crear un evento click que Termly pueda detectar
          const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window,
            button: 0
          });
          cookieLink.dispatchEvent(clickEvent);
        });
      }
    }, 500);
  }
}
