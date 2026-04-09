namespace PlateIQ.WebAPI.Middleware;

using System.Text.Json;
using Microsoft.Extensions.Hosting;
using PlateIQ.Core.Domain.Exceptions;

public sealed class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;
    private readonly IHostEnvironment _env;

    public ExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<ExceptionHandlingMiddleware> logger,
        IHostEnvironment env)
    {
        _next = next;
        _logger = logger;
        _env = env;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var (statusCode, title, type) = exception switch
        {
            NotFoundException    => (StatusCodes.Status404NotFound,
                                     "Not Found",
                                     "https://tools.ietf.org/html/rfc7231#section-6.5.4"),
            ForbiddenException   => (StatusCodes.Status403Forbidden,
                                     "Forbidden",
                                     "https://tools.ietf.org/html/rfc7231#section-6.5.3"),
            ConflictException    => (StatusCodes.Status409Conflict,
                                     "Conflict",
                                     "https://tools.ietf.org/html/rfc7231#section-6.5.8"),
            ValidationException  => (StatusCodes.Status422UnprocessableEntity,
                                     "Validation Failed",
                                     "https://tools.ietf.org/html/rfc4918#section-11.2"),
            DomainException      => (StatusCodes.Status400BadRequest,
                                     "Bad Request",
                                     "https://tools.ietf.org/html/rfc7231#section-6.5.1"),
            _                    => (StatusCodes.Status500InternalServerError,
                                     "Internal Server Error",
                                     "https://tools.ietf.org/html/rfc7231#section-6.6.1")
        };

        if (statusCode == StatusCodes.Status500InternalServerError)
        {
            _logger.LogError(exception,
                "Unhandled exception for request {RequestId}", context.TraceIdentifier);
        }

        context.Response.ContentType = "application/problem+json";
        context.Response.StatusCode  = statusCode;

        object response;

        if (exception is ValidationException validationEx)
        {
            response = new
            {
                type,
                title,
                status    = statusCode,
                detail    = validationEx.Message,
                requestId = context.TraceIdentifier,
                errors    = validationEx.Errors
            };
        }
        else
        {
            var detail = statusCode == StatusCodes.Status500InternalServerError && _env.IsProduction()
                ? "An unexpected error occurred."
                : exception.Message;

            response = new
            {
                type,
                title,
                status    = statusCode,
                detail,
                requestId = context.TraceIdentifier
            };
        }

        var json = JsonSerializer.Serialize(response, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        await context.Response.WriteAsync(json);
    }
}
