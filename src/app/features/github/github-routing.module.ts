import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GithubConnectComponent } from './components/github-connect/github-connect.component';
import { GithubDataComponent } from './components/github-data/github-data.component';
import { RelationalDataGridComponent } from './components/relational-data-grid/relational-data-grid.component';

const routes: Routes = [
  { path: '', redirectTo: 'connect', pathMatch: 'full' },
  { path: 'connect', component: GithubConnectComponent },
  { path: 'data', component: GithubDataComponent },
  { path: 'relational-data', component: RelationalDataGridComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class GithubRoutingModule { } 