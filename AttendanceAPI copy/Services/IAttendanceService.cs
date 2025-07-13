using AttendanceAPI.Models;

namespace AttendanceAPI.Services
{
    public interface IAttendanceService
    {
        Task<List<Employee>> GetEmployeesAsync();
        Task<bool> SubmitAttendanceAsync(AttendanceRecord attendance);
        Task<List<AttendanceRecord>> GetAttendanceRecordsAsync();
        Task<bool> UpdateAttendanceAsync(int id, AttendanceRecord attendance);
        // New: Method to get an attendance record for a specific name and date
        Task<AttendanceRecord?> GetAttendanceRecordForDateAsync(string employeeId, DateTime date);
    }
    }
