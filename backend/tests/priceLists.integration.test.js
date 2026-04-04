// backend/tests/priceLists.integration.test.js
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app, createTestUser, createTestProduct, cleanup } from "./setup.js";

let admin;
let product1;
let product2;

beforeAll(async () => {
  admin = await createTestUser("admin");
  product1 = await createTestProduct({ name: `PL Product 1 ${Date.now()}`, sell_price: 100 });
  product2 = await createTestProduct({ name: `PL Product 2 ${Date.now()}`, sell_price: 200 });
});

afterAll(cleanup);

describe("Price list application flow", () => {
  let listId;

  it("should create a draft price list", async () => {
    const res = await request(app)
      .post("/api/price-lists")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ name: `Test List ${Date.now()}` });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("draft");
    listId = res.body.id;
  });

  it("should add items to the list", async () => {
    const res1 = await request(app)
      .post(`/api/price-lists/${listId}/items`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ product_id: product1.id, new_price: 150 });

    expect(res1.status).toBe(201);
    expect(Number(res1.body.old_price)).toBe(100);
    expect(Number(res1.body.new_price)).toBe(150);

    const res2 = await request(app)
      .post(`/api/price-lists/${listId}/items`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ product_id: product2.id, new_price: 250 });

    expect(res2.status).toBe(201);
  });

  it("should list items in the price list", async () => {
    const res = await request(app)
      .get(`/api/price-lists/${listId}/items`)
      .set("Authorization", `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it("should apply the price list and update products", async () => {
    const res = await request(app)
      .post(`/api/price-lists/${listId}/apply`)
      .set("Authorization", `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("applied");

    // Verify product prices were updated
    const p1 = await request(app)
      .get(`/api/products/${product1.id}`)
      .set("Authorization", `Bearer ${admin.token}`);
    expect(Number(p1.body.sell_price)).toBe(150);

    const p2 = await request(app)
      .get(`/api/products/${product2.id}`)
      .set("Authorization", `Bearer ${admin.token}`);
    expect(Number(p2.body.sell_price)).toBe(250);
  });

  it("should reject applying an already applied list", async () => {
    const res = await request(app)
      .post(`/api/price-lists/${listId}/apply`)
      .set("Authorization", `Bearer ${admin.token}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/ya fue aplicada/i);
  });

  it("should reject applying an empty list", async () => {
    // Create empty list
    const listRes = await request(app)
      .post("/api/price-lists")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ name: `Empty List ${Date.now()}` });

    const emptyListId = listRes.body.id;

    const res = await request(app)
      .post(`/api/price-lists/${emptyListId}/apply`)
      .set("Authorization", `Bearer ${admin.token}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/no tiene items/i);
  });

  it("should block employee from accessing price lists", async () => {
    const employee = await createTestUser("employee");

    const res = await request(app)
      .get("/api/price-lists")
      .set("Authorization", `Bearer ${employee.token}`);

    expect(res.status).toBe(403);
  });
});
