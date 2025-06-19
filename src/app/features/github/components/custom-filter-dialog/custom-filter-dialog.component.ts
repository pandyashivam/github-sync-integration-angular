import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { GithubService } from '../../service/github.service';
import { Observable } from 'rxjs';

interface FilterCondition {
  field: string;
  operation: string;
  value: any;
  type: string;
  secondValue?: any;
}

@Component({
  selector: 'app-custom-filter-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatChipsModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './custom-filter-dialog.component.html',
  styleUrls: ['./custom-filter-dialog.component.scss']
})
export class CustomFilterDialogComponent implements OnInit {
  filterForm: FormGroup;
  fields: any[] = [];
  stringOperations = [
    { value: 'equals', label: 'Equals' },
    { value: 'notEqual', label: 'Not Equal' },
    { value: 'contains', label: 'Contains' },
    { value: 'notContains', label: 'Not Contains' },
    { value: 'startsWith', label: 'Starts With' },
    { value: 'endsWith', label: 'Ends With' },
    { value: 'empty', label: 'Is Empty' }
  ];
  numberOperations = [
    { value: 'equals', label: 'Equals' },
    { value: 'notEqual', label: 'Not Equal' },
    { value: 'greaterThan', label: 'Greater Than' },
    { value: 'lessThan', label: 'Less Than' },
    { value: 'greaterThanOrEqual', label: 'Greater Than or Equal' },
    { value: 'lessThanOrEqual', label: 'Less Than or Equal' }
  ];
  dateOperations = [
    { value: 'equals', label: 'Equals' },
    { value: 'notEqual', label: 'Not Equal' },
    { value: 'greaterThan', label: 'After' },
    { value: 'lessThan', label: 'Before' },
    { value: 'between', label: 'Between' }
  ];
  userOperations = [
    { value: 'in', label: 'Include' },
    { value: 'notIn', label: 'Not Include' }
  ];
  stateOperations = [
    { value: 'equals', label: 'Equals' },
    { value: 'notEqual', label: 'Not Equal' }
  ];
  
  availableStates: string[] = ['all', 'open', 'closed'];
  userOptions: {[key: string]: any[]} = {};
  loadingFields: {[key: string]: boolean} = {};
  excludeFields: string[] = [
    'user',
    'user.id',
    'user.avatar_url',
    'commits',
    'repositoryId',
    'type',
    'commitDetails',
    'history',
  ];
  
  constructor(
    private dialogRef: MatDialogRef<CustomFilterDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private fb: FormBuilder,
    private githubService: GithubService
  ) {
    this.filterForm = this.fb.group({
      conditions: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.fields = this.data.fields.filter((field: any) => !this.excludeFields.includes(field.field)) || [];
    this.availableStates = this.data.availableStates || ['all', 'open', 'closed'];
    
    if (this.data.existingFilters && this.data.existingFilters.length > 0) {
      this.data.existingFilters.forEach((filter: FilterCondition) => {
        this.addCondition(filter);
      });
    } else {
      this.addCondition();
    }
  }

  get conditions(): FormArray {
    return this.filterForm.get('conditions') as FormArray;
  }

  addCondition(condition?: FilterCondition): void {
    const conditionGroup = this.fb.group({
      field: [condition?.field || ''],
      operation: [condition?.operation || ''],
      value: [condition?.value || ''],
      type: [condition?.type || ''],
      secondValue: [condition?.secondValue || '']
    });

    if (condition?.field) {
      const fieldInfo = this.fields.find(f => f.field === condition.field);
      if (fieldInfo) {
        conditionGroup.patchValue({ type: fieldInfo.type });
        
        if (this.isUserField(condition.field)) {
          this.loadUserOptions(condition.field);
        }
      }
    }

    this.conditions.push(conditionGroup);
  }

  removeCondition(index: number): void {
    this.conditions.removeAt(index);
  }

  onFieldChange(index: number): void {
    const condition = this.conditions.at(index);
    const fieldName = condition.get('field')?.value;
    const fieldInfo = this.fields.find(f => f.field === fieldName);
    
    if (fieldInfo) {
      condition.patchValue({ 
        type: fieldInfo.type,
        operation: '',
        value: ''
      });
      
      if (this.isUserField(fieldName)) {
        this.loadUserOptions(fieldName);
      }
    }
  }

  isUserField(fieldName: string): boolean {
    return fieldName === 'user.login' || 
           fieldName === 'assignee.login' || 
           fieldName === 'closed_by.login' ||
           fieldName?.includes('login');
  }

  isStateField(fieldName: string): boolean {
    return fieldName === 'state';
  }

  isDateField(fieldName: string): boolean {
    const fieldInfo = this.fields.find(f => f.field === fieldName);
    return fieldInfo?.type === 'date' || 
           fieldName?.includes('_at') || 
           fieldName?.includes('date');
  }

  getOperationsForField(fieldName: string): any[] {
    if (!fieldName) return [];
    
    if (this.isUserField(fieldName)) {
      return this.userOperations;
    } else if (this.isStateField(fieldName)) {
      return this.stateOperations;
    } else if (this.isDateField(fieldName)) {
      return this.dateOperations;
    } else {
      const fieldInfo = this.fields.find(f => f.field === fieldName);
      if (fieldInfo?.type === 'number') {
        return this.numberOperations;
      } else {
        return this.stringOperations;
      }
    }
  }

  loadUserOptions(fieldName: string): void {
    if (this.userOptions[fieldName]) {
      return;
    }
    
    this.loadingFields[fieldName] = true;
    
    if (!fieldName) {
      console.error('Field name is empty');
      this.loadingFields[fieldName] = false;
      return;
    }
    
    console.log(`Loading user options for field: ${fieldName}`);
    
    const fieldPath = fieldName;
    
    this.githubService.getDistinctFieldValues(
      this.data.userId,
      this.data.repoId,
      this.data.filterType,
      fieldPath
    ).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.userOptions[fieldName] = response.data || [];
          console.log(`Loaded ${this.userOptions[fieldName].length} users for ${fieldName}`);
        } else {
          console.error('Error loading user options:', response);
          this.userOptions[fieldName] = [];
        }
        this.loadingFields[fieldName] = false;
      },
      error: (error: any) => {
        console.error('Error loading user options:', error);
        this.userOptions[fieldName] = [];
        this.loadingFields[fieldName] = false;
      }
    });
  }

  getUserOptions(fieldName: string | undefined | null): any[] {
    if (!fieldName) return [];
    return this.userOptions[fieldName] || [];
  }

  isFieldLoading(fieldName: string | undefined | null): boolean {
    if (!fieldName) return false;
    return this.loadingFields[fieldName] || false;
  }

  onOperationChange(index: number): void {
    const condition = this.conditions.at(index);
    const operation = condition.get('operation')?.value;
    
    if (operation === 'empty') {
      condition.patchValue({ value: 'true' });
    } else {
      condition.patchValue({ value: '' });
    }
  }

  applyFilters(): void {
    const filters = this.conditions.controls.map(control => {
      const filter: FilterCondition = {
        field: control.get('field')?.value,
        operation: control.get('operation')?.value,
        value: control.get('value')?.value,
        type: control.get('type')?.value
      };
      
      if (this.isDateField(filter.field) && filter.operation === 'between') {
        filter.secondValue = control.get('secondValue')?.value;
      }
      
      return filter;
    }).filter(filter => filter.field && filter.operation);
    
    this.dialogRef.close(filters);
  }

  cancel(): void {
    this.dialogRef.close();
  }
} 