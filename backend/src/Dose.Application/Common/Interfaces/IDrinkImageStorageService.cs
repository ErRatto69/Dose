namespace Dose.Application.Common.Interfaces;

public interface IDrinkImageStorageService
{
    Task<string?> DownloadAndSanitizeImageAsync(string sourceUrl, CancellationToken cancellationToken = default);
}