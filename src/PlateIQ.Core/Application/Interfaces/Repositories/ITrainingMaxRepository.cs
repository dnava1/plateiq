namespace PlateIQ.Core.Application.Interfaces.Repositories;

using PlateIQ.Core.Domain.Entities;

public interface ITrainingMaxRepository
{
    Task<TrainingMax?> GetCurrentAsync(int userId, int exerciseId, CancellationToken cancellationToken = default);
    Task<List<TrainingMax>> GetHistoryAsync(int userId, int exerciseId, CancellationToken cancellationToken = default);
    Task<List<TrainingMax>> GetAllCurrentByUserAsync(int userId, CancellationToken cancellationToken = default);
    void Add(TrainingMax trainingMax);
}
