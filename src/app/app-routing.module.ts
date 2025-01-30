import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MainComponent } from './layout/main/main.component';

const routes: Routes = [
  {
    path: '',
    component: MainComponent,
    children: [
      // Aquí irán las rutas de las diferentes secciones
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      // Ejemplo de rutas futuras:
      // { path: 'home', loadChildren: () => import('./pages/home/home.module').then(m => m.HomeModule) },
      // { path: 'destinations', loadChildren: () => import('./pages/destinations/destinations.module').then(m => m.DestinationsModule) },
      // { path: 'packages', loadChildren: () => import('./pages/packages/packages.module').then(m => m.PackagesModule) },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
