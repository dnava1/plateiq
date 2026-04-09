namespace PlateIQ.Infrastructure.Persistence.Repositories;

using PlateIQ.Core.Application.Interfaces.Repositories;
using PlateIQ.Infrastructure.Persistence;

internal sealed class UnitOfWork(PlateIqDbContext context) : IUnitOfWork
{
    public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        => context.SaveChangesAsync(cancellationToken);
}
