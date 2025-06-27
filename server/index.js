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
  await db
    .prepare("INSERT INTO shopping_items (name) VALUES (?)")
    .bind(name)
    .run();
  return c.json({ success: true });
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
  await db.prepare(query).bind(...values, id).run();
  return c.json({ success: true });
});

app.delete("/api/items/:id", async (c) => {
  const id = c.req.param("id");
  const db = c.env.DB;
  await db.prepare("DELETE FROM shopping_items WHERE id = ?").bind(id).run();
  return c.json({ success: true });
});

export default app;
