// Angular Core Imports
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

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

// PrimeNG Configuration
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';

// PrimeNG Modules
import { MenubarModule } from 'primeng/menubar';
import { TabsModule } from 'primeng/tabs';
import { EditorModule } from 'primeng/editor';
import { FloatLabelModule } from 'primeng/floatlabel';
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
    HeroSectionComponent,
    ToursSectionComponent,
    HighlightSectionComponent,

    // Community Components
    CommunitySectionComponent,
    CommunityHeroComponent,
    CommunityGalleryComponent,
    CommunityReviewsComponent,
  ],
  imports: [
    // Angular Modules
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    FormsModule,

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
  ],
  providers: [
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
