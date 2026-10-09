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
    const show = field => this.escape(this.format(field, this.value(field)));
    const row = (field, label = this.label(field)) => `<div class="row"><dt>${this.escape(label)}</dt><dd>${show(field)}</dd></div>`;
    const charge = this.value('battery.charge_percent');
    const validCharge = charge !== undefined && charge !== null && charge !== '' && Number.isFinite(Number(charge));
    const percent = validCharge ? Math.max(0, Math.min(100, Number(charge))) : 0;
    const selected = this.selectedTab || 'general';
    const group = (title, fields) => `<section><h3>${this.escape(title)}</h3><dl>${fields.map(field => row(field)).join('')}</dl></section>`;
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        ha-card { overflow: hidden; color: var(--primary-text-color); }
        .header { background: linear-gradient(110deg, #eaf3f9, #497fa8); color: #081723; padding: 26px 22px; }
        h2 { margin: 0 0 18px; font-size: 24px; }
        .identity { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px 20px; }
        .identity .row { align-items: center; }
        .identity dt { color: #081723; }
        .identity dd { background: #fff; color: #081723; padding: 6px 8px; border: 1px solid #b5c6d3; }
        .health { margin-top: 16px; font-weight: 600; text-align: right; }
        .tabs { display: flex; gap: 4px; padding: 0 16px; background: var(--secondary-background-color); border-bottom: 1px solid var(--divider-color); }
        .tab { padding: 10px 20px; border: 1px solid var(--divider-color); border-bottom: 0; border-radius: 8px 8px 0 0; background: var(--secondary-background-color); color: var(--primary-text-color); cursor: pointer; font: inherit; }
        .tab[aria-selected="true"] { background: var(--card-background-color); font-weight: 600; }
        .panel { padding: 22px; } [hidden] { display: none !important; }
        .charge-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 26px; align-items: center; }
        .charge-label { margin-bottom: 12px; }
        .charge { position: relative; height: 72px; background: var(--secondary-background-color); border: 1px solid var(--divider-color); display: grid; place-items: center; }
        .fill { position: absolute; inset: 0 auto 0 0; width: ${percent}%; background: linear-gradient(90deg, #4087b0, #91bbd5); }
        .charge strong { position: relative; font-size: 26px; }
        dl { margin: 0; } .row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px; padding: 5px 0; }
        dt { color: var(--secondary-text-color); } dd { margin: 0; overflow-wrap: anywhere; text-align: right; }
        .history { margin-top: 22px; } .history .row { grid-template-columns: minmax(0, 1fr) minmax(0, 2fr); }
        .history dt { grid-column: 2; grid-row: 1; } .history dd { grid-column: 1; grid-row: 1; text-align: left; padding: 6px; border: 1px solid var(--divider-color); }
        h3 { font-size: 16px; margin: 18px 0 8px; } section:first-child h3 { margin-top: 0; }
        .recommendations { margin-top: 18px; padding: 12px; background: var(--secondary-background-color); border-left: 3px solid #497fa8; overflow-wrap: anywhere; }
        .note { font-size: 12px; color: var(--secondary-text-color); margin-top: 14px; }
        @media (max-width: 550px) { .identity, .charge-grid { grid-template-columns: 1fr; } h2 { font-size: 21px; } .header, .panel { padding: 18px; } .tab { padding: 10px 14px; } }
      </style>
      <ha-card>
        <header class="header">
          <h2>${this.escape(this.config.title || 'OpenIMPRES Battery Reader')}</h2>
          <dl class="identity">${row('battery.serial', 'Serial Number')}${row('battery.chemistry', 'Chemistry')}${row('battery.kit', 'Kit Number')}${row('battery_present', 'Battery Present')}</dl>
          <div class="health">Health: ${show('battery.health_percent')}</div>
        </header>
        <div class="tabs" role="tablist" aria-label="Battery reader views">
          ${['general', 'advanced', 'settings'].map(tab => `<button class="tab" id="tab-${tab}" role="tab" aria-controls="panel-${tab}" aria-selected="${selected === tab}" tabindex="${selected === tab ? 0 : -1}" data-tab="${tab}">${tab[0].toUpperCase() + tab.slice(1)}</button>`).join('')}
        </div>
        <div class="panel" id="panel-general" role="tabpanel" aria-labelledby="tab-general" ${selected !== 'general' ? 'hidden' : ''}>
          <div class="charge-grid">
            <div><div class="charge-label">Present Charge</div><div class="charge" ${validCharge ? `role="progressbar" aria-label="Present charge" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"` : ''}><div class="fill"></div><strong>${show('battery.charge_percent')}</strong></div></div>
            <dl>${row('battery.present_mAh', 'Present Charge')}${row('battery.potential_mAh', 'Potential Capacity')}${row('battery.rated_mAh', 'Rated Capacity')}${row('battery.initial_mAh', 'Initial Capacity')}</dl>
          </div>
          <dl class="history">${row('battery.manufacture_date', 'Manufacture Date')}${row('battery.first_use_date', 'Date of First Use')}${row('battery.days_since_calibration', 'Days since Last Reconditioning / Calibration')}${row('battery.days_since_removal', 'Days since Removal from IMPRES Charger')}${row('battery.charge_cycles', 'Total IMPRES Charge Cycles')}${row('battery.non_impres_cycles', 'Total Estimated Non-IMPRES Charge Cycles')}${row('battery.calibration_cycles', 'Total Reconditioning / Calibration Cycles')}${row('battery.days_until_calibration', 'Estimated Days Until Next Reconditioning / Calibration')}</dl>
          <h3>Recommendations</h3><div class="recommendations">${show('battery.recommendations')}</div>
        </div>
        <div class="panel" id="panel-advanced" role="tabpanel" aria-labelledby="tab-advanced" ${selected !== 'advanced' ? 'hidden' : ''}>
          ${group('Battery diagnostics', ['impres_detected', 'battery.voltage_V', 'battery.temperature_C', 'battery.charge_cycles', 'battery.non_impres_cycles', 'battery.calibration_cycles'])}
          ${['Charger and capture', 'Header probe', 'Passive capture'].map(title => group(title, OPENIMPRES_SECTIONS[title])).join('')}
          <div class="note">Charger status codes are shown as reported by the device.</div>
        </div>
        <div class="panel" id="panel-settings" role="tabpanel" aria-labelledby="tab-settings" ${selected !== 'settings' ? 'hidden' : ''}>
          ${group('Connection and notification status', OPENIMPRES_SECTIONS['Network and notifications'])}
          <div class="note">Status only. Device configuration controls require confirmed command topics.</div>
        </div>
      </ha-card>`;
    const activate = tab => {
      this.selectedTab = tab;
      this.render();
      this.shadowRoot.querySelector(`[data-tab="${tab}"]`).focus();
    };
    this.shadowRoot.querySelectorAll('[data-tab]').forEach(button => {
      button.addEventListener('click', () => activate(button.dataset.tab));
      button.addEventListener('keydown', event => {
        const tabs = ['general', 'advanced', 'settings'];
        let index = tabs.indexOf(button.dataset.tab);
        if (event.key === 'ArrowRight') index = (index + 1) % tabs.length;
        else if (event.key === 'ArrowLeft') index = (index + tabs.length - 1) % tabs.length;
        else if (event.key === 'Home') index = 0;
        else if (event.key === 'End') index = tabs.length - 1;
        else return;
        event.preventDefault();
        activate(tabs[index]);
      });
    });
  }

}

if (!customElements.get('openimpres-card')) customElements.define('openimpres-card', OpenIMPRESCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'openimpres-card', name: 'OpenIMPRES Card', description: 'Battery and capture diagnostics from Home Assistant entities.' });
