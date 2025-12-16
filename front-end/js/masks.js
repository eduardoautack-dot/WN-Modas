export function somenteNumeros(str) {
    return str.replace(/\D/g, "");
}

export async function formatarCEP(input) {
    let v = input.value.replace(/\D/g, "").slice(0, 8);
    if (v.length > 5) {
        v = v.replace(/(\d{5})(\d)/, "$1-$2");
    }
    input.value = v;
}

export async function formatarCPF(input) {
    let v = input.value.replace(/\D/g, "");
    v = v.slice(0, 11);
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    input.value = v;
}

export async function formatarCNPJ(input) {
    let v = input.value.replace(/\D/g, "");

    if (v.length > 14) v = v.slice(0, 14);

    v = v.replace(/^(\d{2})(\d)/, "$1.$2");
    v = v.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
    v = v.replace(/\.(\d{3})(\d)/, ".$1/$2");
    v = v.replace(/(\d{4})(\d)/, "$1-$2");

    input.value = v;
}

export async function formatarTelefone(input) {
    let v = input.value.replace(/\D/g, "");
    v = v.slice(0, 11);
    if (v.length <= 10) {
        v = v.replace(/(\d{2})(\d)/, "($1) $2");
        v = v.replace(/(\d{4})(\d)/, "$1-$2");
    } else {
        v = v.replace(/(\d{2})(\d)/, "($1) $2");
        v = v.replace(/(\d{5})(\d)/, "$1-$2");
    }
    input.value = v;
}

// --------------------
// MOEDA
// --------------------

export function moedaParaNumeroInteligente(valor) {
    if (!valor) return 0;

    try {
        // Remove R$, espaços e tudo exceto números e vírgula
        valor = valor
            .replace(/[^0-9,]/g, "") // remove símbolos, letras, pontos etc
            .replace(/,/g, ".");     // troca vírgula por ponto

        const numero = Number(valor);

        return isNaN(numero) ? 0 : numero;
    } catch (e) {
        console.error("❌ Erro na conversão de moeda:", valor, e);
        return 0;
    }
}

export function aplicarMascaraMoedaInteligente(input) {
    input.setAttribute("inputmode", "numeric");
    input.type = "text";

    input.addEventListener("input", () => {
        let value = input.value.replace(/\D/g, "");

        if (!value) {
            input.value = "";
            return;
        }

        // Divide por 100 para obter centavos
        value = (parseInt(value) / 100).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
            minimumFractionDigits: 2
        });

        input.value = value;
    });
}

export function dataBRparaJS(data) {
    if (!dataValidaBR(data)) return null;
    const [d, m, a] = data.split("/").map(Number);
    return new Date(a, m - 1, d);
}

export function formatarDataBR(input) {
    let v = input.value.replace(/\D/g, "").slice(0, 8);

    if (v.length >= 5) input.value = v.replace(/(\d{2})(\d{2})(\d{0,4})/, "$1/$2/$3");
    else if (v.length >= 3) input.value = v.replace(/(\d{2})(\d{0,2})/, "$1/$2");
    else input.value = v;
}

export function dataJStoBR(date) {
    if (!(date instanceof Date)) return "";
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const a = date.getFullYear();
    return `${d}/${m}/${a}`;
}

export function dataValidaBR(str) {
    if (!str) return false;
    const partes = str.split("/");
    if (partes.length !== 3) return false;

    const [dia, mes, ano] = partes.map(n => parseInt(n, 10));
    if (!dia || !mes || !ano) return false;
    if (ano < 1900 || ano > 2400) return false;

    const data = new Date(ano, mes - 1, dia);

    return (
        data.getFullYear() === ano &&
        data.getMonth() === mes - 1 &&
        data.getDate() === dia
    );
}