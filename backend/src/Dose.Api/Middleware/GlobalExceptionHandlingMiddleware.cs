using System.Text.Json;
using Dose.Application.Common.Exceptions;
using Dose.Domain.Common;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Dose.Api.Middleware;

public class GlobalExceptionHandlingMiddleware(RequestDelegate next, ILogger<GlobalExceptionHandlingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
            logger.LogInformation("Request was cancelled by the client: {Path}", context.Request.Path);
            context.Response.StatusCode = 499; // Client Closed Request
        }
        catch (ValidationException valEx)
        {
            logger.LogWarning("Validation failure on {Path}: {Message}", context.Request.Path, valEx.Message);
            await HandleExceptionAsync(context, valEx);
        }
        catch (DomainException domEx)
        {
            logger.LogWarning("Domain rule violation on {Path}: {Message}", context.Request.Path, domEx.Message);
            await HandleExceptionAsync(context, domEx);
        }
        catch (DbUpdateException dbEx) when (dbEx.InnerException is Npgsql.PostgresException { SqlState: "23505" } pgEx)
        {
            logger.LogWarning("Unique constraint violation on {Path}: {Detail}", context.Request.Path, pgEx.Detail);
            var valEx = new ValidationException(
            [
                new FluentValidation.Results.ValidationFailure("Name", "A record with this name already exists in the database.")
            ]);
            await HandleExceptionAsync(context, valEx);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "An unhandled exception occurred: {Message}", ex.Message);
            await HandleExceptionAsync(context, ex);
        }
    }

    private static Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/problem+json";

        var (statusCode, title, detail, errors) = exception switch
        {
            ValidationException validationEx => (
                StatusCodes.Status400BadRequest,
                "Validation Error",
                "One or more validation errors occurred.",
                (IReadOnlyDictionary<string, string[]>?)validationEx.Errors
            ),
            DomainException domainEx => (
                StatusCodes.Status400BadRequest,
                "Domain Rule Violation",
                domainEx.Message,
                null
            ),
            NotFoundException notFoundEx => (
                StatusCodes.Status404NotFound,
                "Resource Not Found",
                notFoundEx.Message,
                null
            ),
            UnauthorizedException unauthorizedEx => (
                StatusCodes.Status401Unauthorized,
                "Unauthorized",
                unauthorizedEx.Message,
                null
            ),
            ForbiddenException forbiddenEx => (
                StatusCodes.Status403Forbidden,
                "Forbidden",
                forbiddenEx.Message,
                null
            ),
            _ => (
                StatusCodes.Status500InternalServerError,
                "Internal Server Error",
                "An unexpected server error occurred. Please try again later.",
                null
            )
        };

        context.Response.StatusCode = statusCode;

        var problemDetails = new ProblemDetails
        {
            Status = statusCode,
            Title = title,
            Detail = detail,
            Instance = context.Request.Path
        };

        if (errors is not null)
        {
            problemDetails.Extensions["errors"] = errors;
        }

        string json = JsonSerializer.Serialize(problemDetails);
        return context.Response.WriteAsync(json);
    }
}