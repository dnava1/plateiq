namespace PlateIQ.Core.Application.Interfaces.Repositories;

using PlateIQ.Core.Domain.Entities;

public interface IRefreshTokenRepository
{
    Task<RefreshToken?> GetByTokenHashAsync(string tokenHash, CancellationToken cancellationToken = default);
    Task<List<RefreshToken>> GetActiveByUserAsync(int userId, CancellationToken cancellationToken = default);
    void Add(RefreshToken token);
    void Update(RefreshToken token);
}
