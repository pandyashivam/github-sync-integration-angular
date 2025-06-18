import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { AgGridAngular, AgGridModule } from 'ag-grid-angular';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ColDef, ICellRendererParams, ValueFormatterParams } from 'ag-grid-community';
import { MatCardModule } from '@angular/material/card';
import { CustomTooltipComponent } from '../custom-tooltip/custom-tooltip.component';
import { AvatarCellComponent } from '../avatar-cell/avatar-cell.component';

@Component({
  selector: 'app-relational-detail',
  standalone: true,
  imports: [
    CommonModule,
    AgGridModule,
    MatCardModule
  ],
  templateUrl: './relational-detail.component.html',
  styleUrl: './relational-detail.component.scss'
})
export class RelationalDetailComponent implements ICellRendererAngularComp {
  params!: ICellRendererParams;
  rowData: any[] = [];
  columnDefs: ColDef[] = [];
  defaultColDef: ColDef = {
    flex: 1,
    sortable: true,
    resizable: true,
    maxWidth: 600,
    filter:false,
    tooltipValueGetter: (params) => {
      return params.value ? params.value.toString() : '';
    },
    tooltipComponent: 'CustomTooltip'
  };
  detailTitle: string = 'Details';
  
  components = {
    CustomTooltip: CustomTooltipComponent
  };

  agInit(params: ICellRendererParams): void {
    this.params = params;
    this.setupDetailData();
  }

  refresh(params: ICellRendererParams): boolean {
    this.params = params;
    this.setupDetailData();
    return true;
  }

  private setupDetailData(): void {
    const filterType = this.params.context?.filterType;
    
    if (filterType === 'Pull Requests') {
      this.detailTitle = 'Commit Details';
      const commitDetails = this.params.data.commitDetails;
      if (commitDetails && Array.isArray(commitDetails)) {
        this.rowData = commitDetails;
        // Use the provided commit fields from context if available
        if (this.params.context?.commitFields) {
          this.columnDefs = this.getColumnDefs(this.params.context.commitFields);
        } else {
          this.setupColumnDefs();
        }
      } else {
        this.rowData = [];
      }
    } else if (filterType === 'Issues') {
      this.detailTitle = 'Issue History';
      const history = this.params.data.history;
      if (history && Array.isArray(history)) {
        this.rowData = history;
        // Use the provided issue history fields from context if available
        if (this.params.context?.issueHistoryFields) {
          this.columnDefs = this.getColumnDefs(this.params.context.issueHistoryFields);
        } else {
          this.setupColumnDefs();
        }
      } else {
        this.rowData = [];
      }
    } else {
      this.rowData = [];
    }
  }

  private setupColumnDefs(): void {
    if (this.rowData.length > 0) {
      // Extract field names from the first item
      const firstItem = this.rowData[0];
      this.columnDefs = Object.keys(firstItem)
        .filter(key => {
          // Filter out complex objects
          const value = firstItem[key];
          return !(value && typeof value === 'object' && !(value instanceof Date));
        })
        .map(key => {
          const colDef: ColDef = {
            field: key,
            headerName: this.formatHeaderName(key)
          };

          if (key.toLowerCase().includes('date')) {
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
          }

          return colDef;
        });
    } else {
      this.columnDefs = [];
    }
  }

  searchText: string = '';
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
             maxWidth: 600,
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
             colDef.filter = false;
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
             colDef.filter = false;
             colDef.filterParams = {
               buttons: ['apply', 'reset'],
               closeOnApply: true
             };
           } else if (field.type === 'date' || field.field.includes('date') || field.field.includes('Date')) {
             colDef.filter = false;
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
             colDef.filter = false;
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

  private formatHeaderName(field: string): string {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
}
