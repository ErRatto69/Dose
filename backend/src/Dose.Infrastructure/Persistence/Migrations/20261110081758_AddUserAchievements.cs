using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Dose.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddUserAchievements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Idempotent schema catch-up for columns/tables previously managed outside EF migrations
            migrationBuilder.Sql("""
                ALTER TABLE drinks ADD COLUMN IF NOT EXISTS "CachedKcal" integer NOT NULL DEFAULT 0;
                ALTER TABLE drinks ADD COLUMN IF NOT EXISTS "IsLockedByCreator" boolean NOT NULL DEFAULT FALSE;
                ALTER TABLE drink_logs ADD COLUMN IF NOT EXISTS "StomachState" character varying(20) NOT NULL DEFAULT 'LightSnack';
                ALTER TABLE drink_logs ADD COLUMN IF NOT EXISTS "TotalKcal" integer NOT NULL DEFAULT 0;

                CREATE TABLE IF NOT EXISTS water_logs (
                    "Id" uuid NOT NULL DEFAULT gen_random_uuid(),
                    "UserId" uuid NOT NULL,
                    "AmountCl" numeric(6,2) NOT NULL,
                    "ConsumedAt" timestamp with time zone NOT NULL,
                    "CreatedAt" timestamp with time zone NOT NULL,
                    "UpdatedAt" timestamp with time zone NOT NULL,
                    CONSTRAINT "PK_water_logs" PRIMARY KEY ("Id"),
                    CONSTRAINT "FK_water_logs_users_UserId" FOREIGN KEY ("UserId") REFERENCES users ("Id") ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS "IX_water_logs_UserId_ConsumedAt" ON water_logs ("UserId", "ConsumedAt");
                """);

            migrationBuilder.CreateTable(
                name: "user_achievements",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    AchievementKey = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    CurrentProgress = table.Column<int>(type: "integer", nullable: true),
                    TargetProgress = table.Column<int>(type: "integer", nullable: false),
                    UnlockedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_achievements", x => x.Id);
                    table.ForeignKey(
                        name: "FK_user_achievements_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_user_achievements_UserId_AchievementKey",
                table: "user_achievements",
                columns: new[] { "UserId", "AchievementKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_user_achievements_UserId_UnlockedAtUtc",
                table: "user_achievements",
                columns: new[] { "UserId", "UnlockedAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "user_achievements");

            migrationBuilder.DropTable(
                name: "water_logs");

            migrationBuilder.DropColumn(
                name: "CachedKcal",
                table: "drinks");

            migrationBuilder.DropColumn(
                name: "IsLockedByCreator",
                table: "drinks");

            migrationBuilder.DropColumn(
                name: "StomachState",
                table: "drink_logs");

            migrationBuilder.DropColumn(
                name: "TotalKcal",
                table: "drink_logs");
        }
    }
}
