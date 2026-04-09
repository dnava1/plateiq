namespace PlateIQ.WebAPI.Middleware;

using System.Security.Claims;
using Serilog.Context;

public sealed class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;

    public RequestLoggingMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var requestId = context.TraceIdentifier;
        var userId    = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "anonymous";

        using (LogContext.PushProperty("RequestId", requestId))
        using (LogContext.PushProperty("UserId", userId))
        {
            await _next(context);
        }
    }
}
