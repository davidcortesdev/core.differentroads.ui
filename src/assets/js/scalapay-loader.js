(() => {
  // Carga el loader de Scalapay solo cuando exista un widget con merchant-token
  let scalapayScriptLoaded = false;

  const loadScalapayScript = () => {
    if (scalapayScriptLoaded) return;
    scalapayScriptLoaded = true;

    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://cdn.scalapay.com/widget/scalapay-widget-loader.js?version=V5';
    script.crossOrigin = 'anonymous';

    script.onerror = () => {
      // Fallback sin type="module"
      const scriptNoModule = document.createElement('script');
      scriptNoModule.src = 'https://cdn.scalapay.com/widget/scalapay-widget-loader.js?version=V5';
      scriptNoModule.crossOrigin = 'anonymous';
      document.body.appendChild(scriptNoModule);
    };

    document.body.appendChild(script);

    // Notificar cuando el widget esté listo
    const checkInterval = setInterval(() => {
      if (customElements.get('scalapay-widget')) {
        window.dispatchEvent(new CustomEvent('scalapay-ready'));
        clearInterval(checkInterval);
      }
    }, 100);

    // Limpiar después de 10 segundos
    setTimeout(() => { clearInterval(checkInterval); }, 10000);
  };

  const tryLoadIfWidgetReady = () => {
    const widgetWithToken = document.querySelector('scalapay-widget[merchant-token]');
    if (widgetWithToken) {
      loadScalapayScript();
      return true;
    }
    return false;
  };

  // Primer intento en DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryLoadIfWidgetReady);
  } else {
    tryLoadIfWidgetReady();
  }

  // Observador para detectar cuando Angular inserte el widget
  const observer = new MutationObserver(() => {
    if (tryLoadIfWidgetReady()) {
      observer.disconnect();
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });

  // Fallback: dejar de observar a los 15s
  setTimeout(() => {
    observer.disconnect();
  }, 15000);
})();
