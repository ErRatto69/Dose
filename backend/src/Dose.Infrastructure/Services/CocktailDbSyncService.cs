using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Dose.Application.Common.Interfaces;
using Dose.Application.Features.Admin.Dtos;
using Dose.Application.Services;
using Dose.Domain.Entities;
using Dose.Domain.Enums;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Dose.Infrastructure.Services;

public partial class CocktailDbSyncService(
    IServiceScopeFactory scopeFactory,
    IDrinkImageStorageService imageStorageService,
    IDrinkStrengthCalculator strengthCalculator,
    IHttpClientFactory httpClientFactory,
    IWebHostEnvironment environment,
    ILogger<CocktailDbSyncService> logger) : ICocktailDbSyncService
{
    private static readonly object SyncLock = new();
    private static CocktailDbSyncStatusDto _status = new(
        IsRunning: false,
        CurrentLetter: "",
        ProcessedDrinks: 0,
        NewDrinksAdded: 0,
        ExistingDrinksUpdated: 0,
        ImagesDownloaded: 0,
        FailedImages: 0,
        LastError: null,
        StartedAt: null,
        CompletedAt: null
    );

    public CocktailDbSyncStatusDto GetStatus() => _status;

    public bool StartSync()
    {
        lock (SyncLock)
        {
            if (_status.IsRunning) return false;

            _status = new CocktailDbSyncStatusDto(
                IsRunning: true,
                CurrentLetter: "Starting...",
                ProcessedDrinks: 0,
                NewDrinksAdded: 0,
                ExistingDrinksUpdated: 0,
                ImagesDownloaded: 0,
                FailedImages: 0,
                LastError: null,
                StartedAt: DateTimeOffset.UtcNow,
                CompletedAt: null
            );

            _ = Task.Run(ExecuteHarvestingLoopAsync);
            return true;
        }
    }

    private async Task ExecuteHarvestingLoopAsync()
    {
        var characters = "abcdefghijklmnopqrstuvwxyz0123456789".ToCharArray();
        var client = httpClientFactory.CreateClient("CocktailDbClient");

        int processed = 0;
        int added = 0;
        int updated = 0;
        int imagesDownloaded = 0;
        int failedImages = 0;

        try
        {
            foreach (char ch in characters)
            {
                string letter = ch.ToString();
                lock (SyncLock)
                {
                    _status = _status with { CurrentLetter = letter };
                }

                string url = $"https://www.thecocktaildb.com/api/json/v1/1/search.php?f={letter}";
                string? json = null;

                try
                {
                    json = await client.GetStringAsync(url);
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Failed fetching letter {Letter} from TheCocktailDB", letter);
                }

                if (!string.IsNullOrWhiteSpace(json))
                {
                    var response = JsonSerializer.Deserialize<TheCocktailDbResponse>(json);
                    if (response?.Drinks is { Count: > 0 })
                    {
                        foreach (var apiDrink in response.Drinks)
                        {
                            processed++;

                            // Individual try-catch per drink so one malformed recipe never stops the sync
                            try
                            {
                                using var scope = scopeFactory.CreateScope();
                                var context = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();

                                string drinkName = apiDrink.StrDrink.Trim();
                                var existingDrink = await context.Drinks
                                    .FirstOrDefaultAsync(d => d.Name.ToLower() == drinkName.ToLower());

                                string? storedLocalImagePath = null;
                                if (!string.IsNullOrWhiteSpace(apiDrink.StrDrinkThumb))
                                {
                                    storedLocalImagePath = await imageStorageService.DownloadAndSanitizeImageAsync(apiDrink.StrDrinkThumb);
                                    if (storedLocalImagePath != null) imagesDownloaded++;
                                    else failedImages++;
                                }

                                if (existingDrink != null)
                                {
                                    string storageDir = Path.Combine(environment.ContentRootPath, "storage", "drinks");
                                    bool shouldUpdate = ShouldReplaceImage(existingDrink.ImageUrl, storageDir);

                                    if (!string.IsNullOrWhiteSpace(storedLocalImagePath) && shouldUpdate)
                                    {
                                        existingDrink.UpdateDetails(
                                            existingDrink.Name,
                                            existingDrink.Description,
                                            existingDrink.PreparationStepsJson,
                                            existingDrink.GlassType,
                                            storedLocalImagePath
                                        );
                                        updated++;
                                        await context.SaveChangesAsync();
                                    }
                                }
                                else
                                {
                                    var newDrink = await CreateDrinkFromApiAsync(apiDrink, storedLocalImagePath, context);
                                    if (newDrink != null)
                                    {
                                        await context.Drinks.AddAsync(newDrink);
                                        await context.SaveChangesAsync();
                                        added++;
                                    }
                                }
                            }
                            catch (Exception ex)
                            {
                                logger.LogWarning(ex, "Skipping drink '{DrinkName}' due to import error", apiDrink.StrDrink);
                            }

                            lock (SyncLock)
                            {
                                _status = _status with
                                {
                                    ProcessedDrinks = processed,
                                    NewDrinksAdded = added,
                                    ExistingDrinksUpdated = updated,
                                    ImagesDownloaded = imagesDownloaded,
                                    FailedImages = failedImages
                                };
                            }
                        }
                    }
                }

                // Respectful rate limit to avoid 429 Too Many Requests
                await Task.Delay(200);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled error during TheCocktailDB synchronization loop");
            lock (SyncLock)
            {
                _status = _status with { LastError = ex.Message };
            }
        }
        finally
        {
            lock (SyncLock)
            {
                _status = _status with
                {
                    IsRunning = false,
                    CurrentLetter = "Done",
                    CompletedAt = DateTimeOffset.UtcNow
                };
            }
            logger.LogInformation("TheCocktailDB sync finished. Processed: {P}, Added: {A}, Updated: {U}, Images: {I}", processed, added, updated, imagesDownloaded);
        }
    }

    private async Task<Drink?> CreateDrinkFromApiAsync(
        TheCocktailDbDrink apiDrink,
        string? localImageUrl,
        IApplicationDbContext context)
    {
        string instructions = !string.IsNullOrWhiteSpace(apiDrink.StrInstructions)
            ? apiDrink.StrInstructions.Trim()
            : "Mix all ingredients and serve.";

        var stepsList = instructions
            .Split(new[] { "\r\n", "\n", ". " }, StringSplitOptions.RemoveEmptyEntries)
            .Select(s => s.Trim().TrimEnd('.'))
            .Where(s => s.Length > 2)
            .ToList();

        if (stepsList.Count == 0) stepsList.Add(instructions);

        string stepsJson = JsonSerializer.Serialize(stepsList);
        string glassType = !string.IsNullOrWhiteSpace(apiDrink.StrGlass) ? apiDrink.StrGlass.Trim() : "Highball";

        var rawIngredients = ExtractIngredientsWithMeasures(apiDrink);
        if (rawIngredients.Count == 0) return null;

        var drink = new Drink(
            name: apiDrink.StrDrink.Trim(),
            description: $"{apiDrink.StrCategory ?? "Cocktail"} ({apiDrink.StrAlcoholic ?? "Alcoholic"}). {stepsList.FirstOrDefault() ?? "Classic mixed drink."}",
            preparationStepsJson: stepsJson,
            glassType: glassType,
            imageUrl: localImageUrl
        );

        short order = 1;

        foreach (var (ingName, measureStr) in rawIngredients)
        {
            var (amountCl, note) = ParseMeasureToCl(measureStr);

            var dbIngredient = await context.Ingredients
                .FirstOrDefaultAsync(i => i.Name.ToLower() == ingName.ToLower());

            if (dbIngredient == null)
            {
                var (cat, subCat, abv) = DeduceCategoryAndAbv(ingName, apiDrink.StrAlcoholic);
                dbIngredient = new Ingredient(
                    name: ingName,
                    category: cat,
                    subCategory: subCat,
                    abv: abv,
                    flavor: null,
                    isAvailableInBar: false,
                    description: $"Imported from TheCocktailDB for {apiDrink.StrDrink}"
                );
                await context.Ingredients.AddAsync(dbIngredient);
                await context.SaveChangesAsync();
            }

            // CRITICAL FIX: Deduplicate ingredients for the same drink to respect PK {DrinkId, IngredientId}
            var existingLink = drink.DrinkIngredients.FirstOrDefault(di => di.IngredientId == dbIngredient.Id);
            if (existingLink != null)
            {
                decimal newTotalAmount = existingLink.AmountCl + amountCl;
                string? mergedNotes = string.Join("; ", new[] { existingLink.DisplayUnitNote, note }.Where(n => !string.IsNullOrWhiteSpace(n)));
                existingLink.UpdateDose(
                    newTotalAmount,
                    string.IsNullOrWhiteSpace(mergedNotes) ? null : mergedNotes,
                    existingLink.IsOptional && (dbIngredient.Category == IngredientCategory.Garnish || amountCl == 0),
                    existingLink.SortOrder
                );
            }
            else
            {
                var link = new DrinkIngredient(
                    drinkId: drink.Id,
                    ingredient: dbIngredient,
                    amountCl: amountCl,
                    displayUnitNote: note,
                    isOptional: dbIngredient.Category == IngredientCategory.Garnish || amountCl == 0,
                    sortOrder: order++
                );
                drink.DrinkIngredients.Add(link);
            }
        }

        // Calculate metrics using deduplicated ingredients
        var componentsToCalculate = drink.DrinkIngredients
            .Select(di => new RecipeComponentInput(di.Ingredient.Category, di.AmountCl, di.Ingredient.Abv))
            .ToList();

        var metrics = strengthCalculator.CalculateMetrics(componentsToCalculate);
        drink.UpdateCachedMetrics(metrics);

        return drink;
    }

    private static List<(string Ingredient, string? Measure)> ExtractIngredientsWithMeasures(TheCocktailDbDrink d)
    {
        var list = new List<(string, string?)>();
        void AddIfPresent(string? name, string? measure)
        {
            if (!string.IsNullOrWhiteSpace(name))
                list.Add((name.Trim(), string.IsNullOrWhiteSpace(measure) ? null : measure.Trim()));
        }

        AddIfPresent(d.StrIngredient1, d.StrMeasure1);
        AddIfPresent(d.StrIngredient2, d.StrMeasure2);
        AddIfPresent(d.StrIngredient3, d.StrMeasure3);
        AddIfPresent(d.StrIngredient4, d.StrMeasure4);
        AddIfPresent(d.StrIngredient5, d.StrMeasure5);
        AddIfPresent(d.StrIngredient6, d.StrMeasure6);
        AddIfPresent(d.StrIngredient7, d.StrMeasure7);
        AddIfPresent(d.StrIngredient8, d.StrMeasure8);
        AddIfPresent(d.StrIngredient9, d.StrMeasure9);
        AddIfPresent(d.StrIngredient10, d.StrMeasure10);
        AddIfPresent(d.StrIngredient11, d.StrMeasure11);
        AddIfPresent(d.StrIngredient12, d.StrMeasure12);
        AddIfPresent(d.StrIngredient13, d.StrMeasure13);
        AddIfPresent(d.StrIngredient14, d.StrMeasure14);
        AddIfPresent(d.StrIngredient15, d.StrMeasure15);

        return list;
    }

    private static (decimal AmountCl, string? Note) ParseMeasureToCl(string? rawMeasure)
    {
        if (string.IsNullOrWhiteSpace(rawMeasure))
            return (0.00m, null);

        string lower = rawMeasure.Trim().ToLowerInvariant();

        if (lower.Contains("dash") || lower.Contains("drop") || lower.Contains("splash") || lower.Contains("pinch"))
            return (0.10m, rawMeasure);

        if (lower.Contains("tsp") || lower.Contains("barspoon") || lower.Contains("teaspoon"))
            return (0.50m, rawMeasure);

        if (lower.Contains("tblsp") || lower.Contains("tbsp") || lower.Contains("tablespoon"))
            return (1.50m, rawMeasure);

        var clMatch = Regex.Match(lower, @"^([\d\.\/\s]+)\s*cl");
        if (clMatch.Success && TryParseQuantity(clMatch.Groups[1].Value, out decimal clVal))
            return (Math.Round(clVal, 2), null);

        var mlMatch = Regex.Match(lower, @"^([\d\.\/\s]+)\s*ml");
        if (mlMatch.Success && TryParseQuantity(mlMatch.Groups[1].Value, out decimal mlVal))
            return (Math.Round(mlVal / 10m, 2), null);

        var ozMatch = Regex.Match(lower, @"^([\d\.\/\s]+)\s*(?:oz|fl oz|ounce)");
        if (ozMatch.Success && TryParseQuantity(ozMatch.Groups[1].Value, out decimal ozVal))
            return (Math.Round(ozVal * 3.0m, 2), null);

        var numberMatch = Regex.Match(lower, @"^([\d\.\/\s]+)");
        if (numberMatch.Success && TryParseQuantity(numberMatch.Groups[1].Value, out decimal numVal))
        {
            if (lower.Contains("part") || lower.Contains("shot"))
                return (Math.Round(numVal * 3.0m, 2), rawMeasure);

            return (Math.Round(numVal, 2), rawMeasure);
        }

        return (0.00m, rawMeasure);
    }

    private static bool TryParseQuantity(string text, out decimal result)
    {
        result = 0m;
        text = text.Trim();

        var parts = text.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        decimal sum = 0m;

        foreach (var p in parts)
        {
            if (p.Contains('/'))
            {
                var fParts = p.Split('/');
                if (fParts.Length == 2 &&
                    decimal.TryParse(fParts[0], NumberStyles.Any, CultureInfo.InvariantCulture, out decimal num) &&
                    decimal.TryParse(fParts[1], NumberStyles.Any, CultureInfo.InvariantCulture, out decimal den) &&
                    den != 0)
                {
                    sum += num / den;
                }
            }
            else if (decimal.TryParse(p, NumberStyles.Any, CultureInfo.InvariantCulture, out decimal val))
            {
                sum += val;
            }
            else
            {
                return false;
            }
        }

        result = sum;
        return sum > 0;
    }

    private static (IngredientCategory Category, string SubCategory, decimal Abv) DeduceCategoryAndAbv(
        string name,
        string? alcoholicStr)
    {
        string lower = name.ToLowerInvariant();
        bool isNonAlcoholicDrink = string.Equals(alcoholicStr, "Non alcoholic", StringComparison.OrdinalIgnoreCase);

        if (isNonAlcoholicDrink || lower.Contains("juice") || lower.Contains("syrup") || lower.Contains("soda") || lower.Contains("water") || lower.Contains("cola") || lower.Contains("milk") || lower.Contains("tea") || lower.Contains("coffee"))
        {
            var cat = lower.Contains("syrup") ? IngredientCategory.Syrup : IngredientCategory.Mixer;
            return (cat, name, 0.00m);
        }

        if (lower.Contains("vodka")) return (IngredientCategory.Spirit, "Vodka", 40.00m);
        if (lower.Contains("gin")) return (IngredientCategory.Spirit, "Gin", 40.00m);
        if (lower.Contains("rum")) return (IngredientCategory.Spirit, "Rum", 40.00m);
        if (lower.Contains("tequila")) return (IngredientCategory.Spirit, "Tequila", 38.00m);
        if (lower.Contains("whiskey") || lower.Contains("bourbon") || lower.Contains("scotch")) return (IngredientCategory.Spirit, "Whiskey", 40.00m);
        if (lower.Contains("liqueur") || lower.Contains("schnapps") || lower.Contains("curacao") || lower.Contains("amaretto") || lower.Contains("kahlua")) return (IngredientCategory.Liqueur, "Liqueur", 24.00m);
        if (lower.Contains("wine") || lower.Contains("vermouth") || lower.Contains("champagne") || lower.Contains("prosecco")) return (IngredientCategory.Wine, "Wine", 14.00m);
        if (lower.Contains("beer") || lower.Contains("ale") || lower.Contains("cider")) return (IngredientCategory.Beer, "Beer", 5.00m);

        return (IngredientCategory.Spirit, "Spirit", 40.00m);
    }

    private sealed class TheCocktailDbResponse
    {
        [JsonPropertyName("drinks")]
        public List<TheCocktailDbDrink>? Drinks { get; set; }
    }

    private sealed class TheCocktailDbDrink
    {
        [JsonPropertyName("idDrink")] public string? IdDrink { get; set; }
        [JsonPropertyName("strDrink")] public string StrDrink { get; set; } = null!;
        [JsonPropertyName("strCategory")] public string? StrCategory { get; set; }
        [JsonPropertyName("strAlcoholic")] public string? StrAlcoholic { get; set; }
        [JsonPropertyName("strGlass")] public string? StrGlass { get; set; }
        [JsonPropertyName("strInstructions")] public string? StrInstructions { get; set; }
        [JsonPropertyName("strDrinkThumb")] public string? StrDrinkThumb { get; set; }

        [JsonPropertyName("strIngredient1")] public string? StrIngredient1 { get; set; }
        [JsonPropertyName("strIngredient2")] public string? StrIngredient2 { get; set; }
        [JsonPropertyName("strIngredient3")] public string? StrIngredient3 { get; set; }
        [JsonPropertyName("strIngredient4")] public string? StrIngredient4 { get; set; }
        [JsonPropertyName("strIngredient5")] public string? StrIngredient5 { get; set; }
        [JsonPropertyName("strIngredient6")] public string? StrIngredient6 { get; set; }
        [JsonPropertyName("strIngredient7")] public string? StrIngredient7 { get; set; }
        [JsonPropertyName("strIngredient8")] public string? StrIngredient8 { get; set; }
        [JsonPropertyName("strIngredient9")] public string? StrIngredient9 { get; set; }
        [JsonPropertyName("strIngredient10")] public string? StrIngredient10 { get; set; }
        [JsonPropertyName("strIngredient11")] public string? StrIngredient11 { get; set; }
        [JsonPropertyName("strIngredient12")] public string? StrIngredient12 { get; set; }
        [JsonPropertyName("strIngredient13")] public string? StrIngredient13 { get; set; }
        [JsonPropertyName("strIngredient14")] public string? StrIngredient14 { get; set; }
        [JsonPropertyName("strIngredient15")] public string? StrIngredient15 { get; set; }

        [JsonPropertyName("strMeasure1")] public string? StrMeasure1 { get; set; }
        [JsonPropertyName("strMeasure2")] public string? StrMeasure2 { get; set; }
        [JsonPropertyName("strMeasure3")] public string? StrMeasure3 { get; set; }
        [JsonPropertyName("strMeasure4")] public string? StrMeasure4 { get; set; }
        [JsonPropertyName("strMeasure5")] public string? StrMeasure5 { get; set; }
        [JsonPropertyName("strMeasure6")] public string? StrMeasure6 { get; set; }
        [JsonPropertyName("strMeasure7")] public string? StrMeasure7 { get; set; }
        [JsonPropertyName("strMeasure8")] public string? StrMeasure8 { get; set; }
        [JsonPropertyName("strMeasure9")] public string? StrMeasure9 { get; set; }
        [JsonPropertyName("strMeasure10")] public string? StrMeasure10 { get; set; }
        [JsonPropertyName("strMeasure11")] public string? StrMeasure11 { get; set; }
        [JsonPropertyName("strMeasure12")] public string? StrMeasure12 { get; set; }
        [JsonPropertyName("strMeasure13")] public string? StrMeasure13 { get; set; }
        [JsonPropertyName("strMeasure14")] public string? StrMeasure14 { get; set; }
        [JsonPropertyName("strMeasure15")] public string? StrMeasure15 { get; set; }
    }
    
    private static bool ShouldReplaceImage(string? currentUrl, string storageDirectory)
    {
        if (string.IsNullOrWhiteSpace(currentUrl)) return true;
        if (currentUrl.Contains("placeholder", StringComparison.OrdinalIgnoreCase)) return true;
        if (currentUrl.StartsWith("http", StringComparison.OrdinalIgnoreCase)) return true;
        if (currentUrl.StartsWith("/images/", StringComparison.OrdinalIgnoreCase)) return true;

        // Se punta a /storage/drinks ma il file fisico è assente sul filesystem del container
        if (currentUrl.Contains("/storage/drinks/"))
        {
            string fileName = Path.GetFileName(currentUrl);
            string physicalPath = Path.Combine(storageDirectory, fileName);
            if (!File.Exists(physicalPath)) return true;
        }

        return false;
    }
}