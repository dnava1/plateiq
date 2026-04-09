namespace PlateIQ.Core.Domain.Entities;

public sealed class User
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string GoogleSubjectId { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string PreferredUnit { get; set; } = "lbs";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<TrainingMax> TrainingMaxes { get; set; } = [];
    public ICollection<TrainingProgram> Programs { get; set; } = [];
    public ICollection<Workout> Workouts { get; set; } = [];
    public ICollection<Exercise> CustomExercises { get; set; } = [];
    public ICollection<RefreshToken> RefreshTokens { get; set; } = [];
}
