/**
 * CLOUDFLARE WORKER - MOTOR DE BUSCA E FILTRO TÉCNICO COM IA
 * 
 * Configurado com base nos limites reais da sua cota Google AI Studio:
 * 1. gemini-3.1-flash-lite (15 RPM / 500 requisições/dia) - PRIORITÁRIO
 * 2. gemini-3.5-flash-lite (15 RPM / 500 requisições/dia) - FALLBACK 1
 * 3. gemini-3.8-flash      (5 RPM  / 20 requisições/dia)  - FALLBACK 2
 * 4. gemini-3.6-flash      (5 RPM  / 20 requisições/dia)  - FALLBACK 3
 * 
 * Total de capacidade: mais de 1.040 buscas gratuitas por dia!
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

      // CASCATA INTELIGENTE BASEADA NOS LIMITES DA SUA CONTA
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

EXEMPLO DE RIGOR:
- Se foi solicitado "motor a indução", você DEVE descartar imediatamente qualquer modelo com motor universal ou escovas de carvão (ex: Kärcher K2 tradicional, Wap Atacama, etc.), mesmo que anúncios ou vendedores usem a palavra indução como marketing falso.
- Aprove apenas modelos reais com motor a indução (ex: Wap 4100, Kärcher K3 Indução, Kärcher K4, HD 585, etc.).
- O mesmo vale para celular (verificar RAM/Armazenamento real), liquidificador (copo de vidro real e não acrílico), etc.

Retorne de 4 a 8 opções REAIS que atendam 100% dos requisitos nas lojas brasileiras.
Responda ESTRITAMENTE um array JSON puro (sem markdown, sem \`\`\`json):
[
  {
    "title": "Nome exato da marca e modelo do produto",
    "store": "Nome da loja (Mercado Livre, Amazon, Magalu, Ferreira Costa, etc)",
    "price": "Preço médio estimado em Reais (ex: R$ 1.349,00)",
    "url": "URL de busca direta daquele modelo exato na loja correspondente",
    "verified_spec": "Explicação técnica curta comprovando que cumpre a especificação (ex: Confirmado de fábrica: Motor a Indução de 1.800W)"
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
              generationConfig: {
                temperature: 0.2
              }
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

          // Ajusta links para URLs de busca direta se o modelo gerou URLs genéricas
          const formattedProducts = products.map(item => {
            const storeName = item.store || "Mercado Livre";
            let directUrl = item.url;
            const queryEncoded = encodeURIComponent(item.title);

            if (!directUrl || directUrl.length < 15 || directUrl.includes("example.com")) {
              if (storeName.toLowerCase().includes("mercado")) {
                directUrl = `https://lista.mercadolivre.com.br/${queryEncoded}`;
              } else if (storeName.toLowerCase().includes("amazon")) {
                directUrl = `https://www.amazon.com.br/s?k=${queryEncoded}`;
              } else if (storeName.toLowerCase().includes("magalu")) {
                directUrl = `https://www.magazineluiza.com.br/busca/${queryEncoded}/`;
              } else if (storeName.toLowerCase().includes("shopee")) {
                directUrl = `https://shopee.com.br/search?keyword=${queryEncoded}`;
              } else if (storeName.toLowerCase().includes("ferreira")) {
                directUrl = `https://www.ferreiracosta.com/busca?q=${queryEncoded}`;
              } else if (storeName.toLowerCase().includes("leroy")) {
                directUrl = `https://www.leroymerlin.com.br/pesquisa?termo=${queryEncoded}`;
              } else if (storeName.toLowerCase().includes("kabum")) {
                directUrl = `https://www.kabum.com.br/busca/${queryEncoded}`;
              } else {
                directUrl = `https://www.google.com/search?q=${encodeURIComponent(storeName + " " + item.title)}&tbm=shop`;
              }
            }

            return {
              ...item,
              url: directUrl
            };
          });

          return new Response(
            JSON.stringify({ success: true, products: formattedProducts }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );

        } catch (err) {
          lastError = err;
          // Continua automaticamente para o próximo modelo da cascata!
        }
      }

      return new Response(
        JSON.stringify({ success: false, error: "Serviço temporariamente indisponível. Tente novamente em instantes.", details: lastError?.message }),
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
