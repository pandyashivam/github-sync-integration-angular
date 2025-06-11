import { Injectable, NgZone } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
    providedIn: 'root'
})

export class SnackBarService {

    constructor(private snackBar: MatSnackBar,private zone: NgZone,) { }

    openSnackBar(message: string, duration: number = 2000, className: string = 'default') {
        this.zone.run(() => {
            this.snackBar.open(message, '', {
                duration,
                verticalPosition: 'top',
                horizontalPosition: 'end',
                panelClass: [className],
            });
          });
        
    }

    showSuccess(message: string) {
        this.openSnackBar(message, 5000, 'success');
    }

    showError(message: string) {
        this.openSnackBar(message, 5000, 'error');
    }

    showWarning(message: string) {
        this.openSnackBar(message, 5000, 'warning');
    }
    
    showInfo(message: string) {
        this.openSnackBar(message, 5000, 'info');
    }
}