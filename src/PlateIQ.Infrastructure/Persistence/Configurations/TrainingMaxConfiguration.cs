namespace PlateIQ.Infrastructure.Persistence.Configurations;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PlateIQ.Core.Domain.Entities;

internal sealed class TrainingMaxConfiguration : IEntityTypeConfiguration<TrainingMax>
{
    public void Configure(EntityTypeBuilder<TrainingMax> builder)
    {
        builder.ToTable("training_maxes");

        builder.HasKey(tm => tm.Id);
        builder.Property(tm => tm.Id)
            .HasColumnName("id")
            .UseIdentityAlwaysColumn();

        builder.Property(tm => tm.UserId)
            .HasColumnName("user_id")
            .IsRequired();

        builder.Property(tm => tm.ExerciseId)
            .HasColumnName("exercise_id")
            .IsRequired();

        builder.Property(tm => tm.WeightLbs)
            .HasColumnName("weight_lbs")
            .HasPrecision(8, 2);

        builder.Property(tm => tm.EffectiveDate)
            .HasColumnName("effective_date")
            .HasColumnType("date");

        builder.Property(tm => tm.CreatedAt)
            .HasColumnName("created_at")
            .HasColumnType("timestamp with time zone")
            .HasDefaultValueSql("now() at time zone 'utc'");

        builder.HasOne(tm => tm.User)
            .WithMany(u => u.TrainingMaxes)
            .HasForeignKey(tm => tm.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(tm => tm.Exercise)
            .WithMany(e => e.TrainingMaxes)
            .HasForeignKey(tm => tm.ExerciseId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(tm => new { tm.UserId, tm.ExerciseId, tm.EffectiveDate })
            .HasDatabaseName("IX_training_maxes_user_exercise_date")
            .IsDescending(false, false, true);
    }
}
