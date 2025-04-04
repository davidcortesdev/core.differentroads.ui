import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BudgetDialogService {
  private isShareModeSubject = new BehaviorSubject<boolean>(false);
  isShareMode$ = this.isShareModeSubject.asObservable();

  setShareMode(isShareMode: boolean) {
    this.isShareModeSubject.next(isShareMode);
  }
}
