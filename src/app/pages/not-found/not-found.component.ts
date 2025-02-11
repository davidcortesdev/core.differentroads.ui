import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: false,

  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.scss',
})
export class NotFoundComponent implements OnInit {
  currentPath: string;

  constructor(private router: Router) {
    this.currentPath = this.router.url;
  }

  ngOnInit(): void {
    // Here you can make an API call to get information about the requested route
    console.log('Requested path:', this.currentPath);
  }
}
