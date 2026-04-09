namespace PlateIQ.Core.Application.Interfaces.Repositories;

using PlateIQ.Core.Domain.Entities;

public interface IExerciseRepository
{
    Task<Exercise?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<List<Exercise>> GetAllSystemAsync(CancellationToken cancellationToken = default);
    Task<List<Exercise>> GetByUserAsync(int userId, CancellationToken cancellationToken = default);
    Task<List<Exercise>> GetMainLiftsAsync(CancellationToken cancellationToken = default);
    void Add(Exercise exercise);
}
