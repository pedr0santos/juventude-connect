# Validação da data exata do aniversário

A formatação da lista de próximos aniversários não usa mais `new Date("AAAA-MM-DD")` para montar o texto, pois esse parsing pode interpretar a data à meia-noite UTC e exibir o dia anterior em fusos brasileiros.

A regra agora lê diretamente as partes do calendário. Assim, um registro `2000-08-21` é exibido como **21/08**, e um registro `2000-08-20` é exibido como **20/08**. O teste automatizado `server/birthday.test.ts` cobre ambos os exemplos e também mantém a ordenação anual com virada de ano.

A tela principal foi recarregada após a alteração e a suíte passou com **15 testes Vitest** e TypeScript sem erros.
