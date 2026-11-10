# El tenant es Cliente, con Grupo opcional sobre Empresas

El MVP solo atiende Empresas, pero el B2C está previsto y hay conglomerados con varias ramas. Por eso el tenant se modela como Cliente con tipo Empresa o Persona, y un Grupo opcional de dos niveles fijos agrupa Empresas. Renombrar el concepto central después sería una migración cara.

## Consequences

Roles de centro de costo y CFDI siguen siendo exclusivos de Empresa, y el MVP no construye nada de B2C. El modo de facturación es configurable por Grupo, pero el piloto solo opera CFDI por Empresa.
