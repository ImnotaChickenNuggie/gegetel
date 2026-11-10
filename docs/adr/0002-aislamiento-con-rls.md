# Aislamiento por Empresa con PostgreSQL compartida y Row-Level Security

Los datos de todas las Empresas viven en una sola base PostgreSQL, con identificador de Empresa en cada tabla y Row-Level Security, en lugar de un esquema o una base por Empresa. Así el aislamiento lo aplica la base de datos aunque una consulta olvide el filtro, y los consolidados de Grupo funcionan con un solo esquema y una sola migración.

## Consequences

El acceso de los roles de Grupo se expresa extendiendo las políticas a las Empresas de ese Grupo. La aplicación debe conectarse con un usuario de base de datos que no pueda omitir Row-Level Security.
