namespace PlateIQ.Core.Domain.Exceptions;

public sealed class ConflictException : DomainException
{
    public ConflictException(string message) : base(message) { }

    public ConflictException(string name, object key)
        : base($"{name} with id '{key}' already exists.") { }
}
