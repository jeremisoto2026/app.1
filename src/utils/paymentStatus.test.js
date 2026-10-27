import { getEffectivePaymentStatus, getVisiblePaymentHistory } from "./paymentStatus";

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

  test("hides expired entries from the default history without hiding paid entries", () => {
    const payments = [
      { id: "expired", status: "pending", expiresAt: "2026-10-27T11:30:00.000Z" },
      { id: "paid", status: "paid", expiresAt: "2026-10-27T11:30:00.000Z" },
      { id: "pending", status: "pending", expiresAt: "2026-10-27T12:30:00.000Z" },
    ];

    expect(getVisiblePaymentHistory(payments, now).map((payment) => payment.id)).toEqual(["paid", "pending"]);
  });

  test("allows the user to reveal expired entries without deleting them", () => {
    const payments = [
      { id: "expired", status: "pending", expiresAt: "2026-10-27T11:30:00.000Z" },
      { id: "paid", status: "paid" },
    ];

    expect(getVisiblePaymentHistory(payments, now, true)).toEqual(payments);
  });
});
