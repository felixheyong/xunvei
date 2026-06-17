/**
 * TR34 Ground Bearing Slab Calculation Engine
 * =============================================
 * Implements Concrete Society Technical Report 34 (4th Edition, 2013)
 * "Concrete Industrial Ground Floors — A Guide to Design and Construction"
 *
 * Covers:
 *   - Joint-free / jointed plain concrete ground-bearing slabs
 *   - Point loads (single / dual interacting wheels)
 *   - Uniformly distributed loads (UDL)
 *   - Load transfer at joints / free edges
 *   - Dowel / tie-bar design for joints
 *   - Punching shear at load face and critical perimeter (2d)
 *
 * All units: SI (mm, kN, N/mm², etc.) unless noted otherwise.
 *
 * Created for use with ground_slab_calculator.html and
 * ground_slab_calculator_visual.html.
 * Also usable as a standalone module for any TR34-compliant slab check.
 *
 * @version 1.1
 * @license MIT
 */

// ============================================================================
//  SECTION 1 — CONCRETE PROPERTIES
// ============================================================================

/**
 * Mean flexural tensile strength of concrete (TR34 §8.3.1, Eq 8.1)
 * fctm,fl = 0.3 × fck^(2/3)   [MPa]
 *
 * @param {number} fck — characteristic cylinder compressive strength [MPa]
 * @returns {number} fctm,fl [MPa]
 */
function fctm_fl(fck) {
  return 0.3 * Math.pow(fck, 2 / 3);
}

/**
 * Design concrete compressive strength at ULS
 * fcd = fck / γc   (γc = 1.5 per EC2)
 *
 * @param {number} fck — characteristic cylinder strength [MPa]
 * @param {number} [gammaC=1.5] — partial safety factor for concrete
 * @returns {number} fcd [MPa]
 */
function fcd(fck, gammaC) {
  gammaC = gammaC || 1.5;
  return fck / gammaC;
}

// ============================================================================
//  SECTION 2 — RADIUS OF RELATIVE STIFFNESS (l)
// ============================================================================

/**
 * Radius of relative stiffness — Meyerhof (point loads)
 * l = [ E·h³ / (12·(1 − ν²)·K) ] ^ 0.25
 *
 * This governs the "zone of influence" of a point load on a slab-on-grade.
 * Used for all wheel / point load calculations.
 *
 * @param {number} E — elastic modulus [N/mm²]
 * @param {number} h — slab thickness [mm]
 * @param {number} nu — Poisson's ratio (typically 0.15–0.2 for concrete)
 * @param {number} K — modulus of subgrade reaction [N/mm³]
 * @returns {number} l — radius of relative stiffness [mm]
 */
function calc_l(E, h, nu, K) {
  return Math.pow(E * Math.pow(h, 3) / (12 * (1 - nu * nu) * K), 0.25);
}

/**
 * Radius of relative stiffness — Westergaard (UDL / strip loads)
 * l_udl = [ E·h³ / (3·K) ] ^ 0.25
 *
 * Note: Westergaard does NOT include the (1 − ν²) term because
 * the slab is treated as a wide beam (plane strain → different flexural rigidity).
 *
 * @param {number} E — elastic modulus [N/mm²]
 * @param {number} h — slab thickness [mm]
 * @param {number} K — modulus of subgrade reaction [N/mm³]
 * @returns {number} l_udl — UDL radius of relative stiffness [mm]
 */
function calc_l_udl(E, h, K) {
  return Math.pow(E * Math.pow(h, 3) / (3 * K), 0.25);
}

// ============================================================================
//  SECTION 3 — EQUIVALENT CONTACT RADIUS
// ============================================================================

/**
 * Equivalent circular contact radius for a rectangular baseplate.
 * a = √(b × d / π)   where b = width, d = length of baseplate.
 *
 * @param {number} b — baseplate width [mm]
 * @param {number} d — baseplate length (depth direction) [mm]
 * @returns {number} a — equivalent radius [mm]
 */
function contactRadius(b, d) {
  return Math.sqrt(b * d / Math.PI);
}

/**
 * Equivalent contact radius for double (interacting) loads.
 *
 * Two identical loads spaced D mm apart (centre-to-centre) are treated as
 * independent if D > 2 × 0.9 × l (i.e., their stress bulbs do not overlap).
 * Otherwise they are combined into a single equivalent loaded area of
 * width 2b + D and length d.
 *
 * @param {number} b — single baseplate width [mm]
 * @param {number} d — single baseplate length [mm]
 * @param {number} D — centre-to-centre spacing of the two loads [mm]
 * @param {number} l — radius of relative stiffness [mm]
 * @returns {number} a_equiv — equivalent radius [mm]
 */
function contactRadiusDouble(b, d, D, l) {
  if (D > 2 * 0.9 * l) {
    // Independent — return single radius
    return contactRadius(b, d);
  }
  // Interacting — combined equivalent area
  return Math.sqrt((2 * b + D) * d / Math.PI);
}

// ============================================================================
//  SECTION 4 — FLEXURAL (BENDING) CAPACITY
// ============================================================================

/**
 * Flexural capacity — Internal location, a/l = 0 (point load at "centre")
 * Pu,0 = 2π × (Mn + Mp)
 *
 * TR34 Eq 8.4a — Meyerhof yield-line solution.
 *
 * @param {number} Mn — negative (hogging) moment capacity [kN·m/m]
 * @param {number} Mp — positive (sagging) moment capacity [kN·m/m]
 * @returns {number} Pu — ultimate point load capacity [kN]
 */
function Pu_int_a0(Mn, Mp) {
  return 2 * Math.PI * (Mn + Mp);
}

/**
 * Flexural capacity — Internal location, a/l ≥ 0.2
 * Pu = 4π × (Mn + Mp) / (1 − a/(3l))
 *
 * TR34 Eq 8.4b.
 *
 * @param {number} Mn — negative moment capacity [kN·m/m]
 * @param {number} Mp — positive moment capacity [kN·m/m]
 * @param {number} a_over_l — ratio a/l (≥ 0.2)
 * @returns {number} Pu [kN]
 */
function Pu_int_a02(Mn, Mp, a_over_l) {
  return 4 * Math.PI * (Mn + Mp) / (1 - a_over_l / 3);
}

/**
 * Flexural capacity — Free edge, a/l = 0
 * Pu = [π × (Mn + Mp) + 4 × Mp] / 2
 *
 * TR34 Eq 8.5a.
 *
 * @param {number} Mn — negative moment capacity [kN·m/m]
 * @param {number} Mp — positive moment capacity [kN·m/m]
 * @returns {number} Pu [kN]
 */
function Pu_edge_a0(Mn, Mp) {
  return (Math.PI * (Mn + Mp) + 4 * Mp) / 2;
}

/**
 * Flexural capacity — Free edge, a/l ≥ 0.2
 * Pu = [π × (Mn + Mp) + 4 × Mp] / (1 − 2a/(3l))
 *
 * TR34 Eq 8.5b.
 *
 * @param {number} Mn — negative moment capacity [kN·m/m]
 * @param {number} Mp — positive moment capacity [kN·m/m]
 * @param {number} a_over_l — ratio a/l (≥ 0.2)
 * @returns {number} Pu [kN]
 */
function Pu_edge_a02(Mn, Mp, a_over_l) {
  return (Math.PI * (Mn + Mp) + 4 * Mp) / (1 - 2 * a_over_l / 3);
}

/**
 * Interpolate flexural capacity Pu for a given a/l ratio.
 *
 * TR34 uses a stepwise approach:
 *   a/l = 0   → use Pu_0
 *   a/l ≥ 0.2 → use Pu_0.2 (with actual a/l)
 *   0 < a/l < 0.2 → linear interpolation between the two
 *
 * @param {number} a_over_l — contact radius / radius of relative stiffness
 * @param {number} Mn — negative moment capacity [kN·m/m]
 * @param {number} Mp — positive moment capacity [kN·m/m]
 * @param {boolean} isEdge — true if load near free edge / joint
 * @returns {number} Pu [kN]
 */
function interpolatePu(a_over_l, Mn, Mp, isEdge) {
  var pu0, pu02;
  if (isEdge) {
    pu0  = Pu_edge_a0(Mn, Mp);
    pu02 = Pu_edge_a02(Mn, Mp, 0.2);
  } else {
    pu0  = Pu_int_a0(Mn, Mp);
    pu02 = Pu_int_a02(Mn, Mp, 0.2);
  }
  if (a_over_l <= 0) return pu0;
  if (a_over_l >= 0.2) {
    return isEdge ? Pu_edge_a02(Mn, Mp, a_over_l)
                  : Pu_int_a02(Mn, Mp, a_over_l);
  }
  // Linear interpolation: 0 → 0.2
  return pu0 + (a_over_l / 0.2) * (pu02 - pu0);
}

// ============================================================================
//  SECTION 5 — PUNCHING SHEAR
// ============================================================================

/**
 * Punching shear capacity at the loaded area face.
 * Pp,max = v_max × u0 × d_eff / 1000   (→ kN)
 *
 * @param {number} vmax — maximum shear stress resistance [N/mm²]
 * @param {number} u0 — perimeter of loaded area [mm]
 * @param {number} d_eff — effective depth [mm]
 * @returns {number} Pp_max [kN]
 */
function shearAtFace(vmax, u0, d_eff) {
  return vmax * u0 * d_eff / 1000;
}

/**
 * Punching shear capacity at the critical perimeter (2d from load).
 * Pp = v_Rd,c × u1 × d_eff / 1000   (→ kN)
 *
 * @param {number} vRdc — design shear stress resistance [N/mm²]
 * @param {number} u1 — critical perimeter length [mm]
 * @param {number} d_eff — effective depth [mm]
 * @returns {number} Pp [kN]
 */
function shearAtCritical(vRdc, u1, d_eff) {
  return vRdc * u1 * d_eff / 1000;
}

/**
 * Critical perimeter at distance 2d from a rectangular loaded area.
 * u1 = u0 + 4π × d_eff  (the 4 rounded corners at radius 2d each
 * contribute a quarter-circle of radius 2d → one full circle = 4π·d)
 *
 * @param {number} b — width of loaded area [mm]
 * @param {number} d — length of loaded area [mm]
 * @param {number} d_eff — effective slab depth [mm]
 * @returns {number} u1 — critical perimeter [mm]
 */
function criticalPerimeter(b, d, d_eff) {
  return 2 * (b + d) + 4 * Math.PI * d_eff;
}

/**
 * Critical perimeter for double interacting loads.
 *
 * If the clear distance between the inner edges of the two loaded areas
 * exceeds 4d_eff, the perimeters do not overlap → 2 × u1 (independent).
 * Otherwise they are combined into a single enveloping perimeter.
 *
 * @param {number} b — single baseplate width [mm]
 * @param {number} d — single baseplate length [mm]
 * @param {number} D — centre-to-centre wheel spacing [mm]
 * @param {number} d_eff — effective depth [mm]
 * @returns {number} u1_combined — critical perimeter [mm]
 */
function criticalPerimeterDouble(b, d, D, d_eff) {
  var u1_single = criticalPerimeter(b, d, d_eff);
  var u0_single = 2 * (b + d);
  // Clear distance between inner edges ≈ D − u0_single/2
  var clearDist = D - u0_single / 2;
  if (clearDist > 4 * d_eff) {
    // No overlap: two independent perimeters
    return 2 * u1_single;
  }
  // Overlap: enveloping perimeter around both loaded areas
  return 2 * (2 * b + D + d) + 4 * Math.PI * d_eff;
}

// ============================================================================
//  SECTION 6 — LOAD TRANSFER AT JOINTS / FREE EDGES
// ============================================================================

/**
 * Load transfer capacity provided by aggregate interlock, dowels, or
 * adjacent slabs at a joint / free edge.
 *
 * Effective length of slab engaged ≈ 2 × 0.9 × l (on each side of load).
 * Reduction = LT × 2 × 0.9 × l / 1000   [kN]
 * Capped at 50 % of the service load (conservative).
 *
 * @param {number} Fser — serviceability load [kN]
 * @param {number} LT — load transfer capacity [kN/m] (default 0 if no dowels)
 * @param {number} l — radius of relative stiffness [mm]
 * @returns {number} reduction [kN] (amount to add to edge Pu)
 */
function loadTransferReduction(Fser, LT, l) {
  if (!LT || LT <= 0) return 0;
  var reduction = LT * (2 * 0.9 * l) / 1000; // kN
  return Math.min(reduction, Fser * 0.5);
}

// ============================================================================
//  SECTION 7 — DOWEL / TIE-BAR DESIGN AT JOINTS
// ============================================================================

/**
 * Full dowel capacity calculation per TR34 Appendix E.
 *
 * Returns an object with:
 *   - Psh:            shear capacity of dowel bar [kN]
 *   - Pmax:           bearing capacity of concrete around dowel [kN]
 *   - Pburst_unreinf: bursting capacity of concrete cover [kN]
 *   - P_critical:     governing (minimum) capacity [kN]
 *   - ULS_per_m:      ULS capacity per metre of joint width [kN/m]
 *
 * @param {object} params
 *   dw_W   — joint width / gap [mm]
 *   dw_L   — bearing length per side [mm]
 *   dw_Emb — embedment length [mm]
 *   dw_T   — slab thickness at joint [mm]
 *   dw_S   — dowel spacing [mm]
 *   dw_ds  — dowel bar diameter [mm]
 *   dw_e   — edge distance of dowel from slab surface [mm]
 *   fck    — concrete cylinder strength [MPa]
 *   h      — slab thickness [mm]
 * @returns {object} result
 */
function calculateDowel(params) {
  var W   = params.dw_W;
  var L   = params.dw_L;
  var Emb = params.dw_Emb;
  var T   = params.dw_T;
  var S   = params.dw_S;
  var ds  = params.dw_ds;
  var e   = params.dw_e;
  var fck = params.fck;
  var h   = params.h;

  var fcd_val = fcd(fck);           // design concrete strength
  var k3      = 3;                   // bearing factor
  var vRd_ct  = 0.52;               // design shear stress for unreinforced concrete [MPa]
  var d2      = h / 2;              // lever arm to slab centre
  var Wcrit   = W;                  // critical width (joint opening)
  var Abear   = Wcrit * L;          // bearing area
  var Wp_max  = W;                  // max plastic width
  var Scrit1  = Wp_max + 4 * d2;    // critical spacing 1
  var U1      = 2 * Emb + W + 2 * Math.PI * d2; // critical perimeter for bursting

  // Shear capacity of the dowel bar itself
  var Psh = 0.6 * ds * T * W * 0.9 / 1000;   // [kN]

  // Concrete bearing capacity (Meyerhof model)
  var b1 = 2 * e * k3 * fcd_val * W;
  var c1 = 2 * k3 * fcd_val * W * W * T * T * ds;
  var Pmax = 0.5 * (Math.sqrt(b1 * b1 + c1) - b1) / 1000;  // [kN]

  // Bursting capacity (unreinforced)
  var Pburst_unreinf = U1 * d2 * vRd_ct / 1000;  // [kN]

  // Governing capacity
  var P_critical = Math.min(Psh, Pmax, Pburst_unreinf);

  // Per metre of joint
  var ULS_per_m = P_critical / (S / 1000);  // [kN/m]

  return {
    Psh:             Psh,
    Pmax:            Pmax,
    Pburst_unreinf:  Pburst_unreinf,
    P_critical:      P_critical,
    ULS_per_m:       ULS_per_m
  };
}

// ============================================================================
//  SECTION 8 — PULL-OUT CAPACITY (ANCHOR BOLTS INTO SLAB)
// ============================================================================

/**
 * Concrete cone breakout capacity for a single anchor in tension.
 * Per fib Model Code 2010 / EN 1992-4.
 *
 * N_Rd,c = k1 × √fck × hef^1.5 / γc   [N]
 *
 * Simplified — for a full design use a dedicated anchor design tool.
 *
 * @param {number} hef  — effective embedment depth [mm]
 * @param {number} fck  — concrete cylinder strength [MPa]
 * @param {number} [k1=7.5] — factor (7.5 for cracked, 10.5 for uncracked)
 * @param {number} [gammaC=1.5] — partial factor
 * @returns {number} N_Rd,c [kN]
 */
function anchorPullout(hef, fck, k1, gammaC) {
  k1     = k1     || 7.5;
  gammaC = gammaC || 1.5;
  return k1 * Math.sqrt(fck) * Math.pow(hef, 1.5) / gammaC / 1000; // kN
}

// ============================================================================
//  SECTION 9 — SLAB DEFLECTION ESTIMATES
// ============================================================================

/**
 * Approximate central deflection under a point load.
 * δ_central ≈ (P / (K × l²)) × 0.002
 *
 * This is a rule-of-thumb — accurate FEM or Westergaard closed-form
 * solutions should be used for final design.
 *
 * @param {number} P — applied service load [kN]
 * @param {number} K — modulus of subgrade reaction [MN/m³]
 * @param {number} l_m — radius of relative stiffness [m]
 * @returns {number} deflection [mm]
 */
function deflectionCentral(P, K_MNm3, l_m) {
  return (P / (K_MNm3 * l_m * l_m)) * 0.002;
}

/**
 * Edge deflection ≈ 4 × central deflection.
 *
 * @param {number} defl_central — central deflection [mm]
 * @returns {number} edge deflection [mm]
 */
function deflectionEdge(defl_central) {
  return defl_central * 4;
}

// ============================================================================
//  SECTION 10 — UDL CAPACITY
// ============================================================================

/**
 * Allowable uniformly distributed load on a ground-bearing slab.
 * w_allowable = Mn / (0.168 × l_udl²)
 *
 * Based on Westergaard analysis for interior loading on an
 * elastic slab on a Winkler foundation.
 *
 * @param {number} Mn — negative moment capacity [kN·m/m]
 * @param {number} l_udl_m — UDL radius of relative stiffness [m]
 * @returns {number} w_allowable — allowable UDL [kN/m²]
 */
function udlAllowable(Mn, l_udl_m) {
  return Mn / (0.168 * l_udl_m * l_udl_m);
}

// ============================================================================
//  EXPORT — CommonJS / ES Module / Browser global
// ============================================================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    // Concrete properties
    fctm_fl: fctm_fl,
    fcd: fcd,
    // Radius of relative stiffness
    calc_l: calc_l,
    calc_l_udl: calc_l_udl,
    // Contact radius
    contactRadius: contactRadius,
    contactRadiusDouble: contactRadiusDouble,
    // Flexural capacity
    Pu_int_a0: Pu_int_a0,
    Pu_int_a02: Pu_int_a02,
    Pu_edge_a0: Pu_edge_a0,
    Pu_edge_a02: Pu_edge_a02,
    interpolatePu: interpolatePu,
    // Shear
    shearAtFace: shearAtFace,
    shearAtCritical: shearAtCritical,
    criticalPerimeter: criticalPerimeter,
    criticalPerimeterDouble: criticalPerimeterDouble,
    // Load transfer
    loadTransferReduction: loadTransferReduction,
    // Dowel
    calculateDowel: calculateDowel,
    // Anchor
    anchorPullout: anchorPullout,
    // Deflection
    deflectionCentral: deflectionCentral,
    deflectionEdge: deflectionEdge,
    // UDL
    udlAllowable: udlAllowable
  };
}
