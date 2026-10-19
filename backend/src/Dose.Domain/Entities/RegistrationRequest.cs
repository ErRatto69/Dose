using Dose.Domain.Common;
using Dose.Domain.Enums;

namespace Dose.Domain.Entities;

public class RegistrationRequest : BaseEntity
{
    public string Username { get; private set; } = null!;
    public string Email { get; private set; } = null!;
    public string PasswordHash { get; private set; } = null!;
    public decimal WeightKg { get; private set; }
    public decimal HeightCm { get; private set; }
    public BiologicalSex Sex { get; private set; }
    public int? BirthYear { get; private set; }
    public string? RequestNote { get; private set; }
    public string? ClientIpAddress { get; private set; }
    public RegistrationRequestStatus Status { get; private set; } = RegistrationRequestStatus.Pending;

    protected RegistrationRequest() { }

    public RegistrationRequest(
        string username,
        string email,
        string passwordHash,
        decimal weightKg,
        decimal heightCm,
        BiologicalSex sex,
        int? birthYear = null,
        string? requestNote = null,
        string? clientIpAddress = null)
    {
        if (string.IsNullOrWhiteSpace(username))
            throw new DomainException("Username cannot be empty.");
        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
            throw new DomainException("A valid email address is required.");
        if (string.IsNullOrWhiteSpace(passwordHash))
            throw new DomainException("Password hash cannot be empty.");
        if (weightKg is < 30 or > 250)
            throw new DomainException("Body weight must be between 30kg and 250kg.");
        if (heightCm is < 100 or > 230)
            throw new DomainException("Height must be between 100cm and 230cm.");
        if (birthYear.HasValue && (birthYear < 1920 || birthYear > DateTimeOffset.UtcNow.Year - 16))
            throw new DomainException("Birth year is not valid.");

        Username = username.Trim();
        Email = email.Trim().ToLowerInvariant();
        PasswordHash = passwordHash;
        WeightKg = Math.Round(weightKg, 2);
        HeightCm = Math.Round(heightCm, 2);
        Sex = sex;
        BirthYear = birthYear;
        RequestNote = string.IsNullOrWhiteSpace(requestNote) ? null : requestNote.Trim();
        ClientIpAddress = string.IsNullOrWhiteSpace(clientIpAddress) ? null : clientIpAddress.Trim();
        Status = RegistrationRequestStatus.Pending;
    }

    public void Approve()
    {
        Status = RegistrationRequestStatus.Approved;
        UpdateTimestamp();
    }

    public void Reject()
    {
        Status = RegistrationRequestStatus.Rejected;
        UpdateTimestamp();
    }
}