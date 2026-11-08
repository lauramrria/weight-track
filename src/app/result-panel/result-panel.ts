import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface HealthResult {
  bmi: number;
  bmiCategory: string;
  idealWeight: number;
  bmr: number;
  tdee: number;
  totalCalories: number;
  weightDifference: number;
  progressPercentage: number;
}

@Component({
  selector: 'app-result-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './result-panel.html',
  styleUrls: ['./result-panel.css']
})
export class ResultPanelComponent {
  @Input({ required: true }) result!: HealthResult;

  get calorieBalance(): number {
    return this.result.totalCalories - this.result.tdee;
  }

  get calorieStatus(): string {
    if (this.calorieBalance > 0) return 'Surplus';
    if (this.calorieBalance < 0) return 'Defisit';
    return 'Seimbang';
  }

  get calorieStatusClass(): string {
    if (this.calorieBalance > 0) return 'status-surplus';
    if (this.calorieBalance < 0) return 'status-defisit';
    return 'status-seimbang';
  }
}