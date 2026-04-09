namespace PlateIQ.Infrastructure.Persistence.Configurations;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PlateIQ.Core.Domain.Entities;

internal sealed class WorkoutSetConfiguration : IEntityTypeConfiguration<WorkoutSet>
{
    public void Configure(EntityTypeBuilder<WorkoutSet> builder)
    {
        builder.ToTable("workout_sets");

        builder.HasKey(ws => ws.Id);
        builder.Property(ws => ws.Id)
            .HasColumnName("id")
            .UseIdentityAlwaysColumn();

        builder.Property(ws => ws.WorkoutId)
            .HasColumnName("workout_id")
            .IsRequired();

        builder.Property(ws => ws.ExerciseId)
            .HasColumnName("exercise_id")
            .IsRequired();

        builder.Property(ws => ws.SetOrder)
            .HasColumnName("set_order");

        builder.Property(ws => ws.SetType)
            .HasColumnName("set_type")
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(ws => ws.WeightLbs)
            .HasColumnName("weight_lbs")
            .HasPrecision(8, 2);

        builder.Property(ws => ws.RepsPrescribed)
            .HasColumnName("reps_prescribed");

        builder.Property(ws => ws.RepsActual)
            .HasColumnName("reps_actual");

        builder.Property(ws => ws.IsAmrap)
            .HasColumnName("is_amrap");

        builder.Property(ws => ws.Rpe)
            .HasColumnName("rpe")
            .HasPrecision(4, 2);

        builder.Property(ws => ws.LoggedAt)
            .HasColumnName("logged_at")
            .HasColumnType("timestamp with time zone");

        builder.HasOne(ws => ws.Workout)
            .WithMany(w => w.Sets)
            .HasForeignKey(ws => ws.WorkoutId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(ws => ws.Exercise)
            .WithMany(e => e.WorkoutSets)
            .HasForeignKey(ws => ws.ExerciseId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(ws => new { ws.WorkoutId, ws.SetOrder })
            .HasDatabaseName("IX_workout_sets_workout_order");
    }
}
