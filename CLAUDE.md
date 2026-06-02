# 9LABS — Painel de Agendamento de Posts (uso interno da agência)

> Leia este arquivo no início de toda sessão. Ele descreve o projeto, a stack e como
> trabalhar com o dono do projeto.

## Sobre o dono do projeto
- É **iniciante em programação**. Sempre:
  - Explicar cada passo em **linguagem simples**, sem jargão (ou explicando o jargão).
  - **Pedir confirmação antes de mudanças** que mexam no código/config/banco.
  - Trabalhar **uma fase de cada vez**, em pedaços pequenos. Não construir tudo de uma vez.
  - Após mudar algo, dizer **como testar** e o que ele deve ver na tela.
- Idioma de trabalho: **português (Brasil)**.

## O que é o projeto
Um painel web interno (estilo "mLabs próprio") para a agência agendar posts nas redes
sociais dos clientes. **Sem login de clientes** nesta primeira versão — uso interno da equipe.
A publicação real será feita depois pela API unificada **"Post for Me"** (NÃO integrada ainda).

## Stack
- **Next.js 16** (App Router) + **React 19** + **TypeScript** — app web. Pasta de código em `src/`. Atalho de import `@/`.
- **Tailwind CSS 4** — estilos.
- **Supabase** — banco de dados PostgreSQL + Storage de arquivos (mídias com URL pública).
- **npm** como gerenciador de pacotes. **Windows + PowerShell**.

> ⚠️ Como o Node.js foi instalado via winget, novos terminais podem não enxergar `node`/`npm`
> imediatamente. Se `node`/`npm` não forem reconhecidos, atualize o PATH na sessão:
> `$env:Path = [Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [Environment]::GetEnvironmentVariable("Path","User")`

## Como rodar
```
npm install      # instala dependências (só na 1ª vez ou quando mudam)
npm run dev      # inicia em http://localhost:3000
npm run build    # build de produção
npm run lint     # checagem de estilo de código
```

## Objetivo do MVP (1ª versão)
1. Cadastro de **clientes** da agência, cada um com suas **contas sociais** (Instagram, Facebook, TikTok).
2. **Biblioteca de mídia**: subir fotos/vídeos, guardados com **link público** (Supabase Storage).
3. **Calendário** visual para agendar posts (cliente, redes, mídia, legenda, data e hora).
4. **Relatório** básico: lista do que foi agendado/postado, com status.

## Modelo de dados (Supabase / PostgreSQL)
- **clientes**: `id`, `nome`, `observacoes?`, `ativo`, `created_at`.
- **contas_sociais**: `id`, `cliente_id→clientes`, `plataforma` (instagram/facebook/tiktok), `usuario_handle`, `created_at`.
- **midias**: `id`, `cliente_id→clientes?`, `tipo` (imagem/video), `url_publica`, `caminho_storage`, `nome_arquivo`, `created_at`.
- **posts_agendados**: `id`, `cliente_id→clientes`, `midia_id→midias?`, `legenda`, `data_agendada`,
  `status` (**rascunho / agendado / publicado / falhou**), `id_externo_postforme?`, `erro_mensagem?`, `created_at`.
- **posts_contas**: ligação N:N entre `posts_agendados` e `contas_sociais` (um post pode ir para várias redes).

> **Post for Me**: por ora só existem os campos `status`, `id_externo_postforme` e `erro_mensagem`
> deixados prontos. **Nenhuma chamada de API ainda.** Integração fica para uma fase futura.

## Roadmap (uma fase por vez)
- **Fase 0 (atual)**: fundação — projeto Next.js rodando, este CLAUDE.md, GitHub conectado, Supabase + tabelas.
- **Fase 1**: telas de Clientes & Contas Sociais.
- **Fase 2**: Biblioteca de Mídia (upload p/ Storage + link público).
- **Fase 3**: Calendário & Agendamento de posts.
- **Fase 4**: Relatório por status/cliente.
- **Fase 5 (futuro)**: integração real com Post for Me.

## Segredos / Git
- Chaves do Supabase ficam em `.env.local` (NÃO versionar — já coberto pelo `.gitignore`).
- Repositório remoto: `https://github.com/artenov3-maker/9LABS.git`.
- Fluxo simples para o dono: **salvar = `git add` + `git commit` + `git push`**.

---
<!-- Regras do Next.js 16 geradas pelo create-next-app. Importante: esta versão tem mudanças
     em relação a versões antigas; consulte os docs locais antes de escrever código Next.js. -->
@AGENTS.md
