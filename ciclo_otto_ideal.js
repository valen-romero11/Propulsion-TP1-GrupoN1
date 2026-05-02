/**
 * ============================================================
 *  CICLO OTTO IDEAL — AIRE ESTÁNDAR FRÍO
 *  UTN Haedo · Predimensionamiento de Motores Aeronáuticos
 * ============================================================
 *
 *  Referencia bibliográfica:
 *    Çengel & Boles, "Termodinámica", 8ª ed., cap. 9.
 *    Heywood, "Internal Combustion Engine Fundamentals", cap. 2.
 *
 *  Numeración de estados:
 *    1 → 2 : Compresión isentrópica
 *    2 → 3 : Adición de calor isocórica  (combustión)
 *    3 → 4 : Expansión isentrópica
 *    4 → 1 : Rechazo de calor isocórico  (escape)
 *
 *  Hipótesis del modelo:
 *    · Gas ideal de composición constante (aire)
 *    · Calores específicos constantes (cold air-standard)
 *    · Procesos internamente reversibles
 *    · Sin pérdidas mecánicas ni de bombeo
 * ============================================================
 */

'use strict';

// ──────────────────────────────────────────────────────────────
//  CONSTANTES TERMODINÁMICAS
// ──────────────────────────────────────────────────────────────

/**
 * Constante universal del gas (aire)
 * @type {number} R [J/(kg·K)]
 */
const R_AIRE = 287; // J/(kg·K)

/**
 * Exponente isentrópico del aire (cold air-standard)
 * @type {number} k = cp/cv [-]
 */
const K_AIRE = 1.4;

// ──────────────────────────────────────────────────────────────
//  FUNCIONES AUXILIARES PURAS
// ──────────────────────────────────────────────────────────────

/**
 * Calcula cp a partir de R y k.
 *   cp = k·R / (k - 1)                                [J/(kg·K)]
 *
 * @param {number} R  - Constante del gas     [J/(kg·K)]
 * @param {number} k  - Exponente isentrópico [-]
 * @returns {number}  cp [J/(kg·K)]
 */
const calcCp = (R, k) => (k * R) / (k - 1);

/**
 * Calcula cv a partir de R y k.
 *   cv = R / (k - 1)                                  [J/(kg·K)]
 *
 * @param {number} R  - Constante del gas     [J/(kg·K)]
 * @param {number} k  - Exponente isentrópico [-]
 * @returns {number}  cv [J/(kg·K)]
 */
const calcCv = (R, k) => R / (k - 1);

/**
 * Volumen específico por gas ideal.
 *   v = R·T / p                                       [m³/kg]
 *
 * @param {number} R  - Constante del gas [J/(kg·K)]
 * @param {number} T  - Temperatura       [K]
 * @param {number} p  - Presión           [Pa]
 * @returns {number}  v [m³/kg]
 */
const volumenEspecifico = (R, T, p) => (R * T) / p;

/**
 * Temperatura al final de un proceso isentrópico
 * entre dos volúmenes específicos.
 *
 *   T_b / T_a = (v_a / v_b)^(k-1)
 *   ⟹  T_b = T_a · (v_a / v_b)^(k-1)               [K]
 *
 * @param {number} Ta    - Temperatura inicial       [K]
 * @param {number} va    - Vol. específico inicial   [m³/kg]
 * @param {number} vb    - Vol. específico final     [m³/kg]
 * @param {number} k     - Exponente isentrópico     [-]
 * @returns {number}     Tb [K]
 */
const tempIsentropica = (Ta, va, vb, k) => Ta * Math.pow(va / vb, k - 1);

/**
 * Presión al final de un proceso isentrópico.
 *
 *   p_b / p_a = (v_a / v_b)^k
 *   ⟹  p_b = p_a · (v_a / v_b)^k                   [Pa]
 *
 * @param {number} pa    - Presión inicial           [Pa]
 * @param {number} va    - Vol. específico inicial   [m³/kg]
 * @param {number} vb    - Vol. específico final     [m³/kg]
 * @param {number} k     - Exponente isentrópico     [-]
 * @returns {number}     pb [Pa]
 */
const presionIsentropica = (pa, va, vb, k) => pa * Math.pow(va / vb, k);

/**
 * Rendimiento térmico teórico del ciclo Otto ideal.
 *
 *   η_Otto = 1 - 1 / r^(k-1)                        [-]
 *
 * @param {number} r  - Relación de compresión [-]
 * @param {number} k  - Exponente isentrópico  [-]
 * @returns {number}  η [-]  (entre 0 y 1)
 */
const rendimientoOtto = (r, k) => 1 - 1 / Math.pow(r, k - 1);

/**
 * Presión Media Efectiva (PME / IMEP) del ciclo Otto ideal.
 *
 *   PME = W_neto / (v1 - v2)                         [Pa]
 *       = W_neto / (v1 · (1 - 1/r))
 *
 * @param {number} Wneto - Trabajo neto    [J/kg]
 * @param {number} v1    - Vol. esp. TDC   [m³/kg]
 * @param {number} r     - Relación de compresión [-]
 * @returns {number}     PME [Pa]
 */
const presionMediaEfectiva = (Wneto, v1, r) =>
  Wneto / (v1 * (1 - 1 / r));

// ──────────────────────────────────────────────────────────────
//  FUNCIÓN PRINCIPAL: calcularCicloOtto
// ──────────────────────────────────────────────────────────────

/**
 * Calcula todos los estados y parámetros de desempeño
 * del ciclo Otto ideal de aire estándar frío.
 *
 * @param {number} T1    - Temperatura inicial           [K]
 * @param {number} p1    - Presión inicial               [Pa]
 * @param {number} r     - Relación de compresión        [-]
 * @param {number} qIn   - Calor aportado (isocórico)   [J/kg]
 * @param {number} [R=287]   - Cte. del gas              [J/(kg·K)]
 * @param {number} [k=1.4]   - Exp. isentrópico          [-]
 *
 * @returns {{
 *   estados: {
 *     estado1: {T: number, p: number, v: number},
 *     estado2: {T: number, p: number, v: number},
 *     estado3: {T: number, p: number, v: number},
 *     estado4: {T: number, p: number, v: number}
 *   },
 *   Wneto:  number,   // [J/kg]
 *   qOut:   number,   // [J/kg] calor rechazado (valor positivo)
 *   eta:    number,   // [-] rendimiento térmico
 *   PME:    number,   // [Pa] presión media efectiva
 *   cv:     number,   // [J/(kg·K)]
 *   cp:     number    // [J/(kg·K)]
 * }}
 */
const calcularCicloOtto = (T1, p1, r, qIn, R = R_AIRE, k = K_AIRE) => {

  // ── Validación de entradas ────────────────────────────────
  if (T1 <= 0)   throw new RangeError(`T1 debe ser > 0 K. Recibido: ${T1}`);
  if (p1 <= 0)   throw new RangeError(`p1 debe ser > 0 Pa. Recibido: ${p1}`);
  if (r  <= 1)   throw new RangeError(`r debe ser > 1. Recibido: ${r}`);
  if (qIn <= 0)  throw new RangeError(`qIn debe ser > 0 J/kg. Recibido: ${qIn}`);

  // ── Calores específicos ───────────────────────────────────
  const cv = calcCv(R, k);   // [J/(kg·K)]
  const cp = calcCp(R, k);   // [J/(kg·K)]

  // ══════════════════════════════════════════════════════════
  //  ESTADO 1: Inicio de carrera de compresión (BDC)
  //  Condición inicial conocida.
  // ══════════════════════════════════════════════════════════
  const v1 = volumenEspecifico(R, T1, p1);   // v1 = R·T1/p1  [m³/kg]

  const estado1 = { T: T1, p: p1, v: v1 };

  // ══════════════════════════════════════════════════════════
  //  ESTADO 2: Fin de compresión isentrópica (TDC)
  //  Proceso 1→2: isentrópico, v2 = v1/r
  // ══════════════════════════════════════════════════════════
  const v2 = v1 / r;   // relación de compresión: r = v1/v2

  //   T2 = T1 · r^(k-1)
  const T2 = tempIsentropica(T1, v1, v2, k);

  //   p2 = p1 · r^k
  const p2 = presionIsentropica(p1, v1, v2, k);

  const estado2 = { T: T2, p: p2, v: v2 };

  // ══════════════════════════════════════════════════════════
  //  ESTADO 3: Fin de combustión (TDC, volumen constante)
  //  Proceso 2→3: isocórico, v3 = v2
  //    q_in = cv·(T3 - T2)  ⟹  T3 = T2 + q_in/cv
  // ══════════════════════════════════════════════════════════
  const v3 = v2;   // proceso a volumen constante

  const T3 = T2 + qIn / cv;

  //   p3/p2 = T3/T2  (volumen constante, gas ideal)
  const p3 = p2 * (T3 / T2);

  const estado3 = { T: T3, p: p3, v: v3 };

  // ══════════════════════════════════════════════════════════
  //  ESTADO 4: Fin de expansión isentrópica (BDC)
  //  Proceso 3→4: isentrópico, v4 = v1
  // ══════════════════════════════════════════════════════════
  const v4 = v1;   // expansión hasta volumen inicial

  //   T4 = T3 · (v3/v4)^(k-1)  = T3 · (1/r)^(k-1)
  const T4 = tempIsentropica(T3, v3, v4, k);

  //   p4 = p3 · (v3/v4)^k = p3 · (1/r)^k
  const p4 = presionIsentropica(p3, v3, v4, k);

  const estado4 = { T: T4, p: p4, v: v4 };

  // ══════════════════════════════════════════════════════════
  //  PARÁMETROS DE DESEMPEÑO DEL CICLO
  // ══════════════════════════════════════════════════════════

  //  Calor rechazado (proceso 4→1, isocórico, valor positivo)
  //    q_out = cv·(T4 - T1)
  const qOut = cv * (T4 - T1);

  //  Trabajo neto por balance de energía del ciclo cerrado:
  //    W_neto = q_in - q_out
  const Wneto = qIn - qOut;

  //  Rendimiento térmico
  //    η = W_neto / q_in  ≡  1 - 1/r^(k-1)
  const eta = rendimientoOtto(r, k);           // expresión analítica exacta
  const etaEnergia = Wneto / qIn;              // verificación por balance

  //  Presión Media Efectiva
  //    PME = W_neto / (v1 - v2)
  const PME = presionMediaEfectiva(Wneto, v1, r);

  return {
    estados: { estado1, estado2, estado3, estado4 },
    Wneto,
    qOut,
    eta,
    etaEnergia,   // debe coincidir con eta (verificación numérica)
    PME,
    cv,
    cp,
  };
};

// ──────────────────────────────────────────────────────────────
//  UTILIDAD: formateo de resultados para consola
// ──────────────────────────────────────────────────────────────

/**
 * Imprime los resultados del ciclo Otto en consola de forma tabular.
 *
 * @param {ReturnType<typeof calcularCicloOtto>} resultado
 */
const imprimirResultados = (resultado) => {
  const { estados, Wneto, qOut, eta, etaEnergia, PME, cv, cp } = resultado;
  const { estado1: s1, estado2: s2, estado3: s3, estado4: s4 } = estados;

  const linea = '─'.repeat(62);

  console.log('\n' + linea);
  console.log('  CICLO OTTO IDEAL — AIRE ESTÁNDAR FRÍO');
  console.log(linea);
  console.log('  Constantes:');
  console.log(`    cv = ${cv.toFixed(4)} J/(kg·K)`);
  console.log(`    cp = ${cp.toFixed(4)} J/(kg·K)`);
  console.log(linea);

  // Tabla de estados
  const header = '  Estado │    T [K]   │    p [Pa]    │  v [m³/kg]';
  console.log(header);
  console.log('  ' + '─'.repeat(header.length - 2));

  const fmtEstado = (label, s) =>
    `  ${label}     │ ${s.T.toFixed(3).padStart(9)} │ ${s.p.toFixed(3).padStart(12)} │ ${s.v.toFixed(6).padStart(10)}`;

  console.log(fmtEstado('  1', s1));
  console.log(fmtEstado('  2', s2));
  console.log(fmtEstado('  3', s3));
  console.log(fmtEstado('  4', s4));

  console.log(linea);
  console.log('  PARÁMETROS DE DESEMPEÑO:');
  console.log(`    W_neto     = ${Wneto.toFixed(3)} J/kg`);
  console.log(`    q_out      = ${qOut.toFixed(3)} J/kg`);
  console.log(`    η (analít) = ${(eta * 100).toFixed(4)} %`);
  console.log(`    η (energía)= ${(etaEnergia * 100).toFixed(4)} %`);
  console.log(`    PME        = ${PME.toFixed(3)} Pa  (${(PME / 1e5).toFixed(5)} bar)`);
  console.log(linea + '\n');
};

// ──────────────────────────────────────────────────────────────
//  SCRIPT DE PRUEBA — VALORES DE REFERENCIA UTN HAEDO
// ──────────────────────────────────────────────────────────────

(() => {
  console.log('══════════════════════════════════════════════════════════════');
  console.log('  TEST: Ciclo Otto — Valores de Referencia UTN Haedo');
  console.log('══════════════════════════════════════════════════════════════');

  // Parámetros de entrada
  const T1   = 280.23;        // [K]
  const p1   = 87_516.05;     // [Pa]
  const r    = 6.3;           // [-]
  const qIn  = 2_234_000;     // [J/kg]

  console.log('\n  Entradas:');
  console.log(`    T1   = ${T1} K`);
  console.log(`    p1   = ${p1} Pa`);
  console.log(`    r    = ${r}`);
  console.log(`    q_in = ${qIn.toLocaleString('es-AR')} J/kg`);

  try {
    const resultado = calcularCicloOtto(T1, p1, r, qIn);
    imprimirResultados(resultado);

    // ── Verificaciones de coherencia física ────────────────
    const { estados, eta, etaEnergia, Wneto } = resultado;
    const { estado1: s1, estado2: s2, estado3: s3, estado4: s4 } = estados;
    const tol = 1e-6;   // tolerancia relativa

    const ok = (cond, msg) => console.log(`  [${cond ? 'OK' : 'FALLA'}] ${msg}`);

    console.log('  VERIFICACIONES:');
    ok(s2.T > s1.T,  'T2 > T1 (compresión calienta el gas)');
    ok(s3.T > s2.T,  'T3 > T2 (combustión aporta calor)');
    ok(s3.T > s4.T,  'T3 > T4 (expansión enfría el gas)');
    ok(s4.T > s1.T,  'T4 > T1 (calor residual en exhaust)');
    ok(Math.abs(s1.v - s4.v) < tol * s1.v, 'v1 = v4 (BDC igual en ambos extremos)');
    ok(Math.abs(s2.v - s3.v) < tol * s2.v, 'v2 = v3 (TDC igual en ambos extremos)');
    ok(Math.abs(eta - etaEnergia) < tol,    'η_analítico = η_energía (balance correcto)');
    ok(Wneto > 0,    'W_neto > 0 (ciclo motor, no refrigerador)');
    console.log('');

  } catch (err) {
    console.error('  ERROR:', err.message);
  }
})();

// ──────────────────────────────────────────────────────────────
//  EXPORTACIÓN (CommonJS / ESM opcional)
// ──────────────────────────────────────────────────────────────
// Para usar en entorno Node.js / bundler:
//
//   module.exports = { calcularCicloOtto, imprimirResultados };   // CJS
//   export { calcularCicloOtto, imprimirResultados };             // ESM
