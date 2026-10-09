const OPENIMPRES_SECTIONS = {
  'Battery': ['battery_present', 'impres_detected', 'battery.serial', 'battery.kit', 'battery.chemistry', 'battery.charge_percent', 'battery.health_percent', 'battery.voltage_V', 'battery.temperature_C', 'battery.rated_mAh', 'battery.initial_mAh', 'battery.present_mAh', 'battery.potential_mAh', 'battery.recommendations'],
  'History and calibration': ['battery.manufacture_date', 'battery.first_use_date', 'battery.charge_cycles', 'battery.non_impres_cycles', 'battery.calibration_cycles', 'battery.days_since_calibration', 'battery.days_since_removal', 'battery.days_until_calibration'],
  'Charger and capture': ['capture_status', 'active_master_auto', 'external_master_guard_ms', 'battery.charger_led_status', 'battery.charge_state', 'battery.charge_condition', 'battery.ds2433_rom', 'battery.ds2438_rom'],
  'Network and notifications': ['ap_ssid', 'ap_ip', 'station_connected', 'station_ssid', 'station_ip', 'mqtt_status', 'smtp_status'],
  'Header probe': ['header_probe.gpio', 'header_probe.level', 'header_probe.edges', 'header_probe.low_pulses', 'header_probe.onewire_slots', 'header_probe.reset_pulses', 'header_probe.min_low_us', 'header_probe.max_low_us', 'header_probe.last_activity_ms'],
  'Passive capture': ['passive_capture.transactions', 'passive_capture.ds2433_reads', 'passive_capture.ds2433_block_mask', 'passive_capture.ds2438_reads', 'passive_capture.ds2438_page_mask'],
};

class OpenIMPRESCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  setConfig(config) {
    if (!config || (!config.status_entity && !Object.keys(config.entities || {}).length)) {
      throw new Error('Configure status_entity or an entities mapping for OpenIMPRES.');
    }
    this.config = { ...config, entities: { ...(config.entities || {}) } };
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  getCardSize() { return 12; }

  path(object, path) {
    return path.split('.').reduce((value, key) => value?.[key], object);
  }

  value(field) {
    const mapping = this.config.entities[field];
    if (mapping) {
      const entity = typeof mapping === 'string' ? mapping : mapping.entity;
      const state = this._hass.states[entity];
      if (!state || ['unknown', 'unavailable'].includes(state.state)) return undefined;
      return typeof mapping === 'object' && mapping.attribute
        ? this.path(state.attributes, mapping.attribute) : state.state;
    }
    const state = this._hass.states[this.config.status_entity];
    if (!state || ['unknown', 'unavailable'].includes(state.state)) return undefined;
    const data = this.config.status_attribute
      ? this.path(state.attributes, this.config.status_attribute) : state.attributes;
    return this.path(data, field);
  }

  escape(value) {
    return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  label(field) {
    const name = field.split('.').at(-1);
    const labels = { rated_mAh: 'Rated capacity', initial_mAh: 'Initial capacity', present_mAh: 'Present capacity', potential_mAh: 'Potential capacity', voltage_V: 'Voltage', temperature_C: 'Temperature', kit: 'Model / kit', impres_detected: 'IMPRES detected', ap_ssid: 'AP SSID', ap_ip: 'AP IP', station_ssid: 'Station SSID', station_ip: 'Station IP' };
    return labels[name] || name.replaceAll('_', ' ').replace(/^./, char => char.toUpperCase());
  }

  format(field, value) {
    if (value === undefined || value === null || value === '') return 'Not available';
    if (typeof value === 'boolean' || ['on', 'off', 'true', 'false'].includes(value)) {
      return value === true || value === 'on' || value === 'true' ? 'Yes' : 'No';
    }
    const unit = field.endsWith('_mAh') ? ' mAh' : field.endsWith('_percent') ? '%' : field.endsWith('_V') ? ' V' : field.endsWith('_C') ? ' °C' : field.endsWith('_ms') ? ' ms' : field.endsWith('_us') ? ' µs' : '';
    return `${value}${unit}`;
  }

  render() {
    if (!this.config || !this._hass) return;
    const charge = this.value('battery.charge_percent');
    const health = this.value('battery.health_percent');
    const meter = (title, value) => {
      const valid = value !== undefined && value !== null && value !== '' && Number.isFinite(Number(value));
      return `<div class="meter"><span>${title}</span><strong>${valid ? this.escape(value) + '%' : 'Not available'}</strong>${valid ? `<progress aria-label="${title}" max="100" value="${Math.max(0, Math.min(100, Number(value)))}"></progress>` : ''}</div>`;
    };
    this.shadowRoot.innerHTML = `
      <style>
        ha-card { padding: 20px; color: var(--primary-text-color); }
        h2 { margin: 0 0 6px; font-size: 22px; }
        .status { color: var(--secondary-text-color); margin-bottom: 18px; }
        .meters { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-bottom: 18px; }
        .meter { display: flex; flex-direction: column; gap: 6px; }
        .meter strong { font-size: 24px; }
        progress { width: 100%; accent-color: var(--primary-color); }
        details { border-top: 1px solid var(--divider-color); padding: 12px 0; }
        summary { cursor: pointer; font-weight: 600; padding: 4px 0; }
        dl { margin: 12px 0 0; }
        .row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px; padding: 6px 0; }
        dt { color: var(--secondary-text-color); } dd { margin: 0; overflow-wrap: anywhere; text-align: right; }
        .missing { color: var(--secondary-text-color); }
        .note { font-size: 12px; color: var(--secondary-text-color); }
      </style>
      <ha-card>
        <h2>${this.escape(this.config.title || 'OpenIMPRES')}</h2>
        <div class="status">${this.escape(this.format('capture_status', this.value('capture_status')))}</div>
        <div class="meters">${meter('Charge', charge)}${meter('Health', health)}</div>
        ${Object.entries(OPENIMPRES_SECTIONS).map(([title, fields], index) => `<details ${index === 0 ? 'open' : ''}><summary>${title}</summary><dl>${fields.map(field => {
          const value = this.value(field);
          return `<div class="row"><dt>${this.escape(this.label(field))}</dt><dd class="${value === undefined ? 'missing' : ''}">${this.escape(this.format(field, value))}</dd></div>`;
        }).join('')}</dl></details>`).join('')}
        <div class="note">Charger status codes are shown as reported by the device.</div>
      </ha-card>`;
  }
}

if (!customElements.get('openimpres-card')) customElements.define('openimpres-card', OpenIMPRESCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'openimpres-card', name: 'OpenIMPRES Card', description: 'Battery and capture diagnostics from Home Assistant entities.' });
