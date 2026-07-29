import { Injectable, inject } from '@angular/core';
import { ConfirmationService as PrimeConfirmationService } from 'primeng/api';

export interface ConfirmOptions {
    message: string;
    header?: string;
    icon?: string;
    acceptLabel?: string;
    rejectLabel?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ConfirmDialogService {
  private confirmationService = inject(PrimeConfirmationService);

  confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.confirmationService.confirm({
        message: options.message,
        header: options.header ?? 'Confirm',
        icon: options.icon ?? 'pi pi-exclamation-triangle',
        acceptLabel: options.acceptLabel ?? 'Yes',
        rejectLabel: options.rejectLabel ?? 'No',
        accept: () => resolve(true),
        reject: () => resolve(false)
      });
    });
  }
}
