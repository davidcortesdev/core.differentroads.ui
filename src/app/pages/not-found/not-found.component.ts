import { Component, OnInit, OnDestroy } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router, NavigationEnd } from '@angular/router';
import { Subject, takeUntil, filter } from 'rxjs';

@Component({
  selector: 'app-not-found',
  standalone: false,

  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.scss',
})
export class NotFoundComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  currentPath: string;

  constructor(
    private router: Router,
    private titleService: Title
  ) {
    this.currentPath = this.router.url;
  }

  ngOnInit(): void {
    this.titleService.setTitle('Página no encontrada - Different Roads');
    
    // Actualizar la URL mostrada cada vez que cambia la navegación
    this.router.events
      .pipe(
        takeUntil(this.destroy$),
        filter(event => event instanceof NavigationEnd)
      )
      .subscribe((event: NavigationEnd) => {
        this.currentPath = event.urlAfterRedirects || event.url;

      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
