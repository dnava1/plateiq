namespace PlateIQ.UnitTests.Domain;

using FluentAssertions;
using PlateIQ.Core.Domain.Entities;

public class EntityConstructionTests
{
    [Fact]
    public void User_DefaultValues_AreCorrect()
    {
        var user = new User();

        user.Id.Should().Be(0);
        user.Email.Should().BeEmpty();
        user.Name.Should().BeEmpty();
        user.PreferredUnit.Should().Be("lbs");
        user.TrainingMaxes.Should().BeEmpty();
        user.Programs.Should().BeEmpty();
        user.Workouts.Should().BeEmpty();
        user.CustomExercises.Should().BeEmpty();
        user.RefreshTokens.Should().BeEmpty();
    }

    [Fact]
    public void Exercise_SystemExercise_HasNullCreatedByUserId()
    {
        var exercise = new Exercise
        {
            Name = "Squat",
            IsMainLift = true,
            ProgressionIncrementLbs = 10
        };

        exercise.CreatedByUserId.Should().BeNull();
        exercise.IsMainLift.Should().BeTrue();
        exercise.ProgressionIncrementLbs.Should().Be(10);
    }

    [Fact]
    public void Exercise_CustomExercise_HasCreatedByUserId()
    {
        var exercise = new Exercise
        {
            Name = "Barbell Row",
            IsMainLift = false,
            CreatedByUserId = 1
        };

        exercise.CreatedByUserId.Should().Be(1);
        exercise.IsMainLift.Should().BeFalse();
        exercise.ProgressionIncrementLbs.Should().BeNull();
    }

    [Fact]
    public void TrainingMax_Defaults_AreCorrect()
    {
        var tm = new TrainingMax
        {
            UserId = 1,
            ExerciseId = 1,
            WeightLbs = 200m,
            EffectiveDate = new DateOnly(2026, 4, 8)
        };

        tm.WeightLbs.Should().Be(200m);
        tm.EffectiveDate.Should().Be(new DateOnly(2026, 4, 8));
    }

    [Fact]
    public void TrainingProgram_DefaultValues_AreCorrect()
    {
        var program = new TrainingProgram();

        program.IsActive.Should().BeFalse();
        program.Name.Should().BeEmpty();
        program.Cycles.Should().BeEmpty();
    }

    [Fact]
    public void Cycle_DefaultValues_AreCorrect()
    {
        var cycle = new Cycle();

        cycle.CompletedAt.Should().BeNull();
        cycle.AutoProgressionApplied.Should().BeFalse();
        cycle.Workouts.Should().BeEmpty();
    }

    [Fact]
    public void Workout_DefaultValues_AreCorrect()
    {
        var workout = new Workout();

        workout.StartedAt.Should().BeNull();
        workout.CompletedAt.Should().BeNull();
        workout.Notes.Should().BeNull();
        workout.Sets.Should().BeEmpty();
    }

    [Fact]
    public void WorkoutSet_DefaultValues_AreCorrect()
    {
        var set = new WorkoutSet();

        set.RepsActual.Should().BeNull();
        set.IsAmrap.Should().BeFalse();
        set.Rpe.Should().BeNull();
        set.LoggedAt.Should().BeNull();
    }

    [Fact]
    public void RefreshToken_DefaultValues_AreCorrect()
    {
        var token = new RefreshToken();

        token.RevokedAt.Should().BeNull();
        token.ReplacedByTokenHash.Should().BeNull();
        token.TokenHash.Should().BeEmpty();
    }
}
