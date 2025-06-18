import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { ModuleRegistry, AllCommunityModule, ClientSideRowModelModule } from 'ag-grid-community';
import { MasterDetailModule } from 'ag-grid-enterprise';

// Register AG Grid Modules
ModuleRegistry.registerModules([AllCommunityModule, MasterDetailModule , ClientSideRowModelModule ]);

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
