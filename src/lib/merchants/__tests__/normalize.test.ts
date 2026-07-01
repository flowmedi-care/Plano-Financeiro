import { describe, expect, it } from "vitest";
import {
  lookupInRuleMap,
  merchantKeyFromDescription,
  stableMerchantKeyFromNormalized,
} from "@/lib/merchants/normalize";
import { stripInstallmentFromDescription } from "@/lib/parsers/installments";

describe("merchant key stability", () => {
  it("strips parcela suffix before normalizing", () => {
    const parcel8 = "Ticketmaster Brasil - Parcela 8/11";
    const parcel9 = "Ticketmaster Brasil - Parcela 9/11";

    expect(stripInstallmentFromDescription(parcel8)).toBe("Ticketmaster Brasil");
    expect(stripInstallmentFromDescription(parcel9)).toBe("Ticketmaster Brasil");
    expect(merchantKeyFromDescription(parcel8)).toBe(
      merchantKeyFromDescription(parcel9)
    );
    expect(merchantKeyFromDescription(parcel8)).toBe("ticketmasterbrasil");
  });

  it("normalizes legacy keys that still embed parcela", () => {
    expect(stableMerchantKeyFromNormalized("ticketmasterbrasilparcela811")).toBe(
      "ticketmasterbrasil"
    );
  });

  it("finds rules via stable and legacy merchant keys", () => {
    const map = new Map<string, string>();
    map.set("ticketmasterbrasilparcela811", "cat-1");

    const result = lookupInRuleMap(
      map,
      "ticketmasterbrasil",
      "account-1",
      "Ticketmaster Brasil - Parcela 9/11"
    );

    expect(result).toBe("cat-1");
  });
});
