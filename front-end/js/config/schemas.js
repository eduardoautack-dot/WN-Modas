// front-end/js/config/schemas.js
export const CustomerSchema = {
    key: "clientes",
    apiPath: "/api/customers",
    display: "Cadastro de Clientes",
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

export const ProductSchema = {
    key: "produtos",
    apiPath: "/api/products",
    display: "Cadastro de Produtos",

    fields: [
        { name: "id",          label: "ID",               type: "number",   readonly: true,  required: false, visible: false },
        { name: "sku",         label: "SKU",               type: "text",    required: true,  visible: true },
        { name: "category",    label: "Categoria",         type: "select",  required: true,  visible: true,   options: ["Masculino", "Feminino"]},
        { name: "name",        label: "Nome do Produto",   type: "text",    required: true,  visible: true },
        { name: "costPrice",   label: "Preço de Custo",    type: "number",    required: true,  visible: true,   mask: "currency" },
        { name: "salePrice",   label: "Preço de Venda",    type: "number",    required: true,  visible: true,   mask: "currency" },
        { name: "imageUrl",    label: "Imagem do Produto", type: "image",   required: false, visible: true },
        { name: "stock",       label: "Estoque",           type: "number",  required: false, visible: true }
    ],

    listFields: ["sku", "name", "category", "salePrice", "stock"]
};

export const SupplierSchema = {
    key: "fornecedores",
    apiPath: "/api/suppliers",
    display: "Cadastro de Fornecedores",
    fields: [
        { name: "id",                 label: "ID",                 type: "number", readonly: true, visible: false },
        { name: "cnpj",               label: "CNPJ",               type: "text",   required: true, visible: true },
        { name: "name",               label: "Razão Social",       type: "text",   visible: true },
        { name: "tradeName",          label: "Nome Fantasia",      type: "text",   required: true, visible: true },
        { name: "stateRegistration",  label: "Inscrição Estadual", type: "text",   visible: true },
        { name: "phone",              label: "Telefone",           type: "text",   visible: true },
        { name: "state",              label: "Estado",             type: "text",   required: true, visible: true }
    ],
    
    listFields: ["cnpj", "tradeName", "state"]
};

export const ExpenseSchema = {
    key: "despesas",
    apiPath: "/api/expenses",
    display: "Cadastro de Despesas",
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

export const SCHEMAS = {
    clientes: CustomerSchema,
    produtos: ProductSchema,
    fornecedores: SupplierSchema,
    despesas: ExpenseSchema
};