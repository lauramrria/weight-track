import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-meal-item-row',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './meal-item-row.html',
  styleUrls: ['./meal-item-row.css']
})
export class MealItemRowComponent {
  @Input({ required: true }) itemGroup!: FormGroup;
  @Input() itemIndex: number = 0;
  @Input() isFirst: boolean = false;
  @Input() isLast: boolean = false;
  @Input() isDuplicate: boolean = false;

  @Output() removeRequested = new EventEmitter<number>();

  // Baris satu-satunya dalam kategori tidak boleh dihapus
  get isRemoveLocked(): boolean {
    return this.isFirst && this.isLast;
  }

  get isFoodNameInvalid(): boolean {
    const ctrl = this.itemGroup.get('foodName');
    return !!ctrl && ctrl.invalid && (ctrl.touched || ctrl.dirty);
  }

  get isCaloriesInvalid(): boolean {
    const ctrl = this.itemGroup.get('calories');
    return !!ctrl && ctrl.invalid && (ctrl.touched || ctrl.dirty);
  }

  onRemoveClick(): void {
    if (!this.isRemoveLocked) {
      this.removeRequested.emit(this.itemIndex);
    }
  }
}