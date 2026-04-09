namespace PlateIQ.Infrastructure.Persistence.Configurations;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PlateIQ.Core.Domain.Entities;

internal sealed class TrainingProgramConfiguration : IEntityTypeConfiguration<TrainingProgram>
{
    public void Configure(EntityTypeBuilder<TrainingProgram> builder)
    {
        builder.ToTable("training_programs");

        builder.HasKey(tp => tp.Id);
        builder.Property(tp => tp.Id)
            .HasColumnName("id")
            .UseIdentityAlwaysColumn();

        builder.Property(tp => tp.UserId)
            .HasColumnName("user_id")
            .IsRequired();

        builder.Property(tp => tp.Name)
            .HasColumnName("name")
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(tp => tp.StartDate)
            .HasColumnName("start_date")
            .HasColumnType("date");

        builder.Property(tp => tp.IsActive)
            .HasColumnName("is_active");

        builder.Property(tp => tp.CreatedAt)
            .HasColumnName("created_at")
            .HasColumnType("timestamp with time zone")
            .HasDefaultValueSql("now() at time zone 'utc'");

        builder.Property(tp => tp.UpdatedAt)
            .HasColumnName("updated_at")
            .HasColumnType("timestamp with time zone")
            .HasDefaultValueSql("now() at time zone 'utc'");

        builder.HasOne(tp => tp.User)
            .WithMany(u => u.Programs)
            .HasForeignKey(tp => tp.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
