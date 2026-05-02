# PROMPTS.md — Trazabilidad del Uso de IA
## TP Nº 1 · Ciclos Termodinámicos · Propulsión · UTN FRH
**Grupo 1:** Denapole · Romero · Tartaruca · Varsalona  
**Asistente utilizado:** Claude Sonnet (Anthropic) vía claude.ai  
**Período:** Abril–Mayo 2026

---

> **Criterio de registro:** Se documenta cada prompt significativo con su resultado,
> qué se aceptó, qué se modificó y qué se rechazó, conforme a la Sección 8 del enunciado.

---

## ENTRADA 1 — Módulo de cálculo del ciclo Otto (Etapa 1 / Etapa 3)

**Fecha:** 22/04/2026  
**Etapa:** 1 y 3  

**Prompt utilizado:**
> "Actúa como ingeniero aeronáutico experto en termodinámica y desarrollo de software. Estoy desarrollando una aplicación de predimensionamiento de motores aeronáuticos para la UTN Haedo (Argentina). Objetivo: Necesito que escribas un código en JavaScript puro (ES6) que implemente el cálculo de los estados de un ciclo Otto ideal de aire estándar frío. Requisitos técnicos: 1. Entradas: T1 [K], p1 [Pa], r [-], qin [J/kg]. 2. Constantes: R=287, k=1.4. 3. Salidas: propiedades de los 4 estados, Wneto, η, PME. 4. Separar lógica en funciones puras, comentarios con ecuaciones, sin librerías externas. Validación con: T1=280.23 K, p1=87516.05 Pa, r=6.3, qin=2234000 J/kg."

**Respuesta obtenida (resumen):**  
Claude generó el archivo `ciclo_otto_ideal.js` con funciones puras separadas (`calcCv`, `calcCp`, `volumenEspecifico`, `tempIsentropica`, `presionIsentropica`, `rendimientoOtto`, `presionMediaEfectiva`) y la función principal `calcularCicloOtto()`. Incluyó un script de prueba con los valores de referencia del Grupo 1 y 8 verificaciones de coherencia física.

**Resultados del script de prueba:**
| Estado | T [K] | p [Pa] | v [m³/kg] |
|--------|-------|--------|-----------|
| 1 | 280.230 | 87 516.050 | 0.918986 |
| 2 | 585.128 | 1 151 236.305 | 0.145871 |
| 3 | 3 698.717 | 7 277 206.702 | 0.145871 |
| 4 | 1 771.393 | 553 207.350 | 0.918986 |

η = 52.11 % · W_neto = 1 164 090.7 J/kg · PME = 15.057 bar

**Verificación contra cálculo manual (Etapa 1):**  
Todos los valores coinciden con el cálculo manual dentro de 0.1%. Las 8 verificaciones de coherencia física pasaron con `[OK]`.

**Decisión del grupo:**
- ✅ **Aceptado íntegramente.** El código coincide con el cálculo manual y pasa todas las verificaciones.
- El archivo `ciclo_otto_ideal.js` se convirtió en el núcleo de `engine.js` en la Etapa 3.

---

## ENTRADA 2 — Especificación funcional Etapa 2 (documento Word)

**Fecha:** 28/04/2026  
**Etapa:** 2  

**Prompt utilizado:**
> Solicitud de generar la Etapa 2 completa en formato Word, con el mismo esquema visual del TP original (colores fucsia/salmón, fuente Aptos). Se proporcionó el archivo TP1_Ciclos_Propulsion.docx y el manual Continental_C75_Specifications-Master.pdf como contexto.

**Respuesta obtenida (resumen):**  
Claude extrajo la paleta de colores exacta del documento original (`FF0066` fucsia, `F6C5AC` salmón, `D60093` para H1) y generó el documento `TP1_Grupo1_Etapa2_Especificacion.docx` con 9 secciones: objetivo, misión del grupo, tabla de entradas (12 parámetros), tabla de salidas termodinámicas y geométricas, organización de pantallas, arquitectura del código (8 archivos), verificaciones internas, criterios de aceptación y cronograma.

**Lo que se modificó:**  
- Primera versión usaba fuente Calibri en cuerpo. Se solicitó corrección a Aptos para todo el documento (conforme al original).
- Claude confirmó con inspección del XML interno del .docx original que Aptos es la fuente base.

**Decisión del grupo:**
- ✅ **Aceptado con corrección de fuente.** El documento se usa como base para la sección Etapa 2 del informe final.
- ⚠️ Las secciones de análisis paramétrico y propuesta de diseño final se completarán manualmente por el grupo en el informe.

---

## ENTRADA 3 — Desarrollo completo de la aplicación (Etapa 3)

**Fecha:** 01–03/05/2026  
**Etapa:** 3  

**Prompt utilizado:**
> Solicitud de construir la aplicación completa en archivos separados (engine.js, geometry.js, charts.js, ui.js, index.html) para los tres ciclos (Otto, Diesel, Sabathé), con gráficos p-v y T-s obligatorios, usando Plotly.js vía CDN, paleta fucsia del TP.

**Respuesta obtenida (resumen):**  
Claude generó los 5 archivos de la aplicación:
- **`engine.js`** (449 líneas): módulo ISA, cálculo de Qin por combustible, los tres ciclos con ecuaciones analíticas exactas, función `calcParametrico()` para curvas vs. r.
- **`geometry.js`** (170 líneas): cálculo de Vd_total, Vd_cil, D, S, Vcc a partir de PME y RPM. Relación S/D del C-75 como referencia.
- **`charts.js`** (556 líneas): diagramas p-v y T-s con Plotly, curvas paramétricas η/PME/T_max vs. r, comparación de los 3 ciclos superpuestos.
- **`ui.js`** (316 líneas): controlador DOM, alertas T_max > 2500 K y p_max > 100 bar, slider r con actualización en tiempo real.
- **`index.html`** (710 líneas): interfaz completa con fuente Barlow + JetBrains Mono, paleta fucsia/salmón, pestañas p-v / T-s / Análisis r / Comparación.

**Test numérico de los tres ciclos (valores de referencia Grupo 1):**
| Ciclo | η | W_neto | PME |
|-------|---|--------|-----|
| Otto | 52.11 % | 1 164 kJ/kg | 15.06 bar |
| Sabathé (α=0.5) | 49.84 % | 1 113 kJ/kg | 14.40 bar |
| Diesel | 28.07 % | 627 kJ/kg | 8.11 bar |

Jerarquía η_Otto ≥ η_Sabathé ≥ η_Diesel verificada ✅

**Decisión del grupo:**
- ✅ **Aceptado.** Todos los checks de coherencia física pasan.
- ✅ La arquitectura de módulos separados coincide con la especificación de la Etapa 2.

---

## ENTRADA 4 — Corrección del diagrama T-s (error detectado y corregido)

**Fecha:** 03/05/2026  
**Etapa:** 4 (validación)  

**Error detectado por el grupo:**  
Los procesos isentrópicos (1→2 y 3→4) aparecían como **líneas horizontales** en el diagrama T-s en lugar de líneas verticales (s = constante). Las curvas isocóricas también estaban mal trazadas.

**Diagnóstico técnico:**  
Claude diagnosticó que el error estaba en `charts.js`, no en `engine.js`. La función `buildCicloTrace()` usaba un acumulador `s_cur` que sumaba el Δs relativo de cada segmento. Los segmentos isentrópicos devolvían `s = [0, 0, 0, ...]` (correcto físicamente), pero al mapearlos con `ds + s_cur` producían `[s_cur, s_cur, ...]` — una línea horizontal en lugar de vertical.

**Prompt utilizado:**
> "Claude, detecté un error grave en la representación del diagrama T-s del ciclo Otto. Actualmente, los procesos adiabáticos isentrópicos (1-2 y 3-4) no se muestran como líneas verticales (s = constante). Además, las curvas a volumen constante están mal trazadas. Por favor, corregí la lógica [...] 1. Proceso 1-2 y 3-4: Deben ser líneas verticales. 2. Procesos 2-3 y 4-1: Usá Δs = cv·ln(T_final/T_inicial). 3. Generar suficientes puntos intermedios. 4. Ejes correctamente etiquetados."

**Corrección aplicada en `charts.js`:**  
Se reescribió completamente `buildCicloTrace()` con:
- Nueva función `calcEntropia(resultado)` que calcula las entropías absolutas por estado con `s₁ = 0` como referencia global.
- Nueva función `curvaIsentropica_ts()` que genera `s = s_A` constante → línea vertical perfecta.
- Eliminación del acumulador `s_cur` frágil.

**Verificación numérica post-corrección:**
```
Otto:   s₁=s₂=0,  s₃=s₄=1323.01 J/(kg·K),  s_cierre=0.000000 ✅
Diesel: s₁=s₂=0,  s₃=s₄=1575.86 J/(kg·K),  s_cierre=0.000000 ✅
Sabathé:s₁=s₂=0,  s₃=931.05, s₄=s₅=1351.09 J/(kg·K), s_cierre=0.000000 ✅
```

**Decisión del grupo:**
- ✅ **Error detectado por el grupo, corregido con asistencia de Claude.**
- ✅ Este caso cumple el requisito de la Sección 8: "al menos un error generado por la IA durante el desarrollo, explicando cómo lo detectó y cómo lo corrigió."
- La detección fue visual (el diagrama no coincidía con la forma esperada de un ciclo Otto en T-s). La corrección fue verificada numéricamente con cierre exacto `|Δs| = 0`.

---

## ENTRADA 5 — Verificación del ciclo Sabathé

**Fecha:** 03/05/2026  
**Etapa:** 4 (validación)  

**Prompt utilizado:**
> "¿Y el Sabathé está bien calculado?"

**Respuesta obtenida (resumen):**  
Claude ejecutó una verificación exhaustiva de los 5 estados, los 5 procesos y las entropías del ciclo Sabathé. Resultados: todos los checks de coherencia física pasan, balance energético `|η_analítica − η_energía| = 0`, cierre del ciclo `|s_final − s₁| = 0`, jerarquía η_Otto ≥ η_Sabathé ≥ η_Diesel confirmada.

**Decisión del grupo:**
- ✅ **Aceptado.** Ciclo Sabathé verificado como correcto.

---

## Resumen de tareas por responsabilidad

| Tarea | Responsable |
|-------|-------------|
| Verificación de resultados contra cálculo manual | Grupo (humanos) |
| Detección del error en diagrama T-s | Grupo (humanos) |
| Decisión de arquitectura modular | Grupo (humanos) |
| Justificación de hipótesis (k=1.4, η_mec=0.90, S/D=0.892) | Grupo (humanos) |
| Generación de código JS | Claude (IA) |
| Generación de documentos Word | Claude (IA) |
| Selección del ciclo para la misión | Grupo (humanos) — Etapa 5 |
| Propuesta de diseño final | Grupo (humanos) — Etapa 5 |
| Defensa oral | Grupo (humanos) |

---

*Documento generado conforme a la Sección 8 del enunciado del TP Nº 1 — Propulsión — UTN FRH 2026.*
