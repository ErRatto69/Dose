using System.Net;
using System.Net.Sockets;
using Dose.Application.Common.Interfaces;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Logging;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace Dose.Infrastructure.Services;

public class DrinkImageStorageService(
    IWebHostEnvironment environment,
    IHttpClientFactory httpClientFactory,
    ILogger<DrinkImageStorageService> logger) : IDrinkImageStorageService
{
    private const long MaxAllowedFileSizeBytes = 5 * 1024 * 1024; // 5 MB
    private static readonly string[] AllowedHosts = ["www.thecocktaildb.com", "thecocktaildb.com"];

    public async Task<string?> DownloadAndSanitizeImageAsync(string sourceUrl, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(sourceUrl) || !Uri.TryCreate(sourceUrl, UriKind.Absolute, out var uri))
        {
            logger.LogWarning("Invalid image URL provided: {Url}", sourceUrl);
            return null;
        }

        // 1. SSRF Mitigation: Host whitelist
        if (!AllowedHosts.Contains(uri.Host.ToLowerInvariant()))
        {
            logger.LogWarning("SSRF attempt blocked. Host not in whitelist: {Host}", uri.Host);
            return null;
        }

        // 2. SSRF Mitigation: Loopback & private network check
        try
        {
            var hostEntry = await Dns.GetHostEntryAsync(uri.Host, cancellationToken);
            foreach (var ip in hostEntry.AddressList)
            {
                if (IPAddress.IsLoopback(ip) || IsPrivateSubnet(ip))
                {
                    logger.LogWarning("SSRF attempt blocked. Host resolves to private/loopback IP: {IP}", ip);
                    return null;
                }
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "DNS resolution failed for {Host}", uri.Host);
            return null;
        }

        // 3. Download stream
        var client = httpClientFactory.CreateClient("CocktailDbClient");
        using var response = await client.GetAsync(uri, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning("Failed to download image from {Url}. Status: {Status}", sourceUrl, response.StatusCode);
            return null;
        }

        if (response.Content.Headers.ContentLength > MaxAllowedFileSizeBytes)
        {
            logger.LogWarning("Remote image exceeds max allowed size of 5MB: {Url}", sourceUrl);
            return null;
        }

        await using var rawStream = await response.Content.ReadAsStreamAsync(cancellationToken);
        return await ProcessAndPersistImageStreamAsync(rawStream, response.Content.Headers.ContentLength ?? 0, cancellationToken);
    }

    public async Task<string?> SaveAndSanitizeUploadedImageAsync(Stream fileStream, long contentLength, CancellationToken cancellationToken = default)
    {
        return await ProcessAndPersistImageStreamAsync(fileStream, contentLength, cancellationToken);
    }

    private async Task<string?> ProcessAndPersistImageStreamAsync(Stream stream, long declaredLength, CancellationToken cancellationToken)
    {
        if (declaredLength > MaxAllowedFileSizeBytes)
        {
            logger.LogWarning("Stream declared length exceeds 5MB: {Length} bytes", declaredLength);
            return null;
        }

        using var memoryStream = new MemoryStream();
        byte[] buffer = new byte[81920]; // Chunk da 80 KB
        long totalBytesRead = 0;
        int bytesRead;

        // Lettura protetta: se lo stream supera 5 MB reali, interrompe subito senza saturare la RAM
        while ((bytesRead = await stream.ReadAsync(buffer.AsMemory(0, buffer.Length), cancellationToken)) > 0)
        {
            totalBytesRead += bytesRead;
            if (totalBytesRead > MaxAllowedFileSizeBytes)
            {
                logger.LogWarning("Payload size exceeded maximum allowed limit of 5MB");
                return null;
            }
            await memoryStream.WriteAsync(buffer.AsMemory(0, bytesRead), cancellationToken);
        }

        if (totalBytesRead < 16)
        {
            logger.LogWarning("Payload size invalid ({Bytes} bytes)", totalBytesRead);
            return null;
        }

        memoryStream.Position = 0;

        // Magic Bytes Validation
        byte[] header = new byte[12];
        _ = await memoryStream.ReadAsync(header.AsMemory(0, 12), cancellationToken);
        memoryStream.Position = 0;

        if (!IsValidImageHeader(header))
        {
            logger.LogWarning("Magic bytes mismatch for incoming image stream");
            return null;
        }

        string fileName = $"{Guid.NewGuid():N}.webp";
        string storageDir = Path.Combine(environment.ContentRootPath, "storage", "drinks");
        Directory.CreateDirectory(storageDir);

        string targetFilePath = Path.Combine(storageDir, fileName);
        string tempFilePath = Path.Combine(storageDir, $"{fileName}.tmp");

        try
        {
            using var image = await Image.LoadAsync(memoryStream, cancellationToken);
            image.Mutate(ctx => ctx.Resize(new ResizeOptions
            {
                Size = new Size(800, 800),
                Mode = ResizeMode.Crop,
                Position = AnchorPositionMode.Center
            }));

            var encoder = new WebpEncoder
            {
                Quality = 80,
                FileFormat = WebpFileFormatType.Lossy
            };

            // Write to temporary file first, then atomically promote to avoid partial WebP files on shutdown/failure
            await image.SaveAsync(tempFilePath, encoder, cancellationToken);
            File.Move(tempFilePath, targetFilePath, overwrite: true);
            return $"/storage/drinks/{fileName}";
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            if (File.Exists(tempFilePath)) File.Delete(tempFilePath);
            if (File.Exists(targetFilePath)) File.Delete(targetFilePath);
            throw;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to sanitize or encode uploaded image to WebP");
            if (File.Exists(tempFilePath)) File.Delete(tempFilePath);
            if (File.Exists(targetFilePath)) File.Delete(targetFilePath);
            return null;
        }
    }

    private static bool IsValidImageHeader(byte[] header)
    {
        // JPEG: FF D8 FF
        if (header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF)
            return true;

        // PNG: 89 50 4E 47 0D 0A 1A 0A
        if (header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47)
            return true;

        // WEBP: RIFF....WEBP
        if (header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46 &&
            header[8] == 0x57 && header[9] == 0x45 && header[10] == 0x42 && header[11] == 0x50)
            return true;

        return false;
    }

    private static bool IsPrivateSubnet(IPAddress ip)
    {
        if (ip.AddressFamily == AddressFamily.InterNetwork)
        {
            byte[] bytes = ip.GetAddressBytes();
            return bytes[0] switch
            {
                0 => true,                                                 // 0.0.0.0/8
                10 => true,                                                // 10.0.0.0/8
                127 => true,                                               // 127.0.0.0/8
                100 when bytes[1] >= 64 && bytes[1] <= 127 => true,       // 100.64.0.0/10 Carrier-Grade NAT
                172 when bytes[1] >= 16 && bytes[1] <= 31 => true,        // 172.16.0.0/12
                192 when bytes[1] == 168 => true,                         // 192.168.0.0/16 (Corretto bytes[1])
                169 when bytes[1] == 254 => true,                         // 169.254.0.0/16 Link-Local
                _ => false
            };
        }

        return ip.IsIPv6LinkLocal || ip.IsIPv6SiteLocal || IPAddress.IPv6Loopback.Equals(ip);
    }
    
    public void DeleteImage(string? imageUrl)
    {
        if (string.IsNullOrWhiteSpace(imageUrl)) return;

        try
        {
            string fileName = Path.GetFileName(imageUrl);
            string storageDir = Path.Combine(environment.ContentRootPath, "storage", "drinks");
            string filePath = Path.Combine(storageDir, fileName);

            if (File.Exists(filePath))
            {
                File.Delete(filePath);
                logger.LogInformation("Deleted orphan drink image: {FileName}", fileName);
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to delete orphan image at {Url}", imageUrl);
        }
    }
}