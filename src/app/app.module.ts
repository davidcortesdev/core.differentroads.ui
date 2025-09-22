import { NgModule, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA, LOCALE_ID } from '@angular/core';
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
import { StandaloneComponent } from './layout/standalone/standalone.component';

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
import { CommonModule, NgComponentOutlet, DatePipe } from '@angular/common';
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
import { ScalapayService } from './core/services/checkout/payment/scalapay.service';
import { PopoverModule } from 'primeng/popover';

import { CookieService } from 'ngx-cookie-service';

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
import { LoginModalComponent } from './shared/components/login-modal/login-modal.component';
/* import { LoginModalComponent } from './pages/checkout/components/flights/components/login-modal/login-modal.component';
 */ import { BookingsComponent } from './pages/bookings/bookings.component';
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

// BookingsV2 Components
import { Bookingsv2Component } from './pages/bookingsv2/bookings.component';
import { BookingActivitiesV2Component } from './pages/bookingsv2/booking-activities/booking-activities.component';
import { BookingCodeSectionV2Component } from './pages/bookingsv2/booking-code-section/booking-code-section.component';
import { BookingDetailsViewV2Component } from './pages/bookingsv2/booking-details-view/booking-details-view.component';
import { BookingDocumentActionsV2Component } from './pages/bookingsv2/booking-document-actions/booking-document-actions.component';
import { BookingFlightsV2Component } from './pages/bookingsv2/booking-flights/booking-flights.component';
import { BookingHeaderSectionV2Component } from './pages/bookingsv2/booking-header-section/booking-header-section.component';
import { BookingPaymentHistoryV2Component } from './pages/bookingsv2/booking-payment-history/booking-payment-history.component';
import { BookingPersonalDataV2Component } from './pages/bookingsv2/booking-personal-data/booking-personal-data.component';
import { BookingUpdateTravelV2Component } from './pages/bookingsv2/booking-update-travel/booking-update-travel.component';
import { PassengerCardV2Component } from './pages/bookingsv2/passenger-card/passenger-card.component';
import { BookingDocumentationV2Component } from './pages/bookingsv2/booking-documentation/booking-documentation.component';
import { UploadButtonComponent } from './shared/components/upload-button/upload-button.component';
import { PaymentsComponent } from './pages/payments/payments.component';
import { TourInfoAccordionComponent } from './pages/tour/components/tour-info-accordion/tour-info-accordion.component';
import { HotelCardComponent } from './shared/components/hotel-card/hotel-card.component';
import { ActivitiesCarouselComponent } from './shared/components/activities-carousel/activities-carousel.component';
import { ActivityCardComponent } from './shared/components/activity-card/activity-card.component';
import { TourMapComponent } from './shared/components/tour-map/tour-map.component';
import { TourItineraryPanelComponent } from './pages/tour/components/tour-itinerary-panel/tour-itinerary-panel.component';
import { AirportSearchComponent } from './features/airports/airport-search/airport-search.component';
import { SummaryTableComponent } from './components/summary-table/summary-table.component';
import { TravelerActivitySelectorComponent } from './pages/checkout/components/traveler-activity-selector/traveler-activity-selector.component';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { Nl2brPipe } from './shared/pipes/nl2br.pipe';
import { BookingListSectionComponent } from './pages/profile/components/booking-list-section/booking-list-section.component';
import { BookingDocumentationComponent } from './pages/bookings/booking-documentation/booking-documentation.component';
import { TourCardHeaderComponent } from './shared/components/tour-card/tour-card-header/tour-card-header.component';
import { TourCardContentComponent } from './shared/components/tour-card/tour-card-content/tour-card-content.component';
import { CookiesComponent } from './shared/components/cookies/cookies.component';
import { CookiesConsentComponent } from './shared/components/cookies-consent/cookies-consent.component';
import { BasicPagePreviewComponent } from './pages/basic-page/basic-page-preview/basic-page-preview.component';
import { TourV2Component } from './pages/tour-v2/tour-v2.component';
import { TourOverviewV2Component } from './pages/tour-v2/components/tour-overview-v2/tour-overview-v2.component';
import { TourHeaderV2Component } from './pages/tour-v2/components/tour-header-v2/tour-header-v2.component';
import { TourItineraryV2Component } from './pages/tour-v2/components/tour-itinerary-v2/tour-itinerary-v2.component';
import { TourMapV2Component } from './shared/components/tour-map-v2/tour-map-v2.component';
import { ItineraryDayComponent } from './pages/tour-v2/components/tour-itinerary-v2/components/itinerary-day/itinerary-day.component';
import { TourHighlightsV2Component } from './pages/tour-v2/components/tour-highlights-v2/tour-highlights-v2.component';
import { SelectorItineraryComponent } from './pages/tour-v2/components/tour-itinerary-v2/components/selector-itinerary/selector-itinerary.component';
import { TourReviewsV2Component } from './pages/tour-v2/components/tour-reviews-v2/tour-reviews-v2.component';
import { HotelDetailsComponent } from './pages/tour-v2/components/tour-itinerary-v2/components/itinerary-day/hotel-details/hotel-details.component';
import { ActivitysComponent } from './pages/tour-v2/components/tour-itinerary-v2/components/itinerary-day/activitys/activitys.component';
import { TourDeparturesV2Component } from './pages/tour-v2/components/tour-departures-v2/tour-departures-v2.component';
import { CheckoutV2Component } from './pages/checkout-v2/checkout-v2.component';
import { SelectorRoomComponent } from './pages/checkout-v2/components/selector-room/selector-room.component';
import { SelectorTravelerComponent } from './pages/checkout-v2/components/selector-traveler/selector-traveler.component';
import { InsuranceComponent } from './pages/checkout-v2/components/insurance/insurance.component';
import { FlightManagementComponent } from './pages/checkout-v2/components/flight-management/flight-management.component';
import { DefaultFlightsComponent } from './pages/checkout-v2/components/flight-management/default-flights/default-flights.component';
import { SpecificSearchComponent } from './pages/checkout-v2/components/flight-management/specific-search/specific-search.component';
import { ActivitiesOptionalsComponent } from './pages/checkout-v2/components/activities-optionals/activities-optionals.component';
import { InfoTravelersComponent } from './pages/checkout-v2/components/info-travelers/info-travelers.component';
import { PaymentManagementComponent } from './pages/checkout-v2/components/payment-management/payment-management.component';
import { NewReservationComponent } from './pages/checkout-v2/components/new-reservation/new-reservation.component';
import { FlightSectionV2Component } from './pages/checkout-v2/components/flight-section/flight-section.component';
import { FlightStopsComponent } from './pages/checkout-v2/components/flight-management/flight-stops/flight-stops.component';
import { FlightItemComponent } from './pages/checkout-v2/components/flight-management/flight-item/flight-item.component';
import { TravelInfoComponent } from './pages/checkout-v2/components/new-reservation/travel-info/travel-info.component';
import { TravelersInfoComponent } from './pages/checkout-v2/components/new-reservation/travelers-info/travelers-info.component';
import { SectionFlightComponent } from './pages/checkout-v2/components/new-reservation/section-flight/section-flight.component';
import { PaymentInfoComponent } from './pages/checkout-v2/components/new-reservation/payment-info/payment-info.component';
import { SummaryInfoComponent } from './pages/checkout-v2/components/new-reservation/summary-info/summary-info.component';
import { ImageCropperComponent } from './shared/components/image-cropper/image-cropper.component';
import { ReviewSurveyComponent } from './pages/review-survey/review-survey.component';
import { ImageUploadModalComponent } from './pages/review-survey/image-upload-modal/image-upload-modal.component';
import { TourInfoAccordionV2Component } from './pages/tour-v2/components/tour-info-accordion-v2/tour-info-accordion-v2.component';
import { HomeV2Component } from './pages/home-v2/home-v2.component';
import { HeroSectionV2Component } from './pages/home-v2/components/hero-section-v2/hero-section-v2.component';
import { TripTypesSectionV2Component } from './pages/home-v2/components/trip-types-section-v2/trip-types-section-v2.component';
import { TourCarrusselV2Component } from './pages/home-v2/components/tour-carrussel-v2/tour-carrussel-v2.component';
import { FullCardSectionV2Component } from './pages/home-v2/components/full-card-section-v2/full-card-section-v2.component';
import { CarouselSectionV2Component } from './pages/home-v2/components/carousel-section-v2/carousel-section-v2.component';
import { CommunitySectionV2Component } from './pages/home-v2/components/community-section-v2/community-section-v2.component';
import { CommunityGalleryV2Component } from './pages/home-v2/components/community-section-v2/components/community-gallery-v2/community-gallery-v2.component';
import { CommunityHeroV2Component } from './pages/home-v2/components/community-section-v2/components/community-hero-v2/community-hero-v2.component';
import { CommunityReviewsV2Component } from './pages/home-v2/components/community-section-v2/components/community-reviews-v2/community-reviews-v2.component';
import { NewsLetterSectionV2Component } from './pages/home-v2/components/community-section-v2/components/newsletter-section-v2/newsletter-section-v2.component';
import { HighlightSectionV2Component } from './pages/home-v2/components/highlight-section-v2/highlight-section-v2.component';
import { ContentListV2Component } from './pages/home-v2/components/content-list-v2/content-list-v2.component';
import { PartnersSectionV2Component } from './pages/home-v2/components/partners-section-v2/partners-section-v2.component';
import { PublicitySectionV2Component } from './pages/home-v2/components/publicity-section-v2/publicity-section-v2.component';

// Services
import { RetailerService } from './core/services/retailer/retailer.service';
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
    StandaloneComponent,

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
    
    // BookingsV2 Components
    Bookingsv2Component,
    BookingActivitiesV2Component,
    BookingCodeSectionV2Component,
    BookingDetailsViewV2Component,
    BookingDocumentActionsV2Component,
    BookingFlightsV2Component,
    BookingHeaderSectionV2Component,
    BookingPaymentHistoryV2Component,
    BookingPersonalDataV2Component,
    BookingUpdateTravelV2Component,
    PassengerCardV2Component,
    BookingDocumentationV2Component,
    
    UploadButtonComponent,
    PaymentsComponent,
    TourInfoAccordionComponent,
    HotelCardComponent,
    ActivitiesCarouselComponent,
    ActivityCardComponent,
    TourMapComponent,
    TourItineraryPanelComponent,
    AirportSearchComponent,
    SummaryTableComponent,
    TravelerActivitySelectorComponent,
    BookingListSectionComponent,
    BookingDocumentationComponent,
    TourCardHeaderComponent,
    TourCardContentComponent,
    CookiesComponent,
    CookiesConsentComponent,
    BasicPagePreviewComponent,

    TourV2Component,
    TourOverviewV2Component,
    TourHeaderV2Component,
    TourItineraryV2Component,
    TourMapV2Component,
    ItineraryDayComponent,
    TourHighlightsV2Component,
    SelectorItineraryComponent,
    TourReviewsV2Component,
    HotelDetailsComponent,
    ActivitysComponent,
    TourDeparturesV2Component,
    CheckoutV2Component,
    SelectorRoomComponent,
    SelectorTravelerComponent,
    InsuranceComponent,
    FlightManagementComponent,
    DefaultFlightsComponent,
    SpecificSearchComponent,
    ActivitiesOptionalsComponent,
    InfoTravelersComponent,
    PaymentManagementComponent,
    NewReservationComponent,
    FlightSectionV2Component,
    FlightStopsComponent,
    FlightItemComponent,
    TravelInfoComponent,
    TravelersInfoComponent,
    SectionFlightComponent,
    PaymentInfoComponent,
    SummaryInfoComponent,
    ImageCropperComponent,
    ReviewSurveyComponent,
    ImageUploadModalComponent,
    TourInfoAccordionV2Component,
    HomeV2Component,
    HeroSectionV2Component,
    TripTypesSectionV2Component,
    TourCarrusselV2Component,
    FullCardSectionV2Component,
    CarouselSectionV2Component,
    CommunitySectionV2Component,
    CommunityGalleryV2Component,
    CommunityHeroV2Component,
    CommunityReviewsV2Component,
    HighlightSectionV2Component,
    ContentListV2Component,
    PartnersSectionV2Component,
    PublicitySectionV2Component,
  ],
  imports: [
    // Angular Modules
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    FormsModule,
    NewsLetterSectionV2Component,
    CommonModule,
    NgComponentOutlet,
    NewsLetterSectionComponent,
    // ConfirmationCodeComponent, <-- Eliminar o comentar esta línea
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
    ToggleSwitchModule,
    PopoverModule,
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
    Nl2brPipe,
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
    CookieService,
    DatePipe, // Añadimos DatePipe a los providers
    RetailerService,
  ],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
})
export class AppModule {
  constructor() {
    Amplify.configure(awsconfig);
  }
}
