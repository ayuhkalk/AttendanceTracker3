// AttendanceController.cs
using AttendanceAPI.Models;
using AttendanceAPI.Services;
using Microsoft.AspNetCore.Mvc;
using System.Globalization;

namespace AttendanceAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AttendanceController : ControllerBase
    {
        private readonly IAttendanceService _attendanceService;

        public AttendanceController(IAttendanceService attendanceService)
        {
            _attendanceService = attendanceService;
        }

        [HttpGet("employees")]
        public async Task<ActionResult<List<Employee>>> GetEmployees()
        {
            var employees = await _attendanceService.GetEmployeesAsync();
            return Ok(employees);
        }

        [HttpPost("submit")]
        public async Task<ActionResult> SubmitAttendance([FromBody] AttendanceRecord attendance)
        {
            if (attendance == null)
            {
                return BadRequest("Invalid attendance data");
            }

            // Check for duplicate check-in for the day
            var existingRecord = await _attendanceService.GetAttendanceRecordForDateAsync(attendance.EmployeeId, attendance.Date);
            if (existingRecord != null && existingRecord.Attending)
            {
                return Conflict(new { message = "You have already checked in for today." });
            }

            var result = await _attendanceService.SubmitAttendanceAsync(attendance);

            if (result)
            {
                return Ok(new { message = "Attendance submitted successfully" });
            }

            return StatusCode(500, "Error submitting attendance");
        }
        // In AttendanceController.cs - Update the UpdateAttendance method:
        [HttpPut("update/{id}")]
        public async Task<ActionResult> UpdateAttendance(int id, [FromBody] AttendanceRecord attendance)
        {
            if (attendance == null || id <= 0)
            {
                return BadRequest("Invalid attendance data or ID.");
            }

            var result = await _attendanceService.UpdateAttendanceAsync(id, attendance);

            if (result)
            {
                return Ok(new { message = "Attendance record updated successfully" });
            }

            return NotFound(new { message = "Attendance record not found." });
        }


        [HttpGet("records")]
        public async Task<ActionResult<List<AttendanceRecord>>> GetAttendanceRecords()
        {
            var records = await _attendanceService.GetAttendanceRecordsAsync();
            return Ok(records);
        }

        [HttpGet("record-by-date")] // New: Endpoint to get record by name and date
        public async Task<ActionResult<AttendanceRecord>> GetAttendanceRecordForDate([FromQuery] string employeeId, [FromQuery] string date)
        {
            if (string.IsNullOrEmpty(employeeId) || string.IsNullOrEmpty(date))
            {
                return BadRequest("EmployeeId and date parameters are required.");
            }

            // Parse date string to DateTime object, assuming "YYYY-MM-DD" format
            if (!DateTime.TryParseExact(date, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedDate))
            {
                return BadRequest("Invalid date format. Use YYYY-MM-DD.");
            }

            var record = await _attendanceService.GetAttendanceRecordForDateAsync(employeeId, parsedDate);

            if (record == null)
            {
                return NotFound(); // No record found for the given name and date
            }

            return Ok(record);
        }

        [HttpGet("current-date")]
        public IActionResult GetCurrentDate()
        {
            try
            {
                var currentDate = DateTime.Now.ToString("yyyy-MM-dd");
                return Ok(new { date = currentDate });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }
    }
}