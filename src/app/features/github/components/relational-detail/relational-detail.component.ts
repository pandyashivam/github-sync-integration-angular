import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { AgGridAngular, AgGridModule } from 'ag-grid-angular';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { MatCardModule } from '@angular/material/card';

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
    resizable: true
  };
  detailTitle: string = 'Details';

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

  private getColumnDefs(fields: any[]): ColDef[] {
    return fields
      .filter(field => {
        // Skip fields that are complex objects
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
          sortable: true
        };

        if (field.type === 'date' || field.field.toLowerCase().includes('date')) {
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
  }

  private formatHeaderName(field: string): string {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
}
