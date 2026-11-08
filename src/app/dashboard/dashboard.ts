import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl, FormArray, FormBuilder, FormGroup,
  ReactiveFormsModule, ValidationErrors, Validators
} from '@angular/forms';
import { MealItemRowComponent } from '../meal-item-row/meal-item-row';
import { HealthResult, ResultPanelComponent } from '../result-panel/result-panel';

// Validator: nilai tidak boleh kosong / hanya spasi
function notBlank(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '');
  return value.trim().length === 0 ? { blank: true } : null;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MealItemRowComponent, ResultPanelComponent],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent {
  readonly maxCategories = 5;
  readonly maxItemsPerCategory = 5;

  calcForm: FormGroup;
  result: HealthResult | null = null;
  errorMessage: string = '';
  private calculatedOnce: boolean = false;

  constructor(private fb: FormBuilder, private cdr: ChangeDetectorRef) {
    this.calcForm = this.fb.group({
      startWeight: [75, [Validators.required, Validators.min(20)]],
      currentWeight: [70, [Validators.required, Validators.min(20)]],
      targetWeight: [65, [Validators.required, Validators.min(20)]],
      height: [170, [Validators.required, Validators.min(50)]],
      age: [22, [Validators.required, Validators.min(10)]],
      gender: ['male', Validators.required],
      activityLevel: [1.2, Validators.required],
      mealCategories: this.fb.array([
        this.createCategoryGroup('Sarapan', [this.createItemRow('Roti Gandum', 150)]),
        this.createCategoryGroup('Makan Siang', [this.createItemRow('Nasi Merah & Ayam', 400)]),
        this.createCategoryGroup('Makan Malam', [this.createItemRow('Sup Sayur & Tahu', 250)])
      ])
    });

    // Real-time: setiap perubahan form memicu onFormChanged()
    this.calcForm.valueChanges.subscribe(() => {
      this.onFormChanged();
      this.cdr.markForCheck();
    });
  }

  // ---------- Akses FormArray ----------
  get mealCategories(): FormArray {
    return this.calcForm.get('mealCategories') as FormArray;
  }

  get categoryGroups(): FormGroup[] {
    return this.mealCategories.controls as FormGroup[];
  }

  getItemsArray(categoryIndex: number): FormArray {
    return this.mealCategories.at(categoryIndex).get('items') as FormArray;
  }

  getItemGroups(categoryIndex: number): FormGroup[] {
    return this.getItemsArray(categoryIndex).controls as FormGroup[];
  }

  createItemRow(name: string = '', calories: number | null = null): FormGroup {
    return this.fb.group({
      foodName: [name, [Validators.required, notBlank]],
      calories: [calories, [Validators.required, Validators.min(1)]]
    });
  }

  createCategoryGroup(categoryName: string, items: FormGroup[]): FormGroup {
    return this.fb.group({
      categoryName: [categoryName, [Validators.required, notBlank]],
      items: this.fb.array(items)
    });
  }

  // ---------- Getter UI state ----------
  get hasCalculated(): boolean {
    return this.calculatedOnce;
  }

  get hasError(): boolean {
    return this.errorMessage !== '';
  }

  get canAddCategory(): boolean {
    return this.mealCategories.length < this.maxCategories;
  }

  get canRemoveCategory(): boolean {
    return this.mealCategories.length > 1;
  }

  canAddItem(categoryIndex: number): boolean {
    return this.getItemsArray(categoryIndex).length < this.maxItemsPerCategory;
  }

  get totalMealCalories(): number {
    let total = 0;
    for (const cat of this.categoryGroups) {
      for (const item of (cat.get('items') as FormArray).controls) {
        total += Number(item.get('calories')?.value) || 0;
      }
    }
    return total;
  }

  // ---------- Validasi lintas-baris: duplikasi nama menu ----------
  private normalizeName(value: unknown): string {
    return String(value ?? '').trim().toLowerCase();
  }

  get duplicateFoodNames(): string[] {
    const count = new Map<string, number>();
    for (const cat of this.categoryGroups) {
      for (const item of (cat.get('items') as FormArray).controls) {
        const name = this.normalizeName(item.get('foodName')?.value);
        if (name) count.set(name, (count.get(name) ?? 0) + 1);
      }
    }
    return [...count.entries()].filter(([, n]) => n > 1).map(([name]) => name);
  }

  get hasDuplicateFood(): boolean {
    return this.duplicateFoodNames.length > 0;
  }

  isDuplicateItem(categoryIndex: number, itemIndex: number): boolean {
    const name = this.normalizeName(
      this.getItemsArray(categoryIndex).at(itemIndex).get('foodName')?.value
    );
    return name !== '' && this.duplicateFoodNames.includes(name);
  }

  // ---------- Mutasi array lokal di memori ----------
  addItemRow(categoryIndex: number): void {
    if (!this.canAddItem(categoryIndex)) return;
    this.getItemsArray(categoryIndex).push(this.createItemRow());
  }

  removeItemRow(categoryIndex: number, itemIndex: number): void {
    const items = this.getItemsArray(categoryIndex);
    if (items.length > 1) {
      items.removeAt(itemIndex);
    }
  }

  addCategory(): void {
    if (!this.canAddCategory) return;
    this.mealCategories.push(this.createCategoryGroup('Cemilan / Lainnya', [this.createItemRow()]));
  }

  removeCategory(categoryIndex: number): void {
    if (this.canRemoveCategory) {
      this.mealCategories.removeAt(categoryIndex);
    }
  }

  // ---------- trackBy ----------
  trackByCategory(index: number, group: FormGroup): FormGroup {
    return group;
  }

  trackByItem(index: number, group: FormGroup): FormGroup {
    return group;
  }

  // ---------- Real-time ----------
  onFormChanged(): void {
    if (this.hasCalculated) {
      this.calculateAll();
    }
  }

  // ---------- Kalkulasi ----------
  calculateAll(): void {
    this.errorMessage = '';

    if (this.calcForm.invalid) {
      this.calcForm.markAllAsTouched();
      this.errorMessage = '⚠️ Mohon lengkapi seluruh data formulir dengan benar.';
      this.result = null;
      return;
    }

    if (this.hasDuplicateFood) {
      this.errorMessage = '⚠️ Validasi Gagal: Terdapat nama menu makanan yang duplikat antar baris/kategori!';
      this.result = null;
      return;
    }

    const val = this.calcForm.value;
    const start = Number(val.startWeight);
    const weight = Number(val.currentWeight);
    const target = Number(val.targetWeight);
    const height = Number(val.height);
    const age = Number(val.age);
    const activity = Number(val.activityLevel);
    const isMale = val.gender === 'male';

    // BMI
    const heightInMeters = height / 100;
    const bmi = Number((weight / (heightInMeters * heightInMeters)).toFixed(1));
    let bmiCategory = 'Kelebihan Berat Badan / Obesitas';
    if (bmi < 18.5) bmiCategory = 'Kurus (Underweight)';
    else if (bmi <= 24.9) bmiCategory = 'Normal (Ideal)';

    // Berat badan ideal
    const idealWeight = Number(((height - 100) * (isMale ? 0.9 : 0.85)).toFixed(1));

    // BMR (Mifflin-St Jeor) dan TDEE
    const bmr = Math.round((10 * weight) + (6.25 * height) - (5 * age) + (isMale ? 5 : -161));
    const tdee = Math.round(bmr * activity);

    this.result = {
      bmi,
      bmiCategory,
      idealWeight,
      bmr,
      tdee,
      totalCalories: this.totalMealCalories,
      weightDifference: Number((weight - target).toFixed(1)),
      progressPercentage: this.calculateProgress(start, weight, target)
    };
    this.calculatedOnce = true;
  }

  calculateProgress(start: number, current: number, target: number): number {
    const totalChange = start - target;
    if (totalChange === 0) {
      return current === target ? 100 : 0;
    }
    const percent = ((start - current) / totalChange) * 100;
    return Math.min(Math.max(Math.round(percent), 0), 100);
  }
}