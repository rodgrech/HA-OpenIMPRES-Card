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
reader_name: Motorola SUC
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
topics and payloads and are not implemented yet. The General tab follows the supplied Battery Reader screenshots, with a blue
identity header, present-charge bar, capacities, dates, cycle counts, and
recommendations. Advanced includes Live monitor (voltage, temperature, estimated
health), Reader identity, and expandable capture diagnostics. Set `reader_name`
to label the reader's location or charger; this is a display-only card setting
and does not change the device's email-alert identity. Settings currently displays
connection and notification status only. Other webpage views and controls still
need reference screenshots and command details. No battery image or vendor logo
is bundled, and an end-of-life classification is not inferred from health alone.

The protocol research and passive capture firmware live in
[OpenIMPRES](https://github.com/rodgrech/OpenIMPRES).
