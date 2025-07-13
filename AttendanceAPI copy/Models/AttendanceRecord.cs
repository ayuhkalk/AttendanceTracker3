namespace AttendanceAPI.Models
{
    public class AttendanceRecord
    {
        public int Id { get; set; }
        public string EmployeeId { get; set; } = string.Empty; // New field
        public string Name { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public bool Attending { get; set; }
        public bool Leaving { get; set; }
        public string Location { get; set; } = string.Empty;
        public string InFeeling { get; set; } = string.Empty;
        public string OutFeeling { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public DateTime SubmittedAt { get; set; }
        public string Notes { get; set; } = string.Empty;
    }
}
