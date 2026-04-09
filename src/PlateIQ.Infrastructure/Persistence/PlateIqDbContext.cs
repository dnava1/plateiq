namespace PlateIQ.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;
using PlateIQ.Core.Domain.Entities;

public sealed class PlateIqDbContext : DbContext
{
    public PlateIqDbContext(DbContextOptions<PlateIqDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Exercise> Exercises => Set<Exercise>();
    public DbSet<TrainingMax> TrainingMaxes => Set<TrainingMax>();
    public DbSet<TrainingProgram> TrainingPrograms => Set<TrainingProgram>();
    public DbSet<Cycle> Cycles => Set<Cycle>();
    public DbSet<Workout> Workouts => Set<Workout>();
    public DbSet<WorkoutSet> WorkoutSets => Set<WorkoutSet>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(PlateIqDbContext).Assembly);
    }
}
