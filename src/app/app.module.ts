import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

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

// Tour List Component
import { ToursListComponent } from './pages/home/components/tours-list-section/tours-list-section.component';

// Content List
import { ContentListComponent } from './pages/home/components/content-list/content-list-section.component';

// PrimeNG Configuration
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';

// PrimeNG Modules
import { MenubarModule } from 'primeng/menubar';
import { TabsModule } from 'primeng/tabs';
import { EditorModule } from 'primeng/editor';
import { FloatLabelModule } from 'primeng/floatlabel';
import { IftaLabelModule } from 'primeng/iftalabel';
import { InputTextModule } from 'primeng/inputtext';
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

import MyPreset from './mytheme';
import { BasicPageComponent } from './pages/basic-page/basic-page.component';
import { TitleAndQuillComponent } from './pages/basic-page/components/title-and-quill/title-and-quill.component';
import { CheckoutComponent } from './pages/checkout/checkout.component';
import { CustomizeTripComponent } from './pages/checkout/components/customize-trip/customize-trip.component';
import { FlightsComponent } from './pages/checkout/components/flights/flights.component';
import { TravelersComponent } from './pages/checkout/components/travelers/travelers.component';
import { PaymentComponent } from './pages/checkout/components/payment/payment.component';
import { TourCardComponent } from './shared/components/tour-card/tour-card.component';

import { StepsModule } from 'primeng/steps';

import { StepperModule } from 'primeng/stepper';
import { ContentPageComponent } from './pages/content-page/content-page.component';
import { BannerComponent } from './shared/components/banner/banner.component';

// Add this function outside the class
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

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
    SignUpComponent,
    MenubarModule,
    RippleModule,
    AvatarModule,
    AvatarGroupModule,
    InputTextModule,
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
    ForgetPasswordComponent,
    StepsModule,
    StepperModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      },
      defaultLanguage: 'es',
    }),
  ],
  providers: [
    provideAnimationsAsync(),
    provideHttpClient(),
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
      },
    }),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
