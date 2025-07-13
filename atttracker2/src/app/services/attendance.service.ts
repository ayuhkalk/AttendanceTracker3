// attendance.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AttendanceRecord {
  id?: number; // Changed from string to number to match backend
  employeeId: string;
  name: string;
  department: string;
  attending: boolean;
  leaving: boolean;
  location: string;
  inFeeling: string;
  outFeeling: string;
  date: string;
  submittedAt?: string;
  notes?: string;
}


export interface Employee {
  id: number;
  employeeId: string;
  name: string;
  department: string;
}

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  private apiUrl = 'http://localhost:5028/api/attendance';

  constructor(private http: HttpClient) {}

  submitAttendance(attendance: AttendanceRecord): Observable<any> {
    return this.http.post(`${this.apiUrl}/submit`, attendance);
  }

  // New method: Update an existing attendance record
  updateAttendance(id: number, attendance: AttendanceRecord): Observable<any> {
  return this.http.put(`${this.apiUrl}/update/${id}`, attendance);
}


  getEmployees(): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.apiUrl}/employees`);
  }

  getAttendanceRecords(): Observable<AttendanceRecord[]> {
    return this.http.get<AttendanceRecord[]>(`${this.apiUrl}/records`);
  }

  // New method: Get an attendance record for a specific employeeid and date
 getAttendanceRecordForDate(employeeId: string, date: string): Observable<AttendanceRecord | null> {
  return this.http.get<AttendanceRecord | null>(`${this.apiUrl}/record-by-date?employeeId=${employeeId}&date=${date}`);
}

  getCurrentDate(): Observable<any> {
    return this.http.get(`${this.apiUrl}/current-date`);
  }
}