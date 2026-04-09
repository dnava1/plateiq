namespace PlateIQ.Infrastructure.Persistence.Repositories;

using Microsoft.EntityFrameworkCore;
using PlateIQ.Core.Application.Interfaces.Repositories;
using PlateIQ.Core.Domain.Entities;

internal sealed class ProgramRepository(PlateIqDbContext context) : IProgramRepository
{
    public Task<TrainingProgram?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
        => context.TrainingPrograms
            .Include(p => p.Cycles)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

    public Task<TrainingProgram?> GetActiveByUserAsync(int userId, CancellationToken cancellationToken = default)
        => context.TrainingPrograms
            .Include(p => p.Cycles)
            .FirstOrDefaultAsync(p => p.UserId == userId && p.IsActive, cancellationToken);

    public Task<List<TrainingProgram>> GetByUserAsync(int userId, CancellationToken cancellationToken = default)
        => context.TrainingPrograms
            .Where(p => p.UserId == userId)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync(cancellationToken);

    public void Add(TrainingProgram program) => context.TrainingPrograms.Add(program);

    public void Update(TrainingProgram program) => context.TrainingPrograms.Update(program);
}
