import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoginFormComponent } from './components/login-form/login-form.component';
import { AuthenticateService } from '../../core/services/auth/auth-service.service';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-login',
  standalone: true, // Ensure this is marked as standalone
  imports: [LoginFormComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  constructor(
    private titleService: Title,
    private authService: AuthenticateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.titleService.setTitle('Iniciar Sesión - Different Roads');
    if (this.authService.getCurrentUser()) {
      this.router.navigate(['/home']);
    }
  }
}
