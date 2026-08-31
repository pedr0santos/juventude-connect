# Auditoria visual — Controle Jovens Sedentos

## Escopo

A auditoria foi realizada nas rotas `/`, `/jovens`, `/discipuladores`, `/presenca`, `/aniversarios`, `/mensagens` e `/configuracoes`, com viewport desktop de 1280×900 e verificação adicional do shell responsivo.

## Correções verificadas

| Tela | Elementos verificados | Regra aplicada | Resultado |
|---|---|---|---|
| Dashboard | Ações primárias e botão “Ver tudo” | Fundo escuro com `text-white` ou texto explícito `text-[#a16d3e]` | Legível |
| Jovens | “Adicionar jovem”, importação, filtros e ações de linha | Botões primários com fundo `#18212f`; ações com ícones e títulos | Legível |
| Discipuladores | “Novo discipulador”, “Editar apelidos”, “Acompanhamento” e vínculo de contas | `bg-white`, borda `#d8dce1`, texto `#18212f`, hover `#f3eee7` e espaçamento `gap-3` | Legível |
| Presença | Datas, evento e marcações | Campos claros com texto escuro e estados da marcação separados por cor | Legível |
| Aniversários | Ações de mensagem no calendário | Ícones com cor de ação e área de toque preservada | Legível |
| Mensagens | Status pendente/enviada | Badges com fundo e texto da mesma família cromática, mantendo contraste | Legível |
| Configurações | Abas, mensagens e WhatsApp Business | Botões salvos com fundo `#18212f` e `text-white`; campos com `text-[#18212f]`; alerta em texto `#604a31` | Legível |

## WhatsApp

A UI não apresenta o token nem qualquer segredo em texto aberto. O status exibido é calculado no servidor a partir da presença dos três campos mínimos: `phone_number_id`, `business_account_id` e token. O envio real ainda depende de credenciais válidas, template aprovado e habilitação explícita.

## Apelidos

O card de discipulador exibe os apelidos cadastrados e permite editar variações separadas por vírgula. A lógica normaliza acentos e pontuação, exige palavras completas e evita atribuir respostas ambíguas ou correspondências parciais.
