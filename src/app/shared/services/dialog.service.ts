import { Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Observable } from 'rxjs';

import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  isDestructive: boolean;
}

@Component({
  selector: 'app-confirm-dialog-content',
  template: `
    <h2 mat-dialog-title [style.color]="data.isDestructive ? '#f44336' : ''">{{ data.title }}</h2>
    
    <mat-dialog-content>
      <p>{{ data.message }}</p>
    </mat-dialog-content>
    
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close(false)">
        {{ data.cancelText }}
      </button>
      <button 
        mat-raised-button 
        [color]="data.isDestructive ? 'warn' : 'primary'" 
        (click)="dialogRef.close(true)">
        {{ data.confirmText }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2 { margin-top: 0; }
    mat-dialog-content { padding: 16px 0; min-width: 300px; }
    p { margin: 0; line-height: 1.5; }
    mat-dialog-actions { padding-top: 8px; padding-bottom: 8px; }
  `],
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule]
})
class ConfirmDialogContent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogContent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}
}

@Injectable({
  providedIn: 'root'
})
export class DialogService {
  constructor(private dialog: MatDialog) {}

  confirm(
    title: string,
    message: string,
    confirmText: string = 'Confirm',
    cancelText: string = 'Cancel',
    isDestructive: boolean = false
  ): Observable<boolean> {
    const dialogRef = this.dialog.open(ConfirmDialogContent, {
      width: '400px',
      data: {
        title,
        message,
        confirmText,
        cancelText,
        isDestructive
      }
    });

    return dialogRef.afterClosed();
  }
} 