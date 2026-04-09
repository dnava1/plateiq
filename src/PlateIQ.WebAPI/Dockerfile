FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy csproj files and restore (layer caching)
COPY src/PlateIQ.Core/PlateIQ.Core.csproj PlateIQ.Core/
COPY src/PlateIQ.Infrastructure/PlateIQ.Infrastructure.csproj PlateIQ.Infrastructure/
COPY src/PlateIQ.WebAPI/PlateIQ.WebAPI.csproj PlateIQ.WebAPI/
RUN dotnet restore PlateIQ.WebAPI/PlateIQ.WebAPI.csproj

# Copy source and publish
COPY src/PlateIQ.Core/ PlateIQ.Core/
COPY src/PlateIQ.Infrastructure/ PlateIQ.Infrastructure/
COPY src/PlateIQ.WebAPI/ PlateIQ.WebAPI/
RUN dotnet publish PlateIQ.WebAPI/PlateIQ.WebAPI.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# Non-root user for security
USER $APP_UID

COPY --from=build /app/publish .

EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["dotnet", "PlateIQ.WebAPI.dll"]
