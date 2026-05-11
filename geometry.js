/**
 * ============================================================
 *  geometry.js — Predimensionamiento Geométrico del Motor
 *  UTN Haedo · Predimensionamiento de Motores Aeronáuticos
 * ============================================================
 *
 *  Consume la salida de engine.js y calcula la geometría
 *  básica del motor necesaria para satisfacer la potencia
 *  efectiva requerida.
 *
 *  Hipótesis:
 *    · Motor de 4 tiempos → n_ciclos = n_RPM / 2
 *    · Relación S/D asumida a partir del motor de referencia
 *      Continental C-75: S = 3.625 in, D = 4.0625 in → S/D ≈ 0.892
 *    · N_cilindros: se propone el valor del motor de referencia (4)
 *      pero la función acepta cualquier valor entero > 0
 * ============================================================
 */

'use strict';

// ════════════════════════════════════════════════════════════════
//  CONSTANTES DE CONVERSIÓN
// ════════════════════════════════════════════════════════════════

/** HP → Watts  */
const HP_TO_W = 745.7;

/** Relación S/D del Continental C-75 (dato del manual, Section III) */
const SD_RATIO_C75 = 3.625 / 4.0625; // ≈ 0.892

// ════════════════════════════════════════════════════════════════
//  FUNCIONES DE CONVERSIÓN (puras, exportadas)
// ════════════════════════════════════════════════════════════════

/** Convierte HP a Watts */
const hpToW = (hp) => hp * HP_TO_W;

/** Convierte metros a milímetros */
const mToMm = (m) => m * 1000;

/** Convierte m³ a cm³ */
const m3ToCm3 = (m3) => m3 * 1e6;

// ════════════════════════════════════════════════════════════════
//  FUNCIÓN PRINCIPAL: calcGeometria
// ════════════════════════════════════════════════════════════════

/**
 * Calcula la geometría básica del motor a partir de los
 * resultados del ciclo termodinámico.
 *
 * Secuencia de cálculo:
 *
 *  1. Potencia efectiva por cilindro:
 *       Pef_cil = Pef_total / N_cil                           [W]
 *
 *  2. Trabajo efectivo por ciclo por cilindro:
 *       W_ef = PME · Vd_cil                                   [J]
 *       donde Vd_cil = cilindrada unitaria                    [m³]
 *       →  Vd_cil = W_ef_neto · η_mec / PME                  [m³]
 *       con W_ef_neto = Wneto [J/kg] × (masa/ciclo)
 *
 *     Relación entre PME y potencia (4 tiempos):
 *       Pef = PME · Vd · n / 2    (n en rev/s, Vd total en m³)
 *       →  Vd_total = Pef · 2 / (PME · η_mec · n_rps)       [m³]
 *
 *  3. Cilindrada unitaria:
 *       Vd_cil = Vd_total / N_cil                             [m³]
 *
 *  4. Con S/D = cte (del motor de referencia):
 *       Vd_cil = π/4 · D² · S = π/4 · D³ · (S/D)
 *       →  D = (Vd_cil / (π/4 · S/D))^(1/3)                 [m]
 *       →  S = D · (S/D)                                     [m]
 *
 *  5. Volumen de la cámara de combustión:
 *       Vcc = Vd_cil / (r − 1)                               [m³]
 *
 * @param {object} ciclo    - Resultado de calcularCiclo*()
 * @param {number} Pef_hp   - Potencia efectiva requerida      [HP]
 * @param {number} n_rpm    - RPM de diseño                    [-]
 * @param {number} eta_mec  - Rendimiento mecánico             [-]
 * @param {number} N_cil    - Número de cilindros              [-]
 * @param {number} [sd=SD_RATIO_C75] - Relación S/D            [-]
 *
 * @returns {{
 *   Pef_W:    number,  // Potencia efectiva [W]
 *   Vd_total: number,  // Cilindrada total [m³]
 *   Vd_cil:   number,  // Cilindrada unitaria [m³]
 *   D:        number,  // Diámetro del pistón [m]
 *   S:        number,  // Carrera [m]
 *   Vcc:      number,  // Vol. cámara combustión [m³]
 *   Vd_total_cm3: number,
 *   Vd_cil_cm3:   number,
 *   Vcc_cm3:      number,
 *   D_mm:     number,
 *   S_mm:     number,
 *   SD:       number,
 *   N_cil:    number,
 *   n_rpm:    number,
 *   eta_mec:  number,
 *   ref_C75:  object,  // Datos reales del C-75 para comparación
 * }}
 */
const calcGeometria = (ciclo, Pef_hp, n_rpm, eta_mec, N_cil, sd = SD_RATIO_C75) => {
  if (Pef_hp <= 0)  throw new RangeError(`Pef_hp debe ser > 0. Recibido: ${Pef_hp}`);
  if (n_rpm  <= 0)  throw new RangeError(`n_rpm debe ser > 0. Recibido: ${n_rpm}`);
  if (eta_mec <= 0 || eta_mec > 1) throw new RangeError(`η_mec debe estar en (0,1]. Recibido: ${eta_mec}`);
  if (N_cil  <= 0 || !Number.isInteger(N_cil)) throw new RangeError(`N_cil debe ser entero > 0. Recibido: ${N_cil}`);

  const Pef_W  = hpToW(Pef_hp);                  // [W]
  const n_rps  = n_rpm / 60;                      // [rev/s]

  // Cilindrada total (motor 4 tiempos: 1 ciclo cada 2 rev por cilindro)
  //   Pef = PME · Vd_total · η_mec · n_rps / 2
  //   → Vd_total = Pef · 2 / (PME · η_mec · n_rps)
  const Vd_total = (Pef_W * 2) / (ciclo.PME * eta_mec * n_rps);   // [m³]

  // Cilindrada unitaria
  const Vd_cil = Vd_total / N_cil;               // [m³]

  // Diámetro del pistón  (de Vd_cil = π/4 · D² · S y S = D·sd)
  //   Vd_cil = π/4 · D² · (D · sd) = π/4 · sd · D³
  //   →  D = (4 · Vd_cil / (π · sd))^(1/3)
  const D = Math.cbrt((4 * Vd_cil) / (Math.PI * sd));  // [m]
  const S = D * sd;                               // [m]

  // Volumen de la cámara de combustión
  //   r = (Vd + Vcc) / Vcc  →  Vcc = Vd / (r − 1)
  const Vcc = Vd_cil / (ciclo.r - 1);            // [m³]

  // Datos reales del Continental C-75 para comparación
  const ref_C75 = {
    D_mm:        4.0625 * 25.4,  // 103.2 mm
    S_mm:        3.625  * 25.4,  // 92.1  mm
    Vd_cil_cm3:  188 / 4 * 16.387,  // ≈ 770 cm³ (~188 in³ / 4 cil)
    N_cil:       4,
    n_rpm:       2275,
    Pef_hp:      75,
  };

  return {
    Pef_W,
    Vd_total,
    Vd_cil,
    D, S, Vcc,
    // En unidades prácticas
    Vd_total_cm3: m3ToCm3(Vd_total),
    Vd_cil_cm3:   m3ToCm3(Vd_cil),
    Vcc_cm3:      m3ToCm3(Vcc),
    D_mm: mToMm(D),
    S_mm: mToMm(S),
    SD:   sd,
    N_cil, n_rpm, eta_mec,
    ref_C75,
  };
};

// ════════════════════════════════════════════════════════════════
//  EXPORTACIÓN (browser global)
// ════════════════════════════════════════════════════════════════

window.Geometry = {
  calcGeometria,
  hpToW,
  mToMm,
  m3ToCm3,
  SD_RATIO_C75,
  HP_TO_W,
};
