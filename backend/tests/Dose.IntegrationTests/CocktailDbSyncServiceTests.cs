using System.Net;
using System.Text;
using Dose.Application.Common.Interfaces;
using Dose.Application.Services;
using Dose.Infrastructure.Services;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;

namespace Dose.IntegrationTests;

public class CocktailDbSyncServiceTests
{
    [Fact]
    public async Task StartSyncShouldPreventConcurrentRunsAndStopGracefullyOnCancellation()
    {
        var tempRoot = Path.Combine(Path.GetTempPath(), $"dose-sync-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(tempRoot);

        try
        {
            using var lifetime = new FakeHostApplicationLifetime();
            var handler = new SlowFakeHttpMessageHandler();
            using var httpClient = new HttpClient(handler);
            var httpFactory = new FakeHttpClientFactory(httpClient);
            var env = new FakeWebHostEnvironment(tempRoot);
            var scopeFactory = new FakeServiceScopeFactory();
            var imageStorage = new FakeDrinkImageStorageService();
            var dateTimeProvider = new FakeDateTimeProvider();

            using var service = new CocktailDbSyncService(
                scopeFactory,
                imageStorage,
                new DrinkStrengthCalculator(),
                httpFactory,
                env,
                lifetime,
                dateTimeProvider,
                NullLogger<CocktailDbSyncService>.Instance);

            await service.StartAsync(CancellationToken.None);

            // First start succeeds, second concurrent call must be rejected
            service.StartSync().Should().BeTrue();
            service.StartSync().Should().BeFalse();
            service.GetStatus().IsRunning.Should().BeTrue();

            // Wait until the first HTTP call starts, then trigger graceful shutdown
            await handler.FirstRequestStarted.Task.WaitAsync(TimeSpan.FromSeconds(5));
            lifetime.TriggerStopping();
            await service.StopAsync(CancellationToken.None);

            var status = service.GetStatus();
            status.IsRunning.Should().BeFalse();
            status.LastError.Should().BeNull();
            status.CurrentLetter.Should().Be("Cancelled");
            status.CompletedAt.Should().NotBeNull();
        }
        finally
        {
            if (Directory.Exists(tempRoot))
                Directory.Delete(tempRoot, recursive: true);
        }
    }

    [Fact]
    public void StartSyncShouldReturnFalseWhenHostIsStopping()
    {
        using var lifetime = new FakeHostApplicationLifetime();
        lifetime.TriggerStopping();

        using var httpClient = new HttpClient(new SlowFakeHttpMessageHandler());
        using var service = new CocktailDbSyncService(
            new FakeServiceScopeFactory(),
            new FakeDrinkImageStorageService(),
            new DrinkStrengthCalculator(),
            new FakeHttpClientFactory(httpClient),
            new FakeWebHostEnvironment(Path.GetTempPath()),
            lifetime,
            new FakeDateTimeProvider(),
            NullLogger<CocktailDbSyncService>.Instance);

        service.StartSync().Should().BeFalse();
    }

    private sealed class SlowFakeHttpMessageHandler : HttpMessageHandler
    {
        public TaskCompletionSource FirstRequestStarted { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            FirstRequestStarted.TrySetResult();
            await Task.Delay(TimeSpan.FromSeconds(30), cancellationToken);
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("{\"drinks\":null}", Encoding.UTF8, "application/json")
            };
        }
    }

    private sealed class FakeHttpClientFactory(HttpClient client) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => client;
    }

    private sealed class FakeHostApplicationLifetime : IHostApplicationLifetime, IDisposable
    {
        private readonly CancellationTokenSource _stoppingCts = new();
        public CancellationToken ApplicationStarted => CancellationToken.None;
        public CancellationToken ApplicationStopping => _stoppingCts.Token;
        public CancellationToken ApplicationStopped => CancellationToken.None;
        public void StopApplication() => _stoppingCts.Cancel();
        public void TriggerStopping() => _stoppingCts.Cancel();
        public void Dispose() => _stoppingCts.Dispose();
    }

    private sealed class FakeWebHostEnvironment(string contentRootPath) : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "Dose.Api";
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string WebRootPath { get; set; } = contentRootPath;
        public string EnvironmentName { get; set; } = "Testing";
        public string ContentRootPath { get; set; } = contentRootPath;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }

    private sealed class FakeServiceScopeFactory : IServiceScopeFactory
    {
        public IServiceScope CreateScope() => throw new NotSupportedException();
    }

    private sealed class FakeDrinkImageStorageService : IDrinkImageStorageService
    {
        public Task<string?> DownloadAndSanitizeImageAsync(string sourceUrl, CancellationToken cancellationToken = default) =>
            Task.FromResult<string?>(null);

        public Task<string?> SaveAndSanitizeUploadedImageAsync(Stream fileStream, long contentLength, CancellationToken cancellationToken = default) =>
            Task.FromResult<string?>(null);

        public void DeleteImage(string? imageUrl) { }
    }

    private sealed class FakeDateTimeProvider : IDateTimeProvider
    {
        public DateTimeOffset UtcNow => new(2026, 11, 10, 12, 0, 0, TimeSpan.Zero);
    }
}
