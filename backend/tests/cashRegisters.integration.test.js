// backend/tests/cashRegisters.integration.test.js
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app, createTestUser, createTestProduct, cleanup } from "./setup.js";

let admin;
let product;

beforeAll(async () => {
  admin = await createTestUser("admin");
  product = await createTestProduct({ sell_price: 100, stock_quantity: 200 });
});

afterAll(cleanup);

describe("Cash register open → sell → close flow", () => {
  let registerId;

  it("should open a cash register", async () => {
    const res = await request(app)
      .post("/api/cash-registers/open")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ opening_cash_amount: 500 });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("open");
    expect(res.body.openingcash_amount).toBe(500);
    registerId = res.body.id;
  });

  it("should reject opening a second register for same user", async () => {
    const res = await request(app)
      .post("/api/cash-registers/open")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ opening_cash_amount: 100 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/ya tienes una caja abierta/i);
  });

  it("should get current open register", async () => {
    const res = await request(app)
      .get("/api/cash-registers/current")
      .set("Authorization", `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(registerId);
    expect(res.body.status).toBe("open");
  });

  it("should allow a sale on the open register", async () => {
    const res = await request(app)
      .post("/api/sales")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        cash_register_id: String(registerId),
        items: [{ product_id: product.id, quantity: 3 }],
        payments: [{ payment_method: "cash", amount: 300 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.total_amount).toBe("300.00");
  });

  it("should close the register with correct expected amounts", async () => {
    const res = await request(app)
      .post(`/api/cash-registers/${registerId}/close`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        closing_cash_amount: 800,
        closing_qr_amount: 0,
        notes: "Test close",
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("closed");
    // Expected cash = opening (500) + cash sales (300) = 800
    expect(res.body.expectedcash_amount).toBe(800);
    // Declared 800, expected 800 → difference 0
    expect(res.body.difference).toBe(0);
  });

  it("should reject sale on closed register", async () => {
    const res = await request(app)
      .post("/api/sales")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        cash_register_id: String(registerId),
        items: [{ product_id: product.id, quantity: 1 }],
        payments: [{ payment_method: "cash", amount: 100 }],
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/no está abierta/i);
  });

  it("should appear in cash register history", async () => {
    const res = await request(app)
      .get("/api/cash-registers")
      .set("Authorization", `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    const found = res.body.items.find((r) => r.id === registerId);
    expect(found).toBeDefined();
    expect(found.status).toBe("closed");
  });
});
