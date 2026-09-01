# Juventude Connect — arquitetura atual

O Juventude Connect é uma aplicação full-stack com React, Tailwind, Express, tRPC e banco MySQL/TiDB gerenciado. O banco próprio é a fonte principal dos dados de jovens, discipuladores, cultos, presença, faltas, acompanhamento, histórico de mensagens e identidade local.

## Autenticação local

O acesso é feito por e-mail e senha no próprio sistema. As senhas são armazenadas como hashes `scrypt`; o navegador recebe somente um cookie `HttpOnly` com um token opaco cuja representação persistida no banco é um hash. Sessões expiram em sete dias, podem ser revogadas e são invalidadas após redefinição de senha.

O cadastro público cria contas com status `pending`, que precisam ser aprovadas pelo administrador. Administradores também podem criar contas ativas, alterar status, definir o vínculo com discipulador e manter outros administradores ativos. O primeiro administrador é criado de forma idempotente por `ADMIN_EMAIL` e `ADMIN_PASSWORD`; essas variáveis devem ser removidas ou alteradas depois do bootstrap inicial.

O fluxo de recuperação usa tokens de uso único com validade de 30 minutos e depende de SMTP configurado no servidor. Variáveis necessárias: `APP_BASE_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` e `SMTP_FROM`. A API responde de forma genérica para não revelar se um e-mail está cadastrado.

As colunas e tabelas locais estão na migration `0004_local_auth`. O campo legado `users.openId` permanece temporariamente para permitir a conversão de contas Manus existentes; depois que todas tiverem senha local, ele poderá ser removido em uma migration futura.

## Domínios principais

| Domínio | Responsabilidade |
|---|---|
| Jovens | Dados pessoais, aniversário, contato, status e vínculo atual com discipulador. |
| Discipuladores | Cadastro nominal, WhatsApp, status e contagem de discípulos. |
| Presença | Culto/evento, marcação explícita de falta e correção posterior para presença. |
| Acompanhamento | Status pendente, contatado, conversou, justificativa recebida e resolvido. |
| Mensagens | Histórico idempotente por tipo e chave de referência, com destinatário, corpo, status e erro. |
| Configurações | Modelos de aniversário/falta e parâmetros do provedor oficial do WhatsApp. |

## Fluxo de falta

O administrador seleciona a data e o tipo de culto, marca explicitamente um jovem como faltante e o sistema cria um registro único em `attendance`. Em seguida, é criado um acompanhamento ligado à falta e ao discipulador atual. A combinação `eventId + youthId` impede duplicidade de presença/falta. A mudança posterior para `presente` não apaga o registro, preservando a correção e o histórico operacional.

A camada de mensagens usa chaves estáveis. Para aniversários, a chave é `jovem:data`; para faltas, a chave prevista é `jovem:data:tipo-de-culto`. O envio real por WhatsApp deve ser ativado somente após a configuração de um provedor oficial e de templates aprovados pela Meta. O frontend nunca deve receber o token.

## Acesso e privacidade

Procedimentos administrativos usam `adminProcedure`. Consultas de jovens podem ser limitadas pelo `discipulatorId` associado ao usuário autenticado. Atualizações de acompanhamento validam se o registro pertence à carteira do discipulador. Em produção, a associação entre usuário autenticado e discipulador deve ser administrada exclusivamente pelo administrador.

## WhatsApp Business API

A tela de configurações já centraliza os campos de `phone_number_id`, `business_account_id` e token. A integração deve usar o endpoint oficial da Meta no servidor, nunca WhatsApp Web, links `wa.me` ou simulação de cliques. Mensagens iniciadas pela organização precisam respeitar a janela e o modelo aprovado aplicáveis à conta. O envio de aniversário permanece manual na interface.

## Próximos incrementos recomendados

A base está preparada para formulários de edição, importação CSV/XLSX, detalhes de jovens e discipuladores, reincidência de faltas, auditoria e um adaptador de provedor de mensagens. Esses recursos podem ser adicionados como procedimentos tRPC e regras independentes sem remodelar o núcleo de presença e acompanhamento.
