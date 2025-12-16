import { dbConnect } from "../config/database.js";
import { getNextSequence } from "../utils/sequence.js";
import { CustomerSchema, getCustomerDbFieldsMap, normalizeCustomerInput, validateCustomer } from "../config/schema.js";

const DB_NAME = "website";
const DB_FIELDS = getCustomerDbFieldsMap();
const COLLECTION = CustomerSchema.collection;

export default function customersRoutes(app) {
    app.get("/api/customers", async (req, res) => {
        try {
            const db = await dbConnect(DB_NAME);
            const col = db.collection(COLLECTION);

            const { search } = req.query;
            let filter = {};

            if (search && search.trim() !== "") {
                const s = search.trim();
                filter = {
                    $or: [
                        { [DB_FIELDS["Nome"]]:    { $regex: s, $options: "i" } },
                        { [DB_FIELDS["Telefone"]]:{ $regex: s, $options: "i" } },
                        { [DB_FIELDS["E-mail"]]:  { $regex: s, $options: "i" } }
                    ]
                };
            }

            const customers = await col
                .find(filter)
                .sort({ createdAt: -1 })
                .toArray();

            return res.json({
                success: true,
                total: customers.length,
                data: customers
            });

        } catch (err) {
            console.error("[🔴 - CUSTOMERS] Erro ao listar clientes:", err);
            return res.status(500).json({
                success: false,
                message: "Erro interno ao listar clientes.",
                error: err.message
            });
        }
    });

    app.get("/api/customers/:id", async (req, res) => {
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

            const customer = await col.findOne({ id });

            if (!customer) {
                return res.status(404).json({
                    success: false,
                    message: "Cliente não encontrado."
                });
            }

            return res.json({
                success: true,
                data: customer
            });

        } catch (err) {
            console.error("[🔴 - CUSTOMERS] Erro ao buscar cliente:", err);
            return res.status(500).json({
                success: false,
                message: "Erro interno ao buscar cliente.",
                error: err.message
            });
        }
    });

    app.post("/api/customers", async (req, res) => {
        try {
            const db = await dbConnect(DB_NAME);
            const col = db.collection(COLLECTION);

            const customer = normalizeCustomerInput(req.body);
            const { valid, errors } = validateCustomer(customer);

            if (!valid) {
                return res.status(400).json({
                    success: false,
                    message: "Dados inválidos.",
                    errors
                });
            }

            if (customer.phone && customer.phone.trim() !== "") {
                const exists = await col.findOne({ phone: customer.phone });

                if (exists) {
                    return res.status(400).json({
                        success: false,
                        message: "Já existe um cliente cadastrado com esse telefone.",
                        field: "phone"
                    });
                }
            }

            const cleanCustomer = {};
            for (const key in customer) {
                const value = customer[key];

                if (value === null || value === undefined || value === "") {
                    cleanCustomer[key] = "Não preenchido.";
                } else {
                    cleanCustomer[key] = value;
                }
            }

            const nextId = await getNextSequence(COLLECTION, DB_NAME);
            const now = new Date();

            const doc = {
                ...cleanCustomer,
                id: nextId,
                createdAt: now,
                updatedAt: now
            };

            await col.insertOne(doc);
            return res.status(201).json({
                success: true,
                message: "Cliente cadastrado com sucesso!",
                data: doc
            });

        } catch (err) {
            console.error("[🔴 - CUSTOMERS] Erro ao criar cliente:", err);
            return res.status(500).json({
                success: false,
                message: "Erro interno ao criar cliente.",
                error: err.message
            });
        }
    });

    app.put("/api/customers/:id", async (req, res) => {
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

            const customer = normalizeCustomerInput(req.body);
            const { valid, errors } = validateCustomer(customer);

            if (!valid) {
                return res.status(400).json({
                    success: false,
                    message: "Dados inválidos.",
                    errors
                });
            }

            if (customer.phone && customer.phone.trim() !== "") {
                const exists = await col.findOne({
                    phone: customer.phone,
                    id: { $ne: id } 
                });

                if (exists) {
                    return res.status(400).json({
                        success: false,
                        message: "Já existe um cliente cadastrado com esse telefone.",
                        field: "phone"
                    });
                }
            }

            const now = new Date();

            const filtro = {
                id: { $in: [id, String(id)] }
            };

            const result = await col.findOneAndUpdate(
                filtro,
                { $set: { ...customer, updatedAt: now } },
                { returnDocument: "after" }
            );

            if (!result) {
                return res.status(404).json({
                    success: false,
                    message: "Cliente não encontrado."
                });
            }

            return res.json({
                success: true,
                message: "Cliente atualizado com sucesso!",
                data: result
            });

        } catch (err) {
            console.error("[🔴 - CUSTOMERS] Erro ao atualizar cliente:", err);
            return res.status(500).json({
                success: false,
                message: "Erro interno ao atualizar cliente.",
                error: err.message
            });
        }

    });

    app.delete("/api/customers/:id", async (req, res) => {
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
                    message: "Cliente não encontrado."
                });
            }

            return res.json({
                success: true,
                message: "Cliente excluído com sucesso!"
            });

        } catch (err) {
            console.error("[🔴 - CUSTOMERS] Erro ao excluir cliente:", err);
            return res.status(500).json({
                success: false,
                message: "Erro interno ao excluir cliente.",
                error: err.message
            });
        }
    });

    app.post("/api/customers/:id/orders", async (req, res) => {
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

            const order = {
                idPedido: req.body.idPedido || Date.now(),
                data: req.body.data ? new Date(req.body.data) : new Date(),
                itens: Array.isArray(req.body.itens) ? req.body.itens : [],
                total: Number(req.body.total || 0),
                status: req.body.status || "pendente",
                canal: req.body.canal || "Website"
            };

            const result = await col.findOneAndUpdate(
                { id },
                { $push: { orders: order }, $set: { updatedAt: new Date() } },
                { returnDocument: "after" }
            );

            if (!result.value) {
                return res.status(404).json({
                    success: false,
                    message: "Cliente não encontrado."
                });
            }

            return res.json({
                success: true,
                message: "Pedido adicionado com sucesso!",
                data: result.value
            });

        } catch (err) {
            console.error("[🔴 - CUSTOMERS] Erro ao adicionar pedido:", err);
            return res.status(500).json({
                success: false,
                message: "Erro interno ao adicionar pedido.",
                error: err.message
            });
        }
    });

    app.get("/api/customers/:id/orders", async (req, res) => {
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

            const customer = await col.findOne(
                { id },
                { projection: { orders: 1, _id: 0 } }
            );

            if (!customer) {
                return res.status(404).json({
                    success: false,
                    message: "Cliente não encontrado."
                });
            }

            return res.json({
                success: true,
                data: customer.orders || []
            });

        } catch (err) {
            console.error("[🔴 - CUSTOMERS] Erro ao listar pedidos:", err);
            return res.status(500).json({
                success: false,
                message: "Erro interno ao listar pedidos.",
                error: err.message
            });
        }
    });
}