// backend/tests/sales.integration.test.js
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app, createTestUser, createTestProduct, openTestCashRegister, cleanup } from "./setup.js";

let admin;
let product;
let cashRegister;

beforeAll(async () => {
  admin = await createTestUser("admin");
  product = await createTestProduct({ stock_quantity: 50 });
  cashRegister = await openTestCashRegister(admin.user.id, 500);
});

afterAll(cleanup);

describe("POST /api/sales — complete sale flow", () => {
  it("should create a sale with cash payment", async () => {
    const res = await request(app)
      .post("/api/sales")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        cash_register_id: String(cashRegister.id),
        items: [{ product_id: product.id, quantity: 2 }],
        payments: [{ payment_method: "cash", amount: 200 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.total_amount).toBe("200.00");
    expect(res.body.sale_items).toHaveLength(1);
    expect(res.body.sale_payments).toHaveLength(1);
    expect(res.body.sale_items[0].quantity).toBe(2);
    expect(res.body.sale_payments[0].payment_method).toBe("cash");
  });

  it("should decrement stock after sale", async () => {
    const res = await request(app)
      .get(`/api/products/${product.id}`)
      .set("Authorization", `Bearer ${admin.token}`);

    // Started with 50, sold 2
    expect(res.status).toBe(200);
    expect(res.body.stock_quantity).toBe(48);
  });

  it("should reject sale with insufficient stock", async () => {
    const res = await request(app)
      .post("/api/sales")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        cash_register_id: String(cashRegister.id),
        items: [{ product_id: product.id, quantity: 9999 }],
        payments: [{ payment_method: "cash", amount: 999900 }],
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/stock insuficiente/i);
  });

  it("should reject sale when payments don't match total", async () => {
    const res = await request(app)
      .post("/api/sales")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        cash_register_id: String(cashRegister.id),
        items: [{ product_id: product.id, quantity: 1 }],
        payments: [{ payment_method: "cash", amount: 1 }],
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/no coincide/i);
  });

  it("should reject sale with empty items", async () => {
    const res = await request(app)
      .post("/api/sales")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        cash_register_id: String(cashRegister.id),
        items: [],
        payments: [{ payment_method: "cash", amount: 100 }],
      });

    expect(res.status).toBe(400);
  });

  it("should create a sale with credit (fiado) payment", async () => {
    // Create a credit account first
    const accountRes = await request(app)
      .post("/api/credits/accounts")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ customer_name: "Test Fiado Customer" });

    expect(accountRes.status).toBe(201);
    const accountId = accountRes.body.id;

    const saleRes = await request(app)
      .post("/api/sales")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        cash_register_id: String(cashRegister.id),
        items: [{ product_id: product.id, quantity: 1 }],
        payments: [{ payment_method: "credit", amount: 100 }],
        credit_account_id: accountId,
      });

    expect(saleRes.status).toBe(201);

    // Verify the credit account balance increased
    const txRes = await request(app)
      .get(`/api/credits/accounts/${accountId}/transactions`)
      .set("Authorization", `Bearer ${admin.token}`);

    expect(txRes.status).toBe(200);
    expect(txRes.body.items).toHaveLength(1);
    expect(txRes.body.items[0].type).toBe("charge");
  });
});
