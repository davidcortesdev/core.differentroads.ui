import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';


@Component({
  selector: 'app-profile-v2',
  standalone: false,
  templateUrl: './profile-v2.component.html',
  styleUrl: './profile-v2.component.scss',
})
export class ProfileV2Component implements OnInit {
  userId: string = '';

  constructor(
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // Obtener userId desde la ruta
    const routeUserId = this.route.snapshot.paramMap.get('userId');
    this.userId = routeUserId ? routeUserId : 'user1';
  }
}