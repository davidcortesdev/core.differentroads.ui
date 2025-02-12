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
import { MessageService, ConfirmationService } from 'primeng/api';
import { ProfileComponent } from './pages/profile/profile.component';
import { PersonalInfoSectionComponent } from './pages/profile/components/personal-info-section/personal-info-section.component';
import { UpdateProfileSectionComponent } from './pages/profile/components/update-profile-section/update-profile-section.component';

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

    // Community Components
    CommunitySectionComponent,
    CommunityHeroComponent,
    CommunityGalleryComponent,
    CommunityReviewsComponent,

    // Tours List
    ToursListComponent,

    // Content List
    ContentListComponent,
    NotFoundComponent,

    DynamicComponentsComponent,
    PartnersSectionComponent,
    TourComponent,
    TourHeaderComponent,
    TourOverviewComponent,
    ProfileComponent,
    PersonalInfoSectionComponent,
    UpdateProfileSectionComponent,
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
    // PrimeNG Modules
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
    MessageService,
    ConfirmationService,
    provideAnimationsAsync(),
    provideHttpClient(),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          cssLayer: {
            name: 'primeng',
            order: 'tailwind-base, primeng, tailwind-utilities',
          },
        },
      },
    }),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
