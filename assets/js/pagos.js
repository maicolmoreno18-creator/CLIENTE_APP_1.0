/* ============================================
   ClienteAPP — Módulo de Pagos por Etapas
   ============================================ */

window.Pagos = {

  _visibles: 10, // Clientes visibles en la página de pagos

  // ── Etapas estándar de pago ───────────────────────────────────────────────
  ETAPAS: [
    { key: 'firma',      label: 'Firma del Contrato',    porcentaje: 50 },
    { key: 'materiales', label: 'Descarga de Materiales', porcentaje: 40 },
    { key: 'techo',      label: 'Instalación del Techo',  porcentaje: 10 }
  ],

  // ── Crear etapas al crear proyecto ────────────────────────────────────────
  async crearEtapasProyecto(proyecto) {
    for (const etapa of this.ETAPAS) {
      const valorEtapa = Math.round(proyecto.precio * etapa.porcentaje / 100);
      await DB.put(DB.STORES.pagos, {
        id:          DB.generateId(),
        clienteId:   proyecto.clienteId,
        proyectoId:  proyecto.id,
        etapa:       etapa.key,
        etapaLabel:  etapa.label,
        porcentaje:  etapa.porcentaje,
        valorTotal:  valorEtapa,
        valorPagado: 0,
        estado:      'pendiente',
        fecha:       null,
        observaciones: ''
      });
    }

    // Etapa placa si aplica
    if (proyecto.incluyePlaca && proyecto.placaPrecio > 0) {
      await DB.put(DB.STORES.pagos, {
        id:          DB.generateId(),
        clienteId:   proyecto.clienteId,
        proyectoId:  proyecto.id,
        etapa:       'placa',
        etapaLabel:  'Placa de Cimentación',
        porcentaje:  100,
        valorTotal:  proyecto.placaPrecio,
        valorPagado: 0,
        estado:      'pendiente',
        fecha:       null,
        observaciones: '',
        esPlaca:     true
      });
    }
  },

  // ── Actualizar valorTotal de etapas cuando cambia el precio ─────────────
  // Solo recalcula etapas que NO están completamente pagadas
  // Las que ya tienen pago parcial se actualizan en valorTotal pero se
  // conserva valorPagado y estado para no perder el historial
  async actualizarEtapasProyecto(proyecto) {
    const etapas = await DB.getByIndex(DB.STORES.pagos, 'proyectoId', proyecto.id);
    if (etapas.length === 0) return;

    for (const etapa of etapas) {
      // Etapa de placa: actualizar con el nuevo precio de placa
      if (etapa.esPlaca) {
        const nuevoTotal = proyecto.incluyePlaca ? (proyecto.placaPrecio || 0) : etapa.valorTotal;
        if (etapa.valorTotal !== nuevoTotal) {
          etapa.valorTotal = nuevoTotal;
          // Recalcular estado según lo pagado vs nuevo total
          etapa.estado = this._calcularEstado(etapa.valorPagado, nuevoTotal);
          await DB.put(DB.STORES.pagos, etapa);
        }
        continue;
      }

      // Etapas normales: recalcular según porcentaje del nuevo precio
      const nuevoTotal = Math.round(proyecto.precio * etapa.porcentaje / 100);
      if (etapa.valorTotal !== nuevoTotal) {
        etapa.valorTotal = nuevoTotal;
        etapa.estado     = this._calcularEstado(etapa.valorPagado, nuevoTotal);
        await DB.put(DB.STORES.pagos, etapa);
      }
    }
  },

  // ── Calcular estado según lo pagado vs total ──────────────────────────────
  _calcularEstado(valorPagado, valorTotal) {
    if (!valorPagado || valorPagado <= 0) return 'pendiente';
    if (valorPagado >= valorTotal)        return 'pagado';
    return 'parcial';
  },

  // ── Renderizar página de pagos ────────────────────────────────────────────
  async render() {
    this._visibles = 10; // Reset paginación al navegar
    const content = document.getElementById('pageContent');
    content.innerHTML = UI.spinner('Cargando pagos...');

    const pagos    = await DB.getAll(DB.STORES.pagos);
    const clientes = await DB.getAll(DB.STORES.clientes);
    const clienteMap = Object.fromEntries(clientes.map(c => [c.id, c]));

    // Agrupar por cliente
    const porCliente = {};
    for (const p of pagos) {
      if (!porCliente[p.clienteId]) porCliente[p.clienteId] = [];
      porCliente[p.clienteId].push(p);
    }

    const pendientes = pagos.filter(p => p.estado !== 'pagado').length;
    document.getElementById('badgePagos').textContent = pendientes || '';

    content.innerHTML = `
      <div class="fade-in">

        <!-- Resumen -->
        <div class="row g-3 mb-4">
          ${this._resumenCards(pagos)}
        </div>

        <!-- Por cliente -->
        ${Object.keys(porCliente).length === 0
          ? UI.emptyState('bi-cash-stack', 'No hay pagos registrados', 'Los pagos se generan automáticamente al crear un proyecto')
          : (() => {
              const entries = Object.entries(porCliente);
              const visibles = entries.slice(0, this._visibles);
              const hayMas = entries.length > this._visibles;
              return visibles.map(([cId, cPagos]) =>
                this._clientePagosCard(clienteMap[cId], cPagos)
              ).join('') + (hayMas ? `
                <div class="text-center mt-4">
                  <button class="btn btn-outline-primary px-4 py-2 fw-semibold" onclick="Pagos._cargarMas()" style="border-radius:12px;">
                    <i class="bi bi-arrow-down-circle me-2"></i>Cargar más (${entries.length - this._visibles} clientes restantes)
                  </button>
                </div>` : '');
            })()
        }
      </div>`;
  },

  // ── Cargar más clientes en pagos ──────────────────────────────────────────
  async _cargarMas() {
    this._visibles += 10;
    await this.render();
  },

  // ── Cards de resumen ──────────────────────────────────────────────────────
  _resumenCards(pagos) {
    const totalEsperado = pagos.reduce((s, p) => s + (p.valorTotal || 0), 0);
    const totalRecibido = pagos.reduce((s, p) => s + (p.valorPagado || 0), 0);
    const pendiente     = totalEsperado - totalRecibido;
    const porcentaje    = totalEsperado > 0 ? Math.round(totalRecibido / totalEsperado * 100) : 0;

    const cards = [
      {
        icon: 'bi-cash-stack', color: '#2d6a9f', bg: '#eff6ff',
        valor: UI.formatCurrency(totalEsperado), label: 'Total Esperado'
      },
      {
        icon: 'bi-check-circle-fill', color: '#16a34a', bg: '#f0fdf4',
        valor: UI.formatCurrency(totalRecibido), label: 'Recibido'
      },
      {
        icon: 'bi-hourglass-split', color: '#d97706', bg: '#fffbeb',
        valor: UI.formatCurrency(pendiente), label: 'Por Cobrar'
      },
      {
        icon: 'bi-percent', color: '#0891b2', bg: '#ecfeff',
        valor: `${porcentaje}%`, label: 'Cobrado',
        progress: porcentaje
      }
    ];

    return cards.map(c => `
      <div class="col-6 col-lg-3">
        <div class="card border-0 shadow-sm h-100" style="border-radius:14px;overflow:hidden;">
          <div class="card-body p-3">
            <div class="d-flex align-items-center gap-3 mb-2">
              <div class="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                   style="width:44px;height:44px;background:${c.bg};">
                <i class="bi ${c.icon}" style="font-size:20px;color:${c.color};"></i>
              </div>
              <div class="min-w-0">
                <div class="fw-bold text-truncate" style="font-size:16px;color:#1e293b;">${c.valor}</div>
                <div class="text-muted" style="font-size:12px;">${c.label}</div>
              </div>
            </div>
            ${c.progress !== undefined ? `
              <div class="progress mt-1" style="height:5px;border-radius:3px;">
                <div class="progress-bar" style="width:${c.progress}%;background:${c.color};border-radius:3px;"></div>
              </div>` : ''}
          </div>
          <div style="height:3px;background:${c.color};opacity:0.6;"></div>
        </div>
      </div>`).join('');
  },

  // ── Card de pagos por cliente ─────────────────────────────────────────────
  _clientePagosCard(cliente, pagos) {
    if (!cliente) return '';
    const nombre = UI.escapeHTML(cliente.nombre);
    const totalEsperado = pagos.reduce((s, p) => s + (p.valorTotal || 0), 0);
    const totalPagado   = pagos.reduce((s, p) => s + (p.valorPagado || 0), 0);
    const pct = totalEsperado > 0 ? Math.round(totalPagado / totalEsperado * 100) : 0;
    const colorBarra = pct === 100 ? '#10b981' : pct > 50 ? '#2d6a9f' : '#f59e0b';

    return `
      <div class="card border-0 shadow-sm mb-4" style="border-radius:18px;overflow:hidden;">

        <!-- Header del cliente -->
        <div class="p-4" style="background:linear-gradient(135deg,#0f1f30,#1a3c5e);">
          <div class="d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div class="d-flex align-items-center gap-3">
              <div class="cliente-avatar flex-shrink-0"
                   style="width:48px;height:48px;font-size:17px;border-radius:14px;
                          border:2px solid rgba(255,255,255,0.2);">
                ${UI.initials(cliente.nombre)}
              </div>
              <div>
                <h6 class="fw-bold text-white mb-1">${nombre}</h6>
                ${UI.estadoBadge(cliente.estado)}
              </div>
            </div>
            <div class="text-end">
              <div class="fw-bold text-white" style="font-size:15px;">
                ${UI.formatCurrency(totalPagado)}
                <span class="text-white opacity-50 fw-normal" style="font-size:13px;">
                  / ${UI.formatCurrency(totalEsperado)}
                </span>
              </div>
              <small class="text-white opacity-60">${pct}% cobrado</small>
            </div>
          </div>

          <!-- Barra de progreso global -->
          <div class="mt-3" style="background:rgba(255,255,255,0.15);border-radius:8px;height:8px;overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:${colorBarra};
                        border-radius:8px;transition:width 0.8s ease;"></div>
          </div>
        </div>

        <!-- Etapas -->
        <div class="p-4" style="background:#f8fafc;">
          <div class="row g-3">
            ${pagos.map(p => this._etapaCard(p)).join('')}
          </div>
        </div>
      </div>`;
  },

  // ── Card de etapa ─────────────────────────────────────────────────────────
  _etapaCard(p) {
    const pct = p.valorTotal > 0 ? Math.round(p.valorPagado / p.valorTotal * 100) : 0;

    const estadoConfig = {
      pagado:   { color: '#10b981', bg: '#f0fdf4', border: '#86efac', icon: 'bi-check-circle-fill',  label: 'Pagado'  },
      parcial:  { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', icon: 'bi-arrow-repeat',        label: 'Parcial' },
      pendiente:{ color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0', icon: 'bi-hourglass-split',     label: 'Pendiente'}
    };
    const cfg = estadoConfig[p.estado] || estadoConfig.pendiente;

    return `
      <div class="col-md-4">
        <div class="card border-0 h-100"
             style="border-radius:14px;border:1.5px solid ${cfg.border} !important;
                    background:${cfg.bg};transition:transform 0.2s,box-shadow 0.2s;"
             onmouseenter="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(0,0,0,0.1)'"
             onmouseleave="this.style.transform='';this.style.boxShadow=''">
          <div class="card-body p-3 d-flex flex-column gap-2">

            <!-- Título + estado -->
            <div class="d-flex align-items-start justify-content-between gap-2">
              <div>
                <div class="fw-bold small">${p.etapaLabel}</div>
                ${p.esPlaca
                  ? '<span class="badge bg-warning text-dark" style="font-size:10px;">Placa</span>'
                  : `<span class="badge" style="background:#e2e8f0;color:#475569;font-size:10px;">${p.porcentaje}% del total</span>`}
              </div>
              <span class="badge d-flex align-items-center gap-1 flex-shrink-0"
                    style="background:${cfg.color}20;color:${cfg.color};border:1px solid ${cfg.color}40;font-size:11px;">
                <i class="bi ${cfg.icon}"></i>${cfg.label}
              </span>
            </div>

            <!-- Montos -->
            <div class="d-flex align-items-end justify-content-between">
              <div>
                <div class="fw-bold" style="font-size:15px;color:${cfg.color};">
                  ${UI.formatCurrency(p.valorPagado)}
                </div>
                <div class="text-muted" style="font-size:11px;">
                  de ${UI.formatCurrency(p.valorTotal)}
                </div>
              </div>
              <div class="fw-bold" style="font-size:22px;color:${cfg.color};opacity:0.4;line-height:1;">
                ${pct}%
              </div>
            </div>

            <!-- Barra de progreso -->
            <div style="background:rgba(0,0,0,0.08);border-radius:6px;height:6px;overflow:hidden;">
              <div style="height:100%;width:${pct}%;background:${cfg.color};
                          border-radius:6px;transition:width 0.8s ease;"></div>
            </div>

            <!-- Fecha -->
            ${p.fecha ? `
              <div class="text-muted d-flex align-items-center gap-1" style="font-size:11px;">
                <i class="bi bi-calendar-check"></i>
                ${UI.formatDate(p.fecha)}
              </div>` : ''}

            <!-- Botón -->
            <button class="btn btn-sm w-100 fw-semibold mt-auto"
                    style="border-radius:10px;background:${cfg.color};color:white;border:none;font-size:12px;"
                    onclick="Pagos.abrirModalPago('${p.id}')">
              <i class="bi bi-cash me-1"></i>
              ${p.estado === 'pagado' ? 'Ver / Editar' : 'Registrar Pago'}
            </button>
          </div>
        </div>
      </div>`;
  },

  // ── Renderizar etapas en expediente ───────────────────────────────────────
  async renderEtapasExpediente(clienteId, proyectoId) {
    const pagos = await DB.getByIndex(DB.STORES.pagos, 'clienteId', clienteId);
    const proyPagos = proyectoId ? pagos.filter(p => p.proyectoId === proyectoId) : pagos;

    if (proyPagos.length === 0) {
      return `<div class="text-center py-4 text-muted">
        <i class="bi bi-cash-stack fs-2 d-block mb-2 opacity-50"></i>
        <small>No hay etapas de pago. Crea un proyecto primero.</small>
      </div>`;
    }

    const totalEsperado = proyPagos.reduce((s, p) => s + (p.valorTotal || 0), 0);
    const totalPagado   = proyPagos.reduce((s, p) => s + (p.valorPagado || 0), 0);
    const pct = totalEsperado > 0 ? Math.round(totalPagado / totalEsperado * 100) : 0;
    const colorBarra = pct === 100 ? '#10b981' : pct > 60 ? '#3b82f6' : pct > 0 ? '#f59e0b' : '#e2e8f0';

    return `
      <div>
        <!-- Resumen global -->
        <div class="rounded-3 p-3 mb-3" style="background:#f8fafc;border:1.5px solid #e2e8f0;">
          <div class="d-flex align-items-center justify-content-between mb-2">
            <span class="fw-semibold small text-muted text-uppercase" style="letter-spacing:0.5px;">
              <i class="bi bi-graph-up-arrow me-1"></i>Progreso total
            </span>
            <span class="fw-bold" style="font-size:13px;color:${colorBarra};">${pct}%</span>
          </div>
          <div style="background:#e9ecef;border-radius:8px;height:8px;overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:${colorBarra};
                        border-radius:8px;transition:width 1s ease;"></div>
          </div>
          <div class="d-flex justify-content-between mt-2">
            <span class="text-muted" style="font-size:11px;">
              Pagado: <strong style="color:#10b981;">${UI.formatCurrency(totalPagado)}</strong>
            </span>
            <span class="text-muted" style="font-size:11px;">
              Total: <strong>${UI.formatCurrency(totalEsperado)}</strong>
            </span>
          </div>
        </div>

        <!-- Lista de etapas -->
        <div class="d-flex flex-column gap-2">
          ${proyPagos.map(p => this._etapaRowExpediente(p)).join('')}
        </div>
      </div>`;
  },

  // ── Fila de etapa para el expediente (diseño limpio horizontal) ──────────
  _etapaRowExpediente(p) {
    const pct = p.valorTotal > 0 ? Math.round(p.valorPagado / p.valorTotal * 100) : 0;

    const cfg = {
      pagado:    { color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0', icon: 'bi-check-circle-fill',  label: 'Pagado'   },
      parcial:   { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', icon: 'bi-arrow-repeat',        label: 'Parcial'  },
      pendiente: { color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0', icon: 'bi-hourglass-split',     label: 'Pendiente'}
    }[p.estado] || { color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0', icon: 'bi-hourglass-split', label: 'Pendiente' };

    return `
      <div style="background:${cfg.bg};border:1.5px solid ${cfg.border};border-radius:12px;
                  padding:12px 14px;transition:transform 0.2s,box-shadow 0.2s;"
           onmouseenter="this.style.transform='translateX(3px)';this.style.boxShadow='0 4px 14px rgba(0,0,0,0.08)'"
           onmouseleave="this.style.transform='';this.style.boxShadow=''">

        <!-- Fila superior: nombre + badge estado + botón -->
        <div class="d-flex align-items-center justify-content-between gap-2 mb-2">
          <div class="d-flex align-items-center gap-2 min-w-0">
            <div style="width:32px;height:32px;border-radius:8px;background:${cfg.color}18;
                        display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <i class="bi ${cfg.icon}" style="color:${cfg.color};font-size:14px;"></i>
            </div>
            <div class="min-w-0">
              <div class="fw-semibold text-truncate" style="font-size:13px;">${p.etapaLabel}</div>
              <div class="text-muted" style="font-size:11px;">
                ${p.esPlaca ? 'Placa independiente' : `${p.porcentaje}% del contrato`}
              </div>
            </div>
          </div>
          <div class="d-flex align-items-center gap-2 flex-shrink-0">
            <span style="background:${cfg.color}18;color:${cfg.color};border:1px solid ${cfg.color}30;
                         border-radius:20px;padding:2px 10px;font-size:11px;font-weight:700;white-space:nowrap;">
              ${cfg.label}
            </span>
            <button class="btn btn-sm fw-semibold"
                    style="border-radius:8px;background:${cfg.color};color:white;border:none;
                           font-size:11px;padding:4px 10px;white-space:nowrap;"
                    onclick="Pagos.abrirModalPago('${p.id}')">
              <i class="bi bi-cash me-1"></i>${p.estado === 'pagado' ? 'Editar' : 'Registrar'}
            </button>
          </div>
        </div>

        <!-- Fila inferior: montos + barra -->
        <div class="d-flex align-items-center gap-3">
          <div style="flex:1;">
            <div style="background:rgba(0,0,0,0.07);border-radius:6px;height:5px;overflow:hidden;">
              <div style="height:100%;width:${pct}%;background:${cfg.color};
                          border-radius:6px;transition:width 1s ease;"></div>
            </div>
          </div>
          <div class="text-end flex-shrink-0" style="min-width:130px;">
            <span class="fw-bold" style="font-size:13px;color:${cfg.color};">
              ${UI.formatCurrency(p.valorPagado)}
            </span>
            <span class="text-muted" style="font-size:11px;">
              / ${UI.formatCurrency(p.valorTotal)}
            </span>
            <span class="fw-bold ms-1" style="font-size:11px;color:${cfg.color};opacity:0.7;">${pct}%</span>
          </div>
        </div>

        ${p.fecha ? `
        <div class="mt-1" style="font-size:10px;color:#94a3b8;">
          <i class="bi bi-calendar-check me-1"></i>${UI.formatDate(p.fecha)}
        </div>` : ''}
      </div>`;
  },

  // ── Abrir modal pago ──────────────────────────────────────────────────────
  async abrirModalPago(pagoId) {
    const p = await DB.get(DB.STORES.pagos, pagoId);
    if (!p) return;

    document.getElementById('pagoId').value            = p.id;
    document.getElementById('pagoClienteId').value     = p.clienteId;
    document.getElementById('pagoEtapa').value         = p.etapa;
    document.getElementById('pagoEtapaNombre').value   = p.etapaLabel;
    document.getElementById('pagoValorTotal').value    = p.valorTotal || 0;
    document.getElementById('pagoValor').value         = p.valorPagado || '';
    document.getElementById('pagoValor').max           = p.valorTotal || '';
    document.getElementById('pagoFecha').value         = p.fecha ? p.fecha.split('T')[0] : new Date().toISOString().split('T')[0];
    document.getElementById('pagoEstado').value        = p.estado || 'pendiente';
    document.getElementById('pagoObservaciones').value = p.observaciones || '';

    // Mostrar hint con el máximo permitido
    const hint = document.getElementById('pagoValorHint');
    if (hint && p.valorTotal) {
      hint.innerHTML = `<i class="bi bi-info-circle me-1 text-primary"></i>
        Máximo permitido: <strong>${UI.formatCurrency(p.valorTotal)}</strong>`;
    }

    // Actualizar estado automáticamente al cambiar el valor
    const inputValor  = document.getElementById('pagoValor');
    const selectEstado = document.getElementById('pagoEstado');
    inputValor.oninput = () => {
      const v = parseFloat(inputValor.value) || 0;
      const t = parseFloat(p.valorTotal) || 0;
      if (v <= 0)    selectEstado.value = 'pendiente';
      else if (v >= t) selectEstado.value = 'pagado';
      else           selectEstado.value = 'parcial';
    };

    // Si el expediente está abierto, cerrarlo primero para evitar modales apilados
    const expedienteEl = document.getElementById('modalExpediente');
    const expedienteInstance = bootstrap.Modal.getInstance(expedienteEl);
    if (expedienteInstance && expedienteEl.classList.contains('show')) {
      document.getElementById('pagoClienteId').dataset.reopenExpediente = p.clienteId;
      expedienteInstance.hide();
      expedienteEl.addEventListener('hidden.bs.modal', function abrirPagoTrasExpediente() {
        expedienteEl.removeEventListener('hidden.bs.modal', abrirPagoTrasExpediente);
        UI.openModal('modalPago');
      }, { once: true });
    } else {
      document.getElementById('pagoClienteId').dataset.reopenExpediente = '';
      UI.openModal('modalPago');
    }
  },

  // ── Guardar pago ──────────────────────────────────────────────────────────
  async guardar() {
    const id         = document.getElementById('pagoId').value;
    const valor      = parseFloat(document.getElementById('pagoValor').value);
    const fecha      = document.getElementById('pagoFecha').value;
    const estado     = document.getElementById('pagoEstado').value;
    const valorTotal = parseFloat(document.getElementById('pagoValorTotal').value) || 0;

    if (!valor || !fecha) {
      UI.toast('Valor y fecha son obligatorios', 'warning');
      return;
    }

    // Limitante: no permitir pagar más del total de la etapa
    if (valorTotal > 0 && valor > valorTotal) {
      UI.toast(
        `El máximo para esta etapa es ${UI.formatCurrency(valorTotal)}. No puedes registrar más.`,
        'warning', 6000
      );
      return;
    }

    const existing = await DB.get(DB.STORES.pagos, id);
    if (!existing) return;

    existing.valorPagado   = valor;
    existing.fecha         = fecha;
    existing.estado        = estado;
    existing.observaciones = document.getElementById('pagoObservaciones').value.trim();

    await DB.put(DB.STORES.pagos, existing);

    // Leer si hay que reabrir el expediente
    const reopenId = document.getElementById('pagoClienteId').dataset.reopenExpediente || '';

    UI.closeModal('modalPago');

    const etapaLabel = existing.etapaLabel;
    UI.toast(`Pago registrado: ${etapaLabel}`, 'cash');

    if (estado === 'pagado') {
      setTimeout(() => UI.toast(`Etapa "${etapaLabel}" completada al 100%`, 'success', 5000), 600);
    }

    App.updateBadges();

    // Reabrir expediente si venía de ahí, y refrescar páginas activas
    if (reopenId) {
      const modalPagoEl = document.getElementById('modalPago');
      modalPagoEl.addEventListener('hidden.bs.modal', async function reabrirExpediente() {
        modalPagoEl.removeEventListener('hidden.bs.modal', reabrirExpediente);
        await Clientes.abrirExpediente(reopenId);
      }, { once: true });
    }

    // Siempre refrescar páginas activas con datos frescos
    if (App.currentPage === 'pagos')     await Pagos.render();
    if (App.currentPage === 'dashboard') await Dashboard.render();
  }
};

document.getElementById('btnGuardarPago')?.addEventListener('click', () => Pagos.guardar());
