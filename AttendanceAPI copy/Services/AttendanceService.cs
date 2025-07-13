// AttendanceService.cs
using AttendanceAPI.Models;
using System.Text.Json; // Using System.Text.Json
using System.Globalization;

namespace AttendanceAPI.Services
{
    public class AttendanceService : IAttendanceService
    {
        private readonly string _jsonFilePath = "attendance.json";

        public AttendanceService()
        {
            // Ensure the JSON file exists, create if not
            if (!File.Exists(_jsonFilePath))
            {
                File.WriteAllText(_jsonFilePath, "[]");
            }
        }

        // Helper method to read all attendance records from the JSON file
        private async Task<List<AttendanceRecord>> ReadAttendanceRecordsAsync()
        {
            try
            {
                if (!File.Exists(_jsonFilePath))
                {
                    return new List<AttendanceRecord>();
                }

                var json = await File.ReadAllTextAsync(_jsonFilePath);
                if (string.IsNullOrEmpty(json))
                {
                    return new List<AttendanceRecord>();
                }
                // Deserialize with default options; ensure casing matches JSON
                return JsonSerializer.Deserialize<List<AttendanceRecord>>(json) ?? new List<AttendanceRecord>();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error reading attendance records: {ex.Message}");
                return new List<AttendanceRecord>();
            }
        }

        // Helper method to save all attendance records to the JSON file
        private async Task SaveAttendanceRecordsAsync(List<AttendanceRecord> records)
        {
            try
            {
                // Serialize with WriteIndented for readability
                var options = new JsonSerializerOptions { WriteIndented = true };
                var json = JsonSerializer.Serialize(records, options);
                await File.WriteAllTextAsync(_jsonFilePath, json);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error saving attendance records: {ex.Message}");
            }
        }

        public async Task<List<Employee>> GetEmployeesAsync()
        {
            // Return sample employees - in real app, this would come from database
            return await Task.FromResult(new List<Employee>
            {
                new Employee { Id = 1, Name = "Ayah", Department = "IDE" },
                new Employee { Id = 2, Name = "Testing1", Department = "IDI" },
                new Employee { Id = 3, Name = "testing2", Department = "IDL" },
                new Employee { Id = 4, Name = "Testing", Department = "IDI" },
                new Employee { Id = 5, Name = "AYah", Department = "IDI" },
                new Employee { Id = 6, Name = "ay", Department = "IDC" },
                new Employee { Id = 7, Name = "dyg", Department = "IDC" }
            });
        }

        public async Task<bool> SubmitAttendanceAsync(AttendanceRecord attendance)
        {
            var records = await ReadAttendanceRecordsAsync();

            // Assign a new ID (sequential based on max existing ID, or 1 if empty)
            attendance.Id = records.Any() ? records.Max(r => r.Id) + 1 : 1;
            attendance.SubmittedAt = DateTime.Now; // Set submission timestamp

            records.Add(attendance);
            await SaveAttendanceRecordsAsync(records);
            return true;
        }

        public async Task<List<AttendanceRecord>> GetAttendanceRecordsAsync()
        {
            return await ReadAttendanceRecordsAsync();
        }

        // New: Implements the method to update an existing attendance record
        public async Task<bool> UpdateAttendanceAsync(int id, AttendanceRecord updatedAttendance)
        {
            var records = await ReadAttendanceRecordsAsync();
            var existingRecord = records.FirstOrDefault(r => r.Id == id);

            if (existingRecord == null)
            {
                return false; // Record with given ID not found
            }

            // Update only the fields relevant for check-out
            existingRecord.Leaving = updatedAttendance.Leaving;
            existingRecord.OutFeeling = updatedAttendance.OutFeeling;
            existingRecord.Notes = updatedAttendance.Notes;
            existingRecord.SubmittedAt = DateTime.Now; // Update timestamp for checkout

            await SaveAttendanceRecordsAsync(records);
            return true;
        }

        // New: Implements the method to get an attendance record for a specific name and date
        public async Task<AttendanceRecord?> GetAttendanceRecordForDateAsync(string employeeId, DateTime date)
        {
            var records = await ReadAttendanceRecordsAsync();
            // Compare dates by only their date component (ignoring time)
            return records.FirstOrDefault(r =>
            r.EmployeeId.Equals(employeeId, StringComparison.OrdinalIgnoreCase) &&
            r.Date.Date == date.Date);

                
        }
    }
}