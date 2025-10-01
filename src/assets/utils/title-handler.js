/**
 * Manejador de títulos dinámicos para SEO
 * Se ejecuta inmediatamente al cargar la página para establecer títulos apropiados
 */
(function() {
  'use strict';
  
  function setDynamicTitle() {
    var path = window.location.pathname;
    var title = 'Different Roads - Viajes y Experiencias Únicas';
    
    // Mapeo de rutas a títulos específicos
    if (path === '/' || path === '/home' || path === '/home-v2') {
      title = 'Different Roads - Viajes y Experiencias Únicas';
    } else if (path === '/tours') {
      title = 'Tours y Experiencias - Different Roads';
    } else if (path === '/login') {
      title = 'Iniciar Sesión - Different Roads';
    } else if (path === '/sign-up') {
      title = 'Registrarse - Different Roads';
    } else if (path === '/forget-password') {
      title = 'Recuperar Contraseña - Different Roads';
    } else if (path === '/profile' || path.startsWith('/profile-v2/')) {
      title = 'Mi Perfil - Different Roads';
    } else if (path.startsWith('/bookings/') || path.startsWith('/bookingsv2/')) {
      title = 'Mis Reservas - Different Roads';
    } else if (path.startsWith('/payment/')) {
      title = 'Pagos - Different Roads';
    } else if (path === '/aeropuertos') {
      title = 'Búsqueda de Aeropuertos - Different Roads';
    } else if (path.startsWith('/standalone/')) {
      title = 'Checkout - Different Roads';
    } else if (path.startsWith('/preview/pages')) {
      title = 'Vista Previa - Different Roads';
    } else if (path.startsWith('/tour/') || path.startsWith('/tour-old/')) {
      title = 'Tour - Different Roads';
    } else if (path.startsWith('/pages/')) {
      title = 'Página - Different Roads';
    } else if (path.startsWith('/landing/')) {
      title = 'Landing - Different Roads';
    } else if (path.startsWith('/collection/')) {
      title = 'Colección - Different Roads';
    } else if (path.startsWith('/press/')) {
      title = 'Prensa - Different Roads';
    } else if (path.startsWith('/blog/')) {
      title = 'Blog - Different Roads';
    } else if (path.startsWith('/checkout/') || path.startsWith('/checkout-v2/')) {
      title = 'Checkout - Different Roads';
    } else if (path.startsWith('/reservation/')) {
      title = 'Reserva - Different Roads';
    } else if (path.startsWith('/reviews/')) {
      title = 'Reseñas - Different Roads';
    } else if (path === '/**' || path.includes('404') || path.includes('not-found')) {
      title = 'Página No Encontrada - Different Roads';
    }
    
    // Establecer el título
    document.title = title;
  }
  
  // Ejecutar inmediatamente
  setDynamicTitle();
  
  // También ejecutar cuando cambie la URL (para SPA)
  var originalPushState = history.pushState;
  var originalReplaceState = history.replaceState;
  
  history.pushState = function() {
    originalPushState.apply(history, arguments);
    setDynamicTitle();
  };
  
  history.replaceState = function() {
    originalReplaceState.apply(history, arguments);
    setDynamicTitle();
  };
  
  window.addEventListener('popstate', setDynamicTitle);
  
})();
