// ── Multi-Framework Mapping Types ───────────────────────────────────

/** STRIDE threat categories */
export type StrideCategory = "S" | "T" | "R" | "I" | "D" | "E";

export const STRIDE_LABELS: Record<StrideCategory, string> = {
  S: "Spoofing",
  T: "Tampering",
  R: "Repudiation",
  I: "Information Disclosure",
  D: "Denial of Service",
  E: "Elevation of Privilege",
};

/** MITRE ATLAS reference */
export interface AtlasRef {
  id: string;
  name: string;
}

/** OWASP LLM Top 10 2025 reference */
export interface OwaspLlmRef {
  id: string;
  name: string;
}

/** NIST AI RMF subcategory reference */
export interface NistAiRmfRef {
  id: string;
  function: "GOVERN" | "MAP" | "MEASURE" | "MANAGE";
}

/** Combined mappings object attached to each finding */
export interface FrameworkMappings {
  stride: StrideCategory[];
  atlas: AtlasRef[];
  owaspLlm: OwaspLlmRef[];
  nistAiRmf: NistAiRmfRef[];
}

/** Coverage summary for a single framework */
export interface FrameworkCoverage {
  framework: string;
  totalMapped: number;
  categories: Record<string, number>;
}
