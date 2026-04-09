namespace PlateIQ.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;

public sealed class PlateIqDbContext : DbContext
{
    public PlateIqDbContext(DbContextOptions<PlateIqDbContext> options) : base(options) { }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        // Stage 2: entity type configurations applied here via modelBuilder.ApplyConfigurationsFromAssembly(...)
    }
}
