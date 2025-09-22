import { NgModule } from '@angular/core';
import { RouterModule, Routes, ExtraOptions } from '@angular/router';
import { MainComponent } from './layout/main/main.component';
import { HomeComponent } from './pages/home/home.component';
import { HomeV2Component } from './pages/home-v2/home-v2.component';
import { NotFoundComponent } from './pages/not-found/not-found.component';
import { TourComponent } from './pages/tour/tour.component';
import { TourV2Component } from './pages/tour-v2/tour-v2.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { PersonalInfoSectionComponent } from './pages/profile/components/personal-info-section/personal-info-section.component';
import { UpdateProfileSectionComponent } from './pages/profile/components/update-profile-section/update-profile-section.component';
import { LoginComponent } from './pages/login/login.component';
import { SignUpComponent } from './pages/sign-up/sign-up.component';
import { ForgetPasswordComponent } from './pages/forget-password/forget-password.component';
import { BasicPageComponent } from './pages/basic-page/basic-page.component';
import { CheckoutComponent } from './pages/checkout/checkout.component';
import { CheckoutV2Component } from './pages/checkout-v2/checkout-v2.component';
import { ContentPageComponent } from './pages/content-page/content-page.component';
import { ToursComponent } from './shared/components/tours/tours.component';
import { ReservationComponent } from './pages/reservation/reservation.component';
import { BookingsComponent } from './pages/bookings/bookings.component';
import { PaymentsComponent } from './pages/payments/payments.component';
import { AirportSearchComponent } from './features/airports/airport-search/airport-search.component';
import { BasicPagePreviewComponent } from './pages/basic-page/basic-page-preview/basic-page-preview.component';
import { ReviewSurveyComponent } from './pages/review-survey/review-survey.component';
import { ReviewSectionComponent } from './pages/profile/components/review-section/review-section.component';
import { NewReservationComponent } from './pages/checkout-v2/components/new-reservation/new-reservation.component';
import { StandaloneComponent } from './layout/standalone/standalone.component';

const routes: Routes = [
  // Rutas standalone (sin header ni footer)
  {
    path: 'standalone',
    component: StandaloneComponent,
    children: [
      { path: 'checkout', component: CheckoutV2Component },
      { path: 'checkout/:reservationId', component: CheckoutV2Component },
    ],
  },
  {
    path: '',
    component: MainComponent,
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', component: HomeComponent },
      { path: 'home-v2', component: HomeV2Component },
      {
        path: 'profile',
        component: ProfileComponent,
      },
      { path: 'login', component: LoginComponent },
      { path: 'sign-up', component: SignUpComponent },
      { path: 'forget-password', component: ForgetPasswordComponent },
      { path: 'tours', component: ToursComponent },
      { path: 'tour-old/:slug', component: TourComponent },
      { path: 'tour/:slug', component: TourV2Component },
      { path: 'tour/:slug/preview', component: TourV2Component },
      { path: 'pages/:slug', component: BasicPageComponent },
      // Nueva ruta para previsualización
      { path: 'preview/pages', component: BasicPagePreviewComponent },
      { path: 'checkout', component: CheckoutComponent },
      { path: 'checkout/:id', component: CheckoutComponent },
      { path: 'checkout-v2', component: CheckoutV2Component },
      { path: 'checkout-v2/:reservationId', component: CheckoutV2Component },
      { path: 'payment/:id', component: PaymentsComponent },
      { path: 'landing/:slug', component: ContentPageComponent },
      { path: 'collection/:slug', component: ContentPageComponent },
      { path: 'press/:slug', component: ContentPageComponent },
      { path: 'blog/:slug', component: ContentPageComponent },
      { path: 'reservation/:id', component: ReservationComponent }, //OJO es el viejo
      {
        path: 'reservation/:id/:status/:paymentID',
        component: ReservationComponent,
      }, //OJO es el viejo
      {
        path: 'reservation/:reservationId/:paymentId',
        component: NewReservationComponent,
      }, //OJO es el nuevo
      { path: 'bookings/:id', component: BookingsComponent },
      { path: 'aeropuertos', component: AirportSearchComponent },
      { path: 'reviews/:id', component: ReviewSurveyComponent },
      { path: '**', component: NotFoundComponent },
    ],
  },
];

// Configure the router to scroll to top on navigation
const routerOptions: ExtraOptions = {
  scrollPositionRestoration: 'enabled',
  anchorScrolling: 'enabled',
  scrollOffset: [0, 0],
  onSameUrlNavigation: 'reload', // Añadir esta línea para forzar recarga en la misma URL
};

@NgModule({
  imports: [RouterModule.forRoot(routes, routerOptions)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
