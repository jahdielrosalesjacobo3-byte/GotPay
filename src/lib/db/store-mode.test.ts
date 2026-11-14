import { afterEach, describe, expect, it } from "vitest";
import { getStoreMode } from "@/lib/db/store";

describe("selección de store por GOTPAY_STORE", () => {
  const original = process.env.GOTPAY_STORE;
  afterEach(() => {
    if (original === undefined) delete process.env.GOTPAY_STORE;
    else process.env.GOTPAY_STORE = original;
  });

  it("por defecto usa archivo/memoria", () => {
    delete process.env.GOTPAY_STORE;
    expect(getStoreMode()).toBe("file");
  });

  it("GOTPAY_STORE=supabase activa Postgres", () => {
    process.env.GOTPAY_STORE = "supabase";
    expect(getStoreMode()).toBe("supabase");
  });

  it("valores desconocidos caen a archivo", () => {
    process.env.GOTPAY_STORE = "otro";
    expect(getStoreMode()).toBe("file");
  });
});
