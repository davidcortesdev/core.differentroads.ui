# 📊 Guía de Implementación - Plan de Medición GA4

## Índice
1. [Configuración Inicial](#configuración-inicial)
2. [Eventos de Ecommerce](#eventos-de-ecommerce)
3. [Funnel de Checkout](#funnel-de-checkout)
4. [Eventos de Usuario](#eventos-de-usuario)
5. [Eventos de Interacción](#eventos-de-interacción)
6. [Eventos de Formularios](#eventos-de-formularios)
7. [Eventos de Búsqueda y Filtros](#eventos-de-búsqueda-y-filtros)
8. [Checklist de Implementación](#checklist-de-implementación)

---

## Configuración Inicial

### Herramientas Configuradas
- **Google Tag Manager (GTM)**: `GTM-K5KH2X3`
- **Google Analytics 4 (GA4)**: `G-MKJR8S98CD` (ID: 317618982)
- **CMP**: Termly - https://termly.io/

### Orden de Carga de Scripts (index.html)
1. **Termly CMP** (primero)
2. **Google Tag Manager** (después de Termly)

---

## Eventos de Ecommerce

### 1. view_item_list
**¿Cuándo?** Usuario visualiza una lista de viajes (recomendados, destacados, por búsqueda, etc.)

**Ubicación en la web:**
- Home: carruseles de tours
- Página de listado de tours
- Resultados de búsqueda
- Tours relacionados en ficha de producto

**Implementación:**
```typescript
import { AnalyticsService, EcommerceItem } from '@core/services/analytics.service';

constructor(private analyticsService: AnalyticsService) {}

// Cuando se carga una lista de tours
onToursListLoaded(tours: any[], listId: string, listName: string) {
  const items: EcommerceItem[] = tours.map((tour, index) => ({
    item_id: tour.id.toString(),
    item_name: tour.name,
    index: index + 1,
    item_brand: 'Different Roads',
    item_category: tour.continent,
    item_category2: tour.country,
    item_category3: tour.season,
    item_category4: tour.months,
    item_category5: tour.tripType, // "Grupos, Singles"
    item_list_id: listId,
    item_list_name: listName,
    price: tour.price,
    quantity: 1,
    puntuacion: tour.rating?.toString(),
    duracion: `${tour.days} días, ${tour.nights} noches`
  }));

  this.analyticsService.viewItemList(
    listId,
    listName,
    items,
    this.getUserData() // Opcional: si usuario está logueado
  );
}
```

---

### 2. select_item
**¿Cuándo?** Usuario hace clic en un tour desde una lista

**Ubicación en la web:**
- Clic en tarjeta de tour desde cualquier listado

**Implementación:**
```typescript
onTourCardClick(tour: any, listId: string, listName: string, index: number) {
  const item: EcommerceItem = {
    item_id: tour.id.toString(),
    item_name: tour.name,
    index: index + 1,
    item_brand: 'Different Roads',
    item_category: tour.continent,
    item_category2: tour.country,
    item_category3: tour.season,
    item_category4: tour.months,
    item_category5: tour.tripType,
    item_list_id: listId,
    item_list_name: listName,
    price: tour.price,
    quantity: 1,
    puntuacion: tour.rating?.toString(),
    duracion: `${tour.days} días, ${tour.nights} noches`
  };

  this.analyticsService.selectItem(listId, listName, item, this.getUserData());
  
  // Navegar a la ficha del tour
  this.router.navigate(['/tour', tour.slug]);
}
```

---

### 3. view_item
**¿Cuándo?** Usuario visualiza la ficha completa de un tour

**Ubicación en la web:**
- Página de detalle del tour (`/tour/:slug`)

**Implementación en TourComponent:**
```typescript
ngOnInit() {
  this.route.params.subscribe(params => {
    this.loadTourData(params['slug']);
  });
}

loadTourData(slug: string) {
  this.tourService.getTour(slug).subscribe(tour => {
    this.tour = tour;
    
    // Disparar evento view_item
    const item: EcommerceItem = {
      item_id: tour.id.toString(),
      item_name: tour.name,
      item_brand: 'Different Roads',
      item_category: tour.continent,
      item_category2: tour.country,
      item_category3: tour.type,
      item_category4: tour.months,
      item_category5: tour.tripType,
      price: tour.basePrice,
      quantity: 1,
      puntuacion: tour.rating?.toString(),
      duracion: `${tour.days} días, ${tour.nights} noches`
    };

    this.analyticsService.viewItem(
      tour.listId || '0',
      tour.listName || 'Directo',
      item,
      this.getUserData()
    );
  });
}
```

---

### 4. add_to_wishlist
**¿Cuándo?** Usuario guarda un presupuesto o añade a favoritos

**Ubicación en la web:**
- Botón "Guardar presupuesto" en ficha de tour
- Icono de corazón en tarjetas de tour

**Implementación:**
```typescript
onSaveBudget(tour: any) {
  // Guardar presupuesto en backend
  this.budgetService.saveBudget(tour.id).subscribe(
    success => {
      const item: EcommerceItem = {
        item_id: tour.id.toString(),
        item_name: tour.name,
        item_brand: 'Different Roads',
        item_category: tour.continent,
        item_category2: tour.country,
        price: this.calculateTotalPrice(),
        quantity: 1,
        puntuacion: tour.rating?.toString(),
        duracion: `${tour.days} días, ${tour.nights} noches`,
        start_date: this.selectedDate.start,
        end_date: this.selectedDate.end,
        pasajeros_adultos: this.adultsCount.toString(),
        pasajeros_niños: this.kidsCount.toString()
      };

      this.analyticsService.addToWishlist(
        'saved_budgets',
        'Presupuestos guardados',
        item,
        this.getUserData()
      );
      
      this.messageService.add({
        severity: 'success',
        summary: 'Presupuesto guardado'
      });
    }
  );
}
```

---

### 5. add_to_cart
**¿Cuándo?** Usuario añade un tour al carrito y va al checkout

**Ubicación en la web:**
- Botón "Reservar ahora" en ficha de tour
- Después de seleccionar fechas, pasajeros y opciones

**Implementación:**
```typescript
onBookNow(tour: any, selectedOptions: any) {
  const item: EcommerceItem = {
    item_id: tour.id.toString(),
    item_name: tour.name,
    item_brand: 'Different Roads',
    item_category: tour.continent,
    item_category2: tour.country,
    item_category3: tour.season,
    item_category4: tour.months,
    item_category5: tour.tripType,
    item_variant: `${tour.id} - ${selectedOptions.flightOrigin}`,
    price: this.calculateTotalPrice(),
    quantity: 1,
    puntuacion: tour.rating?.toString(),
    duracion: `${tour.days} días, ${tour.nights} noches`,
    start_date: selectedOptions.startDate,
    end_date: selectedOptions.endDate,
    pasajeros_adultos: selectedOptions.adults.toString(),
    pasajeros_niños: selectedOptions.kids.toString()
  };

  this.analyticsService.addToCart(
    'EUR',
    this.calculateTotalPrice(),
    item,
    this.getUserData()
  );
  
  // Navegar al checkout
  this.router.navigate(['/checkout', tour.checkoutId]);
}
```

---

### 6. view_cart
**¿Cuándo?** Usuario llega al paso 1 del checkout "Personaliza tu viaje"

**Ubicación en la web:**
- Paso 1 del checkout (`/checkout/:id`)

**Implementación en CheckoutV2Component:**
```typescript
ngOnInit() {
  this.route.params.subscribe(params => {
    this.checkoutId = params['id'];
    this.loadCheckoutData();
  });
}

loadCheckoutData() {
  this.checkoutService.getCheckout(this.checkoutId).subscribe(checkout => {
    this.checkoutData = checkout;
    
    // Disparar view_cart cuando se carga el checkout
    const item: EcommerceItem = {
      item_id: checkout.tour.id.toString(),
      item_name: checkout.tour.name,
      item_brand: 'Different Roads',
      item_category: checkout.tour.continent,
      item_category2: checkout.tour.country,
      item_variant: `${checkout.tour.id} - ${checkout.flightOrigin}`,
      price: checkout.totalPrice,
      quantity: 1,
      start_date: checkout.startDate,
      end_date: checkout.endDate,
      pasajeros_adultos: checkout.adultsCount.toString(),
      pasajeros_niños: checkout.kidsCount.toString()
    };

    this.analyticsService.viewCart(
      'EUR',
      checkout.totalPrice,
      item,
      this.getUserData()
    );
  });
}
```

---

## Funnel de Checkout

### Paso 1: begin_checkout
**¿Cuándo?** Usuario completa paso 1 y da a "Continuar"

```typescript
onContinueFromStep1() {
  const ecommerceData = {
    currency: 'EUR',
    value: this.calculateTotalPrice(),
    coupon: this.appliedCoupon?.code || '',
    items: [this.buildCurrentItem()]
  };

  this.analyticsService.beginCheckout(ecommerceData, this.getUserData());
  
  this.goToStep(2);
}
```

---

### Paso 2: view_flights_info
**¿Cuándo?** Usuario visualiza el paso de selección de vuelos

```typescript
onNavigateToFlights() {
  const ecommerceData = {
    currency: 'EUR',
    value: this.calculateTotalPrice(),
    coupon: this.appliedCoupon?.code || '',
    items: [this.buildCurrentItem()]
  };

  this.analyticsService.viewFlightsInfo(ecommerceData, this.getUserData());
}
```

---

### Paso 3: add_flights_info
**¿Cuándo?** Usuario selecciona vuelo (o "sin vuelos") y continúa

```typescript
onFlightSelected(flight: any) {
  this.selectedFlight = flight;
  
  const item = this.buildCurrentItem();
  item.vuelo = flight ? flight.origin : 'sin_vuelos';
  
  const ecommerceData = {
    currency: 'EUR',
    value: this.calculateTotalPrice(),
    coupon: this.appliedCoupon?.code || '',
    items: [item]
  };

  this.analyticsService.addFlightsInfo(ecommerceData, this.getUserData());
  
  this.goToStep(3);
}
```

---

### Paso 4: view_personal_info
**¿Cuándo?** Usuario visualiza el paso de datos de pasajeros

```typescript
onNavigateToPersonalInfo() {
  const ecommerceData = {
    currency: 'EUR',
    value: this.calculateTotalPrice(),
    coupon: this.appliedCoupon?.code || '',
    items: [this.buildCurrentItem()]
  };

  this.analyticsService.viewPersonalInfo(ecommerceData, this.getUserData());
}
```

---

### Paso 5: add_personal_info
**¿Cuándo?** Usuario completa datos de pasajeros y continúa

```typescript
onPersonalInfoSubmit(travelersData: any) {
  if (this.travelersForm.valid) {
    const ecommerceData = {
      currency: 'EUR',
      value: this.calculateTotalPrice(),
      coupon: this.appliedCoupon?.code || '',
      items: [this.buildCurrentItem()]
    };

    this.analyticsService.addPersonalInfo(ecommerceData, this.getUserData());
    
    this.goToStep(4);
  }
}
```

---

### Paso 6: view_payment_info
**¿Cuándo?** Usuario visualiza el paso de pago

```typescript
onNavigateToPayment() {
  const ecommerceData = {
    currency: 'EUR',
    value: this.calculateTotalPrice(),
    coupon: this.appliedCoupon?.code || '',
    items: [this.buildCurrentItem()]
  };

  this.analyticsService.viewPaymentInfo(ecommerceData, this.getUserData());
}
```

---

### Paso 7: add_payment_info
**¿Cuándo?** Usuario selecciona método de pago y da a "Realizar pago"

```typescript
onSubmitPayment(paymentMethod: string) {
  const ecommerceData = {
    currency: 'EUR',
    value: this.calculateTotalPrice(),
    coupon: this.appliedCoupon?.code || '',
    payment_type: paymentMethod, // "completo, transferencia"
    items: [this.buildCurrentItem()]
  };

  this.analyticsService.addPaymentInfo(ecommerceData, this.getUserData());
  
  // Procesar pago...
}
```

---

### Paso 8: purchase
**¿Cuándo?** Usuario completa la compra y llega a página de confirmación

**Implementación en ReservationComponent:**
```typescript
ngOnInit() {
  this.route.params.subscribe(params => {
    this.reservationId = params['reservationId'];
    this.loadReservationData();
  });
}

loadReservationData() {
  this.reservationService.getReservation(this.reservationId).subscribe(reservation => {
    this.reservation = reservation;
    
    // Disparar evento purchase
    const ecommerceData = {
      transaction_id: reservation.bookingCode, // "#728478F"
      currency: 'EUR',
      value: reservation.totalPrice,
      tax: reservation.taxes || 0,
      shipping: 0,
      coupon: reservation.couponCode || '',
      payment_type: reservation.paymentMethod,
      items: [this.buildPurchaseItem(reservation)]
    };

    this.analyticsService.purchase(ecommerceData, this.getUserData());
  });
}

buildPurchaseItem(reservation: any): EcommerceItem {
  return {
    item_id: reservation.tour.id.toString(),
    item_name: reservation.tour.name,
    item_brand: 'Different Roads',
    item_category: reservation.tour.continent,
    item_category2: reservation.tour.country,
    item_variant: `${reservation.tour.id} - ${reservation.flightOrigin}`,
    price: reservation.totalPrice,
    quantity: 1,
    start_date: reservation.startDate,
    end_date: reservation.endDate,
    pasajeros_adultos: reservation.adultsCount.toString(),
    pasajeros_niños: reservation.kidsCount.toString(),
    actividades: reservation.activities?.join(', ') || '',
    seguros: reservation.insurance || '',
    vuelo: reservation.flightOrigin || ''
  };
}
```

---

## Eventos de Usuario

### sign_up
**¿Cuándo?** Usuario se registra exitosamente

```typescript
onSignUpSuccess(method: string, userData: any) {
  this.analyticsService.signUp(
    method, // "google", "email", "facebook"
    {
      email_address: userData.email,
      phone_number: this.formatPhone(userData.phone),
      user_id: userData.cognitoId
    }
  );
}
```

---

### login
**¿Cuándo?** Usuario inicia sesión exitosamente

```typescript
onLoginSuccess(method: string, userData: any) {
  this.analyticsService.login(
    method,
    {
      email_address: userData.email,
      phone_number: this.formatPhone(userData.phone),
      user_id: userData.cognitoId
    }
  );
}
```

---

## Eventos de Interacción

### menu_interaction
**¿Cuándo?** Usuario hace clic en el menú del header

**Implementación en HeaderComponent:**
```typescript
onMenuItemClick(menuItem: string) {
  this.analyticsService.menuInteraction(menuItem, this.getUserData());
  // Navegar...
}
```

---

### footer_interaction
**¿Cuándo?** Usuario hace clic en enlaces del footer

**Implementación en FooterComponent:**
```typescript
onFooterLinkClick(linkText: string) {
  this.analyticsService.footerInteraction(linkText, this.getUserData());
}
```

---

### trip_type
**¿Cuándo?** Usuario selecciona tipo de viaje en la home

```typescript
onTripTypeClick(tripType: string) {
  this.analyticsService.tripType(
    tripType, // "Grupos", "Singles", "Privados"
    this.getUserData()
  );
}
```

---

### click_logo
**¿Cuándo?** Usuario hace clic en el logo

```typescript
onLogoClick() {
  this.analyticsService.clickLogo(this.getUserData());
  this.router.navigate(['/']);
}
```

---

## Eventos de Formularios

### generated_lead - Newsletter
**¿Cuándo?** Usuario se suscribe a la newsletter exitosamente

```typescript
onNewsletterSubmit(email: string) {
  this.newsletterService.subscribe(email).subscribe(
    success => {
      this.analyticsService.generatedLead(
        'Newsletter',
        { email_address: email }
      );
      this.messageService.add({
        severity: 'success',
        summary: 'Suscripción exitosa'
      });
    }
  );
}
```

---

### generated_lead - Formulario de contacto
**¿Cuándo?** Usuario envía formulario en ficha de tour

```typescript
onContactFormSubmit(formData: any) {
  this.contactService.sendContactForm(formData).subscribe(
    success => {
      this.analyticsService.generatedLead(
        'ficha_tour',
        {
          email_address: formData.email,
          phone_number: this.formatPhone(formData.phone)
        }
      );
      this.messageService.add({
        severity: 'success',
        summary: 'Mensaje enviado'
      });
    }
  );
}
```

---

## Eventos de Búsqueda y Filtros

### search
**¿Cuándo?** Usuario realiza una búsqueda

```typescript
onSearch(searchParams: any) {
  this.analyticsService.search(
    {
      search_term: searchParams.destination,
      start_date: searchParams.startDate,
      end_date: searchParams.endDate,
      trip_type: searchParams.tripType
    },
    this.getUserData()
  );
  
  // Ejecutar búsqueda...
}
```

---

### filter
**¿Cuándo?** Usuario aplica filtros en listados

```typescript
onApplyFilters(filters: any) {
  this.analyticsService.filter(
    {
      filter_categoria: filters.category?.join(','),
      filter_temporada: filters.season,
      filter_mes: filters.month,
      filter_precio: filters.priceRange
    },
    this.getUserData()
  );
  
  this.loadFilteredTours(filters);
}
```

---

### filter_order
**¿Cuándo?** Usuario cambia el orden de resultados

```typescript
onSortChange(sortOption: string) {
  this.analyticsService.filterOrder(sortOption, this.getUserData());
  this.sortTours(sortOption);
}
```

---

## Eventos de Archivos

### file_download
**¿Cuándo?** Usuario descarga un presupuesto

```typescript
onDownloadBudget() {
  this.budgetService.downloadPDF(this.budgetId).subscribe(
    pdf => {
      this.analyticsService.fileDownload('Presupuesto', this.getUserData());
      this.downloadFile(pdf);
    }
  );
}
```

---

### share
**¿Cuándo?** Usuario comparte un presupuesto

```typescript
onShareBudget(email: string) {
  this.budgetService.shareBudget(this.budgetId, email).subscribe(
    success => {
      this.analyticsService.share('Presupuesto', this.getUserData());
      this.messageService.add({
        severity: 'success',
        summary: 'Presupuesto compartido'
      });
    }
  );
}
```

---

## Método Auxiliar getUserData()

Añadir este método en cada componente que use analytics:

```typescript
import { AuthenticateService } from '@core/services/auth-service.service';

constructor(
  private analyticsService: AnalyticsService,
  private authService: AuthenticateService
) {}

private getUserData() {
  // Si el usuario está logueado, obtener sus datos
  if (this.authService.isAuthenticated$.value) {
    return this.analyticsService.getUserData(
      this.authService.currentUserEmail$.value,
      this.formatPhone(this.userPhone),
      this.authService.currentUserCognitoId$.value
    );
  }
  return undefined;
}

private formatPhone(phone: string): string {
  if (!phone) return '';
  return this.analyticsService.formatPhoneNumber(phone, '+34');
}
```

---

## Checklist de Implementación

### ✅ Configuración Base
- [x] Servicio de Analytics creado
- [x] GTM instalado en index.html
- [x] Termly CMP configurado

### 📦 Eventos de Ecommerce
- [ ] view_item_list (Listados de tours)
- [ ] select_item (Clic en tour)
- [ ] view_item (Ficha de tour)
- [ ] add_to_wishlist (Guardar presupuesto)
- [ ] add_to_cart (Reservar ahora)
- [ ] view_cart (Paso 1 checkout)

### 🛒 Funnel de Checkout
- [ ] begin_checkout (Paso 1 → 2)
- [ ] view_flights_info (Ver vuelos)
- [ ] add_flights_info (Seleccionar vuelo)
- [ ] view_personal_info (Ver datos pasajeros)
- [ ] add_personal_info (Completar datos)
- [ ] view_payment_info (Ver pago)
- [ ] add_payment_info (Seleccionar pago)
- [ ] purchase (Compra completada)

### 👤 Eventos de Usuario
- [ ] sign_up (Registro)
- [ ] login (Inicio de sesión)

### 🖱️ Eventos de Interacción
- [ ] menu_interaction (Clic en menú)
- [ ] footer_interaction (Clic en footer)
- [ ] trip_type (Tipo de viaje)
- [ ] click_logo (Logo)

### 📝 Eventos de Formularios
- [ ] generated_lead (Newsletter)
- [ ] generated_lead (Formulario contacto)

### 🔍 Búsqueda y Filtros
- [ ] search (Buscador)
- [ ] filter (Filtros)
- [ ] filter_order (Ordenar)

### 📄 Eventos de Archivos
- [ ] file_download (Descargar presupuesto)
- [ ] share (Compartir presupuesto)

---

## Próximos Pasos

1. **Implementar eventos por prioridad:**
   - ✅ Alta: Funnel completo de checkout (conversión)
   - 🟡 Media: Eventos de ecommerce (comportamiento de usuario)
   - 🔵 Baja: Eventos de interacción (análisis UX)

2. **Configurar GTM:**
   - Crear triggers para cada evento
   - Configurar tag de GA4
   - Habilitar Consent Mode V2
   - Configurar conversiones

3. **Testing:**
   - Probar cada evento en preview de GTM
   - Verificar en DebugView de GA4
   - Validar estructura de datos

4. **Documentación:**
   - Mantener tabla de eventos actualizada
   - Documentar cambios en historial de versiones
   - Crear guía para equipo de desarrollo

---

## Soporte

Para dudas sobre la implementación, consultar:
- Plan de medición completo
- Documentación de GA4: https://developers.google.com/analytics/devguides/collection/ga4
- Documentación de GTM: https://developers.google.com/tag-platform/tag-manager

