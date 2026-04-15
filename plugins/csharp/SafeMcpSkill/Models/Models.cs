using System.Text.Json.Serialization;

namespace SafeMcpSkill.Models;

public record ToolDefinition(
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("description")] string Description
);

public record OAuthConfig(
    [property: JsonPropertyName("scopes")] string[]? Scopes = null,
    [property: JsonPropertyName("callbackUrls")] string[]? CallbackUrls = null,
    [property: JsonPropertyName("authorizationServer")] string? AuthorizationServer = null
);

public record ServerDefinition(
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("transport")] string? Transport = null,
    [property: JsonPropertyName("authentication")] string? Authentication = null,
    [property: JsonPropertyName("tools")] ToolDefinition[]? Tools = null,
    [property: JsonPropertyName("permissions")] string[]? Permissions = null,
    [property: JsonPropertyName("exposedEndpoints")] string[]? ExposedEndpoints = null,
    [property: JsonPropertyName("oauthConfig")] OAuthConfig? OAuthConfig = null
);

public record AgentArchitecture
{
    [JsonPropertyName("name")] public string? Name { get; init; }
    [JsonPropertyName("servers")] public ServerDefinition[]? Servers { get; init; }
    [JsonPropertyName("tools")] public ToolDefinition[]? Tools { get; init; }
    [JsonPropertyName("multiAgent")] public bool? MultiAgent { get; init; }
    [JsonPropertyName("sharedMemory")] public bool? SharedMemory { get; init; }
    [JsonPropertyName("vectorStore")] public bool? VectorStore { get; init; }
    [JsonPropertyName("ragPipeline")] public bool? RagPipeline { get; init; }
    [JsonPropertyName("multimodal")] public bool? Multimodal { get; init; }
    [JsonPropertyName("cliAccess")] public bool? CliAccess { get; init; }
    [JsonPropertyName("fileSystemAccess")] public bool? FileSystemAccess { get; init; }
    [JsonPropertyName("networkAccess")] public bool? NetworkAccess { get; init; }
    [JsonPropertyName("oauthFlows")] public bool? OAuthFlows { get; init; }
}

public record FindingMitigation(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("effectiveness")] string Effectiveness
);

public record FindingTechnique(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("name")] string Name
);

public record Finding
{
    [JsonPropertyName("ruleId")] public string RuleId { get; init; } = "";
    [JsonPropertyName("severity")] public string Severity { get; init; } = "";
    [JsonPropertyName("technique")] public FindingTechnique? Technique { get; init; }
    [JsonPropertyName("description")] public string Description { get; init; } = "";
    [JsonPropertyName("evidence")] public string Evidence { get; init; } = "";
    [JsonPropertyName("mitigations")] public FindingMitigation[] Mitigations { get; init; } = [];
}

public record RiskSummary
{
    [JsonPropertyName("overallRisk")] public string OverallRisk { get; init; } = "";
    [JsonPropertyName("totalFindings")] public int TotalFindings { get; init; }
    [JsonPropertyName("bySeverity")] public Dictionary<string, int> BySeverity { get; init; } = new();
    [JsonPropertyName("coverageScore")] public double CoverageScore { get; init; }
}

public record AnalysisResult
{
    [JsonPropertyName("timestamp")] public string Timestamp { get; init; } = "";
    [JsonPropertyName("target")] public string Target { get; init; } = "";
    [JsonPropertyName("summary")] public RiskSummary? Summary { get; init; }
    [JsonPropertyName("findings")] public Finding[] Findings { get; init; } = [];
}
