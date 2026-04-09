namespace PlateIQ.Infrastructure.Persistence.Configurations;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PlateIQ.Core.Domain.Entities;

internal sealed class CycleConfiguration : IEntityTypeConfiguration<Cycle>
{
    public void Configure(EntityTypeBuilder<Cycle> builder)
    {
        builder.ToTable("cycles");

        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id)
            .HasColumnName("id")
            .UseIdentityAlwaysColumn();

        builder.Property(c => c.ProgramId)
            .HasColumnName("program_id")
            .IsRequired();

        builder.Property(c => c.CycleNumber)
            .HasColumnName("cycle_number");

        builder.Property(c => c.StartDate)
            .HasColumnName("start_date")
            .HasColumnType("date");

        builder.Property(c => c.CompletedAt)
            .HasColumnName("completed_at")
            .HasColumnType("timestamp with time zone");

        builder.Property(c => c.AutoProgressionApplied)
            .HasColumnName("auto_progression_applied");

        builder.Property(c => c.CreatedAt)
            .HasColumnName("created_at")
            .HasColumnType("timestamp with time zone")
            .HasDefaultValueSql("now() at time zone 'utc'");

        builder.HasOne(c => c.Program)
            .WithMany(tp => tp.Cycles)
            .HasForeignKey(c => c.ProgramId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(c => new { c.ProgramId, c.CycleNumber }).IsUnique();
    }
}
