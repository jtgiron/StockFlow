// backend/tests/stock.integration.test.js
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app, createTestUser, createTestProduct, cleanup } from "./setup.js";

let admin;
let product;

beforeAll(async () => {
  admin = await createTestUser("admin");
  product = await createTestProduct({ stock_quantity: 100 });
});

afterAll(cleanup);

describe("Stock movements", () => {
  it("should add stock via entry movement", async () => {
    const res = await request(app)
      .post("/api/stock/movements")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        product_id: product.id,
        movement_type: "entry",
        quantity: 25,
        reason: "Test restock",
      });

    expect(res.status).toBe(201);
    expect(res.body.movement_type).toBe("entry");
    expect(res.body.quantity).toBe(25);

    // Verify stock updated
    const productRes = await request(app)
      .get(`/api/products/${product.id}`)
      .set("Authorization", `Bearer ${admin.token}`);
    expect(productRes.body.stock_quantity).toBe(125);
  });

  it("should remove stock via exit movement", async () => {
    const res = await request(app)
      .post("/api/stock/movements")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        product_id: product.id,
        movement_type: "exit",
        quantity: 10,
        reason: "Test removal",
      });

    expect(res.status).toBe(201);

    const productRes = await request(app)
      .get(`/api/products/${product.id}`)
      .set("Authorization", `Bearer ${admin.token}`);
    expect(productRes.body.stock_quantity).toBe(115);
  });

  it("should set stock via adjustment", async () => {
    const res = await request(app)
      .post("/api/stock/movements")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        product_id: product.id,
        movement_type: "adjustment",
        quantity: 50,
        reason: "Physical count",
      });

    expect(res.status).toBe(201);

    const productRes = await request(app)
      .get(`/api/products/${product.id}`)
      .set("Authorization", `Bearer ${admin.token}`);
    expect(productRes.body.stock_quantity).toBe(50);
  });

  it("should reject exit when insufficient stock", async () => {
    const res = await request(app)
      .post("/api/stock/movements")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        product_id: product.id,
        movement_type: "exit",
        quantity: 9999,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/stock insuficiente/i);
  });

  it("should reject invalid movement type via Zod", async () => {
    const res = await request(app)
      .post("/api/stock/movements")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        product_id: product.id,
        movement_type: "invalid",
        quantity: 1,
      });

    expect(res.status).toBe(400);
  });

  it("should list movements in history", async () => {
    const res = await request(app)
      .get("/api/stock/movements")
      .set("Authorization", `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(3);
    expect(res.body.total).toBeGreaterThanOrEqual(3);
  });

  it("should list low-stock products", async () => {
    // Create a product with stock below alert
    await createTestProduct({
      name: `Low Stock ${Date.now()}`,
      stock_quantity: 2,
      min_stock_alert: 10,
    });

    const res = await request(app)
      .get("/api/stock/low-stock")
      .set("Authorization", `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body.some((p) => p.stock_quantity <= p.min_stock_alert)).toBe(true);
  });
});
