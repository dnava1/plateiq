using Microsoft.EntityFrameworkCore;
using PlateIQ.Infrastructure;
using PlateIQ.Infrastructure.Persistence;
using PlateIQ.Infrastructure.Persistence.Seeders;
using PlateIQ.WebAPI.Extensions;
using Scalar.AspNetCore;
using Serilog;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    builder.Host.UseSerilog((context, services, loggerConfiguration) =>
        loggerConfiguration
            .ReadFrom.Configuration(context.Configuration)
            .ReadFrom.Services(services)
            .Enrich.FromLogContext());

    builder.Services.AddInfrastructure(builder.Configuration);
    builder.Services.AddApiServices(builder.Configuration);
    builder.Services.AddControllers();
    builder.Services.AddOpenApi();
    builder.Services.AddHealthChecks();

    var app = builder.Build();

    app.UseSerilogRequestLogging();
    app.UseCustomMiddleware();
    app.UseHttpsRedirection();
    app.UseCors("PlateIQ");

    app.MapControllers();
    app.MapHealthChecks("/health");

    if (app.Environment.IsDevelopment())
    {
        app.MapOpenApi();
        app.MapScalarApiReference();

        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<PlateIqDbContext>();
        await db.Database.MigrateAsync();
        await ExerciseSeeder.SeedAsync(db);
    }

    app.Run();
}
catch (Exception ex) when (ex is not HostAbortedException)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}

public partial class Program { }
