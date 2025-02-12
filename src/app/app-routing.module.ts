import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MainComponent } from './layout/main/main.component';
import { HomeComponent } from './pages/home/home.component';
import { NotFoundComponent } from './pages/not-found/not-found.component';
import { TourComponent } from './pages/tour/tour.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { PersonalInfoSectionComponent } from './pages/profile/components/personal-info-section/personal-info-section.component';
import { UpdateProfileSectionComponent } from './pages/profile/components/update-profile-section/update-profile-section.component';

const routes: Routes = [
  {
    path: '',
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', component: HomeComponent },
      { path: 'home', component: HomeComponent },
      {
        path: 'profile',
        component: ProfileComponent,
        children: [
          { path: '', component: PersonalInfoSectionComponent }, // ruta por defecto
          { path: 'update', component: UpdateProfileSectionComponent },
        ],
      }, // Añadimos esta ruta
      { path: 'tour/:slug', component: TourComponent },
      { path: '**', component: NotFoundComponent }, // This will catch all unmatched routes
    ],
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
