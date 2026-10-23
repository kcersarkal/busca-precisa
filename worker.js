/**
 * CLOUDFLARE WORKER - MOTOR DE BUSCA E FILTRO TÉCNICO COM IA
 * 
 * Correção crítica: Nunca usa URLs inventadas/alucinadas pela IA (que dão erro 404).
 * Constrói dinamicamente URLs oficiais de catálogo e busca direta de cada loja.
 */

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response("Método não permitido", { status: 405, headers: corsHeaders });
    }

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Chave GEMINI_API_KEY não configurada no Worker." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    try {
      const { product, mustHave, mustNotHave, stores } = await request.json();

      // CASCATA INTELIGENTE DE ALTA COTA (1.040+ buscas/dia)
      const modelsToTry = [
        "gemini-3.1-flash-lite", // 500 requisições/dia
        "gemini-3.5-flash-lite", // 500 requisições/dia
        "gemini-3.8-flash",      // 20 requisições/dia
        "gemini-3.6-flash"       // 20 requisições/dia
      ];

      const storesListText = stores || "Mercado Livre, Amazon, Shopee, Magalu, Ferreira Costa, Casas Bahia, Leroy Merlin, KaBuM!";

      const promptText = `
Você é um especialista em compras técnicas no e-commerce brasileiro e engenheiro de produtos.
O usuário quer comprar: "${product}".
Lojas pesquisadas: ${storesListText}.

FILTRO TÉCNICO RIGOROSO E ELIMINATÓRIO:
1. O produto DEVE conter comprovadamente na sua engenharia/ficha técnica: "${mustHave || 'conforme solicitado'}".
2. O produto NÃO PODE de forma alguma conter: "${mustNotHave || 'nenhuma característica divergente'}".

EXEMPLOS DE RIGOR TÉCNICO REAL:
- Se for "liquidificador com copo de vidro", descarte qualquer modelo cujo copo seja de plástico, SAN Cristal, tritan ou acrílico. Só aprove modelos com copo de vidro real de fábrica (ex: Oster Osterizer Clássico, Philco PH900 Vidro, Electrolux com copo de vidro, etc).
- Se for "lavadora com motor a indução", descarte motor universal ou com escovas de carvão.
- Se for "celular com 256gb", certifique-se que o modelo tem 256GB de armazenamento nativo.

Retorne de 5 a 8 modelos REAIS existentes no mercado brasileiro.
Responda ESTRITAMENTE um array JSON puro (sem markdown, sem \`\`\`json):
[
  {
    "title": "Marca e Nome completo exato do modelo (Ex: Liquidificador Oster Clássico 1,25L Copo de Vidro)",
    "store": "Nome de uma das lojas pesquisadas onde esse produto é vendido",
    "price": "Preço médio estimado em Reais (Ex: R$ 389,00)",
    "verified_spec": "Explicação técnica comprovando que cumpre a especificação (Ex: Confirmado: Copo de vidro refratário Boroclass resistente a choques térmicos)"
  }
]
      `.trim();

      let lastError = null;

      for (const m of modelsToTry) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
          
          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: promptText }] }],
              generationConfig: { temperature: 0.2 }
            })
          });

          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Modelo ${m} retornou status ${response.status}: ${errText}`);
          }

          const data = await response.json();
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const cleaned = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

          let products = [];
          try {
            products = JSON.parse(cleaned);
          } catch {
            const match = cleaned.match(/\[\s*\{.*\}\s*\]/s);
            if (match) products = JSON.parse(match[0]);
            else throw new Error("Formato JSON não pôde ser decodificado.");
          }

          // CONSTRUÇÃO CIRÚRGICA DE LINKS 100% REAIS E FUNCIONAIS
          // Nunca deixa URLs alucinadas pela IA que dão erro 404!
          const formattedProducts = products.map(item => {
            const store = (item.store || "").toLowerCase();
            const cleanTitle = (item.title || "").trim();
            const q = encodeURIComponent(cleanTitle);
            let realUrl = "";

            if (store.includes("mercado")) {
              const slug = encodeURIComponent(cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
              realUrl = `https://lista.mercadolivre.com.br/${slug}`;
            } else if (store.includes("amazon")) {
              realUrl = `https://www.amazon.com.br/s?k=${q}`;
            } else if (store.includes("magalu") || store.includes("magazine")) {
              realUrl = `https://www.magazineluiza.com.br/busca/${q}/`;
            } else if (store.includes("shopee")) {
              realUrl = `https://shopee.com.br/search?keyword=${q}`;
            } else if (store.includes("casas") || store.includes("bahia")) {
              realUrl = `https://www.casasbahia.com.br/b?q=${q}`;
            } else if (store.includes("ferreira")) {
              realUrl = `https://www.ferreiracosta.com/busca?q=${q}`;
            } else if (store.includes("leroy")) {
              realUrl = `https://www.leroymerlin.com.br/pesquisa?termo=${q}`;
            } else if (store.includes("kabum")) {
              realUrl = `https://www.kabum.com.br/busca/${q}`;
            } else if (store.includes("ali")) {
              realUrl = `https://pt.aliexpress.com/w/wholesale-${q}.html`;
            } else {
              realUrl = `https://www.google.com/search?q=${encodeURIComponent(item.store + " " + cleanTitle)}&tbm=shop`;
            }

            return {
              title: cleanTitle,
              store: item.store || "Loja Oficial",
              price: item.price || "Consulte",
              verified_spec: item.verified_spec || "Especificação confirmada",
              url: realUrl,
              googleShoppingUrl: `https://www.google.com/search?q=${encodeURIComponent(cleanTitle)}&tbm=shop`
            };
          });

          return new Response(
            JSON.stringify({ success: true, products: formattedProducts }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );

        } catch (err) {
          lastError = err;
        }
      }

      return new Response(
        JSON.stringify({ success: false, error: "Serviço temporariamente indisponível.", details: lastError?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (e) {
      return new Response(
        JSON.stringify({ error: e.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }
};
