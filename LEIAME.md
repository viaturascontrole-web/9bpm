# Checklists de Entrada e Saída — 9º BPM (versão 2026.10.22)

## Como publicar (GitHub)
1. Faça backup do que está no repositório (os originais ficam no histórico do Git).
2. Copie **todos** estes arquivos para a mesma pasta das páginas atuais, substituindo os existentes:
   `entrada.html`, `saida.html`, `common.js`, `common.css`, `sw.js`, `manifest.json`, `banner-9bpm.jpg`.
3. Mantenha `icon-192.png` e `icon-512.png` na pasta (o manifest os referencia; não vieram nos arquivos enviados).
4. Faça commit/push. No celular, abra a página uma vez com internet; o service worker atualiza sozinho.
5. Nas próximas versões: altere `VERSAO` no `sw.js` **e** o `?v=` em `common.js`/`common.css` dentro das duas páginas.

**Atenção:** `common.js`, `common.css` e `banner-9bpm.jpg` são arquivos **novos** (não existiam no projeto). Se só as páginas forem trocadas, o formulário não abre — as páginas mostram o aviso "Arquivos incompletos".

Não é preciso mexer no Apps Script para que tudo funcione.

## Os links nos celulares mudam?
**Não.** Os nomes e o local de `entrada.html` e `saida.html` continuam os mesmos, então o link (e atalhos/favoritos já salvos nos celulares) continua valendo. Ninguém precisa reinstalar nada.
- A atualização chega sozinha: ao abrir a página com internet, o celular baixa a versão nova (o GitHub Pages pode levar alguns minutos para publicar).
- Se algum celular insistir na versão antiga, basta fechar e abrir o app/aba de novo (ou limpar os dados do site).
- O `manifest.json` mantém o mesmo início do app (a pasta atual), então quem instalou na tela inicial continua com o mesmo ícone/app.

## Bugs corrigidos (causas prováveis de a saída "não fechar")
| # | Problema no código antigo | Correção |
|---|---|---|
| 1 | Campo de saldo bloqueava teclas via `keydown` (`e.key` + regex). Teclados Android enviam `keyCode 229 / key "Unidentified"` e a digitação podia ser bloqueada. | Removido o bloqueio; o filtro é feito no `input`. |
| 2 | Odômetro final **igual** ao último registrado era recusado; **menor** bloqueava sem saída (um registro anterior errado travava a viatura). | Igual passa. Menor, ou salto > 1.500 km, pede confirmação por checkbox (não bloqueia). |
| 3 | Falha ao carregar viaturas/setores (Apps Script lento, sinal ruim): sem timeout, sem retry, sem botão — formulário inutilizável. | Timeout + 2 novas tentativas, cache local da lista, botão "Tentar novamente". |
| 4 | Odômetro ficava desabilitado até a consulta terminar; consulta pendurada = campo travado. | Campo sempre habilitado; consulta com timeout e cancelamento ao trocar de viatura. |
| 5 | Saldo "1.250,50" era validado como 1,25 (`parseFloat`) e enviado com ponto de milhar. | Validação correta; envio no formato `1250,50`. |
| 6 | Envio em `no-cors`: qualquer erro do servidor virava **tela de sucesso falsa**. Fotos: `resFoto.json()` sempre falhava em silêncio. | Resposta é lida; erro do servidor/rede é mostrado e os dados são mantidos para reenviar. |
| 7 | Fotos de limpeza **nunca eram enviadas** na saída; na entrada eram disparadas sem aguardar. | Todas as fotos são enviadas e aguardadas; falha de foto não impede o registro (aviso na tela final). |
| 8 | Android pode descartar a aba ao abrir a câmera → perdia todo o preenchimento. | Rascunho automático (12 h), restaurado ao reabrir; limpo após o envio. |
| 9 | Imagem HEIC/ilegível: `onerror` não tratado (nada acontecia); nomes de arquivo repetidos (`Date.now()`); foto girada. | Tratamento de erro, nomes únicos, orientação EXIF respeitada, limite de 8 fotos por seção. |
| 10 | Duplo toque em Enviar / reenvio podia duplicar registro. | Trava de envio + `idEnvio` único por registro (ver backend abaixo). |
| 11 | `sw.js` apontava para `ToDo-replace-this-name.html` (instalação do SW falhava) e dependia de CDN. Páginas não registravam SW nem linkavam o manifest. | SW reescrito (offline real), manifest ligado, `start_url`/`scope` relativos (funciona com qualquer nome de repositório). |
| 12 | Dados do servidor (motorista) inseridos via `innerHTML` sem escape. | Escapado. |

## Melhorias / otimizações
- Banner de 66 KB embutido em base64 em cada página → arquivo `banner-9bpm.jpg` em cache.
- Código duplicado → `common.js` / `common.css` (um lugar para corrigir).
- Entrada: consulta de "saída em aberto" e de odômetro agora em paralelo (antes sequenciais).
- Saída: saldo pré-carregado ao escolher a viatura.
- Guarnição e setor lembrados do último registro (entrada → saída no mesmo turno).
- Validação final de todas as etapas antes de enviar; rolagem até o campo inválido.
- Fotos reduzidas a 1024 px (JPEG 0,72), campos 16 px (sem zoom do iOS), alvos de toque maiores, `maximum-scale` removido (acessibilidade), botões reais com foco por teclado.

## Backend (opcional, recomendado)
O front agora envia `idEnvio` em cada registro. Para evitar duplicidade quando a rede cai depois do servidor já ter gravado, no `doPost` (antes de gravar):
```javascript
function jaProcessado_(id) { return !!id && !!CacheService.getScriptCache().get('env_' + id); }
function marcarProcessado_(id) { if (id) CacheService.getScriptCache().put('env_' + id, '1', 21600); }
// no início do doPost (tipos entrada/saida):
//   if (jaProcessado_(dados.idEnvio)) return ContentService.createTextOutput(JSON.stringify({sucesso:true,duplicado:true})).setMimeType(ContentService.MimeType.JSON);
// ao final, depois de gravar com sucesso:  marcarProcessado_(dados.idEnvio);
```
Também é útil o `doPost` responder `{"sucesso":true}` ou `{"sucesso":false,"erro":"..."}`. Resposta que não seja JSON continua sendo aceita como sucesso.
Campos novos enviados (podem ser ignorados): `idEnvio`, `odometroDivergente` (saída: "SIM" quando o motorista confirmou valor menor/salto grande).

## Decisões de regra que você pode querer ajustar
- Saída: odômetro menor/salto grande exige confirmação em vez de bloquear (constante `SALTO_MAX_KM` em `saida.html`).
- Matrícula: mantida a regra antiga (número ≥ 1000); a mensagem antiga dizia "deve iniciar com 1000", o que o código nunca verificou.
- Entrada continua bloqueada enquanto houver "saída em aberto" na viatura (regra original mantida).
- Guarnição/setor/telefone ficam salvos no aparelho (localStorage). Em celular compartilhado, convém limpar os dados do site.

## O que foi testado
47 verificações automatizadas no Chromium (perfil de celular) com o Apps Script simulado: fluxos completos de entrada e saída, regras de odômetro, saldo, retry/cache de dados, rascunho, falha de servidor e de rede com reenvio, fotos, bloqueio por saída em aberto, service worker e abertura offline.
Não foi possível testar contra o seu Apps Script real: a leitura da resposta do `POST` depende de a implantação ser "Qualquer pessoa" (o mesmo requisito dos `GET` que já funcionam hoje).
