/**
 * CONFIGURAÇÃO DO BUSCADOR INTELIGENTE DE PRODUTOS
 * 
 * Você pode editar este arquivo diretamente pelo navegador do celular no GitHub!
 * Basta clicar no lápis (Editar), alterar o modelo e dar Commit.
 */

const APP_CONFIG = {
  // Chave da API do Google Gemini (você pode colocar aqui ou digitar na tela do app na 1ª vez)
  apiKey: "",

  // Modelo padrão prioritário
  currentModel: "gemini-2.5-flash",

  // CASCATA DE FALLBACK DE MODELOS:
  // Se o 1º falhar (cota, erro ou fora do ar), o app tenta o 2º, depois o 3º, etc.
  fallbackModels: [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-2.5-pro",
    "gemini-1.5-pro"
  ],

  // Lojas monitoradas na pesquisa
  stores: [
    { name: "Mercado Livre", domain: "mercadolivre.com.br", color: "#FFE600", textColor: "#333333" },
    { name: "Amazon", domain: "amazon.com.br", color: "#FF9900", textColor: "#111111" },
    { name: "Shopee", domain: "shopee.com.br", color: "#EE4D2D", textColor: "#ffffff" },
    { name: "Magalu", domain: "magazineluiza.com.br", color: "#0086FF", textColor: "#ffffff" },
    { name: "Ferreira Costa", domain: "ferreiracosta.com", color: "#008836", textColor: "#ffffff" },
    { name: "Casas Bahia", domain: "casasbahia.com.br", color: "#003399", textColor: "#ffffff" },
    { name: "Leroy Merlin", domain: "leroymerlin.com.br", color: "#00A859", textColor: "#ffffff" },
    { name: "KaBuM!", domain: "kabum.com.br", color: "#FF6500", textColor: "#ffffff" },
    { name: "AliExpress", domain: "aliexpress.com", color: "#FF4747", textColor: "#ffffff" },
    { name: "Vem Que Tem", domain: "vemquetembrasil.com.br", color: "#5E2180", textColor: "#ffffff" }
  ]
};
