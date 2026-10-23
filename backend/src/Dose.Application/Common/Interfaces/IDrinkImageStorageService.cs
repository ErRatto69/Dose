namespace Dose.Application.Common.Interfaces;

public interface IDrinkImageStorageService
{
    Task<string?> DownloadAndSanitizeImageAsync(string sourceUrl, CancellationToken cancellationToken = default);
    Task<string?> SaveAndSanitizeUploadedImageAsync(Stream fileStream, long contentLength, CancellationToken cancellationToken = default);
}