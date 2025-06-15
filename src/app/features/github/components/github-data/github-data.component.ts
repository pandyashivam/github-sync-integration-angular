import { Component, OnInit, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AgGridModule } from 'ag-grid-angular';
import { AgGridAngular } from 'ag-grid-angular';
import { 
  ColDef, 
  GridApi, 
  GridReadyEvent, 
  FilterChangedEvent, 
  SortChangedEvent,
  IFilterOptionDef,
  TextFilterModel,
  DateFilterModel,
  ValueFormatterParams
} from 'ag-grid-community';
import { GithubService, GithubUser, ModelInfo } from '../../service/github.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Subject, debounceTime } from 'rxjs';
import { AvatarCellComponent } from '../avatar-cell/avatar-cell.component';

@Component({
  selector: 'app-github-data',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    AgGridModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
  ],
  templateUrl: './github-data.component.html',
  styleUrl: './github-data.component.scss'
})
export class GithubDataComponent implements OnInit {
  @ViewChild(AgGridAngular) agGrid!: AgGridAngular;
  
  autoSizeStrategy: any = {
    type: 'fitCellContents',
    defaultMinWidth: 200
  };
  users: GithubUser[] = [];
  models: ModelInfo[] = [];
  selectedUser: GithubUser | null = null;
  selectedModel: string | null = null;
  
  columnDefs: ColDef[] = [];
  rowData: any[] = [];
  defaultColDef: ColDef = {
    sortable: true,
    filter: 'agTextColumnFilter',
    resizable: true,
    flex: 1,
    minWidth: 100,
    filterParams: {
      buttons: ['reset', 'apply'],
      closeOnApply: true,
      filterOptions: [
        'contains',
        'notContains',
        'equals',
        'notEqual',
        'startsWith',
        'endsWith',
        'empty'
      ],
      debounceMs: 200
    }
  };
  gridApi!: GridApi;
  gridHeight: string = 'calc(100vh - 150px)';
  
  searchText: string = '';
  searchDebounce: Subject<string> = new Subject<string>();
  loading: boolean = false;
  totalRows: number = 0;
  pageSize: number = 25;
  pageIndex: number = 0;
  pageSizeOptions: number[] = [10, 25, 50, 100];
  
  filterModel: any = {};
  sortModel: any = { field: 'createdAt', sort: 'desc' };
  
  constructor(private githubService: GithubService) {
    this.searchDebounce
      .pipe(debounceTime(300))
      .subscribe(() => {
        this.performSearch();
      });
  }
  
  ngOnInit(): void {
    this.loadUsers();
    this.updateGridHeight();
  }
  
  @HostListener('window:resize')
  onResize() {
    this.updateGridHeight();
  }
  
  updateGridHeight() {
    this.gridHeight = 'calc(100vh - 150px)';
    setTimeout(() => {
      if (this.gridApi) {
        this.gridApi.sizeColumnsToFit();
      }
    }, 100);
  }
  
  loadUsers(): void {
    this.loading = true;
    this.githubService.getDataGridUsers().subscribe({
      next: (response) => {
        this.users = response.data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.loading = false;
      }
    });
  }
  
  loadModels(): void {
    if (!this.selectedUser) return;
    
    this.loading = true;
    this.githubService.getAvailableModels().subscribe({
      next: (response) => {
        this.models = response.data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading models:', error);
        this.loading = false;
      }
    });
  }
  
  onUserChange(): void {
    this.selectedModel = null;
    this.clearGrid();
    this.loadModels();
  }
  
  onModelChange(): void {
    this.resetGrid();
  }
  
  loadData(): void {
    if (!this.selectedUser || !this.selectedModel) return;
    
    this.loading = true;
    
    const filterParams: any = {};
    if (this.filterModel) {
      Object.keys(this.filterModel).forEach(key => {
        const filter = this.filterModel[key];
        
        if (filter.filterType === 'text') {
          const textFilter = filter as TextFilterModel;
          
          if (textFilter.type) {
            switch (textFilter.type) {
              case 'contains':
                filterParams[`${key}_contains`] = textFilter.filter;
                break;
              case 'notContains':
                filterParams[`${key}_notContains`] = textFilter.filter;
                break;
              case 'equals':
                filterParams[key] = textFilter.filter;
                break;
              case 'notEqual':
                filterParams[`${key}_ne`] = textFilter.filter;
                break;
              case 'startsWith':
                filterParams[`${key}_startsWith`] = textFilter.filter;
                break;
              case 'endsWith':
                filterParams[`${key}_endsWith`] = textFilter.filter;
                break;
              case 'empty':
                filterParams[`${key}_empty`] = true;
                break;
            }
          } else if (textFilter.filter) {
            filterParams[`${key}_contains`] = textFilter.filter;
          }
        } else if (filter.filterType === 'date') {
          const dateFilter = filter as DateFilterModel;
          
          if (dateFilter.dateFrom) {
            const date = new Date(dateFilter.dateFrom);
            filterParams[`${key}`] = date.toISOString().split('T')[0];
          }
          
          if (dateFilter.type) {
            switch (dateFilter.type) {
              case 'equals':
                break;
              case 'notEqual':
                filterParams[`${key}_ne`] = filterParams[key];
                delete filterParams[key];
                break;
              case 'greaterThan':
                filterParams[`${key}_gt`] = filterParams[key];
                delete filterParams[key];
                break;
              case 'lessThan':
                filterParams[`${key}_lt`] = filterParams[key];
                delete filterParams[key];
                break;
              case 'greaterThanOrEqual':
                filterParams[`${key}_gte`] = filterParams[key];
                delete filterParams[key];
                break;
              case 'lessThanOrEqual':
                filterParams[`${key}_lte`] = filterParams[key];
                delete filterParams[key];
                break;
            }
          }
        } else {
          if (filter.filter) {
            filterParams[key] = filter.filter;
          }
        }
      });
    }
    
    const params = {
      userId: this.selectedUser._id || '',
      page: this.pageIndex + 1,
      limit: this.pageSize,
      search: this.searchText || undefined,
      sort: this.sortModel.field || 'createdAt',
      sortOrder: this.sortModel.sort || 'desc',
      ...filterParams
    };
    
    this.githubService.getModelData(this.selectedModel, params).subscribe({
      next: (response) => {
        this.totalRows = response.totalRecords;
        this.rowData = response.data;
        
        this.columnDefs = response.fields
          .filter(field => {
            // Skip fields that are complex objects based on first row's data
            if (this.rowData.length > 0) {
              const firstRowValue = this.rowData[0][field.field];
              if (firstRowValue && typeof firstRowValue === 'object' && !(firstRowValue instanceof Date)) {
                return false;
              }
            }
            return true;
          })
          .map(field => {
          const colDef: ColDef = {
            field: field.field,
            headerName: this.formatHeaderName(field.field),
            sortable: true,
            floatingFilter: true
          };
          
          // Check if field is an avatar URL field
          const fieldName = field.field.toLowerCase();
          if (fieldName === 'avatar_url' || 
              fieldName === 'avatarurl' || 
              fieldName === 'avatar' || 
              fieldName.includes('avatar_url') || 
              fieldName.includes('avatarurl')) {
            colDef.cellRenderer = AvatarCellComponent;
            colDef.width = 80;
            colDef.flex = 0;
          } else if (field.type === 'string') {
            colDef.filter = 'agTextColumnFilter';
            colDef.filterParams = {
              filterOptions: [
                'contains',
                'notContains',
                'equals',
                'notEqual',
                'startsWith', 
                'endsWith',
                'empty'
              ],
              buttons: ['apply', 'reset'],
              closeOnApply: true,
              debounceMs: 200
            };
          } else if (field.type === 'number') {
            colDef.filter = 'agNumberColumnFilter';
            colDef.filterParams = {
              buttons: ['apply', 'reset'],
              closeOnApply: true
            };
          } else if (field.type === 'date' || field.field.includes('date') || field.field.includes('Date')) {
            colDef.filter = 'agDateColumnFilter';
            colDef.filterParams = {
              buttons: ['apply', 'reset'],
              closeOnApply: true,
              filterOptions: [
                'equals',
                'notEqual',
                'greaterThan',
                'lessThan',
                'greaterThanOrEqual',
                'lessThanOrEqual'
              ],
              comparator: (filterLocalDateAtMidnight: Date, cellValue: string) => {
                if (!cellValue) return -1;
                const cellDate = new Date(cellValue);
                
                // Compare dates without time component for exact date matching
                const filterDate = new Date(filterLocalDateAtMidnight);
                const cellDateOnly = new Date(cellDate.getFullYear(), cellDate.getMonth(), cellDate.getDate());
                const filterDateOnly = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate());
                
                if (filterDateOnly.getTime() === cellDateOnly.getTime()) {
                  return 0;
                }
                if (cellDateOnly < filterDateOnly) {
                  return -1;
                }
                if (cellDateOnly > filterDateOnly) {
                  return 1;
                }
                return 0;
              },
              debounceMs: 200
            };
            colDef.valueFormatter = (params) => {
              if (params.value) {
                const date = new Date(params.value);
                if (!isNaN(date.getTime())) {
                    return date.toLocaleDateString('en-US', {
                      month: '2-digit',
                      day: '2-digit',
                      year: 'numeric'
                    });
                }
              }
              return params.value;
            };
          } else {
            colDef.filter = 'agTextColumnFilter';
            colDef.filterParams = {
              buttons: ['apply', 'reset'],
              closeOnApply: true
            };
            // Add value formatter to handle potential objects
            colDef.valueFormatter = (params: ValueFormatterParams) => {
              if (params.value === null || params.value === undefined) {
                return '';
              }
              if (typeof params.value === 'object' && !(params.value instanceof Date)) {
                return '';  // Don't display objects
              }
              return params.value;
            };
          }
          
          return colDef;
        });
        
        this.loading = false;
        
        setTimeout(() => {
          if (this.gridApi) {
            this.gridApi.sizeColumnsToFit();
          }
        }, 100);
      },
      error: (error) => {
        console.error('Error loading data:', error);
        this.loading = false;
      }
    });
  }
  
  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    this.gridApi.sizeColumnsToFit();
  }
  
  onFilterChanged(event: FilterChangedEvent): void {
    this.filterModel = this.gridApi.getFilterModel();
    console.log('Filter model updated:', this.filterModel);
    this.pageIndex = 0;
    this.loadData();
  }
  
  onSortChanged(event: SortChangedEvent): void {
    this.pageIndex = 0;
    this.loadData();
  }
  
  onSearchInput(): void {
    this.searchDebounce.next(this.searchText);
  }
  
  performSearch(): void {
    this.pageIndex = 0;
    this.loadData();
  }
  
  onSearch(): void {
    this.performSearch();
  }
  
  clearSearch(): void {
    this.searchText = '';
    this.loadData();
  }
  
  clearGrid(): void {
    this.rowData = [];
    this.columnDefs = [];
    this.totalRows = 0;
    this.pageIndex = 0;
    this.filterModel = {};
    this.sortModel = { field: 'createdAt', sort: 'desc' };
  }
  
  resetGrid(): void {
    this.searchText = '';
    this.pageIndex = 0;
    this.filterModel = {};
    this.sortModel = { field: 'createdAt', sort: 'desc' };
    if (this.gridApi) {
      this.gridApi.setFilterModel(null);
      this.gridApi.refreshHeader();
    }
    this.loadData();
  }
  
  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.loadData();
  }
  
  formatHeaderName(field: string): string {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
}
