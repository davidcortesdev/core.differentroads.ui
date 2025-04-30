import { Component, OnInit } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';

@Component({
  selector: 'app-cookies',
  standalone: false,

  templateUrl: './cookies.component.html',
  styleUrl: './cookies.component.scss',
})
export class CookiesComponent implements OnInit {
  constructor(private cookieService: CookieService) {}

  ngOnInit(): void {
    // Establecer una cookie
    this.cookieService.set('user', 'JohnDoe', 1); // Expira en 1 día

    // Obtener una cookie
    const userName = this.cookieService.get('user');
    console.log(`User: ${userName}`);

    // Verificar si una cookie existe
    if (this.cookieService.check('user')) {
      console.log('User cookie exists!');
    }

    // Eliminar una cookie
    this.cookieService.delete('user');
  }
}
