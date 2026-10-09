# HA OpenIMPRES Card

A Home Assistant custom dashboard card displaying OpenIMPRES battery, charger,
capture, network, and calibration data from MQTT-backed Home Assistant entities.

## Installation

Copy `openimpres-card.js` to your Home Assistant `/config/www/` directory. Add a
dashboard resource with URL `/local/openimpres-card.js` and type **JavaScript
module**, then add a manual card using the configuration below. Reload your
browser after installing or updating the resource.

No build step or external JavaScript dependencies are required. The card reads
Home Assistant state; it does not connect directly to the device or MQTT broker.

## Entity configuration

Replace these illustrative entity IDs with your actual MQTT entities. Map any
field from `/api/status` using its dot-separated path. Unmapped or unavailable
fields display **Not available**; no entity naming scheme is assumed.

```yaml
type: custom:openimpres-card
title: OpenIMPRES Battery
entities:
  battery_present: binary_sensor.openimpres_battery_present
  impres_detected: binary_sensor.openimpres_impres_detected
  battery.serial: sensor.openimpres_serial
  battery.kit: sensor.openimpres_model
  battery.charge_percent: sensor.openimpres_charge
  battery.health_percent: sensor.openimpres_health
  battery.voltage_V: sensor.openimpres_voltage
  battery.temperature_C: sensor.openimpres_temperature
  capture_status: sensor.openimpres_capture_status
```

To read an entity attribute instead of its state:

```yaml
entities:
  battery.serial:
    entity: sensor.openimpres_status
    attribute: battery.serial
```

If an existing MQTT sensor exposes the complete status object as attributes:

```yaml
type: custom:openimpres-card
status_entity: sensor.openimpres_status
```

If the object is nested in an attribute, set `status_attribute: status` (or its
actual path). Explicit `entities` mappings override fields from `status_entity`.
This configuration does not create MQTT sensors; those must already exist.

## Current scope

All fields in the supplied `/api/status` sample are represented, including probe
and passive-capture diagnostics. Charger codes are displayed without guessing
their meanings. Controls require confirmed Home Assistant actions or MQTT command
topics and payloads and are not implemented yet. The original webpage has not
been inspected, so matching its layout and additional features remains pending.

The protocol research and passive capture firmware live in
[OpenIMPRES](https://github.com/rodgrech/OpenIMPRES).
