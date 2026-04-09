using PlateIQ.Core.Domain.Enums;

namespace PlateIQ.Core.Domain.Entities;

public sealed class WorkoutSet
{
    public int Id { get; set; }
    public int WorkoutId { get; set; }
    public int ExerciseId { get; set; }
    public int SetOrder { get; set; }
    public SetType SetType { get; set; }
    public decimal WeightLbs { get; set; }
    public int RepsPrescribed { get; set; }
    public int? RepsActual { get; set; }
    public bool IsAmrap { get; set; }
    public decimal? Rpe { get; set; }
    public DateTime? LoggedAt { get; set; }

    public Workout Workout { get; set; } = null!;
    public Exercise Exercise { get; set; } = null!;
}
