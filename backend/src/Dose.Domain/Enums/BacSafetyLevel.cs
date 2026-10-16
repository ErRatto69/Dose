namespace Dose.Domain.Enums;

public enum BacSafetyLevel
{
    Sober,      // 0.00 g/dL
    Safe,       // > 0.00 e < 0.05 g/dL (< 0.50 g/L)
    Caution,    // >= 0.05 e < 0.08 g/dL (0.50 - 0.80 g/L - limite legale guida superato)
    Warning,    // >= 0.08 e < 0.15 g/dL (0.80 - 1.50 g/L - ebbrezza marcata)
    Critical    // >= 0.15 g/dL (>= 1.50 g/L - rischio intossicazione acuta)
}