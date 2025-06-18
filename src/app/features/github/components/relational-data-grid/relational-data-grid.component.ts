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
  ValueFormatterParams,
  ICellRendererParams,
  RowGroupingDisplayType
} from 'ag-grid-community';
import { 
  GithubService, 
  GithubUser, 
  RelationalDataResponse, 
  RepoRelationship,
  CommitItem,
  PullRequestItem,
  IssueItem,
  ModelField
} from '../../service/github.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { Subject, debounceTime } from 'rxjs';
import { AvatarCellComponent } from '../avatar-cell/avatar-cell.component';

@Component({
  selector: 'app-relational-data-grid',
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
    MatCheckboxModule,
    MatExpansionModule,
    MatTabsModule,
    MatChipsModule,
    MatBadgeModule,
    AvatarCellComponent
  ],
  templateUrl: './relational-data-grid.component.html',
  styleUrl: './relational-data-grid.component.scss'
})
export class RelationalDataGridComponent implements OnInit {
  @ViewChild(AgGridAngular) agGrid!: AgGridAngular;
  
  users: GithubUser[] = [];
  selectedUser: GithubUser | null = null;
  selectedRepository: any = null;
  repositories: any[] = [];
  
  relationshipData: RepoRelationship[] = [];
  currentRepo: RepoRelationship | null = null;
  
  // Combined data from all collections for the grid
  combinedData: any[] = [];
  
  columnDefs: ColDef[] = [];
  rowData: any[] = [];
  defaultColDef: ColDef = {
    sortable: true,
    filter: 'agTextColumnFilter',
    resizable: true,
    flex: 1,
    minWidth: 100,
    maxWidth: 600,
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
  gridHeight: string = 'calc(100vh - 250px)';
  
  // Filter options
  filterTypes: string[] = ['All', 'Pull Requests', 'Issues'];
  selectedFilterType: string = 'All';
  
  searchText: string = '';
  searchDebounce: Subject<string> = new Subject<string>();
  loading: boolean = false;
  totalRows: number = 0;
  pageSize: number = 25;
  pageIndex: number = 0;
  pageSizeOptions: number[] = [10, 25, 50, 100];
  
  filterModel: any = {};
  sortModel: any = { field: 'created_at', sort: 'desc' };
  
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
    this.gridHeight = 'calc(100vh - 250px)';
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
  
  onUserChange(): void {
    this.selectedRepository = null;
    this.repositories = [];
    this.relationshipData = [];
    this.currentRepo = null;
    this.rowData = [];
    this.columnDefs = [];
    
    if (this.selectedUser) {
      this.loadRepositories();
    }
  }
  
  loadRepositories(): void {
    if (!this.selectedUser) return;
    
    this.loading = true;
    const userId = this.selectedUser._id || '';
    
    this.githubService.getUserRepositories(userId).subscribe({
      next: (response: {success: boolean; count: number; data: any[]}) => {
        this.repositories = response.data || [];
        this.loading = false;
        
        // Only load relational data after repositories are loaded
        if (this.repositories.length > 0) {
          // Don't auto-select a repository, let user choose
          this.selectedRepository = null;
        } else {
          // If no repositories, load all data
          this.loadRelationalData();
        }
      },
      error: (error: any) => {
        console.error('Error loading repositories:', error);
        this.loading = false;
      }
    });
  }
  
  onRepositoryChange(): void {
    this.loadRelationalData();
  }
  
  onFilterTypeChange(event: any): void {
    console.log('Filter type changed:', event);
    this.selectedFilterType = event.value;
    this.loadRelationalData();
  }
  
  totalPRs: number = 0;
  totalIssues: number = 0;
  
  loadRelationalData(): void {
    if (!this.selectedUser) return;
    
    this.loading = true;
    
    // Create base params
    const params: any = {
      page: this.pageIndex + 1,
      limit: this.pageSize,
      search: this.searchText || undefined,
      sort: this.sortModel.field || 'created_at',
      sortOrder: this.sortModel.sort || 'desc',
      repoId: this.selectedRepository ? this.selectedRepository._id : undefined,
      filterType: this.selectedFilterType
    };
    
    // Add filter parameters from filter model
    if (this.filterModel) {
      Object.keys(this.filterModel).forEach(key => {
        const filter = this.filterModel[key];
        
        if (filter.filterType === 'text') {
          if (filter.type) {
            switch (filter.type) {
              case 'contains':
                params[`${key}_contains`] = filter.filter;
                break;
              case 'notContains':
                params[`${key}_notContains`] = filter.filter;
                break;
              case 'equals':
                params[key] = filter.filter;
                break;
              case 'notEqual':
                params[`${key}_ne`] = filter.filter;
                break;
              case 'startsWith':
                params[`${key}_startsWith`] = filter.filter;
                break;
              case 'endsWith':
                params[`${key}_endsWith`] = filter.filter;
                break;
              case 'empty':
                params[`${key}_empty`] = true;
                break;
            }
          } else if (filter.filter) {
            params[`${key}_contains`] = filter.filter;
          }
        } else if (filter.filterType === 'date') {
          if (filter.dateFrom) {
            const date = new Date(filter.dateFrom);
            params[`${key}`] = date.toISOString().split('T')[0];
          }
          
          if (filter.type) {
            switch (filter.type) {
              case 'equals':
                break;
              case 'notEqual':
                params[`${key}_ne`] = params[key];
                delete params[key];
                break;
              case 'greaterThan':
                params[`${key}_gt`] = params[key];
                delete params[key];
                break;
              case 'lessThan':
                params[`${key}_lt`] = params[key];
                delete params[key];
                break;
              case 'greaterThanOrEqual':
                params[`${key}_gte`] = params[key];
                delete params[key];
                break;
              case 'lessThanOrEqual':
                params[`${key}_lte`] = params[key];
                delete params[key];
                break;
            }
          }
        } else {
          if (filter.filter) {
            params[key] = filter.filter;
          }
        }
      });
    }
    
    const userId = this.selectedUser._id || '';
    
    this.githubService.getRelationalData(userId, params).subscribe({
      next: (response: RelationalDataResponse) => {
        // Store repositories if needed
        if (this.repositories.length === 0) {
          this.repositories = response.repositories || [];
        }
        
        this.relationshipData = response.data || [];
        
        // Log fields for debugging
        if (response.fields) {
          console.log('Received fields from API:', response.fields);
        }
        
        if (this.relationshipData.length > 0) {
          this.currentRepo = this.relationshipData[0];
          this.setupGridData();
          
          // Use the totalCount from the backend for pagination
          this.totalRows = response.totalCount || 0;
          this.totalPRs = response.totalPRs || 0;
          this.totalIssues = response.totalIssues || 0;
          // If we're on a page that no longer exists (e.g., after filtering), go back to first page
          const maxPage = Math.max(0, Math.ceil(this.totalRows / this.pageSize) - 1);
          if (this.pageIndex > maxPage && maxPage >= 0) {
            this.pageIndex = 0;
            this.loadRelationalData();
            return;
          }
        } else {
          this.rowData = [];
          this.columnDefs = [];
          this.totalRows = 0;
        }
        
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading relational data:', error);
        this.loading = false;
      }
    });
  }
  
  setupGridData(): void {
    if (!this.currentRepo) {
      this.rowData = [];
      this.columnDefs = [];
      return;
    }
    
    // Combine all data into a single array for the grid
    this.combinedData = [
      ...this.currentRepo.pullRequests,
      ...this.currentRepo.issues
    ];
    
    this.applyFilters();
    
    // Set up columns based on the data
    this.setupColumns();
  }
  
  applyFilters(): void {
    if (!this.currentRepo) {
      this.rowData = [];
      return;
    }
    
    // Apply type filter
    let filteredData = [...this.combinedData];
    
    if (this.selectedFilterType !== 'All') {
      switch (this.selectedFilterType) {
        case 'Pull Requests':
          filteredData = this.currentRepo.pullRequests;
          break;
        case 'Issues':
          filteredData = this.currentRepo.issues;
          break;
      }
    }
    
    // Apply search filter if needed (client-side only for quick filtering)
    if (this.searchText && this.searchText.trim() !== '') {
      const searchLower = this.searchText.toLowerCase().trim();
      filteredData = filteredData.filter(item => {
        // Search in different fields based on item type
        if (item.type === 'pullRequest') {
          return (
            (item.title && item.title.toLowerCase().includes(searchLower)) ||
            (item.body && item.body.toLowerCase().includes(searchLower)) ||
            (item.user?.login && item.user.login.toLowerCase().includes(searchLower)) ||
            (item.state && item.state.toLowerCase().includes(searchLower))
          );
        } else if (item.type === 'issue') {
          return (
            (item.title && item.title.toLowerCase().includes(searchLower)) ||
            (item.body && item.body.toLowerCase().includes(searchLower)) ||
            (item.user?.login && item.user.login.toLowerCase().includes(searchLower)) ||
            (item.state && item.state.toLowerCase().includes(searchLower))
          );
        }
        return false;
      });
    }
    
    this.rowData = filteredData;
  }
  
  setupColumns(): void {
    // Base columns that are always present
    const baseColumns: ColDef[] = [
      {
        headerName: 'Type',
        field: 'type',
        width: 120,
        maxWidth: 600,
        filter: 'agTextColumnFilter',
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
        },
        cellRenderer: (params: ICellRendererParams) => {
          const type = params.value;
          let icon = '';
          let label = '';
          let badgeClass = '';
          
          switch (type) {
            case 'pullRequest':
              icon = 'merge_type';
              label = 'PR';
              badgeClass = 'pr-badge';
              break;
            case 'issue':
              icon = 'bug_report';
              label = 'Issue';
              badgeClass = 'issue-badge';
              break;
          }
          
          return `<div class="type-cell">
                    <span class="type-badge ${badgeClass}">
                      <span class="material-icons">${icon}</span>
                      ${label}
                    </span>
                  </div>`;
        }
      },
      {
        headerName: 'Details',
        field: 'details',
        width: 100,
        maxWidth: 600,
        filter: false,
        cellRenderer: (params: ICellRendererParams) => {
          let detailsCount = 0;
          
          if (params.data.type === 'pullRequest' && params.data.commitDetails) {
            detailsCount = params.data.commitDetails.length;
          } else if (params.data.type === 'issue' && params.data.history) {
            detailsCount = params.data.history.length;
          }
          
          if (detailsCount > 0) {
            return `<div class="details-cell">
                      <span class="details-badge">${detailsCount}</span>
                    </div>`;
          }
          
          return '';
        }
      }
    ];
    
    // Get dynamic fields from the API response
    const dynamicFields = this.githubService.getLastRelationalDataFields();
    
    if (dynamicFields && this.rowData.length > 0) {
      // Determine which fields to use based on the filter type
      let fieldsToUse: ModelField[] = [];
      
      if (this.selectedFilterType === 'Pull Requests') {
        fieldsToUse = dynamicFields.pullRequestFields || [];
      } else if (this.selectedFilterType === 'Issues') {
        fieldsToUse = dynamicFields.issueFields || [];
      } else {
        // For 'All', merge the fields from both types
        const allFields = [
          ...(dynamicFields.pullRequestFields || []),
          ...(dynamicFields.issueFields || [])
        ];
        
        // Deduplicate fields by field name
        const fieldMap = new Map();
        allFields.forEach(field => {
          if (!fieldMap.has(field.field)) {
            fieldMap.set(field.field, field);
          }
        });
        
        fieldsToUse = Array.from(fieldMap.values());
      }
      
      // Convert fields to column definitions - similar to github-data.component.ts
      const dynamicColumns = fieldsToUse
        .filter(field => {
          // Skip fields that are complex objects or already handled by base columns
          if (['type', 'details', 'commitDetails', 'history'].includes(field.field)) {
            return false;
          }
          
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
            floatingFilter: true,
            maxWidth: 600,
            // Add cell style function to highlight cells containing search text
            cellStyle: (params: any) => {
              if (this.searchText && params.value && typeof params.value === 'string') {
                const searchLower = this.searchText.toLowerCase();
                const valueLower = params.value.toString().toLowerCase();
                
                if (valueLower.includes(searchLower)) {
                  return { backgroundColor: '#FFFFCC' }; // Light yellow highlight
                }
              }
              return null;
            }
          };
          
          // Special handling for common fields
          const fieldName = field.field.toLowerCase();
          if (fieldName === 'avatar_url' || 
              fieldName === 'avatarurl' || 
              fieldName === 'avatar' || 
              fieldName.includes('avatar_url') || 
              fieldName.includes('avatarurl')) {
            colDef.cellRenderer = AvatarCellComponent;
            colDef.width = 80;
            colDef.flex = 0;
            colDef.filter = false;
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
          } else if (field.type === 'date' || field.field.includes('date') || field.field.includes('_at')) {
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
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
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
          
          // Special handling for specific fields
          switch (field.field) {
            case 'number':
              colDef.headerName = 'ID/Number';
              colDef.width = 120;
              break;
            case 'title':
              colDef.flex = 2;
              break;
            case 'user':
              colDef.headerName = 'Author/User';
              colDef.width = 150;
              colDef.cellRenderer = 'avatarCellRenderer';
              colDef.cellRendererParams = {
                avatarField: 'user.avatar_url',
                nameField: 'user.login'
              };
              break;
            case 'state':
              colDef.headerName = 'Status/State';
              colDef.width = 120;
              colDef.cellRenderer = (params: ICellRendererParams) => {
                if (!params.value) return '';
                
                let stateClass = '';
                switch (params.value.toLowerCase()) {
                  case 'open':
                    stateClass = 'state-open';
                    break;
                  case 'closed':
                    stateClass = 'state-closed';
                    break;
                  case 'merged':
                    stateClass = 'state-merged';
                    break;
                }
                
                return `<div class="state-cell ${stateClass}">${params.value}</div>`;
              };
              break;
          }
          
          return colDef;
        });
      
      // Combine base columns with dynamic columns
      this.columnDefs = [...baseColumns, ...dynamicColumns];
    } else {
      // Fallback to default columns if no dynamic fields
      this.setupDefaultColumns();
    }
  }
  
  setupDefaultColumns(): void {
    this.columnDefs = [
      {
        headerName: 'Type',
        field: 'type',
        width: 120,
        maxWidth: 600,
        filter: 'agTextColumnFilter',
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
        },
        cellRenderer: (params: ICellRendererParams) => {
          const type = params.value;
          let icon = '';
          let label = '';
          let badgeClass = '';
          
          switch (type) {
            case 'pullRequest':
              icon = 'merge_type';
              label = 'PR';
              badgeClass = 'pr-badge';
              break;
            case 'issue':
              icon = 'bug_report';
              label = 'Issue';
              badgeClass = 'issue-badge';
              break;
          }
          
          return `<div class="type-cell">
                    <span class="type-badge ${badgeClass}">
                      <span class="material-icons">${icon}</span>
                      ${label}
                    </span>
                  </div>`;
        }
      },
      {
        headerName: 'ID/Number',
        field: 'number',
        width: 120,
        maxWidth: 600,
        filter: 'agNumberColumnFilter',
        filterParams: {
          buttons: ['reset', 'apply'],
          closeOnApply: true
        }
      },
      {
        headerName: 'Title',
        field: 'title',
        flex: 2,
        maxWidth: 600,
        filter: 'agTextColumnFilter',
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
      },
      {
        headerName: 'Author/User',
        field: 'user',
        width: 150,
        maxWidth: 600,
        filter: false,
        cellRenderer: 'avatarCellRenderer',
        cellRendererParams: {
          avatarField: 'user.avatar_url',
          nameField: 'user.login'
        }
      },
      {
        headerName: 'Status/State',
        field: 'state',
        width: 120,
        maxWidth: 600,
        filter: 'agTextColumnFilter',
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
        },
        cellRenderer: (params: ICellRendererParams) => {
          if (!params.value) return '';
          
          let stateClass = '';
          switch (params.value.toLowerCase()) {
            case 'open':
              stateClass = 'state-open';
              break;
            case 'closed':
              stateClass = 'state-closed';
              break;
            case 'merged':
              stateClass = 'state-merged';
              break;
          }
          
          return `<div class="state-cell ${stateClass}">${params.value}</div>`;
        }
      },
      {
        headerName: 'Date',
        field: 'created_at',
        width: 150,
        maxWidth: 600,
        filter: 'agDateColumnFilter',
        filterParams: {
          buttons: ['reset', 'apply'],
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
        },
        valueFormatter: (params: ValueFormatterParams) => {
          if (params.value) {
            const date = new Date(params.value);
            if (!isNaN(date.getTime())) {
              return date.toLocaleDateString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
            }
          }
          return params.value;
        }
      },
      {
        headerName: 'Details',
        field: 'details',
        width: 100,
        maxWidth: 600,
        filter: false,
        cellRenderer: (params: ICellRendererParams) => {
          let detailsCount = 0;
          
          if (params.data.type === 'pullRequest' && params.data.commitDetails) {
            detailsCount = params.data.commitDetails.length;
          } else if (params.data.type === 'issue' && params.data.history) {
            detailsCount = params.data.history.length;
          }
          
          if (detailsCount > 0) {
            return `<div class="details-cell">
                      <span class="details-badge">${detailsCount}</span>
                    </div>`;
          }
          
          return '';
        }
      }
    ];
  }
  
  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    this.gridApi.sizeColumnsToFit();
    
    // Set theme to legacy to avoid conflicts
    params.api.setGridOption('theme', 'legacy');
  }
  
  onFilterChanged(event: FilterChangedEvent): void {
    this.filterModel = this.gridApi.getFilterModel();
    console.log('Filter model updated:', this.filterModel);
    this.pageIndex = 0;
    this.loadRelationalData();
  }
  
  onSortChanged(event: SortChangedEvent): void {
    const columnState = this.gridApi.getColumnState();
    const sortedColumn = columnState.find(col => col.sort !== null && col.sort !== undefined);
    
    if (sortedColumn) {
      this.sortModel = {
        field: sortedColumn.colId,
        sort: sortedColumn.sort
      };
    } else {
      this.sortModel = { field: 'created_at', sort: 'desc' };
    }
    
    this.pageIndex = 0;
    this.loadRelationalData();
  }
  
  onSearchInput(): void {
    this.searchDebounce.next(this.searchText);
  }
  
  performSearch(): void {
    // Reset to first page when searching
    this.pageIndex = 0;
    // Use server-side search for more accurate results
    this.loadRelationalData();
  }
  
  onSearch(): void {
    this.performSearch();
  }
  
  clearSearch(): void {
    this.searchText = '';
    this.performSearch();
  }
  
  resetGrid(): void {
    this.searchText = '';
    this.selectedFilterType = 'All';
    this.pageIndex = 0;
    this.filterModel = {};
    this.sortModel = { field: 'created_at', sort: 'desc' };
    
    if (this.gridApi) {
      this.gridApi.setFilterModel(null);
      this.gridApi.refreshHeader();
    }
    
    this.loadRelationalData();
  }
  
  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.loadRelationalData();
  }
  
  formatHeaderName(field: string): string {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
  
  // Determine which rows should be expandable (have details)
  isRowMaster = (dataItem: any) => {
    if (!dataItem) return false;
    
    if (dataItem.type === 'pullRequest') {
      return dataItem.commitDetails && dataItem.commitDetails.length > 0;
    }
    
    if (dataItem.type === 'issue') {
      return dataItem.history && dataItem.history.length > 0;
    }
    
    return false;
  }
  
  getDetailCellRenderer() {
    return (params: ICellRendererParams) => {
      const data = params.data;
      if (!data) return '';
      
      let html = '<div class="detail-cell">';
      
      // Add repository info
      html += `<div class="detail-section">
                <h4>Repository: <a href="https://github.com/${data.repositoryFullName || ''}" target="_blank">${data.repositoryFullName || data.repositoryName || 'Unknown'}</a></h4>
              </div>`;
      
      // Add specific details based on item type
      if (data.type === 'pullRequest') {
        html += `<div class="detail-section">
                  <h4>Pull Request <a href="https://github.com/${data.repositoryFullName}/pull/${data.number}" target="_blank">#${data.number}</a></h4>
                  <p><strong>Title:</strong> ${data.title || 'No title'}</p>
                  <p><strong>State:</strong> <span class="state-cell state-${data.state?.toLowerCase() || 'unknown'}">${data.state || 'Unknown'}</span></p>
                  <p><strong>Created by:</strong> ${data.user?.login ? `<a href="https://github.com/${data.user.login}" target="_blank">${data.user.login}</a>` : 'Unknown'}</p>
                  <p><strong>Created:</strong> ${new Date(data.created_at).toLocaleString()}</p>
                  ${data.merged_at ? `<p><strong>Merged:</strong> ${new Date(data.merged_at).toLocaleString()}</p>` : ''}
                  ${data.closed_at ? `<p><strong>Closed:</strong> ${new Date(data.closed_at).toLocaleString()}</p>` : ''}
                  <div class="pr-body">
                    <strong>Description:</strong>
                    <div>${data.body ? data.body.replace(/\n/g, '<br>') : 'No description'}</div>
                  </div>`;
                  
        // Add commits if available
        if (data.commitDetails && data.commitDetails.length > 0) {
          html += `<div class="pr-commits">
                    <h5>Associated Commits (${data.commitDetails.length})</h5>
                    <ul class="commit-list">`;
          
          data.commitDetails.forEach((commit: any) => {
            html += `<li class="commit-item">
                      <div class="commit-header">
                        <span class="commit-sha">${commit.sha ? `<a href="https://github.com/${data.repositoryFullName}/commit/${commit.sha}" target="_blank">${commit.sha.substring(0, 7)}</a>` : 'Unknown'}</span>
                        <span class="commit-author">${commit.author?.name || 'Unknown'}</span>
                        <span class="commit-date">${new Date(commit.date || commit.author?.date).toLocaleString()}</span>
                      </div>
                      <div class="commit-message">${commit.message ? commit.message.replace(/\n/g, '<br>') : 'No message'}</div>
                    </li>`;
          });
          
          html += `</ul>
                  </div>`;
        }
        
        html += `</div>`;
      } else if (data.type === 'issue') {
        html += `<div class="detail-section">
                  <h4>Issue <a href="https://github.com/${data.repositoryFullName}/issues/${data.number}" target="_blank">#${data.number}</a></h4>
                  <p><strong>Title:</strong> ${data.title || 'No title'}</p>
                  <p><strong>State:</strong> <span class="state-cell state-${data.state?.toLowerCase() || 'unknown'}">${data.state || 'Unknown'}</span></p>
                  <p><strong>Created by:</strong> ${data.user?.login ? `<a href="https://github.com/${data.user.login}" target="_blank">${data.user.login}</a>` : 'Unknown'}</p>
                  <p><strong>Created:</strong> ${new Date(data.created_at).toLocaleString()}</p>
                  ${data.closed_at ? `<p><strong>Closed:</strong> ${new Date(data.closed_at).toLocaleString()}</p>` : ''}
                  <div class="issue-body">
                    <strong>Description:</strong>
                    <div>${data.body ? data.body.replace(/\n/g, '<br>') : 'No description'}</div>
                  </div>`;
        
        // Add issue history if available
        if (data.history && data.history.length > 0) {
          html += `<div class="issue-history">
                    <h5>Issue History (${data.history.length})</h5>
                    <ul class="history-list">`;
          
          data.history.forEach((historyItem: any) => {
            html += `<li class="history-item">
                      <span class="history-date">${new Date(historyItem.date).toLocaleString()}</span>
                      <span class="history-actor">${historyItem.actor ? `<a href="https://github.com/${historyItem.actor}" target="_blank">${historyItem.actor}</a>` : 'Unknown'}</span>
                      <span class="history-action">`;
                      
            if (historyItem.field && (historyItem.from !== undefined || historyItem.to !== undefined)) {
              html += `changed <strong>${historyItem.field}</strong> from "<code>${historyItem.from || ''}</code>" to "<code>${historyItem.to || ''}</code>"`;
            } else {
              html += historyItem.summary || historyItem.eventType || 'Updated issue';
            }
            
            html += `</span>
                    </li>`;
          });
          
          html += `</ul>
                  </div>`;
        }
        
        html += `</div>`;
      }
      
      html += '</div>';
      return html;
    };
  }
  
  // Custom avatar cell renderer
  avatarCellRenderer = (params: ICellRendererParams) => {
    if (!params.data) return '';
    
    const avatarUrl = params.data.user?.avatar_url || '';
    const name = params.data.user?.login || 'Unknown';
    
    if (avatarUrl) {
      return `<div class="user-cell">
                <img src="${avatarUrl}" alt="${name}" class="user-avatar" onerror="this.onerror=null; this.src='assets/images/default-avatar.png';" />
                <span>${name}</span>
              </div>`;
    }
    
    return name;
  }
}
