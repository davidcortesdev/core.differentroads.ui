// ========================================
// ANGULAR CORE
// ========================================
import {
  NgModule,
  CUSTOM_ELEMENTS_SCHEMA,
  NO_ERRORS_SCHEMA,
  LOCALE_ID,
} from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CommonModule, NgComponentOutlet, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient, HttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';

// ========================================
// THIRD PARTY LIBRARIES
// ========================================
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { CookieService } from 'ngx-cookie-service';
import { GoogleMapsModule } from '@angular/google-maps';
import { Amplify } from 'aws-amplify';
import awsconfig from '../../src/aws-exports';

// ========================================
// PRIMENG CONFIGURATION & THEME
// ========================================
import { providePrimeNG } from 'primeng/config';
import MyPreset from './mytheme';
import { MessageService } from 'primeng/api';

// ========================================
// PRIMENG MODULES
// ========================================
import { AccordionModule } from 'primeng/accordion';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { AvatarModule } from 'primeng/avatar';
import { AvatarGroupModule } from 'primeng/avatargroup';
import { BadgeModule } from 'primeng/badge';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { CardModule } from 'primeng/card';
import { CarouselModule } from 'primeng/carousel';
import { CheckboxModule } from 'primeng/checkbox';
import { ChipModule } from 'primeng/chip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DataViewModule } from 'primeng/dataview';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { DropdownModule } from 'primeng/dropdown';
import { FileUploadModule } from 'primeng/fileupload';
import { FloatLabelModule } from 'primeng/floatlabel';
import { FluidModule } from 'primeng/fluid';
import { IftaLabelModule } from 'primeng/iftalabel';
import { ImageModule } from 'primeng/image';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MenuModule } from 'primeng/menu';
import { MenubarModule } from 'primeng/menubar';
import { MessageModule } from 'primeng/message';
import { MultiSelectModule } from 'primeng/multiselect';
import { OverlayBadgeModule } from 'primeng/overlaybadge';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { PanelModule } from 'primeng/panel';
import { PopoverModule } from 'primeng/popover';
import { ProgressBarModule } from 'primeng/progressbar';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { RadioButtonModule } from 'primeng/radiobutton';
import { RatingModule } from 'primeng/rating';
import { RippleModule } from 'primeng/ripple';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { StepperModule } from 'primeng/stepper';
import { StepsModule } from 'primeng/steps';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TimelineModule } from 'primeng/timeline';
import { ToastModule } from 'primeng/toast';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';

// ========================================
// APP ROUTING
// ========================================
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

// ========================================
// LAYOUT COMPONENTS
// ========================================
import { HeaderV2Component } from './layout/header-v2/header-v2.component';
import { FooterComponent } from './layout/footer/footer.component';
import { Footer2Component } from './layout/footer/components/footer2/footer2.component';
import { MainComponent } from './layout/main/main.component';
import { StandaloneComponent } from './layout/standalone/standalone.component';

// ========================================
// PAGE COMPONENTS - AUTH
// ========================================
import { ForgetPasswordComponent } from './pages/forget-password/forget-password.component';
import { SignUpComponent } from './pages/sign-up/sign-up.component';

// ========================================
// PAGE COMPONENTS - HOME
// ========================================
import { HomeV2Component } from './pages/home-v2/home-v2.component';
import { HeroSectionV2Component } from './pages/home-v2/components/hero-section-v2/hero-section-v2.component';
import { TripTypesSectionV2Component } from './pages/home-v2/components/trip-types-section-v2/trip-types-section-v2.component';
import { TourCarrusselV2Component } from './pages/home-v2/components/tour-carrussel-v2/tour-carrussel-v2.component';
import { TourListV2Component } from './pages/home-v2/components/tour-list-v2/tour-list-v2.component';
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

// ========================================
// PAGE COMPONENTS - TOUR V2
// ========================================
import { TourV2Component } from './pages/tour-v2/tour-v2.component';
import { TourHeaderV2Component } from './pages/tour-v2/components/tour-header-v2/tour-header-v2.component';
import { TourOverviewV2Component } from './pages/tour-v2/components/tour-overview-v2/tour-overview-v2.component';
import { TourHighlightsV2Component } from './pages/tour-v2/components/tour-highlights-v2/tour-highlights-v2.component';
import { TourItineraryV2Component } from './pages/tour-v2/components/tour-itinerary-v2/tour-itinerary-v2.component';
import { ItineraryDayComponent } from './pages/tour-v2/components/tour-itinerary-v2/components/itinerary-day/itinerary-day.component';
import { HotelDetailsComponent } from './pages/tour-v2/components/tour-itinerary-v2/components/itinerary-day/hotel-details/hotel-details.component';
import { ActivitysComponent } from './pages/tour-v2/components/tour-itinerary-v2/components/itinerary-day/activitys/activitys.component';
import { SelectorItineraryComponent } from './pages/tour-v2/components/tour-itinerary-v2/components/selector-itinerary/selector-itinerary.component';
import { TourDeparturesV2Component } from './pages/tour-v2/components/tour-departures-v2/tour-departures-v2.component';
import { TourReviewsV2Component } from './pages/tour-v2/components/tour-reviews-v2/tour-reviews-v2.component';
import { TourInfoAccordionV2Component } from './pages/tour-v2/components/tour-info-accordion-v2/tour-info-accordion-v2.component';

// ========================================
// PAGE COMPONENTS - CHECKOUT V2
// ========================================
import { CheckoutV2Component } from './pages/checkout-v2/checkout-v2.component';
import { SelectorRoomComponent } from './pages/checkout-v2/components/selector-room/selector-room.component';
import { SelectorTravelerComponent } from './pages/checkout-v2/components/selector-traveler/selector-traveler.component';
import { InsuranceComponent } from './pages/checkout-v2/components/insurance/insurance.component';
import { FlightManagementComponent } from './pages/checkout-v2/components/flight-management/flight-management.component';
import { DefaultFlightsComponent } from './pages/checkout-v2/components/flight-management/default-flights/default-flights.component';
import { SpecificSearchComponent } from './pages/checkout-v2/components/flight-management/specific-search/specific-search.component';
import { FlightStopsComponent } from './pages/checkout-v2/components/flight-management/flight-stops/flight-stops.component';
import { FlightItemComponent } from './pages/checkout-v2/components/flight-management/flight-item/flight-item.component';
import { FlightSectionV2Component } from './pages/checkout-v2/components/flight-section/flight-section.component';
import { ActivitiesOptionalsComponent } from './pages/checkout-v2/components/activities-optionals/activities-optionals.component';
import { InfoTravelersComponent } from './pages/checkout-v2/components/info-travelers/info-travelers.component';
import { InfoTravelersRoomComponent } from './pages/checkout-v2/components/info-travelers/components/info-travelers-room/info-travelers-room.component';
import { PaymentManagementComponent } from './pages/checkout-v2/components/payment-management/payment-management.component';
import { LoadingSectionComponent } from './pages/checkout-v2/components/payment-management/components/loading-section/loading-section.component';
import { PointsRedemptionComponent } from './pages/checkout-v2/components/points-redemption/points-redemption.component';
import { TravelersListComponent } from './pages/checkout-v2/components/points-redemption/components/travelers-list/travelers-list.component';
import { MessagePointsComponent } from './pages/checkout-v2/components/points-redemption/components/message-points/message-points.component';
import { BalanceInfoComponent } from './pages/checkout-v2/components/points-redemption/components/balance-info/balance-info.component';
import { NewReservationComponent } from './pages/checkout-v2/components/new-reservation/new-reservation.component';
import { TravelInfoComponent } from './pages/checkout-v2/components/new-reservation/travel-info/travel-info.component';
import { TravelersInfoComponent } from './pages/checkout-v2/components/new-reservation/travelers-info/travelers-info.component';
import { SectionFlightComponent } from './pages/checkout-v2/components/new-reservation/section-flight/section-flight.component';
import { PaymentInfoComponent } from './pages/checkout-v2/components/new-reservation/payment-info/payment-info.component';
import { SummaryInfoComponent } from './pages/checkout-v2/components/new-reservation/summary-info/summary-info.component';

// ========================================
// PAGE COMPONENTS - BOOKINGS V2
// ========================================
import { Bookingsv2Component } from './pages/bookingsv2/bookings.component';
import { BookingActivitiesV2Component } from './pages/bookingsv2/booking-activities/booking-activities.component';
import { BookingCodeSectionV2Component } from './pages/bookingsv2/booking-code-section/booking-code-section.component';
import { BookingDetailsViewV2Component } from './pages/bookingsv2/booking-details-view/booking-details-view.component';
import { BookingDocumentActionsV2Component } from './pages/bookingsv2/booking-document-actions/booking-document-actions.component';
import { BookingDocumentationV2Component } from './pages/bookingsv2/booking-documentation/booking-documentation.component';
import { BookingFlightsV2Component } from './pages/bookingsv2/booking-flights/booking-flights.component';
import { BookingHeaderSectionV2Component } from './pages/bookingsv2/booking-header-section/booking-header-section.component';
import { BookingPaymentHistoryV2Component } from './pages/bookingsv2/booking-payment-history/booking-payment-history.component';
import { BookingPersonalDataV2Component } from './pages/bookingsv2/booking-personal-data/booking-personal-data.component';
import { BookingUpdateTravelV2Component } from './pages/bookingsv2/booking-update-travel/booking-update-travel.component';
import { PassengerCardV2Component } from './pages/bookingsv2/passenger-card/passenger-card.component';

// ========================================
// PAGE COMPONENTS - PROFILE
// ========================================
import { ProfileV2Component } from './pages/profile-v2/profile-v2.component';
import { BookingListSectionV2Component } from './pages/profile-v2/components/booking-list-section-v2/booking-list-section-v2.component';
import { PersonalInfoSectionV2Component } from './pages/profile-v2/components/personal-info-section-v2/personal-info-section-v2.component';
import { PointsSectionV2Component } from './pages/profile-v2/components/points-section-v2/points-section-v2.component';
import { PointsTableComponent } from './pages/profile-v2/components/points-section-v2/components/points-table/points-table.component';
import { MembershipCardsComponent } from './pages/profile-v2/components/points-section-v2/components/membership-cards/membership-cards.component';
import { MembershipBenefitsComponent } from './pages/profile-v2/components/points-section-v2/components/membership-benefits/membership-benefits.component';
import { ReviewSectionV2Component } from './pages/profile-v2/components/review-section-v2/review-section-v2.component';
import { UpdateProfileSectionV2Component } from './pages/profile-v2/components/update-profile-section-v2/update-profile-section-v2.component';

// ========================================
// PAGE COMPONENTS - OTHER PAGES
// ========================================
import { NotFoundComponent } from './pages/not-found/not-found.component';
import { BasicPageComponent } from './pages/basic-page/basic-page.component';
import { BasicPagePreviewComponent } from './pages/basic-page/basic-page-preview/basic-page-preview.component';
import { TitleAndQuillComponent } from './pages/basic-page/components/title-and-quill/title-and-quill.component';
import { ContentPageComponent } from './pages/content-page/content-page.component';
import { ReviewSurveyComponent } from './pages/review-survey/review-survey.component';
import { ImageUploadModalComponent } from './pages/review-survey/image-upload-modal/image-upload-modal.component';

// ========================================
// SHARED COMPONENTS
// ========================================
import { BannerComponent } from './shared/components/banner/banner.component';
import { ToursComponent } from './shared/components/tours/tours.component';
import { ReviewsComponent } from './shared/components/reviews/reviews.component';
import { LoginModalComponent } from './shared/components/login-modal/login-modal.component';
import { UploadButtonComponent } from './shared/components/upload-button/upload-button.component';
import { HotelCardComponent } from './shared/components/hotel-card/hotel-card.component';
import { ActivitiesCarouselComponent } from './shared/components/activities-carousel/activities-carousel.component';
import { ActivityCardComponent } from './shared/components/activity-card/activity-card.component';
import { TourMapV2Component } from './shared/components/tour-map-v2/tour-map-v2.component';
import { CookiesComponent } from './shared/components/cookies/cookies.component';
import { CookiesConsentComponent } from './shared/components/cookies-consent/cookies-consent.component';
import { ImageCropperComponent } from './shared/components/image-cropper/image-cropper.component';
import { SeoLinksComponent } from './shared/components/seo-links/seo-links.component';

// Tour Cards
import { TourCardComponent } from './shared/components/tour-card/tour-card.component';
import { TourCardHeaderComponent } from './shared/components/tour-card/tour-card-header/tour-card-header.component';
import { TourCardContentComponent } from './shared/components/tour-card/tour-card-content/tour-card-content.component';
import { TourCardV2Component } from './shared/components/tour-card-v2/tour-card-v2.component';
import { TourCardHeaderV2Component } from './shared/components/tour-card-v2/tour-card-header-v2/tour-card-header-v2.component';
import { TourCardContentV2Component } from './shared/components/tour-card-v2/tour-card-content-v2/tour-card-content-v2.component';

// ========================================
// CORE - PIPES
// ========================================
import { CurrencyPipe } from './core/pipes/currency.pipe';
import { SortByPipe } from './shared/pipes/sort-by.pipe';
import { Nl2brPipe } from './shared/pipes/nl2br.pipe';

// ========================================
// CORE - SERVICES
// ========================================
import { RetailerService } from './core/services/retailer/retailer.service';

// ========================================
// OTHER COMPONENTS
// ========================================
import { SummaryTableComponent } from './components/summary-table/summary-table.component';

// ========================================
// LOCALE & FACTORY FUNCTIONS
// ========================================
registerLocaleData(localeEs);

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@NgModule({
  declarations: [
    // ========================================
    // APP COMPONENT
    // ========================================
    AppComponent,

    // ========================================
    // LAYOUT COMPONENTS
    // ========================================
    HeaderV2Component,
    FooterComponent,
    Footer2Component,
    MainComponent,
    StandaloneComponent,

    // ========================================
    // PAGE COMPONENTS - HOME
    // ========================================
    HomeV2Component,
    HeroSectionV2Component,
    TripTypesSectionV2Component,
    TourCarrusselV2Component,
    TourListV2Component,
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

    // ========================================
    // PAGE COMPONENTS - TOUR V2
    // ========================================
    TourV2Component,
    TourHeaderV2Component,
    TourOverviewV2Component,
    TourHighlightsV2Component,
    TourItineraryV2Component,
    ItineraryDayComponent,
    HotelDetailsComponent,
    ActivitysComponent,
    SelectorItineraryComponent,
    TourDeparturesV2Component,
    TourReviewsV2Component,
    TourInfoAccordionV2Component,

    // ========================================
    // PAGE COMPONENTS - CHECKOUT V2
    // ========================================
    CheckoutV2Component,
    SelectorRoomComponent,
    SelectorTravelerComponent,
    InsuranceComponent,
    FlightManagementComponent,
    DefaultFlightsComponent,
    SpecificSearchComponent,
    FlightStopsComponent,
    FlightItemComponent,
    FlightSectionV2Component,
    ActivitiesOptionalsComponent,
    InfoTravelersComponent,
    InfoTravelersRoomComponent,
    PaymentManagementComponent,
    LoadingSectionComponent,
    PointsRedemptionComponent,
    TravelersListComponent,
    MessagePointsComponent,
    BalanceInfoComponent,
    NewReservationComponent,
    TravelInfoComponent,
    TravelersInfoComponent,
    SectionFlightComponent,
    PaymentInfoComponent,
    SummaryInfoComponent,

    // ========================================
    // PAGE COMPONENTS - BOOKINGS V2
    // ========================================
    Bookingsv2Component,
    BookingActivitiesV2Component,
    BookingCodeSectionV2Component,
    BookingDetailsViewV2Component,
    BookingDocumentActionsV2Component,
    BookingDocumentationV2Component,
    BookingFlightsV2Component,
    BookingHeaderSectionV2Component,
    BookingPaymentHistoryV2Component,
    BookingPersonalDataV2Component,
    BookingUpdateTravelV2Component,
    PassengerCardV2Component,

    // ========================================
    // PAGE COMPONENTS - PROFILE
    // ========================================
    ProfileV2Component,
    BookingListSectionV2Component,
    PersonalInfoSectionV2Component,
    PointsSectionV2Component,
    PointsTableComponent,
    MembershipCardsComponent,
    MembershipBenefitsComponent,
    ReviewSectionV2Component,
    UpdateProfileSectionV2Component,

    // ========================================
    // PAGE COMPONENTS - OTHER PAGES
    // ========================================
    NotFoundComponent,
    BasicPageComponent,
    BasicPagePreviewComponent,
    TitleAndQuillComponent,
    ContentPageComponent,
    ReviewSurveyComponent,
    ImageUploadModalComponent,

    // ========================================
    // SHARED COMPONENTS
    // ========================================
    BannerComponent,
    ToursComponent,
    ReviewsComponent,
    LoginModalComponent,
    UploadButtonComponent,
    HotelCardComponent,
    ActivitiesCarouselComponent,
    ActivityCardComponent,
    TourMapV2Component,
    CookiesComponent,
    CookiesConsentComponent,
    ImageCropperComponent,
    SeoLinksComponent,

    // Tour Cards
    TourCardComponent,
    TourCardHeaderComponent,
    TourCardContentComponent,
    TourCardV2Component,
    TourCardHeaderV2Component,
    TourCardContentV2Component,

    // ========================================
    // OTHER COMPONENTS
    // ========================================
    SummaryTableComponent,
  ],
  imports: [
    // ========================================
    // ANGULAR CORE MODULES
    // ========================================
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    CommonModule,
    NgComponentOutlet,
    FormsModule,
    ReactiveFormsModule,

    // ========================================
    // THIRD PARTY MODULES
    // ========================================
    GoogleMapsModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      },
      defaultLanguage: 'es',
    }),

    // ========================================
    // PRIMENG MODULES
    // ========================================
    AccordionModule,
    AutoCompleteModule,
    AvatarModule,
    AvatarGroupModule,
    BadgeModule,
    BreadcrumbModule,
    ButtonModule,
    CalendarModule,
    CardModule,
    CarouselModule,
    CheckboxModule,
    ChipModule,
    ConfirmDialogModule,
    DataViewModule,
    DatePickerModule,
    DialogModule,
    DividerModule,
    DropdownModule,
    FileUploadModule,
    FloatLabelModule,
    FluidModule,
    IftaLabelModule,
    ImageModule,
    InputNumberModule,
    InputTextModule,
    MenuModule,
    MenubarModule,
    MessageModule,
    MultiSelectModule,
    OverlayBadgeModule,
    OverlayPanelModule,
    PanelModule,
    PopoverModule,
    ProgressBarModule,
    ProgressSpinnerModule,
    RadioButtonModule,
    RatingModule,
    RippleModule,
    SelectModule,
    SkeletonModule,
    StepperModule,
    StepsModule,
    TableModule,
    TagModule,
    TimelineModule,
    ToastModule,
    ToggleSwitchModule,
    ToolbarModule,
    TooltipModule,

    // ========================================
    // STANDALONE COMPONENTS
    // ========================================
    ForgetPasswordComponent,
    NewsLetterSectionV2Component,

    // ========================================
    // PIPES
    // ========================================
    CurrencyPipe,
    SortByPipe,
    Nl2brPipe,
  ],
  providers: [
    // ========================================
    // ANGULAR PROVIDERS
    // ========================================
    provideAnimationsAsync(),
    provideHttpClient(),
    { provide: LOCALE_ID, useValue: 'es-ES' },

    // ========================================
    // PRIMENG CONFIGURATION
    // ========================================
    providePrimeNG({
      theme: {
        preset: MyPreset,
        options: {
          darkModeSelector: false || 'none',
        },
      },
    }),

    // ========================================
    // SERVICES
    // ========================================
    MessageService,
    CookieService,
    DatePipe,
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
