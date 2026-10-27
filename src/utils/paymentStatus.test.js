import { getEffectivePaymentStatus } from "./paymentStatus";

describe("payment status display", () => {
  const now = Date.parse("2026-10-27T12:00:00.000Z");

  test("keeps a payment pending before the expiration time", () => {
    expect(getEffectivePaymentStatus({
      status: "pending",
      expiresAt: "2026-10-27T12:30:00.000Z",
    }, now)).toBe("pending");
  });

  test("shows an unpaid order as expired once its 30-minute window has passed", () => {
    expect(getEffectivePaymentStatus({
      status: "pending",
      expiresAt: "2026-10-27T11:59:59.000Z",
    }, now)).toBe("expired");
  });

  test("does not expire paid orders even when their payment window has passed", () => {
    expect(getEffectivePaymentStatus({
      status: "paid",
      expiresAt: "2026-10-27T11:30:00.000Z",
    }, now)).toBe("paid");
  });

  test("leaves legacy pending entries without an expiration time unchanged", () => {
    expect(getEffectivePaymentStatus({ status: "pending" }, now)).toBe("pending");
  });
});
