import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Observable, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { AirportService } from '../../../core/services/airport.service';
import { Airport } from '../../../shared/models/airport.model';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-airport-search',
  standalone: false,
  templateUrl: './airport-search.component.html',
})
export class AirportSearchComponent implements OnInit {
  searchControl = new FormControl('');
  airports$: Observable<Airport[]>;
  language: 'en' | 'es' = 'es';
  loading = false;

  constructor( 
    private airportService: AirportService,
    private titleService: Title
  ) {
    // Inicializar con todos los aeropuertos
    this.airports$ = this.airportService.getLocalizedAirports(this.language);
  }

  ngOnInit(): void {
    this.titleService.setTitle('Búsqueda de Aeropuertos - Different Roads');
    // Configurar la búsqueda reactiva
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((searchText) => {
          this.loading = true;
          return this.airportService.searchLocalizedAirports(
            searchText || '',
            this.language
          );
        })
      )
      .subscribe({
        next: () => (this.loading = false),
        error: () => (this.loading = false),
      });

    // Conectar el control de búsqueda con el observable de resultados
    this.airports$ = this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((searchText) =>
        this.airportService.searchLocalizedAirports(
          searchText || '',
          this.language
        )
      )
    );
  }

  toggleLanguage(): void {
    this.language = this.language === 'en' ? 'es' : 'en';
    // Actualizar resultados con el nuevo idioma
    this.airports$ = this.airportService.searchLocalizedAirports(
      this.searchControl.value || '',
      this.language
    );
  }
}
