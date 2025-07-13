export interface AttendanceRecord {
  id: number;
  employeeId: number;
  employeeName: string;
  date: Date;
  isPresent: boolean;
  satisfactionLevel: string;
  submittedAt: Date;
}