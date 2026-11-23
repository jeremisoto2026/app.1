describe("Preview payment safeguards", () => {
  const originalVercelEnvironment = process.env.VERCEL_ENV;

  afterEach(() => {
    jest.resetModules();
    if (originalVercelEnvironment === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = originalVercelEnvironment;
  });

  test("does not expose the live receiving wallet or enable blockchain payments", () => {
    process.env.VERCEL_ENV = "preview";
    jest.resetModules();

    const payments = require("../lib/payments");

    expect(payments.RECEIVER_ADDRESS).toBe("");
    expect(payments.BSC_USDT_CONTRACT).toBe("");
    expect(() => payments.assertPaymentConfiguration())
      .toThrow(/deshabilitados en Preview/i);
  });
});
