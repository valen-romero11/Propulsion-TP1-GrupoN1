/**
 * ============================================================
 *  charts.js — Visualización con Plotly.js
 *  UTN Haedo · Predimensionamiento de Motores Aeronáuticos
 * ============================================================
 *
 *  Genera:
 *    · Diagrama p-v (escala lineal o log)
 *    · Diagrama T-s
 *    · Curvas paramétricas η / PME / T_max  vs. r
 *    · Comparación de los 3 ciclos en p-v superpuesto
 *
 *  Convención de colores por ciclo:
 *    Otto    → #FF0066  (fucsia — color del TP)
 *    Diesel  → #1F78B4  (azul técnico)
 *    Sabathé → #33A02C  (verde)
 * ============================================================
 */

'use strict';

// ════════════════════════════════════════════════════════════════
//  PALETA
// ════════════════════════════════════════════════════════════════

const COLORES = {
  Otto:    '#FF0066',
  Diesel:  '#1F78B4',
  Sabathé: '#33A02C',
};

const FONT_PLOTLY = 'Aptos, Segoe UI, sans-serif';

const layoutBase = (titulo, xLabel, yLabel, logX = false, logY = false) => ({
  title:  { text: titulo, font: { family: FONT_PLOTLY, size: 15 }, x: 0.05 },
  xaxis:  { title: xLabel, type: logX ? 'log' : 'linear', gridcolor: '#e8e8e8', tickfont: { family: FONT_PLOTLY } },
  yaxis:  { title: yLabel, type: logY ? 'log' : 'linear', gridcolor: '#e8e8e8', tickfont: { family: FONT_PLOTLY } },
  font:   { family: FONT_PLOTLY },
  plot_bgcolor:  '#fafafa',
  paper_bgcolor: 'rgba(0,0,0,0)',
  margin: { t: 50, r: 20, b: 50, l: 65 },
  legend: { font: { family: FONT_PLOTLY }, bgcolor: 'rgba(255,255,255,0.85)' },
  hovermode: 'closest',
});

const configBase = { responsive: true, displayModeBar: true, displaylogo: false,
  modeBarButtonsToRemove: ['lasso2d', 'select2d'] };

// ════════════════════════════════════════════════════════════════
//  HELPERS — GENERACIÓN DE CURVAS
// ════════════════════════════════════════════════════════════════

/**
 * Genera N+1 puntos de la curva isentrópica en el diagrama p-v.
 *   p = pA · (vA/v)^k  ,  T = TA · (vA/v)^(k−1)
 * Para el diagrama T-s esta función NO se usa directamente:
 * los isentrópicos son líneas verticales (s = constante).
 */
const curvaIsentropica_pv = (sA, sB, k, N = 60) => {
  const vs = [], ps = [], Ts = [];
  for (let i = 0; i <= N; i++) {
    const v = sA.v + (sB.v - sA.v) * (i / N);
    vs.push(v);
    ps.push(sA.p * Math.pow(sA.v / v, k));
    Ts.push(sA.T * Math.pow(sA.v / v, k - 1));
  }
  return { v: vs, p: ps, T: Ts };
};

/**
 * Genera N+1 puntos del proceso isocórico para p-v y T-s.
 *
 *  p-v:  línea vertical  v = cte
 *  T-s:  Δs = cv · ln(T / T_A)    →  s_abs = s_A + cv·ln(T/T_A)
 *
 * @param {object} sA   - Estado inicial  {T, p, v}
 * @param {object} sB   - Estado final    {T, p, v}
 * @param {number} cv   - Calor específico a v=cte  [J/(kg·K)]
 * @param {number} s_A  - Entropía específica absoluta del estado A  [J/(kg·K)]
 * @param {number} N    - Número de intervalos
 */
const curvaIsocórica = (sA, sB, cv, s_A, N = 80) => {
  const vs = [], ps = [], Ts = [], ss = [];
  for (let i = 0; i <= N; i++) {
    // Interpolación lineal en T para suavidad visual
    const T = sA.T + (sB.T - sA.T) * (i / N);
    vs.push(sA.v);
    ps.push(sA.p * (T / sA.T));               // Gay-Lussac: p/T = cte (v=cte)
    Ts.push(T);
    ss.push(s_A + cv * Math.log(T / sA.T));   // Δs = cv·ln(T_f/T_i)
  }
  return { v: vs, p: ps, T: Ts, s: ss };
};

/**
 * Genera N+1 puntos del proceso isobárico para p-v y T-s.
 *
 *  p-v:  línea horizontal  p = cte
 *  T-s:  Δs = cp · ln(T / T_A)    →  s_abs = s_A + cp·ln(T/T_A)
 */
const curvaIsobárica = (sA, sB, cp, s_A, N = 80) => {
  const vs = [], ps = [], Ts = [], ss = [];
  for (let i = 0; i <= N; i++) {
    const T = sA.T + (sB.T - sA.T) * (i / N);
    vs.push(sA.v * (T / sA.T));               // Charles: v/T = cte (p=cte)
    ps.push(sA.p);
    Ts.push(T);
    ss.push(s_A + cp * Math.log(T / sA.T));   // Δs = cp·ln(T_f/T_i)
  }
  return { v: vs, p: ps, T: Ts, s: ss };
};

/**
 * Genera N+1 puntos del proceso isentrópico para el diagrama T-s.
 *
 *  LÍNEA VERTICAL: s = constante = s_A
 *  T varía linealmente de T_A a T_B (solo para trazar la línea vertical
 *  en el diagrama T-s — físicamente s no cambia).
 *
 * @param {number} T_A  - Temperatura inicial [K]
 * @param {number} T_B  - Temperatura final   [K]
 * @param {number} s_A  - Entropía específica absoluta (cte.) [J/(kg·K)]
 * @param {number} N    - Número de intervalos
 */
const curvaIsentropica_ts = (T_A, T_B, s_A, N = 2) => {
  // Solo 2 puntos son suficientes para una línea vertical exacta;
  // usamos N=2 para no contaminar el array con puntos redundantes.
  const Ts = [], ss = [];
  for (let i = 0; i <= N; i++) {
    Ts.push(T_A + (T_B - T_A) * (i / N));
    ss.push(s_A);   // s = constante — línea VERTICAL en T-s
  }
  return { T: Ts, s: ss };
};

// ════════════════════════════════════════════════════════════════
//  CÁLCULO DE ENTROPÍAS ABSOLUTAS EN LOS ESTADOS (referencia s₁=0)
// ════════════════════════════════════════════════════════════════

/**
 * Calcula el valor de entropía específica absoluta en cada estado
 * del ciclo, tomando s₁ = 0 como referencia.
 *
 * Reglas:
 *   Isentrópico  1→2  →  s₂ = s₁ = 0
 *   Isocórico    2→3  →  s₃ = s₂ + cv·ln(T₃/T₂)
 *   Isentrópico  3→4  →  s₄ = s₃
 *   Isocórico    4→1  →  Δs = cv·ln(T₁/T₄) debe volver a s₁=0  ✓
 *
 * @param {object}   resultado  - Salida de calcularCiclo*()
 * @returns {number[]}          - Array de s absoluta por estado [J/(kg·K)]
 */
const calcEntropia = (resultado) => {
  const { estados, cv, cp, tipo } = resultado;
  const s = new Array(estados.length).fill(0);  // s[0] = 0 (referencia)

  if (tipo === 'Otto') {
    // 1→2 isentrópico:   s[1] = s[0]
    s[1] = s[0];
    // 2→3 isocórico:     s[2] = s[1] + cv·ln(T3/T2)
    s[2] = s[1] + cv * Math.log(estados[2].T / estados[1].T);
    // 3→4 isentrópico:   s[3] = s[2]
    s[3] = s[2];
    // Verificación cierre: s[0] debe ≈ s[3] + cv·ln(T1/T4)
    // (no se fuerza, se deja que el ciclo se cierre visualmente)

  } else if (tipo === 'Diesel') {
    // 1→2 isentrópico
    s[1] = s[0];
    // 2→3 isobárico:     s[2] = s[1] + cp·ln(T3/T2)
    s[2] = s[1] + cp * Math.log(estados[2].T / estados[1].T);
    // 3→4 isentrópico
    s[3] = s[2];
    // 4→1 isocórico:  cierre garantizado por termodinámica

  } else if (tipo === 'Sabathé') {
    // 1→2 isentrópico
    s[1] = s[0];
    // 2→3 isocórico
    s[2] = s[1] + cv * Math.log(estados[2].T / estados[1].T);
    // 3→4 isobárico
    s[3] = s[2] + cp * Math.log(estados[3].T / estados[2].T);
    // 4→5 isentrópico
    s[4] = s[3];
  }

  return s;
};

// ════════════════════════════════════════════════════════════════
//  CONSTRUCCIÓN DE TRAZAS p-v y T-s
// ════════════════════════════════════════════════════════════════

/**
 * Construye los arrays de puntos del ciclo para Plotly.
 *
 * Diagrama p-v:
 *   · Isentrópicos: curva hiperbólica (puntos intermedios)
 *   · Isocóricos:   línea vertical
 *   · Isobáricos:   línea horizontal
 *
 * Diagrama T-s:
 *   · Isentrópicos: línea VERTICAL  (s = constante)
 *   · Isocóricos:   curva T vs s_A + cv·ln(T/T_A)  →  exponencial en T-s
 *   · Isobáricos:   curva T vs s_A + cp·ln(T/T_A)  →  exponencial más tendida
 *
 * @param {object} resultado - Salida de calcularCiclo*()
 * @param {number} k         - Exponente isentrópico [-]
 * @returns {{ pv: {v, p}, ts: {T, s} }}
 */
const buildCicloTrace = (resultado, k) => {
  const st  = resultado.estados;
  const cv  = resultado.cv;
  const cp  = resultado.cp;
  const s   = calcEntropia(resultado);   // entropías absolutas por estado

  // Acumuladores finales
  const pv_v = [], pv_p = [];
  const ts_T = [], ts_s = [];

  /**
   * Añade un segmento a los acumuladores.
   * Para p-v usa seg.v y seg.p; para T-s usa seg.T y seg.s.
   * El último punto de cada segmento se omite para no duplicar
   * el punto de inicio del siguiente (excepto al cerrar el ciclo).
   */
  const addSeg = (seg, isLast = false) => {
    const len = isLast ? seg.v.length : seg.v.length - 1;
    for (let i = 0; i < len; i++) {
      pv_v.push(seg.v[i]);
      pv_p.push(seg.p[i]);
      ts_T.push(seg.T[i]);
      ts_s.push(seg.s[i]);
    }
  };

  /**
   * Crea un segmento unificado (p-v + T-s) para procesos isentrópicos.
   * p-v: curva hiperbólica exacta.
   * T-s: línea vertical (s = s_A = constante).
   */
  const segIsen = (iA, iB) => {
    const pv = curvaIsentropica_pv(st[iA], st[iB], k, 60);
    const ts = curvaIsentropica_ts(st[iA].T, st[iB].T, s[iA], 2);
    // Unificar en un único objeto (misma longitud usando pv como base)
    // Para T-s interpolamos s=cte sobre los mismos N puntos de pv
    return {
      v: pv.v,
      p: pv.p,
      T: pv.T,
      s: Array(pv.v.length).fill(s[iA]),  // s = constante
    };
  };

  /**
   * Crea un segmento unificado para procesos isocóricos.
   */
  const segIsoc = (iA, iB) => curvaIsocórica(st[iA], st[iB], cv, s[iA], 80);

  /**
   * Crea un segmento unificado para procesos isobáricos.
   */
  const segIsob = (iA, iB) => curvaIsobárica(st[iA], st[iB], cp, s[iA], 80);

  if (resultado.tipo === 'Otto') {
    // 1→2 isentrópico  |  2→3 isocórico  |  3→4 isentrópico  |  4→1 isocórico
    addSeg(segIsen(0, 1));
    addSeg(segIsoc(1, 2));
    addSeg(segIsen(2, 3));
    addSeg(segIsoc(3, 0), true);  // último: incluir punto final para cerrar

  } else if (resultado.tipo === 'Diesel') {
    // 1→2 isentrópico  |  2→3 isobárico  |  3→4 isentrópico  |  4→1 isocórico
    addSeg(segIsen(0, 1));
    addSeg(segIsob(1, 2));
    addSeg(segIsen(2, 3));
    addSeg(segIsoc(3, 0), true);

  } else if (resultado.tipo === 'Sabathé') {
    // 1→2 isen  |  2→3 isoc  |  3→4 isob  |  4→5 isen  |  5→1 isoc
    addSeg(segIsen(0, 1));
    addSeg(segIsoc(1, 2));
    addSeg(segIsob(2, 3));
    addSeg(segIsen(3, 4));
    addSeg(segIsoc(4, 0), true);
  }

  // Cerrar explícitamente volviendo al estado 1
  pv_v.push(pv_v[0]); pv_p.push(pv_p[0]);
  ts_T.push(ts_T[0]); ts_s.push(ts_s[0]);

  return {
    pv: { v: pv_v, p: pv_p },
    ts: { T: ts_T, s: ts_s },
  };
};

// ════════════════════════════════════════════════════════════════
//  DIAGRAMA p-v
// ════════════════════════════════════════════════════════════════

/**
 * Renderiza el diagrama p-v en el elemento con id dado.
 *
 * @param {string}  divId     - ID del div contenedor
 * @param {object}  resultado - Salida de calcularCiclo*()
 * @param {number}  k         - Exponente isentrópico
 * @param {boolean} logScale  - Escala logarítmica en ambos ejes
 */
const plotPV = (divId, resultado, k = 1.4, logScale = false) => {
  const { pv } = buildCicloTrace(resultado, k);
  const color = COLORES[resultado.tipo] || '#FF0066';

  const pMPa = pv.p.map(p => p / 1e6);
  const vLit = pv.v.map(v => v * 1000);

  // Traza de área rellena (trabajo neto)
  const areaTrace = {
    x: vLit, y: pMPa,
    fill: 'toself',
    fillcolor: color + '22',  // muy transparente
    line: { color: 'transparent' },
    hoverinfo: 'skip',
    showlegend: false,
    type: 'scatter',
  };

  // Traza del ciclo
  const cicloTrace = {
    x: vLit, y: pMPa,
    mode: 'lines',
    line: { color, width: 2.5 },
    name: `Ciclo ${resultado.tipo}`,
    type: 'scatter',
    hovertemplate: 'v = %{x:.4f} L/kg<br>p = %{y:.3f} MPa<extra></extra>',
  };

  // Marcadores de estados
  const estados = resultado.estados;
  const stTrace = {
    x: estados.map(s => s.v * 1000),
    y: estados.map(s => s.p / 1e6),
    mode: 'markers+text',
    marker: { color, size: 9, symbol: 'circle', line: { color: '#fff', width: 1.5 } },
    text: estados.map((_, i) => `  ${i + 1}`),
    textfont: { family: FONT_PLOTLY, size: 12, color: '#333' },
    textposition: 'top right',
    name: 'Estados',
    type: 'scatter',
    hovertemplate: 'Estado %{text}<br>v=%{x:.4f} L/kg<br>p=%{y:.3f} MPa<extra></extra>',
  };

  const layout = layoutBase(
    `Diagrama p-v — Ciclo ${resultado.tipo}`,
    'v  [L/kg]', 'p  [MPa]', logScale, logScale
  );

  // Anotaciones: η y PME
  layout.annotations = [{
    xref: 'paper', yref: 'paper', x: 0.98, y: 0.98,
    xanchor: 'right', yanchor: 'top',
    text: `η = ${(resultado.eta * 100).toFixed(2)} %<br>PME = ${(resultado.PME / 1e5).toFixed(3)} bar`,
    showarrow: false,
    bgcolor: 'rgba(255,255,255,0.85)',
    bordercolor: color, borderwidth: 1,
    font: { family: FONT_PLOTLY, size: 12 },
  }];

  Plotly.react(divId, [areaTrace, cicloTrace, stTrace], layout, configBase);
};

// ════════════════════════════════════════════════════════════════
//  DIAGRAMA T-s
// ════════════════════════════════════════════════════════════════

/**
 * Renderiza el diagrama T-s.
 * La escala de entropía es relativa (s=0 en estado 1).
 *
 * @param {string}  divId
 * @param {object}  resultado
 * @param {number}  k
 */
const plotTS = (divId, resultado, k = 1.4) => {
  const { ts } = buildCicloTrace(resultado, k);
  const color = COLORES[resultado.tipo] || '#FF0066';

  // Área rellena (representa el trabajo neto del ciclo)
  const areaTrace = {
    x: ts.s, y: ts.T,
    fill: 'toself',
    fillcolor: color + '22',
    line: { color: 'transparent' },
    hoverinfo: 'skip', showlegend: false, type: 'scatter',
  };

  const cicloTrace = {
    x: ts.s, y: ts.T,
    mode: 'lines',
    line: { color, width: 2.5 },
    name: `Ciclo ${resultado.tipo}`,
    type: 'scatter',
    hovertemplate: 's = %{x:.1f} J/(kg·K)<br>T = %{y:.1f} K<extra></extra>',
  };

  // Marcadores de estados — usar calcEntropia() que es la misma fuente
  // de verdad que usa buildCicloTrace, garantizando consistencia exacta.
  const estados = resultado.estados;
  const sEstados = calcEntropia(resultado);   // s absoluta por estado [J/(kg·K)]

  const stTrace = {
    x: sEstados,
    y: estados.map(s => s.T),
    mode: 'markers+text',
    marker: { color, size: 9, symbol: 'circle', line: { color: '#fff', width: 1.5 } },
    text: estados.map((_, i) => `  ${i + 1}`),
    textfont: { family: FONT_PLOTLY, size: 12, color: '#333' },
    textposition: 'top right',
    name: 'Estados',
    type: 'scatter',
    hovertemplate: 'Estado %{text}<br>s = %{x:.1f} J/(kg·K)<br>T = %{y:.1f} K<extra></extra>',
  };

  const layout = layoutBase(
    `Diagrama T-s — Ciclo ${resultado.tipo}`,
    'Entropía específica  s  [J/(kg·K)]',
    'Temperatura  T  [K]'
  );

  // Líneas de referencia T_max y T1
  layout.shapes = [
    { type: 'line', xref: 'paper', x0: 0, x1: 1,
      yref: 'y', y0: estados[0].T, y1: estados[0].T,
      line: { color: '#aaa', width: 1, dash: 'dot' } },
  ];
  layout.annotations = [{
    xref: 'paper', yref: 'paper', x: 0.98, y: 0.98,
    xanchor: 'right', yanchor: 'top',
    text: `T₁ = ${estados[0].T.toFixed(1)} K<br>T_max = ${Math.max(...estados.map(s=>s.T)).toFixed(1)} K`,
    showarrow: false,
    bgcolor: 'rgba(255,255,255,0.85)',
    bordercolor: color, borderwidth: 1,
    font: { family: FONT_PLOTLY, size: 12 },
  }];

  Plotly.react(divId, [areaTrace, cicloTrace, stTrace], layout, configBase);
};

// ════════════════════════════════════════════════════════════════
//  CURVAS PARAMÉTRICAS
// ════════════════════════════════════════════════════════════════

/**
 * Grafica curvas η, PME y T_max vs. r para uno o más ciclos.
 *
 * @param {string}   divId
 * @param {object[]} curvasList  - Resultados de calcParametrico() con {tipo, ...curvas}
 */
const plotParametrico = (divId, curvasList) => {
  const trazas = curvasList.flatMap(cur => {
    const color = COLORES[cur.tipo] || '#888';
    return [
      { x: cur.r, y: cur.eta,  name: `${cur.tipo} η`,    line: { color, width: 2 },          type: 'scatter', mode: 'lines', yaxis: 'y'  },
      { x: cur.r, y: cur.PME,  name: `${cur.tipo} PME`,  line: { color, width: 2, dash:'dash' }, type: 'scatter', mode: 'lines', yaxis: 'y2' },
    ];
  });

  const layout = {
    title: { text: 'Análisis Paramétrico — η y PME vs. r', font: { family: FONT_PLOTLY, size: 15 } },
    xaxis:  { title: 'Relación de compresión r  [-]', gridcolor: '#e8e8e8', tickfont: { family: FONT_PLOTLY } },
    yaxis:  { title: 'η  [%]',   gridcolor: '#e8e8e8', tickfont: { family: FONT_PLOTLY } },
    yaxis2: { title: 'PME  [bar]', overlaying: 'y', side: 'right', tickfont: { family: FONT_PLOTLY }, gridcolor: 'transparent' },
    font:   { family: FONT_PLOTLY },
    plot_bgcolor: '#fafafa', paper_bgcolor: 'rgba(0,0,0,0)',
    margin: { t: 50, r: 70, b: 50, l: 60 },
    legend: { font: { family: FONT_PLOTLY }, bgcolor: 'rgba(255,255,255,0.85)' },
    hovermode: 'x unified',
  };

  Plotly.react(divId, trazas, layout, configBase);
};

/**
 * Grafica T_max vs. r para uno o más ciclos.
 */
const plotTmax = (divId, curvasList) => {
  const trazas = curvasList.map(cur => ({
    x: cur.r, y: cur.Tmax,
    name: `${cur.tipo}`,
    line: { color: COLORES[cur.tipo] || '#888', width: 2 },
    type: 'scatter', mode: 'lines',
    hovertemplate: 'r = %{x:.1f}<br>T_max = %{y:.0f} K<extra>' + cur.tipo + '</extra>',
  }));

  // Línea de alerta T_max = 4800 K
  trazas.push({
    x: [curvasList[0]?.r[0], curvasList[0]?.r.at(-1)],
    y: [4800, 4800],
    name: 'Límite T_max = 4800 K',
    line: { color: '#e74c3c', width: 1.5, dash: 'dot' },
    type: 'scatter', mode: 'lines',
    hoverinfo: 'skip',
  });

  const layout = layoutBase('T_max vs. r', 'Relación de compresión r  [-]', 'T_max  [K]');
  layout.hovermode = 'x unified';

  Plotly.react(divId, trazas, layout, configBase);
};

// ════════════════════════════════════════════════════════════════
//  COMPARACIÓN DE CICLOS (p-v superpuesto)
// ════════════════════════════════════════════════════════════════

/**
 * Superpone los diagramas p-v de los tres ciclos en un solo gráfico.
 *
 * @param {string}   divId
 * @param {object[]} resultados  - [resCicloOtto, resCicloDiesel, resCicloSabathe]
 * @param {number}   k
 */
const plotComparacion = (divId, resultados, k = 1.4) => {
  const trazas = [];

  for (const res of resultados) {
    const { pv } = buildCicloTrace(res, k);
    const color = COLORES[res.tipo] || '#888';
    trazas.push({
      x: pv.v.map(v => v * 1000),
      y: pv.p.map(p => p / 1e6),
      mode: 'lines',
      name: `Ciclo ${res.tipo}  (η=${(res.eta*100).toFixed(1)}%)`,
      line: { color, width: 2.5 },
      type: 'scatter',
      hovertemplate: `[${res.tipo}] v=%{x:.4f} L/kg  p=%{y:.3f} MPa<extra></extra>`,
    });
  }

  const layout = layoutBase('Comparación de Ciclos — Diagrama p-v', 'v  [L/kg]', 'p  [MPa]');
  layout.hovermode = 'closest';

  Plotly.react(divId, trazas, layout, configBase);
};

// ════════════════════════════════════════════════════════════════
//  EXPORTACIÓN (browser global)
// ════════════════════════════════════════════════════════════════

window.Charts = {
  plotPV,
  plotTS,
  plotParametrico,
  plotTmax,
  plotComparacion,
  COLORES,
};
