import { Hono } from "hono";

const app = new Hono();

app.get("/api/items", async (c) => {
  const db = c.env.DB;
  const result = await db.prepare("SELECT * FROM shopping_items").all();
  return c.json(result.results);
});

app.post("/api/items", async (c) => {
  const { name } = await c.req.json();
  const db = c.env.DB;
  const result = await db
    .prepare("INSERT INTO shopping_items (name) VALUES (?)")
    .bind(name)
    .run();

  // Retrieve the newly created item using last_row_id
  const newItem = await db
    .prepare("SELECT * FROM shopping_items WHERE id = ?")
    .bind(result.meta.last_row_id)
    .first();

  // Set the status code to 201 Created and return the newly created item
  return c.json(newItem, 201);
});

app.patch("/api/items/:id", async (c) => {
  const id = c.req.param("id");
  const updateData = await c.req.json();
  const fields = Object.keys(updateData);

  if (fields.length === 0) {
    return Response.json({ error: "No fields provided" }, { status: 400 });
  }

  // Dynamic SQL generation
  const setClause = fields.map((f) => `${f} = ?`).join(", ");
  const query = `UPDATE shopping_items SET ${setClause} WHERE id = ?`;

  const values = fields.map((f) => updateData[f]);

  const db = c.env.DB;
  const result = await db
    .prepare(query)
    .bind(...values, id)
    .run();
  if (result.success && result.meta.changes > 0) {
    return c.newResponse(null, 204); // 204 No Content
  } else {
    return c.json({ error: "Item not found or not updated" }, 404);
  }
});

app.delete("/api/items/:id", async (c) => {
  const id = c.req.param("id");
  const db = c.env.DB;
  const result = await db
    .prepare("DELETE FROM shopping_items WHERE id = ?")
    .bind(id)
    .run();
  console.log(result);
  if (result.meta.changes === 0) {
    return c.json({ error: "Not found" }, 404);
  }
  return c.body(null, 204);
});

app.delete("/api/items", async (c) => {
  const { ids } = await c.req.json();

  if (!Array.isArray(ids) || ids.length === 0) {
    return c.json({ error: "No IDs provided" }, 400);
  }

  const db = c.env.DB;
  const placeholders = ids.map(() => "?").join(",");
  const result = await db
    .prepare(`DELETE FROM shopping_items WHERE id IN (${placeholders})`)
    .bind(...ids)
    .run();

  if (result.meta.changes === 0) {
    return c.json({ error: "No matching items found" }, 404);
  }

  return c.body(null, 204);
});

export default app;
