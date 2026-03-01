type RuleResult = {
  passed: boolean;
  category?: string;
  details?: string;
};

const CONFIDENTIAL_PATTERNS = [
  /internal\s+pricing\s+margin/i,
  /employee\s+salary/i,
  /acquisition\s+target/i,
  /board\s+meeting\s+notes/i,
  /confidential\s+project/i,
  /internal\s+roadmap/i,
];

const INAPPROPRIATE_PATTERNS = [
  /\b(fuck|shit|damn|hell|ass)\b/i,
  /\b(idiot|stupid|moron)\b/i,
];

const COMPETITOR_BASHING_PATTERNS = [
  /\b(competitor\s+name)\s+(sucks|terrible|awful|worst)/i,
  /don'?t\s+use\s+\w+,?\s+they('re|\s+are)\s+(bad|terrible)/i,
];

export function checkDeterministicRules(content: string): RuleResult {
  // Check confidential info
  for (const pattern of CONFIDENTIAL_PATTERNS) {
    if (pattern.test(content)) {
      return {
        passed: false,
        category: "confidential",
        details: `Content matches confidential pattern: ${pattern.source}`,
      };
    }
  }

  // Check inappropriate language
  for (const pattern of INAPPROPRIATE_PATTERNS) {
    if (pattern.test(content)) {
      return {
        passed: false,
        category: "inappropriate",
        details: "Content contains inappropriate language",
      };
    }
  }

  // Check competitor bashing
  for (const pattern of COMPETITOR_BASHING_PATTERNS) {
    if (pattern.test(content)) {
      return {
        passed: false,
        category: "competitor_bashing",
        details: "Content appears to bash competitors",
      };
    }
  }

  return { passed: true };
}
