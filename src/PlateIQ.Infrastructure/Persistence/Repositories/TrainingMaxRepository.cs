namespace PlateIQ.Infrastructure.Persistence.Repositories;

using Microsoft.EntityFrameworkCore;
using PlateIQ.Core.Application.Interfaces.Repositories;
using PlateIQ.Core.Domain.Entities;

internal sealed class TrainingMaxRepository(PlateIqDbContext context) : ITrainingMaxRepository
{
    public Task<TrainingMax?> GetCurrentAsync(int userId, int exerciseId, CancellationToken cancellationToken = default)
        => context.TrainingMaxes
            .Where(tm => tm.UserId == userId && tm.ExerciseId == exerciseId)
            .OrderByDescending(tm => tm.EffectiveDate)
            .FirstOrDefaultAsync(cancellationToken);

    public Task<List<TrainingMax>> GetHistoryAsync(int userId, int exerciseId, CancellationToken cancellationToken = default)
        => context.TrainingMaxes
            .Where(tm => tm.UserId == userId && tm.ExerciseId == exerciseId)
            .OrderByDescending(tm => tm.EffectiveDate)
            .ToListAsync(cancellationToken);

    public Task<List<TrainingMax>> GetAllCurrentByUserAsync(int userId, CancellationToken cancellationToken = default)
        => context.TrainingMaxes
            .Where(tm => tm.UserId == userId)
            .GroupBy(tm => tm.ExerciseId)
            .Select(g => g.OrderByDescending(tm => tm.EffectiveDate).First())
            .Include(tm => tm.Exercise)
            .ToListAsync(cancellationToken);

    public void Add(TrainingMax trainingMax) => context.TrainingMaxes.Add(trainingMax);
}
