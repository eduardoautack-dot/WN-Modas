import axios from "axios";
import { dbConnect } from "../config/database.js";
import { getNextSequence } from "../utils/sequence.js";
import { SupplierSchema, normalizeSupplierInput, validateSupplier, getSupplierDbFieldsMap } from "../config/schema.js";

const DB_NAME = "website";
const DB_FIELDS = getSupplierDbFieldsMap();
const COLLECTION = SupplierSchema.collection;

export default function suppliersRoutes(app) {
    app.get("/api/suppliers", async (req, res) => {
        try {
            const db = await dbConnect(DB_NAME);
            const col = db.collection(COLLECTION);

            const { search } = req.query;
            let filter = {};

            if (search && search.trim() !== "") {
                const s = search.trim();
                filter = {
                    $or: [
                        { [DB_FIELDS["Cnpj"]]: { $regex: s, $options: "i" } },
                        { [DB_FIELDS["name"]]: { $regex: s, $options: "i" } },
                        { [DB_FIELDS["tradeName"]]: { $regex: s, $options: "i" } }
                    ]
                };
            }

            const suppliers = await col
                .find(filter)
                .sort({ createdAt: -1 })
                .toArray();

            return res.json({
                success: true,
                total: suppliers.length,
                data: suppliers
            });

        } catch (err) {
            console.error("[🔴 - SUPPLIERS] Erro ao listar fornecedores:", err);
            return res.status(500).json({
                success: false,
                message: "Erro interno ao listar fornecedores.",
                error: err.message
            });
        }
    });

    app.get("/api/suppliers/:id", async (req, res) => {
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

            const supplier = await col.findOne({ id });

            if (!supplier) {
                return res.status(404).json({
                    success: false,
                    message: "Fornecedor não encontrado."
                });
            }

            return res.json({
                success: true,
                data: supplier
            });

        } catch (err) {
            console.error("[🔴 - SUPPLIERS] Erro ao buscar fornecedor:", err);
            return res.status(500).json({
                success: false,
                message: "Erro interno ao buscar fornecedor.",
                error: err.message
            });
        }
    });

    app.post("/api/suppliers", async (req, res) => {
        try {
            const db = await dbConnect(DB_NAME);
            const col = db.collection(COLLECTION);

            const supplier = normalizeSupplierInput(req.body);
            const { valid, errors } = validateSupplier(supplier);

            if (!valid) {
                return res.status(400).json({
                    success: false,
                    message: "Dados inválidos.",
                    errors
                });
            }

            const exists = await col.findOne({ cnpj: supplier.cnpj });
            if (exists) {
                return res.status(400).json({
                    success: false,
                    message: "Já existe um fornecedor com esse CNPJ.",
                    field: "cnpj"
                });
            }

            const nextId = await getNextSequence(COLLECTION, DB_NAME);
            const now = new Date();

            const doc = {
                ...supplier,
                id: nextId,
                createdAt: now,
                updatedAt: now
            };

            await col.insertOne(doc);

            return res.status(201).json({
                success: true,
                message: "Fornecedor cadastrado com sucesso!",
                data: doc
            });

        } catch (err) {
            console.error("[🔴 - SUPPLIERS] Erro ao criar fornecedor:", err);
            return res.status(500).json({
                success: false,
                message: "Erro interno ao criar fornecedor.",
                error: err.message
            });
        }
    });

    app.put("/api/suppliers/:id", async (req, res) => {
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

            const supplier = normalizeSupplierInput(req.body);
            const { valid, errors } = validateSupplier(supplier);

            if (!valid) {
                return res.status(400).json({
                    success: false,
                    message: "Dados inválidos.",
                    errors
                });
            }

            const exists = await col.findOne({
                cnpj: supplier.cnpj,
                id: { $ne: id }
            });

            if (exists) {
                return res.status(400).json({
                    success: false,
                    message: "Já existe outro fornecedor com esse CNPJ.",
                    field: "cnpj"
                });
            }

            const now = new Date();
            const result = await col.findOneAndUpdate(
                { id },
                { $set: { ...supplier, updatedAt: now } },
                { returnDocument: "after" }
            );

            if (!result) {
                return res.status(404).json({
                    success: false,
                    message: "Fornecedor não encontrado."
                });
            }

            return res.json({
                success: true,
                message: "Fornecedor atualizado com sucesso!",
                data: result
            });

        } catch (err) {
            console.error("[🔴 - SUPPLIERS] Erro ao atualizar fornecedor:", err);
            return res.status(500).json({
                success: false,
                message: "Erro interno ao atualizar fornecedor.",
                error: err.message
            });
        }
    });

    app.delete("/api/suppliers/:id", async (req, res) => {
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
                    message: "Fornecedor não encontrado."
                });
            }

            return res.json({
                success: true,
                message: "Fornecedor excluído com sucesso!"
            });

        } catch (err) {
            console.error("[🔴 - SUPPLIERS] Erro ao excluir fornecedor:", err);
            return res.status(500).json({
                success: false,
                message: "Erro interno ao excluir fornecedor.",
                error: err.message
            });
        }
    });

    app.get("/api/suppliers/cnpj/:cnpj", async (req, res) => {
        try {
            let { cnpj } = req.params;

            if (!cnpj) {
                return res.status(400).json({
                    success: false,
                    message: "CNPJ não informado."
                });
            }

            // 🔹 remove caracteres especiais
            cnpj = cnpj.replace(/\D/g, "");

            if (cnpj.length !== 14) {
                return res.status(400).json({
                    success: false,
                    message: "CNPJ inválido."
                });
            }

            const url = `https://www.receitaws.com.br/v1/cnpj/${cnpj}`;
            const response = await axios.get(url, {
                headers: { 
                    "Authorization": "Bearer " + process.env.RECEITAWS_API,
                    "Accept": "application/json" 
                }
            });

            const data = response.data;

            if (data.status === "ERROR") {
                return res.status(400).json({
                    success: false,
                    message: data.message || "Erro ao consultar CNPJ."
                });
            }

            // 🔹 Normaliza os campos importantes do fornecedor
            const fornecedor = {
                cnpj,
                name: data.nome || "",
                state: data.uf || "",
                phone: data.telefone || "",
                tradeName: data.fantasia || "",
                stateRegistration: data.inscricao_estadual || "",
            };

            return res.json({
                success: true,
                data: fornecedor
            });

        } catch (err) {
            console.error("[🔴 - CNPJ] Erro ao consultar ReceitaWS:", err);

            if (err.response?.status === 429) {
                return res.status(429).json({
                    success: false,
                    message: "Limite de consultas da API excedido. Tente novamente mais tarde."
                });
            }

            return res.status(500).json({
                success: false,
                message: "Erro interno ao consultar CNPJ.",
                error: err.message
            });
        }
    });
}