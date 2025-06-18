import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ITooltipAngularComp } from 'ag-grid-angular';
import { ITooltipParams } from 'ag-grid-community';

@Component({
  selector: 'app-custom-tooltip',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="custom-tooltip">
      {{ tooltipText }}
    </div>
  `,
  styles: [`
    .custom-tooltip {
      background-color: rgba(0, 0, 0, 0.85);
      color: white;
      padding: 5px 10px;
      border-radius: 3px;
      font-family: 'Arial', sans-serif;
      font-size: 13px;
      max-width: 500px;
      word-wrap: break-word;
      box-shadow: 0 3px 6px rgba(0, 0, 0, 0.16);
    }
  `]
})
export class CustomTooltipComponent implements ITooltipAngularComp {
  private params!: ITooltipParams;
  public tooltipText: string = '';

  agInit(params: ITooltipParams): void {
    this.params = params;
    this.tooltipText = this.params.value !== undefined ? this.params.value.toString() : '';
  }
} 