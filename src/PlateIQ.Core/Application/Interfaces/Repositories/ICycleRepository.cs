namespace PlateIQ.Core.Application.Interfaces.Repositories;

using PlateIQ.Core.Domain.Entities;

public interface ICycleRepository
{
    Task<Cycle?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<Cycle?> GetCurrentByProgramAsync(int programId, CancellationToken cancellationToken = default);
    Task<List<Cycle>> GetByProgramAsync(int programId, CancellationToken cancellationToken = default);
    void Add(Cycle cycle);
    void Update(Cycle cycle);
}
