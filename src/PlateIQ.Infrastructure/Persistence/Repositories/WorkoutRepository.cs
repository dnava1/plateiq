namespace PlateIQ.Infrastructure.Persistence.Repositories;

using Microsoft.EntityFrameworkCore;
using PlateIQ.Core.Application.Interfaces.Repositories;
using PlateIQ.Core.Domain.Entities;

internal sealed class WorkoutRepository(PlateIqDbContext context) : IWorkoutRepository
{
    public Task<Workout?> GetByIdWithSetsAsync(int id, CancellationToken cancellationToken = default)
        => context.Workouts
            .Include(w => w.Sets.OrderBy(s => s.SetOrder))
                .ThenInclude(s => s.Exercise)
            .Include(w => w.PrimaryExercise)
            .FirstOrDefaultAsync(w => w.Id == id, cancellationToken);

    public Task<List<Workout>> GetByCycleAsync(int cycleId, CancellationToken cancellationToken = default)
        => context.Workouts
            .Include(w => w.PrimaryExercise)
            .Where(w => w.CycleId == cycleId)
            .OrderBy(w => w.WeekNumber).ThenBy(w => w.CreatedAt)
            .ToListAsync(cancellationToken);

    public Task<List<Workout>> GetByUserAsync(int userId, int limit, CancellationToken cancellationToken = default)
        => context.Workouts
            .Include(w => w.PrimaryExercise)
            .Where(w => w.UserId == userId)
            .OrderByDescending(w => w.CreatedAt)
            .Take(limit)
            .ToListAsync(cancellationToken);

    public void Add(Workout workout) => context.Workouts.Add(workout);

    public void Update(Workout workout) => context.Workouts.Update(workout);

    public void AddSet(WorkoutSet set) => context.WorkoutSets.Add(set);
}
