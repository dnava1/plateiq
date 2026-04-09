namespace PlateIQ.Infrastructure.Persistence.Configurations;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PlateIQ.Core.Domain.Entities;

internal sealed class ExerciseConfiguration : IEntityTypeConfiguration<Exercise>
{
    public void Configure(EntityTypeBuilder<Exercise> builder)
    {
        builder.ToTable("exercises");

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id)
            .HasColumnName("id")
            .UseIdentityAlwaysColumn();

        builder.Property(e => e.Name)
            .HasColumnName("name")
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(e => e.IsMainLift)
            .HasColumnName("is_main_lift");

        builder.Property(e => e.ProgressionIncrementLbs)
            .HasColumnName("progression_increment_lbs")
            .HasPrecision(5, 2);

        builder.Property(e => e.CreatedByUserId)
            .HasColumnName("created_by_user_id");

        builder.Property(e => e.CreatedAt)
            .HasColumnName("created_at")
            .HasColumnType("timestamp with time zone")
            .HasDefaultValueSql("now() at time zone 'utc'");

        builder.HasOne(e => e.CreatedByUser)
            .WithMany(u => u.CustomExercises)
            .HasForeignKey(e => e.CreatedByUserId)
            .IsRequired(false);

        builder.HasIndex(e => e.CreatedByUserId);
    }
}
