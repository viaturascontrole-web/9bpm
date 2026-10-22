/* ============================================================
   Sistema Garageiro — 9º BPM
   Código compartilhado entre entrada.html e saida.html
   ============================================================ */
(function (w) {
  'use strict';

  var GAR = (w.GAR = {});

  /* ---------- Configuração (único lugar para trocar a URL do Apps Script) ---------- */
  GAR.SCRIPT_URL =
    'https://script.google.com/macros/s/AKfycbyQl3ns6drVY1H2DepxCfN23Zee3xmcVlsP4a47IMPlfhxIPGHveaI3-EGYZ7gyVwbooA/exec';
  GAR.VERSAO = '2026.10.22.2';
  var RASCUNHO_VALIDADE_MS = 12 * 60 * 60 * 1000; // 12 h
  var MAX_FOTOS_POR_GRUPO = 8;

  /* ---------- Utilidades ---------- */
  var $ = (GAR.$ = function (id) { return document.getElementById(id); });
  GAR.sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  GAR.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  GAR.uuid = function () {
    try { if (w.crypto && w.crypto.randomUUID) return w.crypto.randomUUID(); } catch (e) {}
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  };
  GAR.fmtKm = function (n) { return Number(n).toLocaleString('pt-BR'); };

  /* localStorage pode lançar exceção (modo privado, armazenamento cheio, bloqueado) */
  GAR.store = {
    get: function (k) { try { var v = w.localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
    set: function (k, v) { try { w.localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del: function (k) { try { w.localStorage.removeItem(k); } catch (e) {} }
  };

  /* ---------- Rede: timeout, retry e leitura da resposta ---------- */
  function fetchTimeout(url, opts, ms, sinalExterno) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, ms);
    if (sinalExterno) {
      if (sinalExterno.aborted) ctrl.abort();
      else sinalExterno.addEventListener('abort', function () { ctrl.abort(); });
    }
    opts = Object.assign({}, opts, { signal: ctrl.signal });
    return fetch(url, opts).then(
      function (r) { clearTimeout(timer); return r; },
      function (e) { clearTimeout(timer); throw e; }
    );
  }

  /** GET JSON no Apps Script, com timeout e novas tentativas (cold start / rede ruim em campo). */
  GAR.getJson = async function (params, opt) {
    opt = opt || {};
    var timeout = opt.timeout || 20000;
    var retries = opt.retries == null ? 2 : opt.retries;
    var qs = Object.keys(params).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); }).join('&');
    var url = GAR.SCRIPT_URL + '?' + qs;
    var ultimoErro;
    for (var i = 0; i <= retries; i++) {
      try {
        var r = await fetchTimeout(url, { method: 'GET' }, timeout, opt.signal);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return await r.json();
      } catch (e) {
        ultimoErro = e;
        if (opt.signal && opt.signal.aborted) throw e; // cancelado de propósito
        if (i < retries) await GAR.sleep(700 * (i + 1));
      }
    }
    throw ultimoErro;
  };

  /**
   * POST JSON (text/plain evita preflight CORS). Lê a resposta do servidor.
   * Retorna {ok, confirmado, erro}. Só é "falha" quando o servidor diz explicitamente que falhou
   * ou a rede falha (exceção). Resposta não-JSON é aceita como "não confirmada".
   */
  GAR.postJson = async function (payload, opt) {
    opt = opt || {};
    var r = await fetchTimeout(
      GAR.SCRIPT_URL,
      { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(payload) },
      opt.timeout || 60000,
      opt.signal
    );
    if (!r.ok) throw new Error('HTTP ' + r.status);
    var txt = await r.text();
    var j = null;
    try { j = JSON.parse(txt); } catch (e) {}
    if (j && (j.sucesso === false || (j.erro && j.sucesso !== true))) {
      return { ok: false, confirmado: true, erro: j.erro || j.mensagem || 'Erro retornado pelo servidor' };
    }
    return { ok: true, confirmado: !!(j && j.sucesso === true), resposta: j };
  };

  /**
   * Consulta ÚNICA da viatura (status de saída em aberto + último odômetro + último saldo).
   * Uma só requisição ao índice rápido do Apps Script (?page=viatura) em vez de duas/três em paralelo.
   * opt.confirmar: formulário de ENTRADA (o servidor confirma na planilha antes de acusar bloqueio).
   * Sem retry em timeout (repetir só dobrava a fila no Apps Script). Se o Apps Script ainda não tiver
   * a rota nova (publicação antiga), cai nas rotas antigas — só nesse caso.
   * Retorna {saidaAberta, motorista, telefone, dataEntrada, odometro (null = desconhecido), saldo (undefined = indisponível)}.
   */
  var semRotaViatura = false;
  GAR.infoViatura = async function (prefixo, opt) {
    opt = opt || {};
    if (!semRotaViatura) {
      try {
        var params = { page: 'viatura', prefixo: prefixo };
        if (opt.confirmar) params.confirmar = '1';
        var d = await GAR.getJson(params, { timeout: opt.timeout || 25000, retries: 0 });
        if (d && d.sucesso === true) return d;
        throw new Error('resposta inválida');
      } catch (e) {
        var rotaAusente = e && (e.name === 'SyntaxError' || e.message === 'resposta inválida' || /^HTTP/.test(e.message || ''));
        if (!rotaAusente) throw e; // timeout / sem rede: não repetir em cadeia
        semRotaViatura = true;
      }
    }
    var o = { timeout: 15000, retries: 1 };
    var r = await Promise.all([
      opt.confirmar ? GAR.getJson({ page: 'statusViatura', prefixo: prefixo }, o).catch(function () { return null; }) : Promise.resolve({ saidaAberta: false }),
      GAR.getJson({ page: 'odometro', prefixo: prefixo }, o).catch(function () { return null; })
    ]);
    if (!r[0] && !r[1]) throw new Error('sem resposta');
    var st = r[0] || {}, od = r[1];
    return {
      sucesso: true, legado: true,
      saidaAberta: !!st.saidaAberta, motorista: st.motorista || '', telefone: st.telefone || '', dataEntrada: st.dataEntrada || '',
      odometro: od ? (Number(od.odometro) || 0) : null,
      saldo: undefined
    };
  };

  /* ---------- Interface: loading / erros ---------- */
  GAR.loading = function (on, txt) {
    if (txt) $('loadingTxt').textContent = txt;
    $('loadingOv').className = 'loading-ov' + (on ? ' on' : '');
  };

  GAR.mostrarErro = function (msg, acao) {
    var box = $('erroGlobal');
    box.innerHTML = '';
    var span = document.createElement('span');
    span.textContent = '⚠️ ' + msg;
    box.appendChild(span);
    if (acao) {
      box.appendChild(document.createElement('br'));
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = acao.texto;
      b.onclick = acao.fn;
      box.appendChild(b);
    }
    box.className = 'erro-msg on';
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  GAR.esconderErro = function () {
    $('erroGlobal').className = 'erro-msg';
    var inv = document.querySelectorAll('.invalido');
    for (var i = 0; i < inv.length; i++) inv[i].classList.remove('invalido');
    var msgs = document.querySelectorAll('.msg-invalido.on');
    for (var j = 0; j < msgs.length; j++) msgs[j].classList.remove('on');
  };

  GAR.info = function (txt, botao, tag) {
    var box = $('infoGlobal');
    if (!box) return;
    box.setAttribute('data-tag', tag || '');
    box.innerHTML = '';
    var s = document.createElement('span');
    s.textContent = txt;
    box.appendChild(s);
    if (botao) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = botao.texto;
      b.onclick = botao.fn;
      box.appendChild(b);
    }
    box.className = 'info-msg on';
  };
  /** Com tag, só esconde o aviso daquela origem (não apaga, p.ex., "Rascunho restaurado"). */
  GAR.esconderInfo = function (tag) {
    var b = $('infoGlobal');
    if (!b) return;
    if (tag && b.getAttribute('data-tag') !== tag) return;
    b.className = 'info-msg';
  };

  /* ---------- Validação ---------- */
  GAR.invalido = function (id, mostrarMsg) {
    var el = $(id);
    if (!el) return;
    el.classList.add('invalido');
    if (mostrarMsg !== false) {
      var fg = el.closest('.fg');
      var m = fg && fg.querySelector('.msg-invalido');
      if (m) m.classList.add('on');
    }
  };
  /** Campo de texto obrigatório. */
  GAR.req = function (id) {
    var el = $(id);
    if (!el || !String(el.value || '').trim()) { GAR.invalido(id); return false; }
    return true;
  };
  /** Grupo de opções (Sim/Não) obrigatório. */
  GAR.reqOpc = function (grupo) {
    if (GAR.opc[grupo]) return true;
    var m = $('msg-' + grupo);
    if (m) m.classList.add('on');
    return false;
  };
  GAR.primeiroInvalido = function () {
    var el = document.querySelector('.section.active .invalido, .section.active .msg-invalido.on');
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (el.focus && /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) { try { el.focus({ preventScroll: true }); } catch (e) {} }
  };

  /* ---------- Máscaras / formatos ---------- */
  GAR.somenteDigitos = function (el) { el.value = el.value.replace(/\D/g, ''); };

  GAR.mascaraTelefone = function (input) {
    var v = input.value.replace(/\D/g, '').slice(0, 11);
    if (v.length <= 10) v = v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
    else v = v.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, '($1) $2-$3');
    input.value = v.replace(/[-\s(]+$/, '').replace(/^\((\d{0,2})$/, '$1');
  };

  /** Campo de saldo: digitação sempre em centavos (150,50). Sem bloquear teclas (teclados Android
   *  enviam keyCode 229 / key "Unidentified" e o bloqueio por keydown impedia a digitação). */
  GAR.formatarSaldoInput = function (input) {
    var d = input.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 11);
    if (!d) { input.value = ''; return; }
    while (d.length < 3) d = '0' + d;
    var reais = d.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    input.value = reais + ',' + d.slice(-2);
    try { input.setSelectionRange(input.value.length, input.value.length); } catch (e) {}
  };
  /** "1.250,50" -> 1250.5 ; inválido -> null */
  GAR.parseSaldo = function (str) {
    var d = String(str || '').replace(/\D/g, '');
    if (!d) return null;
    return parseInt(d, 10) / 100;
  };
  /** Formato enviado ao servidor: "1250,50" (sem separador de milhar, que confunde parseFloat). */
  GAR.saldoParaEnvio = function (str) {
    var n = GAR.parseSaldo(str);
    return n == null ? '' : n.toFixed(2).replace('.', ',');
  };
  GAR.fmtMoeda = function (n) {
    return 'R$ ' + Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  /* ---------- Grupos de opções (Sim/Não, níveis) + campos dependentes ---------- */
  GAR.opc = {};
  GAR.onOpcao = {}; // hooks: GAR.onOpcao.abast = function(val){...}
  GAR.fotoGrupos = {};

  function limparContainer(el) {
    var botoes = el.querySelectorAll('[data-group]');
    for (var i = 0; i < botoes.length; i++) setOpcaoRaw(botoes[i].getAttribute('data-group'), '');
    var campos = el.querySelectorAll('input:not([type=file]), textarea, select');
    for (var j = 0; j < campos.length; j++) { if (campos[j].type === 'checkbox') campos[j].checked = false; else campos[j].value = ''; }
    var fotos = el.querySelectorAll('[data-fotos]');
    for (var k = 0; k < fotos.length; k++) {
      var g = GAR.fotoGrupos[fotos[k].getAttribute('data-fotos')];
      if (g) g.limpar();
    }
    var dicas = el.querySelectorAll('.saldo-hint');
    for (var m = 0; m < dicas.length; m++) dicas[m].style.display = 'none';
  }

  function setOpcaoRaw(grupo, val) {
    GAR.opc[grupo] = val || '';
    var botoes = document.querySelectorAll('[data-group="' + grupo + '"]');
    for (var i = 0; i < botoes.length; i++) {
      var sel = botoes[i].getAttribute('data-val') === val && !!val;
      botoes[i].classList.toggle('sel', sel);
      botoes[i].setAttribute('aria-pressed', sel ? 'true' : 'false');
    }
  }

  /** Mostra/esconde blocos marcados com data-depends="grupo:VALOR" (em ordem do DOM; pais antes dos filhos). */
  GAR.aplicarDependencias = function () {
    var els = document.querySelectorAll('[data-depends]');
    for (var i = 0; i < els.length; i++) {
      var p = els[i].getAttribute('data-depends').split(':');
      var mostrar = GAR.opc[p[0]] === p.slice(1).join(':');
      var estavaVisivel = els[i].style.display !== 'none';
      els[i].style.display = mostrar ? 'block' : 'none';
      if (!mostrar && estavaVisivel) limparContainer(els[i]);
    }
  };

  GAR.setOpcao = function (grupo, val, silencioso) {
    setOpcaoRaw(grupo, val);
    var m = $('msg-' + grupo);
    if (m) m.classList.remove('on');
    GAR.aplicarDependencias();
    if (!silencioso && GAR.onOpcao[grupo]) GAR.onOpcao[grupo](val);
    if (!silencioso) GAR.draft.salvar();
  };

  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-group]') : null;
    if (b) { e.preventDefault(); GAR.setOpcao(b.getAttribute('data-group'), b.getAttribute('data-val')); }
  });

  /* ---------- Fotos ---------- */
  var seqFoto = 0;

  async function comprimir(file, maxDim, qualidade) {
    var bmp = null;
    if (w.createImageBitmap) {
      try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
      catch (e) { try { bmp = await createImageBitmap(file); } catch (e2) { bmp = null; } }
    }
    if (!bmp) {
      bmp = await new Promise(function (res, rej) {
        var u = URL.createObjectURL(file);
        var im = new Image();
        im.onload = function () { URL.revokeObjectURL(u); res(im); };
        im.onerror = function () { URL.revokeObjectURL(u); rej(new Error('formato não suportado')); };
        im.src = u;
      });
    }
    var largura = bmp.width, altura = bmp.height;
    if (largura > maxDim || altura > maxDim) {
      if (largura > altura) { altura = Math.round(altura * maxDim / largura); largura = maxDim; }
      else { largura = Math.round(largura * maxDim / altura); altura = maxDim; }
    }
    var canvas = document.createElement('canvas');
    canvas.width = largura; canvas.height = altura;
    canvas.getContext('2d').drawImage(bmp, 0, 0, largura, altura);
    if (bmp.close) bmp.close();
    var b64 = canvas.toDataURL('image/jpeg', qualidade).split(',')[1];
    canvas.width = canvas.height = 0; // libera memória (importante em celulares simples)
    return b64;
  }

  /** cfg: {nome, camera, galeria, preview, status, rotulo} — ids dos elementos. */
  GAR.criarFotos = function (cfg) {
    var itens = [];
    var pendentes = [];
    var elPrev = $(cfg.preview), elStatus = $(cfg.status);
    var g = {};

    function status(txt, erro) { elStatus.textContent = txt; elStatus.className = 'foto-status' + (erro ? ' erro' : ''); }
    function atualizarStatus() {
      var n = itens.length;
      status(n ? n + ' foto(s) pronta(s) para envio' : 'Nenhuma foto selecionada');
    }
    function thumb(item) {
      var d = document.createElement('div');
      d.className = 'foto-thumb';
      var im = document.createElement('img');
      im.alt = 'Foto selecionada';
      im.src = 'data:image/jpeg;base64,' + item.base64;
      var x = document.createElement('button');
      x.type = 'button'; x.className = 'foto-thumb-del'; x.textContent = '✕'; x.setAttribute('aria-label', 'Remover foto');
      x.onclick = function () {
        itens = itens.filter(function (i) { return i !== item; });
        d.remove(); atualizarStatus();
      };
      d.appendChild(im); d.appendChild(x);
      elPrev.appendChild(d);
    }

    function adicionar(input) {
      var arquivos = Array.prototype.slice.call(input.files || []);
      input.value = ''; // permite escolher o mesmo arquivo de novo
      if (!arquivos.length) return;
      arquivos.forEach(function (file) {
        if (itens.length + pendentes.length >= MAX_FOTOS_POR_GRUPO) {
          status('Limite de ' + MAX_FOTOS_POR_GRUPO + ' fotos por seção.', true); return;
        }
        status('Processando foto...');
        var p = comprimir(file, 1024, 0.72).then(function (b64) {
          var item = { base64: b64, nome: 'foto_' + Date.now() + '_' + (++seqFoto) + '.jpg', mimeType: 'image/jpeg', enviada: false };
          itens.push(item); thumb(item);
        }).catch(function () {
          status('Não foi possível ler uma das imagens (formato não suportado). Tente outra foto.', true);
        }).then(function () {
          pendentes = pendentes.filter(function (x) { return x !== p; });
          if (!pendentes.length && itens.length && elStatus.className.indexOf('erro') === -1) atualizarStatus();
        });
        pendentes.push(p);
      });
    }

    $(cfg.camera).addEventListener('click', function () { $(cfg.camera + '_input').click(); });
    $(cfg.galeria).addEventListener('click', function () { $(cfg.galeria + '_input').click(); });
    $(cfg.camera + '_input').addEventListener('change', function () { adicionar(this); });
    $(cfg.galeria + '_input').addEventListener('change', function () { adicionar(this); });

    g.itens = function () { return itens; };
    g.pronto = function () { return Promise.all(pendentes); };
    g.limpar = function () { itens = []; elPrev.innerHTML = ''; atualizarStatus(); };
    g.rotulo = cfg.rotulo || '';
    GAR.fotoGrupos[cfg.nome] = g;
    return g;
  };

  /** Envia as fotos que ainda não subiram. Falha de foto NÃO impede o registro. */
  GAR.enviarFotos = async function (prefixo, grupos) {
    var lista = [];
    grupos.forEach(function (g) { g.itens().forEach(function (i) { if (!i.enviada) lista.push({ g: g, i: i }); }); });
    var todas = 0, ok = 0, falhas = 0;
    grupos.forEach(function (g) { todas += g.itens().length; ok += g.itens().filter(function (i) { return i.enviada; }).length; });
    if (!lista.length) return { total: todas, ok: ok, falhas: 0 };

    var barra = $('fotoProgBar'), fill = $('fotoProgFill');
    if (barra) barra.className = 'foto-upload-prog on';
    for (var n = 0; n < lista.length; n++) {
      GAR.loading(true, 'Enviando foto ' + (n + 1) + ' de ' + lista.length + '...');
      if (fill) fill.style.width = Math.round((n / lista.length) * 100) + '%';
      var enviou = false;
      for (var tent = 0; tent < 2 && !enviou; tent++) {
        try {
          var r = await GAR.postJson({
            tipo: 'foto', prefixo: prefixo,
            nomeArquivo: (lista[n].g.rotulo ? lista[n].g.rotulo + '_' : '') + lista[n].i.nome,
            base64: lista[n].i.base64, mimeType: lista[n].i.mimeType
          });
          if (r.ok) enviou = true; else break; // servidor recusou: não adianta repetir
        } catch (e) { if (tent === 0) await GAR.sleep(1200); }
      }
      if (enviou) { lista[n].i.enviada = true; ok++; } else falhas++;
    }
    if (fill) fill.style.width = '100%';
    if (barra) setTimeout(function () { barra.className = 'foto-upload-prog'; }, 800);
    return { total: todas, ok: ok, falhas: falhas };
  };

  /* ---------- Dados iniciais (viaturas e setores) com cache local ---------- */
  var CHAVE_DADOS = 'gar:dados';

  function preencherSelect(sel, lista, rotuloVazio, extra) {
    var atual = sel.value;
    sel.innerHTML = '';
    var o0 = document.createElement('option'); o0.value = ''; o0.textContent = rotuloVazio; sel.appendChild(o0);
    (lista || []).forEach(function (v) { var o = document.createElement('option'); o.value = v; o.textContent = v; sel.appendChild(o); });
    if (extra) { var oe = document.createElement('option'); oe.value = extra.valor; oe.textContent = extra.texto; sel.appendChild(oe); }
    if (atual) sel.value = atual; // preserva a escolha quando a lista é atualizada em segundo plano
  }

  /**
   * Preenche #prefixo e #setor. Usa cache imediatamente (se houver) e atualiza em segundo plano.
   * Sem cache e sem rede: mostra erro com botão "Tentar novamente" (antes o formulário ficava travado).
   * Retorna Promise<boolean> (true se há dados utilizáveis).
   */
  GAR.carregarDados = async function (depois) {
    depois = depois || function () {};
    function aplicar(d) {
      preencherSelect($('prefixo'), d.viaturas, 'Selecione a viatura...');
      preencherSelect($('setor'), d.setores, 'Selecione o setor...', { valor: 'OUTRO', texto: 'OUTRO (informar abaixo)' });
    }
    function valido(d) { return d && Array.isArray(d.viaturas) && d.viaturas.length > 0; }

    var cache = GAR.store.get(CHAVE_DADOS);
    var usouCache = false;
    if (cache && valido(cache.d)) { aplicar(cache.d); usouCache = true; }

    var tentar = async function (mostrarOverlay) {
      if (mostrarOverlay) GAR.loading(true, 'Carregando viaturas e setores...');
      try {
        var d = await GAR.getJson({ page: 'dados' }, { timeout: 25000, retries: 2 });
        if (!valido(d)) throw new Error('lista de viaturas vazia');
        GAR.store.set(CHAVE_DADOS, { t: Date.now(), d: d });
        if (!cache || JSON.stringify(cache.d) !== JSON.stringify(d)) aplicar(d);
        GAR.esconderInfo('offline');
        return true;
      } catch (e) {
        return false;
      } finally {
        if (mostrarOverlay) GAR.loading(false);
      }
    };

    if (usouCache) {
      depois();
      tentar(false).then(function (ok) {
        if (!ok) GAR.info('Sem conexão com o servidor — usando a lista de viaturas salva neste aparelho.', { texto: 'Atualizar', fn: function () { GAR.carregarDados(); } }, 'offline');
      });
      return true;
    }
    var ok = await tentar(true);
    if (ok) depois();
    else {
      preencherSelect($('prefixo'), [], 'Não foi possível carregar');
      preencherSelect($('setor'), [], 'Não foi possível carregar');
      GAR.mostrarErro('Não foi possível carregar as viaturas e setores. Verifique o sinal de internet.', {
        texto: '↻ Tentar novamente', fn: function () { GAR.esconderErro(); GAR.carregarDados(depois); }
      });
    }
    return ok;
  };

  /* ---------- Guarnição lembrada (comodidade: entrada → saída no mesmo turno) ---------- */
  var CHAVE_GUARNICAO = 'gar:guarnicao';
  var CAMPOS_GUARNICAO = ['comandante', 'motorista', 'matricula', 'telefone'];
  GAR.guarnicao = {
    preencher: function () {
      var g = GAR.store.get(CHAVE_GUARNICAO);
      if (!g) return;
      CAMPOS_GUARNICAO.forEach(function (id) { var el = $(id); if (el && !el.value && g[id]) el.value = g[id]; });
    },
    salvar: function (setor, setorLivre) {
      var g = {};
      CAMPOS_GUARNICAO.forEach(function (id) { var el = $(id); if (el) g[id] = el.value.trim(); });
      var antigo = GAR.store.get(CHAVE_GUARNICAO) || {};
      if (!g.telefone && antigo.telefone) g.telefone = antigo.telefone; // saída não tem telefone
      g.setor = setor || ''; g.setorLivre = setorLivre || '';
      GAR.store.set(CHAVE_GUARNICAO, g);
    },
    setor: function () { return GAR.store.get(CHAVE_GUARNICAO); }
  };

  /* ---------- Rascunho automático (Android pode descartar a aba ao abrir a câmera) ---------- */
  GAR.draft = (function () {
    var chave = null, hooks = {}, timer = null, ativo = false;

    function coletar() {
      var campos = {};
      var els = document.querySelectorAll('.container input, .container select, .container textarea');
      for (var i = 0; i < els.length; i++) {
        var e = els[i];
        if (!e.id || e.type === 'file') continue;
        campos[e.id] = e.type === 'checkbox' ? e.checked : e.value;
      }
      return {
        t: Date.now(), campos: campos, opc: GAR.opc,
        etapa: hooks.getEtapa ? hooks.getEtapa() : 1,
        extra: hooks.getExtra ? hooks.getExtra() : null,
        idEnvio: hooks.getId ? hooks.getId() : null
      };
    }
    var d = {};
    d.init = function (k, h) { chave = k; hooks = h || {}; ativo = false; }; // não grava antes de restaurar
    d.ativar = function () { ativo = true; };
    d.salvar = function () {
      if (!ativo) return;
      clearTimeout(timer);
      timer = setTimeout(d.salvarAgora, 400);
    };
    d.salvarAgora = function () { if (ativo && chave) GAR.store.set(chave, coletar()); };
    d.limpar = function () { ativo = false; clearTimeout(timer); if (chave) GAR.store.del(chave); };
    d.existe = function () {
      var r = chave && GAR.store.get(chave);
      return !!(r && Date.now() - r.t < RASCUNHO_VALIDADE_MS);
    };
    d.restaurar = function () {
      var r = chave && GAR.store.get(chave);
      if (!r || Date.now() - r.t > RASCUNHO_VALIDADE_MS) { if (r) GAR.store.del(chave); return false; }
      var k;
      for (k in r.campos) {
        var el = $(k);
        if (!el || el.type === 'file') continue;
        if (el.type === 'checkbox') { el.checked = !!r.campos[k]; continue; }
        if (el.tagName === 'SELECT') {
          var existe = Array.prototype.some.call(el.options, function (o) { return o.value === r.campos[k]; });
          if (!existe) continue;
        }
        el.value = r.campos[k];
      }
      for (k in r.opc) { if (r.opc[k]) setOpcaoRaw(k, r.opc[k]); }
      GAR.aplicarDependencias();
      if (hooks.setExtra) hooks.setExtra(r.extra);
      if (hooks.setId && r.idEnvio) hooks.setId(r.idEnvio);
      if (hooks.depois) hooks.depois(r);
      return true;
    };
    d.etapaSalva = function () { var r = chave && GAR.store.get(chave); return r ? r.etapa : 1; };
    w.addEventListener('pagehide', function () { d.salvarAgora(); });
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') d.salvarAgora(); });
    document.addEventListener('input', function () { d.salvar(); });
    document.addEventListener('change', function () { d.salvar(); });
    return d;
  })();

  /* ---------- Etapas (wizard) ---------- */
  /** cfg: {labels:[], validar:function(n)->bool, aoEntrar:function(n)} */
  GAR.wizard = function (cfg) {
    var W = { etapa: 1, total: cfg.labels.length };

    function renderSteps() {
      var row = $('stepsRow'); row.innerHTML = '';
      for (var i = 1; i <= W.total; i++) {
        if (i > 1) { var l = document.createElement('div'); l.className = 'step-line'; row.appendChild(l); }
        var d = document.createElement('div');
        d.className = 'step-dot' + (i < W.etapa ? ' done' : i === W.etapa ? ' active' : '');
        row.appendChild(d);
      }
      $('stepLabel').textContent = cfg.labels[W.etapa - 1] + ' — Etapa ' + W.etapa + ' de ' + W.total;
      $('progressFill').style.width = (W.etapa / W.total * 100) + '%';
    }

    W.atualizar = function () {
      for (var i = 1; i <= W.total; i++) {
        var s = $('s' + i);
        if (s) s.className = 'section' + (i === W.etapa ? ' active' : '');
      }
      $('btnBack').style.display = W.etapa > 1 ? 'flex' : 'none';
      $('btnNext').style.display = W.etapa < W.total ? 'flex' : 'none';
      $('btnSend').style.display = W.etapa === W.total ? 'flex' : 'none';
      renderSteps();
      w.scrollTo(0, 0);
      GAR.esconderErro();
      if (cfg.aoEntrar) cfg.aoEntrar(W.etapa);
      GAR.draft.salvar();
    };
    W.ir = function (n) { W.etapa = Math.max(1, Math.min(W.total, n)); W.atualizar(); };
    W.avancar = function () {
      GAR.esconderErro();
      if (!cfg.validar(W.etapa)) { GAR.primeiroInvalido(); return; }
      if (W.etapa < W.total) { W.etapa++; W.atualizar(); }
    };
    W.voltar = function () { if (W.etapa > 1) { W.etapa--; W.atualizar(); } };
    /** Valida todas as etapas; se alguma falhar, volta para ela. */
    W.validarTudo = function () {
      for (var n = 1; n <= W.total; n++) {
        GAR.esconderErro();
        if (!cfg.validar(n)) {
          var falhou = n;
          W.etapa = n; W.atualizar();
          cfg.validar(falhou); // reaplica marcações (atualizar() limpa)
          GAR.mostrarErro('Há campos obrigatórios pendentes na etapa "' + cfg.labels[n - 1] + '".');
          setTimeout(GAR.primeiroInvalido, 50);
          return false;
        }
      }
      return true;
    };
    W.concluir = function () {
      $('footerFixed').style.display = 'none';
      for (var i = 1; i <= W.total; i++) { var s = $('s' + i); if (s) s.className = 'section'; }
      $('stepsRow').style.display = 'none'; $('stepLabel').style.display = 'none';
      document.querySelector('.progress-bar').style.display = 'none';
      $('tela-sucesso').className = 'active';
      w.scrollTo(0, 0);
    };
    return W;
  };

  /* ---------- Limpa marcação de erro ao digitar ---------- */
  function limparMarca(e) {
    var t = e.target;
    if (t && t.classList && t.classList.contains('invalido')) {
      t.classList.remove('invalido');
      var fg = t.closest('.fg'); var m = fg && fg.querySelector('.msg-invalido.on'); if (m) m.classList.remove('on');
    }
  }
  document.addEventListener('input', limparMarca);
  document.addEventListener('change', limparMarca);

  /* ---------- Service worker ---------- */
  if ('serviceWorker' in navigator) {
    w.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').then(function (reg) {
        reg.addEventListener('updatefound', function () {
          var nw = reg.installing;
          if (nw) nw.addEventListener('statechange', function () {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) nw.postMessage({ type: 'SKIP_WAITING' });
          });
        });
      }).catch(function () { /* PWA é opcional: nunca bloquear o formulário */ });
    });
  }
})(window);
