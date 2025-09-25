import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { ChessBoardComponent } from './app/modules/chess-board/chess-board.component';
import { ComputerModeComponent } from './app/modules/computer-mode/computer-mode.component';

const appRoutes = [
  { path: 'against-friend', component: ChessBoardComponent, title: '和好友对战' },
  { path: 'against-computer', component: ComputerModeComponent, title: '和机器对战' }
];

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(appRoutes),
    provideHttpClient()
  ]
}).catch(err => console.error(err));
