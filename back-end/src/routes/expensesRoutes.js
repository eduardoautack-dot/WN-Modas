import { dbConnect } from "../config/database.js";
import { getNextSequence } from "../utils/sequence.js";
import { ExpenseSchema, normalizeExpenseInput, validateExpense, computeExpenseStatus } from "../config/schema.js";

const DB_NAME = "website";
const COLLECTION = ExpenseSchema.collection || "expenses";

export default function expensesRoutes(app) {
    // =====================================================
    // GET /api/expenses  → listar
    // =====================================================
    app.get("/api/expenses", async (req, res) => {
        try {
            const db = await dbConnect(DB_NAME);
            const col = db.collection(COLLECTION);

            const { search } = req.query;
            let filter = {};

            if (search && search.trim() !== "") {
                const s = search.trim();
                filter = {
                    $or: [
                        { description: { $regex: s, $options: "i" } },
                        { category:    { $regex: s, $options: "i" } },
                        { type:        { $regex: s, $options: "i" } },
                        { status:      { $regex: s, $options: "i" } }
                    ]
                };
            }

            const list = await col
                .find(filter)
                .sort({ dueDate: 1 })
                .toArray();

            return res.json({
                success: true,
                total: list.length,
                data: list
            });

        } catch (err) {
            console.error("[🔴 - EXPENSES] Erro ao listar:", err);
            return res.status(500).json({
                success: false,
                message: "Erro interno ao listar despesas.",
                error: err.message
            });
        }
    });

    // =====================================================
    // GET /api/expenses/:id → detalhe
    // =====================================================
    app.get("/api/expenses/:id", async (req, res) => {
        try {
            const id = Number(req.params.id);
            if (Number.isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: "ID inválido."
                });
            }

            const db = await dbConnect(DB_NAME);
            const col = db.collection(COLLECTION);

            const doc = await col.findOne({ id });
            if (!doc) {
                return res.status(404).json({
                    success: false,
                    message: "Despesa não encontrada."
                });
            }

            return res.json({
                success: true,
                data: doc
            });

        } catch (err) {
            console.error("[🔴 - EXPENSES] Erro ao buscar:", err);
            return res.status(500).json({
                success: false,
                message: "Erro interno ao buscar despesa.",
                error: err.message
            });
        }
    });

    // =====================================================
    // POST /api/expenses → criar
    // =====================================================
    app.post("/api/expenses", async (req, res) => {
        try {
            const db = await dbConnect(DB_NAME);
            const col = db.collection(COLLECTION);

            const expense = normalizeExpenseInput(req.body);
            const { valid, errors } = validateExpense(expense);
            console.log(expense)

            if (!valid) {
                return res.status(400).json({
                    success: false,
                    message: "Dados inválidos.",
                    errors
                });
            }

            // status calculado após normalize + validate
            const status = computeExpenseStatus(expense);
            expense.status = status;

            // histórico
            expense.history = [{
                date: new Date(),
                action: "Despesa criada",
                status
            }];

            const nextId = await getNextSequence(COLLECTION, DB_NAME);
            const now = new Date();

            const doc = {
                ...expense,
                id: nextId,
                createdAt: now,
                updatedAt: now
            };

            await col.insertOne(doc);

            return res.status(201).json({
                success: true,
                message: "Despesa cadastrada com sucesso!",
                data: doc
            });

        } catch (err) {
            console.error("[🔴 - EXPENSES] Erro ao criar:", err);
            return res.status(500).json({
                success: false,
                message: "Erro interno ao criar despesa.",
                error: err.message
            });
        }
    });

    // =====================================================
    // PUT /api/expenses/:id → atualizar
    // =====================================================
    app.put("/api/expenses/:id", async (req, res) => {
        try {
            const id = Number(req.params.id);
            if (Number.isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: "ID inválido."
                });
            }

            const db = await dbConnect(DB_NAME);
            const col = db.collection(COLLECTION);

            const atual = await col.findOne({ id });
            if (!atual) {
                return res.status(404).json({
                    success: false,
                    message: "Despesa não encontrada."
                });
            }

            const expense = normalizeExpenseInput(req.body);
            const { valid, errors } = validateExpense(expense);

            if (!valid) {
                return res.status(400).json({
                    success: false,
                    message: "Dados inválidos.",
                    errors
                });
            }

            const newStatus = computeExpenseStatus(expense);
            expense.status = newStatus;

            const history = Array.isArray(atual.history) ? [...atual.history] : [];
            history.push({
                date: new Date(),
                action: "Despesa atualizada",
                fromStatus: atual.status || null,
                toStatus: newStatus
            });

            expense.history = history;

            const now = new Date();

            const result = await col.findOneAndUpdate(
                { id },
                { $set: { ...expense, updatedAt: now } },
                { returnDocument: "after" }
            );

            return res.json({
                success: true,
                message: "Despesa atualizada com sucesso!",
                data: result.value
            });

        } catch (err) {
            console.error("[🔴 - EXPENSES] Erro ao atualizar:", err);
            return res.status(500).json({
                success: false,
                message: "Erro interno ao atualizar despesa.",
                error: err.message
            });
        }
    });

    // =====================================================
    // DELETE /api/expenses/:id → excluir
    // =====================================================
    app.delete("/api/expenses/:id", async (req, res) => {
        try {
            const id = Number(req.params.id);
            if (Number.isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    message: "ID inválido."
                });
            }

            const db = await dbConnect(DB_NAME);
            const col = db.collection(COLLECTION);

            const result = await col.deleteOne({ id });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Despesa não encontrada."
                });
            }

            return res.json({
                success: true,
                message: "Despesa excluída com sucesso!"
            });

        } catch (err) {
            console.error("[🔴 - EXPENSES] Erro ao excluir:", err);
            return res.status(500).json({
                success: false,
                message: "Erro interno ao excluir despesa.",
                error: err.message
            });
        }
    });

}
