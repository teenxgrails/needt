import { getCreemClient } from "@/lib/creem/client";
import {
  attachLifetimeCheckout,
  expireLifetimeReservation,
  listReconcilableLifetimeReservations,
  markLifetimeReservationChecked,
} from "@/lib/creem/lifetime-cap";
import { reconcileLifetimeCheckoutReservations } from "@/lib/creem/lifetime-reconciliation";
import { processCreemBillingEvent } from "@/lib/creem/webhook-processor";

jest.mock("@/lib/creem/client", () => ({ getCreemClient: jest.fn() }));
jest.mock("@/lib/creem/config", () => ({
  getCreemProductId: jest.fn().mockReturnValue("prod_lifetime"),
}));
jest.mock("@/lib/creem/lifetime-cap", () => ({
  attachLifetimeCheckout: jest.fn(),
  expireLifetimeReservation: jest.fn(),
  listReconcilableLifetimeReservations: jest.fn(),
  markLifetimeReservationChecked: jest.fn(),
}));
jest.mock("@/lib/creem/webhook-processor", () => ({
  processCreemBillingEvent: jest.fn(),
}));
jest.mock("@/lib/logger", () => ({
  logger: { warn: jest.fn() },
}));

describe("Lifetime checkout reconciliation", () => {
  const retrieve = jest.fn();
  const create = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXTAUTH_URL = "http://localhost:3000";
    (getCreemClient as jest.Mock).mockReturnValue({
      checkouts: { create, retrieve },
    });
  });

  it("does not require Creem configuration without pending reservations", async () => {
    (listReconcilableLifetimeReservations as jest.Mock).mockResolvedValue([]);

    await reconcileLifetimeCheckoutReservations();

    expect(getCreemClient).not.toHaveBeenCalled();
  });

  it("releases a hold only after Creem reports the checkout expired", async () => {
    (listReconcilableLifetimeReservations as jest.Mock).mockResolvedValue([
      {
        id: "reservation_1",
        requestId: "request_1",
        creemCheckoutId: "checkout_1",
      },
    ]);
    retrieve.mockResolvedValue({ id: "checkout_1", status: "expired" });

    await reconcileLifetimeCheckoutReservations();

    expect(expireLifetimeReservation).toHaveBeenCalledWith(
      "reservation_1",
      "checkout_1"
    );
  });

  it("recovers a completed checkout through the idempotent webhook processor", async () => {
    (listReconcilableLifetimeReservations as jest.Mock).mockResolvedValue([
      {
        id: "reservation_1",
        requestId: "request_1",
        creemCheckoutId: "checkout_1",
      },
    ]);
    retrieve.mockResolvedValue({
      id: "checkout_1",
      status: "completed",
      product: "prod_lifetime",
      metadata: { referenceId: "user_1" },
    });
    (processCreemBillingEvent as jest.Mock).mockResolvedValue({
      processed: true,
    });

    await reconcileLifetimeCheckoutReservations();

    expect(processCreemBillingEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "checkout-reconcile-checkout_1",
        eventType: "checkout.completed",
      })
    );
  });

  it("keeps pending and processing holds occupied", async () => {
    (listReconcilableLifetimeReservations as jest.Mock).mockResolvedValue([
      {
        id: "reservation_1",
        requestId: "request_1",
        creemCheckoutId: "checkout_1",
      },
    ]);
    retrieve.mockResolvedValue({ id: "checkout_1", status: "processing" });

    await reconcileLifetimeCheckoutReservations();

    expect(markLifetimeReservationChecked).toHaveBeenCalledWith(
      "reservation_1"
    );
    expect(expireLifetimeReservation).not.toHaveBeenCalled();
  });

  it("recovers an ambiguous create with the same idempotency key", async () => {
    (listReconcilableLifetimeReservations as jest.Mock).mockResolvedValue([
      {
        id: "reservation_1",
        requestId: "request_1",
        creemCheckoutId: null,
        status: "CREATING",
        user: {
          id: "user_1",
          email: "buyer@example.test",
          name: "Buyer",
        },
      },
    ]);
    create.mockResolvedValue({
      id: "checkout_1",
      status: "pending",
      checkoutUrl: "https://creem.test/checkout_1",
    });

    await reconcileLifetimeCheckoutReservations();

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: "request_1",
        metadata: expect.objectContaining({
          lifetimeReservationId: "reservation_1",
          userId: "user_1",
        }),
      })
    );
    expect(attachLifetimeCheckout).toHaveBeenCalledWith("reservation_1", {
      id: "checkout_1",
      checkoutUrl: "https://creem.test/checkout_1",
    });
  });
});
