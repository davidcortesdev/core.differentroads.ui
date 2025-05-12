import { NgModule } from '@angular/core';
import { RouterModule, Routes, ExtraOptions } from '@angular/router';
import { MainComponent } from './layout/main/main.component';
import { HomeComponent } from './pages/home/home.component';
import { NotFoundComponent } from './pages/not-found/not-found.component';
import { TourComponent } from './pages/tour/tour.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { PersonalInfoSectionComponent } from './pages/profile/components/personal-info-section/personal-info-section.component';
import { UpdateProfileSectionComponent } from './pages/profile/components/update-profile-section/update-profile-section.component';
import { LoginComponent } from './pages/login/login.component';
import { SignUpComponent } from './pages/sign-up/sign-up.component';
import { ForgetPasswordComponent } from './pages/forget-password/forget-password.component';
import { BasicPageComponent } from './pages/basic-page/basic-page.component';
import { CheckoutComponent } from './pages/checkout/checkout.component';
import { ContentPageComponent } from './pages/content-page/content-page.component';
import { ToursComponent } from './shared/components/tours/tours.component';
import { ReservationComponent } from './pages/reservation/reservation.component';
import { BookingsComponent } from './pages/bookings/bookings.component';
import { PaymentsComponent } from './pages/payments/payments.component';
import { AirportSearchComponent } from './features/airports/airport-search/airport-search.component';

const routes: Routes = [
  {
    path: '',
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', component: HomeComponent },
      {
        path: 'profile',
        component: ProfileComponent,
      },
      { path: 'login', component: LoginComponent },
      { path: 'sign-up', component: SignUpComponent },
      { path: 'forget-password', component: ForgetPasswordComponent },
      { path: 'tours', component: ToursComponent },
      { path: 'tour/:slug', component: TourComponent },
      { path: 'pages/:slug', component: BasicPageComponent },
      { path: 'checkout', component: CheckoutComponent },
      { path: 'checkout/:id', component: CheckoutComponent },
      { path: 'payment/:id', component: PaymentsComponent },
      { path: 'landing/:slug', component: ContentPageComponent },
      { path: 'collection/:slug', component: ContentPageComponent },
      { path: 'press/:slug', component: ContentPageComponent },
      { path: 'blog/:slug', component: ContentPageComponent },
      { path: 'reservation/:id', component: ReservationComponent },
      {
        path: 'reservation/:id/:status/:paymentID',
        component: ReservationComponent,
      },
      { path: 'bookings/:id', component: BookingsComponent },
      { path: 'aeropuertos', component: AirportSearchComponent },
      { path: '**', component: NotFoundComponent },
    ],
  },
];

// Configure the router to scroll to top on navigation
const routerOptions: ExtraOptions = {
  scrollPositionRestoration: 'enabled',
  anchorScrolling: 'enabled',
  scrollOffset: [0, 0],
  onSameUrlNavigation: 'reload'  // Añadir esta línea para forzar recarga en la misma URL
};

@NgModule({
  imports: [RouterModule.forRoot(routes, routerOptions)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
