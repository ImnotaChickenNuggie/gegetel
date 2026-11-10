# Arquitectura de Gege Tel

> **PENDIENTE (otro plan):** página exportable a PDF con estos diagramas para presentar al equipo.

## Resumen

Gege Tel lanza en 8 semanas, con 2 fullstack, 1 DevOps y 1 QA, un MVP cerrado a 5 Empresas con dos productos: el Portal empresarial y los Beneficios para Usuarios de línea. La arquitectura es un monolito modular en NestJS más un servicio de IA delgado en FastAPI. En la semana 4 se valida un flujo completo delgado.

El vocabulario está en [`GLOSSARY.md`](../GLOSSARY.md) y las decisiones difíciles de revertir, en [`docs/adr/`](./adr/).

## Contexto

```mermaid
flowchart LR
    UP["Usuario del Portal"]
    UL["Usuario de línea"]
    OP["Equipo de Gege Tel"]
    GT["Plataforma Gege Tel"]
    TEL["Proveedor de telefonía<br/>Líneas, consumo y SMS"]
    BEN["Proveedor de beneficios<br/>sin notificación de cambios"]
    PAC["PAC<br/>timbrado de CFDI"]
    WA["WhatsApp Business API"]
    QW["API gestionada de Qwen"]
    GEM["Gemini<br/>modelo de respaldo"]

    UP -->|"Portal web"| GT
    UL -->|"web de Beneficios"| GT
    UL <-->|"mensajes"| WA
    WA <-->|"webhooks y envíos"| GT
    OP -->|"Backoffice y Aprobación"| GT
    GT -->|"consulta y envía SMS"| TEL
    GT -->|"sincronización periódica"| BEN
    GT -->|"timbra"| PAC
    GT -->|"inferencia"| QW
    GT -.->|"respaldo"| GEM
```

## Stack

| Pieza | Tecnología | Por qué |
|---|---|---|
| Web (Portal, Beneficios, Backoffice) | Next.js | Un solo frontend para las tres superficies. |
| Backend | NestJS | Módulos con fronteras claras y un solo despliegue. |
| Base de datos principal | PostgreSQL | Transacciones para Factura y Créditos, y Row-Level Security para el aislamiento. |
| Colas y caché | Redis | Tareas asíncronas con reintentos y caché. |
| Servicio de IA | FastAPI | Ecosistema de IA en Python, en un servicio delgado y sin datos de negocio. |
| Modelo | Qwen por API gestionada, con Gemini Flash de respaldo | Sin operar GPUs. Con una interfaz compatible con OpenAI se cambia de modelo sin tocar el resto, y si ambos fallan responde el código ([ADR 0004](./adr/0004-proveedores-de-ia-y-fallback.md)). |

Redis no es el registro único de una tarea crítica: la intención de timbrar se guarda primero en PostgreSQL.

## Contenedores

```mermaid
flowchart TB
    subgraph Plataforma
        WEB["Next.js<br/>Portal, Beneficios y Backoffice"]
        API["NestJS<br/>monolito modular"]
        WRK["Workers NestJS<br/>colas"]
        IA["FastAPI<br/>servicio de IA sin base de datos"]
        PG[("PostgreSQL<br/>Row-Level Security")]
        RD[("Redis<br/>colas y caché")]
    end

    EXT["Proveedores, PAC y WhatsApp"]
    QW["API gestionada de Qwen"]
    GEM["Gemini<br/>respaldo"]

    WEB --> API
    API --> PG
    API --> RD
    API -->|"contexto filtrado de la Línea"| IA
    WRK --> RD
    WRK --> PG
    WRK --> EXT
    EXT -->|"webhooks de WhatsApp"| API
    IA --> QW
    IA -.->|"si Qwen falla"| GEM
```

## Módulos del monolito

| Módulo | Responsabilidad |
|---|---|
| Portal | Clientes, Grupos, Empresas, roles, Líneas y Centros de costo. |
| Facturación | Factura mensual por Empresa, desglose por Centro de costo y timbrado. |
| Catálogo | Comercios, Beneficios, Aprobación, lotes de Códigos y Canjes. |
| Agente | Identidad, consentimiento, Créditos y conversación con el servicio de IA. |
| Integraciones | Adaptadores de Proveedor de telefonía, Proveedor de beneficios, PAC, WhatsApp y SMS. |

## Modelo de dominio

Solo se crean Clientes de tipo Empresa en el MVP. Las Líneas se asocian al Cliente y, dentro de una Empresa, a exactamente un Centro de costo.

```mermaid
erDiagram
    GRUPO |o--o{ EMPRESA : agrupa
    CLIENTE ||--o| EMPRESA : "es de tipo"
    CLIENTE ||--o{ LINEA : posee
    EMPRESA ||--o{ CENTRO_DE_COSTO : tiene
    CENTRO_DE_COSTO ||--o{ LINEA : agrupa
    EMPRESA ||--o{ FACTURA : recibe
    PLAN ||--o{ LINEA : define
    USUARIO_DE_LINEA ||--o{ LINEA : usa
    USUARIO_DEL_PORTAL }o--o| EMPRESA : "tiene rol en"
    USUARIO_DEL_PORTAL }o--o| GRUPO : "tiene rol en"
    COMERCIO ||--o{ BENEFICIO : ofrece
    BENEFICIO ||--o{ CODIGO : "tiene lote de"
    USUARIO_DE_LINEA ||--o{ CANJE : realiza
    BENEFICIO ||--o{ CANJE : "es canjeado en"
    CANJE ||--|| CODIGO : entrega
```

## Mensaje de WhatsApp al Agente de IA

El Crédito se consume solo con una respuesta exitosa. Se reserva antes de llamar al modelo para evitar el doble descuento por mensajes concurrentes o webhooks repetidos. Si Qwen falla, la misma inferencia se repite en Gemini. Si también falla Gemini, se libera la reserva y el código envía una respuesta determinista ([ADR 0004](./adr/0004-proveedores-de-ia-y-fallback.md)).

```mermaid
sequenceDiagram
    actor U as Usuario de línea
    participant W as WhatsApp
    participant N as NestJS
    participant P as PostgreSQL
    participant F as FastAPI
    participant Q as Qwen
    participant G as Gemini

    U->>W: Envía mensaje
    W->>N: Webhook con id de mensaje
    N->>P: Busca Línea activa por número
    alt Número sin Línea activa
        N-->>W: Mensaje de negativa
    else Sin consentimiento vigente
        N-->>W: Solicita consentimiento
    else Línea válida y con consentimiento
        N->>P: Reserva 1 Crédito, idempotente por id de mensaje
        alt Sin Créditos disponibles
            N-->>W: Agente no disponible y enlace al Catálogo web
        else Crédito reservado
            N->>P: Obtiene contexto de esa Línea y del Catálogo
            N->>F: Mensaje y contexto filtrado
            F->>Q: Inferencia
            alt Qwen responde
                Q-->>F: Respuesta
            else Qwen caído o tiempo agotado
                F->>G: Misma inferencia
                G-->>F: Respuesta o error
            end
            alt Respuesta exitosa
                F-->>N: Respuesta
                N->>P: Confirma consumo del Crédito
                N-->>W: Envía respuesta
            else Ambos modelos fallan
                F-->>N: Error
                N->>P: Libera la reserva
                N-->>W: Respuesta en código con Créditos, Beneficios destacados y enlace al Catálogo
            end
        end
    end
    W-->>U: Entrega el mensaje
```

## Factura y timbrado

La clave de idempotencia evita duplicar una CFDI aunque un worker reintente o Redis falle.

```mermaid
sequenceDiagram
    participant S as Proceso mensual
    participant N as NestJS
    participant P as PostgreSQL
    participant R as Redis
    participant W as Worker
    participant C as PAC

    S->>N: Inicia cierre del mes
    N->>P: Guarda Factura e intención de timbrar con clave de idempotencia
    N->>R: Encola timbrado
    R-->>W: Entrega tarea
    W->>P: Comprueba estado de la intención
    alt Ya timbrada
        W-->>R: Termina sin volver a timbrar
    else Pendiente
        W->>C: Solicita timbrado
        alt Timbrado correcto
            C-->>W: CFDI timbrada
            W->>P: Guarda CFDI y marca como timbrada
        else Error o tiempo agotado
            W->>P: Registra el intento
            W->>R: Reintenta con espera creciente
            Note over W,R: Al agotar los reintentos se alerta al equipo
        end
    end
```

Un proceso periódico vuelve a encolar las intenciones pendientes, por si una tarea se pierde en Redis.

## Estados de un Beneficio

Solo un Beneficio en estado Aprobado aparece en el Catálogo.

```mermaid
stateDiagram-v2
    [*] --> Pendiente: Alta manual o novedad sincronizada
    Pendiente --> Aprobado: Gege Tel aprueba
    Pendiente --> Rechazado: Gege Tel rechaza
    Aprobado --> EnRevision: El proveedor cambia el Beneficio
    EnRevision --> Aprobado: Gege Tel aprueba el cambio
    EnRevision --> Rechazado: Gege Tel rechaza el cambio
    Aprobado --> Retirado: Baja del Beneficio
    EnRevision --> Retirado: Baja del Beneficio
    Rechazado --> [*]
    Retirado --> [*]

    note right of EnRevision
        No visible en el Catálogo.
        Se avisa al proveedor un plazo de 24 a 48 horas.
        Si no se resuelve, se ofrece contactar a soporte.
    end note
```

## Aislamiento y seguridad

- **Datos por Empresa:** cada tabla de tenant lleva identificador de Empresa y Row-Level Security. La aplicación se conecta con un usuario que no puede omitir esas políticas ([ADR 0002](./adr/0002-aislamiento-con-rls.md)).
- **Roles de Grupo:** las políticas se extienden a las Empresas de ese Grupo.
- **Servicio de IA:** sin acceso a la base de datos; solo recibe el contexto de la Línea ([ADR 0003](./adr/0003-monolito-modular-y-servicio-de-ia.md)).
- **Identidad en WhatsApp:** el número debe coincidir con una Línea activa, con consentimiento en el primer contacto.
- **Acceso web:** número de Línea y código de un solo uso por SMS.
- **Privacidad:** los Usuarios del Portal solo ven cifras agregadas de Créditos y Canjes, nunca el contenido de las conversaciones.
- **Reasignación de Línea:** los Créditos siguen con la Línea; historial y consentimiento no se transfieren.

### Roles del Portal

| Nivel | Rol | Alcance |
|---|---|---|
| Empresa | Administrador | Todo, incluidos usuarios. |
| Empresa | Finanzas | Facturas y Centros de costo. |
| Empresa | Responsable de centro de costo | Solo las Líneas de su centro. |
| Grupo | Administrador | Todo en sus Empresas. |
| Grupo | Finanzas | Facturas y consolidados. |
| Grupo | Gestión | Altas y bajas de Usuarios de línea y del Portal, y solicitudes de altas o bajas de Líneas. No ve facturas, datos fiscales ni detalle de consumo. |

## Despliegue

### MVP en Lightsail

```mermaid
flowchart TB
    INT["Internet"]
    subgraph Lightsail
        LB["Balanceador o proxy"]
        subgraph Instancia["Instancia con Docker"]
            WEB["Next.js"]
            API["NestJS"]
            WRK["Workers"]
            IA["FastAPI"]
            RD[("Redis persistente")]
        end
        PG[("PostgreSQL gestionada<br/>respaldos diarios")]
    end

    INT --> LB
    LB --> WEB
    LB --> API
    API --> RD
    WRK --> RD
    API --> PG
    WRK --> PG
    API --> IA
```

### Evolución

Las mismas imágenes Docker se mueven a servicios gestionados a medida que el sizing lo requiera.

```mermaid
flowchart LR
    A["Piloto<br/>Lightsail con Docker"]
    B["Crecimiento<br/>Fargate, RDS, ElastiCache y S3"]
    C["Escala<br/>autoescalado, réplica de lectura y alta disponibilidad"]
    D["Extracción selectiva<br/>Integraciones y Agente"]

    A --> B --> C --> D
```

## Sizing

Estimaciones aproximadas, a validar con pruebas de carga. La meta firme es el piloto; las otras etapas son referencia.

| Etapa | Empresas | Líneas | Infraestructura orientativa |
|---|---|---|---|
| Piloto | 5 | ~5,000 | Lightsail con Docker y PostgreSQL gestionada. |
| Crecimiento | ~25 | ~25,000 | Fargate, RDS, ElastiCache y S3. |
| Referencia a 12 meses | ~100 | ~100,000 | Autoescalado de API y workers, réplica de lectura y alta disponibilidad; evaluar extraer Integraciones y Agente. |

API y workers no guardan estado, para poder escalar horizontalmente. Se extrae un microservicio solo cuando un módulo tenga necesidades propias de escala o despliegue.

## Riesgos y pendientes

- **Sin perfil de IA en el equipo:** 2 fullstack cubren producto, integraciones y agente antes del hito de semana 4. Es el mayor riesgo de plazo.
- **Lightsail:** hay que confirmar región disponible y su límite de redes, y asumir el punto único de falla de Redis durante el piloto.
- **Proveedores de IA (Qwen y Gemini):** ambos contratos deben ser compatibles con la ley mexicana de datos personales, y hay que verificar región de datos, retención cero y no entrenamiento.
- **Gasto de IA:** además del límite de Créditos por Línea, hay presupuesto diario por Empresa y global. Al 150% del gasto esperado se alerta; al 200% se degrada a contexto corto y modelo más barato, cortando solo a la Línea o Empresa que lo provoca. En el techo de gasto se usa la respuesta en código.
- **CFDI consolidada:** requiere validación de un contador antes de habilitarse; va después del MVP.
- **SMS:** hay que confirmar que la API del Proveedor de telefonía permite enviarlos.
- **Proveedor de beneficios y Comercio:** se asume que el proveedor suministra Beneficios de varios Comercios y puede entregar lotes de Códigos.
- **Recorte acordado:** si no se alcanza el hito de semana 4, primero se aplaza la sincronización con el Proveedor de beneficios y el Catálogo se carga a mano.
