/**
 * ============================================================
 *  ui.js — Controlador de Interfaz
 *  UTN Haedo · Predimensionamiento de Motores Aeronáuticos
 * ============================================================
 *
 *  Responsabilidades:
 *    · Leer controles del DOM
 *    · Llamar a Engine y Geometry (funciones puras)
 *    · Actualizar tabla de estados, tarjetas y gráficos
 *    · Gestionar alertas de T_max, p_max y entradas inválidas
 *    · Manejar cambio de pestaña (Gráficos / Análisis)
 *
 *  Principio: esta capa NUNCA hace cálculos numéricos propios.
 *  Todo cálculo se delega a engine.js y geometry.js.
 * ============================================================
 */

'use strict';

// ════════════════════════════════════════════════════════════════
//  CONSTANTES DE ALERTAS
// ════════════════════════════════════════════════════════════════

const ALERT_TMAX = 2500;   // K  — límite de temperatura
const ALERT_PMAX = 1e7;    // Pa — 100 bar

// ════════════════════════════════════════════════════════════════
//  ESTADO DE LA APLICACIÓN (única fuente de verdad)
// ════════════════════════════════════════════════════════════════

let appState = {
  resultado: null,     // último resultado de Engine
  geo:       null,     // último resultado de Geometry
  cicloTipo: 'Otto',   // 'Otto' | 'Diesel' | 'Sabathé'
  logScale:  false,
  tabActiva: 'pv',     // 'pv' | 'ts' | 'param' | 'comp'
};

// ════════════════════════════════════════════════════════════════
//  LECTURA DE CONTROLES
// ════════════════════════════════════════════════════════════════

const leerEntradas = () => ({
  h_ft:       parseFloat(document.getElementById('inp-h').value),
  Pef_hp:     parseFloat(document.getElementById('inp-pef').value),
  r:          parseFloat(document.getElementById('inp-r').value),
  phi:        parseFloat(document.getElementById('inp-phi').value),
  k:          parseFloat(document.getElementById('inp-k').value),
  combustible: document.getElementById('inp-comb').value,
  ciclo:      document.getElementById('inp-ciclo').value,
  alpha:      parseFloat(document.getElementById('inp-alpha').value || '0.5'),
  N_cil:      parseInt(document.getElementById('inp-ncil').value),
  eta_mec:    parseFloat(document.getElementById('inp-etamec').value),
  n_rpm:      parseFloat(document.getElementById('inp-rpm').value),
});

// ════════════════════════════════════════════════════════════════
//  VALIDACIÓN DE ENTRADAS
// ════════════════════════════════════════════════════════════════

const validarUI = (e) => {
  const errs = [];
  if (isNaN(e.h_ft)    || e.h_ft    < 0)           errs.push('Altitud debe ser ≥ 0 ft');
  if (isNaN(e.Pef_hp)  || e.Pef_hp  <= 0)          errs.push('Potencia efectiva debe ser > 0 HP');
  if (isNaN(e.r)       || e.r       <= 1)           errs.push('Relación de compresión r debe ser > 1');
  if (isNaN(e.phi)     || e.phi < 0.5 || e.phi > 1.5) errs.push('Mezcla relativa ϕ debe estar en [0,5 – 1,5]');
  if (isNaN(e.k)       || e.k < 1.3 || e.k > 1.45) errs.push('k debe estar en [1,30 – 1,45]');
  if (isNaN(e.N_cil)   || e.N_cil   < 1)           errs.push('N° cilindros debe ser ≥ 1');
  if (isNaN(e.eta_mec) || e.eta_mec <= 0 || e.eta_mec > 1) errs.push('η_mec debe estar en (0 – 1]');
  if (isNaN(e.n_rpm)   || e.n_rpm   <= 0)           errs.push('RPM debe ser > 0');
  if (e.ciclo === 'Sabathé' && (isNaN(e.alpha) || e.alpha <= 0 || e.alpha >= 1))
    errs.push('Fracción α para Sabathé debe estar en (0 – 1)');
  return errs;
};

// ════════════════════════════════════════════════════════════════
//  CÁLCULO PRINCIPAL
// ════════════════════════════════════════════════════════════════

const calcular = () => {
  ocultarAlertas();
  const e = leerEntradas();

  const errs = validarUI(e);
  if (errs.length) { mostrarError(errs); return; }

  try {
    // 1. ISA
    const { T1, p1 } = Engine.calcISA(e.h_ft);

    // 2. Qin
    const { Qin } = Engine.calcQin(e.combustible, e.phi);

    // 3. Ciclo
    let resultado;
    if      (e.ciclo === 'Otto')    resultado = Engine.calcularCicloOtto   (T1, p1, e.r, Qin, Engine.R, e.k);
    else if (e.ciclo === 'Diesel')  resultado = Engine.calcularCicloDiesel (T1, p1, e.r, Qin, Engine.R, e.k);
    else                            resultado = Engine.calcularCicloSabathe(T1, p1, e.r, Qin, e.alpha, Engine.R, e.k);

    // 4. Geometría
    const geo = Geometry.calcGeometria(resultado, e.Pef_hp, e.n_rpm, e.eta_mec, e.N_cil);

    // 5. Guardar estado y renderizar
    appState.resultado = resultado;
    appState.geo       = geo;
    appState.cicloTipo = e.ciclo;

    renderTablaEstados(resultado, e.k);
    renderTarjetas(resultado, geo, T1, p1, e.h_ft, Qin);
    renderGraficos(resultado, e.k);
    verificarAlertas(resultado);

    // Verificación interna de balance energético
    const etaDiff = Math.abs(resultado.eta - resultado.Wneto / resultado.Qin);
    if (etaDiff > 1e-6) console.warn(`[engine] ALERTA: |η_analítica − η_energía| = ${etaDiff.toExponential(2)}`);

  } catch (err) {
    mostrarError([`Error de cálculo: ${err.message}`]);
  }
};

// ════════════════════════════════════════════════════════════════
//  RENDER — TABLA DE ESTADOS
// ════════════════════════════════════════════════════════════════

const renderTablaEstados = (res, k) => {
  const tbody = document.getElementById('tabla-estados');
  const labels = res.tipo === 'Sabathé'
    ? ['1  (BDC ini)', '2  (TDC)', '3  (fin isoc.)', '4  (fin isobár.)', '5  (BDC fin)']
    : ['1  (BDC)', '2  (TDC)', '3  (fin comb.)', '4  (BDC)'];

  tbody.innerHTML = res.estados.map((s, i) => {
    const Tmax = res.estados.reduce((m, x) => Math.max(m, x.T), 0);
    const alertT = s.T >= ALERT_TMAX ? 'class="alerta-T"' : '';
    const alertP = s.p >= ALERT_PMAX ? 'class="alerta-P"' : '';
    return `<tr>
      <td>${labels[i] ?? i + 1}</td>
      <td ${alertT}>${s.T.toFixed(2)}</td>
      <td ${alertP}>${(s.p / 1e5).toFixed(4)}</td>
      <td>${(s.v * 1000).toFixed(5)}</td>
    </tr>`;
  }).join('');
};

// ════════════════════════════════════════════════════════════════
//  RENDER — TARJETAS DE RESULTADOS
// ════════════════════════════════════════════════════════════════

const renderTarjetas = (res, geo, T1, p1, h_ft, Qin) => {
  const fmt = (v, d = 2) => isFinite(v) ? v.toFixed(d) : '—';

  // Condiciones ambientales
  document.getElementById('out-T1').textContent  = `${fmt(T1, 2)} K`;
  document.getElementById('out-p1').textContent  = `${fmt(p1 / 1e5, 4)} bar`;
  document.getElementById('out-h').textContent   = `${fmt(h_ft, 0)} ft`;

  // Resultados del ciclo
  document.getElementById('out-eta').textContent  = `${fmt(res.eta * 100, 2)} %`;
  document.getElementById('out-Wneto').textContent = `${fmt(res.Wneto / 1000, 2)} kJ/kg`;
  document.getElementById('out-PME').textContent   = `${fmt(res.PME / 1e5, 3)} bar`;
  document.getElementById('out-Qin').textContent   = `${fmt(res.Qin  / 1000, 1)} kJ/kg`;
  document.getElementById('out-Qout').textContent  = `${fmt(res.Qout / 1000, 2)} kJ/kg`;
  document.getElementById('out-Tmax').textContent  = `${fmt(Math.max(...res.estados.map(s => s.T)), 1)} K`;
  document.getElementById('out-Pmax').textContent  = `${fmt(Math.max(...res.estados.map(s => s.p)) / 1e5, 2)} bar`;

  // Relaciones características
  if (res.rc !== undefined) document.getElementById('out-rc').textContent = fmt(res.rc, 4);
  if (res.rp !== undefined) document.getElementById('out-rp').textContent = fmt(res.rp, 4);

  // Geometría
  document.getElementById('out-Vd').textContent    = `${fmt(geo.Vd_total_cm3, 1)} cm³`;
  document.getElementById('out-Vdcil').textContent  = `${fmt(geo.Vd_cil_cm3,   1)} cm³`;
  document.getElementById('out-D').textContent      = `${fmt(geo.D_mm, 2)} mm`;
  document.getElementById('out-S').textContent      = `${fmt(geo.S_mm, 2)} mm`;
  document.getElementById('out-Vcc').textContent    = `${fmt(geo.Vcc_cm3, 2)} cm³`;

  // Comparación con C-75
  document.getElementById('out-c75-D').textContent    = `${fmt(geo.ref_C75.D_mm, 1)} mm`;
  document.getElementById('out-c75-S').textContent    = `${fmt(geo.ref_C75.S_mm, 1)} mm`;
  document.getElementById('out-c75-Vd').textContent   = `${fmt(geo.ref_C75.Vd_cil_cm3, 1)} cm³`;
};

// ════════════════════════════════════════════════════════════════
//  RENDER — GRÁFICOS
// ════════════════════════════════════════════════════════════════

const renderGraficos = (resultado, k) => {
  Charts.plotPV('graf-pv', resultado, k, appState.logScale);
  Charts.plotTS('graf-ts', resultado, k);
  renderAnalisis(resultado, k);
};

const renderAnalisis = (resultado, k) => {
  const { T1, p1, Qin } = extraerCondiciones(resultado);
  const rango = Array.from({ length: 141 }, (_, i) => 2 + i * 0.1);  // 2.0 … 16.0

  const ciclos = ['Otto', 'Diesel', 'Sabathé'];
  const curvasList = ciclos.map(tipo => {
    const c = Engine.calcParametrico(tipo, T1, p1, Qin, rango, resultado.alpha ?? 0.5, k);
    return { tipo, ...c };
  });

  Charts.plotParametrico('graf-param', curvasList);
  Charts.plotTmax('graf-tmax', curvasList);

  // Comparación p-v: calcular los 3 ciclos con el mismo r actual
  const r = resultado.r;
  const comp = [];
  try { comp.push(Engine.calcularCicloOtto   (T1, p1, r, Qin, Engine.R, k)); } catch(_) {}
  try { comp.push(Engine.calcularCicloDiesel (T1, p1, r, Qin, Engine.R, k)); } catch(_) {}
  try { comp.push(Engine.calcularCicloSabathe(T1, p1, r, Qin, resultado.alpha ?? 0.5, Engine.R, k)); } catch(_) {}
  Charts.plotComparacion('graf-comp', comp, k);
};

/** Extrae T1, p1, Qin del estado 1 del resultado actual */
const extraerCondiciones = (res) => ({
  T1:  res.estados[0].T,
  p1:  res.estados[0].p,
  Qin: res.Qin,
});

// ════════════════════════════════════════════════════════════════
//  ALERTAS
// ════════════════════════════════════════════════════════════════

const verificarAlertas = (res) => {
  const Tmax = Math.max(...res.estados.map(s => s.T));
  const Pmax = Math.max(...res.estados.map(s => s.p));

  if (Tmax >= ALERT_TMAX) mostrarAlerta('alert-T',
    `⚠️  T_max = ${Tmax.toFixed(0)} K — supera ${ALERT_TMAX} K. En un motor real los materiales de la cámara fallarían. El modelo ideal no tiene este límite, pero el diseño requiere revisión.`);

  if (Pmax >= ALERT_PMAX) mostrarAlerta('alert-P',
    `⚠️  p_max = ${(Pmax/1e5).toFixed(1)} bar — supera 100 bar. Verificar resistencia estructural del bloque y culata.`);
};

const mostrarAlerta = (id, msg) => {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.style.display = 'block'; }
};

const mostrarError = (msgs) => {
  const el = document.getElementById('alert-error');
  if (el) { el.innerHTML = msgs.map(m => `• ${m}`).join('<br>'); el.style.display = 'block'; }
};

const ocultarAlertas = () => {
  ['alert-T', 'alert-P', 'alert-error'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
};

// ════════════════════════════════════════════════════════════════
//  EVENTOS
// ════════════════════════════════════════════════════════════════

const inicializar = () => {
  // Botón calcular
  document.getElementById('btn-calcular')?.addEventListener('click', calcular);

  // Slider r → input sincronizado
  const sliderR = document.getElementById('slider-r');
  const inputR  = document.getElementById('inp-r');
  sliderR?.addEventListener('input', () => {
    inputR.value = sliderR.value;
    if (appState.resultado) calcular();  // actualización en tiempo real
  });
  inputR?.addEventListener('input', () => {
    if (sliderR) sliderR.value = inputR.value;
  });

  // Selector de ciclo → mostrar/ocultar campo alpha (solo Sabathé)
  const selCiclo  = document.getElementById('inp-ciclo');
  const rowAlpha  = document.getElementById('row-alpha');
  const rowRC     = document.getElementById('row-rc');
  const rowRP     = document.getElementById('row-rp');
  selCiclo?.addEventListener('change', () => {
    const esSabathe = selCiclo.value === 'Sabathé';
    if (rowAlpha) rowAlpha.style.display = esSabathe ? '' : 'none';
    appState.cicloTipo = selCiclo.value;
  });

  // Toggle escala logarítmica p-v
  document.getElementById('toggle-log')?.addEventListener('change', (e) => {
    appState.logScale = e.target.checked;
    if (appState.resultado)
      Charts.plotPV('graf-pv', appState.resultado, parseFloat(document.getElementById('inp-k').value), appState.logScale);
  });

  // Pestañas de gráficos
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab)?.classList.add('active');
      appState.tabActiva = btn.dataset.tab;
      // Forzar redraw de Plotly al cambiar de pestaña
      if (appState.resultado) {
        const k = parseFloat(document.getElementById('inp-k').value);
        if (btn.dataset.tab === 'tab-pv')    Charts.plotPV('graf-pv', appState.resultado, k, appState.logScale);
        if (btn.dataset.tab === 'tab-ts')    Charts.plotTS('graf-ts', appState.resultado, k);
        if (btn.dataset.tab === 'tab-param') renderAnalisis(appState.resultado, k);
        if (btn.dataset.tab === 'tab-comp')  renderAnalisis(appState.resultado, k);
      }
    });
  });

  // Calcular automáticamente con valores por defecto al cargar
  calcular();
};

// Esperar a que el DOM esté listo
document.addEventListener('DOMContentLoaded', inicializar);
