# Validação da agenda de aniversários

A referência de validação foi **19/08/2026**. A lista exibida em “Próximos a celebrar” foi ordenada pela próxima ocorrência anual, e não pela data de nascimento completa nem pela ordem de importação.

| Ordem | Jovem | Data de nascimento | Próxima ocorrência considerada |
|---:|---|---|---|
| 1 | Yago Gabriel Oliveira Santos | 21/08 | 21/08/2026 |
| 2 | Davi Lucas Barcelos | 25/08 | 25/08/2026 |
| 3 | alice emanuelly dos santos | 28/08 | 28/08/2026 |
| 4 | Eduarda Batista de Paula Reis | 31/08 | 31/08/2026 |

Os aniversários de abril, janeiro e outras datas anteriores a 19/08 foram excluídos da frente da lista e reposicionados depois da virada do ano. A agenda mensal também passou a calcular dinamicamente o mês, o primeiro dia da semana, a quantidade de dias e os aniversariantes daquele mês; os botões anterior/próximo agora alteram o mês visualizado.

A implementação foi validada com 14 testes Vitest, incluindo casos de aniversário já passado, ordenação futura e virada de ano, além da checagem TypeScript sem erros.
