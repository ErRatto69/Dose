using Dose.Domain.Common;
using Dose.Domain.Enums;

namespace Dose.Domain.Entities;

public class User : BaseEntity
{
    public string Username { get; private set; } = null!;
    public string Email { get; private set; } = null!;
    public string PasswordHash { get; private set; } = null!;
    public UserRole Role { get; private set; }
    public decimal WeightKg { get; private set; }
    public decimal HeightCm { get; private set; }
    public BiologicalSex Sex { get; private set; }
    public int? BirthYear { get; private set; }
    public VolumeUnit PreferredUnit { get; private set; } = VolumeUnit.Cl;
    public bool IsActive { get; private set; } = true;

    // Navigation properties
    public virtual ICollection<CabinetItem> CabinetItems { get; private set; } = new List<CabinetItem>();
    public virtual ICollection<Review> Reviews { get; private set; } = new List<Review>();
    public virtual ICollection<DrinkLog> DrinkLogs { get; private set; } = new List<DrinkLog>();

    protected User() { }

    public User(
        string username,
        string email,
        string passwordHash,
        UserRole role,
        decimal weightKg,
        decimal heightCm,
        BiologicalSex sex,
        int? birthYear = null,
        VolumeUnit preferredUnit = VolumeUnit.Cl)
    {
        SetCredentials(username, email, passwordHash);
        Role = role;
        UpdateBiometrics(weightKg, heightCm, sex, birthYear);
        PreferredUnit = preferredUnit;
    }

    public void SetCredentials(string username, string email, string passwordHash)
    {
        UpdateIdentity(username, email);

        if (string.IsNullOrWhiteSpace(passwordHash))
            throw new DomainException("The password hash cannot be null or empty.");

        PasswordHash = passwordHash;
        UpdateTimestamp();
    }

    public void UpdateIdentity(string username, string email)
    {
        if (string.IsNullOrWhiteSpace(username))
            throw new DomainException("The username cannot be null or empty.");

        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
            throw new DomainException("The email address is not valid.");

        Username = username.Trim();
        Email = email.Trim().ToLowerInvariant();
        UpdateTimestamp();
    }

    public void UpdatePasswordHash(string passwordHash)
    {
        if (string.IsNullOrWhiteSpace(passwordHash))
            throw new DomainException("The password hash cannot be null or empty.");

        PasswordHash = passwordHash;
        UpdateTimestamp();
    }

    public void UpdateBiometrics(decimal weightKg, decimal heightCm, BiologicalSex sex, int? birthYear)
    {
        if (weightKg is < 30 or > 250)
            throw new DomainException("The bodyweight must be between 30kg and 250kg.");

        if (heightCm is < 100 or > 230)
            throw new DomainException("The height must be between 100cm and 230cm.");

        if (birthYear.HasValue && (birthYear < 1920 || birthYear > DateTimeOffset.UtcNow.Year - 16))
            throw new DomainException("Birthdate is not valid.");

        WeightKg = weightKg;
        HeightCm = heightCm;
        Sex = sex;
        BirthYear = birthYear;
        UpdateTimestamp();
    }

    public void SetPreferredUnit(VolumeUnit unit)
    {
        PreferredUnit = unit;
        UpdateTimestamp();
    }

    public void SetRole(UserRole role)
    {
        Role = role;
        UpdateTimestamp();
    }

    public void SetActive(bool isActive)
    {
        IsActive = isActive;
        UpdateTimestamp();
    }
}