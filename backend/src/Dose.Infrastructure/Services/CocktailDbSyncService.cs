using System.Collections.Concurrent;
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
    private static readonly ConcurrentDictionary<string, IngredientApiInfo> _ingredientCache = new(StringComparer.OrdinalIgnoreCase);

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

                            try
                            {
                                using var scope = scopeFactory.CreateScope();
                                var context = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();

                                string drinkName = apiDrink.StrDrink.Trim();
                                // Modifica all'interno di ExecuteHarvestingLoopAsync():
                                var existingDrink = await context.Drinks
                                    .Include(d => d.DrinkIngredients)
                                    .ThenInclude(di => di.Ingredient)
                                    .FirstOrDefaultAsync(d => d.Name.ToLower() == drinkName.ToLower() && d.CreatedByUserId == null);

                                string? storedLocalImagePath = null;
                                if (!string.IsNullOrWhiteSpace(apiDrink.StrDrinkThumb))
                                {
                                    storedLocalImagePath = await imageStorageService.DownloadAndSanitizeImageAsync(apiDrink.StrDrinkThumb);
                                    if (storedLocalImagePath != null) imagesDownloaded++;
                                    else failedImages++;
                                }

                                if (existingDrink != null)
                                {
                                    bool updatedAny = await SyncExistingDrinkAsync(existingDrink, apiDrink, storedLocalImagePath, client, context);
                                    if (updatedAny)
                                    {
                                        updated++;
                                        await context.SaveChangesAsync();
                                    }
                                }
                                else
                                {
                                    var newDrink = await CreateDrinkFromApiAsync(apiDrink, storedLocalImagePath, client, context);
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

    private async Task<bool> SyncExistingDrinkAsync(
        Drink existingDrink,
        TheCocktailDbDrink apiDrink,
        string? storedLocalImagePath,
        HttpClient client,
        IApplicationDbContext context)
    {
        string storageDir = Path.Combine(environment.ContentRootPath, "storage", "drinks");
        bool shouldUpdateImage = ShouldReplaceImage(existingDrink.ImageUrl, storageDir);
        string sanitizedGlass = SanitizeGlassType(apiDrink.StrGlass);

        bool changesMade = false;

        string targetImage = shouldUpdateImage && !string.IsNullOrWhiteSpace(storedLocalImagePath)
            ? storedLocalImagePath
            : existingDrink.ImageUrl;

        if (existingDrink.GlassType != sanitizedGlass || targetImage != existingDrink.ImageUrl)
        {
            existingDrink.UpdateDetails(
                existingDrink.Name,
                existingDrink.Description,
                existingDrink.PreparationStepsJson,
                sanitizedGlass,
                targetImage
            );
            changesMade = true;
        }

        // Verifica e aggiorna l'ABV degli ingredienti del drink
        var rawIngredients = ExtractIngredientsWithMeasures(apiDrink);
        foreach (var (ingName, _) in rawIngredients)
        {
            var meta = await ResolveIngredientMetadataAsync(ingName, apiDrink.StrAlcoholic, client);
            var dbIng = existingDrink.DrinkIngredients.FirstOrDefault(di => di.Ingredient.Name.Equals(ingName, StringComparison.OrdinalIgnoreCase))?.Ingredient
                ?? await context.Ingredients.FirstOrDefaultAsync(i => i.Name.ToLower() == ingName.ToLower());

            if (dbIng != null && (dbIng.Abv != meta.Abv || dbIng.Category != meta.Category))
            {
                dbIng.SetDetails(dbIng.Name, meta.Category, meta.SubCategory, meta.Abv, dbIng.Flavor);
                changesMade = true;
            }
        }

        // Ricalcola le metriche per correggere valori sballati (es. 40% su birre o 165g di etanolo)
        var components = existingDrink.DrinkIngredients
            .Select(di => new RecipeComponentInput(di.Ingredient.Category, di.AmountCl, di.Ingredient.Abv))
            .ToList();

        var metrics = strengthCalculator.CalculateMetrics(components);
        if (existingDrink.CachedAbv != metrics.FinalAbvPercent || existingDrink.CachedPureAlcoholGrams != metrics.PureAlcohol.Grams)
        {
            existingDrink.UpdateCachedMetrics(metrics);
            changesMade = true;
        }

        return changesMade;
    }

    private async Task<Drink?> CreateDrinkFromApiAsync(
        TheCocktailDbDrink apiDrink,
        string? localImageUrl,
        HttpClient client,
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
        string glassType = SanitizeGlassType(apiDrink.StrGlass);

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

            var meta = await ResolveIngredientMetadataAsync(ingName, apiDrink.StrAlcoholic, client);

            var dbIngredient = await context.Ingredients
                .FirstOrDefaultAsync(i => i.Name.ToLower() == ingName.ToLower());

            if (dbIngredient == null)
            {
                dbIngredient = new Ingredient(
                    name: ingName,
                    category: meta.Category,
                    subCategory: meta.SubCategory,
                    abv: meta.Abv,
                    flavor: null,
                    isAvailableInBar: false,
                    description: $"Imported from TheCocktailDB for {apiDrink.StrDrink}"
                );
                await context.Ingredients.AddAsync(dbIngredient);
                await context.SaveChangesAsync();
            }
            else if (dbIngredient.Abv != meta.Abv || dbIngredient.Category != meta.Category)
            {
                dbIngredient.SetDetails(dbIngredient.Name, meta.Category, meta.SubCategory, meta.Abv, dbIngredient.Flavor);
            }

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

        var componentsToCalculate = drink.DrinkIngredients
            .Select(di => new RecipeComponentInput(di.Ingredient.Category, di.AmountCl, di.Ingredient.Abv))
            .ToList();

        var metrics = strengthCalculator.CalculateMetrics(componentsToCalculate);
        drink.UpdateCachedMetrics(metrics);

        return drink;
    }

    private async Task<IngredientApiInfo> ResolveIngredientMetadataAsync(
        string name,
        string? drinkAlcoholicStr,
        HttpClient client)
    {
        string key = name.Trim().ToLowerInvariant();
        if (_ingredientCache.TryGetValue(key, out var cached))
            return cached;

        // 1. Interroga l'API di TheCocktailDB per ottenere strAlcohol e strABV reale
        try
        {
            string url = $"https://www.thecocktaildb.com/api/json/v1/1/search.php?i={Uri.EscapeDataString(name.Trim())}";
            string? json = await client.GetStringAsync(url);

            if (!string.IsNullOrWhiteSpace(json))
            {
                var res = JsonSerializer.Deserialize<TheCocktailDbIngredientResponse>(json);
                var item = res?.Ingredients?.FirstOrDefault();
                if (item != null)
                {
                    bool isAlcohol = string.Equals(item.StrAlcohol, "Yes", StringComparison.OrdinalIgnoreCase);
                    decimal abv = 0.00m;

                    if (isAlcohol && !string.IsNullOrWhiteSpace(item.StrABV) &&
                        decimal.TryParse(item.StrABV, NumberStyles.Any, CultureInfo.InvariantCulture, out decimal parsedAbv))
                    {
                        abv = Math.Clamp(parsedAbv, 0.00m, 96.00m);
                    }

                    if (isAlcohol && abv == 0)
                    {
                        abv = DeduceAlcoholicFallbackAbv(name, item.StrType);
                    }

                    var (cat, subCat) = DetermineCategoryAndSubCategory(name, item.StrType, isAlcohol, abv);

                    var resolved = new IngredientApiInfo(name.Trim(), cat, subCat, abv);
                    _ingredientCache[key] = resolved;
                    return resolved;
                }
            }
        }
        catch (Exception ex)
        {
            logger.LogDebug(ex, "Could not fetch ingredient info for {Name} from API, using fallback", name);
        }

        // 2. Fallback euristico avanzato se l'ingrediente non è nel DB degli ingredienti dell'API
        var fallback = DeduceCategoryAndAbv(name, drinkAlcoholicStr);
        var fallbackInfo = new IngredientApiInfo(name.Trim(), fallback.Category, fallback.SubCategory, fallback.Abv);
        _ingredientCache[key] = fallbackInfo;
        return fallbackInfo;
    }

    private static (IngredientCategory Category, string SubCategory) DetermineCategoryAndSubCategory(
        string name,
        string? strType,
        bool isAlcohol,
        decimal abv)
    {
        string lowerName = name.ToLowerInvariant();
        string lowerType = (strType ?? "").ToLowerInvariant();

        if (!isAlcohol || abv <= 0)
        {
            if (lowerName.Contains("syrup") || lowerName.Contains("sugar") || lowerName.Contains("honey") || lowerType.Contains("syrup"))
                return (IngredientCategory.Syrup, "Syrup");

            if (lowerName.Contains("leaves") || lowerName.Contains("peel") || lowerName.Contains("cherry") ||
                lowerName.Contains("olive") || lowerName.Contains("slice") || lowerName.Contains("wedge") || lowerName.Contains("twist"))
                return (IngredientCategory.Garnish, "Garnish");

            return (IngredientCategory.Mixer, !string.IsNullOrWhiteSpace(strType) ? strType.Trim() : "Mixer");
        }

        // Alcolico: ABV > 0
        if (lowerName.Contains("beer") || lowerName.Contains("lager") || lowerName.Contains("ale") ||
            lowerName.Contains("stout") || lowerName.Contains("cider") || lowerName.Contains("pilsner") || lowerType.Contains("beer"))
            return (IngredientCategory.Beer, "Beer");

        if (lowerName.Contains("wine") || lowerName.Contains("prosecco") || lowerName.Contains("champagne") ||
            lowerName.Contains("vermouth") || lowerName.Contains("port") || lowerName.Contains("sherry") || lowerType.Contains("wine"))
            return (IngredientCategory.Wine, "Wine");

        if (lowerName.Contains("liqueur") || lowerName.Contains("schnapps") || lowerName.Contains("curacao") ||
            lowerName.Contains("amaretto") || lowerName.Contains("triple sec") || lowerName.Contains("bitter") ||
            lowerType.Contains("liqueur") || abv <= 28)
            return (IngredientCategory.Liqueur, !string.IsNullOrWhiteSpace(strType) ? strType.Trim() : "Liqueur");

        return (IngredientCategory.Spirit, !string.IsNullOrWhiteSpace(strType) ? strType.Trim() : "Spirit");
    }

    private static decimal DeduceAlcoholicFallbackAbv(string name, string? strType)
    {
        string lower = (name + " " + (strType ?? "")).ToLowerInvariant();
        if (lower.Contains("beer") || lower.Contains("lager") || lower.Contains("ale") || lower.Contains("stout") || lower.Contains("cider"))
            return 5.00m;
        if (lower.Contains("wine") || lower.Contains("vermouth") || lower.Contains("champagne") || lower.Contains("prosecco"))
            return 14.00m;
        if (lower.Contains("liqueur") || lower.Contains("schnapps") || lower.Contains("curacao") || lower.Contains("amaretto"))
            return 20.00m;

        return 40.00m;
    }

    private static (IngredientCategory Category, string SubCategory, decimal Abv) DeduceCategoryAndAbv(
        string name,
        string? alcoholicStr)
    {
        string lower = name.ToLowerInvariant();
        bool isNonAlcoholicDrink = string.Equals(alcoholicStr, "Non alcoholic", StringComparison.OrdinalIgnoreCase);

        // Tutti gli ingredienti analcolici (ABV = 0)
        if (isNonAlcoholicDrink ||
            lower.Contains("juice") || lower.Contains("syrup") || lower.Contains("soda") || lower.Contains("water") ||
            lower.Contains("cola") || lower.Contains("milk") || lower.Contains("tea") || lower.Contains("coffee") ||
            lower.Contains("tonic") || lower.Contains("sprite") || lower.Contains("sauce") || lower.Contains("sugar") ||
            lower.Contains("salt") || lower.Contains("pepper") || lower.Contains("tabasco") || lower.Contains("worcestershire") ||
            lower.Contains("lemon") || lower.Contains("lime") || lower.Contains("orange") || lower.Contains("mint") ||
            lower.Contains("cherry") || lower.Contains("ice") || lower.Contains("egg") || lower.Contains("cream") ||
            lower.Contains("cinnamon") || lower.Contains("nutmeg") || lower.Contains("vanilla") || lower.Contains("ginger"))
        {
            var cat = lower.Contains("syrup") || lower.Contains("sugar") ? IngredientCategory.Syrup : IngredientCategory.Mixer;
            return (cat, name, 0.00m);
        }

        // Birre
        if (lower.Contains("beer") || lower.Contains("lager") || lower.Contains("pilsner") || lower.Contains("stout") ||
            lower.Contains("ale") || lower.Contains("cider") || lower.Contains("guinness") || lower.Contains("corona"))
            return (IngredientCategory.Beer, "Beer", 5.00m);

        // Vini
        if (lower.Contains("wine") || lower.Contains("vermouth") || lower.Contains("champagne") || lower.Contains("prosecco") ||
            lower.Contains("port") || lower.Contains("sherry") || lower.Contains("cava") || lower.Contains("sake"))
            return (IngredientCategory.Wine, "Wine", 14.00m);

        // Liquori
        if (lower.Contains("liqueur") || lower.Contains("schnapps") || lower.Contains("curacao") || lower.Contains("amaretto") ||
            lower.Contains("kahlua") || lower.Contains("cointreau") || lower.Contains("triple sec") || lower.Contains("baileys") ||
            lower.Contains("campari") || lower.Contains("aperol") || lower.Contains("sambuca") || lower.Contains("creme") ||
            lower.Contains("chambord") || lower.Contains("frangelico") || lower.Contains("midori") || lower.Contains("galliano"))
            return (IngredientCategory.Liqueur, "Liqueur", 20.00m);

        // Distillati
        if (lower.Contains("tequila") || lower.Contains("mezcal")) return (IngredientCategory.Spirit, "Tequila", 38.00m);
        if (lower.Contains("vodka")) return (IngredientCategory.Spirit, "Vodka", 40.00m);
        if (lower.Contains("gin")) return (IngredientCategory.Spirit, "Gin", 40.00m);
        if (lower.Contains("rum")) return (IngredientCategory.Spirit, "Rum", 40.00m);
        if (lower.Contains("whiskey") || lower.Contains("bourbon") || lower.Contains("scotch")) return (IngredientCategory.Spirit, "Whiskey", 40.00m);
        if (lower.Contains("brandy") || lower.Contains("cognac")) return (IngredientCategory.Spirit, "Brandy", 40.00m);

        return (IngredientCategory.Spirit, "Spirit", 40.00m);
    }

    private static string SanitizeGlassType(string? rawGlass)
    {
        if (string.IsNullOrWhiteSpace(rawGlass)) return "Highball Glass";
        string g = rawGlass.Trim();

        // Rimuove doppi suffissi es. "Beer Glass Glass"
        g = Regex.Replace(g, @"\bglass\s+glass\b", "Glass", RegexOptions.IgnoreCase);

        var words = g.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        string capitalized = string.Join(" ", words.Select(w =>
            w.Equals("and", StringComparison.OrdinalIgnoreCase) ? "&" : char.ToUpperInvariant(w[0]) + w[1..].ToLowerInvariant()));

        if (capitalized.EndsWith("glass", StringComparison.OrdinalIgnoreCase) && !capitalized.EndsWith("Glass"))
        {
            capitalized = capitalized[..^5] + "Glass";
        }

        return capitalized;
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

    private static bool ShouldReplaceImage(string? currentUrl, string storageDirectory)
    {
        if (string.IsNullOrWhiteSpace(currentUrl)) return true;
        if (currentUrl.Contains("placeholder", StringComparison.OrdinalIgnoreCase)) return true;
        if (currentUrl.StartsWith("http", StringComparison.OrdinalIgnoreCase)) return true;
        if (currentUrl.StartsWith("/images/", StringComparison.OrdinalIgnoreCase)) return true;

        if (currentUrl.Contains("/storage/drinks/"))
        {
            string fileName = Path.GetFileName(currentUrl);
            string physicalPath = Path.Combine(storageDirectory, fileName);
            if (!File.Exists(physicalPath)) return true;
        }

        return false;
    }

    private sealed record IngredientApiInfo(string Name, IngredientCategory Category, string SubCategory, decimal Abv);

    private sealed class TheCocktailDbResponse
    {
        [JsonPropertyName("drinks")]
        public List<TheCocktailDbDrink>? Drinks { get; set; }
    }

    private sealed class TheCocktailDbIngredientResponse
    {
        [JsonPropertyName("ingredients")]
        public List<TheCocktailDbIngredientDto>? Ingredients { get; set; }
    }

    private sealed class TheCocktailDbIngredientDto
    {
        [JsonPropertyName("idIngredient")] public string? IdIngredient { get; set; }
        [JsonPropertyName("strIngredient")] public string? StrIngredient { get; set; }
        [JsonPropertyName("strDescription")] public string? StrDescription { get; set; }
        [JsonPropertyName("strType")] public string? StrType { get; set; }
        [JsonPropertyName("strAlcohol")] public string? StrAlcohol { get; set; }
        [JsonPropertyName("strABV")] public string? StrABV { get; set; }
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
}