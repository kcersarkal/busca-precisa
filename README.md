# ⚡ BuscaPrecisa - Buscador Inteligente de Produtos com IA

Um aplicativo web moderno, leve e responsivo (PC e Celular) projetado para buscar produtos em múltiplos marketplaces e lojas brasileiras, aplicando **filtro técnico rigoroso** para eliminar anúncios enganosos e "keyword stuffing".

---

## 🚀 Lojas Monitoradas
- **Mercado Livre**
- **Amazon Brasil**
- **Shopee**
- **Magazine Luiza (Magalu)**
- **Ferreira Costa**
- **Casas Bahia**
- **Leroy Merlin**
- **KaBuM!**
- **AliExpress**
- **Vem Que Tem**

---

## 🛡️ Como Funciona o Fallback de Modelos de IA
O app **nunca quebra a busca** nem te joga para uma busca simples se um modelo falhar. Ele implementa uma **cascata de resiliência entre modelos**:

```
[Tentativa 1: gemini-2.5-flash]
       │ (Falha/Cota/Instabilidade?)
       ▼
[Tentativa 2: gemini-2.0-flash]
       │ (Falha/Cota?)
       ▼
[Tentativa 3: gemini-1.5-flash]
       │ (Falha?)
       ▼
[Tentativa 4: gemini-2.5-pro / gemini-1.5-pro]
```

Todas as tentativas executam a **mesma busca aprofundada em todas as lojas**.

---

## 📱 Como Trocar o Modelo pelo Celular no GitHub (em 30 segundos)

Quando o Google lançar um novo modelo ou se você quiser alterar o modelo padrão prioritário:

1. Abra o site do **GitHub no navegador do celular** (ou pelo app do GitHub).
2. Acesse o seu repositório do projeto.
3. Toque no arquivo `config.js`.
4. Toque no ícone de **Lápis ✏️ (Editar)**.
5. Altere a linha:
   ```javascript
   currentModel: "gemini-2.5-flash",
   ```
   para o modelo desejado (ex: `"gemini-3.0-flash"`).
6. Role até o fim da página e toque em **Commit changes**.
7. **Pronto!** Em menos de 1 minuto o GitHub Pages atualiza o app automaticamente para todo mundo que abrir o link.

---

## 🌐 Como Publicar no GitHub Pages (Passo a Passo)

1. Crie um novo repositório no seu GitHub (ex: `buscador-produtos`).
2. Envie os arquivos desta pasta:
   - `index.html`
   - `config.js`
   - `README.md`
3. Vá em **Settings** (Configurações) do repositório no GitHub.
4. No menu lateral esquerdo, clique em **Pages**.
5. Em **Branch**, selecione `main` (ou `master`) e pasta `/ (root)`.
6. Clique em **Save**.
7. O GitHub vai te fornecer o link público (ex: `https://seunome.github.io/buscador-produtos/`).

---

## 🔑 Configuração da Chave da API (Gemini)

- **Opção 1 (Na tela do app):** Ao abrir o app pela primeira vez, toque no botão do modelo no topo ou faça uma busca. Ele abrirá o modal para você colar sua chave gratuita do Google AI Studio (fica salva apenas no navegador do seu aparelho).
- **Opção 2 (Fixa no `config.js`):** Você pode colar sua chave diretamente no campo `apiKey: "SUA_CHAVE_AQUI"` dentro de `config.js` se o repositório for privado.
