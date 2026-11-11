/* Choachí & Asociados — comportamiento de la página. Sin dependencias.
   window.AS lo inyecta build.py desde config.json (WhatsApp, precios, píxel). */
(function () {
  "use strict";
  var AS = window.AS || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var pesos = function (n) { return "$" + Number(n).toLocaleString("es-CO"); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };

  /* ---------- medición (solo si hay IDs en config.json) ---------- */
  function track(evento, datos) {
    try { if (window.fbq) window.fbq("track", evento, datos || {}); } catch (e) {}
    try { if (window.gtag) window.gtag("event", evento, datos || {}); } catch (e) {}
  }

  /* ---------- enlaces de WhatsApp ---------- */
  function waUrl(texto) { return "https://wa.me/" + AS.wa + "?text=" + encodeURIComponent(texto); }
  function wireWa(el) {
    el.href = waUrl(el.getAttribute("data-wa") || "Hola, quiero que me revisen un caso con mi EPS.");
    el.target = "_blank"; el.rel = "noopener";
    el.addEventListener("click", function () { track("Contact", { content_name: el.getAttribute("data-src") || "boton" }); });
  }
  $$("[data-wa]").forEach(wireWa);

  /* ---------- festivos de Colombia (Ley 51 de 1983, "Ley Emiliani") ---------- */
  function pascua(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25),
        g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4,
        l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
        mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, mes - 1, dia);
  }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function lunesSiguiente(d) { var x = new Date(d); while (x.getDay() !== 1) x.setDate(x.getDate() + 1); return x; }
  function key(d) { return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
  var cacheFest = {};
  function festivos(y) {
    if (cacheFest[y]) return cacheFest[y];
    var s = {}, add = function (d) { s[key(d)] = true; };
    [[0, 1], [4, 1], [6, 20], [7, 7], [11, 8], [11, 25]].forEach(function (md) { add(new Date(y, md[0], md[1])); });
    [[0, 6], [2, 19], [5, 29], [7, 15], [9, 12], [10, 1], [10, 11]].forEach(function (md) { add(lunesSiguiente(new Date(y, md[0], md[1]))); });
    var p = pascua(y);
    add(addDays(p, -3)); add(addDays(p, -2));            // jueves y viernes santo
    add(addDays(p, 43)); add(addDays(p, 64)); add(addDays(p, 71)); // Ascensión, Corpus Christi, Sagrado Corazón (lunes)
    return (cacheFest[y] = s);
  }
  function esHabil(d) { var w = d.getDay(); return w !== 0 && w !== 6 && !festivos(d.getFullYear())[key(d)]; }
  /* El término empieza a contar el día hábil siguiente a la radicación. */
  function sumarHabiles(desde, n) {
    var d = new Date(desde), dias = [], c = 0;
    while (c < n) { d = addDays(d, 1); var h = esHabil(d); dias.push({ f: new Date(d), h: h }); if (h) c++; }
    return { fin: d, dias: dias };
  }
  var fmtLargo = function (d) { return d.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); };

  /* ---------- calculadora de plazos ---------- */
  var calc = $("#calc");
  if (calc) {
    var fecha = $("#calc-fecha"), tipo = $("#calc-tipo"), out = $("#calc-out");
    var hoy = new Date(), dd = function (n) { return (n < 10 ? "0" : "") + n; };
    fecha.value = hoy.getFullYear() + "-" + dd(hoy.getMonth() + 1) + "-" + dd(hoy.getDate());   // fecha local, no UTC
    var TIPOS = {
      peticion: { n: 15, txt: "para que la EPS responda su derecho de petición", sig: "Si a esa fecha no le han respondido de fondo, ya puede poner la tutela." },
      info: { n: 10, txt: "para que la EPS le entregue documentos o información (por ejemplo, su historia clínica)", sig: "Si no se los entregan, procede la tutela por el derecho de petición." },
      tutela: { n: 10, txt: "para que el juez falle su tutela", sig: "Si el fallo le da la razón y la EPS no cumple en el plazo que le dio el juez (suele ser 48 horas), sigue el incidente de desacato." },
      impugnar: { n: 3, txt: "para impugnar el fallo de tutela, contados desde que se lo notifican", sig: "Si se le pasa este plazo, el fallo queda en firme." }
    };
    var pintar = function () {
      if (!fecha.value) return;
      var p = fecha.value.split("-"), base = new Date(+p[0], +p[1] - 1, +p[2]), t = TIPOS[tipo.value];
      var r = sumarHabiles(base, t.n);
      var cuadros = r.dias.map(function (x, i) {
        var ult = i === r.dias.length - 1;
        return '<b class="' + (ult ? "end" : x.h ? "" : "off") + '" title="' + esc(x.f.toLocaleDateString("es-CO")) + (x.h ? "" : " · no hábil") + '">' + x.f.getDate() + "</b>";
      }).join("");
      out.innerHTML = '<p style="margin:0 0 .3rem;color:var(--dim)">Vence el</p><div class="big">' + esc(fmtLargo(r.fin)) + "</div>" +
        '<p style="margin:.7rem 0 0">' + t.n + " días hábiles " + esc(t.txt) + ". " + esc(t.sig) + "</p>" +
        '<div class="days" aria-hidden="true">' + cuadros + "</div>" +
        '<p class="hint">Los cuadros grises son fines de semana y festivos de Colombia; esos no cuentan.</p>';
    };
    fecha.addEventListener("change", pintar); tipo.addEventListener("change", pintar); pintar();
  }

  /* ---------- orientador "¿Qué me toca?" con vista previa del escrito ---------- */
  var form = $("#orientador-campos");
  if (form) {
    var SERV = {
      cirugia: ["la cirugía", "autorizar y realizar la cirugía ordenada por el médico tratante"],
      cita: ["la cita con el especialista", "asignar y realizar la consulta con el especialista ordenada"],
      medicamento: ["el medicamento", "entregar de forma completa y oportuna el medicamento formulado"],
      examen: ["el examen o procedimiento", "autorizar y realizar el examen ordenado"],
      transporte: ["el transporte para el tratamiento", "suministrar el transporte (y viáticos si aplica) para asistir al tratamiento"],
      insumos: ["los insumos (pañales, sillas, oxígeno…)", "entregar los insumos ordenados por el médico tratante"],
      terapias: ["las terapias", "autorizar y garantizar la continuidad de las terapias ordenadas"]
    };
    var SIT = {
      nunca: "Me dicen que no hay agenda o que espere, pero nunca he reclamado por escrito.",
      niegan: "Reclamé y la EPS lo negó, o respondió sin resolver de fondo.",
      silencio: "Puse un derecho de petición hace más de 15 días hábiles y no me han respondido.",
      gane: "Ya gané una tutela y la EPS no está cumpliendo.",
      tramite: "Ya puse una tutela y está en trámite."
    };
    var val = function (n) { var x = form.querySelector('[name="' + n + '"]:checked') || form.querySelector('select[name="' + n + '"]'); return x ? x.value : ""; };
    var paper = $("#paper"), res = $("#resultado");
    var ph = function (t) { return '<span class="ph">' + esc(t) + "</span>"; };

    var recomendar = function (v) {
      if (v.urgente === "vital") return { k: "vital" };
      if (v.situacion === "gane") return { k: "desacato" };
      if (v.situacion === "tramite") return { k: "tramite" };
      if (v.orden === "no") return { k: "sinorden" };
      if (v.situacion === "nunca" && v.urgente !== "si") return { k: "peticion" };
      return { k: "tutela", medida: v.urgente === "si" };
    };

    var pintarPaper = function (v, r) {
      var eps = v.eps || "[su EPS]", s = SERV[v.necesita] || ["el servicio", "autorizar y prestar el servicio ordenado"];
      var fam = v.quien === "familiar";
      var titular = fam ? "mi " + ph("parentesco") + ", " + ph("nombre del paciente") + "," : "yo, " + ph("su nombre") + ",";
      var html;
      if (r.k === "peticion" || r.k === "sinorden") {
        html = "<p>" + ph("Ciudad") + ", " + esc(new Date().toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })) + "</p>" +
          "<p>Señores<br><b>" + esc(eps) + "</b><br>Oficina de atención al usuario</p>" +
          '<p class="center">DERECHO DE PETICIÓN</p>' +
          "<p>Yo, " + ph("su nombre") + ", con cédula " + ph("número") + (fam ? ", actuando en favor de " + ph("nombre del paciente") : "") +
          ", en ejercicio del artículo 23 de la Constitución y de la Ley 1755 de 2015, solicito:</p><p class='h'>Hechos</p><p>1. " +
          (r.k === "sinorden" ? "Necesito " + esc(s[0]) + " y no he podido obtener la valoración ni la orden del especialista." :
            "El médico tratante ordenó " + esc(s[0]) + " el " + ph("fecha de la orden") + ".") +
          "</p><p>2. " + esc(SIT[v.situacion] || "") + "</p><p class='h'>Peticiones</p><p>1. " +
          (r.k === "sinorden" ? "Asignar la valoración con el especialista para definir el tratamiento." : esc(s[1].charAt(0).toUpperCase() + s[1].slice(1)) + ", indicando fecha e IPS.") +
          "</p><p>2. Si se niega, informarlo por escrito con sus razones y fundamento legal.</p>";
      } else if (r.k === "desacato") {
        html = "<p>Señor<br><b>JUEZ " + ph("juzgado que falló") + "</b></p>" +
          '<p class="center">INCIDENTE DE DESACATO</p><p>Accionante: ' + ph("su nombre") + "<br>Accionada: <b>" + esc(eps) + "</b><br>Radicado: " + ph("número del proceso") + "</p>" +
          "<p class='h'>Hechos</p><p>1. Mediante fallo del " + ph("fecha") + ", el Juzgado ordenó a " + esc(eps) + " " + esc(s[1]) + ".</p>" +
          "<p>2. A la fecha la orden no se ha cumplido.</p><p class='h'>Solicitud</p><p>Abrir incidente de desacato (art. 52, Decreto 2591 de 1991) y requerir el cumplimiento inmediato del fallo.</p>";
      } else {
        html = "<p>Señor<br><b>JUEZ (REPARTO)</b><br>" + ph("Ciudad") + "</p>" +
          '<p class="center">ACCIÓN DE TUTELA' + (r.medida || r.k === "vital" ? "<br>CON SOLICITUD DE MEDIDA PROVISIONAL" : "") + "</p>" +
          "<p>Accionante: " + (fam ? ph("su nombre") + ", como agente oficioso de " + ph("nombre del paciente") : ph("su nombre")) +
          "<br>Accionada: <b>" + esc(eps) + "</b></p><p class='h'>Hechos</p><p>1. " + (fam ? "Mi " + ph("parentesco") + " está afiliado(a)" : "Estoy afiliado(a)") + " a " + esc(eps) + ".</p>" +
          "<p>2. El médico tratante ordenó " + esc(s[0]) + " el " + ph("fecha de la orden") + ".</p><p>3. " + esc(SIT[v.situacion] || "La EPS no ha prestado el servicio.") + "</p>" +
          (fam ? "<p>4. Actúo como agente oficioso porque mi " + ph("parentesco") + " no está en condiciones de presentar esta tutela por sí mismo(a): " + ph("motivo: edad, hospitalización, discapacidad…") + " (Decreto 2591 de 1991, art. 10).</p>" : "") +
          "<p class='h'>Derechos vulnerados</p><p>Salud, vida digna y seguridad social (art. 49 de la Constitución; Ley 1751 de 2015).</p>" +
          "<p class='h'>Pretensiones</p><p>1. Ordenar a " + esc(eps) + " " + esc(s[1]) + " en un plazo máximo de 48 horas.</p>" +
          "<p>2. Ordenar el tratamiento integral para la patología que lo origina.</p>";
      }
      var firma = r.k === "tutela" || r.k === "desacato" || r.k === "vital";
      paper.innerHTML = html + (firma ? '<span class="stamp">Revisada por la abogada</span>' : "");
    };

    var TXT = {
      vital: { t: "Primero: vaya a urgencias ya", warn: true, p: null,
        b: ["La atención inicial de urgencias no necesita autorización de la EPS. Vaya al servicio de urgencias más cercano o llame al 123.",
            "Después, escríbanos: la tutela con medida provisional se puede presentar el mismo día y el juez puede ordenar la atención mientras decide."] },
      peticion: { t: "Le sirve un derecho de petición", p: "peticion",
        b: ["Es el reclamo formal por escrito. La EPS tiene 15 días hábiles para responder de fondo.",
            "Lo radicamos y le contamos los días. Si no responde o se lo niega, pasamos a la tutela.",
            "Si su salud no da espera, no hace falta: se puede ir directo a la tutela."] },
      tutela: { t: "Le sirve una acción de tutela", p: "tutela",
        b: ["El juez tiene 10 días hábiles para fallar.",
            "La abogada la revisa y la radica; el juzgado le notifica a usted directamente.",
            "En 2024, el 74,3 % de las tutelas en salud se concedieron (Defensoría del Pueblo). Eso no garantiza su caso, pero muestra que vale la pena."] },
      desacato: { t: "Le sirve un incidente de desacato", p: "desacato",
        b: ["Es lo que se hace cuando la EPS no cumple lo que el juez ordenó.",
            "El juez puede sancionar con multa y arresto al responsable en la EPS. Revisamos el fallo y preparamos el escrito.",
            "Tenga a mano el número del proceso y el fallo."] },
      tramite: { t: "No ponga otra tutela por lo mismo", warn: true, p: null,
        b: ["Presentar dos tutelas por los mismos hechos se considera temeridad y puede hacer que se las rechacen.",
            "Lo que sí se puede hacer: revisar en qué va, pedir medidas si la situación empeoró e impugnar si el fallo sale en contra. Le revisamos el caso gratis."] },
      sinorden: { t: "Primero hay que conseguir la orden médica", p: "peticion",
        b: ["Sin una orden del médico tratante, la tutela queda débil: el juez se apoya en lo que dijo su médico.",
            "Un derecho de petición pidiendo la valoración con el especialista es el primer paso. Lo armamos con usted."] }
    };
    var PROD = { peticion: ["Derecho de petición", AS.precios.peticion], tutela: ["Tutela", AS.precios.tutela], desacato: ["Desacato", AS.precios.desacato] };

    var actualizar = function (final) {
      var v = { necesita: val("necesita"), quien: val("quien"), orden: val("orden"), situacion: val("situacion"), urgente: val("urgente"), eps: val("eps") };
      var r = recomendar(v);
      pintarPaper(v, r);
      var listo = v.necesita && v.orden && v.situacion && v.urgente;
      if (!listo) { res.className = "result"; return; }
      var t = TXT[r.k], prod = t.p && PROD[t.p];
      var resumen = "Hola, vengo de la página. Usé el orientador:\n• Necesito: " + ((SERV[v.necesita] || [""])[0]) +
        (v.quien === "familiar" ? " (para un familiar)" : "") + "\n• Orden médica: " + (v.orden === "si" ? "sí" : "no") +
        "\n• Situación: " + SIT[v.situacion] + "\n• Urgencia: " + ({ no: "no", si: "sí, no da espera", vital: "riesgo vital" })[v.urgente] +
        (v.eps ? "\n• EPS: " + v.eps : "") + "\nMe sugiere: " + t.t.toLowerCase() + ". ¿Me revisan el caso?";
      res.className = "result show" + (t.warn ? " warn" : "");
      res.innerHTML = "<h3>" + esc(t.t) + "</h3><ul>" + t.b.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" +
        (prod ? '<p>Precio: <span class="price">' + pesos(prod[1]) + "</span> · o el plan completo hasta que le cumplan por " + pesos(AS.precios.plan) +
          ". La revisión es gratis y solo paga si su caso procede.</p>" : "") +
        (AS.wa_on
          ? '<a class="btn btn-wa btn-block" data-src="orientador" data-wa="' + esc(resumen) + '">' + WA_ICON + "Enviar mi caso por WhatsApp</a>" +
            '<p class="hint">El mensaje lleva solo estas respuestas, sin datos médicos. Usted lo ve antes de enviarlo.</p>'
          : '<button type="button" class="btn btn-wa btn-block is-off" disabled>' + WA_ICON + "WhatsApp muy pronto</button>" +
            '<p class="hint">Estamos activando nuestra línea de WhatsApp. Sus respuestas quedan guardadas en este navegador para cuando abramos.</p>');
      if (AS.wa_on) wireWa($("[data-wa]", res));
      if (final) track("Lead", { content_name: r.k });
    };
    var WA_ICON = ($(".btn-wa svg") || { outerHTML: "" }).outerHTML;   // también existe en los botones apagados
    /* "continuar donde iba": las respuestas (sin datos personales) quedan solo en este navegador */
    var KEY = "as-orientador";
    try {
      var prev = JSON.parse(localStorage.getItem(KEY) || "{}");
      Object.keys(prev).forEach(function (n) {
        var el = form.querySelector('input[name="' + n + '"][value="' + prev[n] + '"]');
        if (el) el.checked = true; else if (n === "eps") form.querySelector("#eps").value = prev[n];
      });
    } catch (e) {}
    form.addEventListener("change", function () {
      actualizar(true);
      try {
        var g = {}; ["necesita", "quien", "orden", "situacion", "urgente", "eps"].forEach(function (n) { var v = val(n); if (v) g[n] = v; });
        localStorage.setItem(KEY, JSON.stringify(g));
      } catch (e) {}
    });
    actualizar(false);
  }
})();
