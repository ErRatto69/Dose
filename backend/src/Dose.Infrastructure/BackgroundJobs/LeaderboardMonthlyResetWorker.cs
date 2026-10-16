using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Dose.Infrastructure.BackgroundJobs;

public class LeaderboardMonthlyResetWorker(ILogger<LeaderboardMonthlyResetWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Leaderboard monthly reset worker started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            DateTime now = DateTime.UtcNow;
            DateTime nextMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(1);
            TimeSpan delay = nextMonth - now;

            try
            {
                await Task.Delay(delay, stoppingToken);

                logger.LogInformation("New month detected ({NewMonth}). Leaderboard period rolling active.", nextMonth.ToString("yyyy-MM"));
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }
}