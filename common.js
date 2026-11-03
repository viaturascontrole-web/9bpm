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
  GAR.VERSAO = '2026.11.02.1';
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


  /* ---------- Ícones (SVG inline: sem fonte externa, sem emoji que muda de aparelho para aparelho) ---------- */
  var SPRITE = '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><symbol id="i-log-in" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></symbol><symbol id="i-log-out" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></symbol><symbol id="i-car" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></symbol><symbol id="i-map-pin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></symbol><symbol id="i-users" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></symbol><symbol id="i-wrench" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></symbol><symbol id="i-camera" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></symbol><symbol id="i-image" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/></symbol><symbol id="i-sparkles" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></symbol><symbol id="i-credit-card" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></symbol><symbol id="i-scale" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></symbol><symbol id="i-fuel" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="22" x2="15" y2="22"/><line x1="4" y1="9" x2="14" y2="9"/><path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"/><path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2 2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5"/></symbol><symbol id="i-alert" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></symbol><symbol id="i-check-circle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></symbol><symbol id="i-x-circle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></symbol><symbol id="i-ban" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></symbol><symbol id="i-info" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></symbol><symbol id="i-clock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></symbol><symbol id="i-phone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></symbol><symbol id="i-wallet" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></symbol><symbol id="i-cloud-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 2 20 20"/><path d="M5.782 5.782A7 7 0 0 0 9 19h8.5a4.5 4.5 0 0 0 1.307-.193"/><path d="M21.532 16.5A4.5 4.5 0 0 0 17.5 10h-1.79A7.008 7.008 0 0 0 10 5.07"/></symbol><symbol id="i-refresh" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></symbol></svg>';
  GAR.ico = function (nome, cls) {
    return '<svg class="ic' + (cls ? ' ' + cls : '') + '" aria-hidden="true" focusable="false"><use href="#i-' + nome + '"></use></svg>';
  };
  if (document.body) document.body.insertAdjacentHTML('afterbegin', SPRITE);
  else document.addEventListener('DOMContentLoaded', function () { document.body.insertAdjacentHTML('afterbegin', SPRITE); });

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
   * Retorna {ok, confirmado, erro, confirmarOdometro, bloqueado}. Só é "falha" quando o servidor diz explicitamente que falhou
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
      return {
        ok: false, confirmado: true,
        erro: j.erro || j.mensagem || 'Erro retornado pelo servidor',
        confirmarOdometro: j.confirmarOdometro === true, // servidor pede confirmação do odômetro (reenviar com confirmarOdometro:true)
        bloqueado: j.bloqueado === true,                 // ex.: entrada com viatura já em serviço
        resposta: j
      };
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


  /* ---------- Odômetro: regra ÚNICA (entrada e saída) ----------
     Os limites espelham ODOMETRO_SALTO_MAX_KM e ODOMETRO_MAX_ABSOLUTO do Apps Script (utils.gs).
     Se o servidor ainda pedir confirmação (referência dele diferente da do índice), forcarConfirmacao()
     reaproveita a mesma caixa "Confirmo que o odômetro está correto". */
  GAR.odometro = (function () {
    var SALTO_MAX_KM = 1500, MAX_ABSOLUTO = 500000;

    function avaliar(v, ref) {
      if (!v || v <= 0) return { nivel: 'ok', msg: '' };
      if (v > MAX_ABSOLUTO) return { nivel: 'bloquear', msg: 'O valor informado (' + GAR.fmtKm(v) + ' km) parece erro de digitação. Confira o painel da viatura.' };
      if (ref > 0) {
        if (v < ref) return { nivel: 'confirmar', msg: 'O odômetro informado (' + GAR.fmtKm(v) + ' km) é MENOR que o último registrado (' + GAR.fmtKm(ref) + ' km). Confira o painel da viatura.' };
        if (v - ref > SALTO_MAX_KM) return { nivel: 'confirmar', msg: 'Diferença de ' + GAR.fmtKm(v - ref) + ' km desde o último registro (' + GAR.fmtKm(ref) + ' km). Confira o painel da viatura.' };
      }
      return { nivel: 'ok', msg: '' };
    }

    /** cfg: {input, hint, aviso, avisoTxt, confirma, orientacao}  (ids)  orientacao: "informe o odômetro final" */
    function criar(cfg) {
      var ref = 0, estado = 'vazio', forcado = '', ultima = { nivel: 'ok', msg: '' };
      var c = {};
      function el(k) { return $(cfg[k]); }

      c.valor = function () { var v = parseInt(el('input').value, 10); return isNaN(v) ? 0 : v; };
      c.estado = function () { return estado; };

      function dica(html) { var h = el('hint'); h.innerHTML = html || ''; h.classList.toggle('on', !!html); }

      c.avaliar = function () {
        ultima = avaliar(c.valor(), ref);
        var precisa = ultima.nivel === 'confirmar' || (ultima.nivel === 'ok' && !!forcado);
        var bloqueia = ultima.nivel === 'bloquear';
        var box = el('aviso');
        el('avisoTxt').innerHTML = (precisa || bloqueia) ? GAR.ico('alert') + ' ' + GAR.esc(bloqueia ? ultima.msg : (forcado || ultima.msg)) : '';
        box.classList.toggle('on', precisa || bloqueia);
        box.classList.toggle('bloqueio', bloqueia);
        if (!precisa) el('confirma').checked = false;
        return { precisaConfirmar: precisa, bloqueado: bloqueia };
      };

      /** '' = ok | 'vazio' | 'consultando' | 'bloqueado' | 'confirmar' */
      c.problema = function (aguardarConsulta) {
        if (c.valor() <= 0) return 'vazio';
        if (estado === 'carregando' && aguardarConsulta) return 'consultando';
        var a = c.avaliar();
        if (a.bloqueado) return 'bloqueado';
        if (a.precisaConfirmar && !el('confirma').checked) return 'confirmar';
        return '';
      };
      c.mensagem = function () { return ultima.msg; };
      c.marcarPendente = function () { el('aviso').classList.add('invalido'); };
      c.confirmado = function () { return !!el('confirma').checked && c.avaliar().precisaConfirmar; };
      /** Campos para o payload: confirmarOdometro:true só quando o policial confirmou. */
      c.payload = function () {
        return c.confirmado() ? { confirmarOdometro: true, odometroDivergente: 'SIM' } : {};
      };

      c.limpar = function () { ref = 0; estado = 'vazio'; forcado = ''; dica(''); c.avaliar(); };
      c.consultando = function (txt) { ref = 0; estado = 'carregando'; forcado = ''; dica(GAR.ico('clock') + ' ' + GAR.esc(txt || 'Consultando último odômetro...')); c.avaliar(); };
      c.definirRef = function (n) {
        ref = n > 0 ? n : 0; estado = 'ok';
        if (n > 0) {
          dica(GAR.ico('info') + ' Último registrado: <strong>' + GAR.esc(GAR.fmtKm(n)) + ' km</strong> — ' + GAR.esc(cfg.orientacao || 'confira o painel') +
            ' <button type="button" class="dica-btn" data-usar-odo="1">Usar este valor</button>');
        } else dica(GAR.ico('info') + ' Nenhum registro anterior — informe o odômetro atual');
        c.avaliar();
      };
      c.falhou = function () {
        ref = 0; estado = 'falhou';
        dica(GAR.ico('alert') + ' Não foi possível consultar o último odômetro. Informe o valor do painel da viatura.');
        c.avaliar();
      };
      /** O servidor recusou pedindo confirmação: mostra a mensagem dele e exige a caixa marcada. */
      c.forcarConfirmacao = function (msg) { forcado = msg || 'Confirme o odômetro informado.'; el('confirma').checked = false; c.avaliar(); };

      c.ligar = function () {
        el('input').addEventListener('input', function () {
          GAR.somenteDigitos(this); forcado = '';
          el('aviso').classList.remove('invalido'); c.avaliar();
        });
        el('confirma').addEventListener('change', function () { el('aviso').classList.remove('invalido'); });
        el('hint').addEventListener('click', function (e) {
          var b = e.target.closest ? e.target.closest('[data-usar-odo]') : null;
          if (!b || !ref) return;
          el('input').value = String(ref); forcado = '';
          el('input').dispatchEvent(new Event('input', { bubbles: true }));
        });
      };
      return c;
    }

    return { SALTO_MAX_KM: SALTO_MAX_KM, MAX_ABSOLUTO: MAX_ABSOLUTO, avaliar: avaliar, criar: criar };
  })();

  /* ---------- Interface: loading / erros ---------- */
  GAR.loading = function (on, txt) {
    if (txt) $('loadingTxt').textContent = txt;
    $('loadingOv').className = 'loading-ov' + (on ? ' on' : '');
  };

  GAR.mostrarErro = function (msg, acao) {
    var box = $('erroGlobal');
    box.innerHTML = '';
    var span = document.createElement('span');
    span.innerHTML = GAR.ico('alert') + ' ';
    span.appendChild(document.createTextNode(msg));
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

  /**
   * Envia fotos de uma lista plana [{base64, nome, mimeType, rotulo, enviada}] (marca enviada=true nos próprios objetos).
   * Falha de foto NÃO impede o registro. Se a REDE cair (exceção), para na hora e devolve redeCaiu:true
   * (quem chama guarda tudo na fila em vez de esperar um timeout por foto).
   * opt.silencioso: sem overlay/barra (envio em segundo plano pela fila).
   */
  GAR.enviarFotosLista = async function (prefixo, fotos, opt) {
    opt = opt || {};
    var lista = fotos.filter(function (f) { return !f.enviada; });
    var todas = fotos.length, ok = fotos.filter(function (f) { return f.enviada; }).length, falhas = 0, redeCaiu = false;
    if (!lista.length) return { total: todas, ok: ok, falhas: 0, redeCaiu: false };

    var barra = opt.silencioso ? null : $('fotoProgBar'), fill = opt.silencioso ? null : $('fotoProgFill');
    if (barra) barra.className = 'foto-upload-prog on';
    for (var n = 0; n < lista.length; n++) {
      if (!opt.silencioso) GAR.loading(true, 'Enviando foto ' + (n + 1) + ' de ' + lista.length + '...');
      if (fill) fill.style.width = Math.round((n / lista.length) * 100) + '%';
      var enviou = false, erroRede = false;
      for (var tent = 0; tent < 2 && !enviou; tent++) {
        try {
          var r = await GAR.postJson({
            tipo: 'foto', prefixo: prefixo,
            nomeArquivo: (lista[n].rotulo ? lista[n].rotulo + '_' : '') + lista[n].nome,
            base64: lista[n].base64, mimeType: lista[n].mimeType
          });
          erroRede = false;
          if (r.ok) enviou = true; else break; // servidor recusou: não adianta repetir
        } catch (e) { erroRede = true; if (tent === 0) await GAR.sleep(1200); }
      }
      if (enviou) { lista[n].enviada = true; ok++; }
      else { falhas++; if (erroRede) { redeCaiu = true; break; } }
    }
    if (fill) fill.style.width = '100%';
    if (barra) setTimeout(function () { barra.className = 'foto-upload-prog'; }, 800);
    return { total: todas, ok: ok, falhas: falhas, redeCaiu: redeCaiu };
  };

  /** Compatibilidade: recebe os grupos criados por GAR.criarFotos. */
  GAR.enviarFotos = function (prefixo, grupos) {
    return GAR.enviarFotosLista(prefixo, GAR.coletarFotos(grupos));
  };

  /** Lista plana das fotos dos grupos (os MESMOS objetos: o flag "enviada" vale para o formulário e para a fila). */
  GAR.coletarFotos = function (grupos) {
    var out = [];
    grupos.forEach(function (g) { g.itens().forEach(function (i) { i.rotulo = g.rotulo; out.push(i); }); });
    return out;
  };

  GAR.textoLinkImagens = function (rf) {
    return rf.ok > 0 ? 'Fotos enviadas para pasta da viatura no Drive (' + rf.ok + (rf.falhas ? ' de ' + rf.total : '') + ')' : '';
  };

  /**
   * Envia UM registro: fotos pendentes e depois o POST do registro.
   * item: {id, tipo, prefixo, payload, fotos, resumo}.  Lança erro se a rede cair; senão devolve {r, rf, payload}.
   * r.ok === false = o servidor recusou (r.erro, r.confirmarOdometro, r.bloqueado).
   */
  GAR.enviarItem = async function (item, opt) {
    opt = opt || {};
    var rf = await GAR.enviarFotosLista(item.prefixo, item.fotos || [], opt);
    if (rf.redeCaiu) throw new Error('sem rede');
    var payload = Object.assign({}, item.payload, { idEnvio: item.id, linkImagens: GAR.textoLinkImagens(rf) });
    if (!opt.silencioso) GAR.loading(true, item.tipo === 'saida' ? 'Registrando saída...' : 'Registrando entrada...');
    var r = await GAR.postJson(payload);
    return { r: r, rf: rf, payload: payload };
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


  /* ---------- Fila de reenvio (sem sinal: guarda no aparelho e envia quando a rede voltar) ----------
     Segura porque o servidor ignora um idEnvio repetido (ver utils_patch_idEnvio.gs).
     O envio acontece enquanto o app estiver aberto (online / volta ao app / a cada 45 s) e ao abrir de novo. */
  GAR.fila = (function () {
    var F = {}, DB = 'garageiro-fila', ST = 'itens', LS = 'gar:fila', LOCK = 'gar:fila:lock';
    var dbPromise = null, enviando = false, timer = null, ultimoAviso = '';

    function abrirDb() {
      if (dbPromise) return dbPromise;
      dbPromise = new Promise(function (res) {
        try {
          var rq = w.indexedDB.open(DB, 1);
          rq.onupgradeneeded = function () { rq.result.createObjectStore(ST, { keyPath: 'id' }); };
          rq.onsuccess = function () { res(rq.result); };
          rq.onerror = rq.onblocked = function () { res(null); };
        } catch (e) { res(null); }
      });
      return dbPromise;
    }
    function idb(db) {
      function tx(modo, fn) {
        return new Promise(function (res) {
          try {
            var t = db.transaction(ST, modo), out;
            out = fn(t.objectStore(ST));
            t.oncomplete = function () { res(out && 'result' in out ? out.result : true); };
            t.onerror = t.onabort = function () { res(modo === 'readonly' ? [] : false); };
          } catch (e) { res(modo === 'readonly' ? [] : false); }
        });
      }
      return {
        all: function () { return tx('readonly', function (s) { return s.getAll(); }).then(function (r) { return r || []; }); },
        put: function (item) { return tx('readwrite', function (s) { s.put(item); }); },
        del: function (id) { return tx('readwrite', function (s) { s.delete(id); }); }
      };
    }
    var lsBackend = {
      all: function () { return Promise.resolve(GAR.store.get(LS) || []); },
      put: function (item) {
        var l = (GAR.store.get(LS) || []).filter(function (x) { return x.id !== item.id; }); l.push(item);
        return Promise.resolve(GAR.store.set(LS, l));
      },
      del: function (id) { return Promise.resolve(GAR.store.set(LS, (GAR.store.get(LS) || []).filter(function (x) { return x.id !== id; }))); }
    };
    function bk() { return abrirDb().then(function (db) { return db ? idb(db) : lsBackend; }); }

    F.listar = function () { return bk().then(function (b) { return b.all(); }); };
    /** true se ficou guardado no aparelho. */
    F.adicionar = function (item) {
      var reg = {
        id: item.id, tipo: item.tipo, prefixo: item.prefixo, resumo: item.resumo || '', payload: item.payload,
        fotos: (item.fotos || []).map(function (f) { return { base64: f.base64, nome: f.nome, mimeType: f.mimeType, rotulo: f.rotulo, enviada: !!f.enviada }; }),
        criadoEm: Date.now(), tentativas: 0, estado: 'aguardando', erro: '', confirmarOdometro: false
      };
      return bk().then(function (b) { return b.put(reg); }).then(function (ok) { if (ok) { renderizar(); agendar(); } return !!ok; });
    };
    function salvar(item) { return bk().then(function (b) { return b.put(item); }); }
    function remover(id) { return bk().then(function (b) { return b.del(id); }); }

    function lockPegar() { var t = GAR.store.get(LOCK); if (t && Date.now() - t < 120000) return false; GAR.store.set(LOCK, Date.now()); return true; }
    function lockSoltar() { GAR.store.del(LOCK); }

    F.enviarPendentes = async function (manual) {
      if (enviando) return;
      if (!manual && w.navigator && w.navigator.onLine === false) return;
      if (!lockPegar()) return;
      enviando = true; renderizar(true);
      try {
        var lista = (await F.listar()).filter(function (i) { return i.estado === 'aguardando'; });
        for (var n = 0; n < lista.length; n++) {
          var item = lista[n];
          try {
            var res = await GAR.enviarItem(item, { silencioso: true });
            // as fotos que subiram ficam marcadas, mesmo se o registro for recusado ou a rede cair depois
            if (res.r.ok) { await remover(item.id); ultimoAviso = 'Registro de ' + (item.prefixo || 'viatura') + ' enviado.'; }
            else { item.estado = 'recusado'; item.erro = res.r.erro; item.confirmarOdometro = !!res.r.confirmarOdometro; await salvar(item); }
          } catch (e) { item.tentativas = (item.tentativas || 0) + 1; await salvar(item); break; } // sem rede: tenta de novo depois
        }
      } finally { enviando = false; lockSoltar(); renderizar(); agendar(); }
    };

    F.descartar = function (id) { return remover(id).then(function () { renderizar(); }); };
    F.confirmarEEnviar = function (id) {
      return F.listar().then(function (l) {
        var it = l.filter(function (x) { return x.id === id; })[0]; if (!it) return;
        it.payload.confirmarOdometro = true; it.estado = 'aguardando'; it.erro = '';
        return salvar(it).then(function () { return F.enviarPendentes(true); });
      });
    };

    /* faixa no topo da página (criada sob demanda) */
    function faixa() {
      var f = document.getElementById('filaBanner');
      if (f) return f;
      f = document.createElement('div'); f.id = 'filaBanner'; f.className = 'fila-banner'; f.setAttribute('role', 'status');
      document.body.insertBefore(f, document.body.firstChild ? document.body.children[1] || null : null);
      f.addEventListener('click', function (e) {
        var b = e.target.closest ? e.target.closest('[data-fila]') : null; if (!b) return;
        var a = b.getAttribute('data-fila'), id = b.getAttribute('data-id');
        if (a === 'enviar') F.enviarPendentes(true);
        else if (a === 'descartar') { if (w.confirm('Descartar este registro? Ele NÃO será enviado.')) F.descartar(id); }
        else if (a === 'confirmar') F.confirmarEEnviar(id);
      });
      return f;
    }
    function renderizar(trabalhando) {
      F.listar().then(function (lista) {
        var f = faixa();
        if (!lista.length) {
          if (ultimoAviso) { f.className = 'fila-banner ok on'; f.innerHTML = GAR.ico('check-circle') + ' ' + GAR.esc(ultimoAviso); setTimeout(function () { ultimoAviso = ''; if (!enviando) f.className = 'fila-banner'; }, 6000); }
          else f.className = 'fila-banner';
          return;
        }
        var h = '';
        lista.forEach(function (i) {
          var nome = (i.tipo === 'saida' ? 'Saída' : 'Entrada') + (i.prefixo ? ' — ' + i.prefixo : '');
          if (i.estado === 'recusado') {
            h += '<div class="fila-item err"><div>' + GAR.ico('alert') + ' <strong>' + GAR.esc(nome) + '</strong> não foi aceito: ' + GAR.esc(i.erro) + '</div><div class="fila-acoes">' +
              (i.confirmarOdometro ? '<button type="button" data-fila="confirmar" data-id="' + GAR.esc(i.id) + '">Confirmar odômetro e enviar</button>' : '') +
              '<button type="button" data-fila="descartar" data-id="' + GAR.esc(i.id) + '">Descartar</button></div></div>';
          } else {
            h += '<div class="fila-item"><div>' + GAR.ico(trabalhando ? 'refresh' : 'cloud-off') + ' <strong>' + GAR.esc(nome) + '</strong> — ' +
              (trabalhando ? 'enviando...' : 'aguardando sinal para enviar') + '</div><div class="fila-acoes">' +
              (trabalhando ? '' : '<button type="button" data-fila="enviar">Enviar agora</button>') + '</div></div>';
          }
        });
        f.className = 'fila-banner on'; f.innerHTML = h;
      });
    }
    function agendar() {
      F.listar().then(function (l) {
        var pend = l.some(function (i) { return i.estado === 'aguardando'; });
        if (pend && !timer) timer = setInterval(function () { F.enviarPendentes(false); }, 45000);
        if (!pend && timer) { clearInterval(timer); timer = null; }
      });
    }

    F.iniciar = function () {
      renderizar(); agendar();
      w.addEventListener('online', function () { F.enviarPendentes(false); });
      document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') F.enviarPendentes(false); });
      setTimeout(function () { F.enviarPendentes(false); }, 1500);
    };
    return F;
  })();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { GAR.fila.iniciar(); });
  else GAR.fila.iniciar();

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
