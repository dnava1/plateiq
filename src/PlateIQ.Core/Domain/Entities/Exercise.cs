namespace PlateIQ.Core.Domain.Entities;

public sealed class Exercise
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsMainLift { get; set; }
    public decimal? ProgressionIncrementLbs { get; set; }
    public int? CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; }

    public User? CreatedByUser { get; set; }
    public ICollection<TrainingMax> TrainingMaxes { get; set; } = [];
    public ICollection<WorkoutSet> WorkoutSets { get; set; } = [];
}
