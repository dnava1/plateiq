namespace PlateIQ.Infrastructure.Persistence.Repositories;

using Microsoft.EntityFrameworkCore;
using PlateIQ.Core.Application.Interfaces.Repositories;
using PlateIQ.Core.Domain.Entities;

internal sealed class CycleRepository(PlateIqDbContext context) : ICycleRepository
{
    public Task<Cycle?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
        => context.Cycles
            .Include(c => c.Workouts)
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

    public Task<Cycle?> GetCurrentByProgramAsync(int programId, CancellationToken cancellationToken = default)
        => context.Cycles
            .Include(c => c.Workouts)
            .Where(c => c.ProgramId == programId && c.CompletedAt == null)
            .OrderByDescending(c => c.CycleNumber)
            .FirstOrDefaultAsync(cancellationToken);

    public Task<List<Cycle>> GetByProgramAsync(int programId, CancellationToken cancellationToken = default)
        => context.Cycles
            .Where(c => c.ProgramId == programId)
            .OrderBy(c => c.CycleNumber)
            .ToListAsync(cancellationToken);

    public void Add(Cycle cycle) => context.Cycles.Add(cycle);

    public void Update(Cycle cycle) => context.Cycles.Update(cycle);
}
