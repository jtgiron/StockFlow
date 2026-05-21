import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app, createTestUser, createTestProduct, openTestCashRegister, cleanup } from "./setup.js";
import { query } from "../database.js";

let admin;
let product;
let cashRegister;

beforeAll(async () => {
  admin = await createTestUser("admin");
  product = await createTestProduct({ stock_quantity: 50 });
  cashRegister = await openTestCashRegister(admin.user.id, 500);
});

afterAll(cleanup);

describe("Mercado Pago hardening guards", () => {
  it("should reject direct sales API requests that try to mark a sale as mercadopago", async () => {
    const res = await request(app)
      .post("/api/sales")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        cash_register_id: String(cashRegister.id),
        items: [{ product_id: product.id, quantity: 1 }],
        payments: [{ payment_method: "mercadopago", amount: 100 }],
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/mercado pago/i);
    expect(res.body.message).toMatch(/flujo qr/i);
  });

  it("should report stale pending orders as expired in the status endpoint", async () => {
    const externalReference = `MP-TEST-${Date.now()}`;

    await query(
      `INSERT INTO mp_pending_orders (
        external_reference,
        cash_register_id,
        user_id,
        items,
        total_amount,
        status,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, 'pending', NOW() - INTERVAL '20 minutes', NOW() - INTERVAL '20 minutes')`,
      [
        externalReference,
        cashRegister.id,
        admin.user.id,
        JSON.stringify([{ product_id: product.id, quantity: 1, unit_price: 100 }]),
        100,
      ],
    );

    const res = await request(app)
      .get(`/api/mp/order-status/${externalReference}`)
      .set("Authorization", `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("expired");
    expect(typeof res.body.expires_at).toBe("string");
  });
});
