/**
 * CLOUDFLARE WORKER - BACKEND INVISÍVEL
 * 
 * Este arquivo roda de graça no Cloudflare Workers.
 * Ele guarda a sua chave da API do Gemini em segredo absoluto (variável GEMINI_API_KEY)
 * e faz a pesquisa com a IA e o Fallback automático de modelos.
 * 
 * Quem acessar o seu site no GitHub Pages NÃO precisa de chave e nem vê a sua chave!
 */

export default {
  async fetch(request, env) {
    // Permite chamadas do seu site no GitHub Pages (CORS)
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
        JSON.stringify({ error: "Chave GEMINI_API_KEY não configurada nas variáveis do Worker." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    try {
      const { product, mustHave, mustNotHave, stores, model, fallbackModels } = await request.json();

      const modelsToTry = [model, ...(fallbackModels || []).filter(m => m !== model)];
      let lastError = null;
      let logs = [];

      const promptText = `
Você é um motor de busca de compras altamente rigoroso e imparcial.
Procure por ofertas do produto: "${product}" nas seguintes lojas no Brasil: ${stores || 'Mercado Livre, Amazon, Shopee, Magalu, Ferreira Costa'}.

REQUISITOS TÉCNICOS OBRIGATÓRIOS (FILTRO RESTRITIVO):
- O produto DEVE conter comprovadamente a característica: "${mustHave || 'conforme solicitado'}".
- O produto NÃO PODE conter: "${mustNotHave || 'itens divergentes'}".
(Exemplo: Se foi pedido motor a indução, descarte qualquer modelo que use motor universal/escovas de carvão, mesmo que o vendedor mencione a palavra no título).

Para cada produto encontrado que cumpra 100% dos requisitos, retorne estritamente um array JSON válido contendo objetos com:
- "title": Nome completo e modelo exato do produto.
- "store": Nome da loja (ex: Mercado Livre, Amazon, Shopee, Magalu, Ferreira Costa, etc).
- "price": Preço formatado em Reais (ex: R$ 1.299,00).
- "url": Link direto para a página do produto na loja.
- "image_url": URL de imagem do produto (se encontrar, senão string vazia).
- "verified_spec": Explicação curta comprovando a especificação (ex: "Confirmado: Motor a Indução de fábrica modelo X").

IMPORTANTE: Responda SOMENTE o JSON puro (sem markdown, sem \`\`\`json). Se não encontrar nenhum que cumpra a especificação, retorne [].
      `.trim();

      // Cascata de Fallback entre Modelos
      for (const m of modelsToTry) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
          
          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: promptText }] }],
              tools: [{ google_search: {} }]
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
            else throw new Error("Resposta da IA não continha um array JSON válido.");
          }

          return new Response(
            JSON.stringify({ success: true, modelUsed: m, fallbackLogs: logs, products }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } catch (err) {
          lastError = err;
          logs.push(`Modelo ${m} falhou: ${err.message}`);
          // Tenta o próximo modelo do fallback!
        }
      }

      return new Response(
        JSON.stringify({ success: false, error: "Todos os modelos da cascata falharam.", logs, details: lastError?.message }),
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
