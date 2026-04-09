namespace PlateIQ.Core.Domain.Entities;

public sealed class Workout
{
    public int Id { get; set; }
    public int CycleId { get; set; }
    public int UserId { get; set; }
    public int PrimaryExerciseId { get; set; }
    public int WeekNumber { get; set; }
    public DateOnly? ScheduledDate { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }

    public Cycle Cycle { get; set; } = null!;
    public User User { get; set; } = null!;
    public Exercise PrimaryExercise { get; set; } = null!;
    public ICollection<WorkoutSet> Sets { get; set; } = [];
}
