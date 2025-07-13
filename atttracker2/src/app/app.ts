import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AttendanceFormComponent } from "./attendance-form/attendance-form.component";

@Component({
  selector: 'app-root',
  standalone:true,
  imports: [AttendanceFormComponent],
  template: '<app-attendance-form></app-attendance-form>',
  styleUrl: './app.css'

})
export class AppComponent {
  protected title = 'attendance-tracker';
}
