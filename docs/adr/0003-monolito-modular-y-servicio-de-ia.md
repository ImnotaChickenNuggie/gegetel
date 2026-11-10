# Monolito modular en NestJS y servicio de IA delgado en FastAPI

Con 2 fullstack, 1 DevOps y 1 QA en 8 semanas, el MVP y la fase inicial son un monolito modular en NestJS; se extraerán microservicios solo cuando un módulo tenga necesidades propias de escala o despliegue. La IA vive aparte en un servicio FastAPI sin acceso a la base de datos: NestJS identifica la Línea, valida y descuenta Créditos, y le pasa solo el contexto filtrado, de modo que el servicio de IA no pueda leer datos de otra Empresa.

## Consequences

La arquitectura real es "monolito modular + servicio de IA": hay dos lenguajes, dos despliegues y un contrato de API entre ambos. No se debe dar a FastAPI acceso directo a datos de negocio para ahorrar llamadas internas.
