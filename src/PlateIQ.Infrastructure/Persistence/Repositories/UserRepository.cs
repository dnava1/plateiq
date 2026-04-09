namespace PlateIQ.Infrastructure.Persistence.Repositories;

using Microsoft.EntityFrameworkCore;
using PlateIQ.Core.Application.Interfaces.Repositories;
using PlateIQ.Core.Domain.Entities;

internal sealed class UserRepository(PlateIqDbContext context) : IUserRepository
{
    public Task<User?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
        => context.Users.FirstOrDefaultAsync(u => u.Id == id, cancellationToken);

    public Task<User?> GetByGoogleSubjectIdAsync(string googleSubjectId, CancellationToken cancellationToken = default)
        => context.Users.FirstOrDefaultAsync(u => u.GoogleSubjectId == googleSubjectId, cancellationToken);

    public Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default)
        => context.Users.FirstOrDefaultAsync(u => u.Email == email, cancellationToken);

    public void Add(User user) => context.Users.Add(user);

    public void Update(User user) => context.Users.Update(user);
}
