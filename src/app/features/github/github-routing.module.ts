import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GithubConnectComponent } from './components/github-connect/github-connect.component';
import { GithubDataComponent } from './components/github-data/github-data.component';

const routes: Routes = [
  { path: '', redirectTo: 'connect', pathMatch: 'full' },
  { path: 'connect', component: GithubConnectComponent },
  { path: 'data', component: GithubDataComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class GithubRoutingModule { } 