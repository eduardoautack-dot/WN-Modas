import { MongoClient } from "mongodb";

// ===============================
// 🔹 Lê variável de ambiente
// ===============================
const uri = process.env.MONGO_URI;

if (!uri) {
    console.error("[❌ - DATABASE] ERRO FATAL: MONGO_URI não encontrado no .env!");
    process.exit(1); // para o servidor imediatamente
}

// ===============================
// 🔹 Conexão compartilhada
// ===============================
let client = null;
let dbCache = {};


// ===============================
// 🔹 Conecta e retorna o client
// ===============================
export async function mongoClient() {
    try {
        if (client) return client;

        client = new MongoClient(uri, {
            connectTimeoutMS: 30000,
            maxPoolSize: 20
        });

        await client.connect();
        console.log("[🟢 - DATABASE] MongoDB conectado com sucesso!");

        return client;

    } catch (err) {
        console.error("[🔴 - DATABASE] Erro ao conectar no MongoDB:", err);
        throw err;
    }
}


// ===============================
// 🔹 Conectar ao banco
// 🔹 SEMPRE usando "website" como padrão
// ===============================
export async function dbConnect(databaseName = "website") {
    try {
        if (dbCache[databaseName]) {
            return dbCache[databaseName];
        }

        const cli = await mongoClient();
        const db = cli.db(databaseName);

        dbCache[databaseName] = db;
        return db;

    } catch (err) {
        console.error("[🔴 - DATABASE] Erro ao acessar banco:", err);
        throw err;
    }
}