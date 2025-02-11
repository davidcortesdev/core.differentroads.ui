# ¿Como pasar información de un componente padre a un componente hijo en Angular?

1. En el componente padre, en este caso HomeComponent.ts, se obtienen los datos:

```typescript
export class HomeComponent {
  featuredTours?: FeaturedToursSection;

  ngOnInit() {
    this.homeService.getHomeData().subscribe({
      next: (data) => {
        this.featuredTours = data['featured-tours'];
      }
    });
  }
}
```

2. En el HomeComponent.html, se pasan los datos al componente hijo:

```html
<app-tours-section *ngIf="featuredTours" [content]="featuredTours"></app-tours-section>
```

3. En el ToursSectionComponent.ts, el componente hijo recibe los datos:

```typescript
export class ToursSectionComponent implements OnInit {
  @Input() content!: TourList;
  // ... resto del componente
}
```

## Puntos importantes:

- El decorador `@Input()` marca la propiedad como una propiedad de entrada
- El signo de exclamación (`!`) le dice a TypeScript que esta propiedad será inicializada
- La sintaxis `[content]="featuredTours"` en la plantilla del padre conecta los datos
- El `*ngIf="featuredTours"` asegura que el componente solo se renderice cuando hay datos

Para implementar este patrón en otros componentes:

1. En el componente hijo, declara la propiedad de entrada:

```typescript
@Input() misDatos!: TipoDatos;
```

2. En la plantilla del padre, usa el enlace de propiedades:

```html
<app-mi-componente *ngIf="datosDelPadre" [misDatos]="datosDelPadre"></app-mi-componente>
```

Este es un patrón común en Angular para la comunicación de padre a hijo, siguiendo el principio de flujo de datos unidireccional.
