import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoginFormComponent } from './components/login-form/login-form.component';
import { AuthenticateService } from '../../core/services/auth-service.service';

@Component({
  selector: 'app-login',
  standalone: true, // Ensure this is marked as standalone
  imports: [LoginFormComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  constructor(
    private authService: AuthenticateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (this.authService.getCurrentUser()) {
      this.router.navigate(['/home']);
    }
  }
}
