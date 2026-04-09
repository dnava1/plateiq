namespace PlateIQ.Core.Domain.Entities;

public sealed class TrainingMax
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int ExerciseId { get; set; }
    public decimal WeightLbs { get; set; }
    public DateOnly EffectiveDate { get; set; }
    public DateTime CreatedAt { get; set; }

    public User User { get; set; } = null!;
    public Exercise Exercise { get; set; } = null!;
}
