namespace PlateIQ.Core.Application.Interfaces.Repositories;

using PlateIQ.Core.Domain.Entities;

public interface IProgramRepository
{
    Task<TrainingProgram?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<TrainingProgram?> GetActiveByUserAsync(int userId, CancellationToken cancellationToken = default);
    Task<List<TrainingProgram>> GetByUserAsync(int userId, CancellationToken cancellationToken = default);
    void Add(TrainingProgram program);
    void Update(TrainingProgram program);
}
