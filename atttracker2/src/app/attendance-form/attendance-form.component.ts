// attendance-form.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { AttendanceService, AttendanceRecord } from '/Users/bikings/Desktop/attendance-tracker/src/app/services/attendance.service'; // Adjust path if needed
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-attendance-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HttpClientModule,
    MatCardModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatIconModule,
    MatSnackBarModule
  ],
  providers: [AttendanceService],
  templateUrl: './attendance-form.component.html',
  styleUrls: ['./attendance-form.component.css']
})
export class AttendanceFormComponent implements OnInit {
  attendanceForm: FormGroup;
  isSubmitting = false;
  showSuccess = false;
  currentDate = '';
  existingRecord: AttendanceRecord | null = null; // Stores an existing record for the day

  attendanceRecords: AttendanceRecord[] = []; // List to display all records

  showInFeeling = true; // Controls visibility of 'In Feeling' field
  showOutFeeling = true; // Controls visibility of 'Out Feeling' field

  constructor(
    private fb: FormBuilder,
    private attendanceService: AttendanceService,
    private snackBar: MatSnackBar
  ) {
    this.attendanceForm = this.fb.group({
      employeeId: ['', Validators.required],
      name: ['', Validators.required],
      department: ['', Validators.required],
      attending: [false], // Checkbox for check-in
      leaving: [false],   // Checkbox for check-out
      location: ['', Validators.required],
      inFeeling: [''],
      outFeeling: [''],
      notes: [''],
      date: ['']
    });
  }

  ngOnInit(): void {
    this.loadCurrentDate();
    this.loadAttendanceRecords();
    this.setupCheckboxLogic();
    this.setupEmployeeIdFieldListener(); // Call the listener setup
  }

  private setupEmployeeIdFieldListener(): void {
    // FIX: Get the form control and explicitly check if it exists
    const employeeIdControl = this.attendanceForm.get('employeeId');

    if (employeeIdControl) { // Only proceed if the 'name' control is found
      employeeIdControl.valueChanges.pipe(
        debounceTime(500), // Wait for 500ms after last keystroke
        distinctUntilChanged() // Only emit if value is different from previous value
      ).subscribe(employeeId => {
        if (employeeId && this.currentDate) {
          this.loadExistingRecord(employeeId, this.currentDate);
        } else {
          // If name is cleared or not provided, reset form to initial state
          this.existingRecord = null;
          this.resetFormForNewEntry();
        }
      });
    } else {
      console.error("Error: 'employeeId' form control not found in attendanceForm.");
      // Depending on your application, you might want to disable name-dependent features here
    }
  }

  private setupCheckboxLogic(): void {
    const attendingCtrl = this.attendanceForm.get('attending');
    const leavingCtrl = this.attendanceForm.get('leaving');
    const inFeelingCtrl = this.attendanceForm.get('inFeeling');
    const outFeelingCtrl = this.attendanceForm.get('outFeeling');

    // Logic for 'Check In' checkbox
    attendingCtrl?.valueChanges.subscribe((checked: boolean) => {
      if (checked) {
        leavingCtrl?.disable({ emitEvent: false }); // Disable check-out if checking in
        this.showInFeeling = true;
        this.showOutFeeling = false; // Hide out feeling when explicitly checking in
        inFeelingCtrl?.setValidators(Validators.required);
        outFeelingCtrl?.clearValidators();
        outFeelingCtrl?.patchValue(''); // Clear outFeeling if check-in is selected
      } else {
        // If unchecking check-in (and not already checked in via existing record)
        if (!this.existingRecord || !this.existingRecord.attending) {
          leavingCtrl?.enable({ emitEvent: false });
        }
        // Restore visibility if no other checkbox is selected
        if (!leavingCtrl?.value) {
            this.showInFeeling = true;
            this.showOutFeeling = true;
        }
        inFeelingCtrl?.clearValidators();
      }
      inFeelingCtrl?.updateValueAndValidity();
      outFeelingCtrl?.updateValueAndValidity();
    });

    // Logic for 'Check Out' checkbox
    leavingCtrl?.valueChanges.subscribe((checked: boolean) => {
      if (checked) {
        attendingCtrl?.disable({ emitEvent: false }); // Disable check-in if checking out
        this.showOutFeeling = true;
        this.showInFeeling = false; // Hide in feeling when explicitly checking out
        outFeelingCtrl?.setValidators(Validators.required);
        inFeelingCtrl?.clearValidators();
        inFeelingCtrl?.patchValue(''); // Clear inFeeling if check-out is selected
      } else {
        // If unchecking check-out (and not already checked out via existing record)
        if (!this.existingRecord || !this.existingRecord.leaving) {
          attendingCtrl?.enable({ emitEvent: false });
        }
        // Restore visibility if no other checkbox is selected
        if (!attendingCtrl?.value) {
            this.showInFeeling = true;
            this.showOutFeeling = true;
        }
        outFeelingCtrl?.clearValidators();
      }
      inFeelingCtrl?.updateValueAndValidity();
      outFeelingCtrl?.updateValueAndValidity();
    });
  }

  loadCurrentDate(): void {
    this.attendanceService.getCurrentDate().subscribe({
      next: (response: any) => {
        this.currentDate = response.date || response;
        this.attendanceForm.patchValue({ date: this.currentDate });
        // After loading date, try to load existing record if name is already entered
        const employeeId = this.attendanceForm.get('employeeId')?.value;
        if (employeeId) {
          this.loadExistingRecord(employeeId, this.currentDate);
        }
      },
      error: () => {
        // Fallback to client-side date if backend call fails
        this.currentDate = new Date().toISOString().split('T')[0];
        this.attendanceForm.patchValue({ date: this.currentDate });
        const employeeId = this.attendanceForm.get('employeeId')?.value;
        if (employeeId) {
          this.loadExistingRecord(employeeId, this.currentDate);
        }
      }
    });
  }

  // Fetches an existing attendance record for the current user and date
  loadExistingRecord(employeeId: string, date: string): void {
    this.attendanceService.getAttendanceRecordForDate(employeeId, date).subscribe({
      next: (record) => {
        this.existingRecord = record;
        if (this.existingRecord) {
          this.snackBar.open('Existing record found for today. You can update your check-out.', 'Close', {
            duration: 5000,
            panelClass: ['warning-snackbar']
          });
          this.patchFormWithExistingRecord(this.existingRecord);
        } else {
          this.resetFormForNewEntry();
        }
      },
      error: (err) => {
        console.error('Failed to load existing attendance record:', err);
        this.existingRecord = null;
        this.resetFormForNewEntry();
      }
    });
  }

  // Populates the form with data from an existing record and sets control states
  private patchFormWithExistingRecord(record: AttendanceRecord): void {
    this.attendanceForm.patchValue({
      employeeId: record.employeeId,
      name: record.name,
      department: record.department,
      location: record.location,
      inFeeling: record.inFeeling,
      outFeeling: record.outFeeling, // Patch outFeeling too if it exists
      notes: record.notes,
      date: record.date
    });

    // --- Control Checkboxes and Feeling Fields based on record status ---
    const attendingCtrl = this.attendanceForm.get('attending');
    const leavingCtrl = this.attendanceForm.get('leaving');
    const inFeelingCtrl = this.attendanceForm.get('inFeeling');
    const outFeelingCtrl = this.attendanceForm.get('outFeeling');

    if (record.attending) {
      attendingCtrl?.patchValue(true, { emitEvent: false });
      attendingCtrl?.disable({ emitEvent: false }); // Disable check-in
      inFeelingCtrl?.disable(); // Disable inFeeling
      this.showInFeeling = true; // Keep inFeeling visible for reference

      if (!record.leaving) { // If checked in but not checked out
        leavingCtrl?.enable({ emitEvent: false }); // Enable check-out
        outFeelingCtrl?.enable(); // Enable outFeeling
        this.showOutFeeling = true; // Show outFeeling
        // Removed: leavingCtrl?.setValidators(null);
        // Removed: outFeelingCtrl?.setValidators(null);
      } else { // If already checked out
        leavingCtrl?.patchValue(true, { emitEvent: false });
        leavingCtrl?.disable({ emitEvent: false }); // Disable check-out
        outFeelingCtrl?.disable(); // Disable outFeeling
        this.showOutFeeling = true; // Keep outFeeling visible for reference
      }
    } else { // If no check-in yet for the day, reset for new check-in
        this.resetFormForNewEntry();
        // Ensure name and department are retained if they were already typed
        this.attendanceForm.patchValue({
            employeeId: record.employeeId,
            name: record.name,
            department: record.department
        }, { emitEvent: false });
    }

    // After patching and setting states, re-validate
    this.attendanceForm.updateValueAndValidity();
    inFeelingCtrl?.updateValueAndValidity();
    outFeelingCtrl?.updateValueAndValidity();
  }

  // Resets the form for a new attendance entry or initial state
  private resetFormForNewEntry(): void {
    const currentEmployeeId = this.attendanceForm.get('employeeId')?.value;
    const currentName = this.attendanceForm.get('name')?.value;
    const currentDepartment = this.attendanceForm.get('department')?.value;

    this.attendanceForm.reset({
      date: this.currentDate,
      attending: false,
      leaving: false,
      inFeeling: '',
      outFeeling: '',
      notes: ''
    });

    // Retain name and department if they were already set by the user
    this.attendanceForm.patchValue({
      employeeId: currentEmployeeId,
      name: currentName,
      department: currentDepartment
    }, { emitEvent: false });

    // Re-enable all controls and show both feeling fields
    this.attendanceForm.get('attending')?.enable({ emitEvent: false });
    this.attendanceForm.get('leaving')?.enable({ emitEvent: false });
    this.attendanceForm.get('location')?.enable(); // Ensure location is enabled
    this.attendanceForm.get('department')?.enable(); // Ensure department is enabled

    this.showInFeeling = true;
    this.showOutFeeling = true;
    this.attendanceForm.get('inFeeling')?.enable();
    this.attendanceForm.get('outFeeling')?.enable();

    // Clear any temporary validators set by checkbox logic
    this.attendanceForm.get('inFeeling')?.clearValidators();
    this.attendanceForm.get('outFeeling')?.clearValidators();
    this.attendanceForm.get('inFeeling')?.updateValueAndValidity();
    this.attendanceForm.get('outFeeling')?.updateValueAndValidity();
  }

  loadAttendanceRecords(): void {
    this.attendanceService.getAttendanceRecords().subscribe({
      next: (records) => (this.attendanceRecords = records),
      error: (err) => console.error('Failed to load attendance records:', err)
    });
  }
  onSubmit(): void {
  // For checkout operations, we need to handle validation differently
  const isCheckingOut = this.existingRecord && this.existingRecord.attending && this.attendanceForm.get('leaving')?.value;
  
  if (isCheckingOut) {
    // For checkout, only validate the essential fields that should be filled
    const requiredFields = ['employeeId', 'name', 'department', 'location', 'outFeeling'];
    let hasErrors = false;
    
    requiredFields.forEach(fieldName => {
      const control = this.attendanceForm.get(fieldName);
      if (!control?.value && !control?.disabled) {
        hasErrors = true;
        control?.markAsTouched();
      }
    });
    
    // Special validation for outFeeling when checking out
    const outFeelingControl = this.attendanceForm.get('outFeeling');
    if (!outFeelingControl?.value) {
      hasErrors = true;
      outFeelingControl?.markAsTouched();
    }
    
    if (hasErrors) {
      this.snackBar.open('Please fill in all required fields for checkout.', 'Close', {
        duration: 3000,
        panelClass: ['warning-snackbar']
      });
      return;
    }
  } else {
    // For regular check-in, validate normally but only enable what's needed
    const requiredFields = ['employeeId', 'name', 'department', 'location'];
    let hasErrors = false;
    
    requiredFields.forEach(fieldName => {
      const control = this.attendanceForm.get(fieldName);
      if (!control?.value) {
        hasErrors = true;
        control?.markAsTouched();
      }
    });
    
    // Check if either attending or leaving is selected
    const attending = this.attendanceForm.get('attending')?.value;
    const leaving = this.attendanceForm.get('leaving')?.value;
    
    if (!attending && !leaving) {
      hasErrors = true;
      this.snackBar.open('Please select either Check In or Check Out.', 'Close', {
        duration: 3000,
        panelClass: ['warning-snackbar']
      });
      return;
    }
    
    // Validate inFeeling if checking in
    if (attending && !this.attendanceForm.get('inFeeling')?.value) {
      hasErrors = true;
      this.attendanceForm.get('inFeeling')?.markAsTouched();
    }
    
    if (hasErrors) {
      this.snackBar.open('Please fill in all required fields.', 'Close', {
        duration: 3000,
        panelClass: ['warning-snackbar']
      });
      return;
    }
  }

  const { employeeId, name, department, attending, leaving, location, inFeeling, outFeeling, notes, date } = this.attendanceForm.value;

  const attendanceData: AttendanceRecord = {
    employeeId,
    name,
    department,
    attending,
    leaving,
    location,
    inFeeling: inFeeling || '',
    outFeeling: outFeeling || '',
    notes: notes || '',
    date: date || this.currentDate
  };

  this.isSubmitting = true;

  if (this.existingRecord) {
    // Logic for updating an existing record (primarily for check-out)
    // If user tries to check-in again when already checked in
    if (attending && this.existingRecord.attending && !leaving) {
      this.snackBar.open('You have already checked in for today. To check out, please select "Check Out".', 'Close', {
        duration: 5000,
        panelClass: ['warning-snackbar']
      });
      this.isSubmitting = false;
      this.patchFormWithExistingRecord(this.existingRecord);
      return;
    }

    // If user is checking out an existing check-in
    if (this.existingRecord.attending && leaving && !this.existingRecord.leaving) {
      attendanceData.attending = this.existingRecord.attending;
      attendanceData.inFeeling = this.existingRecord.inFeeling;
      attendanceData.location = this.existingRecord.location;
      attendanceData.department = this.existingRecord.department;
      attendanceData.name = this.existingRecord.name;

      // Use the existing record's ID for the update
      const recordId = this.existingRecord.id;

      if (!recordId) {
        this.snackBar.open('Error: Unable to identify the record to update.', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
        this.isSubmitting = false;
        return;
      }

      this.attendanceService.updateAttendance(recordId, attendanceData).subscribe({
        next: () => {
          this.handleSubmissionSuccess('Check-out recorded successfully!');
        },
        error: (error) => {
          this.handleSubmissionError(error);
        }
      });
    } else {
      this.snackBar.open('Invalid operation for existing record.', 'Close', {
        duration: 3000,
        panelClass: ['warning-snackbar']
      });
      this.isSubmitting = false;
      this.patchFormWithExistingRecord(this.existingRecord);
    }
  } else {
    // Logic for submitting a new record (check-in)
    if (leaving) {
      this.snackBar.open('Please check in first before checking out.', 'Close', {
        duration: 3000,
        panelClass: ['warning-snackbar']
      });
      this.isSubmitting = false;
      return;
    }

    this.attendanceService.submitAttendance(attendanceData).subscribe({
      next: () => {
        this.handleSubmissionSuccess('Attendance submitted successfully!');
      },
      error: (error) => {
        this.handleSubmissionError(error);
      }
    });
  }
}

  private handleSubmissionSuccess(message: string): void {
    this.isSubmitting = false;
    this.showSuccess = true;
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });

    this.loadAttendanceRecords(); // Refresh the records table

    // Delay form reset and success message clear
    setTimeout(() => {
      this.showSuccess = false;
      // Reset form, but retain currentName and currentDepartment if they were entered
      const currentEmployeeId = this.attendanceForm.get('employeeId')?.value;
      const currentName = this.attendanceForm.get('name')?.value;
      const currentDepartment = this.attendanceForm.get('department')?.value;

      this.attendanceForm.reset();
      this.attendanceForm.patchValue({
        employeeId: currentEmployeeId,
        name: currentName,
        department: currentDepartment,
        date: this.currentDate // Ensure date is re-patched
      }, { emitEvent: false }); // Prevent re-triggering valueChanges

      this.loadCurrentDate(); // This will re-trigger loadExistingRecord if name is present
      this.existingRecord = null; // Clear existing record after successful submission

      // Ensure fields are correctly enabled/disabled for the next entry
      this.resetFormForNewEntry();
    }, 3000);
  }

  private handleSubmissionError(error: any): void {
    this.isSubmitting = false;
    console.error('Error submitting attendance:', error);
    let errorMessage = 'Error submitting attendance. Please try again.';
    if (error.status === 409) { // HTTP 409 Conflict for duplicate check-in
      errorMessage = 'You have already checked in for today. You can only check out.';
    }
    this.snackBar.open(errorMessage, 'Close', {
      duration: 3000,
      panelClass: ['error-snackbar']
    });
    // Re-apply disabled states after an error
    if (this.existingRecord) {
        this.patchFormWithExistingRecord(this.existingRecord);
    } else {
        this.resetFormForNewEntry(); // If no existing record, ensure new entry state is clean
    }
  }
}

