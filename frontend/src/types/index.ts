export type UserRole = 'Admin' | 'Bartender' | 'Drinker';

export type BiologicalSex = 'Male' | 'Female';

export type IngredientCategory =
    | 'Spirit'
    | 'Liqueur'
    | 'Wine'
    | 'Beer'
    | 'Mixer'
    | 'Syrup'
    | 'Garnish'
    | 'Pantry';

export type VolumeUnit = 'cl' | 'oz' | 'Cl' | 'Oz';

export type BacSafetyLevel = 'Sober' | 'Safe' | 'Caution' | 'Warning' | 'Critical';

export type MatchType = 'EXACT' | 'MISSING_ONE' | 'MISSING_TWO';

export interface PagedResult<T> {
    items: T[];
    totalCount: number;
    pageNumber: number;
    pageSize: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
}

export interface UserProfile {
    id: string;
    username: string;
    email: string;
    role: UserRole;
    weightKg: number;
    heightCm: number;
    sex: BiologicalSex;
    birthYear?: number;
    preferredUnit: VolumeUnit;
    isActive: boolean;
}

export interface RegistrationRequestItem {
    id: string;
    username: string;
    email: string;
    weightKg: number;
    heightCm: number;
    sex: BiologicalSex;
    birthYear?: number;
    requestNote?: string;
    clientIpAddress?: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    createdAt: string;
}

export interface CreateRegistrationRequestPayload {
    username: string;
    email: string;
    password: string;
    weightKg: number;
    heightCm: number;
    sex: BiologicalSex;
    birthYear?: number | null;
    requestNote?: string;
    websiteUrl?: string; // Honeypot field
}

export interface UpdateBiometricsRequest {
    weightKg: number;
    heightCm: number;
    sex: BiologicalSex;
    birthYear?: number | null;
    preferredUnit?: 'Cl' | 'Oz';
}

export interface CreateUserAdminRequest {
    username: string;
    email: string;
    password: string;
    role: UserRole;
    weightKg: number;
    heightCm: number;
    sex: BiologicalSex;
    birthYear?: number | null;
    preferredUnit: 'Cl' | 'Oz';
}

export interface UpdateUserAdminRequest {
    username: string;
    email: string;
    role: UserRole;
    weightKg: number;
    heightCm: number;
    sex: BiologicalSex;
    birthYear?: number | null;
    preferredUnit: 'Cl' | 'Oz';
    isActive: boolean;
    newPassword?: string | null;
}

export interface AuthResponse {
    accessToken: string;
    expiresInSeconds: number;
    user: UserProfile;
}

export interface Ingredient {
    id: string;
    name: string;
    category: IngredientCategory;
    subCategory: string;
    flavor?: string | null;
    abv: number;
    isAvailableInBar: boolean;
    description?: string;
    imageUrl?: string;
}

export interface IngredientSuggestion {
    id: string;
    name: string;
    category: IngredientCategory;
    subCategory: string;
    flavor?: string | null;
    abv: number;
    isAvailableInBar: boolean;
}

export interface CabinetStatus {
    userId: string;
    ingredients: Ingredient[];
}

export interface DrinkCatalogItem {
    id: string;
    name: string;
    description: string;
    glassType?: string;
    imageUrl?: string;
    totalVolumeCl: number;
    abvPercent: number;
    bottleScore1To10: number;
    averageRating: number;
    reviewCount: number;
    isPublished: boolean;
}

export interface DrinkIngredientDetail {
    ingredientId: string;
    name: string;
    category: IngredientCategory;
    subCategory: string;
    flavor?: string | null;
    abv: number;
    amountCl: number;
    amountOz: number;
    displayUnitNote?: string;
    isOptional: boolean;
    sortOrder: number;
}

export interface DrinkMetrics {
    totalVolumeCl: number;
    totalVolumeOz: number;
    abvPercent: number;
    pureAlcoholGrams: number;
    bottleScore1To10: number;
    bottleVisualRating: number;
}

export interface DrinkDetail {
    id: string;
    name: string;
    description: string;
    glassType?: string;
    imageUrl?: string;
    preparationSteps: string[];
    metrics: DrinkMetrics;
    averageRating: number;
    reviewCount: number;
    ingredients: DrinkIngredientDetail[];
}

export interface ReviewItem {
    id: string;
    drinkId: string;
    drinkName: string;
    userId: string;
    username: string;
    rating: number;
    comment?: string;
    createdAt: string;
}

export interface MissingIngredient {
    id: string;
    name: string;
    category: string;
    subCategory: string;
    flavor?: string | null;
}

export interface DrinkMatchResult {
    drinkId: string;
    name: string;
    imageUrl?: string;
    cachedAbv: number;
    bottleScore1To10: number;
    matchType: MatchType;
    matchPercentage: number;
    missingIngredients: MissingIngredient[];
    optionalMissingGarnishes: string[];
    matchSummaryBadge: string;
}

export interface CustomIngredientDose {
    ingredientId: string;
    amountCl: number;
}

export interface LogDrinkRequest {
    consumedAt?: string;
    notes?: string;
    customComponents?: CustomIngredientDose[];
}

export interface BacTimelinePoint {
    timestamp: string;
    bacGramsPerDl: number;
    bacGramsPerLiter: number;
}

export interface LoggedDrinkComponent {
    ingredientId?: string | null;
    name: string;
    category: IngredientCategory | string;
    abv: number;
    amountCl: number;
}

export interface DrinkEvent {
    logId: string;
    drinkName: string;
    consumedAt: string;
    pureAlcoholGrams: number;
    totalVolumeCl?: number;
    effectiveAbv?: number;
    notes?: string | null;
    components?: LoggedDrinkComponent[];
}

export interface BacStatus {
    userId: string;
    calculatedAt: string;
    currentBacGramsPerDl: number;
    currentBacGramsPerLiter: number;
    safetyLevel: BacSafetyLevel;
    safetyMessage: string;
    estimatedSoberAt?: string;
    totalAlcoholGramsLast12h: number;
    activeLogsLast12h: DrinkEvent[];
    timeline: BacTimelinePoint[];
}

export interface DrinkLogResponse {
    logId: string;
    drinkNameSnapshot: string;
    isCustomized: boolean;
    consumedAt: string;
    loggedMetrics: {
        totalVolumeCl: number;
        effectiveAbv: number;
        pureAlcoholGrams: number;
        bottleScore1To10: number;
    };
    updatedBacStatus: BacStatus;
}

export interface UpdateDrinkLogRequest {
    customName?: string;
    consumedAt?: string;
    notes?: string;
    components: CustomIngredientDose[];
}

export interface RankingTier {
    id: string;
    name: string;
    tierOrder: number;
    minPureAlcoholGrams: number;
    minPureAlcoholCl: number;
    badgeIcon: string;
    colorHex: string;
}

export interface LeaderboardEntry {
    rank: number;
    userId: string;
    username: string;
    drinksCount: number;
    monthlyPureAlcoholGrams: number;
    monthlyPureAlcoholCl: number;
    currentTier: RankingTier;
    nextTierProgressPercent: number;
    gramsToNextTier: number;
}

export interface MonthlyLeaderboardResponse {
    period: string;
    resetsAt: string;
    entries: LeaderboardEntry[];
}

export interface AdminUserBacOverview {
    id: string;
    username: string;
    currentBacGramsPerLiter: number;
    safetyLevel: BacSafetyLevel;
    estimatedSoberAt?: string;
    totalDrinksLast12h: number;
}

export interface AdminBacOverviewPagedResponse extends PagedResult<AdminUserBacOverview> {
    criticalCount: number;
}

export interface LogCustomDrinkRequest {
    customName?: string;
    consumedAt?: string;
    notes?: string;
    components: CustomIngredientDose[];
}

export interface CreateIngredientRequest {
    name: string;
    category: IngredientCategory;
    subCategory: string;
    flavor?: string | null;
    abv: number;
    isAvailableInBar?: boolean;
    description?: string;
}

export interface CreateDrinkIngredientInput {
    ingredientId: string;
    amountCl: number;
    displayUnitNote?: string;
    isOptional: boolean;
    sortOrder: number;
}

export interface CreateDrinkRequest {
    name: string;
    description: string;
    glassType?: string;
    imageUrl?: string;
    preparationSteps: string[];
    ingredients: CreateDrinkIngredientInput[];
}

export interface CocktailDbSyncStatus {
    isRunning: boolean;
    currentLetter: string;
    processedDrinks: number;
    newDrinksAdded: number;
    existingDrinksUpdated: number;
    imagesDownloaded: number;
    failedImages: number;
    lastError?: string | null;
    startedAt?: string | null;
    completedAt?: string | null;
}