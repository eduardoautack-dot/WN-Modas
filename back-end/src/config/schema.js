// ===============================
// SCHEMAS DE DOMÍNIO
// ===============================

// CLIENTES
export const CustomerSchema = {
    key: "clientes",                 // usado no front-end
    display: "Cadastro de Clientes", // nome bonito
    collection: "customers",         // nome real no MongoDB
    idField: "id",                   // campo de ID sequencial

    fields: [
        { name: "id",        label: "ID",                type: "number",  required: true, visible: false, readonly: true },
        { name: "name",      label: "Nome",              type: "text",    required: true, visible: true },
        { name: "email",     label: "E-mail",            type: "email",   required: false, visible: true },
        { name: "phone",     label: "Telefone",          type: "telefone",required: true, visible: true },
        { name: "cpf",       label: "CPF",               type: "cpf",     visible: true },
        { name: "zipcode",   label: "CEP",               type: "cep",     visible: true },
        { name: "address",   label: "Endereço",          type: "text",    visible: true },
        { name: "birthdate", label: "Data de Nascimento",type: "date",    visible: true },
        { name: "gender",    label: "Gênero",            type: "select",  options: ["Masculino","Feminino","Outro"], visible: true },
        { name: "orders",    label: "Pedidos",           type: "array",   visible: false }
    ],
    listFields: ["name", "email", "phone"]
};

// PRODUTOS
export const ProductSchema = {
    key: "produtos",
    display: "Cadastro de Produtos",
    collection: "products",
    idField: "id",
    fields: [
        { name: "id",        label: "ID",                type: "number",   readonly: true,  required: false, visible: false },
        { name: "sku",       label: "SKU",               type: "text",     required: true,  visible: true },
        { name: "category",  label: "Categoria",         type: "select",   required: true,  visible: true, options: [ "Masculino", "Feminino" ] },
        { name: "name",      label: "Nome do Produto",   type: "text",     required: true,  visible: true },
        { name: "costPrice", label: "Preço de Custo",    type: "number",   required: true,  visible: true },
        { name: "salePrice", label: "Preço de Venda",    type: "number",   required: true,  visible: true },
        { name: "imageUrl",  label: "Imagem do Produto", type: "string",   required: false, visible: true },
        { name: "stock",     label: "Estoque",           type: "number",   required: false, visible: false },
    ],

    listFields: ["sku", "name", "category", "salePrice"]
};

// FORNECEDORES
export const SupplierSchema = {
    key: "fornecedores",
    idField: "id",
    display: "Cadastro de Fornecedores",
    collection: "suppliers",

    fields: [
        { name: "id",                 label: "ID",                 type: "number", readonly: true, visible: false },
        { name: "cnpj",               label: "CNPJ",               type: "text",   required: true, visible: true },
        { name: "name",               label: "Razão Social",       type: "text",   visible: false },
        { name: "tradeName",          label: "Nome Fantasia",      type: "text",   required: true, visible: true },
        { name: "stateRegistration",  label: "Inscrição Estadual", type: "text",   visible: true },
        { name: "phone",              label: "Telefone",           type: "text",   visible: false },
        { name: "state",              label: "Estado",             type: "text",   required: true, visible: true }
    ],
    
    listFields: ["cnpj", "tradeName", "stateRegistration", "state"]
};

export const ExpenseSchema = {
    key: "despesas",
    apiPath: "/api/expenses",
    display: "Cadastro de Despesas",
    collection: "expenses",
    idField: "id",

    fields: [
        { name: "id",            label: "ID",                              type: "number", readonly: true, visible: false },
        { name: "date",          label: "Data de Pagamento",               type: "date",   required: false, visible: false },
        { name: "dueDate",       label: "Data de Vencimento",              type: "date",   required: true, visible: true },
        { name: "description",   label: "Descrição",                       type: "text",   required: false, visible: true },
        { name: "category",      label: "Categoria",                       type: "select", required: true, visible: true,  options: ["Conta variável", "Conta fixa"] },
        { name: "type",          label: "Tipo",                            type: "select", required: true, visible: true,  options: ["Parcela mensal", "Pag. único"] },
        { name: "paymentMethod", label: "Método de Pagamento",             type: "select", required: true, visible: true,  options: ["Boleto Bancário", "Cartão de Créd.", "Cartão de Déb.", "Dinheiro", "PIX"] },
        { name: "value",         label: "Valor",                           type: "number", required: true, visible: true },
        { name: "installments",  label: "Parcelas",                        type: "number", required: false, visible: true },
        { name: "paymentDate",   label: "Data de Efetivação do Pagamento", type: "date",   required: false, visible: false },
        { name: "status",        label: "Status",                          type: "select", required: false, visible: true, options: ["Pago", "Pendente", "Não pago"] },
        { name: "history",       label: "Histórico",                       type: "array",  visible: false }
    ],

    listFields: ["date", "dueDate", "category", "description", "value", "status"]
};

export const ALL_SCHEMAS = {
    customers: CustomerSchema,
    products: ProductSchema,
    suppliers: SupplierSchema,
    expenses: ExpenseSchema
};

export function getSchemaByCollection(collection) {
    return Object.values(ALL_SCHEMAS).find(s => s.collection === collection) || null;
}

export function getCustomerDbFieldsMap() {
    return CustomerSchema.fields.reduce((map, f) => {
        map[f.label] = f.name;
        return map;
    }, {});
}

export function getProductDbFieldsMap() {
    return ProductSchema.fields.reduce((map, f) => {
        map[f.label] = f.name;
        return map;
    }, {});
}

export function getSupplierDbFieldsMap() {
    return SupplierSchema.fields.reduce((map, f) => {
        map[f.label] = f.name;
        return map;
    }, {});
}

export function getExpenseDbFieldsMap() {
    return ExpenseSchema.fields.reduce((map, f) => {
        map[f.label] = f.name;
        return map;
    }, {});
}

export function normalizeCustomerInput(body = {}) {
    return {
        name: (body.name || "").trim(),
        email: (body.email || "").trim(),
        phone: (body.phone || "").trim(),
        cpf: (body.cpf || "").trim(),
        zipcode: (body.zipcode || "").trim(),
        address: (body.address || "").trim(),
        birthdate: body.birthdate || null,
        gender: body.gender || null,
        orders: Array.isArray(body.orders) ? body.orders : []
    };
}

export function normalizeProductInput(data) {
    return {
        sku: (data.sku || "").trim().toUpperCase(),
        name: (data.name || "").trim(),
        category: (data.category || "").trim(),
        costPrice: Number(data.costPrice || 0),
        salePrice: Number(data.salePrice || 0),
    
        imageUrl: data.imageUrl || null,
        stock: Number(data.stock || 0)
    };
}

export function normalizeSupplierInput(data) {
    return {
        cnpj: (data.cnpj || "").trim(),
        name: (data.name || "").trim(),
        phone: (data.phone || "").trim(),
        state: (data.state || "").trim(),
        tradeName: (data.tradeName || "").trim(),
        stateRegistration: (data.stateRegistration || "").trim()
    };
}

export function normalizeExpenseInput(body = {}) {
    function parseDate(d) {
        if (!d) return null;
        const [dia, mes, ano] = d.split("/");
        const dt = new Date(`${ano}-${mes}-${dia}T00:00:00`);
        return isNaN(dt.getTime()) ? null : dt;
    }

    const due = parseDate(body.dueDate);
    const installments = Number(body.installments || 0);
    const type = body.type || "";
    const value = Number(body.value || 0);

    // ============================
    // PARCELAS
    // ============================
    let installmentsData = [];

    if (type === "Parcela mensal" && installments > 0 && due) {
        for (let i = 0; i < installments; i++) {
            const venc = new Date(due);
            venc.setMonth(venc.getMonth() + i);

            installmentsData.push({
                number: i + 1,
                dueDate: venc,
                paymentDate: null,
                status: "Pendente",
                value: Number((value / installments).toFixed(2)),
            });
        }
    }

    return {
        date: parseDate(body.date),
        dueDate: due,
        paymentDate: parseDate(body.paymentDate),

        description: (body.description || "").trim(),
        category: body.category || null,
        type,
        paymentMethod: body.paymentMethod || null,
        value: value,

        installments,
        installmentsData,

        status: body.status || null,
        history: Array.isArray(body.history) ? body.history : [],
    };
}

export function validateCustomer(data) {
    const errors = [];

    if (!data.name) errors.push("Nome é obrigatório.");
    if (!data.phone) errors.push("Telefone é obrigatório.");

    if (data.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) {
        errors.push("E-mail inválido.");
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

export function validateProduct(data) {
    const errors = [];

    if (!data.name) errors.push("Nome do produto é obrigatório.");
    if (!data.category) errors.push("Categoria é obrigatória.");
    if (!data.sku) errors.push("SKU é obrigatório.");

    if (data.costPrice <= 0) errors.push("Preço de custo inválido.");
    if (data.salePrice <= 0) errors.push("Preço de venda inválido.");

    if (data.salePrice < data.costPrice) {
        errors.push("Preço de venda não pode ser menor que o preço de custo.");
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

export function validateSupplier(data) {
    const errors = [];

    if (!data.cnpj) errors.push("CNPJ é obrigatório.");
    if (!data.state) errors.push("Estado é obrigatório.");
    if (!data.tradeName) errors.push("Nome fantasia é obrigatório.");

    return {
        valid: errors.length === 0,
        errors
    };
}

export function validateExpense(expense) {
    const errors = [];

    if (!expense.dueDate) errors.push("A data de vencimento é obrigatória.");
    if (!expense.category) errors.push("A categoria é obrigatória.");
    if (!expense.type) errors.push("O tipo é obrigatório.");
    if (!expense.paymentMethod) errors.push("O método de pagamento é obrigatório.");
    if (expense.value <= 0) errors.push("O valor deve ser maior que zero.");

    if (expense.type === "Parcela mensal") {
        if (!expense.installments || expense.installments < 1) {
            errors.push("Informe a quantidade de parcelas.");
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}


export function computeExpenseStatus(expense) {

    const hoje = new Date();
    const tipo = expense.type;

    // ============================
    // PAGAMENTO ÚNICO
    // ============================
    if (tipo === "Pag. único") {
        if (expense.paymentDate) return "Pago";
        if (!expense.dueDate) return "Não pago";

        return expense.dueDate < hoje ? "Não pago" : "Pendente";
    }

    // ============================
    // PARCELADO
    // ============================
    const parcelas = expense.installmentsData || [];
    if (parcelas.length === 0) return "Pendente";

    const total = parcelas.length;
    const pagas = parcelas.filter(p => p.paymentDate != null).length;
    const atrasadas = parcelas.filter(p => !p.paymentDate && p.dueDate < hoje).length;

    if (pagas === total) return "Pago";
    if (atrasadas > 0) return "Não pago";
    if (pagas > 0 && pagas < total) return `Em andamento (${pagas}/${total})`;

    return `Pendente (${total} parcelas)`;
}