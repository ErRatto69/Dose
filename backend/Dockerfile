# Stage 1: Build & Publish
FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS build
WORKDIR /src

# Copia i file di progetto per sfruttare la cache dei layer durante il restore
COPY ["src/Dose.Api/Dose.Api.csproj", "src/Dose.Api/"]
COPY ["src/Dose.Application/Dose.Application.csproj", "src/Dose.Application/"]
COPY ["src/Dose.Domain/Dose.Domain.csproj", "src/Dose.Domain/"]
COPY ["src/Dose.Infrastructure/Dose.Infrastructure.csproj", "src/Dose.Infrastructure/"]

RUN dotnet restore "src/Dose.Api/Dose.Api.csproj"

# Copia tutto il resto del codice sorgente e compila in Release
COPY . .
WORKDIR "/src/src/Dose.Api"
RUN dotnet publish "Dose.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Stage 2: Runtime leggero
FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine AS final
WORKDIR /app

# Installa tzdata e icu-libs (necessario su Alpine per la gestione delle culture/date in .NET)
RUN apk add --no-cache icu-libs tzdata
ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false
ENV TZ=Europe/Zurich

# Espone la porta standard 8080 di ASP.NET Core
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "Dose.Api.dll"]