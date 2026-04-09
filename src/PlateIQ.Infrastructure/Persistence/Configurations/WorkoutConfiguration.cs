namespace PlateIQ.Infrastructure.Persistence.Configurations;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PlateIQ.Core.Domain.Entities;

internal sealed class WorkoutConfiguration : IEntityTypeConfiguration<Workout>
{
    public void Configure(EntityTypeBuilder<Workout> builder)
    {
        builder.ToTable("workouts");

        builder.HasKey(w => w.Id);
        builder.Property(w => w.Id)
            .HasColumnName("id")
            .UseIdentityAlwaysColumn();

        builder.Property(w => w.CycleId)
            .HasColumnName("cycle_id")
            .IsRequired();

        builder.Property(w => w.UserId)
            .HasColumnName("user_id")
            .IsRequired();

        builder.Property(w => w.PrimaryExerciseId)
            .HasColumnName("primary_exercise_id")
            .IsRequired();

        builder.Property(w => w.WeekNumber)
            .HasColumnName("week_number");

        builder.Property(w => w.ScheduledDate)
            .HasColumnName("scheduled_date")
            .HasColumnType("date");

        builder.Property(w => w.StartedAt)
            .HasColumnName("started_at")
            .HasColumnType("timestamp with time zone");

        builder.Property(w => w.CompletedAt)
            .HasColumnName("completed_at")
            .HasColumnType("timestamp with time zone");

        builder.Property(w => w.Notes)
            .HasColumnName("notes")
            .HasMaxLength(4000);

        builder.Property(w => w.CreatedAt)
            .HasColumnName("created_at")
            .HasColumnType("timestamp with time zone")
            .HasDefaultValueSql("now() at time zone 'utc'");

        builder.HasOne(w => w.Cycle)
            .WithMany(c => c.Workouts)
            .HasForeignKey(w => w.CycleId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(w => w.User)
            .WithMany(u => u.Workouts)
            .HasForeignKey(w => w.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(w => w.PrimaryExercise)
            .WithMany()
            .HasForeignKey(w => w.PrimaryExerciseId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
