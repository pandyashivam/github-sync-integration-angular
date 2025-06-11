import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'github', pathMatch: 'full' },
  { path: 'github', loadChildren: () => import('./features/github/github.module').then(m => m.GithubModule) }
];
