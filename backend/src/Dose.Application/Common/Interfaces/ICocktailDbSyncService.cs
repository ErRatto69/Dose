using Dose.Application.Features.Admin.Dtos;

namespace Dose.Application.Common.Interfaces;

public interface ICocktailDbSyncService
{
    CocktailDbSyncStatusDto GetStatus();
    bool StartSync();
}