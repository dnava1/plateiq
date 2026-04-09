namespace PlateIQ.Core.Application.Interfaces.Repositories;

using PlateIQ.Core.Domain.Entities;

public interface IWorkoutRepository
{
    Task<Workout?> GetByIdWithSetsAsync(int id, CancellationToken cancellationToken = default);
    Task<List<Workout>> GetByCycleAsync(int cycleId, CancellationToken cancellationToken = default);
    Task<List<Workout>> GetByUserAsync(int userId, int limit, CancellationToken cancellationToken = default);
    void Add(Workout workout);
    void Update(Workout workout);
    void AddSet(WorkoutSet set);
}
