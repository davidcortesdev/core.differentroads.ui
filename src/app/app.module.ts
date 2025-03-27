import { NgModule, CUSTOM_ELEMENTS_SCHEMA, LOCALE_ID } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';

import { HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

// App Routing and Components
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

// Layout Components
import { HeaderComponent } from './layout/header/header.component';
import { FooterComponent } from './layout/footer/footer.component';
import { MainComponent } from './layout/main/main.component';

// Page Components
import { HomeComponent } from './pages/home/home.component';
import { HeroSectionComponent } from './pages/home/components/hero-section/hero-section.component';
import { ToursSectionComponent } from './pages/home/components/tours-section/tours-section.component';
import { HighlightSectionComponent } from './pages/home/components/highlight-section/highlight-section.component';
import { FullCardSectionComponent } from './pages/home/components/full-card-section/full-card-section.component';
import { CarouselSectionComponent } from './pages/home/components/carousel-section/carousel-section.component';

// Community Components
import { CommunitySectionComponent } from './pages/home/components/community-section/community-section.component';
import { CommunityHeroComponent } from './pages/home/components/community-section/components/community-hero/community-hero.component';
import { CommunityGalleryComponent } from './pages/home/components/community-section/components/community-gallery/community-gallery.component';
import { CommunityReviewsComponent } from './pages/home/components/community-section/components/community-reviews/community-reviews.component';
import { NewsLetterSectionComponent } from './pages/home/components/community-section/components/newsletter-section/newsletter-section.component';
import { PublicitySectionComponent } from './pages/home/components/publicity-section/publicity-section.component';

// Tour List Component
import { ToursListComponent } from './pages/home/components/tours-list-section/tours-list-section.component';

// Content List
import { ContentListComponent } from './pages/home/components/content-list/content-list-section.component';

// PrimeNG Configuration
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';

// PrimeNG Modules
import { MenuModule } from 'primeng/menu';
import { MenubarModule } from 'primeng/menubar';
import { TabsModule } from 'primeng/tabs';
import { EditorModule } from 'primeng/editor';
import { FloatLabelModule } from 'primeng/floatlabel';
import { IftaLabelModule } from 'primeng/iftalabel';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { FileUploadModule } from 'primeng/fileupload';
import { ImageModule } from 'primeng/image';
import { RatingModule } from 'primeng/rating';
import { AvatarModule } from 'primeng/avatar';
import { AvatarGroupModule } from 'primeng/avatargroup';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { CalendarModule } from 'primeng/calendar';
import { ButtonModule } from 'primeng/button';
import { CarouselModule } from 'primeng/carousel';
import { CardModule } from 'primeng/card';
import { DatePickerModule } from 'primeng/datepicker';
import { RippleModule } from 'primeng/ripple';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DataViewModule } from 'primeng/dataview';
import { DynamicComponentsComponent } from './pages/home/components/dynamic-components/dynamic-components.component';
import { NotFoundComponent } from './pages/not-found/not-found.component';
import { CommonModule, NgComponentOutlet } from '@angular/common';
import { PartnersSectionComponent } from './pages/home/components/partners-section/partners-section.component';
import { TourComponent } from './pages/tour/tour.component';
import { TourHeaderComponent } from './pages/tour/components/tour-header/tour-header.component';
import { TourOverviewComponent } from './pages/tour/components/tour-overview/tour-overview.component';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { DividerModule } from 'primeng/divider';
import { MessageModule } from 'primeng/message';
import { PanelModule } from 'primeng/panel';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { DropdownModule } from 'primeng/dropdown';
import { ToolbarModule } from 'primeng/toolbar';
import { TableModule } from 'primeng/table';
import { ProfileComponent } from './pages/profile/profile.component';
import { PersonalInfoSectionComponent } from './pages/profile/components/personal-info-section/personal-info-section.component';
import { UpdateProfileSectionComponent } from './pages/profile/components/update-profile-section/update-profile-section.component';
import { TourHighlightsComponent } from './pages/tour/components/tour-highlights/tour-highlights.component';
import { TourItineraryComponent } from './pages/tour/components/tour-itinerary/tour-itinerary.component';
import { TourDeparturesComponent } from './pages/tour/components/tour-departures/tour-departures.component';
import { TourAdditionalInfoComponent } from './pages/tour/components/tour-additional-info/tour-additional-info.component';
import { TourReviewsComponent } from './pages/tour/components/tour-reviews/tour-reviews.component';
import { TourGalleryComponent } from './pages/tour/components/tour-gallery/tour-gallery.component';
import { TourFaqComponent } from './pages/tour/components/tour-faq/tour-faq.component';
import { TourRelatedComponent } from './pages/tour/components/tour-related/tour-related.component';
import { FluidModule } from 'primeng/fluid';
import { SignUpComponent } from './pages/sign-up/sign-up.component';
import { PointsSectionComponent } from './pages/profile/components/points-section/points-section.component';
import { ActiveBookingsSectionComponent } from './pages/profile/components/active-bookings-section/active-bookings-section.component';
import { TravelHistorySectionComponent } from './pages/profile/components/travel-history-section/travel-history-section.component';
import { RecentBudgetSectionComponent } from './pages/profile/components/recent-budget-section/recent-budget-section.component';
import { ReviewSectionComponent } from './pages/profile/components/review-section/review-section.component';
import { ForgetPasswordComponent } from './pages/forget-password/forget-password.component';
import { ReviewsComponent } from './shared/components/reviews/reviews.component';
import { AccordionModule } from 'primeng/accordion';
import { ChipModule } from 'primeng/chip';
import { TagModule } from 'primeng/tag';
import { SecondFooterSectionComponent } from './layout/footer/components/second-footer-section/second-footer-section.component';
import { TimelineModule } from 'primeng/timeline';
import { BadgeModule } from 'primeng/badge';
import { OverlayBadgeModule } from 'primeng/overlaybadge';
import { RadioButtonModule } from 'primeng/radiobutton';
import { CheckboxModule } from 'primeng/checkbox';

import MyPreset from './mytheme';
import { BasicPageComponent } from './pages/basic-page/basic-page.component';
import { TitleAndQuillComponent } from './pages/basic-page/components/title-and-quill/title-and-quill.component';
import { CheckoutComponent } from './pages/checkout/checkout.component';
import { CustomizeTripComponent } from './pages/checkout/components/customize-trip/customize-trip.component';
import { FlightsComponent } from './pages/checkout/components/flights/flights.component';
import { TravelersComponent } from './pages/checkout/components/travelers/travelers.component';
import { PaymentComponent } from './pages/checkout/components/payment/payment.component';
import { TourCardComponent } from './shared/components/tour-card/tour-card.component';
import { ReactiveFormsModule } from '@angular/forms';

import { StepsModule } from 'primeng/steps';

import { StepperModule } from 'primeng/stepper';
import { ContentPageComponent } from './pages/content-page/content-page.component';
import { BannerComponent } from './shared/components/banner/banner.component';

import { MultiSelectModule } from 'primeng/multiselect';
import { ToursComponent } from './shared/components/tours/tours.component';
import { OptionalActivitiesComponent } from './pages/checkout/components/customize-trip/components/optional-activities/optional-activities.component';
import { TravelerSelectorComponent } from './pages/checkout/components/customize-trip/components/traveler-selector/traveler-selector.component';
import { RoomSelectorComponent } from './pages/checkout/components/customize-trip/components/room-selector/room-selector.component';

import { FlightItineraryComponent } from './pages/checkout/components/flights/components/flight-itinerary/flight-itinerary.component';
import { CurrencyPipe } from './core/pipes/currency.pipe';
import { ReservationComponent } from './pages/reservation/reservation.component';
import { TravelInformationSectionComponent } from './pages/reservation/components/travel-information-section/travel-information-section.component';
import { TravelersInformationSectionComponent } from './pages/reservation/components/travelers-information-section/travelers-information-section.component';
import { FlightsSectionComponent } from './pages/reservation/components/flights-section/flights-section.component';
import { PricesSectionComponent } from './pages/reservation/components/prices-section/prices-section.component';
import { PaymentsInformationSectionComponent } from './pages/reservation/components/payments-information-section/payments-information-section.component';

import { GoogleMapsModule } from '@angular/google-maps';

import { SkeletonModule } from 'primeng/skeleton';
import { SortByPipe } from './shared/pipes/sort-by.pipe';
import { InsurancesComponent } from './pages/checkout/components/customize-trip/components/insurances/insurances.component';
import { Dialog } from 'primeng/dialog';
import { BudgetDialogComponent } from './shared/components/budget-dialog/budget-dialog.component';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { Amplify } from 'aws-amplify';
import awsconfig from '../../src/aws-exports';
import { TripTypesSectionComponent } from './pages/home/components/trip-types-section/trip-types-section.component';
import { ConfirmationCodeComponent } from './shared/components/confirmation-code/confirmation-code.component';
// Add this function outside the class
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

import { MessageService } from 'primeng/api';
import { TourDateSelectorComponent } from './pages/tour/components/tour-date-selector/tour-date-selector.component';
import { DiscountCodeComponent } from './pages/checkout/components/discount-code/discount-code.component';
import { FlightSearchComponent } from './pages/checkout/components/flights/components/flight-search/flight-search.component';
import { TravelerItemComponent } from './pages/checkout/components/traveler-item/traveler-item.component';
import { FlightSectionComponent } from './pages/checkout/components/flight-section/flight-section.component';
import { LoginModalComponent } from './pages/checkout/components/flights/components/login-modal/login-modal.component';
import { BookingsComponent } from './pages/bookings/bookings.component';
import { BookingActivitiesComponent } from './pages/bookings/booking-activities/booking-activities.component';
import { BookingCodeSectionComponent } from './pages/bookings/booking-code-section/booking-code-section.component';
import { BookingDetailsViewComponent } from './pages/bookings/booking-details-view/booking-details-view.component';
import { BookingDocumentActionsComponent } from './pages/bookings/booking-document-actions/booking-document-actions.component';
import { BookingFlightsComponent } from './pages/bookings/booking-flights/booking-flights.component';
import { BookingHeaderSectionComponent } from './pages/bookings/booking-header-section/booking-header-section.component';
import { BookingPaymentHistoryComponent } from './pages/bookings/booking-payment-history/booking-payment-history.component';
import { BookingPersonalDataComponent } from './pages/bookings/booking-personal-data/booking-personal-data.component';
import { BookingUpdateTravelComponent } from './pages/bookings/booking-update-travel/booking-update-travel.component';
import { PassengerCardComponent } from './pages/bookings/passenger-card/passenger-card.component';
import { UploadButtonComponent } from './shared/components/upload-button/upload-button.component';
import { PaymentsComponent } from './pages/payments/payments.component';
// Register Spanish locale data
registerLocaleData(localeEs);

@NgModule({
  declarations: [
    // App Components
    AppComponent,

    // Layout Components
    HeaderComponent,
    FooterComponent,
    MainComponent,

    // Page Components
    HomeComponent,
    DynamicComponentsComponent,
    HeroSectionComponent,
    ToursSectionComponent,
    HighlightSectionComponent,
    FullCardSectionComponent,
    CarouselSectionComponent,
    // Community Components
    CommunitySectionComponent,
    CommunityHeroComponent,
    CommunityGalleryComponent,
    CommunityReviewsComponent,
    PublicitySectionComponent,

    // Tours List
    ToursListComponent,
    TourCardComponent,

    // Content List
    ContentListComponent,
    NotFoundComponent,

    PartnersSectionComponent,
    TourComponent,
    TourHeaderComponent,
    TourOverviewComponent,
    ProfileComponent,
    PersonalInfoSectionComponent,
    UpdateProfileSectionComponent,
    TourHighlightsComponent,
    TourItineraryComponent,
    TourDeparturesComponent,
    TourAdditionalInfoComponent,
    TourReviewsComponent,
    TourGalleryComponent,
    TourFaqComponent,
    TourRelatedComponent,
    PointsSectionComponent,
    ActiveBookingsSectionComponent,
    TravelHistorySectionComponent,
    RecentBudgetSectionComponent,
    ReviewSectionComponent,
    ReviewsComponent,
    SecondFooterSectionComponent,
    BasicPageComponent,
    TitleAndQuillComponent,
    CheckoutComponent,
    CustomizeTripComponent,
    FlightsComponent,
    TravelersComponent,
    PaymentComponent,
    ContentPageComponent,
    BannerComponent,
    ToursComponent,
    OptionalActivitiesComponent,
    TravelerSelectorComponent,
    RoomSelectorComponent,
    FlightItineraryComponent,
    ReservationComponent,
    TravelInformationSectionComponent,
    TravelersInformationSectionComponent,
    FlightsSectionComponent,
    PricesSectionComponent,
    PaymentsInformationSectionComponent,
    InsurancesComponent,
    BudgetDialogComponent,
    TripTypesSectionComponent,
    TourDateSelectorComponent,
    DiscountCodeComponent,
    FlightSearchComponent,
    TravelerItemComponent,
    FlightSectionComponent,
    LoginModalComponent,
    BookingsComponent,
    BookingActivitiesComponent,
    BookingCodeSectionComponent,
    BookingDetailsViewComponent,
    BookingDocumentActionsComponent,
    BookingFlightsComponent,
    BookingHeaderSectionComponent,
    BookingPaymentHistoryComponent,
    BookingPersonalDataComponent,
    BookingUpdateTravelComponent,
    PassengerCardComponent,
    UploadButtonComponent,
    PaymentsComponent
  ],
  imports: [
    // Angular Modules
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    FormsModule,
    CommonModule,
    NgComponentOutlet,
    NewsLetterSectionComponent,
    ConfirmationCodeComponent,
    MenubarModule,
    RippleModule,
    AvatarModule,
    AvatarGroupModule,
    InputTextModule,
    InputNumberModule,
    AutoCompleteModule,
    CalendarModule,
    ButtonModule,
    CarouselModule,
    CardModule,
    DatePickerModule,
    ImageModule,
    RatingModule,
    FloatLabelModule,
    IftaLabelModule,
    ProgressSpinnerModule,
    DataViewModule,
    BreadcrumbModule,
    DividerModule,
    MessageModule,
    PanelModule,
    FileUploadModule,
    SelectModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule,
    DropdownModule,
    FluidModule,
    ToolbarModule,
    TableModule,
    AccordionModule,
    ChipModule,
    TagModule,
    TimelineModule,
    OverlayBadgeModule,
    BadgeModule,
    RadioButtonModule,
    CheckboxModule,
    ForgetPasswordComponent,
    StepsModule,
    ReactiveFormsModule,
    StepperModule,
    MultiSelectModule,
    GoogleMapsModule,
    MenuModule,
    SkeletonModule,
    Dialog,
    OverlayPanelModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      },
      defaultLanguage: 'es',
    }),
    CurrencyPipe,
    SortByPipe,
  ],
  providers: [
    provideAnimationsAsync(),
    provideHttpClient(),
    // Add this provider to set Spanish as the default locale
    { provide: LOCALE_ID, useValue: 'es-ES' },
    /*providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: false || 'none',
          cssLayer: {
            name: 'primeng',
            order: 'tailwind-base, primeng, tailwind-utilities',
          },
        },
      },
    }),*/
    providePrimeNG({
      theme: {
        preset: MyPreset,
        options: {
          darkModeSelector: false || 'none',
        },
      },
    }),
    MessageService,
  ],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppModule {
  constructor() {
    Amplify.configure(awsconfig);
  }
}
