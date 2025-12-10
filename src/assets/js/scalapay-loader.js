/**
 * Scalapay Widget Loader
 * Carga el script de Scalapay de forma optimizada, solo cuando hay widgets con merchant-token
 */
(function() {
  'use strict';

  const SCALAPAY_SCRIPT_URL = 'https://cdn.scalapay.com/widget/scalapay-widget-loader.js?version=V5';
  const CHECK_INTERVAL = 50; // Intervalo más agresivo para detección rápida
  const MAX_WAIT_TIME = 10000; // 10 segundos máximo de espera
  const OBSERVER_TIMEOUT = 15000; // 15 segundos para el observer

  let scalapayScriptLoaded = false;
  let checkIntervalId = null;
  let observerTimeoutId = null;
  let observer = null;

  /**
   * Carga el script de Scalapay de forma asíncrona
   */
  function loadScalapayScript() {
    if (scalapayScriptLoaded) return;
    scalapayScriptLoaded = true;

    // Limpiar observadores antes de cargar
    cleanup();

    const script = document.createElement('script');
    script.type = 'module';
    script.src = SCALAPAY_SCRIPT_URL;
    script.crossOrigin = 'anonymous';

    script.onerror = function() {
      // Fallback sin type="module" para navegadores antiguos
      const scriptNoModule = document.createElement('script');
      scriptNoModule.src = SCALAPAY_SCRIPT_URL;
      scriptNoModule.crossOrigin = 'anonymous';
      document.body.appendChild(scriptNoModule);
    };

    document.head.appendChild(script);

    // Notificar cuando el widget esté listo
    checkIntervalId = setInterval(function() {
      if (customElements.get('scalapay-widget')) {
        window.dispatchEvent(new CustomEvent('scalapay-ready'));
        clearInterval(checkIntervalId);
        checkIntervalId = null;
      }
    }, CHECK_INTERVAL);

    // Limpiar después del tiempo máximo
    setTimeout(function() {
      if (checkIntervalId) {
        clearInterval(checkIntervalId);
        checkIntervalId = null;
      }
    }, MAX_WAIT_TIME);
  }

  /**
   * Verifica si hay widgets con merchant-token y carga el script
   * @returns {boolean} true si se encontró un widget y se inició la carga
   */
  function tryLoadIfWidgetReady() {
    // Buscar widget con atributo merchant-token (incluyendo atributos dinámicos de Angular)
    const widget = document.querySelector('scalapay-widget[merchant-token]') ||
                   document.querySelector('scalapay-widget[data-merchant-token]') ||
                   (() => {
                     // Buscar cualquier widget y verificar si tiene el atributo en el DOM
                     const widgets = document.querySelectorAll('scalapay-widget');
                     for (let i = 0; i < widgets.length; i++) {
                       const w = widgets[i];
                       if (w.getAttribute('merchant-token') || 
                           w.getAttribute('data-merchant-token') ||
                           w.hasAttribute('merchant-token')) {
                         return w;
                       }
                     }
                     return null;
                   })();

    if (widget) {
      loadScalapayScript();
      return true;
    }
    return false;
  }

  /**
   * Limpia todos los timers y observadores
   */
  function cleanup() {
    if (checkIntervalId) {
      clearInterval(checkIntervalId);
      checkIntervalId = null;
    }
    if (observerTimeoutId) {
      clearTimeout(observerTimeoutId);
      observerTimeoutId = null;
    }
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  /**
   * Inicializa la detección de widgets
   */
  function init() {
    // Intento inmediato si el DOM ya está listo
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      if (tryLoadIfWidgetReady()) {
        return; // Widget encontrado, no necesitamos observer
      }
    } else {
      // Esperar a DOMContentLoaded para el primer intento
      document.addEventListener('DOMContentLoaded', function() {
        if (tryLoadIfWidgetReady()) {
          return;
        }
        startObserver();
      });
    }

    // Iniciar observer para detectar widgets insertados dinámicamente
    startObserver();
  }

  /**
   * Inicia el MutationObserver para detectar widgets insertados por Angular
   */
  function startObserver() {
    if (observer) return; // Ya hay un observer activo

    observer = new MutationObserver(function(mutations) {
      // Verificar después de cada batch de mutaciones
      if (tryLoadIfWidgetReady()) {
        cleanup();
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['merchant-token', 'data-merchant-token']
    });

    // Timeout de seguridad
    observerTimeoutId = setTimeout(function() {
      cleanup();
    }, OBSERVER_TIMEOUT);
  }

  // Iniciar cuando el script se carga
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
