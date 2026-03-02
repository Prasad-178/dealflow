import { describe, it, expect } from "vitest";
import {
  isDiscountAutoApproved,
  filterPricingTiers,
  detectApprovalStatus,
} from "@/lib/agents/deal";

describe("Deal Agent - Pricing & Discount Logic", () => {
  describe("isDiscountAutoApproved", () => {
    it("auto-approves 10% discount (boundary)", () => {
      expect(isDiscountAutoApproved(10)).toBe(true);
    });

    it("auto-approves discounts under 10%", () => {
      expect(isDiscountAutoApproved(5)).toBe(true);
      expect(isDiscountAutoApproved(1)).toBe(true);
      expect(isDiscountAutoApproved(9)).toBe(true);
    });

    it("rejects 11% discount (boundary)", () => {
      expect(isDiscountAutoApproved(11)).toBe(false);
    });

    it("rejects large discounts", () => {
      expect(isDiscountAutoApproved(25)).toBe(false);
      expect(isDiscountAutoApproved(50)).toBe(false);
    });

    it("auto-approves 0% discount", () => {
      expect(isDiscountAutoApproved(0)).toBe(true);
    });
  });

  describe("filterPricingTiers", () => {
    const products = [
      {
        name: "DealFlow Pro",
        pricingTiers: [
          { name: "Starter", price: 49, billingCycle: "monthly", features: ["Basic"] },
          { name: "Professional", price: 149, billingCycle: "monthly", features: ["Advanced"] },
          { name: "Enterprise", price: 499, billingCycle: "monthly", features: ["All"] },
        ],
      },
    ];

    it("returns all tiers when no tier specified", () => {
      const result = filterPricingTiers(products);
      expect(result).toHaveLength(3);
    });

    it("returns all tiers when tier is 'all'", () => {
      const result = filterPricingTiers(products, "all");
      expect(result).toHaveLength(3);
    });

    it("filters to specific tier (case-insensitive)", () => {
      const result = filterPricingTiers(products, "starter");
      expect(result).toHaveLength(1);
      expect(result[0].tier).toBe("Starter");
      expect(result[0].price).toBe(49);
    });

    it("filters case-insensitively", () => {
      const result = filterPricingTiers(products, "ENTERPRISE");
      expect(result).toHaveLength(1);
      expect(result[0].tier).toBe("Enterprise");
    });

    it("returns empty for non-existent tier", () => {
      const result = filterPricingTiers(products, "ultra");
      expect(result).toHaveLength(0);
    });

    it("includes product name in each result", () => {
      const result = filterPricingTiers(products, "starter");
      expect(result[0].product).toBe("DealFlow Pro");
    });
  });

  describe("detectApprovalStatus", () => {
    it("detects pending_approval in tool results", () => {
      const steps = [
        {
          toolResults: [
            { result: { status: "pending_approval", message: "submitted" } },
          ],
        },
      ];
      expect(detectApprovalStatus(steps)).toBe(true);
    });

    it("returns false when no pending_approval", () => {
      const steps = [
        {
          toolResults: [
            { result: { status: "approved", message: "done" } },
          ],
        },
      ];
      expect(detectApprovalStatus(steps)).toBe(false);
    });

    it("returns false for empty steps", () => {
      expect(detectApprovalStatus([])).toBe(false);
    });

    it("handles steps with empty toolResults", () => {
      const steps = [{ toolResults: [] }];
      expect(detectApprovalStatus(steps)).toBe(false);
    });

    it("handles null/undefined tool results gracefully", () => {
      const steps = [
        {
          toolResults: [null, undefined, { result: null }],
        },
      ];
      expect(detectApprovalStatus(steps as any)).toBe(false);
    });

    it("detects approval across multiple steps", () => {
      const steps = [
        { toolResults: [{ result: { status: "approved" } }] },
        { toolResults: [{ result: { status: "pending_approval" } }] },
      ];
      expect(detectApprovalStatus(steps)).toBe(true);
    });
  });
});
