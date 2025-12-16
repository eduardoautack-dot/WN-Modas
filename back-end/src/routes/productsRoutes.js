import { dbConnect } from "../config/database.js";
import { getNextSequence } from "../utils/sequence.js";
import { ProductSchema, normalizeProductInput, validateProduct, getProductDbFieldsMap } from "../config/schema.js";

const DB_NAME = "website";
const DB_FIELDS = getProductDbFieldsMap();
const COLLECTION = ProductSchema.collection;

export default function productsRoutes(app) {
    app.get("/api/products", async (req, res) => {
        try {
            const db = await dbConnect(DB_NAME);
            const col = db.collection(COLLECTION);

            const { search } = req.query;
            let filter = {};

            if (search && search.trim() !== "") {
                const s = search.trim();

                filter = {
                    $or: [
                        { [DB_FIELDS["Nome"]]: { $regex: s, $options: "i" } },
                        { [DB_FIELDS["Categoria"]]: { $regex: s, $options: "i" } },
                        { [DB_FIELDS["SKU"]]: { $regex: s, $options: "i" } }
                    ]
                };
            }

            const products = await col
                .find(filter)
                .sort({ createdAt: -1 })
                .toArray();

            return res.json({
                success: true,
                total: products.length,
                data: products
            });

        } catch (err) {
            console.error("[🔴 - PRODUCTS] Erro ao listar produtos:", err);
            return res.status(500).json({
                success: false,
                message: "Erro interno ao listar produtos.",
                error: err.message
            });
        }
    });

    app.get("/api/products/:id", async (req, res) => {
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

            const product = await col.findOne({ id });

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: "Produto não encontrado."
                });
            }

            return res.json({
                success: true,
                data: product
            });

        } catch (err) {
            console.error("[🔴 - PRODUCTS] Erro ao buscar produto:", err);
            return res.status(500).json({
                success: false,
                message: "Erro interno ao buscar produto.",
                error: err.message
            });
        }
    });

    app.post("/api/products", async (req, res) => {
        try {
            const db = await dbConnect(DB_NAME);
            const col = db.collection(COLLECTION);

            const product = normalizeProductInput(req.body);
            const { valid, errors } = validateProduct(product);

            if (!valid) {
                return res.status(400).json({
                    success: false,
                    message: "Dados inválidos.",
                    errors
                });
            }

            // 🔍 SKU Não Pode Duplicar
            if (product.sku && product.sku.trim() !== "") {
                const exists = await col.findOne({ sku: product.sku });
                if (exists) {
                    return res.status(400).json({
                        success: false,
                        message: "Já existe um produto com esse SKU.",
                        field: "sku"
                    });
                }
            }

            const cleanProduct = {};
            for (const key in product) {
                const v = product[key];
                cleanProduct[key] =
                    v === null || v === undefined || v === ""
                        ? "Não preenchido."
                        : v;
            }

            const nextId = await getNextSequence(COLLECTION, DB_NAME);
            const now = new Date();

            const doc = {
                ...cleanProduct,
                id: nextId,
                createdAt: now,
                updatedAt: now
            };

            await col.insertOne(doc);

            return res.status(201).json({
                success: true,
                message: "Produto cadastrado com sucesso!",
                data: doc
            });

        } catch (err) {
            console.error("[🔴 - PRODUCTS] Erro ao criar produto:", err);
            return res.status(500).json({
                success: false,
                message: "Erro interno ao criar produto.",
                error: err.message
            });
        }
    });

    app.put("/api/products/:id", async (req, res) => {
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

            const product = normalizeProductInput(req.body);
            const { valid, errors } = validateProduct(product);

            if (!valid) {
                return res.status(400).json({
                    success: false,
                    message: "Dados inválidos.",
                    errors
                });
            }

            if (product.sku && product.sku.trim() !== "") {
                const exists = await col.findOne({
                    sku: product.sku,
                    id: { $ne: id }
                });

                if (exists) {
                    return res.status(400).json({
                        success: false,
                        message: "Já existe outro produto com esse SKU.",
                        field: "sku"
                    });
                }
            }

            const now = new Date();

            const filtro = {
                id: { $in: [id, String(id)] }
            };

            const result = await col.findOneAndUpdate(
                filtro,
                { $set: { ...product, updatedAt: now } },
                { returnDocument: "after" }
            );

            if (!result) {
                return res.status(404).json({
                    success: false,
                    message: "Produto não encontrado."
                });
            }

            return res.json({
                success: true,
                message: "Produto atualizado com sucesso!",
                data: result
            });

        } catch (err) {
            console.error("[🔴 - PRODUCTS] Erro ao atualizar produto:", err);
            return res.status(500).json({
                success: false,
                message: "Erro interno ao atualizar produto.",
                error: err.message
            });
        }
    });

    app.delete("/api/products/:id", async (req, res) => {
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
                    message: "Produto não encontrado."
                });
            }

            return res.json({
                success: true,
                message: "Produto excluído com sucesso!"
            });

        } catch (err) {
            console.error("[🔴 - PRODUCTS] Erro ao excluir produto:", err);
            return res.status(500).json({
                success: false,
                message: "Erro interno ao excluir produto.",
                error: err.message
            });
        }
    });
}