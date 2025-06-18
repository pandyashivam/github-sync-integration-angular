import { Component, OnInit, OnDestroy, ViewChild, HostListener } from '@angular/core';
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
import { GithubService, GithubUser, ModelInfo, UserDetails, UserDetailItem } from '../../service/github.service';
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
import { Subject, debounceTime } from 'rxjs';
import { AvatarCellComponent } from '../avatar-cell/avatar-cell.component';
import { ActivatedRoute, Router } from '@angular/router';

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
    MatCheckboxModule,
    MatExpansionModule,
    AvatarCellComponent,
  ],
  templateUrl: './github-data.component.html',
  styleUrl: './github-data.component.scss'
})
export class GithubDataComponent implements OnInit, OnDestroy {
  @ViewChild(AgGridAngular) agGrid!: AgGridAngular;
  
  private findUserHandler: EventListener;
  
  autoSizeStrategy: any = {
    type: 'fitCellContents',
    defaultMinWidth: 200
  };
  users: GithubUser[] = [];
  models: ModelInfo[] = [];
  selectedUser: GithubUser | null = null;
  selectedModel: string | null = null;
  selectedUserDetailId: string | null = null;
  selectedUserDetailModel: string | null = null;
  isUserDetailMode : boolean = false;
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
  
  collectionGridApis: GridApi[] = [];
  
  searchText: string = '';
  searchDebounce: Subject<string> = new Subject<string>();
  loading: boolean = false;
  totalRows: number = 0;
  pageSize: number = 25;
  pageIndex: number = 0;
  pageSizeOptions: number[] = [10, 25, 50, 100];
  searchAcrossAllCollections: boolean = false;
  
  filterModel: any = {};
  sortModel: any = { field: 'createdAt', sort: 'desc' };
  
  userDetails: UserDetails | null = null;
  userDetailItems: UserDetailItem[] = [];
  filteredUserDetailItems: UserDetailItem[] = [];
  
  searchResults: any[] = [];
  
  collectionPagination: { [key: number]: { pageIndex: number, pageSize: number } } = {};
  collectionLoading: { [key: number]: boolean } = {};
  
  constructor(private githubService: GithubService, private route: ActivatedRoute) {
    this.route.queryParams.subscribe(params => {
      if (params['assigneeId'] && params['model']) {
        this.selectedUserDetailId = params['assigneeId'];
        this.selectedUserDetailModel  = params['model'];
        this.isUserDetailMode = true;
      }
    });
    this.searchDebounce
      .pipe(debounceTime(300))
      .subscribe(() => {
        this.performSearch();
      });
      
    this.findUserHandler = ((event: CustomEvent) => {
      this.findUser(event.detail);
    }) as EventListener;
  }
  
  ngOnInit(): void {
    if (this.isUserDetailMode) {
      this.loadUserDetail();
    } else {
      this.loadUsers();
    }
    this.updateGridHeight();
    
    document.addEventListener('findUser', this.findUserHandler);
  }
  
  ngOnDestroy(): void {
    document.removeEventListener('findUser', this.findUserHandler);
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
    this.searchAcrossAllCollections = false;
    this.clearGrid();
    this.loadModels();
  }
  
  onModelChange(): void {
    this.searchAcrossAllCollections = false;
    this.resetGrid();
  }

  loadUserDetail(): void {
    if (!this.selectedUserDetailId || !this.selectedUserDetailModel) {
      return;
    }
    
    this.loading = true;
    
    const filterParams: any = this.getfilterParams();
    
    const params = {
      page: this.pageIndex + 1,
      limit: this.pageSize,
      search: this.searchText || undefined,
      sort: this.sortModel.field || 'created_at',
      sortOrder: this.sortModel.sort || 'desc',
      ...filterParams
    };
    
    this.githubService.getUserDetails(this.selectedUserDetailId, this.selectedUserDetailModel, params)
      .subscribe({
        next: (response) => {
          console.log('User details response:', response);
          this.userDetails = response;
          this.userDetailItems = response.data;
          this.totalRows = response.totalRecords;
          this.pageIndex = response.currentPage - 1;
         
          this.columnDefs = this.getColumnDefs(response.fields);
          this.rowData = this.userDetailItems;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading user details:', error);
          this.loading = false;
        }
      });
  }
  
  
  loadData(): void {
    if (!this.selectedUser || !this.selectedModel) return;
    
    this.loading = true;
    
    const filterParams: any = this.getfilterParams();
    
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
        
        this.columnDefs = this.getColumnDefs(response.fields);
        this.userLinkColDef();
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

  getfilterParams(){
    let filterParams: any = {};
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
    return filterParams;
  }

  userLinkColDef(){

    if (this.selectedModel === 'PullRequest') {
      this.columnDefs.unshift({
        headerName: '',
        field: 'findUser',
        width: 100,
        flex: 0,
        sortable: false,
        filter: false,
        floatingFilter: false,
        cellRenderer: (params: any) => {
          // Check if the row data has assignee with an id
          if (params.data && params.data.assignee && params.data.assignee.id) {
            const assigneeId = params.data.assignee.id;
            return `<a href="javascript:void(0)" 
                     onclick="document.dispatchEvent(new CustomEvent('findUser', 
                     { detail: {'assigneeId': '${assigneeId}', 'ModelName': 'PullRequest' } }))">Find User</a>`;
          }
          return '';
        }
      });
    }
    

    if (this.selectedModel === 'Issue') {
      this.columnDefs.unshift({
        headerName: '',
        field: 'findUser',
        width: 100,
        flex: 0,
        sortable: false,
        filter: false,
        floatingFilter: false,
        cellRenderer: (params: any) => {
          // Check if the row data has closed_by with an id
          if (params.data && params.data.closed_by && params.data.closed_by.id) {
            const closedById = params.data.closed_by.id;
            return `<a href="javascript:void(0)" 
                     onclick="document.dispatchEvent(new CustomEvent('findUser', 
                     { detail: {'assigneeId': '${closedById}', 'ModelName': 'Issue' } }))">Find User</a>`;
          }
          return '';
        }
      });
    }
  }

  getColumnDefs(fields: any[]) {
   return fields.filter(field => {
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
  }
  
  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    
    this.gridApi.sizeColumnsToFit();
  }
  
  onCollectionGridReady(params: GridReadyEvent, index: number): void {
    this.collectionGridApis[index] = params.api;
    
    params.api.sizeColumnsToFit();
    
    setTimeout(() => {
      const allColumnIds: string[] = [];
      params.api.getColumnDefs()?.forEach((colDef: any) => {
        if (colDef.field) {
          allColumnIds.push(colDef.field);
        }
      });
      
      params.api.autoSizeColumns(allColumnIds);
    }, 100);
  }
  
  onFilterChanged(event: FilterChangedEvent): void {
    this.filterModel = this.gridApi.getFilterModel();
    console.log('Filter model updated:', this.filterModel);
    this.pageIndex = 0;
    
    if (this.isUserDetailMode) {
      this.loadUserDetail();
    } else {
      this.loadData();
    }
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
    if (this.isUserDetailMode) {
      this.loadUserDetail();
    } else {
      this.loadData();
    }
  }
  
  onSearchInput(): void {
    this.searchDebounce.next(this.searchText);
    
    if (this.gridApi && !this.searchAcrossAllCollections) {
      this.gridApi.refreshCells({ force: true });
    }

    if (this.collectionGridApis.length > 0) {
      this.collectionGridApis.forEach(api => {
        if (api) {
          api.refreshCells({ force: true });
        }
      });
    }
  }
  
  performSearch(): void {
    this.pageIndex = 0;
    if (this.searchAcrossAllCollections && this.searchText) {
      this.loadGlobalSearchResults();
    } else if (this.isUserDetailMode) {
      this.loadUserDetail();
    } else {
      this.loadData();
    }
  }
  
  loadGlobalSearchResults(): void {
    if (!this.searchText || !this.selectedUser || !this.selectedUser._id) return;
    
    this.loading = true;
    
    this.githubService.searchAcrossAllCollections(this.selectedUser._id, this.searchText, {
      page: this.pageIndex + 1,
      limit: this.pageSize
    }).subscribe({
      next: (response: any) => {
        this.totalRows = response.totalRecords || 0;
        this.rowData = [];
        this.columnDefs = [];
        this.searchResults = response.data || [];
        this.searchResults.forEach((collection, index) => {
          this.collectionPagination[index] = {
            pageIndex: 0,
            pageSize: 10
          };
          this.collectionLoading[index] = false;
        });
        
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error performing global search:', error);
        this.loading = false;
      }
    });
  }
  
  onSearch(): void {
    this.performSearch();
  }
  
  clearSearch(): void {
    this.searchText = '';
    this.searchResults = [];
    if (this.searchAcrossAllCollections) {
      this.resetGrid();
      return;
    }
    
    if (this.isUserDetailMode) {
      this.loadUserDetail();
    } else {
      this.loadData();
    }
  }
  
  clearGrid(): void {
    this.rowData = [];
    this.columnDefs = [];
    this.searchResults = [];
    this.totalRows = 0;
    this.pageIndex = 0;
    this.filterModel = {};
    this.sortModel = { field: 'createdAt', sort: 'desc' };
  }
  
  resetGrid(): void {
    this.searchText = '';
    this.pageIndex = 0;
    this.filterModel = {};
    this.sortModel = { field: 'created_at', sort: 'desc' };
    this.searchAcrossAllCollections = false;
    this.searchResults = [];
    
    if (this.gridApi) {
      this.gridApi.setFilterModel(null);
      this.gridApi.refreshHeader();
    }
    
    if (this.isUserDetailMode) {
      this.loadUserDetail();
    } else {
      this.loadData();
    }
  }
  
  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    
    if (this.isUserDetailMode) {
      this.loadUserDetail();
    } else {
      this.loadData();
    }
  }
  
  formatHeaderName(field: string): string {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  findUser(detail: any): void {
    const assigneeId = detail.assigneeId;
    const ModelName = detail.ModelName;
    if (assigneeId) {
      console.log('Finding user with assignee ID:', assigneeId);

      const baseUrl = window.location.origin;
      if (ModelName === 'PullRequest') {
        window.open(`${baseUrl}/github/data?assigneeId=${assigneeId}&model=PullRequest`, '_blank');
      } else if (ModelName === 'Issue') {
        window.open(`${baseUrl}/github/data?assigneeId=${assigneeId}&model=Issue`, '_blank');
      }
    }
  }
  
  openRelationalGrid(): void {
    const baseUrl = window.location.origin;
    window.open(`${baseUrl}/github/relational-data`, '_blank');
  }

  onCollectionPageChange(event: PageEvent, index: number, collection: any): void {
    this.collectionPagination[index] = {
      pageIndex: event.pageIndex,
      pageSize: event.pageSize
    };
   
    this.loadCollectionData(collection.collectionName, index, event.pageIndex + 1, event.pageSize);
  }
  
  loadCollectionData(collectionName: string, index: number, page: number, limit: number): void {
    if (!this.selectedUser || !this.selectedUser._id) return;
    
    this.collectionLoading[index] = true;
    
    this.githubService.searchAcrossAllCollections(this.selectedUser._id, this.searchText, {
      page: page,
      limit: limit,
      collectionName: collectionName
    }).subscribe({
      next: (response: any) => {
        if (response.data && response.data.length > 0) {
          const collectionData = response.data.find((c: any) => c.collectionName === collectionName);
          if (collectionData) {
            this.searchResults[index] = collectionData;
            if (this.collectionGridApis[index]) {
              this.collectionGridApis[index].setGridOption('rowData', collectionData.data);
            }
          }
        }
        this.collectionLoading[index] = false;
      },
      error: (error: any) => {
        console.error(`Error loading paginated data for collection ${collectionName}:`, error);
        this.collectionLoading[index] = false;
      }
    });
  }
}
