// ========================================
// ANGULAR CORE
// ========================================
import { NgModule } from '@angular/core';
import { RouterModule, Routes, ExtraOptions } from '@angular/router';

// ========================================
// LAYOUT COMPONENTS
// ========================================
import { MainComponent } from './layout/main/main.component';
import { StandaloneComponent } from './layout/standalone/standalone.component';

// ========================================
// PAGE COMPONENTS - AUTH
// ========================================
import { LoginComponent } from './pages/login/login.component';
import { SignUpComponent } from './pages/sign-up/sign-up.component';
import { ForgetPasswordComponent } from './pages/forget-password/forget-password.component';

// ========================================
// PAGE COMPONENTS - HOME
// ========================================
import { HomeV2Component } from './pages/home-v2/home-v2.component';

// ========================================
// PAGE COMPONENTS - TOUR
// ========================================
import { TourV2Component } from './pages/tour-v2/tour-v2.component';

// ========================================
// PAGE COMPONENTS - CHECKOUT
// ========================================
import { CheckoutV2Component } from './pages/checkout-v2/checkout-v2.component';
import { NewReservationComponent } from './pages/checkout-v2/components/new-reservation/new-reservation.component';

// ========================================
// PAGE COMPONENTS - BOOKINGS
// ========================================
import { Bookingsv2Component } from './pages/bookingsv2/bookings.component';

// ========================================
// PAGE COMPONENTS - PROFILE
// ========================================
import { ProfileV2Component } from './pages/profile-v2/profile-v2.component';

// ========================================
// PAGE COMPONENTS - OTHER PAGES
// ========================================
import { NotFoundComponent } from './pages/not-found/not-found.component';
import { DestinationPageComponent } from './pages/destination-page/destination-page.component';
import { CategoryPageComponent } from './pages/category-page/category-page.component';
import { BasicPageComponent } from './pages/basic-page/basic-page.component';
import { BasicPagePreviewComponent } from './pages/basic-page/basic-page-preview/basic-page-preview.component';
import { ContentPageComponent } from './pages/content-page/content-page.component';
import { ReviewSurveyComponent } from './pages/review-survey/review-survey.component';

// ========================================
// SHARED COMPONENTS
// ========================================
import { ToursComponent } from './shared/components/tours/tours.component';

// ========================================
// ROUTES CONFIGURATION
// ========================================
const routes: Routes = [
  // ========================================
  // STANDALONE ROUTES (sin header ni footer)
  // ========================================
  {
    path: 'standalone',
    component: StandaloneComponent,
    children: [
      { path: 'checkout/:reservationId', component: CheckoutV2Component },
      { path: 'bookingsv2/:id', component: Bookingsv2Component },
      {
        path: 'reservation/:reservationId/:paymentId',
        component: NewReservationComponent,
      },
      {
        path: 'reservation/:reservationId',
        component: NewReservationComponent,
      },
    ],
  },

  // ========================================
  // MAIN LAYOUT ROUTES (con header y footer)
  // ========================================
  {
    path: '',
    component: MainComponent,
    children: [
      // ========================================
      // HOME
      // ========================================
      { path: '', component: HomeV2Component, pathMatch: 'full' },

      // ========================================
      // AUTH ROUTES
      // ========================================
      { path: 'login', component: LoginComponent },
      { path: 'sign-up', component: SignUpComponent },
      { path: 'forget-password', component: ForgetPasswordComponent },

      // ========================================
      // PROFILE ROUTES
      // ========================================
      { path: 'profile-v2/:userId', component: ProfileV2Component },

      // ========================================
      // TOUR ROUTES
      // ========================================
      { path: 'tours', component: ToursComponent },
      { path: 'tour/:slug', component: TourV2Component },
      { path: 'tour/:slug/preview', component: TourV2Component },

      // ========================================
      // CHECKOUT ROUTES
      // ========================================
      { path: 'checkout-v2/:reservationId', component: CheckoutV2Component },

      // ========================================
      // RESERVATION ROUTES
      // ========================================
      // Versión nueva con paymentId
      {
        path: 'reservation/:reservationId/:paymentId',
        component: NewReservationComponent,
      },
      // Versión nueva sin paymentId (opcional)
      {
        path: 'reservation/:reservationId',
        component: NewReservationComponent,
      },

      // ========================================
      // BOOKINGS ROUTES
      // ========================================
      { path: 'bookingsv2/:id', component: Bookingsv2Component },

      // ========================================
      // CONTENT PAGES ROUTES
      // ========================================
      { path: 'preview/pages', component: BasicPagePreviewComponent },
      { path: 'pages/:slug', component: BasicPageComponent },
      { path: 'landing/:slug', component: ContentPageComponent },
      { path: 'collection/:slug', component: ContentPageComponent },
      { path: 'press/:slug', component: ContentPageComponent },
      { path: 'blog/:slug', component: ContentPageComponent },

      // ========================================
      // FEATURES ROUTES
      // ========================================
      { path: 'reviews/:periodTkId', component: ReviewSurveyComponent },

      // ========================================
      // NOT FOUND ROUTE (debe estar antes de las rutas dinámicas)
      // ========================================
      { path: 'not-found', component: NotFoundComponent },

      // ========================================
      // DYNAMIC MENU ROUTES - DESTINATIONS (más específicas primero)
      // ========================================
      // Destino con continente y país: /destino/africa/marruecos
      { 
        path: 'destino/:menuItemSlug/:destinationSlug', 
        component: DestinationPageComponent,
        data: { type: 'destination' }
      },
      // Destino solo con continente: /destino/africa
      { 
        path: 'destino/:menuItemSlug', 
        component: DestinationPageComponent,
        data: { type: 'destination' }
      },

      // ========================================
      // DYNAMIC MENU ROUTES - CATEGORIES (al final, son las más genéricas)
      // ========================================
      // Categoría con sub-item: /temporada/semana-santa
      { 
        path: ':menuItemSlug/:subItemSlug', 
        component: CategoryPageComponent,
        data: { type: 'category' }
      },
      // Categoría sola: /temporada
      { 
        path: ':menuItemSlug', 
        component: CategoryPageComponent,
        data: { type: 'category' }
      },

      // ========================================
      // 404 - NOT FOUND (siempre debe ser la última)
      // ========================================
      { path: '**', component: NotFoundComponent },
    ],
  },
];

// ========================================
// ROUTER CONFIGURATION
// ========================================
const routerOptions: ExtraOptions = {
  scrollPositionRestoration: 'enabled', // Restaura la posición de scroll al navegar
  anchorScrolling: 'enabled', // Habilita el scroll a anclas
  scrollOffset: [0, 0], // Offset para el scroll
  onSameUrlNavigation: 'reload', // Fuerza recarga en la misma URL
};

// ========================================
// APP ROUTING MODULE
// ========================================
@NgModule({
  imports: [RouterModule.forRoot(routes, routerOptions)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
