namespace PlateIQ.Infrastructure.Persistence.Seeders;

using Microsoft.EntityFrameworkCore;
using PlateIQ.Core.Domain.Entities;

public static class ExerciseSeeder
{
    public static async Task SeedAsync(PlateIqDbContext context)
    {
        if (await context.Exercises.AnyAsync())
            return;

        var exercises = new List<Exercise>
        {
            // Main lifts — 5/3/1 core four
            new() { Name = "Squat", IsMainLift = true, ProgressionIncrementLbs = 10 },
            new() { Name = "Bench Press", IsMainLift = true, ProgressionIncrementLbs = 5 },
            new() { Name = "Overhead Press", IsMainLift = true, ProgressionIncrementLbs = 5 },
            new() { Name = "Deadlift", IsMainLift = true, ProgressionIncrementLbs = 10 },
        };

        context.Exercises.AddRange(exercises);
        await context.SaveChangesAsync();
    }
}
