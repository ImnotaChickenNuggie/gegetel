## Resumen

Gege Tel es un operador móvil nuevo. Un equipo de 4 personas tiene 8 semanas para lanzar, sobre una sola plataforma multiempresa, dos productos:

1. **Portal empresarial**: gestión de líneas, centros de costo y facturación.
2. **Beneficios para usuarios de línea**: por WhatsApp y web, con agentes de IA.

## Hechos que el documento establece

| Tema | Dato |
|---|---|
| Plazo | 8 semanas |
| Equipo | 4 personas |
| Créditos de IA por línea/mes | 100 (básico) · 300 (premium) |
| Fuente de líneas y consumo | API del proveedor de telefonía |
| Fuente del catálogo de beneficios | Proveedor externo, **no notifica cambios** |
| Facturación | Timbrado fiscal con un PAC |
| Tenancy | Muchas empresas en la misma plataforma |

## Riesgos y tensiones implícitas

- **Alcance vs. capacidad**: dos productos, tres integraciones externas, IA y multitenancy en 8 semanas con 4 personas. Hay que recortar el alcance del MVP.
- **Catálogo sin notificaciones**: hay que detectar cambios por polling o diff periódico. Esto implica cachear el catálogo, versionarlo y definir qué ve el usuario si un beneficio desaparece o cambia de precio.
- **Créditos de IA**: no está dicho si se renuevan, acumulan o caducan cada mes. Tampoco se dice qué pasa al agotarse ni cuánto cuesta cada interacción. Hay riesgo de consumo concurrente y doble descuento.
- **Datos del proveedor de telefonía**: el consumo viene de su API, por lo que es una fuente externa y puede llegar tarde o con huecos. La facturación depende de ella.
- **Timbrado con PAC**: es un proceso con reglas fiscales (CFDI, cancelaciones, notas de crédito) y puede fallar o tardar. Requiere idempotencia y reintentos.
- **Aislamiento multiempresa**: los datos de cada empresa deben estar separados. WhatsApp y IA elevan el riesgo de fuga entre empresas.
- **Datos personales**: los usuarios de línea interactúan con agentes de IA por WhatsApp. Faltan definir privacidad y consentimiento.

## Ambigüedades y preguntas abiertas

**Producto**
1. ¿Quién es el "usuario de la línea" y quién el "administrador"? ¿Qué roles y permisos existen?
2. ¿Qué son exactamente los "beneficios"? ¿Se canjean, se pagan o se descuentan de la factura?
3. ¿Qué hace el "asistente de IA"? ¿Responde preguntas, ejecuta acciones o recomienda beneficios?
4. ¿Los créditos se consumen por mensaje, por token o por tarea? ¿Qué ocurre al llegar a 0?
5. ¿Los planes (básico/premium) se definen por línea o por empresa? ¿Puede una empresa mezclarlos?

**Facturación**
6. ¿Qué se factura: planes, excedentes, beneficios? ¿Con qué periodicidad?
7. ¿Qué PAC se usa y en qué país/régimen fiscal se opera?
8. ¿Cómo se asignan costos a centros de costo? ¿Por línea, por consumo o por reglas?

**Integraciones**
9. ¿Qué límites, disponibilidad y SLA tienen las APIs de telefonía y de beneficios?
10. ¿Con qué frecuencia cambia el catálogo y cuánto retraso es tolerable?
11. ¿Se usará la API oficial de WhatsApp Business? ¿Hay plantillas y aprobaciones de Meta?

**Proyecto**
12. ¿Qué es "lanzar": piloto con pocas empresas o disponibilidad general?
13. ¿Cuáles son los criterios de éxito y la fecha dura de salida?
14. ¿Qué perfiles tiene el equipo de 4 personas (backend, frontend, IA, DevOps)?

## Sugerencias para la siguiente versión del documento

- Añadir secciones: **Objetivos**, **Alcance (dentro/fuera)**, **Actores y roles**, **Requisitos no funcionales** (seguridad, disponibilidad, auditoría) y **Supuestos**.
- Incluir un **glosario** (línea, centro de costo, crédito, beneficio, PAC, tenant).
- Definir un **MVP priorizado** (por ejemplo MoSCoW) con hitos semanales.
- Documentar cada integración externa con contrato, límites y plan de contingencia.
- Añadir **criterios de aceptación** medibles.

## Observaciones de forma

- El documento usa solo texto plano con etiquetas "Contexto:" y "Escenario:". Conviene pasarlas a encabezados Markdown (`##`).
- Falta título (`#`).
- Las dos secciones son breves y mezclan contexto con restricciones técnicas. Se recomienda separar **Contexto**, **Restricciones** e **Integraciones**.
