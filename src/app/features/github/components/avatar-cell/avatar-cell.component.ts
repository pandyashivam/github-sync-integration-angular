import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

@Component({
  selector: 'app-avatar-cell',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="avatar-container">
      <img 
        [src]="avatarUrl" 
        [alt]="altText"
        class="avatar-image"
        onerror="this.onerror=null; this.src='assets/images/default-avatar.png';"
      />
    </div>
  `,
  styles: [`
    .avatar-container {
      display: flex;
      align-items: center;
      height: 100%;
    }
    .avatar-image {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      object-fit: cover;
    }
  `]
})
export class AvatarCellComponent implements ICellRendererAngularComp {
  avatarUrl: string = '';
  altText: string = 'Avatar';

  agInit(params: ICellRendererParams): void {
    this.avatarUrl = params.value || '';
    this.altText = `${params.data?.name || params.data?.login || 'User'} avatar`;
  }

  refresh(params: ICellRendererParams): boolean {
    this.avatarUrl = params.value || '';
    return true;
  }
} 