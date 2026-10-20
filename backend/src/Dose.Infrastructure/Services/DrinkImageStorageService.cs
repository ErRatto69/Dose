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

        // 2. SSRF Mitigation: Prevent loopback/private subnet probing
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
        catch (Exception ex)
        {
            logger.LogWarning(ex, "DNS resolution failed for {Host}", uri.Host);
            return null;
        }

        // 3. Download image stream with size guard
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
        using var memoryStream = new MemoryStream();
        await rawStream.CopyToAsync(memoryStream, cancellationToken);

        if (memoryStream.Length > MaxAllowedFileSizeBytes || memoryStream.Length < 16)
        {
            logger.LogWarning("Downloaded payload size invalid ({Bytes} bytes)", memoryStream.Length);
            return null;
        }

        memoryStream.Position = 0;

        // 4. Validate Magic Bytes
        byte[] header = new byte[12];
        _ = await memoryStream.ReadAsync(header.AsMemory(0, 12), cancellationToken);
        memoryStream.Position = 0;

        if (!IsValidImageHeader(header))
        {
            logger.LogWarning("Magic bytes mismatch for image from {Url}", sourceUrl);
            return null;
        }

        // 5. Decode, Strip Metadata & Re-encode into WebP using ImageSharp
        string fileName = $"{Guid.NewGuid():N}.webp";
        string storageDir = Path.Combine(environment.ContentRootPath, "storage", "drinks");
        Directory.CreateDirectory(storageDir);

        string targetFilePath = Path.Combine(storageDir, fileName);

        try
        {
            using var image = await Image.LoadAsync(memoryStream, cancellationToken);

            image.Mutate(ctx => ctx
                .Resize(new ResizeOptions
                {
                    Size = new Size(800, 800),
                    Mode = ResizeMode.Crop,
                    Position = AnchorPositionMode.Center
                }));

            // Strip metadata by creating a pure WebP encoder without EXIF
            var encoder = new WebpEncoder
            {
                Quality = 80,
                FileFormat = WebpFileFormatType.Lossy
            };

            await image.SaveAsync(targetFilePath, encoder, cancellationToken);

            // Return relative client URL
            return $"/storage/drinks/{fileName}";
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "ImageSharp failed to process or sanitize image from {Url}", sourceUrl);
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
                10 => true,
                172 when bytes[1] >= 16 && bytes[1] <= 31 => true,
                192 when bytes[2] == 168 => true,
                169 when bytes[1] == 254 => true, // Link-local
                _ => false
            };
        }

        return ip.IsIPv6LinkLocal || ip.IsIPv6SiteLocal;
    }
}