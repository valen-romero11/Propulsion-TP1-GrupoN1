# Aplicación de Predimensionamiento de Motores Aeronáuticos
### TP Nº 1 · Ciclos Termodinámicos · Propulsión · UTN FRH 2026
**Grupo 1:** Denapole · Romero · Tartaruca · Varsalona

---

## Descripción

Aplicación web estática para el predimensionamiento básico de motores aeronáuticos alternativos. Implementa los ciclos termodinámicos ideales **Otto**, **Diesel** y **Sabathé** (aire estándar frío), calcula la geometría básica del motor y genera diagramas interactivos p-v, T-s y análisis paramétrico.

Motor de referencia de la misión: **Continental C-75** (75 HP · 4000 ft · isoctano C₈H₁₈ · ϕ = 0.80).

---

## Requisitos

- Navegador web moderno (Chrome, Firefox, Edge, Safari — cualquier versión de 2022 en adelante)
- Conexión a internet para cargar Plotly.js desde CDN *(solo la primera vez; luego queda en caché)*
- **No requiere** instalación, servidor, Node.js ni ninguna dependencia adicional

---

## Cómo ejecutar

### Opción A — Abrir directamente (más simple)

1. Descargá o cloná este repositorio
2. Colocá los siguientes archivos en la **misma carpeta**:
   ```
   index.html
   engine.js
   geometry.js
   charts.js
   ui.js
   ```
3. Hacé doble clic en `index.html`
4. La aplicación se abre en el navegador — no se necesita nada más

> ⚠️ **Nota:** Algunos navegadores bloquean la carga de scripts locales con doble clic.
> Si los gráficos no aparecen, usá la Opción B.

### Opción B — Servidor local (recomendado)

Si tenés **Python** instalado (viene por defecto en macOS y Linux):

```bash
# Desde la carpeta del proyecto:
python3 -m http.server 8080
```

Luego abrí en el navegador: [http://localhost:8080](http://localhost:8080)

Si tenés **Node.js**:

```bash
npx serve .
```

### Opción C — GitHub Pages (online, sin instalación)

La aplicación está desplegada en:  
🔗 `[completar con URL del repo]`

---

## Estructura de archivos

```
/
├── index.html        # Interfaz de usuario completa
├── engine.js         # Motor de cálculo termodinámico (ISA + Otto + Diesel + Sabathé)
├── geometry.js       # Predimensionamiento geométrico del motor
├── charts.js         # Visualización con Plotly.js (p-v, T-s, paramétrico, comparación)
├── ui.js             # Controlador de interfaz (eventos, alertas, render)
├── PROMPTS.md        # Trazabilidad del uso de IA (requerido por el TP)
└── README.md         # Este archivo
```

---

## Uso de la aplicación

### Panel de entradas (columna izquierda)

| Campo | Descripción | Valor por defecto (Grupo 1) |
|-------|-------------|----------------------------|
| Altitud | Altura de operación ISA | 4 000 ft |
| Potencia P_ef | Potencia efectiva requerida | 75 HP |
| RPM | Régimen de diseño | 2 275 rpm |
| N° cilindros | Número de cilindros | 4 |
| η_mec | Rendimiento mecánico asumido | 0.90 |
| Tipo de ciclo | Otto / Diesel / Sabathé | Otto |
| r | Relación de compresión (slider) | 6.3 |
| k | Coeficiente isentrópico | 1.40 |
| Combustible | C₆H₁₄ / C₇H₁₆ / C₈H₁₈ | Isoctano (C₈H₁₈) |
| ϕ | Mezcla relativa | 0.80 |

> El campo **α (fracción isocórica)** aparece solo cuando se selecciona el ciclo Sabathé.

### Resultados

- **Tabla de estados:** T, p, v en cada punto del ciclo. Las celdas se marcan en rojo si T > 2 500 K o p > 100 bar.
- **Tarjetas de desempeño:** η, W_neto, PME, Q_in, Q_out, T_max, p_max.
- **Geometría calculada:** V_d total, V_d por cilindro, diámetro D, carrera S, volumen de cámara V_cc.
- **Referencia C-75:** valores reales del motor para comparación directa.

### Gráficos (pestañas)

| Pestaña | Contenido |
|---------|-----------|
| **p-v** | Diagrama presión-volumen con área sombreada. Toggle de escala logarítmica. |
| **T-s** | Diagrama temperatura-entropía. Isentrópicos como líneas verticales exactas. |
| **Análisis r** | Curvas η y PME vs. r (izq.) + T_max vs. r con límite de 2 500 K (der.). |
| **Comparación** | Los 3 ciclos superpuestos en un mismo diagrama p-v. |

---

## Verificación rápida

Para confirmar que la aplicación funciona correctamente, ingresá estos valores y verificá los resultados:

**Caso analítico (libro):**
- h = 0 ft, r = 8, ciclo Otto, Qin manual ≈ 2 000 kJ/kg
- η esperado: `1 − 1/8^0.4 = 56.47 %`

**Caso de misión (Grupo 1):**
- h = 4 000 ft, r = 6.3, ciclo Otto, C₈H₁₈, ϕ = 0.80
- T₁ = 280.23 K · p₁ = 87 516 Pa · η = 52.11 % · PME = 15.06 bar

---

## Tecnologías utilizadas

- **JavaScript ES6** puro — sin frameworks ni bundlers
- **Plotly.js 2.32** (cargado desde CDN) — gráficos interactivos
- **HTML5 + CSS3** — interfaz responsiva
- **Fuentes:** Barlow + Barlow Condensed + JetBrains Mono (Google Fonts)

---

## Notas técnicas

- Todos los módulos de cálculo (`engine.js`, `geometry.js`) son **funciones puras**: sin estado global, sin acceso al DOM, verificables de forma aislada.
- Las condiciones iniciales se calculan con la **ecuación barométrica ISA integrada** (no tabla interpolada).
- El rendimiento se calcula por **expresión analítica exacta** y se verifica por balance energético; la diferencia debe ser < 10⁻⁶.
- El diagrama T-s implementa correctamente los procesos isentrópicos como **líneas verticales** (s = constante).

---

*Cátedra de Propulsión · Ingeniería Aeronáutica · UTN Facultad Regional Haedo · 2026*
