/* ============================================
   ClienteAPP — Opciones Personalizables
   Sistemas, cubiertas, ornamentación, puertas, comisión
   ============================================ */

const OPCIONES_KEY = 'clienteapp_opciones';

// Valores por defecto (los que ya tenía la app)
const OPCIONES_DEFAULT = {
  comisionPct: 5,
  sistemas: [
    'Plaqueta',
    'Bloquelon',
    'Mixto (Plaqueta + Bloquelon)'
  ],
  cubiertas: [
    'Eternit',
    'Teja Arquitectónica Azul',
    'Teja Arquitectónica Roja',
    'Teja Arquitectónica Gris',
    'Teja Termoacústica'
  ],
  ornSistemas: [
    'Corredizo',
    'Apertura (abatible)'
  ],
  ornColores: [
    'Negro',
    'Blanco'
  ],
  puertaChapas: [
    'Pomo madera',
    'Pomo metal',
    'Manija recta'
  ]
};

window.Opciones = {

  // ── Leer opciones (mezcla default + personalizadas) ───────────────────────
  get() {
    try {
      const guardadas = JSON.parse(localStorage.getItem(OPCIONES_KEY) || '{}');
      return { ...OPCIONES_DEFAULT, ...guardadas };
    } catch {
      return { ...OPCIONES_DEFAULT };
    }
  },

  // ── Guardar opciones ──────────────────────────────────────────────────────
  save(opciones) {
    localStorage.setItem(OPCIONES_KEY, JSON.stringify(opciones));
  },

  // ── Llenar un select con opciones personalizadas ──────────────────────────
  llenarSelect(selectId, lista, incluirOtro = false) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    const valorActual = sel.value;
    sel.innerHTML = '<option value="">Seleccionar...</option>' +
      lista.map(op => `<option value="${op}">${op}</option>`).join('') +
      (incluirOtro ? '<option value="Otro">Otro</option>' : '');
    // Restaurar valor si sigue existiendo
    if (valorActual) sel.value = valorActual;
  },

  // ── Inicializar todos los selects del modal de proyecto ───────────────────
  inicializarSelects() {
    const op = this.get();
    this.llenarSelect('especSistema',   op.sistemas,    true);
    this.llenarSelect('especCubierta',  op.cubiertas,   true);
    this.llenarSelect('especOrnSistema',op.ornSistemas, false);
    this.llenarSelect('especOrnColor',  op.ornColores,  true);
    this.llenarSelect('especPuertaChapa',op.puertaChapas, true);
  }
};
