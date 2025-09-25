import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavMenuComponent } from './modules/nav-menu/nav-menu.component';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: true,
  imports: [CommonModule, NavMenuComponent, RouterModule, HttpClientModule]
})
export class AppComponent {
  title = 'chess-game'; // Example property; adjust as needed
}