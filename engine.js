/**
 * ============================================================
 *  engine.js — Motor de Cálculo Termodinámico
 *  UTN Haedo · Predimensionamiento de Motores Aeronáuticos
 * ============================================================
 *  Módulos:
 *    1. ISA        — Atmósfera Estándar Internacional
 *    2. Combustión — PCI y relación A/F por combustible
 *    3. Otto       — Ciclo Otto ideal (ya validado en Etapa 1)
 *    4. Diesel     — Ciclo Diesel ideal
 *    5. Sabathé    — Ciclo mixto (Otto + Diesel)
 *
 *  Convenciones:
 *    · Todas las funciones son PURAS (sin side-effects, sin DOM)
 *    · Unidades SI en todas las interfaces (K, Pa, m³/kg, J/kg)
 *    · Parámetros opcionales R y k siempre al final con defaults
 * ============================================================
 */

'use strict';

// ════════════════════════════════════════════════════════════════
//  CONSTANTES GLOBALES
// ════════════════════════════════════════════════════════════════

/** Constante del gas — aire  [J/(kg·K)] */
const R = 287;

/** Exponente isentrópico — aire frío (cold air-standard) [-] */
const K = 1.4;

/** Temperatura al nivel del mar ISA  [K] */
const T0_ISA = 288.15;

/** Presión al nivel del mar ISA  [Pa] */
const P0_ISA = 101325;

/** Gradiente de temperatura ISA troposfera  [K/m] */
const LAPSE_RATE = 0.0065;

/** Aceleración gravitacional  [m/s²] */
const G = 9.80665;

/** Propiedades de combustibles (PCI en J/kg, A/F estequiométrico) */
const COMBUSTIBLES = {
  C6H14:  { nombre: 'Hexano (C₆H₁₄)',   PCI: 44_700_000, AF_stoich: 15.1 },
  C7H16:  { nombre: 'Heptano (C₇H₁₆)',  PCI: 44_600_000, AF_stoich: 15.1 },
  C8H18:  { nombre: 'Isoctano (C₈H₁₈)', PCI: 44_300_000, AF_stoich: 15.1 },
};

// ════════════════════════════════════════════════════════════════
//  MÓDULO 1 — ATMÓSFERA ESTÁNDAR ISA
// ════════════════════════════════════════════════════════════════

/**
 * Convierte pies a metros.
 *   h_m = h_ft · 0.3048                               [m]
 * @param {number} ft - Altitud en pies
 * @returns {number}  Altitud en metros
 */
const ftToM = (ft) => ft * 0.3048;

/**
 * Temperatura ISA en troposfera (h ≤ 11000 m).
 *   T(h) = T₀ − λ·h                                  [K]
 *
 * @param {number} h_m - Altitud [m]
 * @returns {number}   T [K]
 */
const calcISA_T = (h_m) => {
  if (h_m < 0) throw new RangeError(`Altitud inválida: ${h_m} m`);
  if (h_m <= 11000) return T0_ISA - LAPSE_RATE * h_m;
  return 216.65; // estratosfera inferior (isoterma)
};

/**
 * Presión ISA por la ecuación barométrica integrada.
 *
 *  Troposfera  (h ≤ 11000 m):
 *    p(h) = P₀ · (T/T₀)^(g/(λ·R))                   [Pa]
 *
 *  Estratosfera inferior  (11000 < h ≤ 20000 m):
 *    p(h) = p_11 · exp(−g·(h−11000)/(R·216.65))      [Pa]
 *
 * @param {number} h_m - Altitud [m]
 * @returns {number}   p [Pa]
 */
const calcISA_p = (h_m) => {
  if (h_m <= 11000) {
    const T = calcISA_T(h_m);
    const exp = G / (LAPSE_RATE * R);
    return P0_ISA * Math.pow(T / T0_ISA, exp);
  }
  const p11 = calcISA_p(11000);
  return p11 * Math.exp(-G * (h_m - 11000) / (R * 216.65));
};

/**
 * Calcula las condiciones ambientales ISA a una altitud dada en pies.
 *
 * @param {number} h_ft - Altitud [ft]
 * @returns {{ h_m: number, T1: number, p1: number }}
 *   h_m en [m], T1 en [K], p1 en [Pa]
 */
const calcISA = (h_ft) => {
  const h_m = ftToM(h_ft);
  return {
    h_m,
    T1: calcISA_T(h_m),
    p1: calcISA_p(h_m),
  };
};

// ════════════════════════════════════════════════════════════════
//  MÓDULO 2 — COMBUSTIÓN
// ════════════════════════════════════════════════════════════════

/**
 * Calcula el calor aportado Qin para una mezcla combustible-aire.
 *
 *   AF_real = AF_stoich / ϕ           (relación aire-combustible real)
 *   Qin = PCI / (1 + AF_real)         [J/kg_mezcla]
 *
 * @param {string} combustible - Clave: 'C6H14' | 'C7H16' | 'C8H18'
 * @param {number} phi         - Mezcla relativa ϕ (fracción de riqueza) [-]
 * @returns {{ Qin: number, AF_real: number, AF_stoich: number, PCI: number }}
 */
const calcQin = (combustible, phi) => {
  if (!COMBUSTIBLES[combustible]) throw new Error(`Combustible desconocido: ${combustible}`);
  if (phi <= 0 || phi > 1.5)      throw new RangeError(`ϕ fuera de rango [0,1–1,5]: ${phi}`);
  const { PCI, AF_stoich } = COMBUSTIBLES[combustible];
  const AF_real = AF_stoich / phi;
  const Qin = PCI / (1 + AF_real);
  return { Qin, AF_real, AF_stoich, PCI };
};

// ════════════════════════════════════════════════════════════════
//  FUNCIONES AUXILIARES TERMODINÁMICAS (compartidas)
// ════════════════════════════════════════════════════════════════

/** cv = R / (k−1)  [J/(kg·K)] */
const calcCv = (R_g, k) => R_g / (k - 1);

/** cp = k·R / (k−1)  [J/(kg·K)] */
const calcCp = (R_g, k) => (k * R_g) / (k - 1);

/** v = R·T / p  [m³/kg] — gas ideal */
const vEsp = (R_g, T, p) => (R_g * T) / p;

/** T_b = T_a · (v_a/v_b)^(k−1)  — fin de proceso isentrópico */
const Tisen = (Ta, va, vb, k) => Ta * Math.pow(va / vb, k - 1);

/** p_b = p_a · (v_a/v_b)^k  — fin de proceso isentrópico */
const pIsen = (pa, va, vb, k) => pa * Math.pow(va / vb, k);

/** PME = W_neto / (v1 − v2)  [Pa] */
const calcPME = (Wneto, v1, v2) => Wneto / (v1 - v2);

// ════════════════════════════════════════════════════════════════
//  MÓDULO 3 — CICLO OTTO IDEAL
// ════════════════════════════════════════════════════════════════

/**
 * Ciclo Otto ideal — aire estándar frío.
 *
 *  1→2  Compresión isentrópica   (v2 = v1/r)
 *  2→3  Combustión isocórica     (v3 = v2)
 *  3→4  Expansión isentrópica    (v4 = v1)
 *  4→1  Escape isocórico
 *
 *   η = 1 − 1/r^(k−1)
 *
 * @param {number} T1   [K]   @param {number} p1   [Pa]
 * @param {number} r    [-]   @param {number} Qin  [J/kg]
 * @param {number} [R_g=287]  @param {number} [k_g=1.4]
 * @returns {CicloResult}
 */
const calcularCicloOtto = (T1, p1, r, Qin, R_g = R, k_g = K) => {
  validarEntradas(T1, p1, r, Qin);

  const cv = calcCv(R_g, k_g);
  const cp = calcCp(R_g, k_g);

  // Estado 1
  const v1 = vEsp(R_g, T1, p1);
  const s1 = { T: T1, p: p1, v: v1 };

  // Estado 2 — fin compresión isentrópica
  const v2 = v1 / r;
  const T2 = Tisen(T1, v1, v2, k_g);
  const p2 = pIsen(p1, v1, v2, k_g);
  const s2 = { T: T2, p: p2, v: v2 };

  // Estado 3 — fin combustión isocórica
  //   Qin = cv·(T3 − T2)  →  T3 = T2 + Qin/cv
  const v3 = v2;
  const T3 = T2 + Qin / cv;
  const p3 = p2 * (T3 / T2);               // Ley de Gay-Lussac: p/T = cte
  const s3 = { T: T3, p: p3, v: v3 };

  // Estado 4 — fin expansión isentrópica
  const v4 = v1;
  const T4 = Tisen(T3, v3, v4, k_g);
  const p4 = pIsen(p3, v3, v4, k_g);
  const s4 = { T: T4, p: p4, v: v4 };

  const Qout  = cv * (T4 - T1);
  const Wneto = Qin - Qout;
  const eta   = 1 - 1 / Math.pow(r, k_g - 1);  // expresión analítica exacta
  const PME   = calcPME(Wneto, v1, v2);

  return { tipo: 'Otto', estados: [s1, s2, s3, s4], Wneto, Qin, Qout, eta, PME, cv, cp, r };
};

// ════════════════════════════════════════════════════════════════
//  MÓDULO 4 — CICLO DIESEL IDEAL
// ════════════════════════════════════════════════════════════════

/**
 * Ciclo Diesel ideal — aire estándar frío.
 *
 *  1→2  Compresión isentrópica      (v2 = v1/r)
 *  2→3  Combustión isobárica        (p3 = p2)
 *  3→4  Expansión isentrópica       (v4 = v1)
 *  4→1  Escape isocórico
 *
 *  Relación de corte:  rc = v3/v2 = T3/T2   (proceso isobárico, gas ideal)
 *
 *  η_Diesel = 1 − (1/r^(k−1)) · (rc^k − 1) / (k·(rc − 1))
 *
 * @param {number} T1   [K]   @param {number} p1   [Pa]
 * @param {number} r    [-]   @param {number} Qin  [J/kg]
 * @param {number} [R_g=287]  @param {number} [k_g=1.4]
 * @returns {CicloResult}
 */
const calcularCicloDiesel = (T1, p1, r, Qin, R_g = R, k_g = K) => {
  validarEntradas(T1, p1, r, Qin);

  const cv = calcCv(R_g, k_g);
  const cp = calcCp(R_g, k_g);

  // Estado 1
  const v1 = vEsp(R_g, T1, p1);
  const s1 = { T: T1, p: p1, v: v1 };

  // Estado 2 — fin compresión isentrópica
  const v2 = v1 / r;
  const T2 = Tisen(T1, v1, v2, k_g);
  const p2 = pIsen(p1, v1, v2, k_g);
  const s2 = { T: T2, p: p2, v: v2 };

  // Estado 3 — fin combustión ISOBÁRICA
  //   Qin = cp·(T3 − T2)  →  T3 = T2 + Qin/cp
  const T3 = T2 + Qin / cp;
  const p3 = p2;                            // proceso isobárico
  const v3 = vEsp(R_g, T3, p3);            // v3 = R·T3/p3  (gas ideal)
  const s3 = { T: T3, p: p3, v: v3 };

  // Relación de corte (cutoff ratio)
  //   rc = v3/v2 = T3/T2  (isobárico, gas ideal)
  const rc = v3 / v2;

  // Estado 4 — fin expansión isentrópica (v4 = v1)
  const v4 = v1;
  const T4 = Tisen(T3, v3, v4, k_g);
  const p4 = pIsen(p3, v3, v4, k_g);
  const s4 = { T: T4, p: p4, v: v4 };

  const Qout  = cv * (T4 - T1);
  const Wneto = Qin - Qout;

  // Rendimiento analítico Diesel
  //   η = 1 − [1/r^(k−1)] · [(rc^k − 1) / (k·(rc − 1))]
  const eta = 1 - (1 / Math.pow(r, k_g - 1)) *
              (Math.pow(rc, k_g) - 1) / (k_g * (rc - 1));

  const PME = calcPME(Wneto, v1, v2);

  return { tipo: 'Diesel', estados: [s1, s2, s3, s4], Wneto, Qin, Qout, eta, PME, cv, cp, r, rc };
};

// ════════════════════════════════════════════════════════════════
//  MÓDULO 5 — CICLO SABATHÉ (MIXTO)
// ════════════════════════════════════════════════════════════════

/**
 * Ciclo Sabathé ideal (ciclo mixto) — aire estándar frío.
 *
 *  1→2  Compresión isentrópica      (v2 = v1/r)
 *  2→3  Combustión ISOCÓRICA        (v3 = v2)      ← fracción alpha·Qin
 *  3→4  Combustión ISOBÁRICA        (p4 = p3)      ← fracción (1−alpha)·Qin
 *  4→5  Expansión isentrópica       (v5 = v1)
 *  5→1  Escape isocórico
 *
 *  Parámetro alpha: fracción del calor total aportada a volumen constante.
 *    alpha = 1  →  ciclo Otto puro
 *    alpha = 0  →  ciclo Diesel puro
 *
 *  Relación de presión:  rp = p3/p2 = T3/T2   (isocórico, gas ideal)
 *  Relación de corte:    rc = v4/v3 = T4/T3   (isobárico, gas ideal)
 *
 *  η_Sabathé = 1 − (1/r^(k−1)) · (rp·rc^k − 1) / ((rp−1) + k·rp·(rc−1))
 *
 * @param {number} T1     [K]    @param {number} p1    [Pa]
 * @param {number} r      [-]    @param {number} Qin   [J/kg]
 * @param {number} alpha  [-]    fracción isocórica (0 < alpha < 1)
 * @param {number} [R_g=287]     @param {number} [k_g=1.4]
 * @returns {CicloResult}
 */
const calcularCicloSabathe = (T1, p1, r, Qin, alpha = 0.5, R_g = R, k_g = K) => {
  validarEntradas(T1, p1, r, Qin);
  if (alpha <= 0 || alpha >= 1) throw new RangeError(`alpha debe estar en (0,1). Recibido: ${alpha}`);

  const cv = calcCv(R_g, k_g);
  const cp = calcCp(R_g, k_g);

  const Qin_v = alpha * Qin;           // calor a volumen constante
  const Qin_p = (1 - alpha) * Qin;    // calor a presión constante

  // Estado 1
  const v1 = vEsp(R_g, T1, p1);
  const s1 = { T: T1, p: p1, v: v1 };

  // Estado 2 — fin compresión isentrópica
  const v2 = v1 / r;
  const T2 = Tisen(T1, v1, v2, k_g);
  const p2 = pIsen(p1, v1, v2, k_g);
  const s2 = { T: T2, p: p2, v: v2 };

  // Estado 3 — fin combustión ISOCÓRICA (primera parte)
  //   Qin_v = cv·(T3 − T2)  →  T3 = T2 + Qin_v/cv
  const v3 = v2;
  const T3 = T2 + Qin_v / cv;
  const p3 = p2 * (T3 / T2);           // Gay-Lussac
  const s3 = { T: T3, p: p3, v: v3 };

  // Relación de presión:  rp = p3/p2
  const rp = p3 / p2;

  // Estado 4 — fin combustión ISOBÁRICA (segunda parte)
  //   Qin_p = cp·(T4 − T3)  →  T4 = T3 + Qin_p/cp
  const T4 = T3 + Qin_p / cp;
  const p4 = p3;                        // proceso isobárico
  const v4 = vEsp(R_g, T4, p4);
  const s4 = { T: T4, p: p4, v: v4 };

  // Relación de corte:  rc = v4/v3
  const rc = v4 / v3;

  // Estado 5 — fin expansión isentrópica (v5 = v1)
  const v5 = v1;
  const T5 = Tisen(T4, v4, v5, k_g);
  const p5 = pIsen(p4, v4, v5, k_g);
  const s5 = { T: T5, p: p5, v: v5 };

  const Qout  = cv * (T5 - T1);
  const Wneto = Qin - Qout;

  // Rendimiento analítico Sabathé
  //   η = 1 − [1/r^(k−1)] · (rp·rc^k − 1) / [(rp−1) + k·rp·(rc−1)]
  const eta = 1 - (1 / Math.pow(r, k_g - 1)) *
              (rp * Math.pow(rc, k_g) - 1) /
              ((rp - 1) + k_g * rp * (rc - 1));

  const PME = calcPME(Wneto, v1, v2);

  return { tipo: 'Sabathé', estados: [s1, s2, s3, s4, s5], Wneto, Qin, Qout, eta, PME, cv, cp, r, rp, rc, alpha };
};

// ════════════════════════════════════════════════════════════════
//  VALIDACIÓN COMÚN
// ════════════════════════════════════════════════════════════════

/**
 * Valida las entradas comunes a los tres ciclos.
 * Lanza RangeError si algún parámetro está fuera de rango.
 */
const validarEntradas = (T1, p1, r, Qin) => {
  if (T1  <= 0) throw new RangeError(`T1 debe ser > 0 K. Recibido: ${T1}`);
  if (p1  <= 0) throw new RangeError(`p1 debe ser > 0 Pa. Recibido: ${p1}`);
  if (r   <= 1) throw new RangeError(`r debe ser > 1. Recibido: ${r}`);
  if (Qin <= 0) throw new RangeError(`Qin debe ser > 0 J/kg. Recibido: ${Qin}`);
};

// ════════════════════════════════════════════════════════════════
//  ANÁLISIS PARAMÉTRICO (curvas vs. r)
// ════════════════════════════════════════════════════════════════

/**
 * Genera curvas de η, PME y T_max en función de r.
 * Usado por charts.js para el análisis paramétrico.
 *
 * @param {string} tipoCiclo   - 'Otto' | 'Diesel' | 'Sabathé'
 * @param {number} T1          - [K]
 * @param {number} p1          - [Pa]
 * @param {number} Qin         - [J/kg]
 * @param {number[]} rango_r   - Array de valores de r
 * @param {number} alpha       - Solo para Sabathé (0 < alpha < 1)
 * @param {number} [k_g=1.4]
 * @returns {{ r: number[], eta: number[], PME: number[], Tmax: number[] }}
 */
const calcParametrico = (tipoCiclo, T1, p1, Qin, rango_r, alpha = 0.5, k_g = K) => {
  const calcFn = {
    'Otto':    (r) => calcularCicloOtto(T1, p1, r, Qin, R, k_g),
    'Diesel':  (r) => calcularCicloDiesel(T1, p1, r, Qin, R, k_g),
    'Sabathé': (r) => calcularCicloSabathe(T1, p1, r, Qin, alpha, R, k_g),
  }[tipoCiclo];

  if (!calcFn) throw new Error(`Ciclo desconocido: ${tipoCiclo}`);

  const curvas = { r: [], eta: [], PME: [], Tmax: [] };

  for (const r of rango_r) {
    try {
      const res = calcFn(r);
      const Tmax = Math.max(...res.estados.map(s => s.T));
      curvas.r.push(r);
      curvas.eta.push(res.eta * 100);       // en %
      curvas.PME.push(res.PME / 1e5);       // en bar
      curvas.Tmax.push(Tmax);
    } catch (_) {
      // r inválido — se omite el punto
    }
  }
  return curvas;
};

// ════════════════════════════════════════════════════════════════
//  EXPORTACIÓN (browser global)
// ════════════════════════════════════════════════════════════════

window.Engine = {
  // ISA
  calcISA,
  calcISA_T,
  calcISA_p,
  ftToM,
  // Combustión
  calcQin,
  COMBUSTIBLES,
  // Ciclos
  calcularCicloOtto,
  calcularCicloDiesel,
  calcularCicloSabathe,
  // Análisis
  calcParametrico,
  // Constantes
  R, K,
};
