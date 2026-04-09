namespace PlateIQ.Infrastructure.Persistence.Repositories;

using Microsoft.EntityFrameworkCore;
using PlateIQ.Core.Application.Interfaces.Repositories;
using PlateIQ.Core.Domain.Entities;

internal sealed class RefreshTokenRepository(PlateIqDbContext context) : IRefreshTokenRepository
{
    public Task<RefreshToken?> GetByTokenHashAsync(string tokenHash, CancellationToken cancellationToken = default)
        => context.RefreshTokens.FirstOrDefaultAsync(rt => rt.TokenHash == tokenHash, cancellationToken);

    public Task<List<RefreshToken>> GetActiveByUserAsync(int userId, CancellationToken cancellationToken = default)
        => context.RefreshTokens
            .Where(rt => rt.UserId == userId && rt.RevokedAt == null && rt.ExpiresAt > DateTime.UtcNow)
            .ToListAsync(cancellationToken);

    public void Add(RefreshToken token) => context.RefreshTokens.Add(token);

    public void Update(RefreshToken token) => context.RefreshTokens.Update(token);
}
