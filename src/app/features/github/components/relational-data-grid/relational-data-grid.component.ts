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
  RowGroupingDisplayType,
  DateFilterModel,
  TextFilterModel,
  CellClickedEvent
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
import { RelationalDetailComponent } from '../relational-detail/relational-detail.component';

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
  
  detailCellRenderer = RelationalDetailComponent;
  components  = {
    relationalDetailCellRenderer: RelationalDetailComponent
  };
  popupParent = document.body;
  relationshipData: RepoRelationship[] = [];
  currentRepo: RepoRelationship | null = null;
  
  columnDefs: ColDef[] = [];
  rowData: any[] = [];
  defaultColDef: ColDef = {
    resizable: true,
    flex: 1,
   
  };
  
  gridApi!: GridApi;
  gridHeight: string = 'calc(100vh - 250px)';
  
  // Filter options
  filterTypes: string[] = ['Pull Requests', 'Issues'];
  selectedFilterType: string = 'Pull Requests';
  
  searchText: string = '';
  searchDebounce: Subject<string> = new Subject<string>();
  loading: boolean = false;
  totalRows: number = 0;
  pageSize: number = 25;
  pageIndex: number = 0;
  pageSizeOptions: number[] = [10, 25, 50, 100];
  
  filterModel: any = {};
  sortModel: any = { field: 'created_at', sort: 'desc' };
  
  commitFields : any[] = [];
  issueHistoryFields : any[] = [];
  
  // Context object for the grid
  gridContext: any = {};
  
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
        
        if (this.repositories.length > 0) {
          this.selectedRepository = null;
        } else {
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
    this.selectedFilterType = event.value;
    // Update the context when filter type changes
    this.updateGridContext();
    this.loadRelationalData();
  }
  
  totalPRs: number = 0;
  totalIssues: number = 0;
  relationshipFields: any;
  loadRelationalData(): void {
    if (!this.selectedUser) return;
    
    this.loading = true;

    const filterParams: any = this.getfilterParams();
    
    const params: any = {
      page: this.pageIndex + 1,
      limit: this.pageSize,
      search: this.searchText || undefined,
      sort: this.sortModel.field || 'created_at',
      sortOrder: this.sortModel.sort || 'desc',
      repoId: this.selectedRepository ? this.selectedRepository._id : undefined,
      filterType: this.selectedFilterType,
      ...filterParams
    };
    
    const userId = this.selectedUser._id || '';
    
    this.githubService.getRelationalData(userId, params).subscribe({
      next: (response: RelationalDataResponse) => {

        this.relationshipData = response.data || [];
        this.relationshipFields = response.fields;
        if (this.relationshipData.length > 0) {
          this.currentRepo = this.relationshipData[0];
          this.setupGridData();
          
          this.totalRows = response.totalCount || 0;
          this.totalPRs = response.totalPRs || 0;
          this.totalIssues = response.totalIssues || 0;
         
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
  
  setupGridData(): void {
    if (!this.currentRepo) {
      this.rowData = [];
      this.columnDefs = [];
      return;
    }

    this.commitFields = this.relationshipFields.commitFields;
    this.issueHistoryFields = this.relationshipFields.issueHistoryFields;
    
    // Update the context with the current filter type and fields
    this.updateGridContext();
  
    let columnDefs : any[] = [];
    if (this.selectedFilterType === 'Pull Requests') {
        this.rowData = this.currentRepo.pullRequests;
        columnDefs = this.getColumnDefs(this.relationshipFields.pullRequestFields);
    } else if (this.selectedFilterType === 'Issues') {
        this.rowData = this.currentRepo.issues;
        columnDefs = this.getColumnDefs(this.relationshipFields.issueFields);
    }

    if(columnDefs.length > 0){
      columnDefs[0].cellRenderer = 'agGroupCellRenderer';
      columnDefs[0].cellClass = 'lock-pinned';
      this.columnDefs = columnDefs;
    }
     
    this.gridApi?.setGridOption('isRowMaster', (dataItem: any) => {
      if (this.selectedFilterType === 'Pull Requests') {
        return dataItem && dataItem.commitDetails && dataItem.commitDetails.length > 0;
      } else if (this.selectedFilterType === 'Issues') {
        return dataItem && dataItem.history && dataItem.history.length > 0;
      }
      return false;
    });
  }

  private updateGridContext(): void {
    this.gridContext = {
      filterType: this.selectedFilterType,
      commitFields: this.commitFields,
      issueHistoryFields: this.issueHistoryFields
    };
    
    if (this.gridApi) {
      this.gridApi.setGridOption('context', this.gridContext);
    }
  }
  
  getColumnDefs(fields: any[]) {
    return fields.filter(field => {
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
             cellStyle: (params: any) => {
               if (this.searchText && params.value && typeof params.value === 'string') {
                 const searchLower = this.searchText.toLowerCase();
                 const valueLower = params.value.toString().toLowerCase();
                 
                 if (valueLower.includes(searchLower)) {
                   return { backgroundColor: '#FFFFCC' }; 
                 }
               }
               return null;
             }
           };
           
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
    
    params.api.setGridOption('theme', 'legacy');
    
    params.api.setGridOption('context', this.gridContext);
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

  onCellClicked(event: CellClickedEvent): void {
    console.log('Cell clicked:', event);
    setInterval(() => {
      this.gridApi.refreshCells();
      this.gridApi.refreshClientSideRowModel();
    }, 200);
  }
  
}
