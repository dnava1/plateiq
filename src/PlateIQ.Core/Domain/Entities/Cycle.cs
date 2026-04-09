namespace PlateIQ.Core.Domain.Entities;

public sealed class Cycle
{
    public int Id { get; set; }
    public int ProgramId { get; set; }
    public int CycleNumber { get; set; }
    public DateOnly StartDate { get; set; }
    public DateTime? CompletedAt { get; set; }
    public bool AutoProgressionApplied { get; set; }
    public DateTime CreatedAt { get; set; }

    public TrainingProgram Program { get; set; } = null!;
    public ICollection<Workout> Workouts { get; set; } = [];
}
