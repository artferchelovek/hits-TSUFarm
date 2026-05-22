import { Router } from "express";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { saves } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);

const slotSchema = z.coerce.number().int().min(1).max(5);

const saveSchema = z.object({
  name: z.string().max(64).optional(),
  gameState: z.record(z.any()),
  worldData: z.string().min(1),
});

function slotParam(req: any): number {
  const parsed = slotSchema.safeParse(Number(req.params.slot));
  if (!parsed.success) throw parsed.error;
  return parsed.data;
}

async function getSave(userId: number, slot: number) {
  const [save] = await db
    .select()
    .from(saves)
    .where(and(eq(saves.userId, userId), eq(saves.slot, slot)))
    .limit(1);
  return save ?? null;
}

router.get("/", async (req, res) => {
  const userId = req.user!.userId;
  const allSaves = await db
    .select({
      slot: saves.slot,
      name: saves.name,
      timestamp: saves.timestamp,
      updatedAt: saves.updatedAt,
    })
    .from(saves)
    .where(eq(saves.userId, userId));

  const slotMap = new Map(allSaves.map((s) => [s.slot, s]));
  const result = Array.from({ length: 5 }, (_, i) => {
    const slot = i + 1;
    return slotMap.get(slot) ?? { slot, name: null, timestamp: null, updatedAt: null };
  });

  res.json(result);
});

router.put("/:slot", async (req, res) => {
  try {
    const userId = req.user!.userId;
    const slot = slotParam(req);
    const body = saveSchema.parse(req.body);

    const existing = await getSave(userId, slot);

    const data = {
      userId,
      slot,
      name: body.name ?? existing?.name ?? `Слот ${slot}`,
      gameState: body.gameState,
      worldData: body.worldData,
      timestamp: Date.now(),
    };

    if (existing) {
      const [updated] = await db
        .update(saves)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(saves.userId, userId), eq(saves.slot, slot)))
        .returning();
      res.json(updated);
    } else {
      const [created] = await db.insert(saves).values(data).returning();
      res.status(201).json(created);
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.flatten() });
      return;
    }
    throw err;
  }
});

router.get("/:slot", async (req, res) => {
  try {
    const userId = req.user!.userId;
    const slot = slotParam(req);
    const save = await getSave(userId, slot);

    if (!save) {
      res.status(404).json({ error: "Save not found" });
      return;
    }

    res.json(save);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.flatten() });
      return;
    }
    throw err;
  }
});

router.delete("/:slot", async (req, res) => {
  try {
    const userId = req.user!.userId;
    const slot = slotParam(req);

    await db
      .delete(saves)
      .where(and(eq(saves.userId, userId), eq(saves.slot, slot)));

    res.status(204).end();
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.flatten() });
      return;
    }
    throw err;
  }
});

export default router;
