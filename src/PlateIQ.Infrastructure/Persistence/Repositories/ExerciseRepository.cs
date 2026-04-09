namespace PlateIQ.Infrastructure.Persistence.Repositories;

using Microsoft.EntityFrameworkCore;
using PlateIQ.Core.Application.Interfaces.Repositories;
using PlateIQ.Core.Domain.Entities;

internal sealed class ExerciseRepository(PlateIqDbContext context) : IExerciseRepository
{
    public Task<Exercise?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
        => context.Exercises.FirstOrDefaultAsync(e => e.Id == id, cancellationToken);

    public Task<List<Exercise>> GetAllSystemAsync(CancellationToken cancellationToken = default)
        => context.Exercises.Where(e => e.CreatedByUserId == null).OrderBy(e => e.Name).ToListAsync(cancellationToken);

    public Task<List<Exercise>> GetByUserAsync(int userId, CancellationToken cancellationToken = default)
        => context.Exercises
            .Where(e => e.CreatedByUserId == null || e.CreatedByUserId == userId)
            .OrderBy(e => e.Name)
            .ToListAsync(cancellationToken);

    public Task<List<Exercise>> GetMainLiftsAsync(CancellationToken cancellationToken = default)
        => context.Exercises.Where(e => e.IsMainLift).OrderBy(e => e.Name).ToListAsync(cancellationToken);

    public void Add(Exercise exercise) => context.Exercises.Add(exercise);
}
